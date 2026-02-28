import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: 'c:/Users/mayur/OneDrive/Desktop/Cloth/Clouse/backend/.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = mongoose.model('User', new mongoose.Schema({ email: String, phone: String, otp: String, otpExpiry: Date, isVerified: Boolean }));

        const userByEmail = await User.findOne({ email: 'user@example.com' });
        console.log('User by email:', JSON.stringify(userByEmail, null, 2));

        const userByPhone = await User.findOne({ phone: '9876543210' });
        console.log('User by phone:', JSON.stringify(userByPhone, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
