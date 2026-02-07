require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'front')));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
