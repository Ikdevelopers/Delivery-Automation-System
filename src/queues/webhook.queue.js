import { Queue } from "bullmq";
import { connection } from "../config/redis.js";

const webhookQueue = new Queue("webhook", { connection });

export default webhookQueue;