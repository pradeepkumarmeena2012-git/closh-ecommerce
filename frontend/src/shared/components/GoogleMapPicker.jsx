import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const libraries = ['places'];

const GoogleMapPicker = ({ onLocationSelect, initialLocation, height = '400px', zoom = 12 }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries
  });

  const [map, setMap] = useState(null);

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
    if (initialLocation) {
        mapInstance.panTo(initialLocation);
    }
  }, [initialLocation]);

  const onMapClick = useCallback((e) => {
    const location = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    if (onLocationSelect) onLocationSelect(location);
  }, [onLocationSelect]);

  const onMarkerDragEnd = useCallback((e) => {
    const location = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    if (onLocationSelect) onLocationSelect(location);
  }, [onLocationSelect]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg animate-pulse" style={{ height }}>
        <p className="text-gray-500 font-medium">Loading map...</p>
      </div>
    );
  }

  const center = initialLocation || { lat: 26.9124, lng: 75.7873 };

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-300" style={{ height }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onMapLoad}
        onClick={onMapClick}
        options={{
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        <Marker
          position={center}
          draggable={true}
          onDragEnd={onMarkerDragEnd}
          title="Service Area Center"
        />
      </GoogleMap>
      <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded-lg shadow-md text-sm text-gray-700 z-10">
        📍 Click or drag marker to set location
      </div>
    </div>
  );
};

export default React.memo(GoogleMapPicker);
