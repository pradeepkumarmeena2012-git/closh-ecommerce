import { cacheInvalidate } from './order.controller.js';
import mongoose from 'mongoose';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import Order from '../../../models/Order.model.js';
import ReturnRequest from '../../../models/ReturnRequest.model.js';
import { createNotification } from '../../../services/notification.service.js';
import { emitEvent } from '../../../services/socket.service.js';
import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import OrderNotificationService from '../../../services/orderNotification.service.js';


/**
 * Find nearby delivery boys for an order
 */
export const findNearbyDeliveryBoys = async (order, radiusMeters = 8000) => {
    const pickupLocation = order.pickupLocation;
    
    if (!pickupLocation || !pickupLocation.coordinates || (pickupLocation.coordinates[0] === 0 && pickupLocation.coordinates[1] === 0)) {
        return [];
    }

    // High-performance direct indexed query (Faster than aggregation for simple radius)
    return await DeliveryBoy.find({
        status: 'available',
        isAvailable: true,
        currentLocation: {
            $near: {
                $geometry: { type: 'Point', coordinates: pickupLocation.coordinates },
                $maxDistance: radiusMeters,
            },
        },
    }).limit(10).lean();
};

/**
 * Find nearby delivery partners for a return pickup
 */
export const findNearbyDeliveryBoysForReturn = async (returnRequest, radiusMeters = 8000) => {
    const pickupLocation = returnRequest.pickupLocation;
    console.log(`[Radius Search Return] Searching within ${radiusMeters}m of ${pickupLocation?.coordinates?.map(Number).join(', ')}`);

    if (!pickupLocation || !pickupLocation.coordinates || (pickupLocation.coordinates[0] === 0 && pickupLocation.coordinates[1] === 0)) {
        console.warn(`[Radius Search Return] ⚠️ Invalid pickup coordinates:`, pickupLocation?.coordinates);
        return [];
    }

    const nearbyBoys = await DeliveryBoy.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: pickupLocation.coordinates.map(Number),
                },
                distanceField: 'distance',
                maxDistance: radiusMeters,
                query: { 
                    status: 'available', 
                    isAvailable: true
                },
                spherical: true,
            },
        },
        { $limit: 10 },
    ]);

    if (nearbyBoys.length > 0) {
        console.log(`[Radius Search Return] Found ${nearbyBoys.length} boys.`);
    } else {
        console.log(`[Radius Search Return] ❌ No available boys found within ${radiusMeters}m for return.`);
    }

    return nearbyBoys;
};

/**
 * Notify nearby delivery boys about a new available order
 */
