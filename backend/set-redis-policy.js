import ioredis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
};

const redisConnection = new ioredis(redisConfig);

redisConnection.config('SET', 'maxmemory-policy', 'noeviction')
    .then(() => {
        console.log('✅ Successfully set maxmemory-policy to noeviction');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Failed to set policy:', err);
        process.exit(1);
    });
