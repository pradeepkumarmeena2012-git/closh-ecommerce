import React, { useState, useEffect, useRef, useMemo } from 'react';
import AccountLayout from '../../components/Profile/AccountLayout';
import { MapPin, Search, X, Home, Briefcase, MapPin as MapPinIcon, ChevronLeft, Loader2, Navigation, Target, Plus } from 'lucide-react';
import { useLocation as useLocationContext } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
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

const REVERSE_GEOCODE_URL = 'https://nominatim.openstreetmap.org/reverse?format=json';
const SEARCH_URL = 'https://nominatim.openstreetmap.org/search?format=json&q=';

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

const AddressesPage = () => {
    const { addresses, refreshAddresses } = useLocationContext();
    const { user } = useAuth();
    const [view, setView] = useState('list'); // 'list' | 'map' | 'form'
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [mapPosition, setMapPosition] = useState({ lat: 20.5937, lng: 78.9629 }); // Center of India
    const [fetchedAddress, setFetchedAddress] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const [newAddress, setNewAddress] = useState({
        name: '',
        mobile: user?.mobile || '',
        pincode: '',
        address: '',
        locality: '',
        city: '',
        state: '',
        type: 'Home'
    });

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const response = await fetch(`${SEARCH_URL}${encodeURIComponent(searchQuery + ', India')}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const first = data[0];
                const newPos = { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
                setMapPosition(newPos);
                fetchAddress(newPos.lat, newPos.lng, setFetchedAddress);
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleConfirmLocation = () => {
        if (fetchedAddress) {
            setNewAddress({
                ...newAddress,
                pincode: fetchedAddress.pincode || '',
                city: fetchedAddress.city || '',
                state: fetchedAddress.state || '',
                locality: fetchedAddress.locality || '',
                address: fetchedAddress.formatted.split(',')[0] || ''
            });
            setView('form');
        } else {
            setView('form');
        }
    };

    const handleUseCurrentLocation = () => {
        setLoadingLocation(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setMapPosition({ lat: latitude, lng: longitude });
                    fetchAddress(latitude, longitude, setFetchedAddress);
                    setLoadingLocation(false);
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

    const handleSave = (e) => {
        e.preventDefault();
        const existing = JSON.parse(localStorage.getItem('userAddresses') || '[]');
        const updated = [...existing, { ...newAddress, id: Date.now() }];
        localStorage.setItem('userAddresses', JSON.stringify(updated));
        refreshAddresses();
        setView('list');
        setNewAddress({ name: '', mobile: user?.mobile || '', pincode: '', address: '', locality: '', city: '', state: '', type: 'Home' });
        setFetchedAddress(null);
    };

    return (
        <AccountLayout>
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold">
                        {view === 'list' ? 'Saved Addresses' : view === 'map' ? 'Pin Location' : 'Add New Address'}
                    </h2>
                    {view !== 'list' && (
                        <button onClick={() => setView('list')} className="text-gray-400 hover:text-black flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                            <ChevronLeft size={16} /> Back
                        </button>
                    )}
                </div>

                {view === 'map' ? (
                    <div className="animate-fadeIn h-[600px] flex flex-col relative rounded-[32px] overflow-hidden border border-gray-100 shadow-sm">
                        {/* Map Search Box */}
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-[500px]">
                            <form onSubmit={handleSearch} className="relative group">
                                <input
                                    type="text"
                                    placeholder="Search your building name, street, area"
                                    className="w-full h-14 bg-white/95 backdrop-blur-md rounded-2xl px-12 text-[14px] font-bold shadow-2xl border border-gray-100 outline-none focus:border-black transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-black animate-spin" size={18} />}
                            </form>
                        </div>

                        {/* Map Container */}
                        <div className="flex-1 relative">
                            <MapContainer
                                center={mapPosition}
                                zoom={view === 'map' ? 15 : 5}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <LocationMarker
                                    position={mapPosition}
                                    setPosition={setMapPosition}
                                    setAddress={setFetchedAddress}
                                />
                            </MapContainer>

                            {/* Current Location Button Overlay */}
                            <div className="absolute top-24 right-5 z-[1000]">
                                <button
                                    onClick={handleUseCurrentLocation}
                                    className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-black hover:bg-gray-50 active:scale-90 transition-all border border-gray-100"
                                >
                                    {loadingLocation ? <Loader2 size={24} className="animate-spin" /> : <Target size={24} className="text-black" />}
                                </button>
                            </div>

                            {/* Selection Detail Overlay */}
                            {fetchedAddress && (
                                <div className="absolute bottom-6 left-6 right-6 bg-white p-4 rounded-2xl shadow-2xl z-[1000] border border-gray-100 flex items-start gap-3 animate-fadeInUp">
                                    <div className="p-2.5 bg-red-50 rounded-xl">
                                        <MapPinIcon size={20} className="text-red-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Selected Location</h4>
                                        <p className="text-[13px] font-bold text-gray-900 leading-tight">
                                            {fetchedAddress.formatted}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Confirm */}
                        <div className="p-6 bg-white border-t border-gray-50">
                            <button
                                onClick={handleConfirmLocation}
                                className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-[0.1em] shadow-xl hover:bg-gray-800 transition-all active:scale-[0.98]"
                            >
                                Confirm & Continue
                            </button>
                        </div>
                    </div>
                ) : view === 'form' ? (
                    <div className="animate-fadeInUp">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-800">Complete Address Details</h3>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4 max-w-[600px]">
                            {/* Auto-filled Location Info */}
                            {fetchedAddress && (
                                <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mb-6 flex items-start gap-4">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <MapPinIcon size={16} className="text-emerald-500" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Pinned Location</p>
                                        <p className="text-[12px] font-bold text-gray-600 italic">
                                            {fetchedAddress.formatted}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setView('map')}
                                        className="text-[10px] font-black text-blue-600 uppercase pt-1"
                                    >
                                        Change
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Name"
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-black transition-all font-bold"
                                        value={newAddress.name}
                                        onChange={e => setNewAddress({ ...newAddress, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Mobile Number</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Mobile Number"
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-black transition-all font-bold"
                                        value={newAddress.mobile}
                                        onChange={e => setNewAddress({ ...newAddress, mobile: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Pincode</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Pincode"
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-black transition-all font-bold"
                                        value={newAddress.pincode}
                                        onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Locality / Town</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Locality / Town"
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-black transition-all font-bold"
                                        value={newAddress.locality}
                                        onChange={e => setNewAddress({ ...newAddress, locality: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Flat / House / Building Details</label>
                                <textarea
                                    required
                                    placeholder="Address (House No, Building, Street, Area)"
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-black transition-all h-24 resize-none font-bold"
                                    value={newAddress.address}
                                    onChange={e => setNewAddress({ ...newAddress, address: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">City</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="City / District"
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-black transition-all font-bold"
                                        value={newAddress.city}
                                        onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">State</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="State"
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-black transition-all font-bold"
                                        value={newAddress.state}
                                        onChange={e => setNewAddress({ ...newAddress, state: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Address Type</h4>
                                <div className="flex gap-4">
                                    {['Home', 'Work'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setNewAddress({ ...newAddress, type })}
                                            className={`flex-1 h-14 rounded-2xl text-[12px] font-black uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-3 ${newAddress.type === type ? 'bg-black text-white border-black shadow-lg scale-[1.02]' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                                }`}
                                        >
                                            {type === 'Home' ? <Home size={16} /> : <Briefcase size={16} />}
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] mt-8 shadow-2xl hover:bg-[#1a1a1a] transition-all hover:scale-[1.02] active:scale-[0.98]">
                                Save Address
                            </button>
                        </form>
                    </div>
                ) : addresses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                        <div className="relative mb-6">
                            <div className="w-48 h-48 bg-gray-50 rounded-full flex items-center justify-center border border-dashed border-gray-200">
                                <Search size={64} className="text-gray-200 rotate-12" />
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <MapPin size={80} className="text-gray-300 opacity-50" />
                            </div>
                        </div>
                        <p className="text-gray-900 font-black uppercase tracking-tight mb-8">You don't have any saved addresses</p>
                        <button onClick={() => setView('map')} className="w-full py-4 bg-black text-white rounded-2xl font-black text-[14px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl active:scale-95">
                            Add New Address
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses.map(addr => (
                            <div key={addr.id} className="p-6 border border-gray-100 rounded-[28px] bg-white flex flex-col items-start gap-4 hover:border-black transition-all group relative overflow-hidden">
                                {addr.isCurrentLocation && (
                                    <div className="absolute top-4 right-4 bg-red-100 text-red-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">Current</div>
                                )}
                                <div className="flex items-center gap-4 w-full">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                                        {addr.type === 'Home' ? <Home size={20} className="stroke-[2.5]" /> : <Briefcase size={20} className="stroke-[2.5]" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-black text-gray-900 uppercase tracking-tight">{addr.name}</span>
                                            <span className="text-[9px] font-black bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-widest text-gray-500">{addr.type}</span>
                                        </div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Mobile: {addr.mobile || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="w-full pt-4 border-t border-gray-50">
                                    <p className="text-[13px] font-medium text-gray-600 leading-relaxed mb-3 pr-4">
                                        {addr.address}, {addr.locality}, {addr.city}, {addr.state} - <span className="text-gray-900 font-extrabold">{addr.pincode}</span>
                                    </p>
                                    <div className="flex gap-3">
                                        <button className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors">Edit</button>
                                        <button
                                            onClick={() => {
                                                const existing = JSON.parse(localStorage.getItem('userAddresses') || '[]');
                                                const updated = existing.filter(a => a.id !== addr.id);
                                                localStorage.setItem('userAddresses', JSON.stringify(updated));
                                                refreshAddresses();
                                            }}
                                            className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => setView('map')} className="md:col-span-1 h-[200px] border-2 border-dashed border-gray-100 rounded-[28px] flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-black hover:text-black transition-all bg-gray-50/50">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                <Plus size={24} />
                            </div>
                            <span className="text-[12px] font-black uppercase tracking-[0.2em]">Add New Address</span>
                        </button>
                    </div>
                )}
            </div>
        </AccountLayout>
    );
};

export default AddressesPage;
