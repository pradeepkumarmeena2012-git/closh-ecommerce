import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './src/models/Order.model.js';

dotenv.config();

const removeOrder = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const orderId = 'ORD-260602-CM3R';
        const result = await Order.deleteOne({ orderId: orderId });
        console.log(`Deletion result for ${orderId}:`, result);
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

removeOrder();
