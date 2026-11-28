import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../config/redis.js";

//making my first worker
const worker = new Worker(
    "notification",
    async (job) => {
        console.log("Processing notification job:", job.id, job.data);

        switch (job.name) {
            case "vendor-notify":
                const { phone, shortCode, items, orderId } = job?.data;
                console.log(`Phone: ${phone}, \n Shor-Code: ${shortCode}, \n items: ${items.map((item) => JSON.stringify(item)).join("\n")}, Id: ${orderId}`);
                break;

            default:
                console.warn(`Unknown job type: ${job.name}`);
                break;
        }


        // TODO: later — send WhatsApp message here
        return { processed: true };
    },
    { connection }
);
worker.on("completed", (job) => console.log("Notification job done:", job.id));
worker.on("failed", (job, err) => console.error("Notification job failed:", job?.id, err));
worker.on("error", (err) => console.error("Notification worker error:", err));

export default worker;