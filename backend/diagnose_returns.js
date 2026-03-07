import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import './src/models/User.model.js';
import './src/models/Order.model.js';
import ReturnRequest from './src/models/ReturnRequest.model.js';

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const returns = await ReturnRequest.find({}).populate('orderId').populate('userId').lean();
        console.log(`Found ${returns.length} return requests in total.`);

        returns.forEach((ret, i) => {
            console.log(`\n--- Return #${i + 1} ---`);
            console.log('ID:', ret._id);
            console.log('Reason:', ret.reason);
            console.log('Status:', ret.status);
            console.log('OrderId Type:', typeof ret.orderId);
            console.log('OrderId Value:', ret.orderId);
            if (ret.orderId && typeof ret.orderId === 'object') {
                console.log('Populated Order Number:', ret.orderId.orderId);
            }
            console.log('UserId Type:', typeof ret.userId);
            console.log('UserId Value:', ret.userId);
            if (ret.userId && typeof ret.userId === 'object') {
                console.log('Populated User Name:', ret.userId.name);
            }
        });

        process.exit(0);
    } catch (err) {
        console.error('Diagnosis failed:', err);
        process.exit(1);
    }
}

diagnose();
