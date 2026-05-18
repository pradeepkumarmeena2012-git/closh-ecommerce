import mongoose from 'mongoose';
import "dotenv/config";
import Vendor from './src/models/Vendor.model.js';

const checkVendor = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
        
        const vendor = await Vendor.findOne({ email: 'vendor@vendor.com' });
        if (vendor) {
            console.log("✅ Vendor found:", {
                id: vendor._id,
                email: vendor.email,
                storeName: vendor.storeName,
                isApproved: vendor.isApproved,
                status: vendor.status
            });
        } else {
            console.log("❌ Vendor NOT found with email: vendor@vendor.com");
            
            // List some vendors to see what's in there
            const allVendors = await Vendor.find().limit(5);
            console.log("Current vendors in DB:", allVendors.map(v => v.email));
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
};

checkVendor();
