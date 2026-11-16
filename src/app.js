import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRouter from "./routes/auth.routes.js"
import tenantRouter from "./routes/tenant.routes.js"
import webhookRouter from "./routes/webhook.routes.js"
import messageQueue from "./queues/notification.queue.js"

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//custom middlewares
app.use("/api/auth", authRouter);
app.use("/api/tenants", tenantRouter);
app.use("/api/webhooks", webhookRouter);


//Queue middellwares
app.post("/message-notify", async (req, res) => {
    const job = await messageQueue.add("add-message-to-queue", {
        to: req.body.to,
        name: req.body.name || "Learner",
    }, {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
    });

    res.status(202).json({ jobId: job.id });
});


app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

export default app;