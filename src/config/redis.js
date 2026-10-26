import Redis from "ioredis";

// Export the Redis client so other files can reuse the same connection.
export let redisClient;

// Store the in-progress connection promise so repeated calls don't create multiple connections.
let connectionPromise;

// Connect to Redis only once and reuse the same instance.
export const connectRedis = async () => {
    // If Redis is already connected, return it immediately.
    if (redisClient?.status === "ready") {
        return redisClient;
    }

    // If a connection is already being created, wait for that same promise instead of reconnecting.
    if (connectionPromise) {
        return connectionPromise;
    }

    try {
        // Create the client only once.
        if (!redisClient) {
            redisClient = new Redis({
                host: process.env.REDIS_HOST,
                port: Number(process.env.REDIS_PORT || 6379),
                username: process.env.REDIS_USERNAME,
                password: process.env.REDIS_PASSWORD,
                // lazyConnect: true → don't auto-connect on instantiation.
                // Without this, ioredis starts connecting the instant `new Redis()`
                // runs, racing against our manual `.connect()` call below and
                // making the singleton guard pointless.
                lazyConnect: true,
            });

            // Log errors that happen anytime after the client exists (connect attempt,
            // mid-session drops, auth failures, etc.) without crashing the app.
            redisClient.on("error", (error) => {
                console.error("Redis client error:", error);
            });

            // Fires if an established connection drops later (e.g. Redis Cloud
            // network blip). ioredis auto-reconnects by default, so this is just
            // visibility — not a fatal error.
            // TODO: add alerting/metrics here if Redis uptime becomes critical.
            redisClient.on("close", () => {
                console.warn("Redis connection closed — attempting to reconnect...");
            });

            redisClient.on("reconnecting", () => {
                console.log("Reconnecting to Redis...");
            });
        }

        // Manually connect, store the in-flight promise, then await it.
        connectionPromise = redisClient.connect();
        await connectionPromise;

        console.log("Connected to Redis.");
        return redisClient;
    } catch (error) {
        console.error("Failed to connect to Redis:", error);
        // Reset so a future call can retry instead of being stuck on a dead promise.
        connectionPromise = undefined;
        throw error;
    }
};