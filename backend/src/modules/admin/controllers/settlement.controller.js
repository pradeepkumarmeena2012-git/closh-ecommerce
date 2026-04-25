import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import { Vendor } from '../../../models/Vendor.model.js';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import Order from '../../../models/Order.model.js';
import Settlement from '../../../models/Settlement.model.js';
import Commission from '../../../models/Commission.model.js';
import mongoose from 'mongoose';
import { createNotification } from '../../../services/notification.service.js';

/**
 * GET /api/admin/settlements/riders
 * List riders with their current cash balances (COD collected)
 */
export const getRidersCashBalances = asyncHandler(async (req, res) => {
    const { search, status = 'approved' } = req.query;
    
    const filter = { applicationStatus: status };
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
        ];
    }

    const riders = await DeliveryBoy.find(filter)
        .select('name phone cashCollected totalDeliveries status')
        .sort({ cashCollected: -1 });

    res.status(200).json(new ApiResponse(200, riders, 'Rider cash balances fetched.'));
});

/**
 * POST /api/admin/settlements/rider/settle
 * Settle (collect) cash from a rider
 */
export const settleRiderCash = asyncHandler(async (req, res) => {
    const { riderId, amount, notes } = req.body;

    if (!riderId || amount === undefined) {
        throw new ApiError(400, 'Rider ID and Amount are required.');
    }

    const rider = await DeliveryBoy.findById(riderId);
    if (!rider) throw new ApiError(404, 'Rider not found.');

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const settledAmount = Number(amount);

        // 1. Create Settlement Record (Type: Rider)
        const settlement = await Settlement.create([{
            deliveryBoyId: riderId,
            type: 'rider',
            amount: settledAmount,
            method: 'cash',
            notes: notes || 'Cash collected from rider',
            processedBy: req.user._id,
            status: 'completed'
        }], { session });

        // 2. Clear Rider Cash Collected (or dec if partial, but usually we settle all)
        await DeliveryBoy.findByIdAndUpdate(
            riderId,
            { $inc: { cashCollected: -Math.abs(settledAmount) } },
            { session }
        );

        // 3. Update orders to flag as settled
        // We find all orders delivered by this rider that are COD and not yet settled
        await Order.updateMany(
            { 
                deliveryBoyId: riderId, 
                paymentMethod: { $in: ['cash', 'cod'] },
                status: 'delivered',
                isCashSettled: false
            },
            { 
                $set: { 
                    isCashSettled: true,
                    settledAt: new Date()
                } 
            },
            { session }
        );

        await session.commitTransaction();

        // 4. Send notification to Rider (non-blocking)
        try {
            await createNotification({
                recipientId: riderId,
                recipientType: 'delivery',
                title: 'Cash Collected by Admin',
                message: `Admin has collected ₹${settledAmount} cash from you. Your cash-in-hand balance has been updated.`,
                type: 'payment',
                data: { settlementId: settlement[0]._id }
            });
        } catch (notifyError) {
            console.error('[Notification Error] Failed to notify rider of cash collection:', notifyError.message);
        }

        res.status(200).json(new ApiResponse(200, settlement[0], 'Rider cash settled successfully.'));
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * GET /api/admin/settlements/vendors
 * List vendors with their current balances
 */
export const getVendorsBalances = asyncHandler(async (req, res) => {
    const { search, status = 'approved' } = req.query;
    
    const filter = { status };
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { storeName: { $regex: search, $options: 'i' } }
        ];
    }

    const vendors = await Vendor.find(filter)
        .select('name storeName availableBalance totalEarnings totalSales status')
        .sort({ availableBalance: -1 });

    res.status(200).json(new ApiResponse(200, vendors, 'Vendor balances fetched.'));
});

/**
 * POST /api/admin/settlements/process
 * Settle payment for a vendor manually
 */
export const processSettlement = asyncHandler(async (req, res) => {
    const { vendorId, amount, method, referenceId, notes } = req.body;

    if (!vendorId || !amount) {
        throw new ApiError(400, 'Vendor ID and Amount are required.');
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new ApiError(404, 'Vendor not found.');

    if (amount > vendor.availableBalance) {
        throw new ApiError(400, `Insufficient balance. Available: ₹${vendor.availableBalance}`);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Create Settlement Record
        const settlement = await Settlement.create([{
            vendorId,
            amount: Number(amount),
            method: method || 'bank_transfer',
            referenceId,
            notes,
            processedBy: req.user._id,
            status: 'completed'
        }], { session });

        // 2. Deduct from Vendor Balance
        await Vendor.findByIdAndUpdate(
            vendorId,
            { $inc: { availableBalance: -Math.abs(Number(amount)) } },
            { session }
        );

        // 3. Mark pending commissions as paid
        // If commissionIds provided, only settle those. Otherwise, settle all pending for this vendor.
        const settlementId = settlement[0]._id;
        const commissionFilter = { vendorId, status: 'pending' };
        
        if (req.body.commissionIds && Array.isArray(req.body.commissionIds) && req.body.commissionIds.length > 0) {
            commissionFilter._id = { $in: req.body.commissionIds };
        }

        await Commission.updateMany(
            commissionFilter,
            { 
                $set: { 
                    status: 'paid', 
                    paidAt: new Date(),
                    settlementId: settlementId
                } 
            },
            { session }
        );

        await session.commitTransaction();
        
        // 4. Send notification to Vendor (non-blocking)
        const settledAmount = Number(amount);
        try {
            await createNotification({
                recipient: vendorId,
                recipientType: 'vendor',
                title: 'Settlement Processed',
                message: `Your amount of ${settledAmount} has been settled from the admin. Ref: ${referenceId || 'N/A'}`,
                type: 'payment',
                metadata: { settlementId: settlement[0]._id }
            });
        } catch (notifyError) {
            console.error('[Notification Error] Failed to notify vendor of settlement:', notifyError.message);
        }

        res.status(201).json(new ApiResponse(201, settlement[0], 'Settlement completed successfully.'));
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * GET /api/admin/settlements/history
 * Fetch transaction history
 */
export const getSettlementHistory = asyncHandler(async (req, res) => {
    const { vendorId, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (vendorId) filter.vendorId = vendorId;

    const settlements = await Settlement.find(filter)
        .populate('vendorId', 'storeName name')
        .populate('deliveryBoyId', 'name')
        .populate('processedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Settlement.countDocuments(filter);

    res.status(200).json(new ApiResponse(200, {
        settlements,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
    }, 'Settlement history fetched.'));
});

/**
 * GET /api/admin/settlements/vendor/:vendorId/pending-commissions
 * Fetch all delivered but unpaid commissions for a specific vendor
 */
export const getPendingCommissions = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;

    if (!vendorId) throw new ApiError(400, 'Vendor ID is required.');

    const commissions = await Commission.find({ 
        vendorId, 
        status: 'pending' 
    })
    .populate({
        path: 'orderId',
        select: 'orderId createdAt status paymentMethod codCollectionMethod deliveryBoyId',
        populate: {
            path: 'deliveryBoyId',
            select: 'name phone'
        }
    })
    .sort({ createdAt: -1 });

    // Ensure we only return commissions for orders that are actually 'delivered'
    const deliveredCommissions = commissions.filter(comm => comm.orderId?.status === 'delivered');

    res.status(200).json(new ApiResponse(200, deliveredCommissions, 'Pending commissions fetched.'));
});
