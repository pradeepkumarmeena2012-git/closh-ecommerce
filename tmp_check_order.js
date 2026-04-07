import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from './backend/src/models/Order.model.js';

dotenv.config({ path: './backend/.env' });

const MONGO_URI = "mongodb+srv://mayurchadokar14_db_user:sORqnMJxbSjnstzY@cluster0.ueig0du.mongodb.net/clouse";

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const order = await Order.findOne({ 
            $or: [
                { orderId: 'ORD-1775369997333-2K8Z' },
                { orderId: /1775369997333/ }
            ] 
        }).populate('deliveryBoyId');
        
        if (order) {
            console.log('ORDER_FOUND');
            console.log(JSON.stringify({
                id: order.orderId,
                status: order.status,
                deliveryBoyId: order.deliveryBoyId?._id,
                deliveryBoyName: order.deliveryBoyId?.name,
                isDeleted: order.isDeleted
            }, null, 2));
        } else {
            console.log('ORDER_NOT_FOUND');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
