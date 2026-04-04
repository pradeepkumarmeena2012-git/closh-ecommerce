import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Order from '../../../models/Order.model.js';
import Delivery from '../../../models/Delivery.model.js';
import DeliveryBatch from '../../../models/DeliveryBatch.model.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { sendEmail } from '../../../services/email.service.js';
import { createNotification } from '../../../services/notification.service.js';
import { emitEvent } from '../../../services/socket.service.js';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import ReturnRequest from '../../../models/ReturnRequest.model.js';
import { OrderWorkflowService } from '../../../services/orderWorkflow.service.js';
import { OrderNotificationService } from '../../../services/orderNotification.service.js';

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

    // Get current rider profile to find their location
    const rider = await DeliveryBoy.findById(req.user.id);
    const riderCoords = rider?.currentLocation?.coordinates;

    const filter = {
        status: 'ready_for_pickup',
        deliveryBoyId: { $exists: false },
        isDeleted: { $ne: true }
    };

    // Apply 8km spatial filter if rider location is known
    // 8km in radians = 8 / 6378.1
    if (riderCoords && riderCoords[0] !== 0 && riderCoords[1] !== 0) {
        filter.pickupLocation = {
            $geoWithin: {
                $centerSphere: [riderCoords, 8 / 6378.1]
            }
        };
    }

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
    const rider = await DeliveryBoy.findById(deliveryBoyId);
    if (!rider) throw new ApiError(404, 'Rider profile not found.');

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
                    totalDeliveryFees: { $sum: { $ifNull: ['$deliveryEarnings', 0] } },
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

    // Augment recentOrders with batchId from Delivery model
    const orderIds = recentOrders.map(o => o._id);
    const deliveries = await Delivery.find({ orderId: { $in: orderIds }, status: { $ne: 'delivered' } }).populate('batchId');
    
    const augmentedOrders = recentOrders.map(order => {
        const d = deliveries.find(del => String(del.orderId) === String(order._id));
        const orderObj = order.toObject();
        if (d && d.batchId) {
            orderObj.batchId = d.batchId.batchId; // The BATCH-xxx string
        }
        return orderObj;
    });

    // Calculate Cash in Hand (Unsettled COD/Cash orders)
    const cashStats = await Order.aggregate([
        {
            $match: {
                deliveryBoyId: new mongoose.Types.ObjectId(deliveryBoyId),
                status: 'delivered',
                paymentMethod: { $in: ['cod', 'cash'] },
                isDeleted: { $ne: true }
            }
        },
        {
            $group: {
                _id: null,
                cashInHand: { $sum: { $cond: [{ $ne: ['$isCashSettled', true] }, '$total', 0] } },
                totalCashCollected: { $sum: '$total' }
            }
        }
    ]);

    const cashRow = cashStats?.[0] || { cashInHand: 0, totalCashCollected: 0 };

    const summary = {
        totalOrders: statusStats.reduce((sum, row) => sum + Number(row?.count || 0), 0),
        completedToday: Number(completedTodayCount || 0),
        openOrders:
            Number(countByStatus.assigned || 0) +
            Number(countByStatus.picked_up || 0) +
            Number(countByStatus.out_for_delivery || 0),
        earnings: Number(earningsStats?.[0]?.totalDeliveryFees || 0),
        totalEarnings: Number(rider.totalEarnings || 0),
        availableBalance: Number(rider.availableBalance || 0),
        cashInHand: Number(cashRow.cashInHand || 0),
        totalCashCollected: Number(cashRow.totalCashCollected || 0),
        recentOrders: augmentedOrders,
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
                    earnings: { $sum: { $ifNull: ['$deliveryEarnings', 0] } },
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

    // Calculate Cash Stats
    const cashStats = await Order.aggregate([
        {
            $match: {
                deliveryBoyId: new mongoose.Types.ObjectId(deliveryBoyId),
                status: 'delivered',
                paymentMethod: { $in: ['cod', 'cash'] },
                isDeleted: { $ne: true }
            }
        },
        {
            $group: {
                _id: null,
                cashInHand: { $sum: { $cond: [{ $ne: ['$isCashSettled', true] }, '$total', 0] } },
                totalCashCollected: { $sum: '$total' }
            }
        }
    ]);
    const rider = await DeliveryBoy.findById(deliveryBoyId).select('totalEarnings availableBalance');
    const row = deliveredStats?.[0] || {};
    const cashRow = cashStats?.[0] || { cashInHand: 0, totalCashCollected: 0 };

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalDeliveries: Number(row.totalDeliveries || 0),
                completedToday: Number(completedTodayCount || 0),
                earnings: Number(row.earnings || 0),
                totalEarnings: Number(rider.totalEarnings || 0),
                availableBalance: Number(rider.availableBalance || 0),
                cashInHand: Number(cashRow.cashInHand || 0),
                totalCashCollected: Number(cashRow.totalCashCollected || 0),
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

    // Attach batch context if exists
    const delivery = await Delivery.findOne({ orderId: order._id, status: { $ne: 'delivered' } }).populate('batchId');
    const responseData = order.toObject();
    if (delivery && delivery.batchId) {
        responseData.batchId = delivery.batchId.batchId; // The string ID BATCH-xxx
    }

    res.status(200).json(new ApiResponse(200, responseData, 'Order detail fetched.'));
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
        if (!pickupPhoto) {
            throw new ApiError(400, 'Product pickup photo is required to confirm pickup.');
        }
        order.pickupPhoto = pickupPhoto;

        // Emit events
        emitEvent(`user_${order.userId}`, 'order_picked_up', { orderId: order.orderId });
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

        // Open box photo only required for COD orders
        const isCodOrder = order.paymentMethod === 'cod' || order.paymentMethod === 'cash';
        if (isCodOrder && !req.body.openBoxPhoto) {
            throw new ApiError(400, 'Open box photo (item verification) is required for COD orders.');
        }
        if (req.body.openBoxPhoto) {
            order.openBoxPhoto = req.body.openBoxPhoto;
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

        if (order.paymentMethod === 'cod' || order.paymentMethod === 'cash') {
            order.paymentStatus = 'paid';
            order.isCashSettled = false;
        }

        // Calculate delivery earnings based on distance between vendor and customer
        const { calculateDistance, getDeliveryEarning } = await import('../../../utils/geo.js');
        const pickup = order.pickupLocation?.coordinates || [0, 0];
        const dropoff = order.dropoffLocation?.coordinates || [0, 0];
        const distanceKm = calculateDistance(pickup, dropoff);
        const riderEarnings = getDeliveryEarning(distanceKm);

        // Persist earnings and distance on the order
        order.deliveryEarnings = riderEarnings;
        order.deliveryDistance = distanceKm;

        const updatedRider = await DeliveryBoy.findByIdAndUpdate(
            order.deliveryBoyId,
            {
                $inc: {
                    totalDeliveries: 1,
                    totalEarnings: riderEarnings,
                    availableBalance: riderEarnings,
                },
            },
            { new: true }
        );

        // Increment each vendor's availableBalance based on their respective group earnings
        const vendorUpdates = (order.vendorItems || []).map((group) => {
            if (group.vendorId && group.vendorEarnings > 0) {
                return mongoose.model('Vendor').findByIdAndUpdate(group.vendorId, {
                    $inc: { availableBalance: Number(group.vendorEarnings) },
                });
            }
            return null;
        }).filter(Boolean);

        if (vendorUpdates.length > 0) {
            await Promise.all(vendorUpdates);
        }

        // Unified Notification to all parties
        // ── CRITICAL: Set status and save BEFORE returning ──
        order.status = 'delivered';
        if (order.deliveryFlow) {
            order.deliveryFlow.phase = 'delivered';
        }
        
        // Sync vendorItems statuses
        if (order.vendorItems && order.vendorItems.length > 0) {
            order.vendorItems.forEach(group => {
                group.status = 'delivered';
                group.deliveredAt = new Date();
            });
        }

        await order.save();

        // Emit socket event for real-time tracking updates
        emitEvent(`order_${order.orderId}`, 'order_status_updated', {
            orderId: order.orderId,
            status: 'delivered',
        });
        emitEvent(`user_${order.userId}`, 'order_delivered', {
            orderId: order.orderId,
            status: 'delivered',
        });

        await OrderNotificationService.notifyOrderUpdate(order._id, status, {
            excludeRecipientId: req.user.id,
            title: `Order #${order.orderId} Delivered`,
            message: `Order ${order.orderId} has been successfully delivered by ${updatedRider.name}.`
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    order,
                    rider: {
                        availableBalance: updatedRider.availableBalance,
                        totalEarnings: updatedRider.totalEarnings,
                        totalDeliveries: updatedRider.totalDeliveries,
                    },
                },
                'Delivery status updated.'
            )
        );
    }

    // ── CRITICAL: Actually persist the status change ──
    order.status = status;
    if (status === 'picked_up') order.pickedUpAt = new Date();
    
    // Sync vendorItems statuses
    if (order.vendorItems && order.vendorItems.length > 0) {
        order.vendorItems.forEach(group => {
            group.status = status;
            if (status === 'picked_up') group.pickedUpAt = new Date();
            if (status === 'delivered') group.deliveredAt = new Date();
        });
    }

    // Sync deliveryFlow if it exists
    if (order.deliveryFlow) {
        const phaseMap = { picked_up: 'picked_up', out_for_delivery: 'out_for_delivery' };
        if (phaseMap[status]) order.deliveryFlow.phase = phaseMap[status];
    }
    await order.save();

    // Unified Notification to all parties
    await OrderNotificationService.notifyOrderUpdate(order._id, status, {
        excludeRecipientId: req.user.id, // Rider knows it changed
        title: `Order #${order.orderId} ${status.replace(/_/g, ' ')}`,
        message: `Order ${order.orderId} is now ${status.replace(/_/g, ' ')}.`
    });

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

    const query = {
        deliveryBoyId: riderId,
        isDeleted: { $ne: true },
        $or: [{ orderId: id }],
    };
    if (mongoose.isValidObjectId(id)) {
        query.$or.push({ _id: id });
    }

    const order = await Order.findOne(query).select('+deliveryOtpDebug');
    if (!order) throw new ApiError(404, 'Order not found.');

    if (order.status === 'picked_up') {
        order.status = 'out_for_delivery';
    }

    // Generate Delivery OTP at Arrival
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
            console.warn(`[Delivery OTP] Missing customer email for order ${order.orderId || order._id}`);
        }
    } catch (err) {
        console.warn(`[Delivery OTP] Failed to send OTP email: ${err.message}`);
    }

    // Notify Customer with OTP
    emitEvent(`user_${order.userId}`, 'rider_arrived', {
        orderId: order.orderId,
        otp: generatedOtp
    });

    // Push Notification
    createNotification({
        recipientId: order.userId,
        recipientType: 'user',
        title: 'Rider Arrived!',
        message: `Your rider has reached your location. Share OTP ${generatedOtp} to receive your order.`,
        type: 'order',
        data: { orderId: order.orderId, status: 'arrived' }
    }).catch(err => console.error('Push Error:', err));

    // Notify Track Room
    OrderNotificationService.notifyOrderUpdate(order._id, 'arrived', {
        excludeRecipientId: riderId,
        title: `Rider Arrived`,
        message: `Rider has arrived at the delivery location.`
    }).catch(err => console.error('Notification Error:', err));

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

