import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, CheckCircle2, ChevronLeft, Loader2, Home, Briefcase, Search, Target } from 'lucide-react';
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

// Geocoding via internal API proxy
const GEOCODE_PROXY_URL = '/geocode';

const getAddressFromCoords = async (lat, lng) => {
    try {
        const response = await api.get(`${GEOCODE_PROXY_URL}?lat=${lat}&lon=${lng}`);
        const data = response?.data || response;
        if (data && data.display_name) {
            const addr = data.address || {};
            return {
                formatted: data.display_name,
                pincode: addr.postcode || '',
                city: addr.city || addr.town || addr.village || '',
                state: addr.state || '',
                locality: addr.suburb || addr.neighbourhood || addr.road || '',
                raw: data
            };
        }
    } catch (error) {
        console.error("Error fetching address:", error);
    }
    return null;
};

const LocationMarker = ({ position, setPosition, onAddressFetched }) => {
    const markerRef = useRef(null);
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            getAddressFromCoords(e.latlng.lat, e.latlng.lng).then(onAddressFetched);
        }
    });

    const eventHandlers = useMemo(() => ({
        dragend() {
            const marker = markerRef.current;
            if (marker != null) {
                const newPos = marker.getLatLng();
                setPosition(newPos);
                getAddressFromCoords(newPos.lat, newPos.lng).then(onAddressFetched);
            }
        },
    }), [setPosition, onAddressFetched]);

    useEffect(() => {
        if (position) map.flyTo(position, map.getZoom());
    }, [position, map]);

    return position === null ? null : (
        <Marker draggable={true} eventHandlers={eventHandlers} position={position} ref={markerRef} />
    );
};

