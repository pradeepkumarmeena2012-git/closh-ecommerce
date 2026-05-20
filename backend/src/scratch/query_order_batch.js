import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function run() {
    try {
        if (!MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            return;
        }
        await mongoose.connect(MONGO_URI);
        
        const Order = mongoose.connection.collection('orders');
        const DeliveryBatch = mongoose.connection.collection('deliverybatches');
        const DeliveryBoy = mongoose.connection.collection('deliveryboys');

        const orderId = 'ORD-260520-UBGZ';
        const order = await Order.findOne({ orderId });
        console.log('--- ORDER DETAILS ---');
        if (order) {
            console.log('ID:', order._id);
            console.log('Status:', order.status);
            console.log('DeliveryBoyId:', order.deliveryBoyId);
            console.log('isMultiVendor:', order.isMultiVendor);
            console.log('vendorPickups:', JSON.stringify(order.vendorPickups, null, 2));
        } else {
            console.log('Order not found');
        }

        console.log('\n--- BATCH DETAILS ---');
        const batches = await DeliveryBatch.find({}).toArray();
        console.log('Total batches in DB:', batches.length);
        for (const batch of batches) {
            console.log('Batch ID:', batch.batchId);
            console.log('Status:', batch.status);
            console.log('DeliveryBoyId:', batch.deliveryBoyId);
            console.log('CustomerId:', batch.customerId);
            console.log('isMultiVendor:', batch.isMultiVendor);
            console.log('pickupStops:', JSON.stringify(batch.pickupStops, null, 2));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
