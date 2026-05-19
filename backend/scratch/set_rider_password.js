import mongoose from 'mongoose';
import DeliveryBoy from '../src/models/DeliveryBoy.model.js';

const MONGO_URI = "mongodb://sagarchouhan7609_db_user:KFEVeH7lz1eXUVm2@ac-rl5zlnj-shard-00-00.ongvntq.mongodb.net:27017,ac-rl5zlnj-shard-00-01.ongvntq.mongodb.net:27017,ac-rl5zlnj-shard-00-02.ongvntq.mongodb.net:27017/clothify?ssl=true&replicaSet=atlas-13vyk9-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
    console.log('Connecting...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const riderEmail = 'rider@closh.com';
    const rider = await DeliveryBoy.findOne({ email: riderEmail });
    if (!rider) {
        console.error('Rider not found!');
        process.exit(1);
    }

    rider.password = 'delivery123';
    // Let Mongoose save and trigger password pre-save hook
    await rider.save();

    console.log('Successfully set password for Test Rider to delivery123');
    await mongoose.disconnect();
}

run().catch(console.error);
