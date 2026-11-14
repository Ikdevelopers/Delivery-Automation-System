import { Queue } from "bullmq";
import { connection } from "../config/redis.js";

// TODO: name this queue "notification"
const notificationQueue = new Queue("notification", { connection });

export default notificationQueue;