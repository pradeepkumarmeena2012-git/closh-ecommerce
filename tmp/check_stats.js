import mongoose from 'mongoose';
import Order from '../backend/src/models/Order.model.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../backend/.env' });

const checkStats = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const allOrders = await Order.find({ deliveryBoyId: { $exists: true } }).select('deliveryBoyId status');
        console.log(`Found ${allOrders.length} orders with deliveryBoyId`);

        const stats = await Order.aggregate([
            {
                $group: {
                    _id: '$deliveryBoyId',
                    total: { $sum: 1 },
                    delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } }
                }
            }
        ]);

        console.log('Stats by deliveryBoyId:');
        stats.forEach(s => {
            console.log(`BoyID: ${s._id} | Total: ${s.total} | Delivered: ${s.delivered}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkStats();
