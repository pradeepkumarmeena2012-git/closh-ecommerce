import morgan from 'morgan';

// Custom format for morgan
const morganFormat = ':method :url :status :res[content-length] - :response-time ms';

export const requestLogger = morgan(morganFormat, {
    stream: {
        write: (message) => {
            const logObject = {
                method: message.split(' ')[0],
                url: message.split(' ')[1],
                status: message.split(' ')[2],
                responseTime: message.split(' ')[4],
            };
            console.log(`[API REQUEST] ${message.trim()}`);
        },
    },
});

export const detailedRequestLogger = (req, res, next) => {
    const start = Date.now();
    const { method, url, body, query, params, user } = req;

    // Log the incoming request
    console.log(`\n--- 📥 INCOMING REQUEST ---`);
    console.log(`[${new Date().toISOString()}] ${method} ${url}`);
    if (user) console.log(`User: ${user.id} (${user.role})`);
    if (params && Object.keys(params).length) console.log(`Params:`, JSON.stringify(params));
    if (query && Object.keys(query).length) console.log(`Query:`, JSON.stringify(query));
    if (body && Object.keys(body).length && !url.includes('login') && !url.includes('register')) {
        console.log(`Body:`, JSON.stringify(body, null, 2));
    }
    console.log(`---------------------------\n`);

    // Capture the original send to log the response
    const oldSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - start;
        console.log(`\n--- 📤 RESPONSE SENT ---`);
        console.log(`[${new Date().toISOString()}] ${method} ${url} - ${res.statusCode} (${duration}ms)`);
        console.log(`-------------------------\n`);
        return oldSend.apply(res, arguments);
    };

    next();
};
