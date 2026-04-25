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
import Product from '../../../models/Product.model.js';
import { OrderWorkflowService } from '../../../services/orderWorkflow.service.js';
import { OrderNotificationService } from '../../../services/orderNotification.service.js';
import { sendDeliveryOtpSms } from '../../../services/sms.service.js';
import * as DeliveryOtpService from '../../../services/deliveryOtp.service.js';
import redisConnection from '../../../config/redis.js';
import { WalletService } from '../../../services/wallet.service.js';

const DELIVERY_OTP_TTL_MS = 10 * 60 * 1000;
const DELIVERY_OTP_MAX_ATTEMPTS = 5;
const DELIVERY_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const IS_PRODUCTION = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const CACHE_TTL_SECONDS = 90; // 1.5 min cache for summary endpoints

/** Lightweight Redis cache helpers — silently fall back if Redis is down */
export const cacheGet = async (key) => {
    try {
        if (redisConnection?.status !== 'ready') return null;
        const data = await redisConnection.get(key);
        return data ? JSON.parse(data) : null;
    } catch { return null; }
};
export const cacheSet = async (key, value, ttl = CACHE_TTL_SECONDS) => {
    try {
        if (redisConnection?.status !== 'ready') return;
        await redisConnection.set(key, JSON.stringify(value), 'EX', ttl);
    } catch { /* silent */ }
};
export const cacheInvalidate = async (...keys) => {
    try {
        if (redisConnection?.status !== 'ready') return;
        await redisConnection.del(...keys);
    } catch { /* silent */ }
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
        filter.status = { $in: ['assigned', 'picked_up', 'out_for_delivery', 'arrived'] };
    } else if (status) {
        // Support comma-separated statuses (e.g. "delivered,cancelled")
        if (typeof status === 'string' && status.includes(',')) {
            filter.status = { $in: status.split(',').map(s => s.trim()) };
        } else {
            filter.status = status;
        }
    }

    const hasPaginationParams = page !== undefined || limit !== undefined;
    const selectFields = 'orderId status total deliveryEarnings deliveryDistance items.name items.image items.quantity orderType paymentMethod customer phone address shippingAddress.name guestInfo.name vendorItems.vendorId vendorItems.vendorName createdAt updatedAt';

    if (!hasPaginationParams) {
        const orders = await Order.find(filter)
            .select(selectFields)
            .populate('vendorItems.vendorId', 'storeName')
            .sort({ updatedAt: -1 })
            .lean();
        return res.status(200).json(new ApiResponse(200, orders, 'Assigned orders fetched.'));
    }

    const numericPage = Math.max(1, Number(page) || 1);
    const requestedLimit = Number(limit) || 20;
    const numericLimit = Math.min(Math.max(1, requestedLimit), 100);
    const skip = (numericPage - 1) * numericLimit;

    const [orders, total] = await Promise.all([
        Order.find(filter)
            .select(selectFields)
            .populate('vendorItems.vendorId', 'storeName')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(numericLimit)
            .lean(),
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

    // ── BLOCKER: check if rider already has an active mission (Order or Return) ──
    const [hasActiveOrder, hasActiveReturn] = await Promise.all([
        Order.exists({
            deliveryBoyId: req.user.id,
            isDeleted: { $ne: true },
            status: { $in: ['assigned', 'picked_up', 'out_for_delivery', 'arrived'] }
        }),
        ReturnRequest.exists({
            deliveryBoyId: req.user.id,
            status: 'processing'
        })
    ]);

    if (hasActiveOrder || hasActiveReturn) {
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    orders: [],
                    pagination: { total: 0, page: numericPage, limit: numericLimit, pages: 1 },
                },
                'Mission in progress: Finish your current task to see more orders.'
            )
        );
    }

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
        Order.find(filter)
            .select('orderId status pickupLocation dropoffLocation total deliveryEarnings items.name items.image items.quantity orderType createdAt shippingAddress.city shippingAddress.state')
            .populate('vendorItems.vendorId', 'storeName shopAddress shopLocation')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(numericLimit)
            .lean(),
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
    const cacheKey = `dash:${deliveryBoyId}`;

    // Try cache first
    const cached = await cacheGet(cacheKey);
    if (cached) return res.status(200).json(new ApiResponse(200, cached, 'Dashboard summary fetched (cached).'));

    const rider = await DeliveryBoy.findById(deliveryBoyId).select('totalEarnings availableBalance').lean();
    if (!rider) throw new ApiError(404, 'Rider profile not found.');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [statusStats, completedTodayCount, earningsStats, recentOrders, activeReturns] = await Promise.all([
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
            status: { $in: ['assigned', 'picked_up', 'out_for_delivery', 'arrived'] }
        })
        .select('orderId status total deliveryEarnings deliveryDistance orderType paymentMethod shippingAddress.name shippingAddress.phone guestInfo.name guestInfo.phone vendorItems.vendorId vendorItems.vendorName pickupLocation dropoffLocation items.name items.image items.quantity deliveryFlow.phase createdAt updatedAt')
        .populate('vendorItems.vendorId', 'storeName shopAddress shopLocation')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean(),
        ReturnRequest.find({
            deliveryBoyId,
            status: 'processing'
        })
        .populate('orderId', 'orderId total shippingAddress')
        .populate('userId', 'name email phone')
        .populate('vendorId', 'storeName shopAddress shopLocation')
        .lean()
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
        const orderObj = order.toObject ? order.toObject() : order;
        if (d && d.batchId) {
            orderObj.batchId = d.batchId.batchId;
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
        activeReturns,
    };

    await cacheSet(cacheKey, summary);
    return res.status(200).json(new ApiResponse(200, summary, 'Dashboard summary fetched.'));
});

