import dotenv from 'dotenv';
dotenv.config();
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);
import { connectDb } from './src/config/db.js';

connectDb();