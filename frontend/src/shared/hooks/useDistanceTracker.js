import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook to track distance traveled in real-time
 * Calculates distance using Haversine formula
 */

const EARTH_RADIUS_KM = 6371;

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate delivery earnings based on distance
 * Base ₹25 + ₹9 per km after 3km
 */
const calculateEarnings = (distanceKm) => {
  const BASE_FEE = 25;
  const PER_KM_FEE = 9;
  const FREE_KMS = 3;

  if (distanceKm <= FREE_KMS) return BASE_FEE;
  return Math.round(BASE_FEE + (distanceKm - FREE_KMS) * PER_KM_FEE);
};

export const useDistanceTracker = (orderId = null, initialDistance = 0) => {
  const [totalDistance, setTotalDistance] = useState(initialDistance);
  const [earnings, setEarnings] = useState(calculateEarnings(initialDistance));
  const [path, setPath] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  
  const lastPositionRef = useRef(null);
  const orderIdRef = useRef(orderId);

  useEffect(() => {
    orderIdRef.current = orderId;
  }, [orderId]);

  const startTracking = useCallback((startLocation) => {
    if (startLocation && startLocation.lat && startLocation.lng) {
      lastPositionRef.current = startLocation;
      setPath([startLocation]);
      setIsTracking(true);
      console.log('📊 Distance tracking started', startLocation);
    }
  }, []);

  const updateLocation = useCallback((newLocation) => {
    if (!isTracking || !newLocation || !newLocation.lat || !newLocation.lng) {
      return;
    }

    if (lastPositionRef.current) {
      const distance = calculateDistance(
        lastPositionRef.current.lat,
        lastPositionRef.current.lng,
        newLocation.lat,
        newLocation.lng
      );

      // Only count if moved at least 10 meters to avoid GPS noise
      if (distance >= 0.01) {
        setTotalDistance(prev => {
          const newTotal = prev + distance;
          setEarnings(calculateEarnings(newTotal));
          return newTotal;
        });

        setPath(prev => [...prev, newLocation]);
        
        console.log(`📍 Distance update: +${distance.toFixed(3)}km | Total: ${(totalDistance + distance).toFixed(2)}km`);
      }
    }

    lastPositionRef.current = newLocation;
  }, [isTracking, totalDistance]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    console.log(`✅ Distance tracking stopped. Total: ${totalDistance.toFixed(2)}km, Earnings: ₹${earnings}`);
  }, [totalDistance, earnings]);

  const resetTracking = useCallback(() => {
    setTotalDistance(0);
    setEarnings(calculateEarnings(0));
    setPath([]);
    setIsTracking(false);
    lastPositionRef.current = null;
    console.log('🔄 Distance tracker reset');
  }, []);

  return {
    totalDistance,
    earnings,
    path,
    isTracking,
    startTracking,
    updateLocation,
    stopTracking,
    resetTracking
  };
};

export default useDistanceTracker;
