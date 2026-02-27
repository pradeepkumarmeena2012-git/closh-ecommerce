import { useState, useEffect } from "react";
import { FiMapPin, FiNavigation, FiSave, FiCheckCircle } from "react-icons/fi";
import { motion } from "framer-motion";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import toast from "react-hot-toast";

const LocationSettings = () => {
    const { vendor, updateLocation } = useVendorAuthStore();
    const [coordinates, setCoordinates] = useState({
        latitude: "",
        longitude: "",
    });
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    useEffect(() => {
        if (vendor?.location?.coordinates) {
            setCoordinates({
                latitude: vendor.location.coordinates[1] || "",
                longitude: vendor.location.coordinates[0] || "",
            });
        } else if (vendor?.latitude && vendor?.longitude) {
            // Support for flat fields if that's how they are stored
            setCoordinates({
                latitude: vendor.latitude,
                longitude: vendor.longitude
            });
        }
    }, [vendor]);

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCoordinates({
                    latitude: position.coords.latitude.toString(),
                    longitude: position.coords.longitude.toString(),
                });
                setIsGettingLocation(false);
                toast.success("Current location fetched!");
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
            await updateLocation(
                parseFloat(coordinates.latitude),
                parseFloat(coordinates.longitude)
            );
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
                    <h3 className="font-semibold text-blue-900">Shop Location Coordinates</h3>
                    <p className="text-sm text-blue-700">
                        Provide the exact GPS coordinates for your shop. This helps customers find your store on the map and improves delivery accuracy.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Latitude
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={coordinates.latitude}
                            onChange={(e) => setCoordinates({ ...coordinates, latitude: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g. 28.6139"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Longitude
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={coordinates.longitude}
                            onChange={(e) => setCoordinates({ ...coordinates, longitude: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g. 77.2090"
                            required
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
                        {isGettingLocation ? "Fetching..." : "Use Current Location"}
                    </button>

                    <button
                        type="submit"
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 hover:shadow-lg transition-all font-semibold"
                    >
                        <FiSave />
                        Save Location
                    </button>
                </div>

                {coordinates.latitude && coordinates.longitude && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider">Preview</p>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="font-mono bg-white px-2 py-1 rounded border">{coordinates.latitude}</span>
                            <span className="text-gray-400">,</span>
                            <span className="font-mono bg-white px-2 py-1 rounded border">{coordinates.longitude}</span>
                            {vendor?.location?.coordinates &&
                                parseFloat(coordinates.latitude) === vendor.location.coordinates[1] &&
                                parseFloat(coordinates.longitude) === vendor.location.coordinates[0] && (
                                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                        <FiCheckCircle className="text-xs" /> Currently Saved
                                    </span>
                                )}
                            <a
                                href={`https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto text-purple-600 hover:underline flex items-center gap-1"
                            >
                                View on Google Maps
                            </a>
                        </div>
                    </div>
                )}
            </form>
        </motion.div>
    );
};

export default LocationSettings;
