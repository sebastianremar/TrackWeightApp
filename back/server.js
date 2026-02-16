require('dotenv').config();
const Sentry = require('@sentry/node');
const logger = require('./lib/logger');

// Initialize Sentry early (before other imports) if DSN is configured
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
    logger.info('Sentry initialized');
}

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
const todoRoutes = require('./routes/todos');
const calendarRoutes = require('./routes/calendar');
const adminRoutes = require('./routes/admin');
const digestRoutes = require('./routes/digest');
const workoutRoutes = require('./routes/workouts');
const authenticate = require('./middleware/auth');
const rateLimit = require('./middleware/rateLimit');
const metricsMiddleware = require('./middleware/metrics');
const requireAdmin = require('./middleware/admin');
const { startFlushInterval, stopFlushInterval } = require('./lib/metrics');

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
if (!corsOrigin && isProd) {
    logger.fatal('CORS_ORIGIN must be set in production');
    process.exit(1);
}
app.use(
    cors(corsOrigin ? { origin: corsOrigin.split(','), credentials: true } : { credentials: true }),
);

app.use(express.json({ limit: '16kb' }));
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

// Metrics collection
app.use(metricsMiddleware);

// Health check (before auth, no rate limit)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Rate limiters for auth endpoints
app.post('/api/signin', rateLimit({ maxHits: 10, windowMs: 15 * 60 * 1000 }));
app.post('/api/signup', rateLimit({ maxHits: 5, windowMs: 60 * 60 * 1000 }));

// Routes (digest is public — no auth)
app.use('/api/digest', digestRoutes);
app.use('/api', authRoutes);
app.use('/api/weight', authenticate, weightRoutes);
app.use('/api/habits', authenticate, habitEntryRoutes);
app.use('/api/habits', authenticate, habitRoutes);
app.use('/api/todos', authenticate, todoRoutes);
app.use('/api/calendar', authenticate, calendarRoutes);
app.use('/api/friends', authenticate, friendRoutes);
app.use('/api/workouts', authenticate, workoutRoutes);
app.use('/api/admin', authenticate, requireAdmin, adminRoutes);

// SPA fallback — serve index.html for non-API routes
app.get('/*path', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'front', 'dist', 'index.html'));
});

// Sentry error handler (must be before global error handler)
if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

// Global error handler
app.use((err, req, res, next) => {
    logger.error({ err, reqId: req.id }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

if (require.main === module) {
    const server = app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
        startFlushInterval(60000);
    });

    // Graceful shutdown
    async function shutdown(signal) {
        logger.info(`${signal} received, shutting down gracefully...`);
        try {
            await stopFlushInterval();
        } catch (err) {
            logger.error({ err }, 'Failed to flush metrics on shutdown');
        }
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

    process.on('uncaughtException', (err) => {
        logger.fatal({ err }, 'Uncaught exception — shutting down');
        shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
        logger.fatal({ err: reason }, 'Unhandled rejection — shutting down');
        shutdown('unhandledRejection');
    });
}
