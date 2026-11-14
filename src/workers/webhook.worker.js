import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../config/redis.js";

const worker = new Worker(
    "webhook",
    async (job) => {
        console.log("Processing webhook job:", job.id, job.data);
        // TODO: later — call Gemini here to classify intent
        return { processed: true };
    },
    { connection }
)

worker.on("completed", (job) => console.log("Webhook job done:", job.id));
worker.on("failed", (job, err) => console.error("Webhook job failed:", job?.id, err));
worker.on("error", (err) => console.error("Webhook worker error:", err));

export default worker;