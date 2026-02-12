require('dotenv').config();
const logger = require('./lib/logger');

// --- Validate required env vars early ---
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    logger.fatal('JWT_SECRET must be set and at least 32 characters long');
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');

const authRoutes = require('./routes/auth');
const weightRoutes = require('./routes/weight');
const habitRoutes = require('./routes/habits');
const habitEntryRoutes = require('./routes/habitEntries');
const friendRoutes = require('./routes/friends');
const authenticate = require('./middleware/auth');
const rateLimit = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Trust proxy (needed behind nginx for correct req.ip)
app.set('trust proxy', 1);

// Security middleware
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
            },
        },
    }),
);

const corsOrigin = process.env.CORS_ORIGIN;
app.use(
    cors(corsOrigin ? { origin: corsOrigin.split(','), credentials: true } : { credentials: true }),
);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'front', 'dist')));

// Request logging with request ID and response time
app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    const start = Date.now();
    res.on('finish', () => {
        logger.info({
            reqId: req.id,
            method: req.method,
            url: req.url,
            status: res.statusCode,
            ms: Date.now() - start,
        });
    });
    next();
});

// Health check (before auth, no rate limit)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Rate limiters for auth endpoints
app.post('/api/signin', rateLimit({ maxHits: 10, windowMs: 15 * 60 * 1000 }));
app.post('/api/signup', rateLimit({ maxHits: 5, windowMs: 60 * 60 * 1000 }));

// Routes
app.use('/api', authRoutes);
app.use('/api/weight', authenticate, weightRoutes);
app.use('/api/habits', authenticate, habitEntryRoutes);
app.use('/api/habits', authenticate, habitRoutes);
app.use('/api/friends', authenticate, friendRoutes);

// SPA fallback — serve index.html for non-API routes
app.get('/*path', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'front', 'dist', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error({ err, reqId: req.id }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

if (require.main === module) {
    const server = app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
    });

    // Graceful shutdown
    function shutdown(signal) {
        logger.info(`${signal} received, shutting down gracefully...`);
        server.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
