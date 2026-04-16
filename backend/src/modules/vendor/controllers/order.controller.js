import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Order from '../../../models/Order.model.js';
import Commission from '../../../models/Commission.model.js';
import Settlement from '../../../models/Settlement.model.js';
import mongoose from 'mongoose';
import { createNotification } from '../../../services/notification.service.js';
import { notifyNearbyDeliveryBoys } from '../../delivery/controllers/assignment.controller.js';
import { emitEvent } from '../../../services/socket.service.js';
import { OrderNotificationService } from '../../../services/orderNotification.service.js';

const deriveTopLevelOrderStatus = (vendorItems = [], fallback = 'pending') => {
    const statuses = (vendorItems || [])
        .map((item) => String(item?.status || '').toLowerCase())
        .filter(Boolean);

    if (!statuses.length) return String(fallback || 'pending').toLowerCase();

    if (statuses.every((s) => s === 'cancelled')) return 'cancelled';
    if (statuses.every((s) => s === 'delivered')) return 'delivered';
    if (statuses.includes('out_for_delivery')) return 'out_for_delivery';
    if (statuses.includes('picked_up')) return 'picked_up';
    if (statuses.includes('ready_for_pickup')) return 'ready_for_pickup';
    if (statuses.includes('accepted')) return 'accepted';
    if (statuses.includes('pending')) return 'pending';

    return String(fallback || 'pending').toLowerCase();
};

// GET /api/vendor/orders
export const getVendorOrders = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const numericPage = Math.max(1, Number(page) || 1);
    const numericLimit = Math.max(1, Number(limit) || 20);
    const skip = (numericPage - 1) * numericLimit;

    const filter = status
        ? { vendorItems: { $elemMatch: { vendorId: req.user.id, status } } }
        : { 'vendorItems.vendorId': req.user.id };

    const orders = await Order.find(filter)
        .select('orderId status total items.name items.image items.quantity items.variant shippingAddress.name guestInfo.name vendorItems.vendorId vendorItems.status vendorItems.items.name vendorItems.items.image vendorItems.items.quantity vendorItems.items.variant vendorItems.subtotal createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean();
        
    const total = await Order.countDocuments(filter);
    res.status(200).json(new ApiResponse(200, { orders, total, page: numericPage, pages: Math.ceil(total / numericLimit) }, 'Orders fetched.'));
});

// GET /api/vendor/orders/:id
export const getVendorOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const idFilter = [{ orderId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
        idFilter.push({ _id: id });
    }

    const order = await Order.findOne({
        $or: idFilter,
        'vendorItems.vendorId': req.user.id,
    }).populate('deliveryBoyId', 'name phone profileImage vehicleNumber status');
    if (!order) throw new ApiError(404, 'Order not found.');

    res.status(200).json(new ApiResponse(200, order, 'Order fetched.'));
});

// PATCH /api/vendor/orders/:id/status
export const updateOrderStatus = asyncHandler(async (req, res) => {
    // Status is already validated and normalized by the middleware
    const status = req.body.status;
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, 'Order ID is required in URL params.');
    }

    const idFilter = [{ orderId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
        idFilter.push({ _id: id });
    }

    const order = await Order.findOne({
        $or: idFilter,
        'vendorItems.vendorId': req.user.id,
    });
    if (!order) throw new ApiError(404, 'Order not found.');

    const vendorItem = order.vendorItems.find((vi) => String(vi.vendorId) === String(req.user.id));
    if (!vendorItem) throw new ApiError(404, 'Vendor order item not found.');

    const currentStatus = String(vendorItem.status || 'pending').trim().toLowerCase();

    const transitionMap = {
        pending: ['accepted', 'processing', 'ready_for_pickup', 'cancelled'],
        accepted: ['accepted', 'ready_for_pickup', 'cancelled', 'processing'],
        processing: ['processing', 'ready_for_pickup', 'cancelled', 'accepted'],
        ready_for_pickup: ['ready_for_pickup', 'picked_up', 'cancelled'], // picked_up by delivery partner
        picked_up: ['picked_up', 'out_for_delivery'],
        out_for_delivery: ['out_for_delivery', 'delivered'],
        delivered: ['delivered'],
        cancelled: ['cancelled'],
    };

    const allowedNextStatuses = transitionMap[currentStatus] || [];
    if (!allowedNextStatuses.includes(status)) {
        throw new ApiError(409, `Cannot move order from "${currentStatus}" to "${status}". Allowed: ${allowedNextStatuses.join(', ')}`);
    }

    const vendor = await mongoose.model('Vendor').findById(req.user.id);
    const storeName = vendor?.storeName || req.user.email || 'Store';

    console.log(`\n--- 🏪 [VENDOR ORDER UPDATE] ---`);
    console.log(`Order: ${id}, Vendor: ${req.user.id}, Next Status: ${status}`);

    // Update only this vendor's items status
    order.vendorItems = order.vendorItems.map((vi) =>
        vi.vendorId.toString() === req.user.id ? { ...vi.toObject(), status } : vi
    );
    const oldStatus = order.status;
    order.status = deriveTopLevelOrderStatus(order.vendorItems, order.status);
    console.log(`[VendorUpdate] New Group Status: ${status}, Overall Order Status: ${oldStatus} -> ${order.status}`);
    await order.save();

    if (status === 'ready_for_pickup' || status === 'accepted') {
        if (vendor && vendor.shopLocation) {
            order.pickupLocation = vendor.shopLocation;
            await order.save();
        }
        
        // Notify delivery boys only if NO one is assigned yet
        if (!order.deliveryBoyId) {
            await notifyNearbyDeliveryBoys(order).catch(err =>
                console.error(`[Assignment] Failed to notify delivery boys for order ${order.orderId}:`, err)
            );
        }
    }

    // Unified Notification to all parties
    await OrderNotificationService.notifyOrderUpdate(order._id, status, {
        excludeRecipientId: req.user.id, // Vendor already knows it changed
        title: `Order #${order.orderId} ${status.replace(/_/g, ' ')}`,
        message: `Your order from ${storeName} is now ${status.replace(/_/g, ' ')}.`
    });

    res.status(200).json(new ApiResponse(200, order, 'Order status updated.'));
});

