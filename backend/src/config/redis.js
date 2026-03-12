import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

const redisClient = createClient({
    url: redisUrl,
    password: process.env.REDIS_PASSWORD || undefined
});

redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
    console.log('📡 Redis client connecting...');
});

redisClient.on('ready', () => {
    console.log('✅ Redis client ready and connected');
});

export const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error.message);
        // We don't necessarily want to crash the whole app if Redis fails, 
        // but for high-performance apps, it might be critical.
        // For now, we'll just log the error.
    }
};

export default redisClient;
