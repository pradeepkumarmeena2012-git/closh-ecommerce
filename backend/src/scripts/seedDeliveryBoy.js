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

        const email = 'driver@driver.com';
        const existing = await DeliveryBoy.findOne({ email });

        if (existing) {
            existing.password = 'driver123';
            existing.name = 'Test Delivery Boy';
            existing.applicationStatus = 'approved';
            existing.isActive = true;
            existing.isAvailable = true;
            await existing.save();
            console.log(`✅ Delivery Boy updated: ${email} / driver123`);
        } else {
            await DeliveryBoy.create({
                name: 'Test Delivery Boy',
                email: email,
                password: 'driver123',
                phone: '0987654321',
                applicationStatus: 'approved',
                isActive: true,
                isAvailable: true
            });
            console.log(`✅ Delivery Boy created: ${email} / driver123`);
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
