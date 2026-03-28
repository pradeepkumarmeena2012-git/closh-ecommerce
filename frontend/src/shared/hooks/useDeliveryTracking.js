import { useState, useEffect, useRef } from 'react';
import socketService from '../utils/socket';
import { useDeliveryAuthStore } from '../../modules/Delivery/store/deliveryStore';

const UPDATE_INTERVAL = 10000; // 10 seconds (Throttling)
const MIN_DISTANCE_METERS = 20; // Ignore small movements
const MAX_ACCURACY_METERS = 50; // Ignore low accuracy updates

// Helper to calculate distance between two coordinates in meters
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

export const useDeliveryTracking = (deliveryBoyId, activeOrders = []) => {
    const [currentLocation, setCurrentLocation] = useState(null);
    const lastSentLocation = useRef(null);
    const lastSentTime = useRef(0);
    const watchId = useRef(null);

    // Track which orders we are currently sharing location for
    const trackingOrders = activeOrders.filter(o => 
        ['picked_up', 'out_for_delivery', 'picked-up', 'out-for-delivery'].includes(o.status?.toLowerCase())
    );

    useEffect(() => {
        if (!deliveryBoyId) {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
            return;
        }

        const isOnline = useDeliveryAuthStore.getState().deliveryBoy?.status === 'available';
        console.log(`📡 Starting location tracking (Active Orders: ${trackingOrders.length}, Online: ${isOnline})`);

        // Connect socket if not connected
        socketService.connect();

        const handleSubmits = (lat, lng, accuracy) => {
            const now = Date.now();
            const isOnline = useDeliveryAuthStore.getState().deliveryBoy?.status === 'available';

            // 1. Throttling Check
            if (now - lastSentTime.current < UPDATE_INTERVAL) return;

            // 2. Accuracy Check
            if (accuracy > MAX_ACCURACY_METERS) {
                console.warn(`[Tracking] Ignoring low accuracy update: ${accuracy}m`);
                return;
            }

            // 3. Movement Check
            if (lastSentLocation.current) {
                const dist = getDistance(
                    lastSentLocation.current.lat, 
                    lastSentLocation.current.lng, 
                    lat, 
                    lng
                );
                // Even if stationary, we send a heartbeat every 2 minutes
                const isHeartbeatTime = now - lastSentTime.current > 120000;
                if (dist < MIN_DISTANCE_METERS && !isHeartbeatTime) {
                    console.log(`[Tracking] Stationary (moved ${dist.toFixed(1)}m). Skipping update.`);
                    return;
                }
            }

            // 4. Update Database Location (Heartbeat) - Essential for initial assignment logic
            if (isOnline) {
                useDeliveryAuthStore.getState().updateLocation(lat, lng);
            }

            // 5. Send Real-time Update via Sockets (for active tracking on customer maps)
            if (trackingOrders.length > 0 && socketService.socket?.connected) {
                trackingOrders.forEach(order => {
                    const orderId = order.orderId || order.id || order._id;
                    socketService.socket.emit('update_location', {
                        lat,
                        lng,
                        deliveryBoyId,
                        orderId
                    });
                });
            }

            lastSentLocation.current = { lat, lng };
            lastSentTime.current = now;
            console.log(`🚀 Location sent: ${lat}, ${lng} (Accuracy: ${accuracy}m, Active Orders: ${trackingOrders.length})`);
        };

        const handleSuccess = (position) => {
            const { latitude: lat, longitude: lng, accuracy } = position.coords;
            setCurrentLocation({ lat, lng });
            handleSubmits(lat, lng, accuracy);
        };

        const handleError = (error) => {
            console.error('[Tracking] Geolocation error:', error.code, error.message);
        };

        // Start watching
        watchId.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 15000
        });

        // Background / Fallback interval (Optional, for browsers that stop watchPosition)
        const fallbackInterval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(
                (pos) => handleSubmits(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
                (err) => {}, // ignore errors in interval
                { enableHighAccuracy: true, maximumAge: 10000 }
            );
        }, UPDATE_INTERVAL * 2);

        return () => {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
            if (fallbackInterval) clearInterval(fallbackInterval);
        };
    }, [deliveryBoyId, trackingOrders.length]);

    return currentLocation;
};
