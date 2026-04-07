import { createNotification } from './notification.service.js';
import { emitEvent } from './socket.service.js';
import Order from '../models/Order.model.js';
import { triggerDeliveryAssignment } from './deliveryAssignment.service.js';

/**
 * Unified service to notify all parties involved in an order (Customer, Vendors, Rider)
 */
export const OrderNotificationService = {
    /**
     * Notify all relevant parties about an order status update
     * @param {string} orderId - The Order ID or Mongo ID
     * @param {string} status - New status
     * @param {Object} options - { title, message, data, excludeRecipientId }
     */
    notifyOrderUpdate: async (orderId, status, options = {}) => {
        try {
            const order = await Order.findById(orderId)
                .populate('vendorItems.vendorId')
                .populate('deliveryBoyId', 'name');

            if (!order) {
                console.error(`❌ [NOTIFICATION ERROR] Order NOT found: ${orderId}. If inside transaction, this is a visibility bug.`);
                return;
            }

            console.log(`\n--- 🔔 [ORDER NOTIFICATION] ---`);
            console.log(`Order: ${order.orderId} (${order._id})`);
            console.log(`Status Update: ${status}`);

            const { title, message, data = {} } = options;
            const notificationTitle = title || `Order Update: ${status.replace(/_/g, ' ')}`;
            const notificationMessage = message || `Your order ${order.orderId} is now ${status.replace(/_/g, ' ')}.`;

            const recipients = [];

            // 1. Customer
            if (order.userId) {
                console.log(`👤 [NOTIFY USER] UserID: ${order.userId}`);
                recipients.push({
                    id: order.userId,
                    type: 'user',
                    title: notificationTitle,
                    message: notificationMessage
                });
                
                // Real-time status update for customer
                const userRoom = `user_${order.userId}`;
                console.log(`📡 [SOCKET EMIT] Room: ${userRoom}, Event: order_status_updated`);
                emitEvent(userRoom, 'order_status_updated', {
                    orderId: order.orderId,
                    status,
                    message: notificationMessage
                });
            }

            // 2. Vendors
            const vendorIds = [...new Set(order.vendorItems.map(vi => String(vi.vendorId?._id || vi.vendorId)))];
            console.log(`🏪 [NOTIFY VENDORS] Found ${vendorIds.length} vendors: ${vendorIds.join(', ')}`);
            
            vendorIds.forEach(vId => {
                let vendorMsg = `Status update for order ${order.orderId}: ${status.replace(/_/g, ' ')}`;
                if (status === 'assigned' && order.deliveryBoyId?.name) {
                    vendorMsg = `Delivery Partner ${order.deliveryBoyId.name} has been assigned for order ${order.orderId}`;
                }

                recipients.push({
                    id: vId,
                    type: 'vendor',
                    title: notificationTitle,
                    message: vendorMsg,
                    sound: status === 'pending' ? 'buzzer.mp3' : 'default' // Buzzer sound only for new orders
                });

                // Real-time event for Vendor Dashboard (especially for buzzer/popup)
                const vendorRoom = `vendor_${vId}`;
                if (status === 'pending') {
                    console.log(`📡 [SOCKET EMIT] Room: ${vendorRoom}, Event: order_created (New Order Alert)`);
                    emitEvent(vendorRoom, 'order_created', {
                        ...order.toObject(),
                        id: order._id, // compatibility
                        message: `New Order #${order.orderId} received!`
                    });
                } else {
                    console.log(`📡 [SOCKET EMIT] Room: ${vendorRoom}, Event: order_status_updated`);
                    emitEvent(vendorRoom, 'order_status_updated', {
                        orderId: order.orderId,
                        status,
                        message: notificationMessage
                    });
                }
            });

            // 3. Delivery Partner
            if (order.deliveryBoyId) {
                console.log(`🚴 [NOTIFY DELIVERY] RiderID: ${order.deliveryBoyId}`);
                recipients.push({
                    id: order.deliveryBoyId,
                    type: 'delivery',
                    title: notificationTitle,
                    message: notificationMessage,
                    sound: status === 'ready_for_pickup' || status === 'searching' ? 'buzzer.mp3' : 'default' // Buzzer sound only for new jobs
                });

                // Real-time status update for assigned delivery boy
                const deliveryRoom = `delivery_${order.deliveryBoyId}`;
                console.log(`📡 [SOCKET EMIT] Room: ${deliveryRoom}, Event: order_status_updated`);
                emitEvent(deliveryRoom, 'order_status_updated', {
                    orderId: order.orderId,
                    status,
                    message: notificationMessage
                });

                // If specialized status (e.g. searching/pending), also emit specialized event if frontend expects it
                if (status === 'ready_for_pickup' || status === 'pending' || status === 'searching') {
                    console.log(`📡 [SOCKET EMIT] Room: ${deliveryRoom}, Event: order_ready_for_pickup`);
                    emitEvent(deliveryRoom, 'order_ready_for_pickup', {
                        orderId: order.orderId,
                        id: order.orderId,
                        pickupLocation: order.pickupLocation,
                        customer: order.shippingAddress?.name,
                        address: order.shippingAddress?.address,
                        total: order.total
                    });
                }
            }

            // Execute notifications (DB persistence + Push)
            console.log(`💾 [DB PERSIST] Creating ${recipients.length} notification records...`);
            const tasks = recipients
                .filter(r => String(r.id) !== String(options.excludeRecipientId))
                .map(r => createNotification({
                    recipientId: r.id,
                    recipientType: r.type,
                    title: r.title,
                    message: r.message,
                    type: 'order',
                    data: { ...data, orderId: order.orderId, status },
                    sound: r.sound || 'default'
                }));

            // Generic Order Tracking Room Broadcast (Both Human ID and Mongo ID)
            const trackingRooms = [`order_${order.orderId}`, `order_${order._id}`];
            trackingRooms.forEach(room => {
                console.log(`📡 [SOCKET EMIT] Room: ${room}, Event: order_status_updated`);
                emitEvent(room, 'order_status_updated', {
                    orderId: order.orderId,
                    status,
                    message: notificationMessage
                });
            });
            
            // 4. Trigger Delivery Assignment if Ready and NO one is assigned yet
            if ((status === 'ready_for_pickup' || status === 'searching') && !order.deliveryBoyId) {
                console.log(`📡 [AUTO-ASSIGN] Triggering delivery search for order: ${order.orderId}`);
                triggerDeliveryAssignment(order).catch(err => 
                    console.error(`[AutoAssign] Error triggering search: ${err.message}`)
                );
            }

            await Promise.allSettled(tasks);
            console.log(`--- ✅ [NOTIFICATION COMPLETE] ---\n`);
        } catch (error) {
            console.error('OrderNotificationService Error:', error.message);
        }
    }

};

export default OrderNotificationService;
