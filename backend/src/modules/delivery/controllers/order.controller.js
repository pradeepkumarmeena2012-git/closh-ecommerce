import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Order from '../../../models/Order.model.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { sendEmail } from '../../../services/email.service.js';
import { createNotification } from '../../../services/notification.service.js';
import { emitEvent } from '../../../services/socket.service.js';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import ReturnRequest from '../../../models/ReturnRequest.model.js';
import { OrderWorkflowService } from '../../../services/orderWorkflow.service.js';

const DELIVERY_OTP_TTL_MS = 10 * 60 * 1000;
const DELIVERY_OTP_MAX_ATTEMPTS = 5;
const DELIVERY_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const IS_PRODUCTION = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

const hashDeliveryOtp = (otp) => {
    const secret = process.env.JWT_SECRET || 'delivery-otp-secret';
    return crypto.createHash('sha256').update(`${String(otp)}:${secret}`).digest('hex');
};

const generateDeliveryOtp = () => {
    // Always generate a random 6-digit OTP for security and testing
    return String(Math.floor(100000 + Math.random() * 900000));
};


const getCustomerEmail = (order) => {
    return (
        String(order?.shippingAddress?.email || '').trim().toLowerCase() ||
        String(order?.guestInfo?.email || '').trim().toLowerCase()
    );
};

const sendDeliveryOtpEmail = async (order, otp) => {
    const to = getCustomerEmail(order);
    if (!to) return false;

    await sendEmail({
        to,
        subject: `Delivery OTP for order ${order.orderId || order._id}`,
        text: `Your delivery verification OTP is ${otp}. Share it with the delivery partner only after receiving your order. It expires in 10 minutes.`,
        html: `<p>Your delivery verification OTP is <strong>${otp}</strong>.</p><p>Share it with the delivery partner only after receiving your order.</p><p>This OTP expires in 10 minutes.</p>`,
    });

    return true;
};

// GET /api/delivery/orders
export const getAssignedOrders = asyncHandler(async (req, res) => {
    const { status, page, limit } = req.query;
    const filter = { deliveryBoyId: req.user.id, isDeleted: { $ne: true } };
    if (status === 'open') {
        filter.status = { $in: ['ready_for_pickup', 'picked_up', 'out_for_delivery'] };
    } else if (status) {
        filter.status = status;
    }

    const hasPaginationParams = page !== undefined || limit !== undefined;

    if (!hasPaginationParams) {
        const orders = await Order.find(filter).sort({ createdAt: -1 });
        return res.status(200).json(new ApiResponse(200, orders, 'Assigned orders fetched.'));
    }

    const numericPage = Math.max(1, Number(page) || 1);
    const requestedLimit = Number(limit) || 20;
    const numericLimit = Math.min(Math.max(1, requestedLimit), 100);
    const skip = (numericPage - 1) * numericLimit;

    const [orders, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(numericLimit),
        Order.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                orders,
                pagination: {
                    total,
                    page: numericPage,
                    limit: numericLimit,
                    pages: Math.ceil(total / numericLimit) || 1,
                },
            },
            'Assigned orders fetched.'
        )
    );
});

// GET /api/delivery/orders/available
export const getAvailableOrders = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const numericPage = Math.max(1, Number(page) || 1);
    const numericLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
    const skip = (numericPage - 1) * numericLimit;

    // Available orders are those ready for pickup and NOT assigned to anyone.
    const filter = {
        status: 'ready_for_pickup',
        deliveryBoyId: { $exists: false },
        isDeleted: { $ne: true }
    };

    const [orders, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(numericLimit),
        Order.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                orders,
                pagination: {
                    total,
                    page: numericPage,
                    limit: numericLimit,
                    pages: Math.ceil(total / numericLimit) || 1,
                },
            },
            'Available orders fetched.'
        )
    );
});


