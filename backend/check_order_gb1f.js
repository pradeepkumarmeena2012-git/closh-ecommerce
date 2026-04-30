import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from './src/models/Order.model.js';
import fs from 'fs';

dotenv.config();

async function checkOrder() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const order = await Order.findOne({ orderId: 'ORD-260425-GB1F' });
        
        if (!order) {
            console.log('Order not found');
            process.exit(0);
        }

        fs.writeFileSync('order_debug.json', JSON.stringify(order, null, 2), 'utf8');
        console.log('Order details written to order_debug.json');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkOrder();
