import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const checkVendors = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/closh');
        console.log('Connected to DB');
        
        const Vendor = mongoose.model('Vendor', new mongoose.Schema({}, { strict: false }));
        
        const vendors = await Vendor.find({}).sort({ createdAt: -1 }).limit(10);
        console.log(`Found ${vendors.length} vendors total. Top 10:`);
        vendors.forEach(v => {
            console.log(`ID: ${v._id}, Email: ${v.email}, Phone: "${v.phone}", OTP: ${v.otp}, isVerified: ${v.isVerified}`);
        });

        const users = await mongoose.model('User', new mongoose.Schema({}, { strict: false })).find({ phone: '6266925739' });
        console.log(`Found ${users.length} users with phone 6266925739`);
        
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

checkVendors();
