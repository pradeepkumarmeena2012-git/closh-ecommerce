import Joi from 'joi';

const objectId = Joi.string().trim().hex().length(24);

export const deliveryListQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(200).optional(),
    search: Joi.string().trim().allow('').optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    applicationStatus: Joi.string().valid('pending', 'approved', 'rejected').optional(),
    kycStatus: Joi.string().valid('none', 'pending', 'verified', 'rejected').optional(),
});

export const deliveryBoyIdParamSchema = Joi.object({
    id: objectId.required(),
});

export const createDeliveryBoySchema = Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    email: Joi.string().trim().email().required().messages({
        "string.email": "Wrong email format",
        "any.required": "Email is required"
    }),
    password: Joi.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters",
        "any.required": "Password is required"
    }),
    phone: Joi.string().trim().min(10).max(15).required().messages({
        "string.min": "Wrong phone number. Min 10 digits",
        "string.max": "Wrong phone number. Max 15 digits",
        "any.required": "Phone number is required"
    }),
    address: Joi.string().trim().allow('').optional(),
    vehicleType: Joi.string().trim().allow('').optional(),
    vehicleNumber: Joi.string().trim().allow('').optional(),
    isActive: Joi.boolean().optional(),
});

export const updateDeliveryBoySchema = Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    email: Joi.string().trim().email().optional(),
    phone: Joi.string().trim().min(6).max(30).optional(),
    address: Joi.string().trim().allow('').optional(),
    vehicleType: Joi.string().trim().allow('').optional(),
    vehicleNumber: Joi.string().trim().allow('').optional(),
    isActive: Joi.boolean().optional(),
}).min(1);

export const updateDeliveryStatusSchema = Joi.object({
    isActive: Joi.boolean().required(),
});

export const updateDeliveryApplicationStatusSchema = Joi.object({
    applicationStatus: Joi.string().valid('approved', 'rejected').required(),
    reason: Joi.string().allow('').optional(),
});

export const settleCashSchema = Joi.object({
    amount: Joi.number().min(0).optional(),
});

export const updateKycStatusSchema = Joi.object({
    kycStatus: Joi.string().valid('pending', 'verified', 'rejected').required(),
    reason: Joi.string().allow('').optional(),
});