// GET /api/delivery/orders/profile-summary
export const getProfileSummary = asyncHandler(async (req, res) => {
    const deliveryBoyId = req.user.id;
    const profileCacheKey = `profile:${deliveryBoyId}`;

    const cached = await cacheGet(profileCacheKey);
    if (cached) return res.status(200).json(new ApiResponse(200, cached, 'Profile summary fetched (cached).'));

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
                cashInHand: { 
                    $sum: { 
                        $cond: [
                            { $ne: ['$isCashSettled', true] }, 
                            { $ifNull: ['$deliveryFlow.finalAmount', '$total'] }, 
                            0
                        ] 
                    } 
                },
                totalCashCollected: { $sum: { $ifNull: ['$deliveryFlow.finalAmount', '$total'] } }
            }
        }
    ]);
    const rider = await DeliveryBoy.findById(deliveryBoyId);
    const row = deliveredStats?.[0] || {};
    const cashRow = cashStats?.[0] || { cashInHand: 0, totalCashCollected: 0 };

    // Cache and return result
    // We include existing rider profile fields to avoid UI data loss on frontend merge
    const profileData = { 
        ...rider.toObject(),
        totalDeliveries: Number(row.totalDeliveries || 0), 
        completedToday: Number(completedTodayCount || 0), 
        earnings: Number(row.earnings || 0), 
        totalEarnings: Number(rider.totalEarnings || 0), 
        availableBalance: Number(rider.availableBalance || 0), 
        cashInHand: Number(cashRow.cashInHand || 0), 
        totalCashCollected: Number(cashRow.totalCashCollected || 0) 
    };
    
    await cacheSet(profileCacheKey, profileData);

    return res.status(200).json(
        new ApiResponse(
            200,
            profileData,
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

    let order = await Order.findOne(query)
        .populate('vendorItems.vendorId', 'storeName shopAddress shopLocation phone')
        .populate('deliveryBoyId', 'name phone currentLocation')
        .select('+deliveryOtpHash +deliveryOtpExpiry +deliveryOtpSentAt +deliveryOtpAttempts');

    if (!order) {
        // Try searching in ReturnRequest
        const returnReq = await ReturnRequest.findOne({
            $or: idFilter,
            $or: [
                { deliveryBoyId: deliveryBoyId },
                { deliveryBoyId: { $exists: false }, status: 'approved' }
            ]
        }).populate('userId', 'name phone').populate('vendorId', 'storeName shopAddress shopLocation phone').populate('orderId', 'orderId total shippingAddress');

        if (!returnReq) throw new ApiError(404, 'Task not found.');

        // Normalize ReturnRequest to Order-like structure for the detail page
        return res.status(200).json(new ApiResponse(200, {
            _id: returnReq._id,
            id: returnReq._id,
            orderId: returnReq.orderId?.orderId || 'RETURN',
            status: returnReq.status === 'approved' ? 'ready_for_pickup' : (returnReq.status === 'processing' ? 'assigned' : returnReq.status),
            rawStatus: returnReq.status,
            type: 'return',
            customer: returnReq.userId?.name || 'Customer',
            phone: returnReq.userId?.phone || '',
            address: returnReq.orderId?.shippingAddress?.address || 'Pickup Point',
            pickupLocation: returnReq.pickupLocation,
            dropoffLocation: returnReq.dropoffLocation,
            total: returnReq.refundAmount || 0,
            items: returnReq.items || [],
            vendorName: returnReq.vendorId?.storeName || 'Vendor',
            vendorAddress: returnReq.vendorId?.shopAddress || 'Vendor Address',
            vendorLatitude: returnReq.vendorId?.shopLocation?.coordinates?.[1],
            vendorLongitude: returnReq.vendorId?.shopLocation?.coordinates?.[0],
            latitude: returnReq.pickupLocation?.coordinates?.[1], // For returns, pickup is from customer
            longitude: returnReq.pickupLocation?.coordinates?.[0],
            deliveryBoyId: returnReq.deliveryBoyId,
            createdAt: returnReq.createdAt,
            updatedAt: returnReq.updatedAt
        }, 'Return detail fetched.'));
    }

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

        const isMatch = order.deliveryOtpHash === DeliveryOtpService.hashOtp(normalizedOtp);
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
        const { getDistanceMatrix } = await import('../../../services/googleMaps.service.js');
        const { calculateDistance, getDeliveryEarning } = await import('../../../utils/geo.js');
        const pickup = order.pickupLocation?.coordinates || [0, 0];
        const dropoff = order.dropoffLocation?.coordinates || [0, 0];

        let distanceKm = order.deliveryDistance || 0;
        
        // Re-verify distance for accuracy
        const matrix = await getDistanceMatrix(pickup, dropoff);
        if (matrix) {
            distanceKm = matrix.distance;
        } else if (!distanceKm) {
            distanceKm = calculateDistance(pickup, dropoff);
        }
        
        const riderEarnings = getDeliveryEarning(distanceKm);

        // Persist earnings and distance on the order
        order.deliveryEarnings = riderEarnings;
        order.deliveryDistance = distanceKm;

        // ── WALLET SETTLEMENT ──
        const { WalletService } = await import('../../../services/wallet.service.js');
        await WalletService.processOrderCompletion(order);

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

        const updatedRider = await DeliveryBoy.findById(req.user.id).select('name availableBalance totalEarnings totalDeliveries');
        
        await OrderNotificationService.notifyOrderUpdate(order._id, status, {
            excludeRecipientId: req.user.id,
            title: `Order #${order.orderId} Delivered`,
            message: `Order ${order.orderId} has been successfully delivered by ${updatedRider?.name || 'Partner'}.`
        });

        await cacheInvalidate(`dash:${req.user.id}`, `profile:${req.user.id}`);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    order,
                    rider: {
                        availableBalance: updatedRider?.availableBalance || 0,
                        totalEarnings: updatedRider?.totalEarnings || 0,
                        totalDeliveries: updatedRider?.totalDeliveries || 0,
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
    await cacheInvalidate(`dash:${req.user.id}`, `profile:${req.user.id}`);

    // Unified Notification to all parties
    await OrderNotificationService.notifyOrderUpdate(order._id, status, {
        excludeRecipientId: req.user.id, // Rider knows it changed
        title: `Order #${order.orderId} ${status.replace(/_/g, ' ')}`,
        message: `Order ${order.orderId} is now ${status.replace(/_/g, ' ')}.`
    });

    res.status(200).json(new ApiResponse(200, order, 'Delivery status updated.'));
});

// POST /api/delivery/orders/:id/cancel
export const cancelOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const riderId = req.user.id;

    const query = {
        deliveryBoyId: riderId,
        isDeleted: { $ne: true },
        $or: [{ orderId: id }],
    };
    if (mongoose.isValidObjectId(id)) {
        query.$or.push({ _id: id });
    }

    const order = await Order.findOne(query);
    if (!order) throw new ApiError(404, 'Order not found.');

    const cancellableStatuses = ['assigned', 'picked_up', 'out_for_delivery', 'arrived'];
    if (!cancellableStatuses.includes(order.status)) {
        throw new ApiError(409, `Order cannot be cancelled in ${order.status} state.`);
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Refused by customer at delivery';
    
    // Update vendor items statuses
    if (order.vendorItems && order.vendorItems.length > 0) {
        order.vendorItems.forEach(group => {
            group.status = 'cancelled';
        });
    }

    // Sync deliveryFlow if exists
    if (order.deliveryFlow) {
        order.deliveryFlow.phase = 'delivered'; // Phase-out the active mission
    }

    await order.save();
    await cacheInvalidate(`dash:${riderId}`, `profile:${riderId}`);

    // Notify all parties
    emitEvent(`order_${order.orderId}`, 'order_status_updated', {
        orderId: order.orderId,
        status: 'cancelled',
    });
    emitEvent(`user_${order.userId}`, 'order_cancelled', {
        orderId: order.orderId,
        status: 'cancelled',
        reason: order.cancellationReason
    });
    
    // Notify vendors
    order.vendorItems.forEach(group => {
        emitEvent(`vendor_${group.vendorId}`, 'order_cancelled', {
          orderId: order.orderId,
          reason: order.cancellationReason
        });
    });

    await OrderNotificationService.notifyOrderUpdate(order._id, 'cancelled', {
        excludeRecipientId: riderId,
        title: `Order #${order.orderId} Cancelled`,
        message: `Order #${order.orderId} has been cancelled. Reason: ${order.cancellationReason}`
    });

    res.status(200).json(new ApiResponse(200, order, 'Order cancelled successfully.'));
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

    const order = await Order.findOne(query).select('+deviceToken');
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

    const otp = DeliveryOtpService.generateOtp();
    const flow = ensureDeliveryFlow(order);
    
    flow.otpHash = DeliveryOtpService.hashOtp(otp);
    flow.otpExpiry = new Date(Date.now() + DELIVERY_OTP_TTL_MS);
    flow.otpSentAt = new Date();
    flow.otpAttempts = 0;
    flow.otpDebug = otp;
    
    // Sync legacy fields
    order.deliveryOtpHash = flow.otpHash;
    order.deliveryOtpExpiry = flow.otpExpiry;
    order.deliveryOtpDebug = otp;

    await order.save();

    // Properly use centralized service for multi-channel notification
    await DeliveryOtpService.sendDeliveryOtp(order, otp);

    return res.status(200).json(new ApiResponse(200, { ...(IS_PRODUCTION ? {} : { deliveryOtpDebug: otp }), order: order }, 'Delivery OTP resent successfully.'));
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

    const order = await Order.findOne(query).select('+deliveryOtpDebug +deviceToken');
    if (!order) throw new ApiError(404, 'Order not found.');

    if (order.status === 'picked_up') {
        order.status = 'out_for_delivery';
    }

    // Generate Delivery OTP at Arrival
    const otp = DeliveryOtpService.generateOtp();
    const flow = ensureDeliveryFlow(order);
    
    flow.otpHash = DeliveryOtpService.hashOtp(otp);
    flow.otpExpiry = new Date(Date.now() + DELIVERY_OTP_TTL_MS);
    flow.otpSentAt = new Date();
    flow.otpAttempts = 0;
    flow.otpDebug = otp;
    order.deliveryOtpDebug = otp;

    // Sync legacy fields
    order.deliveryOtpHash = flow.otpHash;
    order.deliveryOtpExpiry = flow.otpExpiry;

    await order.save();

    // Properly use centralized service for multi-channel notification
    await DeliveryOtpService.sendDeliveryOtp(order, otp);

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
    // Robustness: ensure we are using ObjectId for the query
    console.log(`[findOrderForRider] START - ID: ${id}, Rider: ${riderId}`);
    
    const riderObjectId = mongoose.Types.ObjectId.isValid(riderId) 
        ? new mongoose.Types.ObjectId(riderId) 
        : riderId;

    const query = {
        deliveryBoyId: riderObjectId,
        isDeleted: { $ne: true },
        $or: [{ orderId: id }],
    };
    if (mongoose.isValidObjectId(id)) {
        query.$or.push({ _id: new mongoose.Types.ObjectId(id) });
    }

    let q = Order.findOne(query).populate('vendorItems.vendorId');
    if (selectOtp) q = q.select('+deliveryOtpHash +deliveryOtpExpiry +deliveryOtpDebug +deliveryFlow.otpHash +deliveryFlow.otpDebug');
    
    const order = await q;
    
    if (!order) {
        console.error(`[findOrderForRider] FAIL - Query:`, JSON.stringify(query));
        // Fallback: check if the order exists at all without rider filter for better error msgs
        const existsAtAll = await Order.findOne({ $or: [{ orderId: id }, { _id: mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null }] });
        if (existsAtAll) {
            console.error(`[findOrderForRider] Order FOUND but assigned to: ${existsAtAll.deliveryBoyId}`);
            throw new ApiError(403, `Order is assigned to another rider (${existsAtAll.deliveryBoyId}). You are ${riderId}.`);
        }
        throw new ApiError(404, 'Order not found.');
    }
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

    // Generate/Reuse OTP
    let otp = '';
    // If we're already arrived, keep existing OTP to avoid spamming the customer ("baar baar")
    const isNewArrival = !flow.otpHash || flow.otpExpiry < new Date();
    
    if (isNewArrival) {
        otp = DeliveryOtpService.generateOtp();
        flow.otpHash = DeliveryOtpService.hashOtp(otp);
        flow.otpExpiry = new Date(Date.now() + DELIVERY_OTP_TTL_MS);
        flow.otpSentAt = new Date();
        flow.otpAttempts = 0;
        flow.otpDebug = otp;
        
        // Keep legacy OTP fields in sync for mixed-version compatibility
        order.deliveryOtpHash = flow.otpHash;
        order.deliveryOtpExpiry = flow.otpExpiry;
        order.deliveryOtpSentAt = flow.otpSentAt;
        order.deliveryOtpAttempts = 0;
        order.deliveryOtpDebug = otp;
    }

    // For specialized orders, populate checklist from order items
    const isSpecializedOrder = order.orderType === 'try_and_buy' || order.orderType === 'check_and_buy';
    if (isSpecializedOrder && (!flow.tryAndBuyItems || flow.tryAndBuyItems.length === 0)) {
        flow.tryAndBuyItems = (order.items || []).map(item => ({
            productId: item.productId,
            name: item.name,
            image: item.image,
            price: item.price,
            originalPrice: item.originalPrice || item.price,
            quantity: item.quantity,
            variant: item.variant,
            decision: 'pending',
        }));
    }

    flow.originalAmount = order.total;
    flow.finalAmount = order.total;
    await order.save();

    // Only send the delivery notification if it's the first arrival or a manual retry
    if (isNewArrival) {
        await DeliveryOtpService.sendDeliveryOtp(order, otp);
    }

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
    const isSpecializedOrder = order.orderType === 'try_and_buy' || order.orderType === 'check_and_buy';
    
    if (!isSpecializedOrder) {
        throw new ApiError(400, 'This order type does not support item selection.');
    }
    const flow = ensureDeliveryFlow(order);
    if (flow.phase !== 'arrived') {
        throw new ApiError(409, `Item selection requires phase "arrived", current: "${flow.phase}".`);
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
    
    const acceptedItems = tryItems.filter(i => i.decision === 'accepted');

    // Recalculate final amount from accepted items plus fixed fees (shipping, platform fee)
const acceptedSubtotal = acceptedItems.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0);
    const originalSubtotal = order.subtotal || acceptedSubtotal;
    const subtotalRatio = originalSubtotal > 0 ? (acceptedSubtotal / originalSubtotal) : 1;

    // Fixed fees are preserved; tax and discount are scaled by the acceptance ratio
    const shipping = order.shipping || 0;
    const platformFee = order.platformFee || 0;
    const adjustedTax = Math.round((order.tax || 0) * subtotalRatio);
    const adjustedDiscount = Math.round((order.discount || 0) * subtotalRatio);

    flow.finalAmount = acceptedSubtotal + shipping + platformFee + adjustedTax - adjustedDiscount;
    if (flow.finalAmount < 0) flow.finalAmount = 0;

    await order.save();

    // Restore stock for rejected items
    const rejectedItems = tryItems.filter(i => i.decision === 'rejected');
    for (const item of rejectedItems) {
        const qty = Number(item.quantity || 1);
        const variantKey = item.variantKey;
        
        const incUpdate = { stockQuantity: qty };
        if (variantKey) {
            incUpdate[`variants.stockMap.${variantKey}`] = qty;
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            item.productId,
            { $inc: incUpdate },
            { new: true }
        );

        if (updatedProduct) {
            const nextStockState = updatedProduct.stockQuantity <= 0 ? 'out_of_stock' : (updatedProduct.stockQuantity <= (updatedProduct.lowStockThreshold || 10) ? 'low_stock' : 'in_stock');
            await Product.updateOne({ _id: updatedProduct._id }, { $set: { stock: nextStockState } });
        }
    }

    res.status(200).json(new ApiResponse(200, order, 'Item decisions recorded. Proceed to payment.'));
});

