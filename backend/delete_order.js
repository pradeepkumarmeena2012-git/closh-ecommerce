import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './src/models/Order.model.js';

dotenv.config();

const deleteOrder = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        const result = await Order.deleteOne({ orderId: 'ORD-260531-A2G5' });
        console.log('Delete result:', result);
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

deleteOrder();
