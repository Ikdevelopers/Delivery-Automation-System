import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRouter from "./routes/auth.routes.js"

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
//custom middlewares
app.use("/api/auth", authRouter);

app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

export default app;