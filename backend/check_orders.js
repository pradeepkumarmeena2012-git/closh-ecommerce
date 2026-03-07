import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import Order from './src/models/Order.model.js';

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        const orders = await Order.find({ status: 'delivered' }).limit(5).lean();
        console.log('Delivered Orders count:', await Order.countDocuments({ status: 'delivered' }));
        console.log('Sample Delivered Orders:', JSON.stringify(orders, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