export const notifyNearbyDeliveryBoys = async (order) => {
    // Populate vendor info if not already there to show shop address
    if (typeof order.populate === 'function' && !order.populated('vendorItems.vendorId')) {
        await order.populate({
            path: 'vendorItems.vendorId',
            select: 'storeName shopAddress address shopLocation'
        });
    }

    console.log(`\n--- 🔍 [DELIVERY SEARCH] ---`);
    console.log(`Order: ${order.orderId} (${order._id})`);
    console.log(`Pickup Location: (${order.pickupLocation?.coordinates?.join(', ') || 'NONE'})`);

    const nearbyBoys = await findNearbyDeliveryBoys(order);
    console.log(`[Assignment] Nearby Boys matches from DB: ${nearbyBoys.length}`);
    
    // Calculate Earning & Distance for the socket popup
    let estimatedDistance = order.deliveryDistance ? `${order.deliveryDistance} km` : '0 km';
    let estimatedTime = 'N/A';
    let deliveryFee = order.deliveryEarnings || 25;

    try {
        const dropoffCoords = order.dropoffLocation?.coordinates;
        const pickupCoords = order.pickupLocation?.coordinates;

        if (pickupCoords?.length === 2 && dropoffCoords?.length === 2 && (dropoffCoords[0] !== 0 || dropoffCoords[1] !== 0)) {
            console.log(`[Assignment] Calculating distance to customer at ${dropoffCoords.join(', ')}...`);
            const { getDistanceMatrix } = await import('../../../services/googleMaps.service.js');
            const { calculateDistance, getDeliveryEarning } = await import('../../../utils/geo.js');
            
            const matrix = await getDistanceMatrix(pickupCoords, dropoffCoords);
            let distanceVal = order.deliveryDistance || 0;

            if (matrix) {
                distanceVal = matrix.distance;
                estimatedDistance = `${matrix.distance} km`;
                estimatedTime = matrix.duration;
                console.log(`[Assignment] Distance Matrix result: ${estimatedDistance}, ${estimatedTime}`);
            } else if (!order.deliveryDistance) {
                distanceVal = calculateDistance(pickupCoords, dropoffCoords);
                estimatedDistance = `${distanceVal} km (est.)`;
                estimatedTime = `${Math.round(distanceVal * 3)} mins`;
                console.log(`[Assignment] Haversine fallback result: ${estimatedDistance}`);
            }
            
            // Update fee if we have a fresh distance
            if (distanceVal > 0) {
                deliveryFee = getDeliveryEarning(distanceVal);
            }
            console.log(`[Assignment] Calculated Delivery Fee: ₹${deliveryFee}`);
        }
    } catch (err) {
        console.error('❌ [AssignmentDistance Error]', err.message);
    }

    const firstVendorGroup = order.vendorItems?.[0] || {};
    const vendorData = firstVendorGroup.vendorId || {};
    const vendorName = vendorData.storeName || firstVendorGroup.vendorName || 'Vendor';
    
    let vendorAddress = vendorData.shopAddress || 'Shop Address';
    if (!vendorAddress || vendorAddress === 'Shop Address') {
        if (vendorData.address?.street) {
            vendorAddress = `${vendorData.address.street}, ${vendorData.address.city || ''}`;
        }
    }

    const socketPayload = {
        orderId: order.orderId,
        id: order._id,
        pickupLocation: order.pickupLocation,
        customer: order.shippingAddress?.name || 'Customer',
        address: order.shippingAddress?.address || 'Address unavailable',
        vendorName,
        vendorAddress,
        total: order.total,
        distance: estimatedDistance,
        estimatedTime: estimatedTime,
        deliveryFee: deliveryFee,
        type: 'new_assignment_broadcast'
    };

    if (nearbyBoys.length > 0) {
        console.log(`[Assignment] Sending to ${nearbyBoys.length} specific rooms:`, nearbyBoys.map(b => b._id.toString()));
        // Targeted notification to nearby boys
        nearbyBoys.forEach(boy => {
            const boyIdStr = boy._id.toString();
            console.log(`📡 [SOCKET EMIT] Room: delivery_${boyIdStr}, Event: order_ready_for_pickup`);
            emitEvent(`delivery_${boyIdStr}`, 'order_ready_for_pickup', socketPayload);
            
            createNotification({
                recipientId: boyIdStr,
                recipientType: 'delivery',
                title: 'New Order Available',
                message: `A new order #${order.orderId} is ready for pickup near you.`,
                type: 'order',
                data: {
                    orderId: order.orderId,
                    type: 'new_assignment_broadcast'
                }
            }).catch(() => {});
        });
        console.log(`--- ✅ [DELIVERY NOTIFICATION FINISHED] ---\n`);
        return nearbyBoys.length;
    } else {
        // Fallback: Broadcast to ALL available delivery partners room
        console.log(`⚠️ [Assignment] No nearby boys (8km). Broadcasting globally to 'delivery_partners' room.`);
        emitEvent('delivery_partners', 'order_ready_for_pickup', socketPayload);
        console.log(`--- ✅ [DELIVERY NOTIFICATION FINISHED] ---\n`);
        return 0;
    }
};

/**
 * Notify nearby delivery partners about a return pickup
 */
