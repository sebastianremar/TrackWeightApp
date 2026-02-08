require('dotenv').config();

// --- Validate required env vars early ---
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET must be set and at least 32 characters long');
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const authRoutes = require('./routes/auth');
const weightRoutes = require('./routes/weight');
const habitRoutes = require('./routes/habits');
const habitEntryRoutes = require('./routes/habitEntries');
const friendRoutes = require('./routes/friends');
const authenticate = require('./middleware/auth');
const rateLimit = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", 'https://d3js.org'],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
            },
        },
    }),
);

const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin.split(',') } : undefined));

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'front')));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
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
    res.sendFile(path.join(__dirname, '..', 'front', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
function shutdown(signal) {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
    // Force exit after 10s if connections don't close
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
