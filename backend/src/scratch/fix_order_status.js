import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function fixOrder() {
    try {
        if (!MONGO_URI) { console.error('MONGO_URI not found'); return; }
        await mongoose.connect(MONGO_URI);
        
        const orders = mongoose.connection.collection('orders');
        const orderId = 'ORD-260520-UBGZ';
        
        // Fix the order status from 'all_vendors_ready' back to 'assigned' 
        // since it already has a deliveryBoyId
        const result = await orders.updateOne(
            { orderId, deliveryBoyId: { $exists: true, $ne: null } },
            { $set: { status: 'assigned' } }
        );
        
        console.log('Fix result:', result);
        
        // Verify
        const order = await orders.findOne({ orderId });
        console.log('Updated order status:', order?.status);
        console.log('DeliveryBoyId:', order?.deliveryBoyId);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixOrder();
