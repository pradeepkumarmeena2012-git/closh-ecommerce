import mongoose from 'mongoose';
import Order from '../models/Order.model.js';
import DeliveryBoy from '../models/DeliveryBoy.model.js';
import DeliveryBatch from '../models/DeliveryBatch.model.js';
import { createNotification } from './notification.service.js';
import { emitEvent, isDeliveryBoyConnected } from './socket.service.js';
import { calculateDistance } from '../utils/geo.js';
import { OrderNotificationService } from './orderNotification.service.js';
import { QueueService } from './queue.service.js';

/**
 * Automagically assigns the nearest available delivery boy to a multi-vendor or single-vendor order
 * immediately after checkout/payment verification.
 * 
 * @param {String|mongoose.Types.ObjectId} orderId 
 * @returns {Promise<Boolean>} Success status of assignment
 */
export const autoAssignDeliveryBoy = async (orderId, excludeRiderIds = []) => {
    try {
        console.log(`[AutoAssignment] Starting smart assignment for order: ${orderId}. Excluding: ${excludeRiderIds}`);
        const order = await Order.findById(orderId).populate('vendorItems.vendorId');
        if (!order) {
            console.error(`[AutoAssignment] Order not found: ${orderId}`);
            return false;
        }

        // If already assigned, bypass auto-assignment to prevent overriding admin decisions
        if (order.deliveryBoyId && !excludeRiderIds.includes(order.deliveryBoyId.toString())) {
            console.log(`[AutoAssignment] Order ${order.orderId} already has delivery partner assigned: ${order.deliveryBoyId}`);
            return true;
        }

        // 1. Gather all vendor coordinates
        const vendorStopsRaw = [];
        for (const vi of order.vendorItems) {
            const vendor = vi.vendorId;
            if (vendor && vendor.shopLocation?.coordinates) {
                // Build a full address from vendor fields
                const fullAddress = vendor.shopAddress 
                    || [vendor.address?.street, vendor.address?.city, vendor.address?.state, vendor.address?.zipCode]
                        .filter(Boolean).join(', ') 
                    || '';
                vendorStopsRaw.push({
                    vendorId: vendor._id,
                    vendorName: vendor.storeName || vi.vendorName || 'Vendor',
                    shopLocation: vendor.shopLocation,
                    shopAddress: fullAddress,
                    vendorPhone: vendor.phone || '',
                    status: vi.status || 'pending'
                });
            }
        }

        if (vendorStopsRaw.length === 0) {
            console.warn(`[AutoAssignment] No valid vendor locations found for order ${order.orderId}. Cannot assign.`);
            return false;
        }

        // Define primary pickup location (coordinate center or first vendor)
        const firstVendorLocation = vendorStopsRaw[0].shopLocation.coordinates;
        order.pickupLocation = {
            type: 'Point',
            coordinates: firstVendorLocation
        };

        const combinedExclusions = [
            ...excludeRiderIds,
            ...(order.rejectedDeliveryBoys || []).map(id => id.toString())
        ];

        const excludeObjectIds = combinedExclusions.map(id => {
            try { return new mongoose.Types.ObjectId(id); } catch(e) { return null; }
        }).filter(Boolean);

        // 2. Query nearest available delivery boys (within 10km radius)
        let deliveryBoys = await DeliveryBoy.find({
            status: 'available',
            isAvailable: true,
            applicationStatus: 'approved',
            _id: { $nin: excludeObjectIds },
            currentLocation: {
                $near: {
                    $geometry: { type: 'Point', coordinates: firstVendorLocation },
                    $maxDistance: 10000 // 10 kilometers
                }
            }
        }).limit(15).lean();

        // 2.1 Strictly filter to ensure they are connected to the socket (latest reliable source)
        deliveryBoys = deliveryBoys.filter(boy => isDeliveryBoyConnected(boy._id.toString())).slice(0, 5);

        // Fallback: If no boys are found nearby, scan globally for any active available partner
        if (deliveryBoys.length === 0) {
            console.log(`[AutoAssignment] No available delivery partners within 10km. Searching globally...`);
            let globalBoys = await DeliveryBoy.find({
                status: 'available',
                isAvailable: true,
                applicationStatus: 'approved',
                _id: { $nin: excludeObjectIds }
            }).limit(15).lean();

            deliveryBoys = globalBoys.filter(boy => isDeliveryBoyConnected(boy._id.toString())).slice(0, 5);
        }

        if (deliveryBoys.length === 0) {
            console.warn(`[AutoAssignment] ❌ No available delivery partners found in the system for order ${order.orderId}. Waiting for manual intervention.`);
            order.deliveryBoyId = undefined;
            order.status = 'searching';
            await order.save();
            return false;
        }

        const chosenRider = deliveryBoys[0];
        console.log(`[AutoAssignment] Selected rider: ${chosenRider.name} (${chosenRider._id}) for order ${order.orderId}`);

        // 3. Optimize pickup route sequence from rider's current location
        const riderCoords = chosenRider.currentLocation?.coordinates || firstVendorLocation;

        const sortStopsNearestFirst = (stops, coords) => {
            if (!coords || coords.length < 2) return stops;
            return [...stops].sort((a, b) => {
                const distA = calculateDistance(coords, a.shopLocation?.coordinates || [0, 0]);
                const distB = calculateDistance(coords, b.shopLocation?.coordinates || [0, 0]);
                return distA - distB;
            });
        };

        const sortedStops = sortStopsNearestFirst(vendorStopsRaw, riderCoords);

        // Map stops to database schema format
        const vendorPickups = sortedStops.map((stop, idx) => {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            return {
                vendorId: stop.vendorId,
                vendorName: stop.vendorName,
                shopLocation: stop.shopLocation,
                shopAddress: stop.shopAddress,
                vendorPhone: stop.vendorPhone || '',
                sequence: idx,
                status: 'pending',
                handoverOtp: otp,
                handoverOtpHash: otp,
                handoverOtpDebug: otp,
                handoverOtpSentAt: new Date()
            };
        });

        // 4. Update the Order
        order.deliveryBoyId = chosenRider._id;
        order.status = 'assigned';
        order.isMultiVendor = order.vendorItems.length > 1;
        order.vendorPickups = vendorPickups;
        order.assignedAt = new Date();
        order.generateDeliveryOtp();
        await order.save();

        // 5. Update Delivery Boy status to busy
        await DeliveryBoy.findByIdAndUpdate(chosenRider._id, { status: 'busy' });

        // 6. Create DeliveryBatch for tracing stop-by-stop pickups
        const pickupStops = vendorPickups.map((stop) => ({
            vendorId: stop.vendorId,
            vendorName: stop.vendorName,
            shopAddress: stop.shopAddress,
            vendorPhone: stop.vendorPhone || '',
            location: stop.shopLocation,
            sequence: stop.sequence,
            status: 'pending',
            vendorReadinessStatus: stop.status, // Track vendor acceptance/preparing stage live
            otpVerified: false
        }));

        await DeliveryBatch.deleteMany({
            customerId: order.userId,
            status: { $in: ['assigned', 'picked_up', 'arrived', 'try_and_buy', 'payment_pending'] }
        });

        const batchId = `MVBATCH-${Date.now()}`;
        const newBatch = await DeliveryBatch.create({
            batchId,
            deliveryBoyId: chosenRider._id,
            customerId: order.userId || new mongoose.Types.ObjectId(), // Handle guests
            isMultiVendor: order.isMultiVendor,
            currentStopIndex: 0,
            pickupStops,
            customerLocation: order.dropoffLocation || { type: 'Point', coordinates: [0, 0] },
            customerAddress: order.shippingAddress,
            customerPhone: order.shippingAddress?.phone || order.guestInfo?.phone,
            customerName: order.shippingAddress?.name || order.guestInfo?.name || 'Customer',
            status: 'assigned'
        });

        console.log(`[AutoAssignment] Created DeliveryBatch ${batchId} for order ${order.orderId}`);

        // 7. Notify customer and delivery partner
        await OrderNotificationService.notifyOrderUpdate(order._id, 'assigned', {
            title: 'Delivery Partner Assigned',
            message: `Smart assignment: Rider ${chosenRider.name} has been assigned to your order.`
        });

        // Send socket alerts to rider
        const socketPayload = {
            orderId: order.orderId,
            id: order._id,
            batchId: newBatch.batchId,
            pickupLocation: order.pickupLocation,
            customer: order.shippingAddress?.name || order.guestInfo?.name || 'Customer',
            address: order.shippingAddress?.address || 'Address unavailable',
            total: order.total,
            paymentMethod: order.paymentMethod,
            orderType: order.orderType,
            isMultiVendor: order.isMultiVendor,
            vendorPickups: order.vendorPickups,
            type: 'auto_assigned_alert'
        };

        console.log(`📡 [Socket Emit] Notifying delivery_${chosenRider._id} about auto-assignment`);
        emitEvent(`delivery_${chosenRider._id.toString()}`, 'order_ready_for_pickup', socketPayload);
        emitEvent(`delivery_${chosenRider._id.toString()}`, 'auto_assigned_alert', socketPayload);

        await createNotification({
            recipientId: chosenRider._id.toString(),
            recipientType: 'delivery',
            title: 'New Order Auto-Assigned',
            message: `You have been automatically assigned to order #${order.orderId}. Please head towards the vendor cluster.`,
            type: 'order',
            data: {
                orderId: order.orderId,
                batchId: newBatch.batchId,
                type: 'auto_assigned_alert'
            }
        });

        // Clear other riders' caches
        emitEvent('delivery_partners', 'order_taken', {
            orderId: order.orderId,
            id: order._id
        });

        // Notify Admin Panel about live assignment
        emitEvent('admin', 'admin_order_assigned', {
            orderId: order.orderId,
            deliveryBoyId: chosenRider._id,
            assignedAt: order.assignedAt
        });

        // 7. Schedule 60-Second Timeout for Acceptance
        QueueService.scheduleRiderAutoAssignTimeout(order._id, chosenRider._id, 60 * 1000);

        return true;
    } catch (error) {
        console.error(`[AutoAssignment] ❌ Error assigning delivery boy:`, error);
        return false;
    }
};
