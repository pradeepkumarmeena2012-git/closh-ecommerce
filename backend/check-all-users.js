import mongoose from 'mongoose';
import "dotenv/config";
import { User } from './src/models/User.model.js';
import { Admin } from './src/models/Admin.model.js';
import Vendor from './src/models/Vendor.model.js';

const checkAll = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
        
        const user = await User.findOne({ email: 'vendor@vendor.com' });
        const admin = await Admin.findOne({ email: 'vendor@vendor.com' });
        const vendor = await Vendor.findOne({ email: 'vendor@vendor.com' });
        
        console.log("User found:", !!user);
        console.log("Admin found:", !!admin);
        console.log("Vendor found:", !!vendor);
        
        if (!user && !admin && !vendor) {
            console.log("Searching for ANY user/admin/vendor...");
            const anyU = await User.findOne();
            const anyA = await Admin.findOne();
            const anyV = await Vendor.findOne();
            console.log("Any user email:", anyU?.email);
            console.log("Any admin email:", anyA?.email);
            console.log("Any vendor email:", anyV?.email);
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
};

checkAll();
