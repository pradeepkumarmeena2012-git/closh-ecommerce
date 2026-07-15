// Quick diagnostic: Check BullMQ jobs and socket rooms
import 'dotenv/config';
import redisConnection from './src/config/redis.js';
import { Queue } from 'bullmq';

const queue = new Queue('order-escalation-queue', { connection: redisConnection });

async function diagnose() {
    try {
        console.log('=== ORDER ESCALATION QUEUE DIAGNOSIS ===');
        
        const waiting = await queue.getWaiting();
        const delayed = await queue.getDelayed();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        const active = await queue.getActive();
        
        console.log(`\nWaiting: ${waiting.length}`);
        waiting.forEach(j => console.log(`  - ${j.id} | ${j.name} | data: ${JSON.stringify(j.data)}`));
        
        console.log(`\nDelayed: ${delayed.length}`);
        delayed.forEach(j => console.log(`  - ${j.id} | ${j.name} | data: ${JSON.stringify(j.data)} | processAt: ${new Date(j.timestamp + j.delay)}`));
        
        console.log(`\nActive: ${active.length}`);
        active.forEach(j => console.log(`  - ${j.id} | ${j.name} | data: ${JSON.stringify(j.data)}`));
        
        console.log(`\nCompleted: ${completed.length}`);
        completed.forEach(j => console.log(`  - ${j.id} | ${j.name} | data: ${JSON.stringify(j.data)}`));
        
        console.log(`\nFailed: ${failed.length}`);
        failed.forEach(j => console.log(`  - ${j.id} | ${j.name} | data: ${JSON.stringify(j.data)} | failedReason: ${j.failedReason}`));
        
    } catch (err) {
        console.error('Diagnosis error:', err.message);
    }
    process.exit(0);
}

diagnose();
