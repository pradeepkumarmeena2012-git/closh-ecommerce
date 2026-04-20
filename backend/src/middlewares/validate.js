import ApiError from '../utils/ApiError.js';

export const validate = (schema, source = 'body') =>
    (req, res, next) => {
        const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
        if (error) {
            const errors = error.details.map((d) => ({
                field: d.path.join('.'),
                message: d.message,
            }));
            console.error('\n--- JOI VALIDATION FAILED ---');
            console.error(`Route: ${req.method} ${req.originalUrl}`);
            console.error(`Source: ${source}`);
            console.error(`Received value:`, JSON.stringify(req[source], null, 2));
            console.error(`Errors:`, JSON.stringify(errors, null, 2));
            const primaryMessage = errors[0]?.message || 'Validation failed';
            return next(new ApiError(400, primaryMessage, errors));
        }
        req[source] = value;
        next();
    };