// GET /api/vendor/earnings
export const getEarnings = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 50,
        settlementsPage = 1,
        settlementsLimit = 50,
    } = req.query;
    const numericPage = Math.max(1, Number(page) || 1);
    const numericLimit = Math.max(1, Number(limit) || 50);
    const commissionSkip = (numericPage - 1) * numericLimit;
    const numericSettlementsPage = Math.max(1, Number(settlementsPage) || 1);
    const numericSettlementsLimit = Math.max(1, Number(settlementsLimit) || 50);
    const settlementSkip = (numericSettlementsPage - 1) * numericSettlementsLimit;

    const [commissionDocs, totalCommissions, settlements, totalSettlements, aggregationResult] = await Promise.all([
        Commission.find({ vendorId: req.user.id })
            .select('orderId amount vendorEarnings commission status createdAt')
            .populate('orderId', 'orderId status')
            .sort({ createdAt: -1 })
            .skip(commissionSkip)
            .limit(numericLimit)
            .lean(),
        Commission.countDocuments({ vendorId: req.user.id }),
        Settlement.find({ vendorId: req.user.id })
            .sort({ createdAt: -1 })
            .skip(settlementSkip)
            .limit(numericSettlementsLimit)
            .lean(),
        Settlement.countDocuments({ vendorId: req.user.id }),
        Commission.aggregate([
            { $match: { vendorId: new mongoose.Types.ObjectId(req.user.id) } },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$vendorEarnings", 0] } },
                    totalCommission: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$commission", 0] } },
                    pendingEarnings: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$vendorEarnings", 0] } },
                    paidEarnings: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$vendorEarnings", 0] } },
                    cancelledEarnings: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, "$vendorEarnings", 0] } },
                    totalOrders: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, 1, 0] } }
                }
            }
        ])
    ]);

    const currentVendor = await mongoose.model('Vendor').findById(req.user.id).select('availableBalance').lean();
    const stats = aggregationResult[0] || { totalEarnings: 0, pendingEarnings: 0, paidEarnings: 0, cancelledEarnings: 0, totalCommission: 0, totalOrders: 0 };
    
    const summary = {
        ...stats,
        availableBalance: currentVendor?.availableBalance || 0
    };

    const commissions = commissionDocs.map((doc) => {
        const commission = doc;
        const orderRef = commission.orderId?._id || commission.orderId;
        const orderDisplayId = commission.orderId?.orderId || String(orderRef || '');
        const orderStatus = String(commission.orderId?.status || '').toLowerCase();
        const effectiveStatus = orderStatus === 'cancelled' ? 'cancelled' : String(commission.status || 'pending');
        return {
            ...commission,
            orderRef,
            orderDisplayId,
            effectiveStatus,
        };
    });

    res.status(200).json(
        new ApiResponse(
            200,
            {
                summary,
                commissions,
                settlements,
                pagination: {
                    totalCommissions,
                    page: numericPage,
                    limit: numericLimit,
                    pages: Math.max(1, Math.ceil(totalCommissions / numericLimit)),
                },
                settlementsPagination: {
                    totalSettlements,
                    page: numericSettlementsPage,
                    limit: numericSettlementsLimit,
                    pages: Math.max(1, Math.ceil(totalSettlements / numericSettlementsLimit)),
                },
            },
            'Earnings fetched.'
        )
    );
});
