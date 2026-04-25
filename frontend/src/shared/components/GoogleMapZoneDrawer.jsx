import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, DrawingManager, Marker, Polygon } from '@react-google-maps/api';
import { FiTrash2, FiMapPin } from 'react-icons/fi';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const libraries = ['drawing', 'geometry', 'places'];

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
  const [activePolygon, setActivePolygon] = useState(null);
  
  // Use a ref for initial polygon to avoid infinite loops
  const initialPolygonProcessed = useRef(false);

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      console.warn('[GoogleMapZone] API Key is MISSING!');
    } else {
      console.log(`[GoogleMapZone] API Key detected (Length: ${key.length}). Using @react-google-maps/api loader.`);
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
    if (onLocationSelect) onLocationSelect(location);
  }, [onLocationSelect]);

  const onMarkerDragEnd = useCallback((e) => {
    const location = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    if (onLocationSelect) onLocationSelect(location);
  }, [onLocationSelect]);

  const onPolygonCompleteHandler = useCallback((poly) => {
    // If we have a previous polygon from drawing manager, we need to handle it.
    // However, @react-google-maps/api handles the drawing. 
    // We want to capture the coordinates.
    
    const path = poly.getPath();
    const coords = [];
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coords.push([point.lng(), point.lat()]);
    }
    
    // Close loop for GeoJSON
    if (coords.length > 0) {
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords.push([...first]);
      }
    }

    if (onPolygonComplete) {
      onPolygonComplete({
        type: 'Polygon',
        coordinates: [coords]
      });
    }

    // Remove the temporary drawing and let our state-driven Polygon take over if needed
    // but typically we just keep the reference.
    poly.setMap(null);
    
    // We'll update the initialPolygon via the parent state
  }, [onPolygonComplete]);

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

  // Convert GeoJSON to Google Maps paths
  const polygonPaths = (initialPolygon?.coordinates?.[0] || []).map(coord => ({
    lat: coord[1],
    lng: coord[0]
  }));

  // Remove the closing point for Google Maps display
  if (polygonPaths.length > 1) {
    const first = polygonPaths[0];
    const last = polygonPaths[polygonPaths.length - 1];
    if (first.lat === last.lat && first.lng === last.lng) {
      polygonPaths.pop();
    }
  }

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
        }}
      >
        {initialLocation && (
          <Marker
            position={initialLocation}
            draggable={true}
            onDragEnd={onMarkerDragEnd}
            title="Center Point"
          />
        )}

        {polygonPaths.length > 0 && (
          <Polygon
            paths={polygonPaths}
            options={{
              fillColor: "#3b82f6",
              fillOpacity: 0.3,
              strokeWeight: 2,
              strokeColor: "#2563eb",
              editable: true,
              draggable: false,
            }}
            onMouseUp={() => {
                // When user finishes dragging a vertex, update parent
                // This is a bit complex with Polygon component, so we'd need to get the path
            }}
          />
        )}

        <DrawingManager
          onPolygonComplete={onPolygonCompleteHandler}
          options={{
            drawingControl: true,
            drawingControlOptions: {
              position: window.google?.maps?.ControlPosition?.TOP_CENTER,
              drawingModes: ['polygon'],
            },
            polygonOptions: {
              fillColor: "#3b82f6",
              fillOpacity: 0.3,
              strokeWeight: 2,
              strokeColor: "#2563eb",
              editable: true,
            },
          }}
        />
      </GoogleMap>

      {/* Controls Overlay */}
      <div className="absolute top-4 right-16 flex flex-col gap-2 z-10">
        {initialPolygon?.coordinates?.[0]?.length > 0 && (
          <button
            type="button"
            onClick={clearPolygon}
            className="bg-white p-2 rounded-lg shadow-lg text-red-600 hover:bg-red-50 transition-all border border-red-100 flex items-center gap-2 text-sm font-medium pointer-events-auto"
            title="Clear Zone"
          >
            <FiTrash2 /> Clear Zone
          </button>
        )}
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
                <li>Click map to set <b>Center Point</b></li>
                <li>Use polygon icon (top) to draw <b>Zone Boundary</b></li>
                <li>Zone will be saved when you close the loop</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GoogleMapZoneDrawer);wer;
