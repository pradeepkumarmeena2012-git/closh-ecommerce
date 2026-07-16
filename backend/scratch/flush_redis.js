import redisClient from '../src/config/redis.js';

const flushCache = async () => {
    try {
        if (!redisClient) {
            console.log("Redis is not configured.");
            process.exit(0);
        }
        await redisClient.flushall();
        console.log("✅ Successfully flushed Redis cache!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to flush Redis cache:", error);
        process.exit(1);
    }
};

flushCache();
