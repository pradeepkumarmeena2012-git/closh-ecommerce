import { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { FiTrash2, FiMaximize2, FiMapPin } from 'react-icons/fi';

const GoogleMapZoneDrawer = ({ 
  onLocationSelect, 
  onPolygonComplete,
  initialLocation, 
  initialPolygon,
  height = '400px', 
  zoom = 12 
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [drawingManager, setDrawingManager] = useState(null);
  const [marker, setMarker] = useState(null);
  const [polygon, setPolygon] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearPolygon = useCallback(() => {
    if (polygon) {
      polygon.setMap(null);
      setPolygon(null);
      if (onPolygonComplete) onPolygonComplete(null);
    }
  }, [polygon, onPolygonComplete]);

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!key) {
        console.warn('[GoogleMapZone] API Key is MISSING! Check your environment variables.');
      } else {
        console.log(`[GoogleMapZone] API Key detected (Length: ${key.length}, Format: ${key.startsWith('AIza') ? 'Valid' : 'Unexpected'}).`);
      }

      try {
        setOptions({
          apiKey: key || '',
          version: 'weekly'
        });

        const mapsLib = await importLibrary('maps');
        const drawingLib = await importLibrary('drawing');

        const Map = mapsLib.Map;
        const Marker = mapsLib.Marker;
        const Polygon = mapsLib.Polygon;
        const DrawingManager = drawingLib.DrawingManager;
        const OverlayType = drawingLib.OverlayType;

        if (!isMounted) return;

        const defaultLocation = initialLocation || { lat: 26.9124, lng: 75.7873 };

        const mapInstance = new Map(mapRef.current, {
          center: defaultLocation,
          zoom: zoom,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        const markerInstance = new Marker({
          position: defaultLocation,
          map: mapInstance,
          draggable: true,
          title: 'Center Point'
        });

        const drawingManagerInstance = new DrawingManager({
          drawingMode: null,
          drawingControl: true,
          drawingControlOptions: {
            position: 1, // TOP_CENTER
            drawingModes: [OverlayType.POLYGON],
          },
          polygonOptions: {
            fillColor: "#3b82f6",
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: "#2563eb",
            clickable: true,
            editable: true,
            zIndex: 1,
          },
        });

        drawingManagerInstance.setMap(mapInstance);

        // Handle Polygon Completion
        drawingManagerInstance.addListener('polygoncomplete', (newPolygon) => {
          // If we already have a polygon, remove it
          setPolygon(prev => {
            if (prev) prev.setMap(null);
            return newPolygon;
          });
          
          drawingManagerInstance.setDrawingMode(null); // Switch back to navigation mode

          const updatePolygonCoords = () => {
            const path = newPolygon.getPath();
            const coords = [];
            for (let i = 0; i < path.getLength(); i++) {
              const point = path.getAt(i);
              coords.push([point.lng(), point.lat()]);
            }
            // Close the loop for GeoJSON
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
          };

          updatePolygonCoords();

          // Listen for edits
          newPolygon.getPath().addListener('set_at', updatePolygonCoords);
          newPolygon.getPath().addListener('insert_at', updatePolygonCoords);
          newPolygon.getPath().addListener('remove_at', updatePolygonCoords);
        });

        // Click on map to set center
        mapInstance.addListener('click', (event) => {
          if (drawingManagerInstance.getDrawingMode()) return;

          const location = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          markerInstance.setPosition(location);
          if (onLocationSelect) onLocationSelect(location);
        });

        markerInstance.addListener('dragend', (event) => {
          const location = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          if (onLocationSelect) onLocationSelect(location);
        });

        // Initialize with existing polygon if any
        if (initialPolygon && initialPolygon.coordinates && initialPolygon.coordinates[0] && initialPolygon.coordinates[0].length > 0) {
          try {
            const coords = initialPolygon.coordinates[0].map(c => ({ lng: c[0], lat: c[1] }));
            
            // Remove redundant closing point for Google Maps Polygon display
            if (coords.length > 1) {
              const first = coords[0];
              const last = coords[coords.length - 1];
              if (first.lat === last.lat && first.lng === last.lng) {
                coords.pop();
              }
            }

            const existingPolygon = new Polygon({
              paths: coords,
              fillColor: "#3b82f6",
              fillOpacity: 0.3,
              strokeWeight: 2,
              strokeColor: "#2563eb",
              clickable: true,
              editable: true,
              map: mapInstance
            });

            setPolygon(existingPolygon);

            const updateExistingPolygonCoords = () => {
              const path = existingPolygon.getPath();
              const newCoords = [];
              for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                newCoords.push([point.lng(), point.lat()]);
              }
              if (newCoords.length > 0) {
                newCoords.push([...newCoords[0]]);
              }
              if (onPolygonComplete) {
                onPolygonComplete({
                  type: 'Polygon',
                  coordinates: [newCoords]
                });
              }
            };

            existingPolygon.getPath().addListener('set_at', updateExistingPolygonCoords);
            existingPolygon.getPath().addListener('insert_at', updateExistingPolygonCoords);
            existingPolygon.getPath().addListener('remove_at', updateExistingPolygonCoords);
          } catch (e) {
            console.error('Error rendering initial polygon:', e);
          }
        }

        setMap(mapInstance);
        setMarker(markerInstance);
        setDrawingManager(drawingManagerInstance);
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
    };
  }, []);

  // Update marker position when initialLocation changes externally (only once or when map loaded)
  useEffect(() => {
    if (marker && initialLocation && map) {
      marker.setPosition(initialLocation);
      // Only pan if it's not the default
      if (initialLocation.lat !== 0) {
        map.panTo(initialLocation);
      }
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
          <p className="text-gray-600 text-sm">Please configure your Google Maps API key.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-300 shadow-inner bg-gray-50">
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100/80 backdrop-blur-sm z-10"
          style={{ height }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading interactive map...</p>
          </div>
        </div>
      )}
      <div 
        ref={mapRef} 
        style={{ height, width: '100%' }}
        className="rounded-xl"
      />
      
      {/* Controls Overlay */}
      <div className="absolute top-4 right-16 flex flex-col gap-2">
        {polygon && (
          <button
            type="button"
            onClick={clearPolygon}
            className="bg-white p-2 rounded-lg shadow-lg text-red-600 hover:bg-red-50 transition-all border border-red-100 flex items-center gap-2 text-sm font-medium"
            title="Clear Zone"
          >
            <FiTrash2 /> Clear Zone
          </button>
        )}
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
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
                <li>Drag polygon edges to adjust boundary</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapZoneDrawer;
