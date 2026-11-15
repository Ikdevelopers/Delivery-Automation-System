import { connectRedis } from "../config/redis.js"; // adjust path if needed

export const checkDuplicateMessage = async (req, res, next) => {
  try {
    // 1. extract wamid from the incoming Meta webhook body
    const wamid = _______________________________;

    if (!wamid) {
      return next(); // no id to dedup on, let it pass through
    }

    const redisClient = _______________________________; // get your existing redis client

    // 2. SET key only if it doesn't exist (NX), expire in 24h (EX 86400)
    const result = await redisClient.set(
      `wamid:${wamid}`,
      "1",
      "EX",
      _______,
      "____"
    );

    // 3. if result is null, key already existed → duplicate
    if (result === null) {
      return _______________________________;
    }

    // not a duplicate, continue to controller
    next();
  } catch (error) {
    // decide: on Redis failure, should you block the request or let it through?
    _______________________________
  }
};