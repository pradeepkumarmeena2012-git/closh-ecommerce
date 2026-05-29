import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisConnection = new Redis({
    host: '127.0.0.1',
    port: 6379,
});

async function clearQueue() {
    const riderAutoAssignRetryQueue = new Queue('rider-auto-assign-retry-queue', { connection: redisConnection });
    
    console.log('Clearing rider-auto-assign-retry-queue...');
    await riderAutoAssignRetryQueue.obliterate({ force: true });
    console.log('Queue cleared successfully!');
    
    redisConnection.quit();
}

clearQueue().catch(err => {
    console.error(err);
    process.exit(1);
});
