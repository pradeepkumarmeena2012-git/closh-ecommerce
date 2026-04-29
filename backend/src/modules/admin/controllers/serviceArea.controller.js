import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import ServiceArea from '../../../models/ServiceArea.model.js';
import PincodeServiceability from '../../../models/PincodeServiceability.model.js';
import { Order } from '../../../models/Order.model.js';
import { User } from '../../../models/User.model.js';
import * as serviceAreaService from '../../../services/serviceArea.service.js';

/**
 * Get all service areas with filters
 */
export const getAllServiceAreas = asyncHandler(async (req, res) => {
    const { status, serviceType, search } = req.query;
    const filter = {};
    
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (serviceType) filter.serviceType = serviceType;
    if (search) {
        filter.$or = [
            { name: new RegExp(search, 'i') },
            { state: new RegExp(search, 'i') }
        ];
    }
    
    const areas = await ServiceArea.find(filter)
        .sort({ displayOrder: 1, name: 1 });
    
    // Add real-time stats for each area
    const areasWithStats = await Promise.all(areas.map(async (area) => {
        // Count orders in this city
        const orderCount = await Order.countDocuments({
            'shippingAddress.city': { $regex: new RegExp(`^${area.name}$`, 'i') },
            isDeleted: false
        });

        // Count customers preferred this area or in this city
        const customerCount = await User.countDocuments({
            role: 'customer',
            $or: [
                { 'preferredLocation.serviceAreaId': area._id },
                { 'preferredLocation.city': { $regex: new RegExp(`^${area.name}$`, 'i') } }
            ]
        });

        return {
            ...area.toObject(),
            stats: {
                ...area.stats,
                totalOrders: orderCount,
                totalCustomers: customerCount
            }
        };
    }));
    
    res.json(new ApiResponse(200, areasWithStats, 'Service areas fetched successfully'));
});

/**
 * Get service area by ID
 */
export const getServiceAreaById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const serviceArea = await ServiceArea.findById(id);
    if (!serviceArea) {
        throw new ApiError(404, 'Service area not found');
    }
    
    // Get pincode count for this service area
    const pincodeCount = await PincodeServiceability.countDocuments({ serviceAreaId: id });
    const serviceablePincodes = await PincodeServiceability.countDocuments({ 
        serviceAreaId: id, 
        isServiceable: true 
    });
    
    res.json(new ApiResponse(200, {
        ...serviceArea.toObject(),
        pincodeStats: {
            total: pincodeCount,
            serviceable: serviceablePincodes,
            unserviceable: pincodeCount - serviceablePincodes
        }
    }, 'Service area fetched successfully'));
});

/**
 * Create new service area
 */
export const createServiceArea = asyncHandler(async (req, res) => {
    const { 
        name, 
        state, 
        country, 
        coordinates, 
        deliverySettings, 
        businessHours,
        serviceType,
        displayMessage,
        estimatedLaunchDate
    } = req.body;
    
    // Check if service area already exists
    const existingArea = await ServiceArea.findOne({ 
        name: new RegExp(`^${name}$`, 'i'),
        state: new RegExp(`^${state}$`, 'i')
    });
    
    if (existingArea) {
        throw new ApiError(400, 'Service area already exists for this city');
    }
    
    // Create default business hours if not provided
    const defaultBusinessHours = businessHours || [
        { day: 'Monday', openTime: '09:00', closeTime: '21:00', isOpen: true },
        { day: 'Tuesday', openTime: '09:00', closeTime: '21:00', isOpen: true },
        { day: 'Wednesday', openTime: '09:00', closeTime: '21:00', isOpen: true },
        { day: 'Thursday', openTime: '09:00', closeTime: '21:00', isOpen: true },
        { day: 'Friday', openTime: '09:00', closeTime: '21:00', isOpen: true },
        { day: 'Saturday', openTime: '09:00', closeTime: '21:00', isOpen: true },
        { day: 'Sunday', openTime: '09:00', closeTime: '21:00', isOpen: true }
    ];
    
    const serviceArea = await ServiceArea.create({
        name,
        state,
        country: country || 'India',
        coordinates: coordinates || { type: 'Point', coordinates: [0, 0] },
        deliverySettings: deliverySettings || {},
        businessHours: defaultBusinessHours,
        serviceType: serviceType || 'full',
        displayMessage,
        estimatedLaunchDate,
        isActive: true,
        launchDate: new Date()
    });
    
    res.status(201).json(new ApiResponse(201, serviceArea, 'Service area created successfully'));
});

