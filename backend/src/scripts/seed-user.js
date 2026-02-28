import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: 'c:/Users/mayur/OneDrive/Desktop/Cloth/Clouse/backend/.env' });

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: String,
    otp: String,
    otpExpiry: Date,
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
});

const User = mongoose.model('User', userSchema);

async function create() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env');
        }
        await mongoose.connect(process.env.MONGO_URI);
        const email = 'user@example.com';
        const hashedPassword = await bcrypt.hash('password123', 10);

        await User.deleteOne({ email });
        const user = await User.create({
            name: 'Test User',
            email: email,
            password: hashedPassword,
            phone: '9876543210',
            isVerified: false,
            otp: '123456',
            otpExpiry: new Date(Date.now() + 3600000),
            isActive: true
        });

        console.log('User created:', user.email);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
create();
