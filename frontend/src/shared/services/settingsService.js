import api from '../utils/api';

/**
 * Fetch all public settings
 */
export const getAllPublicSettings = () =>
    api.get('/settings');

/**
 * Fetch a public setting by key
 */
export const getPublicSetting = (key, silent = false) =>
    api.get(`/settings/${key}`, { silent });

/**
 * Fetch all settings (Admin)
 */
export const getAllSettings = () =>
    api.get('/admin/settings/all');

/**
 * Update a setting (Admin)
 */
export const updateAdminSetting = (key, value) =>
    api.put(`/admin/settings/${key}`, { value });