// GET /api/delivery/orders/:id/company-qr
export const getCompanyQR = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const query = {
        deliveryBoyId: req.user.id,
        isDeleted: { $ne: true },
        $or: [{ orderId: id }],
    };
    if (mongoose.isValidObjectId(id)) {
        query.$or.push({ _id: id });
    }

    const order = await Order.findOne(query);
    if (!order) throw new ApiError(404, 'Order not found.');

    const total = order.total || 0;
    // Simulated UPI intent via QR serving API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=company@upi%26pn=CLOSH%20Platform%26am=${total}%26cu=INR%26tn=Order_${order.orderId}`;

    return res.status(200).json(new ApiResponse(200, { qrUrl }, 'Company QR code generated.'));
});


// ═══════════════════════════════════════════════════════════════
//  ANTIGRAVITY ENGINE — State-Machine Delivery Flow Handlers
// ═══════════════════════════════════════════════════════════════

/** Helper: find an order assigned to the current rider */
const findOrderForRider = async (id, riderId, selectOtp = false) => {
    const query = {
        deliveryBoyId: riderId,
        isDeleted: { $ne: true },
        $or: [{ orderId: id }],
    };
    if (mongoose.isValidObjectId(id)) query.$or.push({ _id: id });

    let q = Order.findOne(query).populate('vendorItems.vendorId');
    if (selectOtp) q = q.select('+deliveryOtpHash +deliveryOtpExpiry +deliveryOtpDebug');
    const order = await q;
    if (!order) throw new ApiError(404, 'Order not found or not assigned to you.');
    return order;
};

