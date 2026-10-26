import dotenv from 'dotenv';
dotenv.config();

import { connectRedis, redisClient } from './redis.js';

const testRedis = async () => {
    try {
        await connectRedis();

        // SET a test key
        await redisClient.set('test_key', 'hello');
        console.log('SET successful: test_key = hello');

        // GET the test key back
        const value = await redisClient.get('test_key');
        console.log('GET result:', value);

        process.exit(0);
    } catch (error) {
        console.error('Redis test failed:', error);
        process.exit(1);
    }
};

testRedis();