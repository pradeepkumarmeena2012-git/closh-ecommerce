import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../src/models/Order.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/closh';

async function diagnose() {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const orders = await Order.find({
        deliveryBoyId: { $exists: true, $ne: null },
        status: { $nin: ['assigned', 'picked_up', 'out_for_delivery', 'arrived', 'delivered', 'cancelled'] }
    });

    console.log(`\nFound ${orders.length} orders that have deliveryBoyId but status is not in active/complete states:`);
    orders.forEach(o => {
        console.log(`- Order: ${o.orderId}, Status: ${o.status}, deliveryBoyId: ${o.deliveryBoyId}`);
    });

    await mongoose.disconnect();
}

diagnose().catch(err => {
    console.error('Diagnostic failed:', err);
    mongoose.disconnect();
});