/**
 * Update service area
 */
export const updateServiceArea = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Prevent updating certain fields
    delete updates._id;
    delete updates.createdAt;
    delete updates.stats;
    
    const serviceArea = await ServiceArea.findByIdAndUpdate(
        id, 
        updates, 
        { new: true, runValidators: true }
    );
    
    if (!serviceArea) {
        throw new ApiError(404, 'Service area not found');
    }
    
    res.json(new ApiResponse(200, serviceArea, 'Service area updated successfully'));
});

/**
 * Toggle service area status (activate/deactivate)
 */
export const toggleServiceArea = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
        throw new ApiError(400, 'isActive must be a boolean value');
    }
    
    const serviceArea = await ServiceArea.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
    );
    
    if (!serviceArea) {
        throw new ApiError(404, 'Service area not found');
    }
    
    res.json(new ApiResponse(200, serviceArea, `Service area ${isActive ? 'activated' : 'deactivated'} successfully`));
});

/**
 * Delete service area
 */
export const deleteServiceArea = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check if any pincodes are linked
    const pincodeCount = await PincodeServiceability.countDocuments({ serviceAreaId: id });
    if (pincodeCount > 0) {
        throw new ApiError(400, `Cannot delete service area. ${pincodeCount} pincodes are linked to it. Please delete or reassign them first.`);
    }
    
    const serviceArea = await ServiceArea.findByIdAndDelete(id);
    if (!serviceArea) {
        throw new ApiError(404, 'Service area not found');
    }
    
    res.json(new ApiResponse(200, null, 'Service area deleted successfully'));
});

/**
 * Get all pincodes for a service area
 */
export const getPincodesForServiceArea = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isServiceable, deliveryZone, search } = req.query;
    
    const filter = { serviceAreaId: id };
    if (typeof isServiceable !== 'undefined') filter.isServiceable = isServiceable === 'true';
    if (deliveryZone) filter.deliveryZone = deliveryZone;
    if (search) {
        filter.$or = [
            { pincode: new RegExp(search, 'i') },
            { locality: new RegExp(search, 'i') }
        ];
    }
    
    const pincodes = await PincodeServiceability.find(filter)
        .sort({ pincode: 1 })
        .select('pincode locality deliveryZone isServiceable serviceType stats coordinates');
    
    res.json(new ApiResponse(200, pincodes, 'Pincodes fetched successfully'));
});

/**
 * Add single pincode to service area
 */
export const addPincode = asyncHandler(async (req, res) => {
    const { serviceAreaId, pincode, locality, deliveryZone, coordinates, customSettings } = req.body;
    
    if (!serviceAreaId || !pincode) {
        throw new ApiError(400, 'Service area ID and pincode are required');
    }
    
    // Verify service area exists
    const serviceArea = await ServiceArea.findById(serviceAreaId);
    if (!serviceArea) {
        throw new ApiError(404, 'Service area not found');
    }
    
    // Check if pincode already exists
    const existingPincode = await PincodeServiceability.findOne({ pincode: pincode.trim() });
    if (existingPincode) {
        throw new ApiError(400, `Pincode ${pincode} already exists and is mapped to ${existingPincode.serviceAreaId}`);
    }
    
    const pincodeData = await PincodeServiceability.create({
        pincode: pincode.trim(),
        serviceAreaId,
        locality,
        deliveryZone,
        coordinates: coordinates || { type: 'Point', coordinates: [0, 0] },
        customSettings,
        isServiceable: true,
        isVerified: false
    });
    
    res.status(201).json(new ApiResponse(201, pincodeData, 'Pincode added successfully'));
});

