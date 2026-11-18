// src/services/llm.service.js
import { GoogleGenAI } from "@google/genai";
import {
    BOT_STATUSES,
    GEMINI_REPLY_STATUSES,
    buildSystemInstruction,
} from "../utils/botPrompt.js";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = "gemini-2.5-flash";

export async function classifyIntent(message, history = [], tenant = {}, menuItems = []) {
    const systemInstruction = buildSystemInstruction(tenant, menuItems);

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
            systemInstruction,
            responseMimeType: "application/json",
        },
    });

    const text = result.text?.trim();

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        return {
            status: "general_chat",
            items: [],
            missing: null,
            language: "english",
            replyMessage: null,
        };
    }

    if (!BOT_STATUSES.includes(parsed?.status)) {
        return {
            status: "general_chat",
            items: [],
            missing: null,
            language: "english",
            replyMessage: null,
        };
    }

    if (!GEMINI_REPLY_STATUSES.includes(parsed.status)) {
        parsed.replyMessage = null;
    }

    return parsed;
}