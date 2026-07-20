import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import DeliveryBoy from '../models/DeliveryBoy.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI not set in .env');
    process.exit(1);
}

const seedDeliveryBoy = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const phone = '8817921168';
        const email = 'delete.test@example.com';
        const existing = await DeliveryBoy.findOne({ phone });

        if (existing) {
            existing.password = '123456';
            existing.resetOtp = '123456';
            existing.name = 'Test Delete Boy';
            existing.applicationStatus = 'approved';
            existing.isActive = true;
            existing.isAvailable = true;
            await existing.save();
            console.log(`✅ Delivery Boy updated: ${phone} / 123456`);
        } else {
            await DeliveryBoy.create({
                name: 'Test Delete Boy',
                email: email,
                password: '123456',
                resetOtp: '123456',
                phone: phone,
                applicationStatus: 'approved',
                isActive: true,
                isAvailable: true
            });
            console.log(`✅ Delivery Boy created: ${phone} / 123456`);
        }
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

seedDeliveryBoy();
