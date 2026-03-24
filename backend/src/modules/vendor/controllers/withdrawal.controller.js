import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import WithdrawalRequest from '../../../models/WithdrawalRequest.model.js';
import Vendor from '../../../models/Vendor.model.js';
import Admin from '../../../models/Admin.model.js';
import { createNotification } from '../../../services/notification.service.js';

/**
 * Request a withdrawal (Vendor)
 */
export const requestWithdrawal = asyncHandler(async (req, res) => {
    const { amount, bankDetails } = req.body;
    const vendorId = req.user.id;

    if (!amount || amount <= 0) {
        throw new ApiError(400, 'Invalid withdrawal amount.');
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new ApiError(404, 'Vendor not found.');

    if (vendor.availableBalance < amount) {
        throw new ApiError(400, `Insufficient balance. Available: ₹${vendor.availableBalance}`);
    }

    // --- 7-Day Cooldown Logic ---
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const lastRequest = await WithdrawalRequest.findOne({
        requesterId: vendorId,
        status: { $ne: 'rejected' }
    }).sort({ createdAt: -1 });

    if (lastRequest) {
        const nextAvailableDate = new Date(lastRequest.createdAt.getTime() + SEVEN_DAYS_MS);
        if (nextAvailableDate > new Date()) {
            throw new ApiError(400, `You can only request one withdrawal per 7 days. Next available: ${nextAvailableDate.toLocaleDateString()}`);
        }
    }

    const request = await WithdrawalRequest.create({
        requesterId: vendorId,
        requesterType: 'Vendor',
        amount,
        bankDetails: bankDetails || vendor.bankDetails
    });

    // Notify Admins
    const admins = await Admin.find({ isActive: true }).select('_id');
    await Promise.all(admins.map(admin =>
        createNotification({
            recipientId: admin._id,
            recipientType: 'admin',
            title: 'New Payout Request',
            message: `Vendor ${vendor.storeName} requested a payout of ₹${amount}`,
            type: 'system',
            data: { withdrawalId: String(request._id), sound: 'alert' }
        })
    ));

    res.status(201).json(new ApiResponse(201, request, 'Withdrawal request submitted successfully.'));
});

/**
 * Get withdrawal history
 */
export const getWithdrawalHistory = asyncHandler(async (req, res) => {
    const vendorId = req.user.id;
    const requests = await WithdrawalRequest.find({ requesterId: vendorId }).sort({ createdAt: -1 });
    res.status(200).json(new ApiResponse(200, requests, 'Withdrawal history fetched.'));
});
