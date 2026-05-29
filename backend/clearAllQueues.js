import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisConnection = new Redis({
    host: '127.0.0.1',
    port: 6379,
});

async function clearAllQueues() {
    const queueNames = [
        'order-wait-queue',
        'rider-search-queue',
        'rider-accept-queue',
        'rider-auto-assign-timeout-queue',
        'rider-auto-assign-retry-queue'
    ];

    for (const qName of queueNames) {
        console.log(`Clearing ${qName}...`);
        const q = new Queue(qName, { connection: redisConnection });
        await q.obliterate({ force: true }).catch(err => console.log(`Error obliterating ${qName}:`, err.message));
        console.log(`${qName} cleared!`);
    }

    redisConnection.quit();
}

clearAllQueues().catch(err => {
    console.error(err);
    process.exit(1);
});
