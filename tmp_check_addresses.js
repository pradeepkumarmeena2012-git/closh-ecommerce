
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Address from './backend/src/models/Address.model.js';
import User from './backend/src/models/User.model.js';

dotenv.config({ path: './backend/.env' });

async function checkAddresses() {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            console.error('MONGO_URI not found in .env');
            return;
        }
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const addresses = await Address.find().limit(5).lean();
        console.log('Sample Addresses count:', addresses.length);

        for (const addr of addresses) {
            console.log('---');
            console.log('Address ID:', addr._id);
            console.log('userId:', addr.userId, 'Type:', typeof addr.userId);
            console.log('userId is ObjectId?', addr.userId instanceof mongoose.Types.ObjectId);
            
            const user = await User.findById(addr.userId).lean();
            console.log('Corresponding User:', user ? `${user.name} (${user.role})` : 'NOT FOUND');
        }

        if (addresses.length > 0) {
            const firstAddr = addresses[0];
            const userId = firstAddr.userId;
            
            // Check if finding by string works
            const foundByString = await Address.find({ userId: String(userId) }).lean();
            console.log('Found by string userId count:', foundByString.length);
            
            // Check if finding by ObjectId works
            const foundByObjectId = await Address.find({ userId: userId }).lean();
            console.log('Found by ObjectId userId count:', foundByObjectId.length);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkAddresses();
