import Joi from 'joi';

export const registerSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50).regex(/^[a-zA-Z0-9\s]+$/).required().messages({
        "string.pattern.base": "Vendor name must contain only alphanumeric characters and spaces",
        "any.required": "Vendor name is required"
    }),
    email: Joi.string().email().lowercase().required().messages({
        "string.email": "Wrong email format",
        "any.required": "Email is required"
    }),
    password: Joi.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters",
        "any.required": "Password is required"
    }),
    phone: Joi.string().trim().pattern(/^\d{10,12}$/).required().messages({
        "string.pattern.base": "Phone number must be between 10 and 12 digits",
        "any.required": "Phone number is required"
    }),
    storeName: Joi.string().trim().min(2).max(100).required(),
    storeDescription: Joi.string().trim().max(500).allow('').optional(),
    address: Joi.object({
        street: Joi.string().allow('').optional(),
        city: Joi.string().regex(/^[a-zA-Z0-9\s]*$/).allow('').optional().messages({
            "string.pattern.base": "City must contain only alphanumeric characters and spaces"
        }),
        state: Joi.string().allow('').optional(),
        zipCode: Joi.string().pattern(/^\d{5,6}$/).allow('').optional().messages({
            "string.pattern.base": "Zip code must be a valid 5 or 6 digit number"
        }),
        country: Joi.string().allow('').optional(),
    }).optional(),
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

export const verifyOtpSchema = Joi.object({
    phone: Joi.string().optional(),
    email: Joi.string().email().lowercase().optional(),
    otp: Joi.string().pattern(/^\d{6}$/).required(),
}).or('phone', 'email');

export const resendOtpSchema = Joi.object({
    phone: Joi.string().optional(),
    email: Joi.string().email().lowercase().optional(),
}).or('phone', 'email');

export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required(),
});

export const logoutSchema = Joi.object({
    refreshToken: Joi.string().allow('').optional(),
});

export const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().lowercase().required(),
});

export const verifyResetOtpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().pattern(/^\d{6}$/).required()
});

export const verifyLoginOtpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().pattern(/^\d{6}$/).required(),
    fcmToken: Joi.string().optional(),
    deviceToken: Joi.string().optional()
});

export const resetPasswordSchema = Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Confirm password must match password.',
    }),
});
