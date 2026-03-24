import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redisClient from '../config/redis.js';

const IS_DEV = String(process.env.NODE_ENV || '').toLowerCase() !== 'production';

// Check if Redis should be used (if explicitly configured AND client exists)
const useRedis = !!(redisClient && (process.env.REDIS_URL || process.env.REDIS_HOST));

// Helper to create a store with a unique prefix
const createStore = (prefix) => {
    if (!useRedis) {
        if (IS_DEV) {
            console.log(`ℹ️  Redis not configured for ${prefix}. Using default MemoryStore.`);
        }
        return undefined; // Falls back to express-rate-limit's default MemoryStore
    }

    try {
        return new RedisStore({
            sendCommand: async (...args) => {
                // Wait for Redis to be ready (up to 15 seconds)
                let retries = 0;
                while (!redisClient?.isReady && retries < 150) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    retries++;
                }

                if (!redisClient?.isReady) {
                    console.error(`❌ Redis connection timed out for ${prefix}. (Ready: ${redisClient?.isReady}, Open: ${redisClient?.isOpen})`);
                    throw new Error("Redis connection timed out");
                }

                return redisClient.sendCommand(args);
            },
            prefix: prefix,
        });
    } catch (err) {
        console.error(`❌ Failed to initialize RedisStore for ${prefix}:`, err.message);
        return undefined;
    }
};

// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: IS_DEV ? 10000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
    store: createStore('rl-api:'),
});

// Strict limiter for auth endpoints
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: IS_DEV ? 10000 : 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
    store: createStore('rl-auth:'),
});

// OTP resend limiter
export const otpLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: IS_DEV ? 10000 : 3,
    message: { success: false, message: { success: false, message: 'Too many OTP requests, please wait a minute.' } },
    store: createStore('rl-otp:'),
});

// Location update limiter
export const locationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: IS_DEV ? 10000 : 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Location update rate limit reached, retrying shortly.' },
    skip: (req) => !req.body?.currentLocation,
    store: createStore('rl-loc:'),
});