/** Map a top-level order.status to a deliveryFlow phase (for backward compat) */
const statusToPhase = (status) => {
    const map = {
        assigned: 'assigned', ready_for_pickup: 'assigned',
        picked_up: 'picked_up', out_for_delivery: 'out_for_delivery',
        delivered: 'delivered',
    };
    return map[status] || 'assigned';
};

/** Ensure the order has a deliveryFlow sub-doc, bootstrap if missing */
const ensureDeliveryFlow = (order) => {
    if (!order.deliveryFlow) {
        order.deliveryFlow = { phase: statusToPhase(order.status) };
    }
    return order.deliveryFlow;
};

// GET /api/delivery/orders/:id/flow
export const getDeliveryFlow = asyncHandler(async (req, res) => {
    const order = await findOrderForRider(req.params.id, req.user.id);
    const flow = order.deliveryFlow || { phase: statusToPhase(order.status) };
    res.status(200).json(new ApiResponse(200, {
        orderId: order.orderId,
        orderType: order.orderType,
        status: order.status,
        deliveryFlow: flow,
    }, 'Delivery flow fetched.'));
});

// PATCH /api/delivery/orders/:id/pickup
export const handlePickup = asyncHandler(async (req, res) => {
    const { pickupPhoto } = req.body;
    if (!pickupPhoto) throw new ApiError(400, 'Pickup photo is required.');

    const order = await findOrderForRider(req.params.id, req.user.id);
    const flow = ensureDeliveryFlow(order);

    if (flow.phase !== 'assigned') {
        throw new ApiError(409, `Cannot pickup from phase "${flow.phase}". Expected: assigned.`);
    }

    flow.phase = 'picked_up';
    flow.pickupPhoto = pickupPhoto;
    flow.pickupCompletedAt = new Date();
    order.status = 'picked_up';
    order.pickedUpAt = new Date();
    order.pickupPhoto = pickupPhoto;

    // Sync vendorItems statuses
    if (order.vendorItems && order.vendorItems.length > 0) {
        order.vendorItems.forEach(group => {
            group.status = 'picked_up';
            group.pickedUpAt = new Date();
        });
    }

    await order.save();

    emitEvent(`user_${order.userId}`, 'order_picked_up', { orderId: order.orderId });
    (order.vendorItems || []).forEach(vi =>
        emitEvent(`vendor_${vi.vendorId}`, 'order_picked_up', { orderId: order.orderId })
    );
    OrderNotificationService.notifyOrderUpdate(order._id, 'picked_up', {
        excludeRecipientId: req.user.id,
        title: `Order #${order.orderId} Picked Up`,
        message: `Delivery partner has picked up your order.`,
    }).catch(() => {});

    res.status(200).json(new ApiResponse(200, order, 'Pickup confirmed.'));
});

