import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });
import User from '../models/User.model.js';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI not set in .env');
    process.exit(1);
}

const seedUser = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const userData = {
            name: 'Test Customer',
            email: 'user@test.com',
            password: 'password123',
            phone: '9876543210',
            role: 'customer',
            isVerified: true,
            isActive: true
        };

        const existing = await User.findOne({ email: userData.email });

        if (existing) {
            existing.password = userData.password;
            existing.name = userData.name;
            existing.phone = userData.phone;
            existing.isVerified = userData.isVerified;
            existing.isActive = userData.isActive;
            await existing.save();
            console.log(`✅ User updated: ${userData.email} / ${userData.password}`);
        } else {
            await User.create(userData);
            console.log(`✅ User created: ${userData.email} / ${userData.password}`);
        }
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

seedUser();
