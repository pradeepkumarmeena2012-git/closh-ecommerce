import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import './src/models/User.model.js';
import './src/models/Order.model.js';
import ReturnRequest from './src/models/ReturnRequest.model.js';

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        const filter = {};
        const returnRequests = await ReturnRequest.find(filter)
            .populate('userId', 'name email phone')
            .populate('orderId', 'orderId total items')
            .sort({ createdAt: -1 });

        console.log('Return Requests count:', returnRequests.length);
        if (returnRequests.length > 0) {
            console.log('First request Order populated:', !!returnRequests[0].orderId?.orderId);
            console.log('First request User populated:', !!returnRequests[0].userId?.name);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
