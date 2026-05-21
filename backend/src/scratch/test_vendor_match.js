import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Order from '../models/Order.model.js';

async function testMatch() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const orderId = 'ORD-260521-1WKG';
        const rameshId = '6a0af969e1a5775d463862a1'; // Ramesh's ID
        
        const idFilter = [{ orderId }];
        const order = await Order.findOne({
            $or: idFilter,
            'vendorItems.vendorId': rameshId,
        });
        
        if (!order) {
            console.log('Order not found');
            return;
        }

        console.log('\n--- MATCHING DEBUG ---');
        console.log('Logged-in req.user.id:', rameshId);
        
        order.vendorItems.forEach((vi, idx) => {
            console.log(`\nVendorItem ${idx}:`);
            console.log('  vi.vendorId:', vi.vendorId, typeof vi.vendorId);
            console.log('  String(vi.vendorId):', String(vi.vendorId));
            console.log('  vi.vendorId.toString():', vi.vendorId?.toString());
            console.log('  vi.vendorId._id:', vi.vendorId?._id);
            console.log('  String(vi.vendorId) === String(rameshId):', String(vi.vendorId) === String(rameshId));
        });

        const vendorItem = order.vendorItems.find((vi) => String(vi.vendorId) === String(rameshId));
        console.log('\nMatched vendorItem status:', vendorItem?.status);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testMatch();
