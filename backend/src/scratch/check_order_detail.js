import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://sagarchouhan7609_db_user:KFEVeH7lz1eXUVm2@ac-rl5zlnj-shard-00-00.ongvntq.mongodb.net:27017,ac-rl5zlnj-shard-00-01.ongvntq.mongodb.net:27017,ac-rl5zlnj-shard-00-02.ongvntq.mongodb.net:27017/clothify?ssl=true&replicaSet=atlas-13vyk9-shard-0&authSource=admin&retryWrites=true&w=majority';

import Order from '../models/Order.model.js';
import ReturnRequest from '../models/ReturnRequest.model.js';

async function main() {
    await mongoose.connect(MONGO_URI);

    const orderId = 'ORD-260520-KRPX';
    const order = await Order.findOne({ orderId }).lean();
    if (!order) {
        console.log('Order not found:', orderId);
        process.exit(1);
    }

    const returnReq = await ReturnRequest.findOne({ orderId: order._id }).lean();
    fs.writeFileSync(path.join(__dirname, 'dump_utf8.json'), JSON.stringify(returnReq, null, 2), 'utf-8');
    console.log('Successfully saved to dump_utf8.json');

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
