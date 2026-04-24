import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Polyline, DirectionsRenderer, Marker } from '@react-google-maps/api';
import { FiNavigation, FiActivity } from 'react-icons/fi';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "on" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
    {
      featureType: "administrative.land_parcel",
      elementType: "labels.text.fill",
      stylers: [{ color: "#bdbdbd" }],
    },
    {
      featureType: "poi",
      elementType: "geometry",
      stylers: [{ color: "#eeeeee" }]
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#757575" }]
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#e5e5e5" }]
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9e9e9e" }]
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#ffffff" }]
    },
    {
      featureType: "road.arterial",
      elementType: "labels.text.fill",
      stylers: [{ color: "#757575" }]
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#dadada" }]
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#616161" }]
    },
    {
      featureType: "road.local",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9e9e9e" }]
    },
    {
      featureType: "transit.line",
      elementType: "geometry",
      stylers: [{ color: "#e5e5e5" }]
    },
    {
      featureType: "transit.station",
      elementType: "geometry",
      stylers: [{ color: "#eeeeee" }]
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#c9c9c9" }]
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9e9e9e" }]
    }
  ]
};

const TrackingMap = ({ 
  deliveryLocation, // { lat, lng }
  customerLocation: initialCustomerLocation, // { lat, lng }
  vendorLocation: initialVendorLocation,   // { lat, lng }
  customerAddress,
  vendorAddress,
  status = 'assigned', 
  path = [],        
  followMode = true,
  isLoaded: isLoadedProp
}) => {
  const { isLoaded: localIsLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ['places', 'geometry', 'drawing']
  });

  const isLoaded = isLoadedProp !== undefined ? isLoadedProp : localIsLoaded;

  const [map, setMap] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(initialCustomerLocation);
  const [vendorLocation, setVendorLocation] = useState(initialVendorLocation);
  const [center, setCenter] = useState(deliveryLocation || initialCustomerLocation || { lat: 21.1458, lng: 79.0882 });
  const [directions, setDirections] = useState(null);
  const [lastRouteParams, setLastRouteParams] = useState(null);
  const [lineOffset, setLineOffset] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedRider, setSimulatedRider] = useState(null);
  const [heading, setHeading] = useState(0);
  
  // Smooth Interpolation State
  const [smoothLocation, setSmoothLocation] = useState(deliveryLocation);
  const animFrameRef = useRef();
  const lastTargetRef = useRef(deliveryLocation);

  // --- Utility: Calculate Heading ---
  const calculateHeading = (from, to) => {
    if (!window.google || !from || !to) return 0;
    return window.google.maps.geometry.spherical.computeHeading(
      new window.google.maps.LatLng(from.lat, from.lng),
      new window.google.maps.LatLng(to.lat, to.lng)
    );
  };

  // --- Smooth Gliding Engine (Lerp) ---
  useEffect(() => {
    if (!deliveryLocation) return;
    
    // If it's a fresh update, calculate heading before moving
    if (lastTargetRef.current && (lastTargetRef.current.lat !== deliveryLocation.lat)) {
       setHeading(calculateHeading(lastTargetRef.current, deliveryLocation));
    }
    lastTargetRef.current = deliveryLocation;

    if (!smoothLocation) {
      setSmoothLocation(deliveryLocation);
      return;
    }

    let start = Date.now();
    const duration = 2000; // 2 sec glide for smoothness
    const startLoc = { ...smoothLocation };

    const animateGlide = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      
      const easedProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      setSmoothLocation({
        lat: startLoc.lat + (deliveryLocation.lat - startLoc.lat) * easedProgress,
        lng: startLoc.lng + (deliveryLocation.lng - startLoc.lng) * easedProgress
      });

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateGlide);
      }
    };

    animateGlide();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [deliveryLocation]);

  const effectiveRider = isSimulating ? simulatedRider : smoothLocation;
  const isPickedUp = ['picked_up', 'out_for_delivery', 'picked-up', 'out-for-delivery', 'arrived'].includes(status?.toLowerCase());
  const destination = isPickedUp ? customerLocation : (vendorLocation || customerLocation);

  // --- Routing & Polyline ---
  useEffect(() => {
    if (!isLoaded || !window.google || !effectiveRider || !destination) return;
    
    const routeKey = `${effectiveRider.lat},${effectiveRider.lng}-${destination.lat},${destination.lng}`;
    if (lastRouteParams === routeKey) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: effectiveRider,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, stat) => {
        if (stat === 'OK') {
          setDirections(result);
          setLastRouteParams(routeKey);
          
          // Auto-Adjust Bounds to see both points
          if (map) {
             const bounds = new window.google.maps.LatLngBounds();
             bounds.extend(effectiveRider);
             bounds.extend(destination);
             map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
          }
        }
      }
    );
  }, [isLoaded, effectiveRider, destination, map, lastRouteParams]);

  // --- Animation loop for active line pulse ---
  useEffect(() => {
    let count = 0;
    const animateLine = () => {
      count = (count + 1) % 200;
      setLineOffset(count / 10);
      animFrameRef.current = requestAnimationFrame(animateLine);
    };
    animateLine();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  useEffect(() => {
    if (map && effectiveRider && followMode) {
      map.panTo(effectiveRider);
    }
  }, [effectiveRider, followMode, map]);

  // --- Directions ---
  const [eta, setEta] = useState({ duration: '', distance: '' });
  useEffect(() => {
    if (isLoaded && effectiveRider && destination) {
       const key = `${effectiveRider.lat.toFixed(5)},${effectiveRider.lng.toFixed(5)}|${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
       if (key !== lastRouteParams) {
          setLastRouteParams(key);
          const service = new window.google.maps.DirectionsService();
          service.route(
            { origin: effectiveRider, destination, travelMode: 'DRIVING' },
            (res, stat) => {
              if (stat === 'OK') {
                setDirections(res);
                const leg = res.routes[0]?.legs[0];
                if (leg) setEta({ duration: leg.duration.text, distance: leg.distance.text });
              }
            }
          );
       }
    } else {
       setDirections(null);
       setEta({ duration: '', distance: '' });
    }
  }, [isLoaded, effectiveRider, destination, lastRouteParams]);

  const handleExternalNav = () => {
    if (effectiveRider && destination) {
       const url = `https://www.google.com/maps/dir/?api=1&origin=${effectiveRider.lat},${effectiveRider.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
       window.open(url, '_blank');
    }
  };

  if (!isLoaded) return <div className="h-full w-full bg-slate-100 flex items-center justify-center animate-pulse" />;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* ETA HUD */}
      {eta.duration && (
        <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl z-30 border border-slate-100 flex items-center justify-between">
           <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Estimated Arrival</p>
              <h2 className="text-xl font-black text-slate-900 leading-none">{eta.duration}</h2>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Route Distance</p>
              <p className="text-sm font-bold text-slate-700">{eta.distance}</p>
           </div>
        </div>
      )}

      {/* EXTERNAL NAV BUTTON (Now Top-Right) */}
      {destination && (
        <button 
          onClick={handleExternalNav}
          className="absolute top-24 right-6 z-40 w-12 h-12 bg-white/95 backdrop-blur-md text-indigo-600 rounded-2xl shadow-2xl flex items-center justify-center hover:bg-white active:scale-95 transition-all border border-indigo-50"
        >
          <FiNavigation size={22} />
        </button>
      )}

      {import.meta.env.DEV && (
        <button onClick={() => setIsSimulating(!isSimulating)} className="absolute top-24 left-6 z-40 bg-slate-900/90 text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">
          {isSimulating ? 'Stop SIM' : 'Simulate'}
        </button>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={17}
        onLoad={onLoad}
        onUnmount={() => setMap(null)}
        options={mapOptions}
      >
        {effectiveRider && window.google && (
          <Marker 
            position={effectiveRider}
            icon={{
              path: 'M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z', // Sleek Navigation Arrow Path
              fillColor: '#4f46e5',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#ffffff',
              scale: 2,
              anchor: new window.google.maps.Point(12, 12),
              rotation: heading
            }}
            zIndex={2000}
          />
        )}

        {destination && (
          <Marker 
            position={destination}
            label={{ text: isPickedUp ? '🏠' : '📦', fontSize: '22px' }}
            zIndex={1000}
          />
        )}

        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: "#4f46e5",
                strokeWeight: 7,
                strokeOpacity: 0.9
              }
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
};

export default React.memo(TrackingMap);
