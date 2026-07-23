import DeliveryBoy from '../models/DeliveryBoy.model.js';
import Order from '../models/Order.model.js';
import ServiceArea from '../models/ServiceArea.model.js';
import { emitEvent } from './socket.service.js';
import { createNotification } from './notification.service.js';

export const DeliveryNearbyService = {

    /**
     * Find Nearby Available Riders
     * @param {Object} order - Order document
     * @param {Number} radiusKm - Search radius in kilometers
     */
    async broadcastToRiders(order, radiusKm = 5) {
        // 1. Get pickup location (assuming single-vendor or first vendor)
        const pickupCoords = order.pickupLocation?.coordinates || [0, 0];
        
        // 2. Query riders
        // 2.1 First find if pickup location is inside a ServiceArea
        const activeServiceArea = await ServiceArea.findOne({
            isActive: true,
            boundaries: {
                $geoIntersects: {
                    $geometry: {
                        type: 'Point',
                        coordinates: pickupCoords
                    }
                }
            }
        });

        let riders = [];
        
        if (activeServiceArea && activeServiceArea.boundaries && activeServiceArea.boundaries.coordinates && activeServiceArea.boundaries.coordinates.length > 0) {
            console.log(`[Nearby] Broadcasting strictly inside ServiceArea: ${activeServiceArea.name}`);
            riders = await DeliveryBoy.find({
                status: 'available',
                isActive: true,
                currentLocation: {
                    $geoWithin: {
                        $geometry: activeServiceArea.boundaries
                    }
                }
            }).limit(20);
        } else {
            console.log(`[Nearby] No strict boundary found. Broadcasting in ${radiusKm}km radius.`);
            riders = await DeliveryBoy.find({
                status: 'available',
                isActive: true,
                currentLocation: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: pickupCoords
                        },
                        $maxDistance: radiusKm * 1000 // meters
                    }
                }
            }).limit(20); // Push to first 20 nearby riders
        }

        if (riders.length === 0) {
            console.log(`[Nearby] No available riders in ${radiusKm}km radius for order ${order.orderId}`);
            return 0; // No riders found
        }

        // 3. Multi-channel broadcast (Socket + Push)
        const riderIds = riders.map(r => r._id);
        
        // Emitting individually for precision
        riders.forEach(rider => {
            emitEvent(`delivery_${rider._id}`, 'new_available_job', {
                orderId: order.orderId,
                total: order.total,
                pickupName: order.shippingAddress.name || 'Vendor', 
                distance: radiusKm, // approx
                deliveryEarnings: order.deliveryEarnings || 0
            });
        });

        // Bulk notifications for background
        await Promise.all(riders.map(rider => 
            createNotification({
                recipientId: rider._id,
                recipientType: 'delivery',
                title: 'New Available Order Nearby',
                message: `An order #${order.orderId} is ready for pickup in your area!`,
                type: 'order',
                data: { orderId: order.orderId, sound: 'new_order' }
            })
        ));

        console.log(`[Nearby] Notified ${riders.length} riders in ${radiusKm}km radius for order ${order.orderId}`);
        return riders.length;
    }
};
