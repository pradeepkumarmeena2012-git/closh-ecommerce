
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '../.env' });

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/clothify';

async function getCredentials() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const User = mongoose.model('User', new mongoose.Schema({}), 'users');
        const Vendor = mongoose.model('Vendor', new mongoose.Schema({}), 'vendors');
        const DeliveryBoy = mongoose.model('DeliveryBoy', new mongoose.Schema({}), 'deliveryboys');
        const Admin = mongoose.model('Admin', new mongoose.Schema({}), 'admins');

        const users = await User.find({}).limit(2).lean();
        const vendors = await Vendor.find({}).limit(2).lean();
        const deliveryBoys = await DeliveryBoy.find({}).limit(2).lean();
        const admins = await Admin.find({}).limit(2).lean();

        console.log('\n--- CUSTOMERS ---');
        users.forEach(u => console.log(`Phone/Email: ${u.phone || u.email} | Name: ${u.name}`));

        console.log('\n--- VENDORS ---');
        vendors.forEach(v => console.log(`Email: ${v.email} | Phone: ${v.phone} | Name: ${v.storeName}`));

        console.log('\n--- DELIVERY PARTNERS ---');
        deliveryBoys.forEach(d => console.log(`Phone: ${d.phone} | Email: ${d.email} | Name: ${d.name}`));

        console.log('\n--- ADMINS ---');
        admins.forEach(a => console.log(`Email: ${a.email} | Name: ${a.name}`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

getCredentials();
