import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import { connectDb } from "../config/db.js"; // match your actual export/path from config/db.js
import Tenant from "../models/Tenant.model.js";
import { findOrCreateCustomerByPhone } from "../repositories/customer.repository.js";
import {
    getOrCreateSession,
    pushMessageToSession,
    addItemsToCart,
    clearCartFromSession,
    saveSession,
    addBotMessageToHistory,
} from "../services/session.service.js";
import { getActiveMenuForTenant } from "../services/menu.service.js";
import { classifyIntent } from "../services/llm.service.js";
import {
    createOrderFromIntent,
    calculateCartTotal,
    buildMenuMap,
} from "../services/order.service.js";
import {
    sendWhatsAppMessage,
    buildOrderSummaryMessage,
} from "../services/whatsapp.service.js";

// Create a BullMQ worker that processes jobs from the "webhook" queue.
await connectDb();
const worker = new Worker(
    "webhook",
    async (job) => {
        // Read the WhatsApp message details from this queue job.
        const { phoneNumberId, from, text, wamid } = job.data;

        // Ignore events that do not identify which business WhatsApp number received them.
        if (!phoneNumberId) {
            console.warn("[Worker] Missing phoneNumberId");
            return { processed: false };
        }

        // Only continue when this job contains a sender and message text.
        if (!from || !text) {
            console.warn(`[Worker] Missing message data for wamid: ${wamid}`);
            return { processed: false };
        }

        // Find the active business account connected to this WhatsApp number.
        const tenant = await Tenant.findOne({
            phoneNumberId,
            isActive: true,
        });

        // Stop safely if no active business account matches the incoming number.
        if (!tenant) {
            console.warn(`[Worker] Tenant not found for phoneNumberId: ${phoneNumberId}`);
            return { processed: false };
        }

        // Load this customer's conversation from Redis, or create a new session.
        const session = await getOrCreateSession(tenant._id.toString(), from);

        // Classify the new message using previous history and the tenant's business info.
        // The current message is passed separately, so it is not added to history until after classification.
        const activeMenu = await getActiveMenuForTenant(tenant._id);

        const intent = await classifyIntent(text, session.history, tenant, activeMenu);

        // Add the customer's message to the session for future turns.
        pushMessageToSession(session, {
            role: "user",
            text,
        });

        // Send a Gemini-generated reply only for statuses that are allowed
        // by botPrompt's GEMINI_REPLY_STATUSES list.
        if (
            (intent.status === "general_chat"
                || intent.status === "transfer_to_human"
                || intent.status === "out_of_area")
            && intent.replyMessage
        ) {
            try {
                await sendWhatsAppMessage(
                    tenant.phoneNumberId,
                    from,
                    intent.replyMessage,
                );
            } catch (err) {
                console.error("[Worker] WhatsApp send failed:", err.message);
            }
            addBotMessageToHistory(session, intent.replyMessage);
            await saveSession(tenant._id.toString(), from, session);

            return {
                processed: true,
                intent,
            };
        }

        if (intent.status === "add_to_cart") {
            addItemsToCart(session, intent.items);
        }

        // Checkout only creates a summary; it does not place the order.
        // The order is created later when the customer sends confirm_order.
        if (intent.status === "checkout") {
            if (session.cartItems.length === 0) {
                const emptyCartMessage = "Your cart is empty. Please add an item first.";
                try {
                    await sendWhatsAppMessage(
                        tenant.phoneNumberId,
                        from,
                        emptyCartMessage,
                    );
                } catch (err) {
                    console.error("[Worker] WhatsApp send failed:", err.message);
                }
                addBotMessageToHistory(session, emptyCartMessage);
                await saveSession(tenant._id.toString(), from, session);

                return {
                    processed: true,
                    intent,
                };
            }

            const menuMap = buildMenuMap(activeMenu);
            const { items: pricedItems, total } =
                calculateCartTotal(session.cartItems, menuMap);

            const summaryText = buildOrderSummaryMessage(pricedItems, total);

            try {
                await sendWhatsAppMessage(
                    tenant.phoneNumberId,
                    from,
                    summaryText,
                );
            } catch (err) {
                console.error("[Worker] WhatsApp send failed:", err.message);
            }

            addBotMessageToHistory(session, summaryText);
            await saveSession(tenant._id.toString(), from, session);

            return {
                processed: true,
                intent,
            };
        }

        let order = null;
        if (intent.status === "confirm_order") {
            if (session.cartItems.length === 0) {
                throw new Error("Cannot confirm an order because the session cart is empty.");
            }

            const customer = await findOrCreateCustomerByPhone(tenant._id, from);
            order = await createOrderFromIntent(
                { ...intent, items: session.cartItems },
                tenant,
                customer._id,
                activeMenu,
            );
            clearCartFromSession(session);
        }

        // Persist the updated conversation history and cart in Redis.
        await saveSession(tenant._id.toString(), from, session);

        // Log the classification for now; later code can route by intent.status.
        console.log(
            `[Worker] wamid: ${wamid} | status: ${intent.status} | items:`,
            intent.items,
        );

        // Return the result so BullMQ records this job as successfully processed.
        return {
            processed: true,
            intent,
            ...(order ? { orderId: order._id.toString() } : {}),
        };
    },
    { connection },
);

// Log when BullMQ finishes, fails, or encounters a worker-level error.
worker.on("completed", (job) => console.log("Webhook job done:", job.id));
worker.on("failed", (job, err) => console.error("Webhook job failed:", job?.id, err));
worker.on("error", (err) => console.error("Webhook worker error:", err));

// Export the worker so the application can load and start it.
export default worker;