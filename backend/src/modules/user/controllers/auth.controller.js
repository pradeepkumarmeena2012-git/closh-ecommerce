import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import User from '../../../models/User.model.js';
import { generateTokens } from '../../../utils/generateToken.js';
import { sendOTP } from '../../../services/otp.service.js';

// POST /api/user/auth/register
export const register = asyncHandler(async (req, res) => {
    const { name, email, password, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(409, 'Email already registered.');

    const user = await User.create({ name, email, password, phone });
    await sendOTP(user, 'email_verification');

    res.status(201).json(new ApiResponse(201, { email: user.email }, 'Registration successful. Please verify your email.'));
});

// POST /api/user/auth/verify-otp
export const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpiry');
    if (!user) throw new ApiError(404, 'User not found.');
    if (user.otp !== otp) throw new ApiError(400, 'Invalid OTP.');
    if (user.otpExpiry < Date.now()) throw new ApiError(400, 'OTP has expired. Please request a new one.');

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const { accessToken, refreshToken } = generateTokens({ id: user._id, role: 'customer', email: user.email });
    res.status(200).json(new ApiResponse(200, { accessToken, refreshToken, user: { id: user._id, name: user.name, email: user.email } }, 'Email verified successfully.'));
});

// POST /api/user/auth/login
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) throw new ApiError(401, 'Invalid email or password.');
    if (!user.isActive) throw new ApiError(403, 'Your account has been deactivated.');
    if (!user.isVerified) throw new ApiError(403, 'Please verify your email before logging in.');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new ApiError(401, 'Invalid email or password.');

    const { accessToken, refreshToken } = generateTokens({ id: user._id, role: 'customer', email: user.email });
    res.status(200).json(new ApiResponse(200, { accessToken, refreshToken, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } }, 'Login successful.'));
});

// POST /api/user/auth/resend-otp
export const resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new ApiError(404, 'User not found.');
    if (user.isVerified) throw new ApiError(400, 'Email already verified.');

    await sendOTP(user, 'email_verification');
    res.status(200).json(new ApiResponse(200, null, 'OTP resent successfully.'));
});

// GET /api/user/auth/profile
export const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, 'User not found.');
    res.status(200).json(new ApiResponse(200, user, 'Profile fetched.'));
});

// PUT /api/user/auth/profile
export const updateProfile = asyncHandler(async (req, res) => {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name, phone }, { new: true, runValidators: true });
    res.status(200).json(new ApiResponse(200, user, 'Profile updated.'));
});

// POST /api/user/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new ApiError(400, 'Current password and new password are required.');
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) throw new ApiError(404, 'User not found.');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new ApiError(400, 'Current password is incorrect.');

    user.password = newPassword;
    await user.save();

    res.status(200).json(new ApiResponse(200, null, 'Password changed successfully.'));
});
