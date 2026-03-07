import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import ReturnRequest from './src/models/ReturnRequest.model.js';

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        const count = await ReturnRequest.countDocuments();
        console.log('Total Return Requests:', count);
        const latest = await ReturnRequest.find().sort({ createdAt: -1 }).limit(5).lean();
        console.log('Latest Requests:', JSON.stringify(latest, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
