import Joi from 'joi';

const phoneSchema = Joi.string().pattern(/^[0-9]{10}$/).required();
const zipSchema = Joi.string().trim().min(3).max(12).required();

export const createAddressSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    fullName: Joi.string().trim().min(2).max(80).required(),
    phone: phoneSchema,
    address: Joi.string().trim().min(5).max(500).required(),
    city: Joi.string().trim().min(2).max(80).required(),
    state: Joi.string().trim().min(2).max(80).required(),
    zipCode: zipSchema,
    country: Joi.string().trim().min(2).max(80).required(),
    isDefault: Joi.boolean().optional(),
    coordinates: Joi.any().optional(),
    landmark: Joi.string().trim().max(200).optional().allow('', null),
    type: Joi.string().trim().optional().allow('', null),
});

export const updateAddressSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50).optional(),
    fullName: Joi.string().trim().min(2).max(80).optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    address: Joi.string().trim().min(5).max(500).optional(),
    city: Joi.string().trim().min(2).max(80).optional(),
    state: Joi.string().trim().min(2).max(80).optional(),
    zipCode: Joi.string().trim().min(3).max(12).optional(),
    country: Joi.string().trim().min(2).max(80).optional(),
    isDefault: Joi.boolean().optional(),
}).min(1);
