import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import Tenant from "../models/Tenant.model.js";
import {
    getOrCreateSession,
    pushMessageToSession,
    saveSession,
} from "../services/session.service.js";
import { classifyIntent } from "../services/llm.service.js";

const worker = new Worker(
    "webhook",
    async (job) => {
        const { phoneNumberId, from, text, wamid } = job.data;

        if (!phoneNumberId) {
            console.warn("[Worker] Missing phoneNumberId");
            return { processed: false };
        }

        if (!from || !text) {
            console.warn(`[Worker] Missing message data for wamid: ${wamid}`);
            return { processed: false };
        }

        const tenant = await Tenant.findOne({
            phoneNumberId,
            isActive: true,
        });

        if (!tenant) {
            console.warn(`[Worker] Tenant not found for phoneNumberId: ${phoneNumberId}`);
            return { processed: false };
        }

        const session = await getOrCreateSession(tenant._id.toString(), from);

        const intent = await classifyIntent(
            text,
            session.history,
            tenant,
            [],
        );

        pushMessageToSession(session, {
            role: "user",
            text,
        });

        await saveSession(tenant._id.toString(), from, session);

        console.log(
            `[Worker] wamid: ${wamid} | status: ${intent.status} | items:`,
            intent.items,
        );

        return { processed: true, intent };
    },
    { connection },
);

worker.on("completed", (job) => console.log("Webhook job done:", job.id));
worker.on("failed", (job, err) => console.error("Webhook job failed:", job?.id, err));
worker.on("error", (err) => console.error("Webhook worker error:", err));

export default worker;