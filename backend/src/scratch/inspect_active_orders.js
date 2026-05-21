import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Order from '../models/Order.model.js';

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB:', process.env.MONGO_URI);
        
        const orderIds = ['ORD-260521-1WKG', 'ORD-260521-MIQO', 'ORD-260521-4E1Y'];
        
        for (const orderId of orderIds) {
            const order = await Order.findOne({ orderId });
            console.log(`\n=================== ORDER ${orderId} ===================`);
            if (!order) {
                console.log('Not found');
                continue;
            }
            console.log('Overall Status:', order.status);
            console.log('Vendor Items statuses:');
            order.vendorItems.forEach((vi, i) => {
                console.log(`  - Vendor ${i}: ${vi.vendorId} -> Status: "${vi.status}"`);
            });
        }
        
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
