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

const seedVendor = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'vendor@vendor.com';
    const existing = await Vendor.findOne({ email });

    if (existing) {
      existing.password = 'vendor123';
      existing.name = 'Test Vendor';
      existing.storeName = 'Vendor Store';
      existing.status = 'approved';
      existing.isVerified = true;
      if (!existing.gstNumber) existing.gstNumber = 'GST' + Date.now();
      if (!existing.panNumber) existing.panNumber = 'PAN' + Date.now();
      await existing.save();
      console.log(`✅ Vendor updated: ${email} / vendor123`);
    } else {
      await Vendor.create({
        name: 'Test Vendor',
        email: email,
        password: 'vendor123',
        phone: '1234567890',
        storeName: 'Vendor Store',
        status: 'approved',
        isVerified: true,
        gstNumber: 'GST' + Date.now(),
        panNumber: 'PAN' + Date.now()
      });
      console.log(`✅ Vendor created: ${email} / vendor123`);
    }
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

seedVendor();