// PATCH /api/delivery/orders/:id/start
export const handleStartDelivery = asyncHandler(async (req, res) => {
    const order = await findOrderForRider(req.params.id, req.user.id);
    const flow = ensureDeliveryFlow(order);

    if (flow.phase !== 'picked_up') {
        throw new ApiError(409, `Cannot start delivery from phase "${flow.phase}". Expected: picked_up.`);
    }

    flow.phase = 'out_for_delivery';
    flow.startedAt = new Date();
    order.status = 'out_for_delivery';

    // Sync vendorItems statuses
    if (order.vendorItems && order.vendorItems.length > 0) {
        order.vendorItems.forEach(group => {
            group.status = 'out_for_delivery';
        });
    }

    await order.save();

    emitEvent(`user_${order.userId}`, 'order_out_for_delivery', { orderId: order.orderId });
    OrderNotificationService.notifyOrderUpdate(order._id, 'out_for_delivery', {
        excludeRecipientId: req.user.id,
        title: `Order #${order.orderId} On The Way`,
        message: `Your order is out for delivery.`,
    }).catch(() => {});

    res.status(200).json(new ApiResponse(200, order, 'Delivery started. Tracking active.'));
});

// PATCH /api/delivery/orders/:id/location
export const handleLocationUpdate = asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) throw new ApiError(400, 'Coordinates required.');

    const order = await findOrderForRider(req.params.id, req.user.id);
    const flow = ensureDeliveryFlow(order);

    flow.lastLocation = { type: 'Point', coordinates: [longitude, latitude] };
    await order.save();

    emitEvent(`order_${order.orderId}`, 'location_updated', { latitude, longitude });
    res.status(200).json(new ApiResponse(200, null, 'Location updated.'));
});

