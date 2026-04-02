import mongoose from 'mongoose';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import Order from '../../../models/Order.model.js';
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
    if (!pickupLocation || !pickupLocation.coordinates || pickupLocation.coordinates[0] === 0) {
        return [];
    }

    const nearbyBoys = await DeliveryBoy.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: pickupLocation.coordinates,
                },
                distanceField: 'distance',
                maxDistance: radiusMeters,
                query: { 
                    status: 'available', 
                    isActive: true, 
                    isAvailable: true,
                    applicationStatus: 'approved' 
                },
                spherical: true,
            },
        },
        { $limit: 10 },
    ]);

    return nearbyBoys;
};

/**
 * Find nearby delivery partners for a return pickup
 */
export const findNearbyDeliveryBoysForReturn = async (returnRequest, radiusMeters = 8000) => {
    const pickupLocation = returnRequest.pickupLocation;
    if (!pickupLocation || !pickupLocation.coordinates || pickupLocation.coordinates[0] === 0) {
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
                    isActive: true, 
                    isAvailable: true,
                    applicationStatus: 'approved' 
                },
                spherical: true,
            },
        },
        { $limit: 10 },
    ]);

    return nearbyBoys;
};

/**
 * Notify nearby delivery boys about a new available order
 */
export const notifyNearbyDeliveryBoys = async (order) => {
    const nearbyBoys = await findNearbyDeliveryBoys(order);
    if (!nearbyBoys.length) return 0;

    const notificationPromises = nearbyBoys.map(boy =>
        createNotification({
            recipientId: boy._id,
            recipientType: 'delivery',
            title: 'New Order Available',
            message: `A new order #${order.orderId} is ready for pickup near you.`,
            type: 'order',
            data: {
                orderId: order.orderId,
                pickupLocation: JSON.stringify(order.pickupLocation),
                dropoffLocation: JSON.stringify(order.shippingAddress),
                type: 'new_assignment_broadcast'
            }
        })
    );

    // Calculate Earning & Distance for the socket popup
    let estimatedDistance = 'N/A';
    let estimatedTime = 'N/A';
    let deliveryFee = order.deliveryFee || 25;

    try {
        if (order.pickupLocation?.coordinates?.length === 2 && order.shippingAddress?.coordinates?.length === 2) {
            const { getDistanceMatrix } = await import('../../../services/googleMaps.service.js');
            const { calculateDistance, getDeliveryEarning } = await import('../../../utils/geo.js');
            
            const matrix = await getDistanceMatrix(order.pickupLocation.coordinates, order.shippingAddress.coordinates);
            let distanceVal = 0;

            if (matrix) {
                distanceVal = matrix.distance;
                estimatedDistance = `${matrix.distance} km`;
                estimatedTime = matrix.duration;
            } else {
                distanceVal = calculateDistance(order.pickupLocation.coordinates, order.shippingAddress.coordinates);
                estimatedDistance = `${distanceVal} km (est.)`;
                estimatedTime = `${Math.round(distanceVal * 3)} mins`;
            }
            deliveryFee = getDeliveryEarning(distanceVal);
        }
    } catch (err) {
        console.error('[AssignmentDistance] Failed to calculate distance:', err.message);
    }

    const socketPayload = {
        orderId: order.orderId,
        id: order._id,
        pickupLocation: order.pickupLocation,
        customerName: order.shippingAddress?.name || 'Customer',
        address: order.shippingAddress?.address || 'Indore, MP',
        total: order.total,
        distance: estimatedDistance,
        estimatedTime: estimatedTime,
        deliveryFee: deliveryFee,
        type: 'new_assignment_broadcast'
    };

    nearbyBoys.forEach(boy => {
        emitEvent(`delivery_${boy._id}`, 'order_ready_for_pickup', socketPayload);
    });

    await Promise.allSettled(notificationPromises);
    return nearbyBoys.length;
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

    res.status(200).json(new ApiResponse(200, order, 'Order assigned successfully.'));
});