// GET /api/delivery/orders/dashboard-summary
export const getDashboardSummary = asyncHandler(async (req, res) => {
    const deliveryBoyId = req.user.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [statusStats, completedTodayCount, earningsStats, recentOrders] = await Promise.all([
        Order.aggregate([
            { $match: { deliveryBoyId: new mongoose.Types.ObjectId(deliveryBoyId), isDeleted: { $ne: true } } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]),
        Order.countDocuments({
            deliveryBoyId,
            isDeleted: { $ne: true },
            status: 'delivered',
            $or: [
                { deliveredAt: { $gte: todayStart } },
                { deliveredAt: { $exists: false }, updatedAt: { $gte: todayStart } },
                { deliveredAt: null, updatedAt: { $gte: todayStart } },
            ],
        }),
        Order.aggregate([
            {
                $match: {
                    deliveryBoyId: new mongoose.Types.ObjectId(deliveryBoyId),
                    isDeleted: { $ne: true },
                    status: 'delivered',
                },
            },
            {
                $group: {
                    _id: null,
                    totalDeliveryFees: { $sum: { $ifNull: ['$shipping', 0] } },
                },
            },
        ]),
        Order.find({
            deliveryBoyId,
            isDeleted: { $ne: true },
            status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] }
        }).sort({ updatedAt: -1 }).limit(10),
    ]);

    const countByStatus = statusStats.reduce((acc, row) => {
        acc[String(row?._id || '')] = Number(row?.count || 0);
        return acc;
    }, {});

    const summary = {
        totalOrders: statusStats.reduce((sum, row) => sum + Number(row?.count || 0), 0),
        completedToday: Number(completedTodayCount || 0),
        openOrders:
            Number(countByStatus.assigned || 0) +
            Number(countByStatus.picked_up || 0) +
            Number(countByStatus.out_for_delivery || 0),
        earnings: Number(earningsStats?.[0]?.totalDeliveryFees || 0),
        recentOrders,
    };

    return res.status(200).json(new ApiResponse(200, summary, 'Dashboard summary fetched.'));
});

// GET /api/delivery/orders/profile-summary
export const getProfileSummary = asyncHandler(async (req, res) => {
    const deliveryBoyId = req.user.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [deliveredStats, completedTodayCount] = await Promise.all([
        Order.aggregate([
            {
                $match: {
                    deliveryBoyId: new mongoose.Types.ObjectId(deliveryBoyId),
                    isDeleted: { $ne: true },
                    status: 'delivered',
                },
            },
            {
                $group: {
                    _id: null,
                    totalDeliveries: { $sum: 1 },
                    earnings: { $sum: { $ifNull: ['$shipping', 0] } },
                },
            },
        ]),
        Order.countDocuments({
            deliveryBoyId,
            isDeleted: { $ne: true },
            status: 'delivered',
            $or: [
                { deliveredAt: { $gte: todayStart } },
                { deliveredAt: { $exists: false }, updatedAt: { $gte: todayStart } },
                { deliveredAt: null, updatedAt: { $gte: todayStart } },
            ],
        }),
    ]);

    const row = deliveredStats?.[0] || {};
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalDeliveries: Number(row.totalDeliveries || 0),
                completedToday: Number(completedTodayCount || 0),
                earnings: Number(row.earnings || 0),
            },
            'Profile summary fetched.'
        )
    );
});

// GET /api/delivery/orders/:id
export const getOrderDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deliveryBoyId = req.user.id;

    const idFilter = [{ orderId: id }];
    if (mongoose.isValidObjectId(id)) {
        idFilter.push({ _id: id });
    }

    const query = {
        isDeleted: { $ne: true },
        $and: [
            { $or: idFilter },
            {
                $or: [
                    { deliveryBoyId: deliveryBoyId },
                    {
                        deliveryBoyId: { $exists: false },
                        status: 'ready_for_pickup'
                    }
                ]
            }
        ]
    };

    const order = await Order.findOne(query)
        .populate('vendorItems.vendorId')
        .populate('deliveryBoyId', 'name phone currentLocation')
        .select('+deliveryOtpHash +deliveryOtpExpiry +deliveryOtpSentAt +deliveryOtpAttempts +deliveryOtpDebug');
    if (!order) throw new ApiError(404, 'Order not found.');
    res.status(200).json(new ApiResponse(200, order, 'Order detail fetched.'));
});

