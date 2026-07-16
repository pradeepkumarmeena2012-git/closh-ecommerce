import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { Order } from '../src/models/Order.model.js';
import DeliveryBoy from '../src/models/DeliveryBoy.model.js';

const updateEarnings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const orderId = "ORD-TEST-303377";
        
        // Find Order
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            console.error(`❌ Order ${orderId} not found.`);
            process.exit(1);
        }

        // Update Order earnings
        order.deliveryEarnings = 50; 
        order.deliveryDistance = 5.2; // Add some dummy distance in km
        await order.save();
        console.log(`✅ Updated delivery earnings on Order to ₹50.`);

        // Find Delivery Boy
        const deliveryBoy = await DeliveryBoy.findById(order.deliveryBoyId);
        if (deliveryBoy) {
            deliveryBoy.totalDeliveries = 1;
            deliveryBoy.totalEarnings = 50;
            deliveryBoy.availableBalance = 50;
            // It was a COD order of ₹575
            deliveryBoy.cashInHand = 575;
            deliveryBoy.cashCollected = 575; 
            await deliveryBoy.save();
            console.log(`✅ Updated Delivery Boy total earnings and cash in hand.`);
        }

        console.log("Earnings seeded successfully!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error updating earnings:", error);
        process.exit(1);
    }
};

updateEarnings();
