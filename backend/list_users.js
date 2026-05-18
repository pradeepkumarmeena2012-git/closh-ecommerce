import mongoose from 'mongoose';
import 'dotenv/config';
import DeliveryBoy from './src/models/DeliveryBoy.model.js';
import Vendor from './src/models/Vendor.model.js';
import { User } from './src/models/User.model.js';

async function listUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log("Connected successfully!");

        console.log("\n--- VENDORS ---");
        const vendors = await Vendor.find().limit(5);
        vendors.forEach(v => {
            console.log(`Store: ${v.storeName} | Email: ${v.email} | Phone: ${v.phone}`);
        });

        console.log("\n--- DELIVERY BOYS ---");
        const riders = await DeliveryBoy.find().limit(5);
        riders.forEach(r => {
            console.log(`Rider: ${r.name} | Status: ${r.status} | Phone: ${r.phone} | Email: ${r.email}`);
        });

        console.log("\n--- CUSTOMERS ---");
        const customers = await User.find({ role: 'customer' }).limit(5);
        customers.forEach(c => {
            console.log(`Customer: ${c.name} | Phone: ${c.phone} | Email: ${c.email}`);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

listUsers();
