import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import WithdrawalRequest from '../../../models/WithdrawalRequest.model.js';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import Admin from '../../../models/Admin.model.js';
import { createNotification } from '../../../services/notification.service.js';

/**
 * Request a withdrawal (Delivery Boy)
 */
export const requestWithdrawal = asyncHandler(async (req, res) => {
    const { amount, bankDetails } = req.body;
    const deliveryBoyId = req.user.id;

    if (!amount || amount <= 0) {
        throw new ApiError(400, 'Invalid withdrawal amount.');
    }

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) throw new ApiError(404, 'Delivery partner not found.');

    if (deliveryBoy.availableBalance < amount) {
        throw new ApiError(400, `Insufficient balance. Available: ₹${deliveryBoy.availableBalance}`);
    }

    // --- 7-Day Cooldown Logic ---
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const lastRequest = await WithdrawalRequest.findOne({
        requesterId: deliveryBoyId,
        status: { $ne: 'rejected' } // Only consider pending/approved/completed
    }).sort({ createdAt: -1 });

    if (lastRequest) {
        const nextAvailableDate = new Date(lastRequest.createdAt.getTime() + SEVEN_DAYS_MS);
        if (nextAvailableDate > new Date()) {
            throw new ApiError(400, `You can only request one withdrawal per 7 days. Next available: ${nextAvailableDate.toLocaleDateString()}`);
        }
    }

    const request = await WithdrawalRequest.create({
        requesterId: deliveryBoyId,
        requesterType: 'DeliveryBoy',
        amount,
        bankDetails
    });

    // Notify Admins
    const admins = await Admin.find({ isActive: true }).select('_id');
    await Promise.all(admins.map(admin =>
        createNotification({
            recipientId: admin._id,
            recipientType: 'admin',
            title: 'New Payout Request',
            message: `Delivery Boy ${deliveryBoy.name} requested a payout of ₹${amount}`,
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
    const deliveryBoyId = req.user.id;
    const requests = await WithdrawalRequest.find({ requesterId: deliveryBoyId }).sort({ createdAt: -1 });
    res.status(200).json(new ApiResponse(200, requests, 'Withdrawal history fetched.'));
});
