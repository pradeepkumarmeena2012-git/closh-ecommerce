import { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const GoogleMapPicker = ({ onLocationSelect, initialLocation, height = '400px', zoom = 12 }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Google Maps API Key
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      try {
        setOptions({
          apiKey: GOOGLE_MAPS_API_KEY,
          version: 'weekly'
        });

        const [{ Map, Marker }] = await Promise.all([
          importLibrary('maps')
        ]);

        if (!isMounted) return;

        const defaultLocation = initialLocation || { lat: 26.9124, lng: 75.7873 }; // Jaipur

        const mapInstance = new Map(mapRef.current, {
          center: defaultLocation,
          zoom: zoom,
          mapId: 'DEMO_MAP_ID', // Required for advanced markers if needed
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        const markerInstance = new Marker({
          position: defaultLocation,
          map: mapInstance,
          draggable: true,
          title: 'Service Area Center'
        });

        // Click event
        mapInstance.addListener('click', (event) => {
          const location = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          markerInstance.setPosition(location);
          if (onLocationSelect) onLocationSelect(location);
        });

        // Drag event
        markerInstance.addListener('dragend', (event) => {
          const location = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          if (onLocationSelect) onLocationSelect(location);
        });

        setMap(mapInstance);
        setMarker(markerInstance);
        setIsLoading(false);

        if (onLocationSelect && defaultLocation) {
          onLocationSelect(defaultLocation);
        }
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        if (isMounted) {
          setError('Failed to load Google Maps. Please check your API key.');
          setIsLoading(false);
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (marker) marker.setMap(null);
    };
  }, []);

  // Update marker position when initialLocation changes
  useEffect(() => {
    if (marker && initialLocation && map) {
      marker.setPosition(initialLocation);
      map.panTo(initialLocation);
    }
  }, [initialLocation, marker, map]);

  if (error) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
        style={{ height }}
      >
        <div className="text-center p-6">
          <p className="text-red-600 font-medium mb-2">⚠️ {error}</p>
          <p className="text-gray-600 text-sm">
            Please configure your Google Maps API key in environment variables.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Set VITE_GOOGLE_MAPS_API_KEY in your .env file
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-300">
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10"
          style={{ height }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      <div 
        ref={mapRef} 
        style={{ height, width: '100%' }}
        className="rounded-lg"
      />
      <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded-lg shadow-md text-sm text-gray-700">
        📍 Click or drag marker to set location
      </div>
    </div>
  );
};

export default GoogleMapPicker;
