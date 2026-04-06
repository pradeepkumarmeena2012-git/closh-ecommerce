import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Polyline, Marker, InfoWindow, Circle } from '@react-google-maps/api';
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

// High-Visibility Rider Icon (Blue Dot with Directional Arrow)
const createDeliveryBoyIcon = (heading = 0) => {
  return {
    path: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z',
    fillColor: '#6366f1',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: 1.2,
    anchor: { x: 12, y: 12 },
    rotation: heading
  };
};

const DeliveryBoyLiveMap = ({ 
  currentLocation, 
  destination = null, 
  path = [], 
  distanceTraveled = 0,
  earnings = 0,
  orderDetails = null,
  isLoaded: isLoadedProp
}) => {
  const isLoaded = isLoadedProp;

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
        {/* Current Location Marker (Rider) */}
        {currentLocation && (
          <>
            {/* Accuracy Radius */}
            <Circle
              center={currentLocation}
              radius={30}
              options={{
                fillColor: '#6366f1',
                fillOpacity: 0.1,
                strokeColor: '#4f46e5',
                strokeOpacity: 0.2,
                strokeWeight: 1,
                clickable: false,
                zIndex: 1
              }}
            />
            {/* The Rider Dot */}
            <Marker
              position={currentLocation}
              icon={createDeliveryBoyIcon(heading)}
              onClick={() => setShowInfo(!showInfo)}
              zIndex={10}
            />
          </>
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
