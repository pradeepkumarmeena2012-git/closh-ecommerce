import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { useUserLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { useAddressStore } from '../../../../shared/store/addressStore';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../../../../shared/utils/api';
import toast from 'react-hot-toast';

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

// Force HMR: v2.1
// Geocoding via internal API proxy to avoid CORS
const GEOCODE_PROXY_URL = '/geocode';

const LocationMarker = ({ position, setPosition, setAddress }) => {
    const markerRef = useRef(null);
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            fetchAddress(e.latlng.lat, e.latlng.lng, setAddress);
        }
    });

    const eventHandlers = useMemo(
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
        const response = await api.get(`${GEOCODE_PROXY_URL}?lat=${lat}&lon=${lng}`);
        const data = response?.data || response;
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
        console.error("Error fetching address via proxy:", error);
    }
};

const LocationModal = ({ isOpen, onClose, isMandatory = false }) => {
    const navigate = useNavigate();
    const { addresses, activeAddress, updateActiveAddress, refreshAddresses } = useUserLocation();
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

    const [selectedAddressId, setSelectedAddressId] = useState(activeAddress?.id || activeAddress?._id || null);

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
        if (activeAddress) setSelectedAddressId(activeAddress.id || activeAddress._id);
    }, [activeAddress]);

    if (!isModalOpen) return null;

    const handleAddNew = () => {
        if (!user) {
            handleClose();
            window.dispatchEvent(new Event('openLoginModal'));
            toast.error('Please login to manage your addresses');
            return;
        }
        handleClose();
        navigate('/addresses');
    };

    const handleConfirm = async () => {
        if (view === 'map' && fetchedAddress) {
            // Validate required fields before sending to backend
            if (!fetchedAddress.city || !fetchedAddress.pincode) {
                toast.error('Address is incomplete. Please try moving the pin to a more precise location.');
                return;
            }

            const addressParts = fetchedAddress.formatted.split(',');
            const firstPart = (addressParts[0] || "").trim();
            const secondPart = (addressParts[1] || "").trim();

            // Ensure address is at least 5 chars for backend Joi validation
            let fullDisplayAddress = firstPart;
            if (fullDisplayAddress.length < 5 && secondPart) {
                fullDisplayAddress = `${firstPart}, ${secondPart}`;
            }
            if (fullDisplayAddress.length < 5) {
                fullDisplayAddress = fetchedAddress.formatted.slice(0, 50) || "Near Pinned Location";
            }

            const newAddressData = {
                name: (fetchedAddress.locality || "Current Location").slice(0, 50),
                fullName: (user?.name || user?.fullName || "Customer").slice(0, 80),
                phone: (user?.phone || user?.mobile || "0000000000").replace(/\D/g, '').slice(-10),
                address: fullDisplayAddress.slice(0, 200),
                city: (fetchedAddress.city || firstPart || "City").slice(0, 80),
                state: (fetchedAddress.state || "State").slice(0, 80),
                zipCode: (fetchedAddress.pincode || "000000").slice(0, 12),
                country: "India",
                type: "Current",
                isDefault: true
            };

            try {
                if (user) {
                    const created = await useAddressStore.getState().addAddress(newAddressData);
                    if (created) {
                        updateActiveAddress(created);
                        toast.success('Location saved successfully');
                    }
                } else {
                    // Guest mode
                    const newAddress = {
                        ...newAddressData,
                        id: Date.now(),
                        isCurrentLocation: true
                    };
                    const existingAddresses = JSON.parse(localStorage.getItem('userAddresses') || '[]');
                    localStorage.setItem('userAddresses', JSON.stringify([newAddress, ...existingAddresses]));
                    updateActiveAddress(newAddress);
                }
                handleClose();
                refreshAddresses();
            } catch (error) {
                console.error("Failed to save address:", error);
                const msg = error.response?.data?.message || "Failed to save location. Please enter address manually.";
                toast.error(msg);
            }
        } else {
            const selected = addresses.find(a => String(a.id || a._id) === String(selectedAddressId));
            if (selected) {
                updateActiveAddress(selected);
            }
            handleClose();
        }
    };

    const handleUseCurrentLocation = () => {
        if (!user) {
            handleClose();
            window.dispatchEvent(new Event('openLoginModal'));
            toast.error('Please login to use live location delivery');
            return;
        }
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-white/60 backdrop-blur-xl animate-fadeIn">
            {/* Modal Container */}
            <div className={`bg-[#FAFAFA] w-full max-w-[420px] rounded-[36px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] relative flex flex-col max-h-[85vh] overflow-hidden transition-all duration-500 border border-white/40 ${isModalOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'}`}>

                {/* Decorative Top Glow */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50 z-50" />

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-[#FAFAFA] sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        {view === 'map' && (
                            <button onClick={() => setView('list')} className="p-2 bg-gray-50 hover:bg-white hover:text-black rounded-full transition-all duration-300 shadow-sm border border-gray-100 text-[#878787] hover:text-black active:scale-95">
                                <ChevronLeft size={20} strokeWidth={2} />
                            </button>
                        )}
                        <h2 className=" text-[20px] font-bold text-black ">
                            {view === 'map' ? 'Pin Location' : 'Delivery Address'}
                        </h2>
                    </div>
                    {!isMandatory && (
                        <button onClick={handleClose} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300 active:scale-95 text-[#878787] hover:text-black shadow-sm border border-gray-100">
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
                                className="w-full bg-white p-5 rounded-[24px] shadow-sm border border-gray-200 flex items-center gap-4 group active:scale-[0.98] transition-all duration-300 hover:shadow-md hover:border-black/30 disabled:opacity-60"
                            >
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-black group-hover:scale-105 transition-all duration-300 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-black/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    {loadingLocation ? <Loader2 size={20} className="text-black group-hover:text-white animate-spin relative z-10" /> : <MapPin size={22} className="text-black group-hover:text-white relative z-10" strokeWidth={2.5} />}
                                </div>
                                <div className="text-left flex-1">
                                    <h4 className="text-[14px] font-bold text-black group-hover:text-black transition-colors">
                                        {loadingLocation ? 'Fetching location...' : 'Current Location'}
                                    </h4>
                                    <p className="text-[12px] font-medium text-[#878787] mt-0.5">Use GPS for accurate delivery</p>
                                </div>
                                <div className="px-2">
                                    <ChevronLeft size={16} className="text-black rotate-180 opacity-0 group-hover:opacity-100 transition-opacity group-hover:translate-x-1 duration-300" strokeWidth={3} />
                                </div>
                            </button>

                            {/* Saved Addresses */}
                            <div>
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h3 className="text-[11px] font-bold uppercase  text-[#878787]">Saved Addresses</h3>
                                    <button
                                        onClick={handleAddNew}
                                        className="text-[12px] font-bold text-black hover:text-black transition-colors flex items-center gap-1"
                                    >
                                        + Add New
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {addresses.length === 0 ? (
                                        <div className="bg-white p-10 rounded-[28px] border border-dashed border-gray-200/80 text-center flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3">
                                                <MapPin size={20} className="text-[#878787]" />
                                            </div>
                                            <p className="text-[14px] font-bold text-black mb-1">No addresses found</p>
                                            <p className="text-[12px] font-medium text-[#878787] mb-4">Please add a location to proceed</p>
                                            <button onClick={handleAddNew} className="text-black font-bold text-[13px] bg-white border border-gray-200 px-5 py-2 rounded-full hover:border-black hover:text-black transition-all shadow-sm">
                                                Add Address
                                            </button>
                                        </div>
                                    ) : (
                                        addresses.map((addr) => {
                                            const addrId = addr.id || addr._id;
                                            return (
                                            <div
                                                key={addrId}
                                                onClick={() => setSelectedAddressId(addrId)}
                                                className={`relative p-5 bg-white rounded-[24px] border-2 cursor-pointer transition-all duration-300 active:scale-[0.99] group ${String(selectedAddressId) === String(addrId) ? 'border-black shadow-[0_8px_16px_rgba(212,175,55,0.1)]' : 'border-transparent shadow-sm hover:shadow-md hover:border-gray-200'}`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-[15px] font-bold text-black">{addr.name}</h4>
                                                        <span className="bg-white text-[#878787] border border-gray-100 text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg">{addr.type}</span>
                                                    </div>
                                                    {String(selectedAddressId) === String(addrId) && (
                                                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                            <CheckCircle2 size={14} className="text-black" strokeWidth={2.5} />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[13px] text-[#878787] font-medium leading-relaxed pr-8 line-clamp-2">
                                                    {addr.address}, {addr.city}
                                                </p>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <span className="text-[12px] font-semibold text-black bg-white px-2.5 py-1 rounded-md">{addr.pincode}</span>
                                                    <span className="text-[12px] text-[#878787] font-medium">
                                                        Mobile: <span className="text-black font-semibold">{addr.mobile || addr.phone || '-'}</span>
                                                    </span>
                                                </div>
                                            </div>
                                            );
                                        })
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
                                        className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#1A1A1A] active:scale-95 transition-all group"
                                        title="Recenter to my location"
                                    >
                                        <MapPin size={20} className="text-black group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>

                                {/* Info Overlay on Map */}
                                <div className="absolute bottom-5 left-5 right-5 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl z-[1000] border border-white">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                            <MapPin size={18} className="text-black" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-[#878787] uppercase ">Selected Location</p>
                                            <p className="text-[14px] font-bold text-black line-clamp-2 mt-0.5 leading-snug">
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
                        className="w-full py-4 bg-black text-white rounded-[20px] font-bold text-[15px] shadow-[0_8px_20px_rgba(17,17,17,0.2)] hover:bg-[#1A1A1A] hover:shadow-[0_12px_24px_rgba(17,17,17,0.3)] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none group relative overflow-hidden"
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