// PATCH /api/delivery/orders/:id/payment
export const handlePayment = asyncHandler(async (req, res) => {
    const { method } = req.body; // 'cash' | 'qr'
    if (!['cash', 'qr'].includes(method)) {
        throw new ApiError(400, 'Payment method must be "cash" or "qr".');
    }

    const order = await findOrderForRider(req.params.id, req.user.id);
    const flow = ensureDeliveryFlow(order);

    const isTryAndBuyFlow = order.orderType === 'try_and_buy';
    const isCheckAndBuyFlow = order.orderType === 'check_and_buy';
    
    // Now both types can go through the selection flow which sets the phase to 'try_and_buy'
    const validFrom = (isTryAndBuyFlow || isCheckAndBuyFlow)
        ? ['try_and_buy', 'payment_pending']
        : ['arrived', 'payment_pending'];
    
    if (!validFrom.includes(flow.phase)) {
        throw new ApiError(409, `Cannot set payment from phase "${flow.phase}". Valid phases: ${validFrom.join(', ')}`);
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
    // Pass true for selectOtp to ensure we have hashes/expiry
    const order = await findOrderForRider(req.params.id, req.user.id, true);
    const flow = ensureDeliveryFlow(order);

    const isCodOrder = order.paymentMethod === 'cod' || order.paymentMethod === 'cash';
    const isTryAndBuy = order.orderType === 'try_and_buy' || order.orderType === 'check_and_buy';

    if (!deliveryProofPhoto) throw new ApiError(400, 'Delivery proof photo is required.');
    if (isCodOrder && !openBoxPhoto) throw new ApiError(400, 'Open box photo (item verification) is required for COD orders.');

    const validPhases = ['payment_pending'];
    // For prepaid orders, we don't force a separate payment method selection step
    if (!isCodOrder) {
        validPhases.push('arrived');
        if (isTryAndBuy) validPhases.push('try_and_buy');
    }

    if (!validPhases.includes(flow.phase)) {
        throw new ApiError(409, `Cannot complete from phase "${flow.phase}". Expected: ${validPhases.join(' or ')}.`);
    }

    // Verify OTP (Check both flow and top-level legacy fields as fallback)
    const normalizedOtp = String(otp).trim();
    const otpHash = flow.otpHash || order.deliveryOtpHash;
    const otpExpiry = flow.otpExpiry || order.deliveryOtpExpiry;

    if (!otpHash || !otpExpiry) throw new ApiError(400, 'OTP was not generated.');
    if (new Date(otpExpiry) < new Date()) throw new ApiError(400, 'OTP has expired. Please resend.');

    const isMatch = otpHash === DeliveryOtpService.hashOtp(normalizedOtp);
    const isDebugMatch = !IS_PRODUCTION && (flow.otpDebug === normalizedOtp || order.deliveryOtpDebug === normalizedOtp);
    
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
    await cacheInvalidate(`dash:${req.user.id}`, `profile:${req.user.id}`);

    // Process financial earnings (Rider + Vendor) and ledger entries
    await WalletService.processOrderCompletion(order).catch(err => {
        console.error(`[Wallet] Error processing earnings for order ${order._id}:`, err);
    });

    const updatedRider = await DeliveryBoy.findById(order.deliveryBoyId).select('availableBalance totalEarnings totalDeliveries');

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

    // ── BLOCKER: Ensure rider doesn't already have an active mission (Order or Return) ──
    const [hasActiveOrder, hasActiveReturn] = await Promise.all([
        Order.exists({
            deliveryBoyId: deliveryBoyId,
            isDeleted: { $ne: true },
            status: { $in: ['assigned', 'picked_up', 'out_for_delivery', 'arrived'] }
        }),
        ReturnRequest.exists({
            deliveryBoyId: deliveryBoyId,
            status: 'processing'
        })
    ]);

    if (hasActiveOrder || hasActiveReturn) {
        throw new ApiError(400, 'Mission in progress: You must complete your current task before accepting another.');
    }

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

    await cacheInvalidate(`dash:${deliveryBoyId}`, `profile:${deliveryBoyId}`);

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
        returnReq.status = 'completed';
        
        // Update associated order status to reflect completion of return
        const order = await Order.findById(returnReq.orderId);
        if (order) {
            order.status = 'returned';
            await order.save();
        }

        // Notify user and vendor
        emitEvent(`user_${returnReq.userId?._id}`, 'return_completed', { returnId: returnReq._id });
        emitEvent(`vendor_${returnReq.vendorId}`, 'return_completed', { returnId: returnReq._id });
    } else {
        throw new ApiError(400, 'Invalid return status.');
    }

    await returnReq.save();

    res.status(200).json(new ApiResponse(200, returnReq, 'Return status updated.'));
});
