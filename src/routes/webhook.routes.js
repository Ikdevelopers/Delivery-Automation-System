import { Router } from "express";
import { handleWebhook } from "../controllers/webhook.controller.js";
import { checkDuplicateMessage } from "../middleware/dedup.middleware.js";

const router = Router();

router.post("/", (req, _res, next) => {
    const entry = req.body?.entry?.[0];
    req.webhookData = {
        entry,
        value: entry?.changes?.[0]?.value,
    };
    next();
}, checkDuplicateMessage, handleWebhook);

export default router;