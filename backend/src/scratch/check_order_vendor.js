import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function checkOrderVendor() {
    try {
        if (!MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            return;
        }
        await mongoose.connect(MONGO_URI);
        
        const Order = mongoose.model('Order', new mongoose.Schema({
            orderId: String,
            vendorItems: Array
        }, { strict: false }));

        const orderIds = ['ORD-1774375947431-9HCY', 'ORD-1774376497910-6LDL'];
        for (const oid of orderIds) {
            const order = await Order.findOne({ orderId: oid });
            if (order) {
                console.log(`Order: ${oid}, VendorName: ${order.vendorItems?.[0]?.vendorName}, VendorID: ${order.vendorItems?.[0]?.vendorId}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkOrderVendor();
