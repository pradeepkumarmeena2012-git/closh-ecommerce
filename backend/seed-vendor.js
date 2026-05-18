import mongoose from 'mongoose';
import "dotenv/config";
import Vendor from './src/models/Vendor.model.js';
import bcrypt from 'bcryptjs';

const seedVendor = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
        
        const email = 'vendor@vendor.com';
        const password = 'vendor123';
        
        const existing = await Vendor.findOne({ email });
        if (existing) {
            console.log("Vendor already exists. Updating password and status...");
            existing.password = password;
            existing.status = 'approved';
            existing.isVerified = true;
            await existing.save();
            console.log("Vendor updated.");
        } else {
            console.log("Creating new vendor...");
            await Vendor.create({
                name: 'Test Vendor',
                email,
                password,
                storeName: 'Test Store',
                status: 'approved',
                isVerified: true
            });
            console.log("Vendor created.");
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
};

seedVendor();
