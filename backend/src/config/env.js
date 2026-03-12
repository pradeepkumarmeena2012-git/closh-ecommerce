// Validates required environment variables at startup
const requiredEnvVars = [
    'MONGO_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
];

export const validateEnv = () => {
    const missing = requiredEnvVars.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Optional but recommended for Redis
    if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
        console.warn('⚠️  REDIS_HOST or REDIS_URL not set. Falling back to default (127.0.0.1:6379).');
    }

    console.log('Environment variables validated successfully');
};
