import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import { Vendor } from '../../../models/Vendor.model.js';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import Order from '../../../models/Order.model.js';
import Settlement from '../../../models/Settlement.model.js';
import mongoose from 'mongoose';

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

        await session.commitTransaction();
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
