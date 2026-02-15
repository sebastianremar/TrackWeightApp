const { recordRequest } = require('../lib/metrics');

function metricsMiddleware(req, res, next) {
    const start = Date.now();
    // Capture originalUrl now — req.url gets modified by Express routers
    const originalUrl = req.originalUrl;

    res.on('finish', () => {
        // Only track API routes
        if (!originalUrl.startsWith('/api/')) return;

        const responseTimeMs = Date.now() - start;
        const isSignup = req.method === 'POST' && originalUrl === '/api/signup' && res.statusCode === 201;

        recordRequest({
            method: req.method,
            url: originalUrl,
            status: res.statusCode,
            responseTimeMs,
            userEmail: req.user?.email || null,
            isSignup,
        });
    });

    next();
}

module.exports = metricsMiddleware;
