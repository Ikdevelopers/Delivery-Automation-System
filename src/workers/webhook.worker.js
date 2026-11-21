import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import { connectDb } from "../config/db.js"; // match your actual export/path from config/db.js
import Tenant from "../models/Tenant.model.js";
import {
    getOrCreateSession,
    pushMessageToSession,
    saveSession,
} from "../services/session.service.js";
import { getActiveMenuForTenant } from "../services/menu.service.js";
import { classifyIntent } from "../services/llm.service.js";

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

        // Persist the updated conversation history in Redis.
        await saveSession(tenant._id.toString(), from, session);

        // Log the classification for now; later code can route by intent.status.
        console.log(
            `[Worker] wamid: ${wamid} | status: ${intent.status} | items:`,
            intent.items,
        );

        // Return the result so BullMQ records this job as successfully processed.
        return { processed: true, intent };
    },
    { connection },
);

// Log when BullMQ finishes, fails, or encounters a worker-level error.
worker.on("completed", (job) => console.log("Webhook job done:", job.id));
worker.on("failed", (job, err) => console.error("Webhook job failed:", job?.id, err));
worker.on("error", (err) => console.error("Webhook worker error:", err));

// Export the worker so the application can load and start it.
export default worker;