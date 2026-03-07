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
    const settings = await Settings.findOne({ key });

    if (!settings) {
        throw new ApiError(404, `Settings for key "${key}" not found.`);
    }

    res.status(200).json(new ApiResponse(200, settings.value, `Settings fetched for ${key}.`));
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
