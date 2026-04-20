import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { Vendor } from '../../../models/Vendor.model.js';
import Settlement from '../../../models/Settlement.model.js';
import Order from '../../../models/Order.model.js';

/**
 * GET /api/vendor/wallet/summary
 * Vendor Wallet Summary
 */
export const getWalletSummary = asyncHandler(async (req, res) => {
    const vendor = await Vendor.findById(req.user.id).select('availableBalance totalEarnings totalSales');
    
    // Recent Earnings from Orders
    const recentOrders = await Order.find({
        'vendorItems.vendorId': req.user.id,
        status: 'delivered'
    })
    .sort({ deliveredAt: -1 })
    .limit(5)
    .select('orderId total deliveredAt vendorItems.$');

    const formattedEarnings = recentOrders.map(o => ({
        orderId: o.orderId,
        date: o.deliveredAt,
        amount: o.vendorItems[0]?.vendorEarnings || 0
    }));

    res.status(200).json(new ApiResponse(200, {
        balance: vendor.availableBalance,
        totalEarnings: vendor.totalEarnings,
        totalSales: vendor.totalSales,
        recentEarnings: formattedEarnings
    }, 'Wallet summary fetched.'));
});

/**
 * GET /api/vendor/wallet/payouts
 * History of payouts received from platform
 */
export const getPayoutHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const payouts = await Settlement.find({ vendorId: req.user.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Settlement.countDocuments({ vendorId: req.user.id });

    res.status(200).json(new ApiResponse(200, {
        payouts,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
    }, 'Payout history fetched.'));
});

/**
 * GET /api/vendor/wallet/transactions
 * Detailed ledger (Earnings + Payouts)
 */
export const getTransactionLedger = asyncHandler(async (req, res) => {
    // This is more complex, might need an aggregation to combine earnings (from Orders) and payouts (from Settlements)
    // For now, let's keep it simple and just show payouts as "transactions"
    
    const payouts = await Settlement.find({ vendorId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50);

    const formatted = payouts.map(p => ({
        type: 'payout',
        amount: p.amount,
        date: p.createdAt,
        status: p.status,
        method: p.method,
        reference: p.referenceId
    }));

    res.status(200).json(new ApiResponse(200, formatted, 'Transactions fetched.'));
});
