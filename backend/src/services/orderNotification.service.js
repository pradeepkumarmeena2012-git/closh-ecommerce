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
                console.error(`❌ [NOTIFICATION ERROR] Order NOT found: ${orderId}`);
                return;
            }

            const { data = {} } = options;
            const recipients = [];

            // Helper to get role-specific message
            const getMessageForRole = (role, status, orderId, riderName) => {
                const s = status.toLowerCase();
                const id = `#${orderId}`;
                
                const messages = {
                    user: {
                        pending: `Your order ${id} has been placed successfully.`,
                        accepted: `Your order ${id} is being prepared.`,
                        ready_for_pickup: `Order ${id} is ready and we're finding a delivery partner.`,
                        searching: `Finding a delivery partner for your order ${id}.`,
                        assigned: `${riderName || 'A rider'} is arriving to pick up your order ${id}.`,
                        picked_up: `Your order ${id} is on the way!`,
                        out_for_delivery: `Your order ${id} is out for delivery.`,
                        delivered: `Enjoy your order ${id}! It has been delivered.`,
                        cancelled: `Your order ${id} has been cancelled.`,
                        default: `Your order ${id} status updated to ${s.replace(/_/g, ' ')}.`
                    },
                    vendor: {
                        pending: `New Order ${id} received! Please accept to start preparation.`,
                        accepted: `You have accepted Order ${id}.`,
                        ready_for_pickup: `Order ${id} is marked as ready for pickup.`,
                        searching: `Searching for a rider for Order ${id}.`,
                        assigned: `${riderName || 'A partner'} has been assigned to pick up Order ${id}.`,
                        picked_up: `Order ${id} has been picked up from your store.`,
                        delivered: `Order ${id} has been delivered successfully.`,
                        cancelled: `Order ${id} was cancelled.`,
                        default: `Order ${id} is now ${s.replace(/_/g, ' ')}.`
                    },
                    delivery: {
                        ready_for_pickup: `New job available: Order ${id} is ready for pickup.`,
                        searching: `New job available nearby: Order ${id}.`,
                        assigned: `You have been assigned to Order ${id}.`,
                        picked_up: `Order ${id} picked up. Head to customer location.`,
                        delivered: `Mission complete! Order ${id} delivered.`,
                        cancelled: `Order ${id} mission was cancelled.`,
                        default: `Order ${id} status: ${s.replace(/_/g, ' ')}.`
                    }
                };

                return (messages[role]?.[s] || messages[role]?.default || `Order ${id} updated to ${s}`).replace(/_/g, ' ');
            };

            // 1. Customer
            if (order.userId) {
                const msg = getMessageForRole('user', status, order.orderId, order.deliveryBoyId?.name);
                recipients.push({ id: order.userId, type: 'user', title: 'Order Update', message: msg });
                
                // Real-time specialized events (Keep these for UI transitions, but avoid dual toasts)
                if (status === 'assigned') emitEvent(`user_${order.userId}`, 'rider_assigned', { orderId: order.orderId, riderName: order.deliveryBoyId?.name });
                if (status === 'delivered') emitEvent(`user_${order.userId}`, 'order_delivered', { orderId: order.orderId });
            }

            // 2. Vendors
            const vendorIds = [...new Set(order.vendorItems.map(vi => String(vi.vendorId?._id || vi.vendorId)))];
            vendorIds.forEach(vId => {
                const msg = getMessageForRole('vendor', status, order.orderId, order.deliveryBoyId?.name);
                recipients.push({ 
                    id: vId, 
                    type: 'vendor', 
                    title: status === 'pending' ? '🚀 New Order!' : 'Order Update', 
                    message: msg,
                    sound: status === 'pending' ? 'buzzer.mp3' : 'default'
                });

                // Socket event for dashboard refresh / buzzer
                if (status === 'pending') {
                    emitEvent(`vendor_${vId}`, 'order_created', { ...order.toObject(), message: msg });
                }
            });

            // 3. Delivery Partner
            if (order.deliveryBoyId) {
                const msg = getMessageForRole('delivery', status, order.orderId);
                recipients.push({ 
                    id: order.deliveryBoyId, 
                    type: 'delivery', 
                    title: 'Mission Update', 
                    message: msg,
                    sound: (status === 'ready_for_pickup' || status === 'searching') ? 'buzzer.mp3' : 'default'
                });
            }

            // Execute notifications (DB persistence + Push via createNotification)
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

            // Auto-trigger assignment search
            if ((status === 'ready_for_pickup' || status === 'searching') && !order.deliveryBoyId) {
                triggerDeliveryAssignment(order).catch(err => console.error(`[AutoAssign] Error: ${err.message}`));
            }

            await Promise.allSettled(tasks);
        } catch (error) {
            console.error('OrderNotificationService Error:', error.message);
        }
    }
};

export default OrderNotificationService;