/**
 * Bulk import pincodes (CSV data)
 */
export const importPincodes = asyncHandler(async (req, res) => {
    const { serviceAreaId, pincodes } = req.body;
    // pincodes: [{ pincode, locality, zone, coordinates }]
    
    if (!serviceAreaId || !Array.isArray(pincodes) || pincodes.length === 0) {
        throw new ApiError(400, 'Service area ID and pincodes array are required');
    }
    
    const serviceArea = await ServiceArea.findById(serviceAreaId);
    if (!serviceArea) {
        throw new ApiError(404, 'Service area not found');
    }
    
    const results = {
        added: 0,
        updated: 0,
        skipped: 0,
        errors: []
    };
    
    for (const p of pincodes) {
        try {
            if (!p.pincode) {
                results.skipped++;
                continue;
            }
            
            const existingPincode = await PincodeServiceability.findOne({ pincode: p.pincode.trim() });
            
            if (existingPincode) {
                // Update existing
                existingPincode.locality = p.locality || existingPincode.locality;
                existingPincode.deliveryZone = p.zone || p.deliveryZone || existingPincode.deliveryZone;
                if (p.coordinates) existingPincode.coordinates = p.coordinates;
                await existingPincode.save();
                results.updated++;
            } else {
                // Create new
                await PincodeServiceability.create({
                    pincode: p.pincode.trim(),
                    serviceAreaId,
                    locality: p.locality,
                    deliveryZone: p.zone || p.deliveryZone,
                    coordinates: p.coordinates || { type: 'Point', coordinates: [0, 0] },
                    isServiceable: true
                });
                results.added++;
            }
        } catch (error) {
            results.errors.push({ pincode: p.pincode, error: error.message });
        }
    }
    
    res.json(new ApiResponse(200, results, `Import complete: ${results.added} added, ${results.updated} updated, ${results.skipped} skipped`));
});

/**
 * Update pincode
 */
export const updatePincode = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    delete updates._id;
    delete updates.pincode; // Don't allow changing pincode itself
    delete updates.createdAt;
    
    const pincodeData = await PincodeServiceability.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
    );
    
    if (!pincodeData) {
        throw new ApiError(404, 'Pincode not found');
    }
    
    res.json(new ApiResponse(200, pincodeData, 'Pincode updated successfully'));
});

/**
 * Delete pincode
 */
export const deletePincode = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const pincodeData = await PincodeServiceability.findByIdAndDelete(id);
    if (!pincodeData) {
        throw new ApiError(404, 'Pincode not found');
    }
    
    res.json(new ApiResponse(200, null, 'Pincode deleted successfully'));
});

/**
 * Check pincode serviceability (admin test tool)
 */
export const checkPincodeServiceability = asyncHandler(async (req, res) => {
    const { pincode } = req.params;
    
    const result = await serviceAreaService.checkServiceAvailability({ pincode });
    
    res.json(new ApiResponse(200, result, 'Serviceability checked'));
});

/**
 * Get service area statistics
 */
export const getServiceAreaStats = asyncHandler(async (req, res) => {
    const totalAreas = await ServiceArea.countDocuments();
    const activeAreas = await ServiceArea.countDocuments({ isActive: true });
    const comingSoonAreas = await ServiceArea.countDocuments({ serviceType: 'coming_soon' });
    const totalPincodes = await PincodeServiceability.countDocuments();
    const serviceablePincodes = await PincodeServiceability.countDocuments({ isServiceable: true });
    
    // Top performing areas
    const topAreas = await ServiceArea.find({ isActive: true })
        .sort({ 'stats.totalOrders': -1 })
        .limit(5)
        .select('name state stats');
    
    res.json(new ApiResponse(200, {
        totalAreas,
        activeAreas,
        inactiveAreas: totalAreas - activeAreas,
        comingSoonAreas,
        totalPincodes,
        serviceablePincodes,
        unserviceablePincodes: totalPincodes - serviceablePincodes,
        topPerformingAreas: topAreas
    }, 'Statistics fetched successfully'));
});
