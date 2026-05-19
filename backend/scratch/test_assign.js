import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../src/models/Order.model.js';
import DeliveryBoy from '../src/models/DeliveryBoy.model.js';
import DeliveryBatch from '../src/models/DeliveryBatch.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/closh';

async function test() {
    console.log('Connecting...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const orderId = 'ORD-260519-RUZH';
    const riderId = '6a084c96e05571753d443ad4';

    const order = await Order.findOne({ orderId });
    console.log('Current status:', order.status);
    console.log('Current deliveryBoyId:', order.deliveryBoyId);

    // Simulate assignDeliveryBoy logic
    const deliveryBoy = await DeliveryBoy.findById(riderId);
    order.deliveryBoyId = riderId;
    if (['ready_for_pickup', 'all_vendors_ready'].includes(order.status)) {
        order.status = 'assigned';
    }

    console.log('After status assignment, status is:', order.status);

    await order.save();
    console.log('Order saved!');

    const savedOrder = await Order.findOne({ orderId });
    console.log('Saved status in DB:', savedOrder.status);
    console.log('Saved deliveryBoyId in DB:', savedOrder.deliveryBoyId);

    await mongoose.disconnect();
}

test().catch(console.error);
