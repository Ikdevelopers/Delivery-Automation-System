// src/services/llm.service.js
import { GoogleGenAI } from "@google/genai";
import { getOrCreateCacheHandle } from "./geminiCache.service.js";
import {
    BOT_STATUSES,
    GEMINI_REPLY_STATUSES,
    buildSystemInstruction,
} from "../utils/botPrompt.js";

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    apiVersion: "v1beta",
});

// The model and response schema are fixed at module initialization so every
// classification request uses the same structured JSON contract.
const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const responseSchema = {
    type: "OBJECT",
    properties: {
        status: { type: "STRING", enum: BOT_STATUSES },
        items: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING" },
                    quantity: { type: "NUMBER", nullable: true },
                    unit: { type: "STRING", nullable: true },
                    isAvailable: { type: "BOOLEAN" },
                },
                required: ["name", "quantity", "unit", "isAvailable"],
            },
        },
        missing: {
            type: "STRING",
            enum: ["quantity", "item_detail"],
            nullable: true,
        },
        language: {
            type: "STRING",
            enum: ["roman_urdu", "urdu", "english"],
        },
        replyMessage: { type: "STRING", nullable: true },
    },
    required: ["status", "items", "missing", "language", "replyMessage"],
};

export async function classifyIntent(message, history = [], tenant = {}, menuItems = []) {
    // Lazy-build + memoize systemInstruction:
    // - On a Gemini cache HIT, this never runs — saves wasted string-building work.
    // - On a cache MISS, getOrCreateCacheHandle calls getSystemInstruction() once
    //   (to create the cache), and we also need it again below for the fallback
    //   generateContent call — memoizing avoids building it twice in that case.
    let systemInstruction;
    const getSystemInstruction = () => {
        if (systemInstruction === undefined) {
            systemInstruction = buildSystemInstruction(tenant, menuItems);
        }
        return systemInstruction;
    };

    const tenantId = tenant?._id?.toString();

    // Ask for a cached handle. Returns null if:
    //  - no tenantId available, OR
    //  - cache creation failed / timed out waiting on another worker (see geminiCache.service.js)
    const cacheHandle = tenantId
        ? await getOrCreateCacheHandle(tenantId, getSystemInstruction, menuItems)
        : null;

    // Convert our internal session history format into Gemini's expected shape.
    // NOTE: this is NOT capped here — confirm MAX_HISTORY trimming is already
    // applied upstream (session.service.js) before `history` reaches this function,
    // otherwise an uncapped history defeats your Day 3 cost-control design.
    const geminiHistory = history.map((item) => ({
        role: item.role === "bot" ? "model" : "user",
        parts: [{ text: item.text }],
    }));

    const result = await genAI.models.generateContent({
        model,
        contents: [
            ...geminiHistory,
            {
                role: "user",
                parts: [{ text: message }],
            },
        ],
        config: {
            // Cache hit → reference the cached instructions+menu, don't resend them.
            // Cache miss → fall back to sending systemInstruction inline, just this once.
            ...(cacheHandle
                ? { cachedContent: cacheHandle }
                : { systemInstruction: getSystemInstruction() }),
            responseMimeType: "application/json",
            responseSchema,
        },
    });

    const text = result.text?.trim();

    // Gemini is asked to return JSON — if it ever returns malformed/non-JSON text
    // (model slip-up, empty response, etc.), fail safe instead of crashing the worker.
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        return {
            status: "general_chat",
            items: [],
            missing: null,
            language: "english",
            replyMessage: "Sorry, I didn't understand that. Can you please repeat?",
        };
    }

    // Defensive check: even valid JSON could contain a status value we don't
    // recognize (model hallucination, prompt drift) — treat as safe default.
    if (!BOT_STATUSES.includes(parsed?.status)) {
        return {
            status: "general_chat",
            items: [],
            missing: null,
            language: "english",
            replyMessage: "Sorry, I didn't understand that. Can you please repeat?",
        };
    }

    if (!Array.isArray(parsed.items)) parsed.items = [];
    
    // Only certain statuses are expected to carry a direct reply message;
    // strip replyMessage for any status where it isn't meaningful.
    if (!GEMINI_REPLY_STATUSES.includes(parsed.status)) {
        parsed.replyMessage = null;
    }

    return parsed;
}

// ---------------------------------------------------------------------------

export async function createGeminiCache(systemInstruction, menu) {
    // Build the static menu text that goes INTO the cache (not sent per-call
    // once cached). Only item names for now — revisit if classifyIntent ever
    // needs Gemini to reason about price/category directly from this cache.
    const menuText = menu
        .map((item) => item.name)
        .join("\n");

    const cacheContent = `Available menu items:\n${menuText || "- (menu is empty)"}`;

    // Gemini's cache-create endpoint — NOT generateContent. systemInstruction
    // stays a separate field (not mixed into contents), same as a normal call.
    try {
        const cache = await genAI.caches.create({
            model,
            config: {
                contents: [
                    {
                        role: "user",
                        parts: [{ text: cacheContent }],
                    },
                ],
                systemInstruction,
                ttl: "86400s", // Duration string format required by the API — plain "86400" is rejected
            },
        });

        // The SDK response is a full cache object; we only need its reference
        // name/handle for future calls — that's what gets stored in Redis.
        return cache.name;
    } catch (err) {
        if (
            err?.message?.includes("too small") ||
            err?.status === 400 ||
            err?.status === 429 ||
            err?.message?.includes("limit exceeded") ||
            err?.message?.includes("FreeTier")
        ) {
            console.warn(
                `[Gemini cache] Skipping cache creation (${err?.status || "FreeTier limit"}): ${err?.message || "unsupported/free tier limit"}. Falling back to inline prompt.`
            );
            return null;
        }
        throw err;
    }
}