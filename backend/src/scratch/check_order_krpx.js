import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend folder (2 levels up from backend/src/scratch/)
dotenv.config({ path: path.join(__dirname, '../../.env') });

import Order from '../models/Order.model.js';
import DeliveryBatch from '../models/DeliveryBatch.model.js';
import ReturnRequest from '../models/ReturnRequest.model.js';

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        
        const order = await Order.findOne({ orderId: 'ORD-260520-KRPX' });
        console.log('--- ORDER STATE ---');
        console.log('status:', order?.status);
        console.log('orderType:', order?.orderType);
        console.log('deliveryBoyId:', order?.deliveryBoyId);
        console.log('vendorPickups:', JSON.stringify(order?.vendorPickups, null, 2));

        const batch = await DeliveryBatch.findOne({
            $or: [
                { orders: order?._id },
                { 'orders.orderId': 'ORD-260520-KRPX' }
            ]
        });
        console.log('--- BATCH STATE ---');
        console.log('batch status:', batch?.status);
        console.log('pickupStops:', JSON.stringify(batch?.pickupStops, null, 2));

        const ret = await ReturnRequest.findOne({ orderId: order?._id });
        console.log('--- RETURN REQUEST STATE ---');
        console.log('return status:', ret?.status);
        console.log('vendorDropoffs:', JSON.stringify(ret?.vendorDropoffs, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
