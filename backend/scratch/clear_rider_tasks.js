import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function clearRiderTasks() {
    try {
        if (!MONGO_URI) {
            console.error('❌ MONGO_URI not found');
            return;
        }

        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;

        const riderEmail = 'rider@closh.com';
        const rider = await db.collection('deliveryboys').findOne({ email: riderEmail });

        if (!rider) {
            console.log(`❌ Rider with email ${riderEmail} not found!`);
            return;
        }

        console.log(`Rider found: ${rider.name} (${rider._id})`);

        // Find active blocking orders for this rider
        const blockingOrders = await db.collection('orders').find({
            deliveryBoyId: rider._id,
            status: { $in: ['assigned', 'picked_up', 'out_for_delivery', 'arrived'] }
        }).toArray();

        console.log(`Found ${blockingOrders.length} active orders assigned to this rider.`);

        for (const order of blockingOrders) {
            console.log(`Completing/delivering order ${order.orderId} to clear the block...`);
            await db.collection('orders').updateOne(
                { _id: order._id },
                { 
                    $set: { 
                        status: 'delivered',
                        paymentStatus: 'paid',
                        isCashSettled: true,
                        deliveredAt: new Date()
                    }
                }
            );
            console.log(`✅ Order ${order.orderId} status set to delivered.`);
        }

        // Also check if any other orders are in 'assigned' or similar status for this rider
        const anyAssigned = await db.collection('orders').updateMany(
            { deliveryBoyId: rider._id, status: { $in: ['assigned', 'picked_up', 'out_for_delivery', 'arrived'] } },
            { $set: { status: 'delivered', paymentStatus: 'paid', deliveredAt: new Date() } }
        );
        console.log(`Updated another ${anyAssigned.modifiedCount} potentially lingering orders.`);

        console.log('\n⚡ Test Rider is now completely free with no active missions!');

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

clearRiderTasks();
