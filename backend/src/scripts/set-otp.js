import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const userSchema = new mongoose.Schema({
    email: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    otp: String,
    otpExpiry: Date
});

const User = mongoose.model('User', userSchema);

async function set() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const email = 'user@example.com';

        await User.updateOne({ email }, {
            isVerified: false,
            otp: '123456',
            otpExpiry: new Date(Date.now() + 3600000)
        });

        console.log('User status changed to unverified with OTP: 123456');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
set();
