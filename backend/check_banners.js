import mongoose from 'mongoose';
import Banner from './src/models/Banner.model.js';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('DB Connected');
        const now = new Date();
        const filter = {
            isActive: true,
            $and: [
                { $or: [{ startDate: null }, { startDate: { $exists: false } }, { startDate: { $lte: now } }] },
                { $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }] }
            ]
        };
        const banners = await Banner.find(filter).sort({ order: 1 });
        console.log('Banners found:', banners.length);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
test();
