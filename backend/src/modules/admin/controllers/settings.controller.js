import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Settings from '../../../models/Settings.model.js';

/**
 * GET /api/settings/:key
 * Publicly fetch a setting by its key
 */
export const getSetting = asyncHandler(async (req, res) => {
    const { key } = req.params;
    
    // Security: Do not allow public fetching of sensitive keys
    const sensitiveKeys = ['email'];
    if (sensitiveKeys.includes(key)) {
        throw new ApiError(403, 'Access to this setting is restricted.');
    }

    const settings = await Settings.findOne({ key });

    if (!settings) {
        throw new ApiError(404, `Settings for key "${key}" not found.`);
    }

    res.status(200).json(new ApiResponse(200, settings.value, `Settings fetched for ${key}.`));
});

/**
 * GET /api/settings
 * Publicly fetch all non-sensitive settings
 */
export const getPublicSettings = asyncHandler(async (req, res) => {
    const sensitiveKeys = ['email'];
    const settings = await Settings.find({ key: { $nin: sensitiveKeys } });
    
    const settingsMap = settings.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    res.status(200).json(new ApiResponse(200, settingsMap, 'Public settings fetched successfully.'));
});

/**
 * GET /api/settings
 * Fetch all settings as a key-value object
 */
export const getAllSettings = asyncHandler(async (req, res) => {
    const settings = await Settings.find({});
    
    // Transform array of {key, value} to {key1: value1, key2: value2}
    const settingsMap = settings.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    res.status(200).json(new ApiResponse(200, settingsMap, 'All settings fetched successfully.'));
});

/**
 * PUT /api/admin/settings/:key
 * Admin only: update a setting
 */
export const updateSetting = asyncHandler(async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
        throw new ApiError(400, 'Settings value is required.');
    }

    const settings = await Settings.findOneAndUpdate(
        { key },
        { value },
        { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json(new ApiResponse(200, settings.value, `Settings updated for ${key}.`));
});
