import { Queue, Worker } from 'bullmq';
import redisConnection from '../config/redis.js';
import Order from '../models/Order.model.js';
import { DeliveryNearbyService } from './nearbyDelivery.service.js';
import { createNotification } from './notification.service.js';
import { emitEvent } from './socket.service.js';

/**
 * BullMQ Job Queue Service
 * Handles Timeouts and Radius Expansion
 */

// 1. Order Wait Queue (Vendor Acceptance)
const orderWaitQueue = new Queue('order-wait-queue', { connection: redisConnection });

// 2. Rider Search Queue (Radius Expansion)
const riderSearchQueue = new Queue('rider-search-queue', { connection: redisConnection });

// 3. Rider Acceptance Timeout Queue (Auto-cancel if no rider accepts within 15 min)
const riderAcceptQueue = new Queue('rider-accept-queue', { connection: redisConnection });

export const QueueService = {

    /**
     * Start Vendor Acceptance Timer
     * @param {Object} orderId - Order document _id
     */
    async scheduleVendorTimeout(orderId, delayMs = 5 * 60 * 1000) {
        await orderWaitQueue.add('check-vendor-accept', { orderId }, { delay: delayMs });
        console.log(`[Queue] Scheduled vendor timeout for ${orderId} in ${delayMs/1000}s`);
    },

    /**
     * Start Rider Acceptance Timer (15 minutes)
     * If no delivery boy accepts the order within 15 min, auto-cancel and notify vendor.
     * @param {Object} orderId - Order document _id
     */
    async scheduleRiderAcceptTimeout(orderId, delayMs = 15 * 60 * 1000) {
        await riderAcceptQueue.add('check-rider-accept', { orderId }, { delay: delayMs });
        console.log(`[Queue] Scheduled rider acceptance timeout for ${orderId} in ${delayMs/1000}s`);
    },

    /**
     * Start/Repeat Rider Proximity Search
     * @param {Object} orderId - Order document _id
     * @param {Number} radius - radius in km
     */
    async scheduleRiderSearch(orderId, radius = 5, attempt = 1) {
        // Max 3 attempts or 15km
        if (attempt > 3) {
            console.log(`[Queue] Max search attempts reached for order ${orderId}. Notifying Admin...`);
            // Job done, notify admin
            return;
        }

        await riderSearchQueue.add('search-nearby-riders', 
            { orderId, radius, attempt }, 
            { 
               // Recursive delay: 5km (now), 10km (in 2m), 15km (in 4m)
               delay: attempt === 1 ? 0 : 2 * 60 * 1000 
            }
        );
    }
};

/**
 * Worker Logic: Order Wait Check
 */
new Worker('order-wait-queue', async job => {
    const { orderId } = job.data;
    const order = await Order.findById(orderId);

    if (!order) return;

    if (order.status === 'pending') {
        console.log(`[Worker] Vendor timeout reached for order ${order.orderId}. Auto-cancelling.`);
        
        // Atomic status check-and-update to 'cancelled'
        const updated = await Order.findOneAndUpdate(
            { _id: orderId, status: 'pending' },
            { 
                $set: { 
                    status: 'cancelled', 
                    cancellationReason: 'Vendor unresponsive timeout' 
                } 
            },
            { new: true }
        );

        if (updated) {
            // Notify Customer
            emitEvent(`user_${order.userId}`, 'order_cancelled', { 
                orderId: order.orderId, 
                reason: 'No response from vendor within 5 minutes.'
            });
            
            await createNotification({
                recipientId: order.userId,
                recipientType: 'user',
                title: 'Order Cancelled (Timeout)',
                message: 'No vendor accepted your order within the time limit. Refund initiated if applicable.',
                type: 'order'
            });
        }
    }
}, { connection: redisConnection });

/**
 * Worker Logic: Rider Search Loop
 */
new Worker('rider-search-queue', async job => {
    const { orderId, radius, attempt } = job.data;
    const order = await Order.findById(orderId);

    if (!order || order.status !== 'searching') return;

    console.log(`[Worker] Attempting rider search (Attempt ${attempt}, Radius ${radius}km) for order ${order.orderId}`);

    const notifiedCount = await DeliveryNearbyService.broadcastToRiders(order, radius);

    // If no one was notified OR we expect a repeat, schedule next attempt with larger radius
    if (order.status === 'searching') {
        await QueueService.scheduleRiderSearch(orderId, radius + 5, attempt + 1);
    }
}, { connection: redisConnection });

/**
 * Worker Logic: Rider Acceptance Timeout Check (15 minutes)
 * If order is still in 'searching' status (no delivery boy accepted), auto-cancel and notify vendor.
 */
new Worker('rider-accept-queue', async job => {
    const { orderId } = job.data;
    const order = await Order.findById(orderId).populate('vendorItems.vendorId', '_id name storeName');

    if (!order) return;

    // Only cancel if still searching (no rider claimed it)
    if (order.status === 'searching' || order.status === 'ready_for_pickup') {
        console.log(`[Worker] Rider acceptance timeout (15 min) for order ${order.orderId}. Auto-cancelling.`);

        const updated = await Order.findOneAndUpdate(
            { _id: orderId, status: { $in: ['searching', 'ready_for_pickup'] } },
            {
                $set: {
                    status: 'cancelled',
                    cancellationReason: 'No delivery partner available within 15 minutes'
                }
            },
            { new: true }
        );

        if (updated) {
            // Notify Customer
            emitEvent(`user_${order.userId}`, 'order_cancelled', {
                orderId: order.orderId,
                reason: 'No delivery partner available to accept your order within 15 minutes.'
            });

            await createNotification({
                recipientId: order.userId,
                recipientType: 'user',
                title: 'Order Cancelled',
                message: `Order #${order.orderId} has been cancelled. No delivery partner was available. Refund initiated if applicable.`,
                type: 'order',
                data: { orderId: order.orderId, status: 'cancelled' }
            }).catch(err => console.error('[RiderTimeout] User notification error:', err));

            // Notify each Vendor that no delivery boy was available
            const notifiedVendors = new Set();
            for (const vi of (order.vendorItems || [])) {
                const vendorId = vi.vendorId?._id || vi.vendorId;
                if (!vendorId || notifiedVendors.has(String(vendorId))) continue;
                notifiedVendors.add(String(vendorId));

                emitEvent(`vendor_${vendorId}`, 'order_cancelled_no_rider', {
                    orderId: order.orderId,
                    reason: 'No delivery partner available within 15 minutes.'
                });

                await createNotification({
                    recipientId: vendorId,
                    recipientType: 'vendor',
                    title: 'Order Cancelled - No Rider',
                    message: `Order #${order.orderId} was cancelled because no delivery partner accepted it within 15 minutes.`,
                    type: 'order',
                    data: { orderId: order.orderId, status: 'cancelled' }
                }).catch(err => console.error('[RiderTimeout] Vendor notification error:', err));
            }

            // Notify tracking room
            emitEvent(`order_${order.orderId}`, 'order_status_updated', {
                orderId: order.orderId,
                status: 'cancelled'
            });
        }
    }
}, { connection: redisConnection });

console.log('✅ Queue Workers Initialized');
