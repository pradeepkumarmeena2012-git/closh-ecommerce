import mongoose from 'mongoose';
import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import WithdrawalRequest from '../../../models/WithdrawalRequest.model.js';
import Vendor from '../../../models/Vendor.model.js';
import Admin from '../../../models/Admin.model.js';
import Commission from '../../../models/Commission.model.js';
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

    // --- 1-Day Cooldown Logic ---
    const ONE_DAY_MS = 1 * 24 * 60 * 60 * 1000;
    const lastRequest = await WithdrawalRequest.findOne({
        requesterId: vendorId,
        status: { $ne: 'rejected' }
    }).sort({ createdAt: -1 });

    if (lastRequest) {
        const nextAvailableDate = new Date(lastRequest.createdAt.getTime() + ONE_DAY_MS);
        if (nextAvailableDate > new Date()) {
            throw new ApiError(400, `You can only request one withdrawal per day. Next available: ${nextAvailableDate.toLocaleDateString()}`);
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
 * Request settlement for specific or all ready commissions (Vendor)
 */
export const requestSettlement = asyncHandler(async (req, res) => {
    const vendorId = req.user.id;
    const { commissionIds } = req.body; // Array of IDs if requesting specific ones
    const query = {
        vendorId,
        status: 'pending'
    };

    if (commissionIds && Array.isArray(commissionIds) && commissionIds.length > 0) {
        query._id = { $in: commissionIds };
    }

    let readyCommissions = await Commission.find(query).populate('orderId', 'status');

    // Filter out return requested or returned orders
    readyCommissions = readyCommissions.filter(c => {
        const orderStatus = String(c.orderId?.status || '').toLowerCase();
        return orderStatus !== 'return requested' && orderStatus !== 'returned' && orderStatus !== 'cancelled';
    });

    if (!readyCommissions.length) {
        throw new ApiError(400, 'No selected commissions are ready for payout (orders must be delivered and not have active return requests).');
    }

    const totalAmount = readyCommissions.reduce((sum, c) => sum + (c.vendorEarnings || 0), 0);

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new ApiError(404, 'Vendor not found.');

    if (!vendor.bankDetails || (!vendor.bankDetails.upiId && !vendor.bankDetails.accountNumber)) {
        throw new ApiError(400, 'Please update your bank details in profile before requesting a payout.');
    }

    // Create withdrawal request
    const orderDisplayIds = readyCommissions.map(c => {
        const id = c.orderDisplayId || String(c.orderId?._id || c.orderId || '').slice(-8);
        return id || 'N/A';
    }).join(', ');
    
    const request = await WithdrawalRequest.create({
        requesterId: vendorId,
        requesterType: 'Vendor',
        requestType: 'settlement',
        amount: totalAmount,
        bankDetails: vendor.bankDetails,
        status: 'pending',
        adminNotes: `Settlement request for ${readyCommissions.length} orders: ${orderDisplayIds}`
    });

    // Mark commissions as requested and link to this request
    await mongoose.model('Commission').updateMany(
        { _id: { $in: readyCommissions.map(c => c._id) } },
        { $set: { status: 'requested', withdrawalRequestId: request._id } }
    );

    // Notify Admins
    const admins = await Admin.find({ isActive: true }).select('_id');
    await Promise.all(admins.map(admin =>
        createNotification({
            recipientId: admin._id,
            recipientType: 'admin',
            title: 'New Settlement Request',
            message: `Vendor ${vendor.storeName} requested settlement of ₹${totalAmount} for ${readyCommissions.length} orders.`,
            type: 'system',
            data: { withdrawalId: String(request._id), sound: 'alert' }
        })
    ));

    res.status(201).json(new ApiResponse(201, request, 'Settlement request submitted successfully.'));
});

/**
 * Get withdrawal history
 */
export const getWithdrawalHistory = asyncHandler(async (req, res) => {
    const vendorId = req.user.id;
    const requests = await WithdrawalRequest.find({ requesterId: vendorId }).sort({ createdAt: -1 });
    res.status(200).json(new ApiResponse(200, requests, 'Withdrawal history fetched.'));
});