const LocationModal = ({ isOpen, onClose, isMandatory = false }) => {
    const { addresses, activeAddress, updateActiveAddress, refreshAddresses } = useUserLocation();
    const { user } = useAuth();
    const [isAutoOpen, setIsAutoOpen] = useState(false);

    useEffect(() => {
        const handleOpen = () => setIsAutoOpen(true);
        window.addEventListener('openLocationModal', handleOpen);
        return () => window.removeEventListener('openLocationModal', handleOpen);
    }, []);

    const isModalOpen = isOpen || isAutoOpen;
    const handleClose = () => {
        if (isAutoOpen) setIsAutoOpen(false);
        if (onClose) onClose();
    };

    const [view, setView] = useState('list'); // 'list' | 'map' | 'form'
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [position, setPosition] = useState(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [fetchedAddress, setFetchedAddress] = useState(null);

    const [formData, setFormData] = useState({
        name: user?.fullName || user?.name || '',
        mobile: user?.phone || user?.mobile || '',
        pincode: '',
        address: '', 
        locality: '',
        city: '',
        state: '',
        type: 'Home'
    });

    useEffect(() => {
        if (isModalOpen) {
            refreshAddresses(); // Refresh data once when modal opens
            setView('list');    // Reset to list view
            // No longer checking activeAddress here to avoid loop
        }
    }, [isModalOpen]);

    // Separate effect to handle initial selection when activeAddress is loaded
    useEffect(() => {
        if (isModalOpen && activeAddress && !selectedAddressId) {
            setSelectedAddressId(activeAddress.id || activeAddress._id);
        }
    }, [isModalOpen, activeAddress, selectedAddressId]);

    const handleAddNew = () => {
        if (!user) {
            handleClose();
            window.dispatchEvent(new Event('openLoginModal'));
        } else {
            // Direct to form as requested
            setFormData({
                name: user?.fullName || user?.name || '',
                mobile: user?.phone || user?.mobile || '',
                pincode: '',
                address: '',
                locality: '',
                city: '',
                state: '',
                type: 'Home'
            });
            setView('form');
        }
    };

    const handleUseCurrentLocation = () => {
        setLoadingLocation(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    const addr = await getAddressFromCoords(latitude, longitude);
                    if (addr) {
                        setFetchedAddress(addr);
                        setPosition({ lat: latitude, lng: longitude });
                        setView('map'); // High precision mapping step
                    }
                    setLoadingLocation(false);
                },
                (err) => {
                    toast.error("Location permission denied.");
                    setLoadingLocation(false);
                },
                { enableHighAccuracy: true }
            );
        } else {
            setLoadingLocation(false);
        }
    };

    const handleConfirm = async () => {
        if (view === 'map' && fetchedAddress) {
            // Transition from Map to Form if user was pinning
            setFormData(prev => ({
                ...prev,
                pincode: fetchedAddress.pincode || '',
                city: fetchedAddress.city || '',
                state: fetchedAddress.state || '',
                locality: fetchedAddress.locality || '',
                address: fetchedAddress.formatted
            }));
            setView('form');
        } else if (view === 'form') {
            // Final Submit
            if (!formData.address || !formData.name || !formData.mobile) {
                toast.error('Please fill in required fields');
                return;
            }
            if (formData.address.trim().length < 5) {
                toast.error('Address is too short');
                return;
            }
            if (formData.mobile.length !== 10) {
                toast.error('Invalid mobile number');
                return;
            }

            const newAddressData = {
                name: formData.type || "Home",
                fullName: formData.name,
                phone: formData.mobile,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zipCode: formData.pincode,
                country: "India",
                type: formData.type,
                isDefault: true
            };

            try {
                if (user) {
                    const created = await useAddressStore.getState().addAddress(newAddressData);
                    if (created) {
                        updateActiveAddress(created);
                        toast.success('Address saved & selected');
                    }
                } else {
                    const newAddr = { ...newAddressData, id: Date.now() };
                    const existing = JSON.parse(localStorage.getItem('userAddresses') || '[]');
                    localStorage.setItem('userAddresses', JSON.stringify([newAddr, ...existing]));
                    updateActiveAddress(newAddr);
                }
                handleClose();
                refreshAddresses();
            } catch (error) {
                const msg = error.response?.data?.errors?.[0]?.message || "Failed to save address.";
                toast.error(msg);
            }
        } else {
            // List Confirm
            const selected = addresses.find(a => String(a.id || a._id) === String(selectedAddressId));
            if (selected) {
                updateActiveAddress(selected);
                toast.success('Address selected');
            }
            handleClose();
        }
    };

    if (!isModalOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
            <div className={`bg-white w-full max-w-[440px] relative flex flex-col h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[32px] overflow-hidden transition-all duration-300 shadow-2xl ${isModalOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0'}`}>
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white sticky top-0 z-50">
                    <div className="flex items-center gap-3">
                        {view !== 'list' && (
                            <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ChevronLeft size={20} className="text-black" />
                            </button>
                        )}
                        <h2 className="text-[18px] font-bold text-black uppercase ">
                            {view === 'map' ? 'Adjust Pin' : view === 'form' ? 'Address Details' : 'Select Address'}
                        </h2>
                    </div>
                    {!isMandatory && (
                        <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50/30">
                    {view === 'list' && (
                        <div className="p-5 space-y-6 animate-fadeIn">
                            {/* Actions */}
                            <div className="space-y-3">
                                <button
                                    onClick={handleUseCurrentLocation}
                                    disabled={loadingLocation}
                                    className="w-full bg-white p-4 rounded-2xl shadow-sm border border-emerald-50 flex items-center justify-between group active:scale-[0.98] transition-all hover:border-emerald-200"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                            {loadingLocation ? <Loader2 size={18} className="animate-spin" /> : <Target size={20} />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[14px] font-bold text-black uppercase ">Current Location</p>
                                            <p className="text-[11px] font-bold text-emerald-600/70">Using GPS / Precise location</p>
                                        </div>
                                    </div>
                                    <ChevronLeft size={16} className="rotate-180 text-gray-300" />
                                </button>

                                <button
                                    onClick={handleAddNew}
                                    className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group active:scale-[0.98] transition-all hover:border-black/10"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-all">
                                            <MapPin size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[14px] font-bold text-black uppercase ">Add New Address</p>
                                            <p className="text-[11px] font-bold text-gray-400">Manual building details</p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-black uppercase ">Add +</span>
                                </button>
                            </div>

                            {/* Saved List */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Your Addresses</h3>
                                <div className="space-y-3">
                                    {addresses.map(addr => (
                                        <div
                                            key={addr.id || addr._id}
                                            onClick={() => setSelectedAddressId(addr.id || addr._id)}
                                            className={`p-4 bg-white rounded-2xl border-2 transition-all cursor-pointer relative group ${String(selectedAddressId) === String(addr.id || addr._id) ? 'border-black' : 'border-transparent shadow-sm'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${String(selectedAddressId) === String(addr.id || addr._id) ? 'bg-black' : 'bg-gray-200'}`} />
                                                    <span className="text-[11px] font-bold uppercase text-gray-400">{addr.type}</span>
                                                </div>
                                                {addr.isDefault && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase ">Default</span>}
                                            </div>
                                            <p className="text-[14px] font-bold text-black mb-1">{addr.fullName}</p>
                                            <p className="text-[12px] text-gray-500 line-clamp-1 italic ">{addr.address}</p>
                                            <p className="text-[12px] font-bold text-black mt-2">{addr.city}, {addr.zipCode}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'map' && (
                        <div className="h-[400px] sm:h-[450px] relative animate-fadeIn">
                             <MapContainer center={position || [22.7196, 75.8577]} zoom={15} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <LocationMarker position={position} setPosition={setPosition} onAddressFetched={setFetchedAddress} />
                            </MapContainer>
                            <div className="absolute bottom-5 left-5 right-5 bg-white p-4 rounded-2xl shadow-2xl z-[1000] border border-gray-100 flex items-start gap-3">
                                <MapPin size={20} className="text-black shrink-0 mt-1" />
                                <p className="text-[12px] font-bold text-black line-clamp-3">
                                    {fetchedAddress ? fetchedAddress.formatted : 'Touch point on map to adjust...'}
                                </p>
                            </div>
                        </div>
                    )}

                    {view === 'form' && (
                        <div className="p-6 space-y-5 animate-fadeInUp">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:border-black font-bold text-[13px] " placeholder="Full Name" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Mobile No</label>
                                    <input type="text" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:border-black font-bold text-[13px] " placeholder="10-digit number" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Address / Building / Landmark</label>
                                <textarea 
                                    rows="3" 
                                    value={formData.address} 
                                    onChange={e => setFormData({...formData, address: e.target.value})} 
                                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:border-black font-bold text-[13px]  resize-none" 
                                    placeholder="Enter complete address details..." 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">City</label>
                                    <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:border-black font-bold text-[13px] " placeholder="City" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Pincode</label>
                                    <input type="text" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:border-black font-bold text-[13px] " placeholder="Pincode" />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-2">
                                {['Home', 'Work'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setFormData({...formData, type: t})}
                                        className={`flex-1 py-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 font-bold text-[13px] uppercase  ${formData.type === t ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                                    >
                                        {t === 'Home' ? <Home size={16} /> : <Briefcase size={16} />}
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-white border-t border-gray-100 sticky bottom-0 z-50">
                    <button
                        onClick={handleConfirm}
                        disabled={view === 'list' && !selectedAddressId}
                        className="w-full py-4 bg-black text-white rounded-2xl font-bold text-[15px] shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 uppercase "
                    >
                        {view === 'list' ? 'Confirm Selection' : view === 'map' ? 'Confirm Location' : 'Save & Select Address'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LocationModal;
