import 'dotenv/config';
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

import { connectDb } from './src/config/db.js';
import { connectRedis } from './src/config/redis.js';
import app from './src/app.js';

const start = async () => {
    await connectDb();
    await connectRedis();

    const port = Number(process.env.PORT || 5000);
    app.listen(port, () => {
        console.log(`API server listening on port ${port}.`);
    });
};

start().catch((error) => {
    console.error('Application startup error:', error);
    process.exit(1);
});