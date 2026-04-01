import redisClient from './config/redis.js';

async function clear() {
    try {
        const keys = await redisClient.keys('products:*');
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`Cleared ${keys.length} product cache keys.`);
        } else {
            console.log('No product cache keys found.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

clear();
