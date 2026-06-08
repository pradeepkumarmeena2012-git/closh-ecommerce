import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolygonF } from '@react-google-maps/api';
import { FiTrash2, FiMapPin, FiEdit3, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const libraries = ['places', 'geometry']; // Removed 'drawing'

const GoogleMapZoneDrawer = ({ 
  onLocationSelect, 
  onPolygonComplete,
  initialLocation, 
  initialPolygon,
  height = '400px', 
  zoom = 12 
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries
  });

  const [map, setMap] = useState(null);
  
  // Custom drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPaths, setDrawnPaths] = useState([]);

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      console.warn('[GoogleMapZone] API Key is MISSING!');
    }
  }, []);

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
    
    if (isDrawing) {
      setDrawnPaths(prev => [...prev, location]);
    } else {
      if (onLocationSelect) onLocationSelect(location);
    }
  }, [isDrawing, onLocationSelect]);

  const onMarkerDragEnd = useCallback((e) => {
    const location = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    if (onLocationSelect) onLocationSelect(location);
  }, [onLocationSelect]);

  const finishDrawing = () => {
    if (drawnPaths.length < 3) {
      toast.error("Please add at least 3 points to create a zone.");
      return;
    }
    
    const coords = drawnPaths.map(p => [p.lng, p.lat]);
    
    // Close loop for GeoJSON
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([...first]);
    }

    if (onPolygonComplete) {
      onPolygonComplete({
        type: 'Polygon',
        coordinates: [coords]
      });
    }

    setIsDrawing(false);
    setDrawnPaths([]); // clear temp paths since it's now in initialPolygon
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawnPaths([]);
  };

  const clearPolygon = () => {
    if (onPolygonComplete) onPolygonComplete(null);
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-xl animate-pulse" style={{ height }}>
        <p className="text-gray-500 font-medium">Loading Google Maps...</p>
      </div>
    );
  }

  // Convert GeoJSON to Google Maps paths for existing saved polygon
  const savedPolygonPaths = (initialPolygon?.coordinates?.[0] || []).map(coord => ({
    lat: coord[1],
    lng: coord[0]
  }));

  if (savedPolygonPaths.length > 1) {
    const first = savedPolygonPaths[0];
    const last = savedPolygonPaths[savedPolygonPaths.length - 1];
    if (first.lat === last.lat && first.lng === last.lng) {
      savedPolygonPaths.pop();
    }
  }

  // Choose which polygon to display (temp drawn one, or saved one)
  const pathsToDisplay = isDrawing ? drawnPaths : savedPolygonPaths;

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-300 shadow-inner bg-gray-50" style={{ height }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={initialLocation || { lat: 26.9124, lng: 75.7873 }}
        zoom={zoom}
        onLoad={onMapLoad}
        onClick={onMapClick}
        options={{
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          draggableCursor: isDrawing ? 'crosshair' : 'default',
        }}
      >
        {initialLocation && (
          <MarkerF
            position={initialLocation}
            draggable={!isDrawing}
            onDragEnd={onMarkerDragEnd}
            title="Center Point"
          />
        )}

        {pathsToDisplay.length > 0 && (
          <PolygonF
            paths={pathsToDisplay}
            options={{
              fillColor: "#3b82f6",
              fillOpacity: 0.3,
              strokeWeight: 2,
              strokeColor: "#2563eb",
              editable: !isDrawing && savedPolygonPaths.length > 0, // allow editing saved one if possible, though custom editing handles dragging vertices differently
              draggable: false,
              clickable: false,
            }}
          />
        )}
      </GoogleMap>

      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 right-16 flex justify-between items-start z-10 pointer-events-none">
        {/* Left Side: Drawing Controls */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {!isDrawing ? (
            <button
              type="button"
              onClick={() => setIsDrawing(true)}
              className="bg-white p-2 px-4 rounded-lg shadow-lg text-primary-600 hover:bg-primary-50 transition-all border border-primary-100 flex items-center gap-2 text-sm font-medium"
            >
              <FiEdit3 /> Draw Zone
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={finishDrawing}
                className="bg-primary-600 p-2 px-4 rounded-lg shadow-lg text-white hover:bg-primary-700 transition-all flex items-center gap-2 text-sm font-medium"
              >
                <FiCheck /> Finish Drawing
              </button>
              <button
                type="button"
                onClick={cancelDrawing}
                className="bg-white p-2 px-4 rounded-lg shadow-lg text-gray-600 hover:bg-gray-50 transition-all border border-gray-200 flex items-center gap-2 text-sm font-medium"
              >
                Cancel
              </button>
              <div className="bg-white/90 p-2 rounded-lg shadow border border-gray-200 text-xs text-gray-600">
                Click map to add points ({drawnPaths.length})
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Clear Zone */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {!isDrawing && savedPolygonPaths.length > 0 && (
            <button
              type="button"
              onClick={clearPolygon}
              className="bg-white p-2 px-4 rounded-lg shadow-lg text-red-600 hover:bg-red-50 transition-all border border-red-100 flex items-center gap-2 text-sm font-medium"
              title="Clear Zone"
            >
              <FiTrash2 /> Clear Zone
            </button>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none z-10">
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-gray-200 pointer-events-auto max-w-[70%]">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
              <FiMapPin className="text-lg" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">Instructions:</p>
              <ul className="text-[10px] text-gray-600 list-disc list-inside space-y-0.5">
                {!isDrawing ? (
                  <>
                    <li>Click map to set <b>Center Point</b></li>
                    <li>Click <b>Draw Zone</b> to draw boundary</li>
                  </>
                ) : (
                  <>
                    <li>Click around the map to trace boundary</li>
                    <li>Click <b>Finish Drawing</b> when done</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GoogleMapZoneDrawer);
