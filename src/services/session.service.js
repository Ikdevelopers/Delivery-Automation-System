import { connectRedis } from "../config/redis.js";

const SESSION_TTL_SECONDS = 86400; // 24h sliding TTL
const MAX_HISTORY = 20; // cap on messages sent to Gemini per call

// Builds the Redis key consistently so every function uses the same format
const getSessionKey = (tenantId, phoneNumber) => {
    return `session:${tenantId}:${phoneNumber}`;
};

// Loads an existing session, or creates a fresh one if none exists yet.
// Either way, resets the TTL so active conversations never expire mid-chat.
export async function getOrCreateSession(tenantId, phoneNumber) {
    const redis = await connectRedis();
    const key = getSessionKey(tenantId, phoneNumber);

    const raw = await redis.get(key); // raw is either null, or a JSON string

    let session;

    if (!raw) {
        // No session yet — build the initial shape
        session = {
            tenantId,
            phoneNumber,
            history: [],
            cartItems: [],
            state: "new",
        };
    } else {
        // raw is a JSON string — parse it back into a real object
        session = JSON.parse(raw);
    }

    // Older Redis sessions may not have a cart yet.
    if (!Array.isArray(session.cartItems)) {
        session.cartItems = [];
    }

    // Persist it and reset the 24h countdown — runs for BOTH branches,
    // so an active conversation keeps sliding forward and a brand-new
    // session starts its own 24h clock.
    await redis.set(key, JSON.stringify(session), "EX", SESSION_TTL_SECONDS);

    return session;
}

// Appends a new message to history, trimming the oldest if over the cap.
// Does NOT write to Redis itself — caller must call saveSession() after.
export function pushMessageToSession(session, message) {
    session.history.push(message);

    if (session.history.length > MAX_HISTORY) {
        session.history.splice(0, session.history.length - MAX_HISTORY);
    }

    return session;
}

// Adds structured order items to the cart without mixing them into chat history.
export function addItemsToCart(session, items) {
    if (!Array.isArray(session.cartItems)) {
        session.cartItems = [];
    }

    items.forEach((item) => {
        const existingIndex = session.cartItems.findIndex(
            (cartItem) => cartItem.name === item.name && cartItem.unit === item.unit,
        );

        if (existingIndex === -1) {
            session.cartItems.push(item);
        } else {
            // Gemini may repeat earlier cart items in a new add_to_cart response.
            session.cartItems[existingIndex] = item;
        }
    });

    return session;
}

// Clears the cart after its order has been created successfully.
export function clearCartFromSession(session) {
    session.cartItems = [];
    return session;
}

// Writes the (mutated) session back to Redis, resetting the TTL again
// since this represents fresh activity.
export async function saveSession(tenantId, phoneNumber, session) {
    const redis = await connectRedis();
    const key = getSessionKey(tenantId, phoneNumber);

    await redis.set(key, JSON.stringify(session), "EX", SESSION_TTL_SECONDS);
}

// Append a bot-sent message to the session's conversation history, so Gemini
// can see it as context on the customer's next message (e.g. to detect
// confirm_order after we've sent an order summary).
export function addBotMessageToHistory(session, text) {
    session.history.push({ role: "bot", text });

    if (session.history.length > MAX_HISTORY) {
        session.history.splice(0, session.history.length - MAX_HISTORY);
    }

    return session;
}