import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Polyline, DirectionsRenderer, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '24px'
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    {
      "elementType": "geometry",
      "stylers": [{ "color": "#1d2c4d" }]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#8ec3b9" }]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#1a3646" }]
    },
    {
      "featureType": "administrative.country",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#4b6878" }]
    },
    {
      "featureType": "administrative.land_parcel",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#64779e" }]
    },
    {
      "featureType": "administrative.province",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#4b6878" }]
    },
    {
      "featureType": "landscape.man_made",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#334e87" }]
    },
    {
      "featureType": "landscape.natural",
      "elementType": "geometry",
      "stylers": [{ "color": "#023e58" }]
    },
    {
      "featureType": "poi",
      "elementType": "geometry",
      "stylers": [{ "color": "#283d6a" }]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#6f9ba5" }]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#1d2c4d" }]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#023e58" }]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#3C7680" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{ "color": "#304a7d" }]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#98a5be" }]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#1d2c4d" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{ "color": "#2c6675" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#255762" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#b0d5ce" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#023e58" }]
    },
    {
      "featureType": "transit",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#98a5be" }]
    },
    {
      "featureType": "transit",
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#1d2c4d" }]
    },
    {
      "featureType": "transit.line",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#283d6a" }]
    },
    {
      "featureType": "transit.station",
      "elementType": "geometry",
      "stylers": [{ "color": "#3a4762" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#0e1626" }]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#4e6d70" }]
    }
  ]
};

const TrackingMap = ({ 
  deliveryLocation, // { lat, lng }
  customerLocation: initialCustomerLocation, // { lat, lng }
  vendorLocation: initialVendorLocation,   // { lat, lng }
  customerAddress,
  vendorAddress,
  status = 'assigned', // current order status
  path = [],        // Array of { lat, lng }
  followMode = true,
  isLoaded: isLoadedProp
}) => {
    // IMPORTANT: Ensure VITE_GOOGLE_MAPS_API_KEY is set in your .env during build
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ['places', 'geometry', 'drawing']
  });

  const isLoaded = isLoadedProp !== undefined ? isLoadedProp : internalIsLoaded;

  const [map, setMap] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(initialCustomerLocation);
  const [vendorLocation, setVendorLocation] = useState(initialVendorLocation);
  const [center, setCenter] = useState(deliveryLocation || initialCustomerLocation || { lat: 22.7196, lng: 75.8577 });
  const [directions, setDirections] = useState(null);
  const [lastRouteParams, setLastRouteParams] = useState(null);

  // --- Geocoder Fallback ---
  useEffect(() => {
    if (!isLoaded || !window.google) return;

    const geocoder = new window.google.maps.Geocoder();

    if (!initialCustomerLocation && customerAddress) {
       console.log('🔄 [TrackingMap] Attempting to geocode customer address...', customerAddress);
       geocoder.geocode({ address: customerAddress }, (results, status) => {
         if (status === 'OK' && results[0]) {
           console.log('✅ [TrackingMap] Customer coordinates found via geocoder!');
           setCustomerLocation({
             lat: results[0].geometry.location.lat(),
             lng: results[0].geometry.location.lng()
           });
         }
       });
    } else {
       setCustomerLocation(initialCustomerLocation);
    }

    if (!initialVendorLocation && vendorAddress) {
       console.log('🔄 [TrackingMap] Attempting to geocode vendor address...', vendorAddress);
       geocoder.geocode({ address: vendorAddress }, (results, status) => {
         if (status === 'OK' && results[0]) {
           console.log('✅ [TrackingMap] Vendor coordinates found via geocoder!');
           setVendorLocation({
             lat: results[0].geometry.location.lat(),
             lng: results[0].geometry.location.lng()
           });
         }
       });
    } else {
       setVendorLocation(initialVendorLocation);
    }
  }, [isLoaded, initialCustomerLocation, initialVendorLocation, customerAddress, vendorAddress]);

  const onLoad = useCallback(function callback(map) {
    setMap(map);
    
    // Initial fit bounds to see the whole mission
    const bounds = new window.google.maps.LatLngBounds();
    let pointsCount = 0;

    if (deliveryLocation) { bounds.extend(deliveryLocation); pointsCount++; }
    if (customerLocation) { bounds.extend(customerLocation); pointsCount++; }
    if (vendorLocation) { bounds.extend(vendorLocation); pointsCount++; }
    
    if (pointsCount > 1) {
      map.fitBounds(bounds, 100);
    } else if (deliveryLocation) {
      map.setCenter(deliveryLocation);
      map.setZoom(16);
    }
  }, [deliveryLocation, customerLocation, vendorLocation]);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  // Destination logic
  const isPickedUp = ['picked_up', 'out_for_delivery', 'picked-up', 'out-for-delivery', 'arrived'].includes(status?.toLowerCase());
  const destination = isPickedUp ? customerLocation : (vendorLocation || customerLocation);

  // Focus update (Follow Mode)
  useEffect(() => {
    if (followMode && deliveryLocation && map) {
      map.panTo(deliveryLocation);
    }
  }, [deliveryLocation, followMode, map]);

  useEffect(() => {
    if (isLoaded) {
       console.log("STEP 7 - Map Data:", {
          vendor: vendorLocation,
          customer: customerLocation
       });
    }
  }, [isLoaded, customerLocation, vendorLocation]);

  // Update directions when positions change
  useEffect(() => {
    if (isLoaded && deliveryLocation && destination) {
        const origin = new window.google.maps.LatLng(deliveryLocation.lat, deliveryLocation.lng);
        const dest = new window.google.maps.LatLng(destination.lat, destination.lng);
        
        const currentParams = `${deliveryLocation.lat.toFixed(4)},${deliveryLocation.lng.toFixed(4)}|${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
        
        if (currentParams !== lastRouteParams) {
            setLastRouteParams(currentParams);
            const service = new window.google.maps.DirectionsService();
            service.route(
                {
                    origin: origin,
                    destination: dest,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === 'OK') {
                        setDirections(result);
                    }
                }
            );
        }
    }
  }, [isLoaded, deliveryLocation, destination, lastRouteParams]);

  if (!isLoaded) return (
    <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center gap-3">
       <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initalizing Satellite Data...</span>
    </div>
  );

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={15}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={mapOptions}
    >
      {/* Rider Marker - Navigation Arrow */}
      {deliveryLocation && window.google && (
        <Marker 
          position={deliveryLocation}
          icon={{
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeWeight: 3,
            strokeColor: '#ffffff',
            scale: 8,
            rotation: 0
          }}
          zIndex={1000}
        />
      )}

      {/* Destination Marker */}
      {destination && (
        <Marker 
          position={destination}
          label={{
             text: isPickedUp ? '🏠' : '📦',
             fontSize: '24px',
             className: 'map-label'
          }}
          title={isPickedUp ? 'Deliver Here' : 'Pick Up Here'}
        />
      )}

      {/* Show Vendor if heading to customer */}
      {isPickedUp && vendorLocation && (
        <Marker 
          position={vendorLocation}
          label={{ text: '✅', fontSize: '18px' }}
          opacity={0.7}
        />
      )}

      {/* Route Display */}
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#6366f1",
              strokeWeight: 7,
              strokeOpacity: 0.9
            }
          }}
        />
      )}

      {!directions && deliveryLocation && destination && (
        <Polyline
          path={[deliveryLocation, destination]}
          options={{
            strokeColor: "#6366f1",
            strokeOpacity: 0.8,
            strokeWeight: 4,
            geodesic: true,
          }}
        />
      )}
    </GoogleMap>
  );
};

export default React.memo(TrackingMap);

