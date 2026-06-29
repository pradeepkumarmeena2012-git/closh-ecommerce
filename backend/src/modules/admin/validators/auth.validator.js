import Joi from 'joi';

export const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "Wrong email format",
        "any.required": "Email is required"
    }),
    password: Joi.string().required().messages({
        "any.required": "Password is required"
    }),
});

export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required(),
});

export const logoutSchema = Joi.object({
    refreshToken: Joi.string().allow('').optional(),
});

export const updateProfileSchema = Joi.object({
    email: Joi.string().email().optional().messages({
        "string.email": "Wrong email format"
    }),
    password: Joi.string().min(6).optional().messages({
        "string.min": "Password must be at least 6 characters long"
    })
});
