import mongoose from 'mongoose';
import { Order } from './src/models/Order.model.js';

async function fix() {
    try {
        await mongoose.connect('mongodb+srv://mayurchadokar14_db_user:sORqnMJxbSjnstzY@cluster0.ueig0du.mongodb.net/clouse');
        const order = await Order.findOne({ orderId: 'ORD-260707-PKFK' });
        if (order) {
            order.status = 'delivered';
            order.deliveryBoyId = undefined; // Clear broken ID so it doesn't crash populate
            order.deliveredAt = new Date();
            await order.save();
            console.log("Order fixed!");
        } else {
            console.log("Order not found");
        }
    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
fix();