// PATCH /api/delivery/orders/:id/arrived
export const handleArrivedAtCustomer = asyncHandler(async (req, res) => {
    const order = await findOrderForRider(req.params.id, req.user.id);
    const flow = ensureDeliveryFlow(order);

    if (!['out_for_delivery', 'picked_up'].includes(flow.phase)) {
        throw new ApiError(409, `Cannot mark arrived from phase "${flow.phase}".`);
    }

    // Auto-advance status
    if (order.status === 'picked_up') order.status = 'out_for_delivery';

    flow.phase = 'arrived';
    flow.arrivedAt = new Date();

    // Generate OTP
    const generatedOtp = generateDeliveryOtp();
    flow.otpHash = hashDeliveryOtp(generatedOtp);
    flow.otpExpiry = new Date(Date.now() + DELIVERY_OTP_TTL_MS);
    flow.otpSentAt = new Date();
    flow.otpAttempts = 0;
    if (!IS_PRODUCTION) flow.otpDebug = generatedOtp;

    // Keep legacy OTP fields in sync
    order.deliveryOtpHash = hashDeliveryOtp(generatedOtp);
    order.deliveryOtpExpiry = new Date(Date.now() + DELIVERY_OTP_TTL_MS);
    order.deliveryOtpSentAt = new Date();
    order.deliveryOtpAttempts = 0;
    if (!IS_PRODUCTION) order.deliveryOtpDebug = generatedOtp;

    // For try_and_buy orders, populate checklist from order items
    if (order.orderType === 'try_and_buy' && (!flow.tryAndBuyItems || flow.tryAndBuyItems.length === 0)) {
        flow.tryAndBuyItems = (order.items || []).map(item => ({
            productId: item.productId,
            name: item.name,
            image: item.image,
            price: item.price,
            quantity: item.quantity,
            variant: item.variant,
            decision: 'pending',
        }));
    }

    flow.originalAmount = order.total;
    flow.finalAmount = order.total;
    await order.save();

    try { await sendDeliveryOtpEmail(order, generatedOtp); } catch (e) {}

    emitEvent(`user_${order.userId}`, 'rider_arrived', {
        orderId: order.orderId, otp: generatedOtp,
    });
    createNotification({
        recipientId: order.userId, recipientType: 'user',
        title: 'Rider Arrived!',
        message: `Your rider has reached your location. Share OTP ${generatedOtp} to receive your order.`,
        type: 'order', data: { orderId: order.orderId, status: 'arrived' },
    }).catch(() => {});

    OrderNotificationService.notifyOrderUpdate(order._id, 'arrived', {
        excludeRecipientId: req.user.id,
        title: `Rider Arrived`, message: `Rider has arrived at the delivery location.`,
    }).catch(() => {});

    res.status(200).json(new ApiResponse(200, order, 'Rider arrived. OTP sent to customer.'));
});

// PATCH /api/delivery/orders/:id/try-buy
export const handleTryAndBuy = asyncHandler(async (req, res) => {
    const { items } = req.body; // [{ productId, decision: 'accepted'|'rejected' }]
    if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'Items with accept/reject decisions are required.');
    }

    const order = await findOrderForRider(req.params.id, req.user.id);
    if (order.orderType !== 'try_and_buy') {
        throw new ApiError(400, 'This order is not a Try & Buy order.');
    }
    const flow = ensureDeliveryFlow(order);
    if (flow.phase !== 'arrived') {
        throw new ApiError(409, `Try & Buy requires phase "arrived", current: "${flow.phase}".`);
    }

    const tryItems = flow.tryAndBuyItems || [];
    items.forEach(({ productId, decision }) => {
        const matched = tryItems.find(i => String(i.productId) === String(productId));
        if (matched && ['accepted', 'rejected'].includes(decision)) {
            matched.decision = decision;
        }
    });

    flow.tryAndBuyItems = tryItems;
    flow.tryAndBuyCompletedAt = new Date();
    flow.phase = 'try_and_buy';

    // Recalculate final amount from accepted items only
    const acceptedItems = tryItems.filter(i => i.decision === 'accepted');
    if (acceptedItems.length === 0) {
        throw new ApiError(400, 'At least one item must be accepted.');
    }
    flow.finalAmount = acceptedItems.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0);

    await order.save();
    res.status(200).json(new ApiResponse(200, order, 'Try & Buy decisions recorded. Proceed to payment.'));
});

