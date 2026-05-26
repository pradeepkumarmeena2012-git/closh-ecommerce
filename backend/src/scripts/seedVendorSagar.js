import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import Vendor from '../models/Vendor.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set in .env');
  process.exit(1);
}

const seedVendorSagar = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'sagar@example.com';
    const existing = await Vendor.findOne({ email });

    // OTP set to 123456 with a far-future expiry so it always works for login
    const otpData = {
      otp: '123456',
      otpExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };

    if (existing) {
      existing.password = 'sagar123';
      existing.name = 'Sagar';
      existing.storeName = 'Sagar Store';
      existing.status = 'approved';
      existing.isVerified = true;
      existing.otp = otpData.otp;
      existing.otpExpiry = otpData.otpExpiry;
      if (!existing.phone) existing.phone = '9999999999';
      if (!existing.gstNumber) existing.gstNumber = 'GST' + Date.now();
      await existing.save();
      console.log(`✅ Vendor updated: ${email} / sagar123 / OTP: 123456`);
    } else {
      const vendor = await Vendor.create({
        name: 'Sagar',
        email: email,
        password: 'sagar123',
        phone: '9999999999',
        storeName: 'Sagar Store',
        status: 'approved',
        isVerified: true,
        gstNumber: 'GST' + Date.now(),
        panNumber: 'PAN' + Date.now(),
        ...otpData,
      });
      console.log(`✅ Vendor created: ${email} / sagar123 / OTP: 123456`);
    }

    console.log('\n📋 Login Credentials:');
    console.log('   Email:    sagar@example.com');
    console.log('   Password: sagar123');
    console.log('   OTP:      123456');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

seedVendorSagar();
