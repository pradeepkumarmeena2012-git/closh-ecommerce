import { createClient } from 'redis';

const IS_REDIS_CONFIGURED = !!(process.env.REDIS_URL || process.env.REDIS_HOST);

let redisClient = null;

if (IS_REDIS_CONFIGURED) {
    const config = {
        password: process.env.REDIS_PASSWORD || undefined,
        username: process.env.REDIS_USERNAME || 'default',
    };

    if (process.env.REDIS_URL) {
        config.url = process.env.REDIS_URL;
    } else {
        config.socket = {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: parseInt(process.env.REDIS_PORT || '6379'),
        };
    }

    redisClient = createClient(config);

    redisClient.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
        console.log('📡 Redis client connecting...');
    });

    redisClient.on('ready', () => {
        console.log('✅ Redis client ready and connected');
    });

    // Start connection immediately in background to avoid blocking other modules
    redisClient.connect().catch(() => {
        // Errors are already handled by the 'error' listener
    });
}

export const connectRedis = async () => {
    if (!IS_REDIS_CONFIGURED) {
        console.log('ℹ️  Redis not configured. Skipping connection.');
        return;
    }
    
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
    } catch (error) {
        console.error('❌ Failed to connect to Redis during explicit call:', error.message);
    }
};

export default redisClient;
