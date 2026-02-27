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

const seedTestUserWithOTP = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const phone = '9999999999';
        const otp = '123456';
        const userData = {
            name: 'Mobile Test User',
            email: 'mobile@test.com',
            password: 'password123',
            phone: phone,
            role: 'customer',
            isVerified: false, // Set to false so OTP verification is required
            isActive: true,
            otp: otp,
            otpExpiry: new Date('2030-01-01') // Long expiry for testing
        };

        const existing = await User.findOne({
            $or: [{ email: userData.email }, { phone: userData.phone }]
        });

        if (existing) {
            existing.otp = otp;
            existing.otpExpiry = userData.otpExpiry;
            existing.isVerified = false;
            existing.phone = phone;
            await existing.save({ validateBeforeSave: false });
            console.log(`✅ Test User Updated!`);
            console.log(`📱 Mobile: ${phone}`);
            console.log(`🔑 OTP: ${otp}`);
        } else {
            await User.create(userData);
            console.log(`✅ Test User Created!`);
            console.log(`📱 Mobile: ${phone}`);
            console.log(`🔑 OTP: ${otp}`);
        }
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

seedTestUserWithOTP();