// PATCH /api/delivery/orders/:id/status
export const updateDeliveryStatus = asyncHandler(async (req, res) => {
    const { status, otp, pickupPhoto, deliveryPhoto } = req.body;
    const allowed = ['picked_up', 'out_for_delivery', 'delivered'];
    if (!allowed.includes(status)) throw new ApiError(400, `Status must be one of: ${allowed.join(', ')}`);

    const query = {
        deliveryBoyId: req.user.id,
        isDeleted: { $ne: true },
        $or: [{ orderId: req.params.id }],
    };
    if (mongoose.isValidObjectId(req.params.id)) {
        query.$or.push({ _id: req.params.id });
    }

    const order = await Order.findOne(query).select('+deliveryOtpHash +deliveryOtpExpiry +deliveryOtpSentAt +deliveryOtpAttempts +deliveryOtpDebug +deviceToken');
    if (!order) throw new ApiError(404, 'Order not found or not assigned to you.');

    // Server-side transition guard
    const transitionMap = {
        assigned: ['picked_up'],
        ready_for_pickup: ['picked_up'],
        picked_up: ['out_for_delivery'],
        out_for_delivery: ['delivered'],
        delivered: ['delivered'],
    };

    const allowedNext = transitionMap[order.status] || [];
    if (!allowedNext.includes(status)) {
        throw new ApiError(409, `Cannot move order from ${order.status} to ${status}.`);
    }

    if (status === 'picked_up') {
        if (pickupPhoto) {
            order.pickupPhoto = pickupPhoto;
        }

        // Generate and Send Delivery OTP at Pickup
        const generatedOtp = generateDeliveryOtp();
        order.deliveryOtpHash = hashDeliveryOtp(generatedOtp);
        order.deliveryOtpExpiry = new Date(Date.now() + DELIVERY_OTP_TTL_MS);
        order.deliveryOtpSentAt = new Date();
        order.deliveryOtpAttempts = 0;
        order.deliveryOtpVerifiedAt = undefined;
        if (!IS_PRODUCTION) {
            order.deliveryOtpDebug = generatedOtp;
        }

        try {
            const sent = await sendDeliveryOtpEmail(order, generatedOtp);
            if (!sent) {
                console.warn(`[Delivery OTP] Missing customer email for order ${order.orderId || order._id}`);
            }
        } catch (err) {
            console.warn(`[Delivery OTP] Failed to send OTP email for order ${order.orderId || order._id}: ${err.message}`);
        }

        // Emit events
        emitEvent(`user_${order.userId}`, 'order_picked_up', { orderId: order.orderId, otp: generatedOtp });
        order.vendorItems.forEach(vi => emitEvent(`vendor_${vi.vendorId}`, 'order_picked_up', { orderId: order.orderId }));
    }

    if (status === 'out_for_delivery') {
        // Emit event to notify user that order is on the way
        emitEvent(`user_${order.userId}`, 'order_out_for_delivery', { orderId: order.orderId });
    }

    if (status === 'delivered') {
        const normalizedOtp = String(otp || '').trim();
        if (!/^\d{6}$/.test(normalizedOtp)) {
            throw new ApiError(400, 'Delivery OTP is required to complete delivery.');
        }

        if (!order.deliveryOtpHash || !order.deliveryOtpExpiry) {
            throw new ApiError(400, 'Delivery OTP was not generated.');
        }

        if (order.deliveryOtpExpiry < new Date()) {
            throw new ApiError(400, 'Delivery OTP has expired. Please resend OTP.');
        }

        if (deliveryPhoto) {
            order.deliveryPhoto = deliveryPhoto;
        }

        const isMatch = order.deliveryOtpHash === hashDeliveryOtp(normalizedOtp);
        if (!isMatch) {
            order.deliveryOtpAttempts = (Number(order.deliveryOtpAttempts) || 0) + 1;
            await order.save();
            throw new ApiError(400, 'Invalid delivery OTP.');
        }

        order.deliveryOtpVerifiedAt = new Date();
        order.deliveryOtpHash = undefined;
        order.deliveryOtpExpiry = undefined;
        order.deliveryOtpSentAt = undefined;
        order.deliveryOtpAttempts = 0;
        order.deliveryOtpDebug = undefined;
        order.deliveredAt = new Date();
        order.deliveryPhoto = deliveryPhoto;

        if (order.paymentMethod === 'cod' || order.paymentMethod === 'cash') {
            order.paymentStatus = 'paid';
            order.isCashSettled = false;
        }

        // Increment delivery boy's total deliveries count and earnings
        const riderEarnings = Number(order.shipping || 0);
        await DeliveryBoy.findByIdAndUpdate(order.deliveryBoyId, {
            $inc: { 
                totalDeliveries: 1,
                totalEarnings: riderEarnings,
                availableBalance: riderEarnings
            }
        });

        // Increment each vendor's availableBalance based on their respective group earnings
        const vendorUpdates = (order.vendorItems || []).map(group => {
            if (group.vendorId && group.vendorEarnings > 0) {
                return mongoose.model('Vendor').findByIdAndUpdate(group.vendorId, {
                    $inc: { availableBalance: Number(group.vendorEarnings) }
                });
            }
            return null;
        }).filter(Boolean);
        
        if (vendorUpdates.length > 0) {
            await Promise.all(vendorUpdates);
        }

        // Emit events
        const trackingRoom = `order_${order.orderId}`;
        emitEvent(`user_${order.userId}`, 'order_delivered', { orderId: order.orderId });
        emitEvent(trackingRoom, 'order_delivered', { orderId: order.orderId });
        order.vendorItems.forEach(vi => emitEvent(`vendor_${vi.vendorId}`, 'order_delivered', { orderId: order.orderId }));
    }

    // Generic status update broadcast to tracking room
    const trackingRoom = `order_${order.orderId}`;
    let eventName = 'order_status_updated';
    if (status === 'picked_up') eventName = 'order_picked_up';
    if (status === 'out_for_delivery') eventName = 'order_out_for_delivery';
    
    emitEvent(trackingRoom, eventName, { orderId: order.orderId, status });

    order.status = status;
    // Align vendor sub-order statuses
    order.vendorItems = (order.vendorItems || []).map((vi) => ({ ...vi.toObject(), status }));

    await order.save();

    const statusNotificationTasks = [];
    if (order.userId || order.deviceToken) {
        statusNotificationTasks.push(
            createNotification({
                recipientId: order.userId,
                recipientType: 'user',
                title: status === 'delivered' ? 'Order delivered' : 'Order shipped',
                message:
                    status === 'delivered'
                        ? `Your order ${order.orderId} has been delivered.`
                        : `Your order ${order.orderId} is out for delivery.`,
                type: 'order',
                token: order.deviceToken,
                data: {
                    orderId: String(order.orderId || order._id),
                    status: String(status),
                },
            })
        );
    }


    const vendorIds = [
        ...new Set(
            (order.vendorItems || [])
                .map((item) => String(item?.vendorId || '').trim())
                .filter(Boolean)
        ),
    ];
    vendorIds.forEach((vendorId) => {
        statusNotificationTasks.push(
            createNotification({
                recipientId: vendorId,
                recipientType: 'vendor',
                title: 'Delivery status update',
                message: `Order ${order.orderId} moved to ${status}.`,
                type: 'order',
                data: {
                    orderId: String(order.orderId || order._id),
                    status: String(status),
                },
            })
        );
    });

    if (statusNotificationTasks.length > 0) {
        await Promise.allSettled(statusNotificationTasks);
    }

    res.status(200).json(new ApiResponse(200, order, 'Delivery status updated.'));
});

