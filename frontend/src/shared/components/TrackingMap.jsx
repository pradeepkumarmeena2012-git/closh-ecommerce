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
  const isLoaded = isLoadedProp;

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
  const animFrameRef = useRef();

  // --- Utility: Calculate Heading ---
  const calculateHeading = (from, to) => {
    if (!window.google) return 0;
    return window.google.maps.geometry.spherical.computeHeading(
      new window.google.maps.LatLng(from.lat, from.lng),
      new window.google.maps.LatLng(to.lat, to.lng)
    );
  };

  // --- Animation loop for polyline ---
  useEffect(() => {
    let count = 0;
    const animate = () => {
      count = (count + 1) % 200;
      setLineOffset(count / 10);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // --- Simulation Logic ---
  useEffect(() => {
    if (!isSimulating || !directions || !isLoaded) return;
    const steps = directions.routes[0].overview_path;
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx >= steps.length) {
        setIsSimulating(false);
        return;
      }
      const cur = { lat: steps[stepIdx].lat(), lng: steps[stepIdx].lng() };
      setSimulatedRider(cur);
      if (stepIdx < steps.length - 1) {
         const nxt = { lat: steps[stepIdx+1].lat(), lng: steps[stepIdx+1].lng() };
         setHeading(calculateHeading(cur, nxt));
      }
      stepIdx++;
    }, 450);
    return () => clearInterval(interval);
  }, [isSimulating, directions, isLoaded]);

  const effectiveRider = isSimulating ? simulatedRider : deliveryLocation;
  const isPickedUp = ['picked_up', 'out_for_delivery', 'picked-up', 'out-for-delivery', 'arrived'].includes(status?.toLowerCase());
  const destination = isPickedUp ? customerLocation : (vendorLocation || customerLocation);

  // --- Geocoder ---
  useEffect(() => {
    if (!isLoaded || !window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    
    // Improved valid address check to prevent geocoding "Address unavailable" strings
    const isValidAddress = (addr) => addr && addr.length > 5 && !addr.includes('unavailable');

    if (!initialCustomerLocation && isValidAddress(customerAddress)) {
       geocoder.geocode({ address: customerAddress }, (res, stat) => {
         if (stat === 'OK' && res[0]) setCustomerLocation({ lat: res[0].geometry.location.lat(), lng: res[0].geometry.location.lng() });
       });
    } else { setCustomerLocation(initialCustomerLocation); }

    if (!initialVendorLocation && isValidAddress(vendorAddress)) {
       geocoder.geocode({ address: vendorAddress }, (res, stat) => {
         if (stat === 'OK' && res[0]) setVendorLocation({ lat: res[0].geometry.location.lat(), lng: res[0].geometry.location.lng() });
       });
    } else { setVendorLocation(initialVendorLocation); }
  }, [isLoaded, initialCustomerLocation, initialVendorLocation, customerAddress, vendorAddress]);

  // --- Map Center / Follow ---
  const onLoad = useCallback((map) => {
    setMap(map);
    if (effectiveRider) {
      map.setCenter(effectiveRider);
      map.setZoom(17);
    }
  }, [effectiveRider]);

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
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeWeight: 4,
              strokeColor: '#ffffff',
              scale: 7,
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
