import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import './src/models/User.model.js';
import './src/models/Order.model.js';
import ReturnRequest from './src/models/ReturnRequest.model.js';
import { getAllReturnRequests } from './src/modules/admin/controllers/return.controller.js';

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Mock req and res
        const req = {
            query: { page: 1, limit: 10 }
        };
        const res = {
            status: function (code) {
                this.statusCode = code;
                return this;
            },
            json: function (data) {
                this.responseData = data;
                return this;
            }
        };

        // We need to wrap it because getAllReturnRequests is an asyncHandler
        await getAllReturnRequests(req, res, (err) => {
            if (err) throw err;
        });

        console.log('Status Code:', res.statusCode);
        console.log('Response Message:', res.responseData.message);
        console.log('Return Requests found:', res.responseData.data.returnRequests.length);
        if (res.responseData.data.returnRequests.length > 0) {
            console.log('First request ID:', res.responseData.data.returnRequests[0].id);
            console.log('Order ID:', res.responseData.data.returnRequests[0].orderId);
            console.log('Customer Email:', res.responseData.data.returnRequests[0].customer.email);
        }

        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

test();