// POST /api/delivery/orders/:id/resend-delivery-otp
export const resendDeliveryOtp = asyncHandler(async (req, res) => {
    const query = {
        deliveryBoyId: req.user.id,
        isDeleted: { $ne: true },
        $or: [{ orderId: req.params.id }],
    };

    if (mongoose.isValidObjectId(req.params.id)) {
        query.$or.push({ _id: req.params.id });
    }

    const order = await Order.findOne(query);
    if (!order) throw new ApiError(404, 'Order not found.');

    const allowedStatusesForResend = ['picked_up', 'out_for_delivery'];
    if (!allowedStatusesForResend.includes(order.status)) {
        throw new ApiError(409, `OTP can only be resent when order is in ${allowedStatusesForResend.join(' or ')} state.`);
    }

    if (
        order.deliveryOtpSentAt &&
        new Date(order.deliveryOtpSentAt).getTime() + DELIVERY_OTP_RESEND_COOLDOWN_MS > Date.now()
    ) {
        throw new ApiError(429, 'Please wait before requesting another OTP.');
    }

    const generatedOtp = generateDeliveryOtp();
    order.deliveryOtpHash = hashDeliveryOtp(generatedOtp);
    order.deliveryOtpExpiry = new Date(Date.now() + DELIVERY_OTP_TTL_MS);
    order.deliveryOtpSentAt = new Date();
    order.deliveryOtpAttempts = 0;
    if (!IS_PRODUCTION) {
        order.deliveryOtpDebug = generatedOtp;
    }
    await order.save();

    try {
        const sent = await sendDeliveryOtpEmail(order, generatedOtp);
        if (!sent) {
            throw new ApiError(400, 'Customer email is not available for this order.');
        }
    } catch (err) {
        if (err instanceof ApiError) throw err;
        console.warn(`[Delivery OTP] Failed to resend OTP for order ${order.orderId || order._id}: ${err.message}`);
        throw new ApiError(500, 'Failed to send OTP email. Please try again.');
    }

    return res.status(200).json(new ApiResponse(200, null, 'Delivery OTP resent successfully.'));
});

// POST /api/delivery/orders/:id/arrived
export const markArrived = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const riderId = req.user.id;

    const order = await OrderWorkflowService.markArrived(id, riderId);
    
    return res.status(200).json(new ApiResponse(200, order, 'Rider marked as arrived.'));
});

