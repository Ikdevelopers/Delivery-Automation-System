import dotenv from 'dotenv';
dotenv.config();
import { connectRedis } from "../config/redis.js"; // adjust path if needed


export const checkDuplicateMessage = async (req, res, next) => {
  try {
    const value = req.webhookData?.value;

    // incoming customer message has an id under messages[0].id
    // outgoing status updates (sent/delivered/read) have id under statuses[0].id
    // use ?. chains so a missing shape doesn't throw, just falls through to undefined

    //For incoming and outgoing messages in one line
    const wamid = value?.messages?.[0]?.id ?? value?.statuses?.[0]?.id;

    if (!wamid) {
      return next(); // nothing to dedup against (malformed/unexpected payload) — let it through
    }

    const redisClient = await connectRedis(); // reuse existing singleton, no second connection

    // 2. SET key only if it doesn't exist (NX), expire in 24h (EX 86400)
    const result = await redisClient.set(
      `wamid:${wamid}`,
      "1",
      "EX",
      24 * 60 * 60,
      "NX"
    );

    // 3. if result is null, key already existed → duplicate
    if (result === null) {
      return res.status(200).json({ status: "duplicate", message: "Duplicate webhook ignored." });
    }

    // not a duplicate, continue to controller
    next();
  } catch (error) {
    console.error("Redis deduplication failed:", error);
    // If Redis is down, fail open so we don't drop legitimate webhook events.
    return next();
  }
};