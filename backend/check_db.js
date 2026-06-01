import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './src/models/Order.model.js';

dotenv.config();

const checkOrder = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        let order = await Order.findOne({ status: 'returning_unselected_items' }).sort({createdAt: -1})
            .populate('vendorItems.vendorId', 'storeName shopAddress shopLocation phone')
            .populate('deliveryBoyId', 'name phone currentLocation')
            .select('+deliveryOtpHash +deliveryOtpExpiry +deliveryOtpSentAt +deliveryOtpAttempts');
            
        console.log("vendorReturnStops:", JSON.stringify(order.vendorReturnStops, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

checkOrder();
