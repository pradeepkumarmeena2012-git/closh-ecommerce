import ServiceArea from '../models/ServiceArea.model.js';
import PincodeServiceability from '../models/PincodeServiceability.model.js';
import ApiError from '../utils/ApiError.js';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Array} coords1 - [longitude, latitude]
 * @param {Array} coords2 - [longitude, latitude]
 * @returns {Number} Distance in kilometers
 */
const calculateDistance = (coords1, coords2) => {
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
};

/**
 * Check if service is available for given location
 * Priority order: Pincode > Coordinates > City name
 * 
 * @param {Object} options - { pincode, coordinates, city }
 * @returns {Object} Serviceability result
 */
export const checkServiceAvailability = async ({ pincode, coordinates, city }) => {
    // Method 1: Check by Pincode (Most accurate)
    if (pincode) {
        const pincodeData = await PincodeServiceability.findOne({ 
            pincode: pincode.trim(), 
            isServiceable: true 
        }).populate('serviceAreaId');
        
        if (pincodeData && pincodeData.serviceAreaId?.isActive) {
            const deliverySettings = pincodeData.getDeliverySettings();
            
            return {
                isServiceable: true,
                serviceArea: pincodeData.serviceAreaId,
                pincode: pincodeData.pincode,
                locality: pincodeData.locality,
                deliveryZone: pincodeData.deliveryZone,
                serviceType: pincodeData.serviceType,
                deliverySettings,
                message: `We deliver to ${pincodeData.locality || pincodeData.pincode}!`,
                method: 'pincode'
            };
        }
    }
    
    // Method 2: Check by Coordinates (Geospatial)
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2 && coordinates[0] !== 0) {
        try {
            // Find nearest active service area
            const nearestArea = await ServiceArea.findOne({
                isActive: true,
                coordinates: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: coordinates // [lng, lat]
                        },
                        $maxDistance: 50000 // 50km radius
                    }
                }
            });
            
            if (nearestArea) {
                const distance = calculateDistance(coordinates, nearestArea.coordinates.coordinates);
                
                // Check if within delivery radius
                if (distance <= (nearestArea.deliverySettings.maxDeliveryRadius || 10)) {
                    return {
                        isServiceable: true,
                        serviceArea: nearestArea,
                        distance: Math.round(distance * 10) / 10,
                        deliverySettings: nearestArea.deliverySettings,
                        message: `We deliver to your location! (~${Math.round(distance)} km from ${nearestArea.name})`,
                        method: 'coordinates',
                        note: 'Please provide pincode for accurate delivery information'
                    };
                } else {
                    return {
                        isServiceable: false,
                        nearestArea: {
                            name: nearestArea.name,
                            distance: Math.round(distance * 10) / 10,
                            message: nearestArea.displayMessage || `Sorry, you're outside our delivery radius for ${nearestArea.name}.`
                        },
                        message: `Sorry, we don't deliver to your location yet.`,
                        method: 'coordinates'
                    };
                }
            }
        } catch (error) {
            console.error('Geospatial query error:', error);
            // Continue to city-based check
        }
    }
    
    // Method 3: Check by City name (Least accurate)
    if (city && city.trim()) {
        const serviceArea = await ServiceArea.findOne({ 
            name: new RegExp(`^${city.trim()}$`, 'i'), 
            isActive: true 
        });
        
        if (serviceArea) {
            return {
                isServiceable: true,
                serviceArea,
                deliverySettings: serviceArea.deliverySettings,
                message: `We deliver to ${serviceArea.name}!`,
                method: 'city',
                note: 'Please provide pincode for accurate delivery time and charges',
                requiresPincode: true
            };
        }
    }
    
    // Not serviceable - find nearest area to suggest
    const nearestArea = await ServiceArea.findOne({ 
        isActive: true,
        serviceType: 'full'
    }).sort({ 'stats.totalOrders': -1 });
    
    const comingSoonAreas = await ServiceArea.find({
        serviceType: 'coming_soon'
    }).sort({ estimatedLaunchDate: 1 }).limit(3);
    
    return {
        isServiceable: false,
        message: 'Sorry, we don\'t deliver to your area yet.',
        alternativeMessage: 'We\'re expanding rapidly! Enter your email to get notified when we launch in your area.',
        nearestArea: nearestArea ? {
            name: nearestArea.name,
            state: nearestArea.state,
            message: `We currently serve ${nearestArea.displayName || nearestArea.name}`
        } : null,
        comingSoonAreas: comingSoonAreas.map(area => ({
            name: area.name,
            state: area.state,
            estimatedLaunchDate: area.estimatedLaunchDate,
            message: area.displayMessage
        })),
        method: 'none'
    };
};

/**
 * Validate address for serviceability
 * Throws error if not serviceable
 */
export const validateAddressServiceability = async (address) => {
    const { pincode, city, coordinates } = address;
    
    const result = await checkServiceAvailability({ pincode, coordinates, city });
    
    if (!result.isServiceable) {
        throw new ApiError(400, result.message || 'Service not available in your area');
    }
    
    return result;
};

/**
 * Get all active service areas
 */
export const getAllActiveServiceAreas = async () => {
    return await ServiceArea.find({ 
        isActive: true,
        serviceType: { $in: ['full', 'limited'] }
    })
    .sort({ displayOrder: 1, name: 1 })
    .select('name state country displayOrder serviceType deliverySettings coordinates');
};

/**
 * Get service area by ID
 */
export const getServiceAreaById = async (id) => {
    const serviceArea = await ServiceArea.findById(id);
    if (!serviceArea) {
        throw new ApiError(404, 'Service area not found');
    }
    return serviceArea;
};

/**
 * Get pincodes for a service area
 */
export const getPincodesForServiceArea = async (serviceAreaId, filters = {}) => {
    const query = { serviceAreaId, ...filters };
    
    return await PincodeServiceability.find(query)
        .sort({ pincode: 1 })
        .select('pincode locality deliveryZone isServiceable serviceType stats');
};

/**
 * Check if pincode exists in system (for bulk operations)
 */
export const checkMultiplePincodes = async (pincodes) => {
    const results = [];
    
    for (const pincode of pincodes) {
        const result = await checkServiceAvailability({ pincode });
        results.push({
            pincode,
            isServiceable: result.isServiceable,
            serviceArea: result.serviceArea?.name,
            locality: result.locality,
            zone: result.deliveryZone
        });
    }
    
    return results;
};

/**
 * Update service area stats (called after order completion, user registration, etc.)
 */
export const updateServiceAreaStats = async (serviceAreaId, updates) => {
    const serviceArea = await ServiceArea.findById(serviceAreaId);
    if (!serviceArea) return;
    
    const allowedUpdates = ['totalOrders', 'totalCustomers', 'totalVendors', 'activeDeliveryPartners'];
    
    for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
            serviceArea.stats[key] = (serviceArea.stats[key] || 0) + value;
        }
    }
    
    await serviceArea.save();
};

/**
 * Find nearest serviceable pincodes to given coordinates
 */
export const findNearbyServiceablePincodes = async (coordinates, maxDistance = 5000) => {
    return await PincodeServiceability.find({
        isServiceable: true,
        coordinates: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: coordinates
                },
                $maxDistance: maxDistance // meters
            }
        }
    })
    .populate('serviceAreaId', 'name state')
    .limit(10);
};

export default {
    checkServiceAvailability,
    validateAddressServiceability,
    getAllActiveServiceAreas,
    getServiceAreaById,
    getPincodesForServiceArea,
    checkMultiplePincodes,
    updateServiceAreaStats,
    findNearbyServiceablePincodes
};
