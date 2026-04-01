import { useState, useEffect, useRef } from 'react';
import socketService from '../utils/socket';
import { useDeliveryAuthStore } from '../../modules/Delivery/store/deliveryStore';
import { useDeliveryEngineStore } from '../../modules/Delivery/store/deliveryEngineStore';

const UPDATE_INTERVAL = 10000; // 10 seconds (Throttling)
const MIN_DISTANCE_METERS = 20; // Ignore small movements
const IDEAL_ACCURACY_METERS = 50; // Preferred accuracy
const MAX_ACCURACY_METERS = 200; // Absolute max — accept anything under this after retries

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
    const rejectionCount = useRef(0);

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

            // 2. Accuracy Check — progressive: relax threshold after repeated rejections
            const effectiveThreshold = rejectionCount.current >= 5
                ? MAX_ACCURACY_METERS   // After 5 rejections, accept up to 200m
                : rejectionCount.current >= 2
                    ? 150               // After 2 rejections, accept up to 150m
                    : IDEAL_ACCURACY_METERS; // Initially prefer <50m

            if (accuracy > effectiveThreshold) {
                rejectionCount.current++;
                console.warn(`[Tracking] Ignoring low accuracy: ${Math.round(accuracy)}m (threshold: ${effectiveThreshold}m, rejections: ${rejectionCount.current})`);
                return;
            }
            // Good fix — reset rejection count
            rejectionCount.current = 0;

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
            const socket = socketService.socket;
            if (socket?.connected) {
                if (trackingOrders.length > 0) {
                    trackingOrders.forEach(order => {
                        const orderId = order.orderId || order.id || order._id;
                        socket.emit('update_location', {
                            lat, lng, deliveryBoyId, orderId
                        });
                    });
                }
                
                // If we have an active batch ID from the engine store
                const batchState = useDeliveryEngineStore?.getState?.();
                if (batchState?.activeBatch?.status === 'out_for_delivery') {
                    socket.emit('update_location', {
                        lat, lng, deliveryBoyId, batchId: batchState.activeBatch.batchId
                    });
                }
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

        let highAccuracyFailed = false;

        const handleError = (error) => {
            console.warn('[Tracking] Geolocation error:', error.code, error.message);
            // Code 3 = Timeout — fall back to low-accuracy (network/WiFi) position
            if (error.code === 3 && !highAccuracyFailed) {
                highAccuracyFailed = true;
                console.log('[Tracking] Falling back to low-accuracy mode');
                if (watchId.current) {
                    navigator.geolocation.clearWatch(watchId.current);
                }
                watchId.current = navigator.geolocation.watchPosition(handleSuccess, (e) => {
                    console.warn('[Tracking] Low-accuracy also failed:', e.code, e.message);
                }, {
                    enableHighAccuracy: false,
                    maximumAge: 30000,
                    timeout: 30000
                });
            }
        };

        // Start watching with high accuracy first
        watchId.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 20000
        });

        // Background / Fallback interval
        const fallbackInterval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(
                (pos) => handleSubmits(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
                () => {},
                { enableHighAccuracy: !highAccuracyFailed, maximumAge: 15000, timeout: 10000 }
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
