import Order from '../models/Order.model.js';
import ApiError from '../utils/ApiError.js';
import { emitEvent } from './socket.service.js';
import { createNotification } from './notification.service.js';
import mongoose from 'mongoose';
import DeliveryBoy from '../models/DeliveryBoy.model.js';

/**
 * Helper to notify eligible riders within 8km
 */
async function notifyEligibleRiders(order) {
    if (!order.pickupLocation || !order.pickupLocation.coordinates || 
        (order.pickupLocation.coordinates[0] === 0 && order.pickupLocation.coordinates[1] === 0)) {
        // Fallback: Broadcast to all if no pickup location (safeguard)
        emitEvent('delivery_partners', 'order_ready_for_pickup', {
            orderId: order.orderId,
            id: order._id,
            total: order.total,
            pickupName: order.shippingAddress?.name || 'Vendor',
            address: order.shippingAddress?.address,
            isReturn: false
        });
        return;
    }

    const pickupCoords = order.pickupLocation.coordinates; // [lng, lat]
    
    // Find delivery boys within 8km (8km = 8 / 6378.1 in radians)
    const eligibleRiders = await DeliveryBoy.find({
        status: 'available',
        currentLocation: {
            $geoWithin: {
                $centerSphere: [pickupCoords, 8 / 6378.1]
            }
        }
    }).select('_id');

    console.log(`[GeoSearch] Found ${eligibleRiders.length} riders within 8km of Order #${order.orderId}`);

    // Emit targeted event to each eligible rider
    eligibleRiders.forEach(rider => {
        emitEvent(`delivery_${rider._id}`, 'order_ready_for_pickup', {
            orderId: order.orderId,
            id: order._id,
            total: order.total,
            pickupName: order.shippingAddress?.name || 'Vendor',
            address: order.shippingAddress?.address,
            isReturn: false
        });
    });
}

/**
 * Atomic Order Workflow Service
 * Manages all state transitions from Pending -> Delivered.
 */
