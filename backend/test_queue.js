import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import Order from './src/models/Order.model.js';
import { QueueService } from './src/services/queue.service.js';

async function test() {
    await connectDB();
    const order = await Order.findOne({orderId: 'ORD-260715-MB0T'});
    if(!order) {
        console.log("Order not found");
        process.exit(1);
    }
    
    // Pass 1 second and 3 second delays
    await QueueService.scheduleAdminEscalation(order._id, 1000);
    await QueueService.scheduleUserNoPartnerNotification(order._id, 3000);
    
    console.log("Enqueued both tests");
    setTimeout(() => process.exit(0), 5000);
}

test();
