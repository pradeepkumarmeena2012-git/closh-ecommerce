import api from '../utils/api';

/**
 * Fetch a public setting by key
 */
export const getPublicSetting = (key) =>
    api.get(`/settings/${key}`);