export const OrderWorkflowService = {

    /**
     * Vendor Accepts Order
     * Status: pending -> accepted
     */
    async vendorAccept(orderId, vendorId) {
        // Transition directly to 'searching' (Ready for Pickup)
        const order = await Order.findOneAndUpdate(
            {
                $and: [
                    { $or: [{ _id: mongoose.isValidObjectId(orderId) ? orderId : null }, { orderId: orderId }] },
                    { status: 'pending' },
                    { 'vendorItems.vendorId': vendorId }
                ]
            },
            {
                $set: {
                    status: 'searching',
                    vendorAcceptedAt: new Date(),
                    readyAt: new Date(),
                    searchStartedAt: new Date(),
                    'vendorItems.$[elem].status': 'ready_for_pickup',
                    'vendorItems.$[elem].acceptedAt': new Date(),
                    'vendorItems.$[elem].readyAt': new Date()
                }
            },
            { 
                new: true,
                arrayFilters: [{ 'elem.vendorId': vendorId }]
            }
        ).populate('userId', 'name fcmTokens phone');

        if (!order) {
            throw new ApiError(409, 'Order is no longer available or already accepted.');
        }

        // Trigger Queue Service for Rider Search
        const { QueueService } = await import('./queue.service.js');
        await QueueService.scheduleRiderSearch(order._id);
        // Start 15-minute auto-cancel timer if no rider accepts
        await QueueService.scheduleRiderAcceptTimeout(order._id);

        // Notify order tracking room
        emitEvent(`order_${order.orderId}`, 'order_status_updated', { 
            orderId: order.orderId, 
            status: 'searching' 
        });

        // Notify targeted delivery partners (within 8km)
        await notifyEligibleRiders(order);

        // Push Notification to User
        createNotification({
            recipientId: order.userId,
            recipientType: 'user',
            title: 'Order Prepared!',
            message: `Your order #${order.orderId} is being prepared. We are looking for a delivery partner.`,
            type: 'order',
            data: { orderId: order.orderId, status: 'searching' }
        }).catch(err => console.error('Push Fix Error:', err));
        
        return order;
    },

    /**
     * Vendor Marks Ready + Proof Upload
     * Status: accepted -> ready_for_pickup
     */
    async markReady(orderId, vendorId, readyPhoto) {

        const order = await Order.findOneAndUpdate(
            {
                $and: [
                    { $or: [{ _id: mongoose.isValidObjectId(orderId) ? orderId : null }, { orderId: orderId }] },
                    { status: 'accepted' },
                    { 'vendorItems.vendorId': vendorId }
                ]
            },
            {
                $set: {
                    status: 'searching',
                    readyAt: new Date(),
                    readyPhoto,
                    searchStartedAt: new Date(),
                    'vendorItems.$[elem].status': 'ready_for_pickup',
                    'vendorItems.$[elem].readyAt': new Date()
                }
            },
            { 
                new: true,
                arrayFilters: [{ 'elem.vendorId': vendorId }]
            }
        ).populate('userId', 'name fcmTokens');

        if (!order) {
            throw new ApiError(409, 'Order status must be "accepted" to mark it ready.');
        }

        // Trigger Queue Service for Rider Search
        const { QueueService } = await import('./queue.service.js');
        await QueueService.scheduleRiderSearch(order._id);
        // Start 15-minute auto-cancel timer if no rider accepts
        await QueueService.scheduleRiderAcceptTimeout(order._id);
        
        // Notify order tracking room
        emitEvent(`order_${order.orderId}`, 'order_status_updated', { 
            orderId: order.orderId, 
            status: 'searching' 
        });

        // Notify targeted delivery partners (within 8km)
        await notifyEligibleRiders(order);

        // Push Notification to User
        createNotification({
            recipientId: order.userId,
            recipientType: 'user',
            title: 'Order Prepared!',
            message: `Your order #${order.orderId} is ready. We are looking for a delivery partner.`,
            type: 'order',
            data: { orderId: order.orderId, status: 'searching' }
        }).catch(err => console.error('Push Fix Error:', err));

        return order;
    },

    /**
     * Rider Claims Order (Atomic)
     * Status: searching/ready_for_pickup -> assigned
     */
    async riderClaim(orderId, riderId) {
        const order = await Order.findOneAndUpdate(
            {
                $and: [
                    { $or: [{ _id: mongoose.isValidObjectId(orderId) ? orderId : null }, { orderId: orderId }] },
                    { status: { $in: ['ready_for_pickup', 'searching', 'accepted'] } },
                    { deliveryBoyId: { $exists: false } }
                ]
            },
            {
                $set: {
                    status: 'assigned',
                    deliveryBoyId: riderId,
                    assignedAt: new Date()
                }
            },
            { new: true }
        );

        if (!order) {
            throw new ApiError(409, 'Too slow! This job has already been claimed by another rider.');
        }

        const otp = order.generateDeliveryOtp();
        await order.save();
        await order.populate('deliveryBoyId', 'name phone');

        // Notify parties
        emitEvent(`user_${order.userId}`, 'rider_assigned', { 
            orderId: order.orderId, 
            riderName: order.deliveryBoyId.name,
            riderPhone: order.deliveryBoyId.phone
        });

        // Notify other riders to clear the popup
        emitEvent('delivery_partners', 'order_taken', { orderId: order.orderId || order._id });

        // Notify order tracking room
        emitEvent(`order_${order.orderId}`, 'order_status_updated', { 
            orderId: order.orderId, 
            status: 'assigned',
            riderName: order.deliveryBoyId.name,
            riderPhone: order.deliveryBoyId.phone
        });

        // Push Notification to User
        createNotification({
            recipientId: order.userId,
            recipientType: 'user',
            title: 'Rider Assigned!',
            message: `${order.deliveryBoyId.name} is arriving to pick up your order. Your OTP is ${otp}.`,
            type: 'order',
            data: { orderId: order.orderId, status: 'assigned' }
        }).catch(err => console.error('Push Fix Error:', err));
        
        return order;
    },

    /**
     * Rider Reaches Customer Location
     */
    async markArrived(orderId, riderId) {
        const order = await Order.findOne({
            $or: [{ _id: mongoose.isValidObjectId(orderId) ? orderId : null }, { orderId: orderId }],
            deliveryBoyId: riderId,
            status: { $in: ['picked_up', 'out_for_delivery'] }
        }).select('+deliveryOtpDebug');

        if (!order) throw new ApiError(404, 'Order not found or not in correct state.');

        // Update status to out_for_delivery if not already (effectively 'arrived' or 'at_location')
        if (order.status === 'picked_up') {
            order.status = 'out_for_delivery';
            await order.save();
        }

        // Notify Customer with OTP
        emitEvent(`user_${order.userId}`, 'rider_arrived', {
            orderId: order.orderId,
            otp: order.deliveryOtpDebug
        });

        // Push Notification
        createNotification({
            recipientId: order.userId,
            recipientType: 'user',
            title: 'Rider Arrived!',
            message: `Your rider has reached your location. Share OTP ${order.deliveryOtpDebug} to receive your order.`,
            type: 'order',
            data: { orderId: order.orderId, status: 'arrived' }
        }).catch(err => console.error('Push Error:', err));

        // Notify Track Room
        emitEvent(`order_${order.orderId}`, 'order_status_updated', {
            orderId: order.orderId,
            status: 'arrived'
        });

        return order;
    },

    /**
     * Pickup Completion + OTP Verification
     * Status: assigned -> picked_up
     */
    async completePickup(orderId, riderId, otp) {
        const order = await Order.findOneAndUpdate(
            {
                $and: [
                    { $or: [{ _id: mongoose.isValidObjectId(orderId) ? orderId : null }, { orderId: orderId }] },
                    { status: 'assigned' },
                    { deliveryBoyId: riderId }
                ]
            },
            {
                $set: {
                    status: 'picked_up',
                    pickedUpAt: new Date()
                }
            },
            { new: true }
        );

        if (!order) throw new ApiError(404, 'Order not assigned to you or already picked up.');

        // Notify tracking room
        emitEvent(`order_${order.orderId}`, 'order_status_updated', { 
            orderId: order.orderId, 
            status: 'picked_up' 
        });

        // Push Notification to User
        createNotification({
            recipientId: order.userId,
            recipientType: 'user',
            title: 'Order Picked Up!',
            message: `Your order #${order.orderId} is on its way to you.`,
            type: 'order',
            data: { orderId: order.orderId, status: 'picked_up' }
        }).catch(err => console.error('Push Fix Error:', err));

        return order;
    },

    /**
     * Delivery Completion + OTP Verification
     */
    async riderComplete(orderId, riderId, otp, deliveryPhoto) {
        const { default: mongoose } = await import('mongoose');
        
        const orderCheck = await Order.findOne({
            $and: [
                { $or: [{ _id: mongoose.isValidObjectId(orderId) ? orderId : null }, { orderId: orderId }] },
                { status: { $in: ['picked_up', 'out_for_delivery'] } },
                { deliveryBoyId: riderId }
            ]
        }).select('+deliveryOtpHash +deliveryOtpDebug +deliveryOtpExpiry');

        if (!orderCheck) throw new ApiError(404, 'Order not assigned to you or already delivered.');

        const isMatch = await orderCheck.compareDeliveryOtp(otp);
        if (!isMatch) throw new ApiError(401, 'Invalid OTP. Please verify with customer.');

        const order = await Order.findOneAndUpdate(
            { _id: orderCheck._id },
            {
                $set: {
                    status: 'delivered',
                    deliveredAt: new Date(),
                    deliveryPhoto: deliveryPhoto,
                    'vendorItems.$[].status': 'delivered',
                    'vendorItems.$[].deliveredAt': new Date()
                }
            },
            { new: true }
        );

        emitEvent(`user_${order.userId}`, 'order_delivered', { orderId: order.orderId });
        
        // Notify tracking room
        emitEvent(`order_${order.orderId}`, 'order_status_updated', { 
            orderId: order.orderId, 
            status: 'delivered' 
        });

        // Push Notification to User
        createNotification({
            recipientId: order.userId,
            recipientType: 'user',
            title: 'Order Delivered!',
            message: `Enjoy your order #${order.orderId}! Don't forget to rate your experience.`,
            type: 'order',
            data: { orderId: order.orderId, status: 'delivered' }
        }).catch(err => console.error('Push Fix Error:', err));

        order.vendorItems.forEach(vi => {
            emitEvent(`vendor_${vi.vendorId}`, 'order_delivered', { orderId: order.orderId });
            
            // Push Notification to Vendor
            createNotification({
                recipientId: vi.vendorId,
                recipientType: 'vendor',
                title: 'Order Completed!',
                message: `Order #${order.orderId} has been successfully delivered and payment is processed.`,
                type: 'order',
                data: { orderId: order.orderId, status: 'delivered' }
            }).catch(err => console.error('Push Fix Error:', err));
        });

        return order;
    }
};
