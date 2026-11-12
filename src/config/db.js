import mongoose from 'mongoose';
import { setServers } from 'node:dns';
import { DB_NAME } from '../constant.js';

export const connectDb = async () => {
    try {

        if (mongoose.connection.readyState === 1) {
            console.log("Already connected to db.");
            return;
        }

        setServers(['1.1.1.1', '1.0.0.1']);
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);
        console.log(`\n Mongo Db connected. \nConnection host is: ${connectionInstance.connection.host}`);
        
    } catch (error) {
        console.error('DB connection error:', error);
        process.exit(1);
    }
};