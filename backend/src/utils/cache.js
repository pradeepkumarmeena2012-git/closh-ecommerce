import redisClient from '../config/redis.js';

/**
 * Get item from Redis cache
 * @param {string} key 
 */
export const getCache = async (key) => {
    if (!redisClient) return null; // Skip if Redis is not configured

    try {
        const cachedValue = await redisClient.get(key);
        return cachedValue ? JSON.parse(cachedValue) : null;
    } catch (error) {
        console.error(`❌ Cache get failed for ${key}:`, error.message);
        return null; // Return null so the app can fallback to DB
    }
};

/**
 * Set item in Redis cache
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlInSeconds 
 */
export const setCache = async (key, value, ttlInSeconds = 3600) => {
    if (!redisClient) return false; // Skip if Redis is not configured

    try {
        await redisClient.set(key, JSON.stringify(value), 'EX', ttlInSeconds);
        return true;
    } catch (error) {
        console.error(`❌ Cache set failed for ${key}:`, error.message);
        return false;
    }
};

/**
 * Delete item or items by pattern from Redis cache
 * @param {string} key pattern 
 */
export const deleteCache = async (key) => {
    if (!redisClient) return false; // Skip if Redis is not configured

    try {
        await redisClient.del(key);
        return true;
    } catch (error) {
        console.error(`❌ Cache deletion failed for ${key}:`, error.message);
        return false;
    }
};

/**
 * Delete all keys matching a pattern (e.g., 'products:*')
 */
export const clearCachePattern = async (pattern) => {
    if (!redisClient) return; // Skip if Redis is not configured

    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    } catch (error) {
        console.error(`❌ Cache clear failed for pattern ${pattern}:`, error.message);
    }
};

