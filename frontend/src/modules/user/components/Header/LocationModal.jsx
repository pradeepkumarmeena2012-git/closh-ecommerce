import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
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

    // Auto-open logic for post-login
    const [isAutoOpen, setIsAutoOpen] = useState(false);

    useEffect(() => {
        const handleAutoOpen = () => setIsAutoOpen(true);
        window.addEventListener('openLocationModal', handleAutoOpen);
        return () => window.removeEventListener('openLocationModal', handleAutoOpen);
    }, []);

    const isModalOpen = isOpen || isAutoOpen;

    const handleClose = () => {
        if (isAutoOpen) setIsAutoOpen(false);
        if (onClose) onClose();
    };

    const [selectedAddressId, setSelectedAddressId] = useState(activeAddress?.id || null);

    // Map State
    const [view, setView] = useState('list'); // 'list' | 'map'
    const [position, setPosition] = useState(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [fetchedAddress, setFetchedAddress] = useState(null);

    // Refresh addresses when modal opens
    useEffect(() => {
        if (isModalOpen) {
            refreshAddresses();
            setView('list'); // Reset view on open
        }
    }, [isModalOpen, refreshAddresses]);

    // Update selection when activeAddress changes
    useEffect(() => {
        if (activeAddress) setSelectedAddressId(activeAddress.id);
    }, [activeAddress]);

    if (!isModalOpen) return null;

    const handleAddNew = () => {
        if (!isMandatory) handleClose();
        if (!user) {
            window.dispatchEvent(new Event('openLoginModal'));
        } else {
            navigate('/addresses');
        }
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
            handleClose();
            refreshAddresses();
        } else {
            const selected = addresses.find(a => a.id === selectedAddressId);
            if (selected) {
                updateActiveAddress(selected);
            }
            handleClose();
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#111111]/60 backdrop-blur-xl animate-fadeIn">
            {/* Modal Container */}
            <div className={`bg-[#FAFAFA] w-full max-w-[420px] rounded-[36px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] relative flex flex-col max-h-[85vh] overflow-hidden transition-all duration-500 border border-white/40 ${isModalOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'}`}>

                {/* Decorative Top Glow */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50 z-50" />

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-[#FAFAFA] sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        {view === 'map' && (
                            <button onClick={() => setView('list')} className="p-2 bg-white/50 backdrop-blur-md hover:bg-white rounded-full transition-all duration-300 shadow-sm border border-gray-100 text-[#878787] hover:text-[#111111] active:scale-95">
                                <ChevronLeft size={20} strokeWidth={2} />
                            </button>
                        )}
                        <h2 className="font-premium text-[20px] font-bold text-[#111111] tracking-tight">
                            {view === 'map' ? 'Pin Location' : 'Delivery Address'}
                        </h2>
                    </div>
                    {!isMandatory && (
                        <button onClick={handleClose} className="w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white transition-all duration-300 active:scale-95 text-[#878787] hover:text-[#111111] shadow-sm border border-gray-100">
                            <X size={20} strokeWidth={2} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-[#FAFAFA] relative scrollbar-nano">
                    {view === 'list' ? (
                        <div className="p-6 space-y-6">

                            {/* Use Current Location */}
                            <button
                                onClick={handleUseCurrentLocation}
                                disabled={loadingLocation}
                                className="w-full bg-white p-5 rounded-[24px] shadow-sm border border-gray-200 flex items-center gap-4 group active:scale-[0.98] transition-all duration-300 hover:shadow-md hover:border-[#D4AF37]/30 disabled:opacity-60"
                            >
                                <div className="w-12 h-12 bg-[#111111] rounded-full flex items-center justify-center group-hover:bg-[#1A1A1A] group-hover:scale-105 transition-all duration-300 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[#D4AF37]/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    {loadingLocation ? <Loader2 size={20} className="text-[#D4AF37] animate-spin relative z-10" /> : <MapPin size={22} className="text-[#D4AF37] relative z-10" strokeWidth={2.5} />}
                                </div>
                                <div className="text-left flex-1">
                                    <h4 className="text-[14px] font-bold text-[#111111] group-hover:text-[#D4AF37] transition-colors">
                                        {loadingLocation ? 'Fetching location...' : 'Current Location'}
                                    </h4>
                                    <p className="text-[12px] font-medium text-[#878787] mt-0.5">Use GPS for accurate delivery</p>
                                </div>
                                <div className="px-2">
                                    <ChevronLeft size={16} className="text-[#D4AF37] rotate-180 opacity-0 group-hover:opacity-100 transition-opacity group-hover:translate-x-1 duration-300" strokeWidth={3} />
                                </div>
                            </button>

                            {/* Saved Addresses */}
                            <div>
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#878787]">Saved Addresses</h3>
                                    <button
                                        onClick={handleAddNew}
                                        className="text-[12px] font-bold text-[#111111] hover:text-[#D4AF37] transition-colors flex items-center gap-1"
                                    >
                                        + Add New
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {addresses.length === 0 ? (
                                        <div className="bg-white p-10 rounded-[28px] border border-dashed border-gray-200/80 text-center flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                                <MapPin size={20} className="text-[#878787]" />
                                            </div>
                                            <p className="text-[14px] font-bold text-[#111111] mb-1">No addresses found</p>
                                            <p className="text-[12px] font-medium text-[#878787] mb-4">Please add a location to proceed</p>
                                            <button onClick={handleAddNew} className="text-[#111111] font-bold text-[13px] bg-white border border-gray-200 px-5 py-2 rounded-full hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all shadow-sm">
                                                Add Address
                                            </button>
                                        </div>
                                    ) : (
                                        addresses.map((addr) => (
                                            <div
                                                key={addr.id}
                                                onClick={() => setSelectedAddressId(addr.id)}
                                                className={`relative p-5 bg-white rounded-[24px] border-2 cursor-pointer transition-all duration-300 active:scale-[0.99] group ${selectedAddressId === addr.id ? 'border-[#D4AF37] shadow-[0_8px_16px_rgba(212,175,55,0.1)]' : 'border-transparent shadow-sm hover:shadow-md hover:border-gray-200'}`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-[15px] font-bold text-[#111111]">{addr.name}</h4>
                                                        <span className="bg-gray-50 text-[#878787] border border-gray-100 text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg tracking-wide">{addr.type}</span>
                                                    </div>
                                                    {selectedAddressId === addr.id && (
                                                        <div className="w-6 h-6 bg-[#111111] rounded-full flex items-center justify-center shadow-sm">
                                                            <CheckCircle2 size={14} className="text-[#D4AF37]" strokeWidth={2.5} />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[13px] text-[#878787] font-medium leading-relaxed pr-8 line-clamp-2">
                                                    {addr.address}, {addr.city}
                                                </p>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <span className="text-[12px] font-semibold text-[#111111] bg-gray-50 px-2.5 py-1 rounded-md">{addr.pincode}</span>
                                                    <span className="text-[12px] text-[#878787] font-medium">
                                                        Mobile: <span className="text-[#111111] font-semibold">{addr.mobile || addr.phone || '-'}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            {/* Map View */}
                            <div className="flex-1 relative min-h-[350px]">
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
                                        className="w-12 h-12 bg-[#111111] rounded-full shadow-lg flex items-center justify-center hover:bg-[#1A1A1A] active:scale-95 transition-all group"
                                        title="Recenter to my location"
                                    >
                                        <MapPin size={20} className="text-[#D4AF37] group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>

                                {/* Info Overlay on Map */}
                                <div className="absolute bottom-5 left-5 right-5 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl z-[1000] border border-white">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-[#111111] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                            <MapPin size={18} className="text-[#D4AF37]" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-[#878787] uppercase tracking-wider">Selected Location</p>
                                            <p className="text-[14px] font-bold text-[#111111] line-clamp-2 mt-0.5 leading-snug">
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
                <div className="p-6 bg-[#FAFAFA] border-t border-gray-200/50 sticky bottom-0 z-40">
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedAddressId && view === 'list'}
                        className="w-full py-4 bg-[#111111] text-white rounded-[20px] font-premium font-bold text-[15px] tracking-wide shadow-[0_8px_20px_rgba(17,17,17,0.2)] hover:bg-[#1A1A1A] hover:shadow-[0_12px_24px_rgba(17,17,17,0.3)] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none group relative overflow-hidden"
                    >
                        {/* Button Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />

                        <span className="relative z-10">{view === 'map' ? 'Confirm Pinned Location' : 'Confirm Selection'}</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LocationModal;
