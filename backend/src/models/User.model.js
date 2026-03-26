import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, index: true },
        password: { type: String, required: true, select: false },
        phone: { type: String, trim: true },
        dob: { type: String, trim: true },
        gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
        ageRange: { type: String, trim: true },
        stylePreference: { type: String, trim: true },
        preferredFit: { type: String, trim: true },
        avatar: { type: String }, // Cloudinary URL
        role: { type: String, enum: ['customer', 'delivery'], default: 'customer' },
        isVerified: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        otp: { type: String, select: false },
        otpExpiry: { type: Date, select: false },
        resetOtp: { type: String, select: false },
        resetOtpExpiry: { type: Date, select: false },
        resetOtpVerified: { type: Boolean, default: false, select: false },
        refreshTokenHash: { type: String, select: false },
        refreshTokenExpiresAt: { type: Date, select: false },
        passwordResetToken: { type: String, select: false },
        passwordResetExpiry: { type: Date, select: false },
        fcmTokens: [
            {
                token: { type: String, required: true },
                platform: { type: String, enum: ['web', 'app'], default: 'web' },
                deviceName: String,
                lastUsed: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export { User };
export default User;
