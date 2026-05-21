import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Vendor from '../models/Vendor.model.js';

async function resetPasswords() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const vendors = await Vendor.find({ email: { $in: ['ramesh@example.com', 'suresh@example.com'] } });
        for (const vendor of vendors) {
            vendor.password = 'password123';
            await vendor.save();
            console.log(`Updated password for ${vendor.email} to 'password123'`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

resetPasswords();
