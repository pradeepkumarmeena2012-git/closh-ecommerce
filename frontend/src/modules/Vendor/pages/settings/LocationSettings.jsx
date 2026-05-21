import { useState, useEffect } from "react";
import { FiMapPin, FiNavigation, FiSave, FiCheckCircle } from "react-icons/fi";
import { motion } from "framer-motion";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import toast from "react-hot-toast";

const LocationSettings = () => {
    const { vendor, updateLocation, updateProfile } = useVendorAuthStore();
    const [coordinates, setCoordinates] = useState({
        latitude: "",
        longitude: "",
    });
    const [shopAddress, setShopAddress] = useState("");
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    useEffect(() => {
        if (vendor?.shopLocation?.coordinates) {
            setCoordinates({
                latitude: vendor.shopLocation.coordinates[1] || "",
                longitude: vendor.shopLocation.coordinates[0] || "",
            });
        }
        if (vendor?.address?.street) {
            setShopAddress(vendor.address.street);
        }
    }, [vendor]);

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setCoordinates({
                    latitude: lat.toString(),
                    longitude: lng.toString(),
                });
                
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const data = await response.json();
                    if (data && data.display_name) {
                        setShopAddress(data.display_name);
                    }
                } catch (err) {
                    console.error("Failed to fetch address", err);
                }

                setIsGettingLocation(false);
                toast.success("Current location & address fetched!");
            },
            (error) => {
                setIsGettingLocation(false);
                toast.error("Error fetching location: " + error.message);
            }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (coordinates.latitude && coordinates.longitude) {
                await updateLocation(
                    parseFloat(coordinates.latitude),
                    parseFloat(coordinates.longitude)
                );
            }
            await updateProfile({ address: { ...vendor?.address, street: shopAddress } });
            toast.success("Shop location updated successfully");
        } catch (error) {
            // Error handled by interceptor
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <FiMapPin className="text-blue-600 text-xl mt-1 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold text-blue-900">Shop Location</h3>
                    <p className="text-sm text-blue-700">
                        Provide your real shop address and exact GPS coordinates. This helps customers find your store on the map and improves delivery accuracy.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                        Real Shop Address
                    </label>
                    <textarea
                        value={shopAddress}
                        onChange={(e) => setShopAddress(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none min-h-[100px]"
                        placeholder="Enter your complete shop address (e.g. Shop No. 12, Main Market, Delhi)"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Latitude <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={coordinates.latitude}
                            onChange={(e) => setCoordinates({ ...coordinates, latitude: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g. 28.6139"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Longitude <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={coordinates.longitude}
                            onChange={(e) => setCoordinates({ ...coordinates, longitude: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g. 77.2090"
                        />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={isGettingLocation}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 transition-all font-semibold"
                    >
                        <FiNavigation className={isGettingLocation ? "animate-pulse" : ""} />
                        {isGettingLocation ? "Fetching..." : "Fetch GPS Coordinates & Address"}
                    </button>

                    <button
                        type="submit"
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 hover:shadow-lg transition-all font-semibold"
                    >
                        <FiSave />
                        Save Location
                    </button>
                </div>

                {(shopAddress || (coordinates.latitude && coordinates.longitude)) && (
                    <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-500 mb-2 uppercase font-bold ">Preview</p>
                        <div className="flex flex-col gap-3 text-sm text-gray-700">
                            {shopAddress && (
                                <div className="flex items-center flex-wrap gap-2">
                                    <FiMapPin className="mt-1 text-gray-400" />
                                    <span className="font-medium">{shopAddress}</span>
                                    {vendor?.address?.street === shopAddress && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                            <FiCheckCircle className="text-xs" /> Address Saved
                                        </span>
                                    )}
                                </div>
                            )}
                            {(coordinates.latitude || coordinates.longitude) && (
                                <div className="flex items-center gap-2">
                                    <span className="font-mono bg-white px-2 py-1 rounded border">{coordinates.latitude || 'N/A'}</span>
                                    <span className="text-gray-400">,</span>
                                    <span className="font-mono bg-white px-2 py-1 rounded border">{coordinates.longitude || 'N/A'}</span>
                                    {vendor?.shopLocation?.coordinates &&
                                        coordinates.latitude && coordinates.longitude &&
                                        parseFloat(coordinates.latitude) === vendor.shopLocation.coordinates[1] &&
                                        parseFloat(coordinates.longitude) === vendor.shopLocation.coordinates[0] && (
                                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                                <FiCheckCircle className="text-xs" /> Coordinates Saved
                                            </span>
                                        )}
                                    {coordinates.latitude && coordinates.longitude && (
                                        <a
                                            href={`https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-auto text-purple-600 hover:underline flex items-center gap-1"
                                        >
                                            View on Google Maps
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </form>
        </motion.div>
    );
};

export default LocationSettings;
