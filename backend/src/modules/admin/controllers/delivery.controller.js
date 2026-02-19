import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import { Order } from '../../../models/Order.model.js';
import { ApiError } from '../../../utils/ApiError.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

/**
 * @desc    Get all delivery boys with filtering and pagination
 * @route   GET /api/admin/delivery-boys
 * @access  Private (Admin)
 */
export const getAllDeliveryBoys = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const numericPage = Number(page) || 1;
    const numericLimit = Number(limit) || 10;

    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { address: { $regex: search, $options: 'i' } },
        ];
    }

    if (status) {
        filter.isActive = status === 'active';
    }

    const deliveryBoys = await DeliveryBoy.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit);

    const total = await DeliveryBoy.countDocuments(filter);

    // Aggregate stats for each delivery boy
    const boysWithStats = await Promise.all(deliveryBoys.map(async (boy) => {
        const stats = await Order.aggregate([
            { $match: { deliveryBoyId: boy._id } },
            {
                $group: {
                    _id: null,
                    totalDeliveries: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                    pendingDeliveries: { $sum: { $cond: [{ $in: ['$status', ['pending', 'processing', 'shipped']] }, 1, 0] } },
                    cashInHand: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$status', 'delivered'] },
                                        { $eq: ['$paymentMethod', 'cod'] },
                                        { $ne: ['$isCashSettled', true] }
                                    ]
                                },
                                '$total',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const boyStats = stats.length > 0 ? stats[0] : { totalDeliveries: 0, pendingDeliveries: 0, cashInHand: 0 };
        return {
            ...boy._doc,
            id: boy._id,
            status: boy.isActive ? 'active' : 'inactive',
            stats: {
                totalDeliveries: boyStats.totalDeliveries,
                pendingDeliveries: boyStats.pendingDeliveries,
                cashInHand: boyStats.cashInHand
            }
        };
    }));

    res.status(200).json(
        new ApiResponse(200, {
            deliveryBoys: boysWithStats,
            pagination: {
                total,
                page: numericPage,
                limit: numericLimit,
                pages: Math.ceil(total / numericLimit)
            }
        }, 'Delivery boys fetched successfully')
    );
});

/**
 * @desc    Get delivery boy detail with order history
 * @route   GET /api/admin/delivery-boys/:id
 * @access  Private (Admin)
 */
export const getDeliveryBoyById = asyncHandler(async (req, res) => {
    const boy = await DeliveryBoy.findById(req.params.id).select('-password');

    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    const orders = await Order.find({ deliveryBoyId: boy._id }).sort({ createdAt: -1 }).limit(50);

    const stats = await Order.aggregate([
        { $match: { deliveryBoyId: boy._id } },
        {
            $group: {
                _id: null,
                totalDeliveries: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                totalEarnings: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 50, 0] } }, // Assuming flat 50 per delivery for now
                cashInHand: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$status', 'delivered'] },
                                    { $eq: ['$paymentMethod', 'cod'] },
                                    { $ne: ['$isCashSettled', true] }
                                ]
                            },
                            '$total',
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const boyStats = stats.length > 0 ? stats[0] : { totalDeliveries: 0, totalEarnings: 0, cashInHand: 0 };

    res.status(200).json(
        new ApiResponse(200, {
            ...boy._doc,
            id: boy._id,
            status: boy.isActive ? 'active' : 'inactive',
            stats: boyStats,
            recentOrders: orders
        }, 'Delivery boy details fetched successfully')
    );
});

/**
 * @desc    Create a new delivery boy
 * @route   POST /api/admin/delivery-boys
 * @access  Private (Admin)
 */
export const createDeliveryBoy = asyncHandler(async (req, res) => {
    const { name, email, password, phone, address, vehicleType, vehicleNumber, isActive } = req.body;

    const existedUser = await DeliveryBoy.findOne({
        $or: [{ email }, { phone }]
    });

    if (existedUser) {
        throw new ApiError(409, 'User with email or phone already exists');
    }

    const boy = await DeliveryBoy.create({
        name,
        email,
        password,
        phone,
        address,
        vehicleType,
        vehicleNumber,
        isActive: typeof isActive === 'boolean' ? isActive : true
    });

    const createdBoy = await DeliveryBoy.findById(boy._id).select('-password');

    if (!createdBoy) {
        throw new ApiError(500, 'Something went wrong while creating the delivery boy');
    }

    res.status(201).json(
        new ApiResponse(201, createdBoy, 'Delivery boy created successfully')
    );
});

/**
 * @desc    Update delivery boy status
 * @route   PATCH /api/admin/delivery-boys/:id/status
 * @access  Private (Admin)
 */
export const updateDeliveryBoyStatus = asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
        throw new ApiError(400, 'isActive status must be a boolean');
    }

    const boy = await DeliveryBoy.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true }
    ).select('-password');

    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    res.status(200).json(
        new ApiResponse(200, boy, `Delivery boy status updated to ${isActive ? 'active' : 'inactive'}`)
    );
});

/**
 * @desc    Update delivery boy details
 * @route   PUT /api/admin/delivery-boys/:id
 * @access  Private (Admin)
 */
export const updateDeliveryBoy = asyncHandler(async (req, res) => {
    const { name, email, phone, address, vehicleType, vehicleNumber, isActive } = req.body;

    const existing = await DeliveryBoy.findOne({
        _id: { $ne: req.params.id },
        $or: [{ email }, { phone }]
    });
    if (existing) {
        throw new ApiError(409, 'User with email or phone already exists');
    }

    const payload = {
        name,
        email,
        phone,
        address,
        vehicleType,
        vehicleNumber,
    };
    if (typeof isActive === 'boolean') payload.isActive = isActive;

    const boy = await DeliveryBoy.findByIdAndUpdate(
        req.params.id,
        payload,
        { new: true, runValidators: true }
    ).select('-password');

    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    res.status(200).json(
        new ApiResponse(200, boy, 'Delivery boy updated successfully')
    );
});

/**
 * @desc    Delete a delivery boy
 * @route   DELETE /api/admin/delivery-boys/:id
 * @access  Private (Admin)
 */
export const deleteDeliveryBoy = asyncHandler(async (req, res) => {
    const boy = await DeliveryBoy.findByIdAndDelete(req.params.id);
    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    res.status(200).json(
        new ApiResponse(200, null, 'Delivery boy deleted successfully')
    );
});

/**
 * @desc    Settle cash in hand for a delivery boy
 * @route   POST /api/admin/delivery-boys/:id/settle-cash
 * @access  Private (Admin)
 */
export const settleCash = asyncHandler(async (req, res) => {
    const { amount } = req.body; // Amount being settled

    // Update all COD delivered orders for this boy that were not settled
    const result = await Order.updateMany(
        {
            deliveryBoyId: req.params.id,
            status: 'delivered',
            paymentMethod: 'cod',
            isCashSettled: { $ne: true }
        },
        {
            $set: { isCashSettled: true, settledAt: new Date() }
        }
    );

    res.status(200).json(
        new ApiResponse(200, result, `Settled cash for ${result.modifiedCount} orders`)
    );
});
