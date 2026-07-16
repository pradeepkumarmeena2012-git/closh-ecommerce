import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { User } from '../src/models/User.model.js';
import DeliveryBoy from '../src/models/DeliveryBoy.model.js';

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const mobile = "7879363299";
        const password = "123456";
        const name = "harsh";

        // 1. Seed User
        let user = await User.findOne({ phone: mobile });
        if (user) {
            user.name = name;
            user.password = password; // Will be hashed by pre-save hook
            user.otp = "123456";
            user.isVerified = true;
            await user.save();
            console.log("✅ User updated");
        } else {
            user = new User({
                name: name,
                phone: mobile,
                email: `harsh_${Date.now()}@test.com`,
                password: password,
                otp: "123456",
                isVerified: true
            });
            await user.save();
            console.log("✅ User created");
        }

        // 2. Seed Delivery Boy
        let deliveryBoy = await DeliveryBoy.findOne({ phone: mobile });
        if (deliveryBoy) {
            deliveryBoy.name = name;
            deliveryBoy.password = password; // Will be hashed by pre-save hook
            deliveryBoy.applicationStatus = 'approved';
            await deliveryBoy.save();
            console.log("✅ Delivery Boy updated");
        } else {
            deliveryBoy = new DeliveryBoy({
                name: name,
                phone: mobile,
                email: `harsh_delivery_${Date.now()}@test.com`,
                password: password,
                applicationStatus: 'approved',
                vehicleNumber: `MP${Math.floor(10 + Math.random() * 90)}AB${Math.floor(1000 + Math.random() * 9000)}`
            });
            await deliveryBoy.save();
            console.log("✅ Delivery Boy created");
        }

        console.log("Data seeding successful!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding data:", error);
        process.exit(1);
    }
};

seedData();
