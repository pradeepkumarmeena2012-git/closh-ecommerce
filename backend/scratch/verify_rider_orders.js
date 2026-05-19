import mongoose from 'mongoose';
import Order from '../src/models/Order.model.js';

const MONGO_URI = "mongodb://sagarchouhan7609_db_user:KFEVeH7lz1eXUVm2@ac-rl5zlnj-shard-00-00.ongvntq.mongodb.net:27017,ac-rl5zlnj-shard-00-01.ongvntq.mongodb.net:27017,ac-rl5zlnj-shard-00-02.ongvntq.mongodb.net:27017/clothify?ssl=true&replicaSet=atlas-13vyk9-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const orders = await Order.find({ 
        isMultiVendor: true,
        status: { $nin: ['delivered', 'cancelled', 'returned'] }
    }).lean();

    console.log(`\nFound ${orders.length} active multi-vendor orders:`);
    orders.forEach(o => {
        console.log(`- ID: ${o._id} | OrderID: ${o.orderId} | Status: ${o.status} | deliveryBoyId: ${o.deliveryBoyId}`);
    });

    await mongoose.disconnect();
}

run().catch(console.error);
