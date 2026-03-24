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

        const handleSuccess = (position) => {
            const { latitude: lat, longitude: lng, accuracy } = position.coords;
            const now = Date.now();

            setCurrentLocation({ lat, lng });

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
                if (dist < MIN_DISTANCE_METERS) {
                    console.log(`[Tracking] Stationary (moved ${dist.toFixed(1)}m). Skipping update.`);
                    return;
                }
            }

            // 4. Update Database Location (Heartbeat) - Essential for initial assignment logic
            if (isOnline) {
                useDeliveryAuthStore.getState().updateLocation(lat, lng);
            }

            // 5. Send Real-time Update via Sockets (for active tracking on customer maps)
            trackingOrders.forEach(order => {
                socketService.socket.emit('update_location', {
                    lat,
                    lng,
                    deliveryBoyId,
                    orderId: order.orderId || order.id || order._id
                });
            });

            lastSentLocation.current = { lat, lng };
            lastSentTime.current = now;
            console.log(`🚀 Location sent: ${lat}, ${lng} (Accuracy: ${accuracy}m)`);
        };

        const handleError = (error) => {
            console.error('[Tracking] Geolocation error:', error);
        };

        watchId.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000
        });

        return () => {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
        };
    }, [deliveryBoyId, trackingOrders.length]);

    return currentLocation;
};
