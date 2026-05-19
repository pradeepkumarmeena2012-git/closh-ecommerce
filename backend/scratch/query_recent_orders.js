import mongoose from 'mongoose';
import Order from '../src/models/Order.model.js';
import User from '../src/models/User.model.js';
import DeliveryBoy from '../src/models/DeliveryBoy.model.js';

const MONGO_URI = "mongodb://sagarchouhan7609_db_user:KFEVeH7lz1eXUVm2@ac-rl5zlnj-shard-00-00.ongvntq.mongodb.net:27017,ac-rl5zlnj-shard-00-01.ongvntq.mongodb.net:27017,ac-rl5zlnj-shard-00-02.ongvntq.mongodb.net:27017/clothify?ssl=true&replicaSet=atlas-13vyk9-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const orders = await Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'phone email name')
        .populate('deliveryBoyId', 'phone email name')
        .lean();

    console.log(`Found ${orders.length} recent orders:`);
    orders.forEach(o => {
        console.log(`-----------------------------------------------`);
        console.log(`Order ID: ${o.orderId} (${o._id})`);
        console.log(`Status: ${o.status}`);
        console.log(`Total: ${o.total}`);
        console.log(`Created At: ${o.createdAt}`);
        console.log(`Customer: ${o.userId?.phone || 'Guest'} | ${o.userId?.name}`);
        console.log(`Rider: ${o.deliveryBoyId?.phone || 'None'} | ${o.deliveryBoyId?.name}`);
        console.log(`Delivery OTP: ${o.deliveryOtpDebug}`);
    });

    await mongoose.disconnect();
}

run().catch(console.error);
