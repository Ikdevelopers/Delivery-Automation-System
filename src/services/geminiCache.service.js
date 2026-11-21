import { connectRedis } from "../config/redis.js";
import { createGeminiCache } from "./llm.service.js";
import { randomUUID } from "node:crypto";

// --- Tunable constants ---
// How many times a "losing" worker re-checks Redis before giving up and falling back
const MAX_RETRIES = 3;
// How long to wait between each re-check (ms)
const RETRY_DELAY_MS = 100;
// How long the LOCK itself lives — just long enough to cover one cache-creation
// API call. Short on purpose: if the creating worker crashes mid-way, we don't
// want other workers blocked for long waiting on a dead lock.
const LOCK_TTL_SECONDS = 12;
// How long the actual HANDLE (the real reusable Gemini cache reference) lives.
// Set slightly under 24h to match/stay in sync with the Gemini-side cache TTL —
// no point keeping our Redis pointer alive longer than the thing it points to.
const HANDLE_TTL_SECONDS = 23 * 60 * 60;

// Lua script for a SAFE unlock: only delete the lock if its value still matches
// the token *this* worker set. Prevents Worker A from accidentally deleting
// Worker B's lock in the rare case A's lock already expired and B grabbed a new one.
const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  end
  return 0
`;

/**
 * Returns a valid Gemini cache handle for this tenant.
 * - If one already exists in Redis, returns it immediately (the common case).
 * - If not, uses a distributed lock so only ONE worker creates the cache,
 *   while others wait briefly and reuse the result instead of all calling
 *   Gemini/DB at once (this is "cache stampede" prevention).
 * - Returns null if no handle could be obtained — caller should treat this
 *   as "proceed without cache, send full instructions+menu inline this once."
 */
 async function getOrCreateCacheHandle(tenantId, getInstructions, menu) {
    const redis = await connectRedis();

    // handleKey = the real payload: the reusable Gemini cache reference string
    const handleKey = `gemini_cache:${tenantId}`;
    // lockKey = traffic-cop key, exists only to coordinate who creates the cache
    const lockKey = `gemini_cache_lock:${tenantId}`;

    // 1. Fast path — handle already exists, nothing else to do
    const existingHandle = await redis.get(handleKey);
    if (existingHandle) return existingHandle;

    // 2. No handle yet — try to become the ONE worker that creates it.
    //    NX = only succeeds if no one else holds this lock right now (atomic).
    //    EX = auto-expires the lock even if we crash before releasing it.
    const lockToken = randomUUID(); // unique "ticket" proving the lock is ours
    const lockAcquired = await redis.set(
        lockKey,
        lockToken,
        "EX",
        LOCK_TTL_SECONDS,
        "NX"
    );

    if (lockAcquired === "OK") {
        // We won the lock — we're responsible for creating the cache.
        try {
            const newHandle = await createGeminiCache(getInstructions(), menu);

            if (!newHandle) {
                // Creation didn't return a usable handle — don't throw and crash
                // the caller. Fall back gracefully, same as the "retries exhausted"
                // path below, so every failure mode ends the same safe way.
                return null;
            }

            await redis.set(handleKey, newHandle, "EX", HANDLE_TTL_SECONDS);
            return newHandle;

        } catch (err) {
            console.error("[Gemini cache] Failed to create or store cache:", err);
            return null;

        } finally {
            // ALWAYS release the lock when done — success or failure — so the
            // next attempt (e.g. retry on the next incoming message) isn't
            // blocked waiting for a 12s TTL to expire unnecessarily.
            // Only releases if the lock still holds OUR token (see script above).
            await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, lockToken);
        }

    } else {
        // Someone else already holds the lock — they're creating the cache
        // right now. Don't create a duplicate; wait briefly and re-check
        // Redis instead, since they should finish within a second or two.
        for (let i = 0; i < MAX_RETRIES; i++) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
            const handle = await redis.get(handleKey);
            if (handle) return handle; // other worker finished — reuse it
        }
        // Still nothing after retries — give up waiting, signal fallback.
        // null tells the caller: "no cache available, send full prompt inline
        // for just this one call instead."
        return null;
    }
}

export async function invalidateGeminiCache(tenantId) {
    const redis = await connectRedis();
    await redis.del(`gemini_cache:${tenantId}`)
}

export { getOrCreateCacheHandle };