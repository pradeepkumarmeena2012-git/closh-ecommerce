import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import { Order } from '../../../models/Order.model.js';
import Settlement from '../../../models/Settlement.model.js';
import { ApiError } from '../../../utils/ApiError.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { cacheInvalidate } from '../../delivery/controllers/order.controller.js';
import { sendEmail } from '../../../services/email.service.js';
import { createNotification } from '../../../services/notification.service.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

const DOC_TOKEN_TTL_MS = 10 * 60 * 1000;
const DOC_TOKEN_QUERY_KEY = 'docToken';

const buildDocToken = (relativePath) => {
    const exp = Date.now() + DOC_TOKEN_TTL_MS;
    const payload = `${relativePath}|${exp}`;
    const signature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'delivery-doc-secret')
        .update(payload)
        .digest('hex');
    return `${exp}.${signature}`;
};

const buildDocUrl = (req, relativePath = '') => {
    if (!relativePath) return '';
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) return relativePath;
    const baseUrl = `${req.protocol}://${req.get('host')}${relativePath}`;
    if (relativePath.startsWith('/uploads/delivery-docs/')) {
        const token = buildDocToken(relativePath);
        return `${baseUrl}?${DOC_TOKEN_QUERY_KEY}=${encodeURIComponent(token)}`;
    }
    return baseUrl;
};

/**
 * @desc    Get all delivery boys with filtering and pagination
 * @route   GET /api/admin/delivery-boys
 * @access  Private (Admin)
 */