// GET /api/delivery/orders/:id/debug-otp (non-production only)
export const getDeliveryOtpForDebug = asyncHandler(async (req, res) => {
    if (IS_PRODUCTION) {
        throw new ApiError(404, 'Route not found.');
    }

    const query = {
        deliveryBoyId: req.user.id,
        isDeleted: { $ne: true },
        $or: [{ orderId: req.params.id }],
    };
    if (mongoose.isValidObjectId(req.params.id)) {
        query.$or.push({ _id: req.params.id });
    }

    const order = await Order.findOne(query).select('+deliveryOtpDebug +deliveryOtpExpiry status orderId');
    if (!order) throw new ApiError(404, 'Order not found.');
    if (order.status !== 'shipped') {
        throw new ApiError(409, 'Debug OTP is only available while order is in shipped state.');
    }

    const otp = String(order.deliveryOtpDebug || '').trim();
    if (!otp) {
        throw new ApiError(404, 'Delivery OTP debug value is not available.');
    }

    return res.status(200).json(new ApiResponse(200, {
        orderId: order.orderId,
        otp,
        expiresAt: order.deliveryOtpExpiry,
    }, 'Debug OTP fetched.'));
});

// --- RETURN SYSTEM CONTROLLERS ---

// GET /api/delivery/returns/available
export const getAvailableReturns = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const numericPage = Math.max(1, Number(page) || 1);
    const numericLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
    const skip = (numericPage - 1) * numericLimit;

    // Available returns are approved by vendor but not yet assigned
    const filter = {
        status: 'approved',
        deliveryBoyId: { $exists: false }
    };

    const [returns, total] = await Promise.all([
        ReturnRequest.find(filter)
            .populate('userId', 'name email phone')
            .populate('orderId', 'orderId total shippingAddress')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(numericLimit),
        ReturnRequest.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            returns,
            pagination: {
                total,
                page: numericPage,
                limit: numericLimit,
                pages: Math.ceil(total / numericLimit) || 1,
            },
        }, 'Available returns fetched.')
    );
});

// POST /api/delivery/returns/:id/accept
export const acceptReturnAssignment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deliveryBoyId = req.user.id;

    const returnReq = await ReturnRequest.findOneAndUpdate(
        {
            _id: id,
            status: 'approved',
            deliveryBoyId: { $exists: false }
        },
        {
            $set: {
                status: 'processing',
                deliveryBoyId: deliveryBoyId
            }
        },
        { new: true }
    ).populate('userId').populate('orderId');

    if (!returnReq) {
        throw new ApiError(409, 'Return request is no longer available or already assigned.');
    }

    // Notify user
    if (returnReq.userId?._id) {
        emitEvent(`user_${returnReq.userId._id}`, 'return_delivery_assigned', {
            returnId: returnReq._id,
            deliveryBoyId
        });
    }

    // Notify vendor
    if (returnReq.vendorId) {
        emitEvent(`vendor_${returnReq.vendorId}`, 'return_delivery_assigned', {
            returnId: returnReq._id,
            deliveryBoyId
        });
    }

    res.status(200).json(new ApiResponse(200, returnReq, 'Return assignment accepted.'));
});

// PATCH /api/delivery/returns/:id/status
export const updateReturnStatus = asyncHandler(async (req, res) => {
    const { status, pickupPhoto, deliveryPhoto } = req.body;
    const { id } = req.params;
    const deliveryBoyId = req.user.id;

    const returnReq = await ReturnRequest.findOne({
        _id: id,
        deliveryBoyId
    }).populate('userId').populate('orderId');

    if (!returnReq) throw new ApiError(404, 'Return request not found.');

    if (status === 'picked_up') {
        if (pickupPhoto) {
            returnReq.pickupPhoto = pickupPhoto;
        }
        returnReq.status = 'processing'; // Assuming 'processing' covers picking up and en-route
        returnReq.pickupPhoto = pickupPhoto;
        
        emitEvent(`user_${returnReq.userId?._id}`, 'return_picked_up', { returnId: returnReq._id });
        emitEvent(`vendor_${returnReq.vendorId}`, 'return_picked_up', { returnId: returnReq._id });
    } else if (status === 'completed') {
        if (deliveryPhoto) {
            returnReq.deliveryPhoto = deliveryPhoto;
        }

        // On completion, vendor might need to verify before refunding, but standard is marked completed
        emitEvent(`user_${returnReq.userId?._id}`, 'return_completed', { returnId: returnReq._id });
        emitEvent(`vendor_${returnReq.vendorId}`, 'return_completed', { returnId: returnReq._id });
    } else {
        throw new ApiError(400, 'Invalid return status.');
    }

    await returnReq.save();

    res.status(200).json(new ApiResponse(200, returnReq, 'Return status updated.'));
});
