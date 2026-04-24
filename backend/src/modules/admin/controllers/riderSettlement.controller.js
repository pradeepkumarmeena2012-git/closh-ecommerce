import CashSettlement from '../../../models/CashSettlement.model.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import asyncHandler from '../../../utils/asyncHandler.js';

/**
 * Get all rider settlements across the system
 */
export const getAllSettlements = asyncHandler(async (req, res) => {
    const settlements = await CashSettlement.find()
        .populate('deliveryBoyId', 'name phone email')
        .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, settlements, 'Rider settlements fetched successfully.'));
});

/**
 * Get settlements for a specific rider
 */
export const getRiderSettlements = asyncHandler(async (req, res) => {
    const { riderId } = req.params;
    const settlements = await CashSettlement.find({ deliveryBoyId: riderId })
        .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, settlements, 'Rider settlements fetched.'));
});
