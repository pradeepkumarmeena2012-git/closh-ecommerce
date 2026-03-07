import rateLimit from 'express-rate-limit';

const IS_DEV = String(process.env.NODE_ENV || '').toLowerCase() !== 'production';

// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: IS_DEV ? 10000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
});

// Strict limiter for auth endpoints (login, register, forgot-password)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: IS_DEV ? 10000 : 5,  // unlimited in dev; strict in production
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
});

// OTP resend limiter
export const otpLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: IS_DEV ? 10000 : 3,
    message: { success: false, message: 'Too many OTP requests, please wait a minute.' },
});

// Location update limiter — for GPS ping endpoints
export const locationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: IS_DEV ? 10000 : 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Location update rate limit reached, retrying shortly.' },
    skip: (req) => !req.body?.currentLocation,
});
