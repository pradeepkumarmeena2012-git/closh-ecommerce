import mongoose from 'mongoose';
import DeliveryBoy from './src/models/DeliveryBoy.model.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const boys = await DeliveryBoy.find({});
    console.log(`Total delivery boys: ${boys.length}`);
    boys.forEach(b => {
        console.log(`- ${b.name}: status=${b.status}, isAvailable=${b.isAvailable}, applicationStatus=${b.applicationStatus}`);
    });
    process.exit(0);
});
