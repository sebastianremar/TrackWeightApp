const { recordRequest } = require('../lib/metrics');

function metricsMiddleware(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const responseTimeMs = Date.now() - start;
        const isSignup = req.method === 'POST' && req.url === '/api/signup' && res.statusCode === 201;

        recordRequest({
            method: req.method,
            url: req.url,
            status: res.statusCode,
            responseTimeMs,
            userEmail: req.user?.email || null,
            isSignup,
        });
    });

    next();
}

module.exports = metricsMiddleware;