export const notifyNearbyDeliveryBoysForReturn = async (returnRequest) => {
    const nearbyBoys = await findNearbyDeliveryBoysForReturn(returnRequest);
    if (!nearbyBoys.length) return 0;

    const orderId = returnRequest.orderId?.orderId || 'Order';

    const notificationPromises = nearbyBoys.map(boy =>
        createNotification({
            recipientId: boy._id,
            recipientType: 'delivery',
            title: 'Return Request Available',
            message: `A return request for #${orderId} is ready for pickup near you.`,
            type: 'return',
            data: {
                returnId: String(returnRequest._id),
                orderId: orderId,
                pickupLocation: JSON.stringify(returnRequest.pickupLocation),
                dropoffLocation: JSON.stringify(returnRequest.dropoffLocation),
                type: 'return_pickup_broadcast'
            }
        })
    );

    // Calculate Distance & Earning for the return broadcast
    let estimatedDistance = 'N/A';
    let estimatedTime = 'N/A';
    let deliveryFee = 25;

    try {
        if (returnRequest.pickupLocation?.coordinates?.length === 2 && returnRequest.dropoffLocation?.coordinates?.length === 2) {
            const { getDistanceMatrix } = await import('../../../services/googleMaps.service.js');
            const { calculateDistance, getDeliveryEarning } = await import('../../../utils/geo.js');
            
            const matrix = await getDistanceMatrix(returnRequest.pickupLocation.coordinates, returnRequest.dropoffLocation.coordinates);
            let distanceVal = 0;

            if (matrix) {
                distanceVal = matrix.distance;
                estimatedDistance = `${matrix.distance} km`;
                estimatedTime = matrix.duration;
            } else {
                distanceVal = calculateDistance(returnRequest.pickupLocation.coordinates, returnRequest.dropoffLocation.coordinates);
                estimatedDistance = `${distanceVal} km (est.)`;
                estimatedTime = `${Math.round(distanceVal * 3)} mins`;
            }
            deliveryFee = getDeliveryEarning(distanceVal);
        }
    } catch (err) {
        console.error('[ReturnDistance] Failed to calculate return distance:', err.message);
    }

    const returnPayload = {
        returnId: String(returnRequest._id),
        orderId: orderId,
        pickupLocation: returnRequest.pickupLocation,
        dropoffLocation: returnRequest.dropoffLocation,
        customerName: returnRequest.userId?.name || 'Customer',
        total: returnRequest.orderId?.total || 0,
        distance: estimatedDistance,
        estimatedTime: estimatedTime,
        deliveryFee: deliveryFee,
        type: 'return'
    };

    nearbyBoys.forEach(boy => {
        emitEvent(`delivery_${boy._id}`, 'return_ready_for_pickup', returnPayload);
    });

    await Promise.allSettled(notificationPromises);
    return nearbyBoys.length;
};

/**
 * Handle delivery boy accepting an order (First-Accept logic)
 */
export const acceptOrderAssignment = asyncHandler(async (req, res) => {
    const { id: orderId } = req.params;
    const deliveryBoyId = req.user.id;

    const idFilter = [{ orderId }];
    if (mongoose.isValidObjectId(orderId)) {
        idFilter.push({ _id: orderId });
    }

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

    // Atomic update to prevent double assignment
    const order = await Order.findOneAndUpdate(
        {
            $and: [
                { $or: idFilter },
                { status: 'ready_for_pickup' },
                { $or: [{ deliveryBoyId: null }, { deliveryBoyId: { $exists: false } }] }
            ]
        },
        {
            $set: {
                status: 'assigned',
                deliveryBoyId: deliveryBoyId
            }
        },
        { new: true }
    );

    if (!order) {
        throw new ApiError(409, 'Order is no longer available or has already been assigned.');
    }

    // Unified Notification to all parties
    await OrderNotificationService.notifyOrderUpdate(order._id, 'assigned', {
        title: 'Delivery Partner Assigned',
        message: `A delivery partner has been assigned to order ${order.orderId}.`
    });

    // Notify other delivery partners that this order is taken (Global broadcast to clear UI)
    emitEvent('delivery_partners', 'order_taken', {
        orderId: order.orderId,
        id: order._id
    });

    await cacheInvalidate(`dash:${deliveryBoyId}`, `profile:${deliveryBoyId}`);

    res.status(200).json(new ApiResponse(200, order, 'Order assigned successfully.'));
});
