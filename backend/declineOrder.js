import mongoose from 'mongoose';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisConnection = new Redis({
    host: '127.0.0.1',
    port: 6379,
});

async function declineOrder() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!');

    // Import the Order model dynamically or manually define it to avoid deep imports
    const orderSchema = new mongoose.Schema({ status: String, deliveryBoyId: mongoose.Schema.Types.ObjectId, vendorPickups: Array, rejectionReason: String });
    const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

    const orderId = '6a180c2b556bbe6df2c7e500';

    console.log('Updating order status to cancelled...');
    await Order.findByIdAndUpdate(orderId, {
        status: 'cancelled',
        rejectionReason: 'Declined due to no delivery partners available (manual intervention)'
    });
    console.log('Order declined successfully!');

    console.log('Clearing rider-auto-assign-retry-queue...');
    const riderAutoAssignRetryQueue = new Queue('rider-auto-assign-retry-queue', { connection: redisConnection });
    await riderAutoAssignRetryQueue.obliterate({ force: true });
    console.log('Queue cleared successfully!');

    await mongoose.disconnect();
    redisConnection.quit();
}

declineOrder().catch(err => {
    console.error(err);
    process.exit(1);
});
