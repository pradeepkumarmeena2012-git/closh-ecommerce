import mongoose from 'mongoose';
import DeliveryBoy from '../models/DeliveryBoy.model.js';
import ReturnRequest from '../models/ReturnRequest.model.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI;

mongoose.connect(MONGODB_URI)
    .then(async () => {
        const adarsh = await DeliveryBoy.findOne({ name: /Adarsh/i });
        if (!adarsh) {
            console.log("Adarsh not found");
            process.exit(1);
        }

        const returnRequests = await ReturnRequest.find({ deliveryBoyId: adarsh._id });
        console.log(`Found ${returnRequests.length} return requests for Adarsh:`);
        returnRequests.forEach(r => {
            console.log(`- ID: ${r.returnId}, Status: ${r.status}, OrderId: ${r.orderId}`);
        });
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
