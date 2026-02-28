import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/mayur/OneDrive/Desktop/Cloth/Clouse/backend/.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await mongoose.connection.collection('users').find({}).toArray();
        console.log('Total users:', users.length);
        const testUser = users.find(u => u.email === 'user@example.com');
        console.log('Test User:', JSON.stringify(testUser, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
