import { createNotification } from './notification.service.js';
import { emitEvent } from './socket.service.js';
import Order from '../models/Order.model.js';

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
            const order = await Order.findById(orderId).populate('vendorItems.vendorId');
            if (!order) return;

            const { title, message, data = {} } = options;
            const notificationTitle = title || `Order Update: ${status.replace(/_/g, ' ')}`;
            const notificationMessage = message || `Your order ${order.orderId} is now ${status.replace(/_/g, ' ')}.`;

            const recipients = [];

            // 1. Customer
            if (order.userId) {
                recipients.push({
                    id: order.userId,
                    type: 'user',
                    title: notificationTitle,
                    message: notificationMessage
                });
                
                // Real-time status update for customer
                emitEvent(`user_${order.userId}`, 'order_status_updated', {
                    orderId: order.orderId,
                    status,
                    message: notificationMessage
                });
            }

            // 2. Vendors
            const vendorIds = [...new Set(order.vendorItems.map(vi => String(vi.vendorId?._id || vi.vendorId)))];
            vendorIds.forEach(vId => {
                recipients.push({
                    id: vId,
                    type: 'vendor',
                    title: notificationTitle,
                    message: `Status update for order ${order.orderId}: ${status.replace(/_/g, ' ')}`,
                    sound: status === 'pending' ? 'mgs_codec.mp3' : 'default' // Buzzer sound only for new orders
                });

                // Real-time event for Vendor Dashboard (especially for buzzer/popup)
                if (status === 'pending') {
                    emitEvent(`vendor_${vId}`, 'order_created', {
                        ...order.toObject(),
                        id: order._id, // compatibility
                        message: `New Order #${order.orderId} received!`
                    });
                } else {
                    emitEvent(`vendor_${vId}`, 'order_status_updated', {
                        orderId: order.orderId,
                        status,
                        message: notificationMessage
                    });
                }
            });

            // 3. Delivery Partner
            if (order.deliveryBoyId) {
                recipients.push({
                    id: order.deliveryBoyId,
                    type: 'delivery',
                    title: notificationTitle,
                    message: notificationMessage,
                    sound: status === 'ready_for_pickup' || status === 'searching' ? 'mgs_codec.mp3' : 'default' // Buzzer sound only for new jobs
                });

                // Real-time status update for assigned delivery boy
                emitEvent(`delivery_${order.deliveryBoyId}`, 'order_status_updated', {
                    orderId: order.orderId,
                    status,
                    message: notificationMessage
                });

                // If specialized status (e.g. searching/pending), also emit specialized event if frontend expects it
                if (status === 'ready_for_pickup' || status === 'pending' || status === 'searching') {
                    emitEvent(`delivery_${order.deliveryBoyId}`, 'order_ready_for_pickup', {
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

            // Generic Order Tracking Room Broadcast
            const trackingRoom = `order_${order.orderId}`;
            emitEvent(trackingRoom, 'order_status_updated', {
                orderId: order.orderId,
                status,
                message: notificationMessage
            });

            await Promise.allSettled(tasks);
        } catch (error) {
            console.error('OrderNotificationService Error:', error.message);
        }
    }

};

export default OrderNotificationService;
