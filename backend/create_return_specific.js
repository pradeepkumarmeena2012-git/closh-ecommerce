import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Order from './src/models/Order.model.js';
import ReturnRequest from './src/models/ReturnRequest.model.js';

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const orderId = 'ORD-1772783516344-PQ1D';
        const order = await Order.findOne({ orderId }).lean();

        if (!order) {
            console.log('Order not found');
            process.exit(1);
        }

        console.log('Order status:', order.status);
        if (order.status !== 'delivered') {
            console.log('Order NOT delivered, cannot return');
            process.exit(1);
        }

        const userId = order.userId;
        const vendorId = order.vendorItems[0].vendorId;
        const reason = 'User requested return for ORD-1772783516344-PQ1D';

        const items = order.items.filter(i => String(i.vendorId) === String(vendorId)).map(i => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            reason: reason
        }));

        const refundAmount = items.reduce((sum, item) => sum + (item.quantity * 10), 0); // Mock

        const request = await ReturnRequest.create({
            orderId: order._id,
            userId: userId,
            vendorId,
            items: items,
            reason: reason,
            status: 'pending',
            refundAmount: refundAmount,
            refundStatus: 'pending'
        });

        console.log('SUCCESS! Created Request ID:', request._id);
        process.exit(0);
    } catch (err) {
        console.error('FAILED:', err);
        process.exit(1);
    }
}

test();