export const getAllDeliveryBoys = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '', status, applicationStatus, kycStatus } = req.query;
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

    if (applicationStatus) {
        filter.applicationStatus = applicationStatus;
    }
    
    if (kycStatus) {
        filter.kycStatus = kycStatus;
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
            {
                $match: {
                    $or: [
                        { deliveryBoyId: new mongoose.Types.ObjectId(boy._id) },
                        { deliveryBoyId: String(boy._id) }
                    ],
                    isDeleted: { $ne: true }
                }
            },
            {
                $group: {
                    _id: null,
                    totalDeliveries: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                    totalEarnings: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$shipping', 0] } },
                    pendingDeliveries: {
                        $sum: { $cond: [{ $in: ['$status', ['assigned', 'picked_up', 'out_for_delivery']] }, 1, 0] }
                    }
                }
            }
        ]);

        const boyStats = stats.length > 0 ? stats[0] : { totalDeliveries: boy.totalDeliveries || 0, pendingDeliveries: 0 };
        const boyObj = boy.toObject();

        return {
            ...boyObj,
            id: boy._id,
            isActive: boy.isActive,
            status: boy.status || (boy.isAvailable ? 'available' : 'offline'),
            isAvailable: boy.isAvailable,
            applicationStatus: boy.applicationStatus || 'approved',
            documentUrls: {
                drivingLicense: buildDocUrl(req, boy.documents?.drivingLicense || ''),
                drivingLicenseBack: buildDocUrl(req, boy.documents?.drivingLicenseBack || ''),
                aadharCard: buildDocUrl(req, boy.documents?.aadharCard || ''),
                aadharCardBack: buildDocUrl(req, boy.documents?.aadharCardBack || ''),
            },
            bankDetails: boyObj.bankDetails || {},
            upiId: boyObj.upiId || '',
            kycStatus: boyObj.kycStatus || 'none',
            kycRejectionReason: boyObj.kycRejectionReason || '',
            stats: {
                totalDeliveries: boyStats.totalDeliveries,
                pendingDeliveries: boyStats.pendingDeliveries,
                cashInHand: Number(boy.cashInHand || 0)
            }
        };
    }));

    // Calculate Global Stats from Rider documents instead of recalculating from Orders
    const globalSummary = await DeliveryBoy.aggregate([
        {
            $group: {
                _id: null,
                totalLifetime: { $sum: "$cashCollected" },
                pendingSettlement: { $sum: "$cashInHand" }
            }
        }
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            deliveryBoys: boysWithStats,
            summary: globalSummary[0] || { totalLifetime: 0, pendingSettlement: 0 },
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
        {
            $match: {
                $or: [
                    { deliveryBoyId: new mongoose.Types.ObjectId(boy._id) },
                    { deliveryBoyId: String(boy._id) }
                ],
                isDeleted: { $ne: true }
            }
        },
        {
            $group: {
                _id: null,
                totalDeliveries: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                totalEarnings: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$shipping', 0] } },
            }
        }
    ]);

    const boyStats = stats.length > 0 ? stats[0] : { totalDeliveries: boy.totalDeliveries || 0, totalEarnings: 0 };
    boyStats.cashInHand = boy.cashInHand || 0;

    const boyObj = boy.toObject();

    res.status(200).json(
        new ApiResponse(200, {
            ...boyObj,
            id: boy._id,
            isActive: boy.isActive,
            status: boy.status || (boy.isAvailable ? 'available' : 'offline'),
            isAvailable: boy.isAvailable,
            applicationStatus: boy.applicationStatus || 'approved',
            totalDeliveries: boyStats.totalDeliveries || boy.totalDeliveries || 0,
            documentUrls: {
                drivingLicense: buildDocUrl(req, boy.documents?.drivingLicense || ''),
                drivingLicenseBack: buildDocUrl(req, boy.documents?.drivingLicenseBack || ''),
                aadharCard: buildDocUrl(req, boy.documents?.aadharCard || ''),
                aadharCardBack: buildDocUrl(req, boy.documents?.aadharCardBack || ''),
            },
            bankDetails: boyObj.bankDetails || {},
            upiId: boyObj.upiId || '',
            kycStatus: boyObj.kycStatus || 'none',
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
        isActive: typeof isActive === 'boolean' ? isActive : true,
        applicationStatus: 'approved',
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
 * @desc    Approve or reject delivery registration
 * @route   PATCH /api/admin/delivery-boys/:id/application-status
 * @access  Private (Admin)
 */
export const updateDeliveryBoyApplicationStatus = asyncHandler(async (req, res) => {
    const { applicationStatus, reason = '' } = req.body;

    if (!['approved', 'rejected'].includes(applicationStatus)) {
        throw new ApiError(400, 'applicationStatus must be approved or rejected');
    }

    const boy = await DeliveryBoy.findById(req.params.id);
    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    boy.applicationStatus = applicationStatus;
    boy.rejectionReason = applicationStatus === 'rejected' ? String(reason || '').trim() : '';
    boy.isActive = applicationStatus === 'approved';
    if (applicationStatus === 'rejected') {
        boy.isAvailable = false;
        boy.status = 'offline';
    }
    await boy.save();

    try {
        if (applicationStatus === 'approved') {
            await sendEmail({
                to: boy.email,
                subject: 'Delivery account approved',
                text: 'Your delivery account has been approved. You can now log in.',
                html: '<p>Your delivery account has been <strong>approved</strong>. You can now log in.</p>',
            });
        } else {
            await sendEmail({
                to: boy.email,
                subject: 'Delivery account rejected',
                text: `Your delivery account was rejected.${boy.rejectionReason ? ` Reason: ${boy.rejectionReason}` : ''}`,
                html: `<p>Your delivery account was <strong>rejected</strong>.${boy.rejectionReason ? ` Reason: ${boy.rejectionReason}` : ''}</p>`,
            });
        }
    } catch (err) {
        console.warn(`[Delivery Approval Email] Failed for ${boy.email}: ${err.message}`);
    }

    await createNotification({
        recipientId: boy._id,
        recipientType: 'delivery',
        title: `Application ${applicationStatus}`,
        message:
            applicationStatus === 'approved'
                ? 'Your delivery account has been approved by admin.'
                : `Your delivery account was rejected${boy.rejectionReason ? `: ${boy.rejectionReason}` : '.'}`,
        type: 'system',
        data: {
            applicationStatus,
            reason: boy.rejectionReason || '',
        },
    });

    const refreshed = await DeliveryBoy.findById(boy._id).select('-password');
    res.status(200).json(
        new ApiResponse(200, refreshed, `Delivery registration ${applicationStatus} successfully`)
    );
});

/**
 * @desc    Update delivery boy details
 * @route   PUT /api/admin/delivery-boys/:id
 * @access  Private (Admin)
 */
export const updateDeliveryBoy = asyncHandler(async (req, res) => {
    const { 
        name, email, phone, address, 
        vehicleType, vehicleNumber, isActive,
        bankDetails, upiId, kycStatus
    } = req.body;

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
    if (bankDetails) payload.bankDetails = bankDetails;
    if (upiId) payload.upiId = upiId;
    if (kycStatus) payload.kycStatus = kycStatus;

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
    const boy = await DeliveryBoy.findById(req.params.id);
    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    const activeAssignments = await Order.countDocuments({
        deliveryBoyId: boy._id,
        status: { $in: ['pending', 'processing', 'shipped'] },
        isDeleted: { $ne: true },
    });

    if (activeAssignments > 0) {
        throw new ApiError(409, 'Cannot delete delivery boy with active assigned orders');
    }

    await DeliveryBoy.findByIdAndDelete(req.params.id);

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
    const { amount, notes = '' } = req.body;
    const boy = await DeliveryBoy.findById(req.params.id);
    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    const baseFilter = {
        $or: [
            { deliveryBoyId: req.params.id },
            { deliveryBoyId: mongoose.Types.ObjectId.isValid(req.params.id) ? new mongoose.Types.ObjectId(req.params.id) : null }
        ].filter(f => f.deliveryBoyId !== null),
        status: 'delivered',
        paymentMethod: { $in: ['cod', 'cash', 'COD', 'CASH'] },
        isCashSettled: { $ne: true },
        isDeleted: { $ne: true },
    };

    const unsettledStats = await Order.aggregate([
        { $match: baseFilter },
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
                totalAmount: { $sum: '$total' },
            },
        },
    ]);

    const unsettledCount = unsettledStats?.[0]?.count || 0;
    const aggregateAmount = Number(unsettledStats?.[0]?.totalAmount || 0);

    // If rider has cashInHand balance, we MUST allow settlement even if individual 
    // order aggregation is 0 (to resolve drift/mismatch issues).
    const currentBalance = Number(boy.cashInHand || 0);

    if (currentBalance <= 0 && unsettledCount === 0) {
        return res.status(200).json(
            new ApiResponse(200, { modifiedCount: 0, settledAmount: 0 }, 'No pending cash to settle')
        );
    }

    // Amount to settle: use the requested amount, fallback to full balance
    const amountToSettle = amount ? Number(amount) : currentBalance;
    const settledAmount = amountToSettle > 0 ? amountToSettle : aggregateAmount;

    if (settledAmount <= 0) {
        return res.status(200).json(
            new ApiResponse(200, { modifiedCount: 0, settledAmount: 0 }, 'Invalid settlement amount')
        );
    }

    const result = await Order.updateMany(
        baseFilter,
        {
            $set: { isCashSettled: true, settledAt: new Date() }
        }
    );

    // 1. Create Settlement Record (Type: Rider)
    await Settlement.create({
        deliveryBoyId: req.params.id,
        type: 'rider',
        amount: settledAmount,
        method: 'cash',
        notes: notes || `Cash collected from rider for ${result.modifiedCount} orders`,
        processedBy: req.user._id,
        status: 'completed'
    });

    // 2. Decrement Rider Cash In Hand
    const rider = await DeliveryBoy.findById(req.params.id);
    if (rider) {
        const newInHand = Math.max(0, (rider.cashInHand || 0) - settledAmount);
        await DeliveryBoy.findByIdAndUpdate(req.params.id, {
            $set: { cashInHand: newInHand },
        });

        // 3. PUSH NOTIFICATION TO RIDER
        try {
            await createNotification({
                recipientId: rider._id,
                recipientType: 'delivery',
                title: 'Cash Collection Confirmed',
                message: `Admin has collected ₹${settledAmount} cash from you. Your balance has been updated.`,
                type: 'transaction',
                data: { 
                    amount: settledAmount, 
                    type: 'cash_collection',
                    processedBy: req.user.name || 'Admin'
                }
            });

            // Invalidate rider's dashboard and profile cache
            await cacheInvalidate(`dash:${rider._id}`, `profile:${rider._id}`);
        } catch (notifError) {
            console.error('Failed to send cash collection notification:', notifError);
        }
    }

    res.status(200).json(
        new ApiResponse(
            200,
            { modifiedCount: result.modifiedCount, settledAmount },
            `Cash collection done. Settled ₹${settledAmount} for ${result.modifiedCount} orders.`
        )
    );
});

/**
 * @desc    Get cash collection history for a delivery boy
 * @route   GET /api/admin/delivery-boys/:id/cash-history
 * @access  Private (Admin)
 */
export const getCashHistory = asyncHandler(async (req, res) => {
    const boy = await DeliveryBoy.findById(req.params.id);
    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    // Find all COD/Cash orders delivered by this boy
    const orders = await Order.find({
        $or: [
            { deliveryBoyId: req.params.id },
            { deliveryBoyId: mongoose.Types.ObjectId.isValid(req.params.id) ? new mongoose.Types.ObjectId(req.params.id) : null }
        ].filter(f => f.deliveryBoyId !== null),
        status: 'delivered',
        paymentMethod: { $in: ['cod', 'cash', 'COD', 'CASH'] },
        isDeleted: { $ne: true }
    })
        .sort({ deliveredAt: -1, createdAt: -1 })
        .select('orderId total deliveredAt isCashSettled settledAt paymentMethod');

    res.status(200).json(
        new ApiResponse(200, {
            deliveryBoy: {
                id: boy._id,
                name: boy.name,
                phone: boy.phone
            },
            history: orders.map(o => ({
                orderId: o.orderId,
                amount: o.total,
                date: o.deliveredAt || o.updatedAt,
                isSettled: o.isCashSettled,
                settledAt: o.settledAt,
                paymentMethod: o.paymentMethod
            }))
        }, 'Cash history fetched successfully')
    );
});

/**
 * @desc    Approve or reject delivery partner KYC (Banking)
 * @route   PATCH /api/admin/delivery-boys/:id/kyc-status
 * @access  Private (Admin)
 */
export const updateKycStatus = asyncHandler(async (req, res) => {
    const { kycStatus, reason = '' } = req.body;
    const { id } = req.params;

    if (!['verified', 'rejected', 'pending'].includes(kycStatus)) {
        throw new ApiError(400, 'kycStatus must be verified, rejected or pending');
    }

    const boy = await DeliveryBoy.findById(id);
    if (!boy) {
        throw new ApiError(404, 'Delivery partner not found');
    }

    boy.kycStatus = kycStatus;
    if (kycStatus === 'rejected') {
        boy.kycRejectionReason = String(reason || '').trim();
    } else if (kycStatus === 'verified') {
        boy.kycRejectionReason = '';
    }

    await boy.save();

    // Notify the delivery boy
    await createNotification({
        recipientId: boy._id,
        recipientType: 'delivery',
        title: kycStatus === 'verified' ? 'KYC Verified' : 'KYC Update Required',
        message: kycStatus === 'verified' 
            ? 'Your bank details and KYC have been verified. Payouts are now enabled.' 
            : `Your KYC was rejected. Reason: ${boy.kycRejectionReason || 'Please check and resubmit.'}`,
        type: 'system',
        data: { kycStatus, reason: boy.kycRejectionReason }
    });

    res.status(200).json(
        new ApiResponse(200, boy, `KYC status updated to ${kycStatus}`)
    );
});
