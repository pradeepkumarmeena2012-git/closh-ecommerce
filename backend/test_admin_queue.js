import 'dotenv/config';
import { QueueService } from './src/services/queue.service.js';
import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import Order from './src/models/Order.model.js';

async function test() {
    await connectDB();
    const order = await Order.findOne({orderId: 'ORD-260715-MB0T'});
    if(!order) {
        console.log("Order not found");
        process.exit(1);
    }
    
    const { orderEscalationQueue } = await import('./src/services/queue.service.js');
    await orderEscalationQueue.add('admin-escalation', { orderId: order._id, phase: 'admin' }, { delay: 1000, jobId: `test-admin-${Date.now()}` });
    
    console.log("Enqueued admin phase test");
    setTimeout(() => process.exit(0), 5000);
}

test();
