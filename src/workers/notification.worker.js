import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../config/redis.js";

//making my first worker
const worker = new Worker(
    "notification",
    async (job) => {
        console.log("Processing notification job:", job.id, job.data);
        // TODO: later — send WhatsApp message here
        return { processed: true };
    },
    { connection }
);
worker.on("completed", (job) => console.log("Notification job done:", job.id));
worker.on("failed", (job, err) => console.error("Notification job failed:", job?.id, err));
worker.on("error", (err) => console.error("Notification worker error:", err));

export default worker;