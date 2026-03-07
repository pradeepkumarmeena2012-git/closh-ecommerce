import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Order from './src/models/Order.model.js';

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const orderId = 'ORD-1772783516344-PQ1D';
        const order = await Order.findOne({ orderId }).lean();
        console.log('Order Details:', JSON.stringify(order, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
