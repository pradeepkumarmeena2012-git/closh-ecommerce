import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Search, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { useLocation as useLocationContext } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// URL for reverse geocoding (OpenStreetMap Nominatim)
const REVERSE_GEOCODE_URL = 'https://nominatim.openstreetmap.org/reverse?format=json';

const LocationMarker = ({ position, setPosition, setAddress }) => {
    const markerRef = React.useRef(null);
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            fetchAddress(e.latlng.lat, e.latlng.lng, setAddress);
        }
    });

    const eventHandlers = React.useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const newPos = marker.getLatLng();
                    setPosition(newPos);
                    fetchAddress(newPos.lat, newPos.lng, setAddress);
                }
            },
        }),
        [setPosition, setAddress],
    );

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
        />
    );
};

const fetchAddress = async (lat, lng, setAddress) => {
    try {
        const response = await fetch(`${REVERSE_GEOCODE_URL}&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        if (data && data.display_name) {
            const addr = data.address || {};
            setAddress({
                formatted: data.display_name,
                pincode: addr.postcode || '',
                city: addr.city || addr.town || addr.village || '',
                state: addr.state || '',
                locality: addr.suburb || addr.neighbourhood || addr.road || '',
                raw: data
            });
        }
    } catch (error) {
        console.error("Error fetching address:", error);
    }
};

const LocationModal = ({ isOpen, onClose, isMandatory = false }) => {
    const navigate = useNavigate();
    const { addresses, activeAddress, updateActiveAddress, refreshAddresses } = useLocationContext();
    const { user } = useAuth();
    const [pincode, setPincode] = useState('');
    const [pincodeStatus, setPincodeStatus] = useState(null); // 'checking' | 'success' | 'error'
    const [selectedAddressId, setSelectedAddressId] = useState(activeAddress?.id || null);

    // Map State
    const [view, setView] = useState('list'); // 'list' | 'map'
    const [position, setPosition] = useState(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [fetchedAddress, setFetchedAddress] = useState(null);

    // Refresh addresses when modal opens
    useEffect(() => {
        if (isOpen) {
            refreshAddresses();
            setView('list'); // Reset view on open
            setPincodeStatus(null);
        }
    }, [isOpen, refreshAddresses]);

    // Update selection when activeAddress changes
    useEffect(() => {
        if (activeAddress) setSelectedAddressId(activeAddress.id);
    }, [activeAddress]);

    if (!isOpen) return null;

    const handleAddNew = () => {
        if (!isMandatory) onClose();
        navigate('/addresses');
    };

    const handleCheckPincode = () => {
        if (pincode.length !== 6) return;
        setPincodeStatus('checking');
        // Simple mock check
        setTimeout(() => {
            if (pincode.startsWith('45')) {
                setPincodeStatus('success');
            } else {
                setPincodeStatus('error');
            }
        }, 1000);
    };

    const handleConfirm = () => {
        if (view === 'map' && fetchedAddress) {
            const newAddress = {
                id: Date.now(),
                name: fetchedAddress.locality || "Current Location",
                type: "Current",
                address: fetchedAddress.formatted.split(',')[0],
                city: fetchedAddress.city,
                state: fetchedAddress.state,
                pincode: fetchedAddress.pincode,
                mobile: user?.mobile || "",
                isCurrentLocation: true
            };

            const existingAddresses = JSON.parse(localStorage.getItem('userAddresses') || '[]');
            const updatedAddresses = [newAddress, ...existingAddresses];
            localStorage.setItem('userAddresses', JSON.stringify(updatedAddresses));

            updateActiveAddress(newAddress);
            onClose();
            refreshAddresses();
        } else {
            const selected = addresses.find(a => a.id === selectedAddressId);
            if (selected) {
                updateActiveAddress(selected);
            }
            onClose();
        }
    };

    const handleUseCurrentLocation = () => {
        setLoadingLocation(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setPosition({ lat: latitude, lng: longitude });
                    fetchAddress(latitude, longitude, setFetchedAddress);
                    setLoadingLocation(false);
                    setView('map');
                },
                (err) => {
                    console.error(err);
                    setLoadingLocation(false);
                    alert("Unable to retrieve your location. Please check browser permissions.");
                },
                { enableHighAccuracy: true }
            );
        } else {
            console.error("Geolocation is not supported by this browser.");
            setLoadingLocation(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-start justify-center p-4 bg-black/60 backdrop-blur-[2px] animate-fadeIn overflow-y-auto">
            {/* Modal Container */}
            <div className={`bg-white w-full max-w-[450px] rounded-[32px] shadow-2xl relative flex flex-col mt-[8dvh] mb-10 max-h-[80dvh] overflow-hidden transition-all duration-500 ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'}`}>

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        {view === 'map' && (
                            <button onClick={() => setView('list')} className="p-1 hover:bg-gray-100 rounded-full mr-1">
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <h2 className="text-[16px] font-black uppercase tracking-tight text-gray-900">
                            {view === 'map' ? 'Pin Location' : 'Select Delivery Location'}
                        </h2>
                    </div>
                    {!isMandatory && (
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-[#fafafa] relative">
                    {view === 'list' ? (
                        <div className="p-5 space-y-5">
                            {/* Enter Pincode Section */}
                            <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100">
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3 block">Enter Pincode</label>
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            placeholder="e.g. 453331"
                                            className="w-[180px] bg-gray-50 border border-transparent focus:bg-white focus:border-black rounded-xl px-4 py-3 text-[14px] font-bold outline-none transition-all placeholder:text-gray-400 placeholder:font-medium"
                                            value={pincode}
                                            onChange={(e) => {
                                                setPincode(e.target.value);
                                                setPincodeStatus(null);
                                            }}
                                            maxLength={6}
                                        />
                                        <button
                                            onClick={handleCheckPincode}
                                            disabled={pincodeStatus === 'checking' || pincode.length !== 6}
                                            className="w-[100px] bg-black text-[#39ff14] rounded-xl font-black uppercase text-[12px] tracking-widest hover:bg-gray-900 active:scale-95 transition-all disabled:bg-gray-100 disabled:text-gray-400"
                                        >
                                            {pincodeStatus === 'checking' ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Check'}
                                        </button>
                                    </div>
                                    {pincodeStatus === 'success' && (
                                        <div className="flex items-center gap-2 text-green-600 animate-fadeInUp">
                                            <CheckCircle2 size={14} />
                                            <span className="text-[11px] font-bold uppercase tracking-tight">Delivery Available in this area</span>
                                        </div>
                                    )}
                                    {pincodeStatus === 'error' && (
                                        <div className="flex items-center gap-2 text-red-500 animate-fadeInUp">
                                            <X size={14} />
                                            <span className="text-[11px] font-bold uppercase tracking-tight">Currently not delivering to this pincode</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Use Current Location */}
                            <button
                                onClick={handleUseCurrentLocation}
                                disabled={loadingLocation}
                                className="w-full bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center gap-4 group active:scale-[0.98] transition-all disabled:opacity-70"
                            >
                                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                    {loadingLocation ? <Loader2 size={20} className="text-red-500 animate-spin" /> : <MapPin size={20} className="text-red-500" />}
                                </div>
                                <div className="text-left flex-1">
                                    <h4 className="text-[13px] font-black uppercase tracking-tight text-red-500">
                                        {loadingLocation ? 'Getting location...' : 'Use Current Location'}
                                    </h4>
                                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">Using GPS</p>
                                </div>
                                <div className="px-3">
                                    <span className="text-red-500 font-bold">›</span>
                                </div>
                            </button>

                            {/* Saved Addresses */}
                            <div>
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <h3 className="text-[12px] font-black uppercase tracking-widest text-gray-400">Saved Addresses</h3>
                                    <button
                                        onClick={handleAddNew}
                                        className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                    >
                                        Add New
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {addresses.length === 0 ? (
                                        <div className="bg-white p-8 rounded-[24px] border border-dashed border-gray-200 text-center">
                                            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">No addresses found</p>
                                            <button onClick={handleAddNew} className="mt-2 text-blue-600 font-black text-[10px] uppercase">Add your first address</button>
                                        </div>
                                    ) : (
                                        addresses.map((addr) => (
                                            <div
                                                key={addr.id}
                                                onClick={() => setSelectedAddressId(addr.id)}
                                                className={`relative p-5 bg-white rounded-[24px] border-2 cursor-pointer transition-all active:scale-[0.99] ${selectedAddressId === addr.id ? 'border-black shadow-md' : 'border-transparent shadow-sm hover:border-gray-200'}`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-[14px] font-black text-gray-900">{addr.name}</h4>
                                                        <span className="bg-gray-100 text-gray-500 text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">{addr.type}</span>
                                                    </div>
                                                    {selectedAddressId === addr.id && (
                                                        <div className="w-5 h-5 bg-[#39ff14] rounded-full flex items-center justify-center">
                                                            <CheckCircle2 size={12} className="text-black stroke-[3]" />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[12px] text-gray-500 font-medium leading-relaxed pr-8">
                                                    {addr.address}, {addr.city} - <span className="text-gray-900 font-bold">{addr.pincode}</span>
                                                </p>
                                                <p className="text-[11px] text-gray-400 font-bold mt-2 tracking-wide">
                                                    Mobile: <span className="text-gray-600">{addr.mobile || addr.phone}</span>
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            {/* Map View */}
                            <div className="flex-1 relative min-h-[300px]">
                                {position && (
                                    <MapContainer
                                        center={position}
                                        zoom={15}
                                        style={{ height: '100%', width: '100%' }}
                                        scrollWheelZoom={true}
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        <LocationMarker
                                            position={position}
                                            setPosition={setPosition}
                                            setAddress={setFetchedAddress}
                                        />
                                    </MapContainer>
                                )}

                                {/* Map Overlay Controls */}
                                <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                                    <button
                                        onClick={handleUseCurrentLocation}
                                        className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-black hover:bg-gray-50 active:scale-95 transition-all"
                                        title="Recenter to my location"
                                    >
                                        <MapPin size={20} className="text-red-500" />
                                    </button>
                                </div>

                                {/* Info Overlay on Map */}
                                <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-2xl shadow-lg z-[1000] border border-gray-100">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center shrink-0 mt-1">
                                            <MapPin size={16} className="text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Selected Location</p>
                                            <p className="text-sm font-bold text-gray-900 line-clamp-2 mt-1">
                                                {fetchedAddress ? fetchedAddress.formatted : 'Fetching address...'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0 z-20">
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedAddressId && view === 'list'}
                        className="w-full py-4 bg-black text-white rounded-[20px] font-black text-[13px] uppercase tracking-[0.2em] hover:bg-[#1a1a1a] active:scale-95 transition-all shadow-xl disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                    >
                        {view === 'map' ? 'Confirm Pinned Location' : 'Confirm Location'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LocationModal;
