import mongoose from 'mongoose';
import Order from '../src/models/Order.model.js';

const MONGO_URI = "mongodb://sagarchouhan7609_db_user:KFEVeH7lz1eXUVm2@ac-rl5zlnj-shard-00-00.ongvntq.mongodb.net:27017,ac-rl5zlnj-shard-00-01.ongvntq.mongodb.net:27017,ac-rl5zlnj-shard-00-02.ongvntq.mongodb.net:27017/clothify?ssl=true&replicaSet=atlas-13vyk9-shard-0&authSource=admin&retryWrites=true&w=majority";

async function check() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    // Let's print the status enum from the compiled schema
    const statusEnum = Order.schema.path('status').enumValues;
    console.log('Compiled Order status enum values:', statusEnum);

    const vendorItemStatusEnum = Order.schema.path('vendorItems.status').enumValues;
    console.log('Compiled vendorItems.status enum values:', vendorItemStatusEnum);

    await mongoose.disconnect();
}

check().catch(console.error);
