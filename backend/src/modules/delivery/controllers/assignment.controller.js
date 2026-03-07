import mongoose from 'mongoose';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import Order from '../../../models/Order.model.js';
import { createNotification } from '../../../services/notification.service.js';
import { emitEvent } from '../../../services/socket.service.js';
import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';

/**
 * Find nearby delivery boys for an order
 * @param {Object} order - The order document
 * @param {Number} radiusKm - Search radius in kilometers
 * @returns {Array} List of nearby delivery boys
 */
export const findNearbyDeliveryBoys = async (order, radiusKm = 5) => {
    const pickupLocation = order.pickupLocation;
    if (!pickupLocation || !pickupLocation.coordinates || pickupLocation.coordinates[0] === 0) {
        return [];
    }

    // radiusKm to radians (6371 is earth radius in km)
    const radiusInRadians = radiusKm / 6371;

    const nearbyBoys = await DeliveryBoy.find({
        status: 'available',
        isActive: true,
        applicationStatus: 'approved',
        currentLocation: {
            $geoWithin: {
                $centerSphere: [pickupLocation.coordinates, radiusInRadians]
            }
        }
    }).limit(10);

    return nearbyBoys;
};

/**
 * Notify nearby delivery boys about a new available order
 */
export const notifyNearbyDeliveryBoys = async (order) => {
    const nearbyBoys = await findNearbyDeliveryBoys(order);

    const notificationPromises = nearbyBoys.map(boy =>
        createNotification({
            recipientId: boy._id,
            recipientType: 'delivery',
            title: 'New Order Available',
            message: `A new order #${order.orderId} is ready for pickup near you.`,
            type: 'order',
            data: {
                orderId: order.orderId,
                pickupLocation: order.pickupLocation,
                dropoffLocation: order.shippingAddress, // or dropoffLocation if set
                type: 'new_assignment_broadcast'
            }
        })
    );

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

    // Notify customer in real-time
    if (order.userId) {
        emitEvent(`user_${order.userId}`, 'order_status_updated', {
            orderId: order.orderId,
            status: 'assigned',
            message: `A delivery partner has been assigned to your order ${order.orderId}.`
        });
    }

    // Notify vendor(s) in real-time
    order.vendorItems?.forEach(vi => {
        if (vi.vendorId) {
            emitEvent(`vendor_${vi.vendorId}`, 'order_status_updated', {
                orderId: order.orderId,
                status: 'assigned',
                message: `Delivery partner assigned for order ${order.orderId}.`
            });
        }
    });

    // Notify other delivery partners that this order is taken
    emitEvent('delivery_partners', 'order_taken', {
        orderId: order.orderId,
    });

    res.status(200).json(new ApiResponse(200, order, 'Order assigned successfully.'));
});
