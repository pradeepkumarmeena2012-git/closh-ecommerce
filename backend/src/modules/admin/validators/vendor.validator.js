import Joi from 'joi';

const objectId = Joi.string().trim().hex().length(24);

export const vendorListQuerySchema = Joi.object({
    status: Joi.string().valid('all', 'pending', 'approved', 'suspended', 'rejected').optional(),
    search: Joi.string().trim().allow('').optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(500).optional(),
});

export const vendorIdParamSchema = Joi.object({
    id: objectId.required(),
});

export const vendorStatusUpdateSchema = Joi.object({
    status: Joi.string().valid('approved', 'suspended', 'rejected').required(),
    reason: Joi.string().trim().allow('').max(500).optional(),
});

export const vendorCommissionUpdateSchema = Joi.object({
    commissionRate: Joi.number().min(0).max(100).required(),
});

export const vendorCommissionsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(200).optional(),
    status: Joi.string().valid('all', 'pending', 'paid', 'cancelled').optional(),
});

export const registerVendorSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    storeName: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string().trim().min(10).max(15).required(),
    gstNumber: Joi.string().trim().min(15).max(15).required(), // GST is usually 15 chars
    shopAddress: Joi.string().trim().min(5).max(500).required(),
    email: Joi.string().trim().lowercase().email().required(),
    password: Joi.string().trim().min(6).required(),
});

