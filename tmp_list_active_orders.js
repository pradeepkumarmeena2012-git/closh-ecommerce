import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from './backend/src/models/Order.model.js';

dotenv.config({ path: './backend/.env' });

const MONGO_URI = "mongodb+srv://mayurchadokar14_db_user:sORqnMJxbSjnstzY@cluster0.ueig0du.mongodb.net/clouse";

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const orders = await Order.find({ 
            status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] },
            isDeleted: { $ne: true }
        }).populate('deliveryBoyId');
        
        console.log('ACTIVE_ORDERS_DATA');
        console.log(JSON.stringify(orders.map(o => ({
            orderId: o.orderId,
            status: o.status,
            riderId: o.deliveryBoyId?._id,
            riderName: o.deliveryBoyId?.name,
            total: o.total,
            updatedAt: o.updatedAt
        })), null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