// PATCH /api/delivery/orders/:id/payment
export const handlePayment = asyncHandler(async (req, res) => {
    const { method } = req.body; // 'cash' | 'qr'
    if (!['cash', 'qr'].includes(method)) {
        throw new ApiError(400, 'Payment method must be "cash" or "qr".');
    }

    const order = await findOrderForRider(req.params.id, req.user.id);
    const flow = ensureDeliveryFlow(order);

    const validFrom = order.orderType === 'try_and_buy'
        ? ['try_and_buy']
        : ['arrived'];
    if (!validFrom.includes(flow.phase)) {
        throw new ApiError(409, `Cannot set payment from phase "${flow.phase}".`);
    }

    flow.paymentMethod = method;
    flow.phase = 'payment_pending';

    // For online-prepaid orders, auto-mark payment collected
    if (order.paymentMethod !== 'cod' && order.paymentMethod !== 'cash') {
        flow.paymentCollected = true;
        flow.paymentCollectedAt = new Date();
    }

    await order.save();

    const responseData = { order };
    if (method === 'qr') {
        const amt = flow.finalAmount || order.total || 0;
        responseData.qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=company@upi%26pn=CLOSH%20Platform%26am=${amt}%26cu=INR%26tn=Order_${order.orderId}`;
    }

    res.status(200).json(new ApiResponse(200, responseData, 'Payment method set. Complete delivery with OTP.'));
});

// PATCH /api/delivery/orders/:id/complete
export const handleCompleteDelivery = asyncHandler(async (req, res) => {
    const { otp, openBoxPhoto, deliveryProofPhoto } = req.body;

    if (!/^\d{6}$/.test(String(otp || '').trim())) {
        throw new ApiError(400, 'Valid 6-digit OTP is required.');
    }
    const order = await findOrderForRider(req.params.id, req.user.id);
    const flow = ensureDeliveryFlow(order);

    const isCodOrder = order.paymentMethod === 'cod' || order.paymentMethod === 'cash';
    if (!deliveryProofPhoto) throw new ApiError(400, 'Delivery proof photo is required.');
    if (isCodOrder && !openBoxPhoto) throw new ApiError(400, 'Open box photo (item verification) is required for COD orders.');
    if (flow.phase !== 'payment_pending') {
        throw new ApiError(409, `Cannot complete from phase "${flow.phase}". Expected: payment_pending.`);
    }

    // Verify OTP
    const normalizedOtp = String(otp).trim();
    if (!flow.otpHash || !flow.otpExpiry) throw new ApiError(400, 'OTP was not generated.');
    if (flow.otpExpiry < new Date()) throw new ApiError(400, 'OTP has expired. Please resend.');

    const isMatch = flow.otpHash === hashDeliveryOtp(normalizedOtp);
    const isDebugMatch = !IS_PRODUCTION && flow.otpDebug === normalizedOtp;
    if (!isMatch && !isDebugMatch) {
        flow.otpAttempts = (flow.otpAttempts || 0) + 1;
        await order.save();
        throw new ApiError(400, 'Invalid OTP.');
    }

    // ── Finalize ──
    flow.phase = 'delivered';
    flow.openBoxPhoto = openBoxPhoto;
    flow.deliveryProofPhoto = deliveryProofPhoto;
    flow.otpVerified = true;
    flow.otpVerifiedAt = new Date();
    flow.paymentCollected = true;
    flow.paymentCollectedAt = new Date();

    // Sync legacy fields
    order.status = 'delivered';
    order.deliveredAt = new Date();
    order.openBoxPhoto = openBoxPhoto;
    order.deliveryPhoto = deliveryProofPhoto;
    order.deliveryOtpVerifiedAt = new Date();
    if (order.paymentMethod === 'cod' || order.paymentMethod === 'cash') {
        order.paymentStatus = 'paid';
        order.isCashSettled = false;
        order.codCollectionMethod = flow.paymentMethod;
        order.codCollectedAt = new Date();
    }

    // Sync vendorItems statuses
    if (order.vendorItems && order.vendorItems.length > 0) {
        order.vendorItems.forEach(group => {
            group.status = 'delivered';
            group.deliveredAt = new Date();
        });
    }

    await order.save();

    // Credit rider earnings
    const riderEarnings = Number(order.shipping || 0);
    const updatedRider = await DeliveryBoy.findByIdAndUpdate(
        order.deliveryBoyId,
        { $inc: { totalDeliveries: 1, totalEarnings: riderEarnings, availableBalance: riderEarnings } },
        { new: true }
    );

    // Credit vendor earnings (adjusted for Try & Buy)
    const finalAmount = flow.finalAmount || order.total;
    const ratio = order.total > 0 ? finalAmount / order.total : 1;
    const vendorUpdates = (order.vendorItems || []).map(group => {
        if (group.vendorId && group.vendorEarnings > 0) {
            const adjusted = Math.round(Number(group.vendorEarnings) * ratio);
            if (adjusted > 0) {
                return mongoose.model('Vendor').findByIdAndUpdate(group.vendorId, {
                    $inc: { availableBalance: adjusted },
                });
            }
        }
        return null;
    }).filter(Boolean);
    if (vendorUpdates.length) await Promise.all(vendorUpdates);

    // Notify everyone
    await OrderNotificationService.notifyOrderUpdate(order._id, 'delivered', {
        excludeRecipientId: req.user.id,
        title: `Order #${order.orderId} Delivered`,
        message: `Order ${order.orderId} has been successfully delivered.`,
    });
    emitEvent(`delivery_${req.user.id}`, 'earnings_updated', {
        availableBalance: updatedRider?.availableBalance,
        totalEarnings: updatedRider?.totalEarnings,
        totalDeliveries: updatedRider?.totalDeliveries,
    });

    res.status(200).json(new ApiResponse(200, {
        order,
        rider: {
            availableBalance: updatedRider?.availableBalance,
            totalEarnings: updatedRider?.totalEarnings,
            totalDeliveries: updatedRider?.totalDeliveries,
        },
    }, 'Delivery completed!'));
});

