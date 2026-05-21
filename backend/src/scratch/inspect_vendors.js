import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Vendor from '../models/Vendor.model.js';

async function inspectVendors() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const vendors = await Vendor.find({ _id: { $in: ['6a0af969e1a5775d463862a6', '6a0af969e1a5775d463862a1'] } });
        vendors.forEach(v => {
            console.log(`ID: ${v._id} -> storeName: "${v.storeName}", email: "${v.email}"`);
        });
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectVendors();
