import asyncHandler from '../../../utils/asyncHandler.js';
import Order from '../../../models/Order.model.js';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import { calculateDistance, getDeliveryEarning } from '../../../utils/geo.js';
import { emitEvent } from '../../../services/socket.service.js';

/**
 * @desc    Update delivery boy location and calculate distance/earnings
 * @route   POST /api/delivery/tracking/update-location
 * @access  Private (Delivery Boy)
 */
export const updateLocationWithTracking = asyncHandler(async (req, res) => {
    const { lat, lng, orderId, accuracy } = req.body;
    const deliveryBoyId = req.user.id;

    if (!lat || !lng) {
        return res.status(400).json({ message: 'Location coordinates required' });
    }

    // Update delivery boy's current location
    const deliveryBoy = await DeliveryBoy.findByIdAndUpdate(
        deliveryBoyId,
        {
            'currentLocation.coordinates': [lng, lat],
            'currentLocation.type': 'Point'
        },
        { new: true }
    );

    if (!deliveryBoy) {
        return res.status(404).json({ message: 'Delivery partner not found' });
    }

    let distanceTraveled = 0;
    let earnings = 0;
    let order = null;

    // If tracking an order, calculate distance and earnings
    if (orderId) {
        order = await Order.findById(orderId);
        
        if (order && order.deliveryBoyId?.toString() === deliveryBoyId) {
            // Initialize tracking data if not present
            if (!order.deliveryTracking) {
                order.deliveryTracking = {
                    startLocation: { coordinates: [lng, lat] },
                    path: [[lng, lat]],
                    totalDistance: 0,
                    lastUpdate: new Date()
                };
            } else {
                // Calculate distance from last position
                const lastPos = order.deliveryTracking.path[order.deliveryTracking.path.length - 1];
                if (lastPos) {
                    const distance = calculateDistance(lastPos, [lng, lat]);
                    
                    // Only add if moved at least 10 meters (0.01 km)
                    if (distance >= 0.01) {
                        order.deliveryTracking.totalDistance += distance;
                        order.deliveryTracking.path.push([lng, lat]);
                        order.deliveryTracking.lastUpdate = new Date();
                    }
                }
            }

            distanceTraveled = order.deliveryTracking.totalDistance;
            earnings = getDeliveryEarning(distanceTraveled);
            
            // Update order earnings
            order.deliveryEarnings = earnings;
            
            await order.save();
        }
    }

    // --- Broadcast Live Update ---
    // Emit to order room for customer tracking
    if (orderId) {
        emitEvent(`order_${orderId}`, 'location_updated', {
            lat,
            lng,
            deliveryBoyId,
            orderId,
            timestamp: Date.now()
        });
    }

    // Emit to admin room
    emitEvent('admin_tracking', 'delivery_boy_moved', {
        lat,
        lng,
        deliveryBoyId,
        timestamp: Date.now()
    });

    res.json({
        success: true,
        location: { lat, lng },
        distanceTraveled,
        earnings,
        message: 'Location updated successfully'
    });
});

/**
 * @desc    Get current tracking stats for an order
 * @route   GET /api/delivery/tracking/stats/:orderId
 * @access  Private (Delivery Boy)
 */
export const getTrackingStats = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const deliveryBoyId = req.user.id;

    const order = await Order.findOne({
        _id: orderId,
        deliveryBoyId: deliveryBoyId
    });

    if (!order) {
        return res.status(404).json({ message: 'Order not found' });
    }

    const distanceTraveled = order.deliveryTracking?.totalDistance || 0;
    const earnings = getDeliveryEarning(distanceTraveled);
    const path = order.deliveryTracking?.path || [];

    res.json({
        success: true,
        orderId,
        distanceTraveled,
        earnings,
        path,
        checkpoints: path.length,
        startedAt: order.deliveryTracking?.startLocation || null,
        lastUpdate: order.deliveryTracking?.lastUpdate || null
    });
});

/**
 * @desc    Get delivery boy's total stats
 * @route   GET /api/delivery/tracking/my-stats
 * @access  Private (Delivery Boy)
 */
export const getMyTrackingStats = asyncHandler(async (req, res) => {
    const deliveryBoyId = req.user.id;

    // Get all completed deliveries
    const completedOrders = await Order.find({
        deliveryBoyId: deliveryBoyId,
        status: 'delivered'
    }).select('deliveryTracking deliveryEarnings createdAt');

    const totalDistance = completedOrders.reduce(
        (sum, order) => sum + (order.deliveryTracking?.totalDistance || 0),
        0
    );

    const totalEarnings = completedOrders.reduce(
        (sum, order) => sum + (order.deliveryEarnings || 0),
        0
    );

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = completedOrders.filter(
        order => new Date(order.createdAt) >= today
    );

    const todayDistance = todayOrders.reduce(
        (sum, order) => sum + (order.deliveryTracking?.totalDistance || 0),
        0
    );

    const todayEarnings = todayOrders.reduce(
        (sum, order) => sum + (order.deliveryEarnings || 0),
        0
    );

    res.json({
        success: true,
        overall: {
            totalDeliveries: completedOrders.length,
            totalDistance: totalDistance.toFixed(2),
            totalEarnings
        },
        today: {
            deliveries: todayOrders.length,
            distance: todayDistance.toFixed(2),
            earnings: todayEarnings
        }
    });
});

export default {
    updateLocationWithTracking,
    getTrackingStats,
    getMyTrackingStats
};