// PATCH /api/delivery/batch/select
export const handleBatchSelect = asyncHandler(async (req, res) => {
    const { orderIds } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
        throw new ApiError(400, 'orderIds array is required.');
    }

    const riderId = req.user.id;
    const orders = await Order.find({
        deliveryBoyId: riderId,
        isDeleted: { $ne: true },
        status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] },
        $or: orderIds.map(oid => mongoose.isValidObjectId(oid) ? { _id: oid } : { orderId: oid }),
    });

    if (orders.length === 0) throw new ApiError(404, 'No matching orders found for batch.');

    // Group by customer
    const customerId = orders[0].userId;
    const batch = await DeliveryBatch.create({
        batchId: `BATCH-${Date.now().toString(36).toUpperCase()}`,
        deliveryBoyId: riderId,
        customerId,
        status: 'assigned',
        customerLocation: orders[0].dropoffLocation,
        customerAddress: orders[0].shippingAddress,
        customerPhone: orders[0].shippingAddress?.phone,
        customerName: orders[0].shippingAddress?.name,
    });

    // Create Delivery records and link to batch
    const deliveryDocs = [];
    for (const order of orders) {
        let delivery = await Delivery.findOne({ orderId: order._id, status: { $ne: 'delivered' } });
        if (!delivery) {
            delivery = await Delivery.create({
                orderId: order._id,
                vendorId: order.vendorItems?.[0]?.vendorId || order.userId,
                deliveryBoyId: riderId,
                batchId: batch._id,
                status: 'assigned',
                payment: { method: order.paymentMethod === 'cod' ? 'cod' : 'online', originalAmount: order.total },
            });
        } else {
            delivery.batchId = batch._id;
            await delivery.save();
        }
        deliveryDocs.push(delivery._id);
    }

    batch.deliveries = deliveryDocs;
    await batch.save();

    res.status(200).json(new ApiResponse(200, batch, 'Batch created.'));
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
