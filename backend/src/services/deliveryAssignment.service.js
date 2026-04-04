import mongoose from 'mongoose';
import DeliveryBoy from '../models/DeliveryBoy.model.js';
import { createNotification } from './notification.service.js';
import { emitEvent } from './socket.service.js';

/**
 * Find nearby delivery boys for an order
 */
export const findNearbyDeliveryBoys = async (order, radiusMeters = 8000) => {
    const pickupLocation = order.pickupLocation;
    
    if (!pickupLocation || !pickupLocation.coordinates || (pickupLocation.coordinates[0] === 0 && pickupLocation.coordinates[1] === 0)) {
        console.warn(`[Radius Search] ⚠️ Invalid pickup coordinates:`, pickupLocation?.coordinates);
        return [];
    }

    // Total available in entire DB
    const totalAvailable = await DeliveryBoy.countDocuments({ status: 'available', isAvailable: true });
    console.log(`[Radius Search] Searching within ${radiusMeters}m of ${pickupLocation.coordinates.join(', ')}`);
    console.log(`[Radius Search] Total 'available' partners in system: ${totalAvailable}`);

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
                    isAvailable: true
                },
                spherical: true,
            },
        },
        { $limit: 15 },
    ]);

    if (nearbyBoys.length > 0) {
        console.log(`\n✅ [RADIUS MATCH] Found ${nearbyBoys.length} nearby partners:`);
        nearbyBoys.forEach((boy, i) => {
            console.log(`   ${i+1}. ${boy.name.padEnd(20)} | ID: ${boy._id} | Dist: ${Math.round(boy.distance)}m`);
        });
    } else {
        console.log(`\n❌ [RADIUS MATCH] No available partners found within ${radiusMeters}m.`);
        if (totalAvailable > 0) {
             const closest = await DeliveryBoy.aggregate([
                { $geoNear: { near: { type: 'Point', coordinates: pickupLocation.coordinates }, distanceField: 'distance', query: { status: 'available', isAvailable: true }, spherical: true } },
                { $limit: 1 }
            ]);
            if (closest[0]) console.log(`[Radius Search] FYI: Closest available partner is ${Math.round(closest[0].distance/1000)}km away.`);
        }
    }

    return nearbyBoys;
};

/**
 * Global Assignment Logic: Triggers whenever an order is ready for pickup
 */
export const triggerDeliveryAssignment = async (order) => {
    try {
        console.log(`\n--- 🔍 [NEW ASSIGNMENT TRIGGER] ---`);
        console.log(`Order: ${order.orderId} | Type: ${order.orderType}`);
        
        // Populate vendor if needed
        if (order.populated && !order.populated('vendorItems.vendorId')) {
            await order.populate('vendorItems.vendorId', 'storeName shopAddress shopLocation address');
        }

        const nearbyBoys = await findNearbyDeliveryBoys(order);
        
        // Prepare Payload
        const firstVendor = order.vendorItems?.[0] || {};
        const vData = firstVendor.vendorId || {};
        const vendorName = vData.storeName || firstVendor.vendorName || 'Vendor';
        const vendorAddress = vData.shopAddress || (vData.address?.street ? `${vData.address.street}, ${vData.address.city}` : 'Vendor Address');

        const socketPayload = {
            orderId: order.orderId,
            id: order._id,
            pickupLocation: order.pickupLocation,
            customer: order.shippingAddress?.name || 'Customer',
            address: order.shippingAddress?.address || 'Address unavailable',
            vendorName,
            vendorAddress,
            total: order.total,
            deliveryFee: order.deliveryEarnings || 25,
            isTryAndBuy: order.orderType === 'try_and_buy' || order.orderType === 'check_and_buy',
            type: 'new_assignment_broadcast'
        };

        if (nearbyBoys.length > 0) {
            console.log(`📡 [SOCKET] Sending targeted broadcast to ${nearbyBoys.length} nearby partners.`);
            nearbyBoys.forEach(boy => {
                emitEvent(`delivery_${boy._id}`, 'order_ready_for_pickup', socketPayload);
                
                createNotification({
                    recipientId: boy._id,
                    recipientType: 'delivery',
                    title: 'New Order Nearby',
                    message: `A new order #${order.orderId} is available for pickup near you.`,
                    type: 'order',
                    data: { orderId: order.orderId, type: 'new_assignment_broadcast' }
                }).catch(() => {});
            });
        } else {
            console.log(`⚠️ [SOCKET] No nearby partners. Broadcasting to global room 'delivery_partners'.`);
            emitEvent('delivery_partners', 'order_ready_for_pickup', socketPayload);
        }
        
    } catch (err) {
        console.error('❌ [Assignment Trigger Error]', err.message);
    }
};
