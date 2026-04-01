import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Polyline, Marker, InfoWindow } from '@react-google-maps/api';
import { FiNavigation, FiMapPin, FiTrendingUp } from 'react-icons/fi';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '16px'
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'transit',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

// Animated Delivery Boy SVG Marker
const createDeliveryBoyIcon = (heading = 0) => {
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    fillColor: '#4F46E5',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: 2,
    anchor: { x: 12, y: 22 },
    rotation: heading
  };
};

const DeliveryBoyLiveMap = ({ 
  currentLocation, 
  destination = null, 
  path = [], 
  distanceTraveled = 0,
  earnings = 0,
  orderDetails = null
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'delivery-boy-live-map',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
  });

  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(currentLocation || { lat: 20.5937, lng: 78.9629 });
  const [heading, setHeading] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const lastPositionRef = useRef(null);

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Calculate heading (direction) based on movement
  useEffect(() => {
    if (currentLocation && lastPositionRef.current) {
      const lat1 = lastPositionRef.current.lat;
      const lng1 = lastPositionRef.current.lng;
      const lat2 = currentLocation.lat;
      const lng2 = currentLocation.lng;

      const dLng = lng2 - lng1;
      const y = Math.sin(dLng) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - 
                Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
      
      const bearing = (Math.atan2(y, x) * 180) / Math.PI;
      setHeading(bearing);
    }
    
    if (currentLocation) {
      lastPositionRef.current = currentLocation;
      setCenter(currentLocation);
    }
  }, [currentLocation]);

  // Auto-center on delivery boy location
  useEffect(() => {
    if (map && currentLocation) {
      map.panTo(currentLocation);
    }
  }, [currentLocation, map]);

  if (!isLoaded) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-sm font-semibold text-indigo-600">Loading Map...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={16}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* Current Location Marker (Delivery Boy) */}
        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={createDeliveryBoyIcon(heading)}
            onClick={() => setShowInfo(!showInfo)}
            animation={window.google?.maps?.Animation?.BOUNCE}
          />
        )}

        {/* Info Window */}
        {showInfo && currentLocation && (
          <InfoWindow
            position={currentLocation}
            onCloseClick={() => setShowInfo(false)}
          >
            <div className="p-2">
              <h3 className="font-semibold text-sm mb-1">📍 Your Location</h3>
              <p className="text-xs text-gray-600">
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </p>
            </div>
          </InfoWindow>
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker
            position={destination}
            icon={{
              path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
              fillColor: '#10B981',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 10
            }}
            label={{
              text: '🏁',
              fontSize: '20px'
            }}
          />
        )}

        {/* Path Polyline */}
        {path.length > 1 && (
          <Polyline
            path={path}
            options={{
              strokeColor: '#4F46E5',
              strokeOpacity: 0.8,
              strokeWeight: 5,
              geodesic: true
            }}
          />
        )}
      </GoogleMap>

      {/* Stats Overlay */}
      <div className="absolute top-4 left-4 right-4 flex gap-3 pointer-events-none">
        {/* Distance Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 flex items-center gap-3 flex-1 pointer-events-auto">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <FiNavigation className="text-white text-lg" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Distance</p>
            <p className="text-lg font-bold text-gray-900">
              {distanceTraveled.toFixed(2)} km
            </p>
          </div>
        </div>

        {/* Earnings Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 flex items-center gap-3 flex-1 pointer-events-auto">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <FiTrendingUp className="text-white text-lg" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Earnings</p>
            <p className="text-lg font-bold text-emerald-600">
              ₹{earnings}
            </p>
          </div>
        </div>
      </div>

      {/* Order Info Overlay */}
      {orderDetails && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 pointer-events-auto">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Current Delivery</p>
              <p className="font-bold text-gray-900">Order #{orderDetails.orderId}</p>
              <p className="text-sm text-gray-600 mt-1">{orderDetails.customerName}</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                {orderDetails.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recenter Button */}
      {currentLocation && (
        <button
          onClick={() => {
            if (map && currentLocation) {
              map.panTo(currentLocation);
              map.setZoom(16);
            }
          }}
          className="absolute bottom-24 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-50 transition-colors pointer-events-auto"
        >
          <FiMapPin className="text-indigo-600 text-xl" />
        </button>
      )}
    </div>
  );
};

export default React.memo(DeliveryBoyLiveMap);
