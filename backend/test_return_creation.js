import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import Order from './src/models/Order.model.js';
import ReturnRequest from './src/models/ReturnRequest.model.js';
import Notification from './src/models/Notification.model.js';
import Admin from './src/models/Admin.model.js';

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const orderId = 'ORD-1772438490143-6JCZ';
        const userId = '69a02616144ee60c64de4c8d';

        const order = await Order.findOne({
            $or: [{ _id: mongoose.isValidObjectId(orderId) ? orderId : null }, { orderId: orderId }],
            userId: userId,
        });

        if (!order) {
            console.log('Order not found');
            process.exit(1);
        }

        console.log('Order found, total items:', order.items.length);

        const vendorId = String(order.items[0].vendorId);
        const reason = 'Mock test return from script';

        const normalizedItems = order.items.filter(i => String(i.vendorId) === vendorId).map(i => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            reason: reason
        }));

        const refundAmount = normalizedItems.reduce((sum, item) => sum + (item.quantity * 10), 0); // Mock

        console.log('Creating Return Request...');
        const request = await ReturnRequest.create({
            orderId: order._id,
            userId: userId,
            vendorId,
            items: normalizedItems,
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
