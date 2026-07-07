import Settings from '../models/Settings.model.js';

/**
 * Default delivery fee configuration.
 * These values are used as fallback if no Settings record exists in DB.
 */
const DEFAULTS = {
    baseFee:            25,   // ₹ flat fee for distances within freeKms
    freeKms:             3,   // km covered by baseFee at no extra charge
    perKmFee:           10,   // ₹ per km beyond freeKms
    perVendorStopFee:    6,   // ₹ per vendor pickup stop (forward delivery)
    perVendorDropoffFee: 6,   // ₹ per vendor dropoff stop (return delivery)
};

/**
 * Load the delivery fee configuration from the Settings DB.
 * Falls back to DEFAULTS for any missing fields.
 *
 * Settings key: 'delivery_fees'
 * Expected value shape:
 * {
 *   baseFee, freeKms, perKmFee, perVendorStopFee, perVendorDropoffFee
 * }
 *
 * @returns {Promise<Object>} Merged config object
 */
export const getDeliveryFeeConfig = async () => {
    try {
        const setting = await Settings.findOne({ key: 'delivery_fees' }).lean();
        if (setting && setting.value && typeof setting.value === 'object') {
            return {
                baseFee:            Number(setting.value.baseFee            ?? DEFAULTS.baseFee),
                freeKms:            Number(setting.value.freeKms            ?? DEFAULTS.freeKms),
                perKmFee:           Number(setting.value.perKmFee           ?? DEFAULTS.perKmFee),
                perVendorStopFee:   Number(setting.value.perVendorStopFee   ?? DEFAULTS.perVendorStopFee),
                perVendorDropoffFee:Number(setting.value.perVendorDropoffFee?? DEFAULTS.perVendorDropoffFee),
            };
        }
    } catch (err) {
        console.error('[DeliveryFeeConfig] Failed to load from DB, using defaults:', err.message);
    }
    return { ...DEFAULTS };
};
