const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');
const logger = require('../lib/logger');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Pre-computed bcrypt hash used to prevent timing attacks when user doesn't exist
const DUMMY_HASH = '$2b$10$x0lG0rQ8kz6hGZZDqGSYkOYpC0kOKz3GkGnqKxQkdYWFqkz8QLqHC';

const ALLOWED_PALETTES = ['ethereal-ivory', 'serene-coastline', 'midnight-bloom', 'warm-sand', 'ocean-breeze'];

const VALID_STAT_KEYS = ['current', 'avgWeeklyChange', 'weekOverWeek', 'lowest', 'highest', 'average'];
const DEFAULT_STATS = ['current', 'avgWeeklyChange', 'lowest'];

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24h
    path: '/',
};

function isStrongPassword(password) {
    return /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

// POST /api/signup
router.post('/signup', async (req, res) => {
    const { firstName, lastName, name, email, password } = req.body;

    // Support both new (firstName+lastName) and legacy (name) fields
    const fName = firstName || (name ? name.trim().split(/\s+/)[0] : '');
    const lName = lastName || (name ? name.trim().split(/\s+/).slice(1).join(' ') : '');

    if (!fName || !email || !password) {
        return res.status(400).json({ error: 'First name, email, and password are required' });
    }

    if (typeof fName !== 'string' || fName.trim().length > 50) {
        return res.status(400).json({ error: 'First name must be 50 characters or less' });
    }

    if (lName && (typeof lName !== 'string' || lName.trim().length > 50)) {
        return res.status(400).json({ error: 'Last name must be 50 characters or less' });
    }

    if (typeof email !== 'string' || email.trim().length > 254) {
        return res.status(400).json({ error: 'Email must be 254 characters or less' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // bcrypt max input is 72 bytes
    if (Buffer.byteLength(password, 'utf8') > 72) {
        return res.status(400).json({ error: 'Password is too long' });
    }

    if (!isStrongPassword(password)) {
        return res
            .status(400)
            .json({ error: 'Password must contain uppercase, lowercase, and a digit' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const fullName = lName.trim() ? `${fName.trim()} ${lName.trim()}` : fName.trim();
    const user = {
        email: email.trim().toLowerCase(),
        firstName: fName.trim(),
        lastName: lName.trim() || undefined,
        name: fullName,
        password: hashedPassword,
        darkMode: false,
        hasSeenIntro: false,
        createdAt: new Date().toISOString(),
    };
    // Remove undefined fields
    if (!user.lastName) delete user.lastName;

    try {
        await docClient.send(
            new PutCommand({
                TableName: process.env.USERS_TABLE,
                Item: user,
                ConditionExpression: 'attribute_not_exists(email)',
            }),
        );
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(409).json({ error: 'Unable to create account. Please try a different email.' });
        }
        logger.error({ err }, 'DynamoDB PutItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const token = jwt.sign({ email: user.email, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, COOKIE_OPTIONS);

    res.status(201).json({
        message: 'Account created successfully',
        user: { firstName: user.firstName, lastName: user.lastName || '', name: user.name, email: user.email },
    });
});

// Account lockout constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// POST /api/signin
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let result;
    try {
        result = await docClient.send(
            new GetCommand({
                TableName: process.env.USERS_TABLE,
                Key: { email: normalizedEmail },
            }),
        );
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const user = result.Item;

    // Always run bcrypt to prevent timing-based user enumeration
    const validPassword = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check account lockout
    if (user.lockoutUntil && Date.now() < user.lockoutUntil) {
        const retryAfter = Math.ceil((user.lockoutUntil - Date.now()) / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({ error: 'Account temporarily locked. Try again later.' });
    }

    if (!validPassword) {
        // Increment failed attempts in DynamoDB (shared across cluster workers)
        const attempts = (user.failedLoginAttempts || 0) + 1;
        const updateValues = { ':attempts': attempts };
        let updateExpr = 'SET failedLoginAttempts = :attempts';

        if (attempts >= MAX_FAILED_ATTEMPTS) {
            updateExpr += ', lockoutUntil = :lockout';
            updateValues[':lockout'] = Date.now() + LOCKOUT_DURATION_MS;
            logger.warn({ email: normalizedEmail }, 'Account locked after repeated failed logins');
        }

        try {
            await docClient.send(
                new UpdateCommand({
                    TableName: process.env.USERS_TABLE,
                    Key: { email: normalizedEmail },
                    UpdateExpression: updateExpr,
                    ExpressionAttributeValues: updateValues,
                }),
            );
        } catch (err) {
            logger.error({ err }, 'Failed to update login attempts');
        }

        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Successful login — clear lockout state
    if (user.failedLoginAttempts) {
        try {
            await docClient.send(
                new UpdateCommand({
                    TableName: process.env.USERS_TABLE,
                    Key: { email: normalizedEmail },
                    UpdateExpression: 'REMOVE failedLoginAttempts, lockoutUntil',
                }),
            );
        } catch (err) {
            logger.error({ err }, 'Failed to clear login attempts');
        }
    }

    const token = jwt.sign({ email: user.email, tokenVersion: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, COOKIE_OPTIONS);

    res.json({
        message: 'Signed in successfully',
        user: {
            firstName: user.firstName || user.name.split(' ')[0],
            lastName: user.lastName || user.name.split(' ').slice(1).join(' '),
            name: user.name,
            email: user.email,
            darkMode: user.darkMode || false,
            palette: user.palette || 'ethereal-ivory',
            dashboardStats: user.dashboardStats || DEFAULT_STATS,
            todoCategories: user.todoCategories || [],
            isAdmin: user.isAdmin || false,
            digestEnabled: user.digestEnabled || false,
            timezone: user.timezone || '',
            hasSeenIntro: user.hasSeenIntro || false,
        },
    });
});

// POST /api/signout
router.post('/signout', authenticate, async (req, res) => {
    // Increment tokenVersion to invalidate all existing tokens
    try {
        await docClient.send(
            new UpdateCommand({
                TableName: process.env.USERS_TABLE,
                Key: { email: req.user.email },
                UpdateExpression: 'SET tokenVersion = if_not_exists(tokenVersion, :zero) + :one',
                ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
            }),
        );
    } catch (err) {
        logger.error({ err }, 'Failed to increment tokenVersion on signout');
    }

    res.clearCookie('token', COOKIE_OPTIONS);
    res.json({ message: 'Signed out' });
});

// GET /api/me — get current user profile
router.get('/me', authenticate, async (req, res) => {
    try {
        const result = await docClient.send(
            new GetCommand({
                TableName: process.env.USERS_TABLE,
                Key: { email: req.user.email },
            }),
        );

        if (!result.Item) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.Item;
        res.json({
            firstName: user.firstName || user.name.split(' ')[0],
            lastName: user.lastName || user.name.split(' ').slice(1).join(' '),
            name: user.name,
            email: user.email,
            darkMode: user.darkMode || false,
            palette: user.palette || 'ethereal-ivory',
            dashboardStats: user.dashboardStats || DEFAULT_STATS,
            todoCategories: user.todoCategories || [],
            isAdmin: user.isAdmin || false,
            digestEnabled: user.digestEnabled || false,
            timezone: user.timezone || '',
            hasSeenIntro: user.hasSeenIntro || false,
            createdAt: user.createdAt,
        });
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/me — update profile
router.patch('/me', authenticate, async (req, res) => {
    const { firstName, lastName, name, darkMode, palette, dashboardStats, todoCategories, digestEnabled, timezone, hasSeenIntro } = req.body;
    const updates = [];
    const names = {};
    const values = {};

    if (firstName !== undefined) {
        if (typeof firstName !== 'string' || firstName.trim().length === 0 || firstName.trim().length > 50) {
            return res.status(400).json({ error: 'First name must be between 1 and 50 characters' });
        }
        updates.push('firstName = :fn');
        values[':fn'] = firstName.trim();
        const ln = lastName !== undefined ? (lastName || '').trim() : '';
        const fullName = ln ? `${firstName.trim()} ${ln}` : firstName.trim();
        updates.push('#n = :name');
        names['#n'] = 'name';
        values[':name'] = fullName;
    }
    if (lastName !== undefined) {
        if (typeof lastName !== 'string' || lastName.trim().length > 50) {
            return res.status(400).json({ error: 'Last name must be 50 characters or less' });
        }
        updates.push('lastName = :ln');
        values[':ln'] = lastName.trim();
    } else if (name !== undefined && firstName === undefined) {
        // Legacy name update
        if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
            return res.status(400).json({ error: 'Name must be between 1 and 100 characters' });
        }
        updates.push('#n = :name');
        names['#n'] = 'name';
        values[':name'] = name.trim();
    }

    if (darkMode !== undefined) {
        if (typeof darkMode !== 'boolean') {
            return res.status(400).json({ error: 'darkMode must be a boolean' });
        }
        updates.push('darkMode = :dm');
        values[':dm'] = darkMode;
    }

    if (palette !== undefined) {
        if (typeof palette !== 'string' || !ALLOWED_PALETTES.includes(palette)) {
            return res.status(400).json({ error: 'Invalid palette' });
        }
        updates.push('palette = :palette');
        values[':palette'] = palette;
    }

    if (dashboardStats !== undefined) {
        if (!Array.isArray(dashboardStats) || dashboardStats.length === 0 || dashboardStats.length > 6) {
            return res.status(400).json({ error: 'dashboardStats must be an array of 1-6 stat keys' });
        }
        if (!dashboardStats.every((k) => VALID_STAT_KEYS.includes(k))) {
            return res.status(400).json({ error: 'Invalid stat key' });
        }
        updates.push('dashboardStats = :ds');
        values[':ds'] = dashboardStats;
    }

    if (todoCategories !== undefined) {
        if (!Array.isArray(todoCategories) || todoCategories.length > 20) {
            return res.status(400).json({ error: 'todoCategories must be an array of up to 20 items' });
        }
        if (!todoCategories.every((c) => typeof c === 'string' && c.trim().length > 0 && c.trim().length <= 50)) {
            return res.status(400).json({ error: 'Each category must be a string of 1-50 characters' });
        }
        const unique = new Set(todoCategories.map((c) => c.trim()));
        if (unique.size !== todoCategories.length) {
            return res.status(400).json({ error: 'Duplicate categories are not allowed' });
        }
        updates.push('todoCategories = :tc');
        values[':tc'] = todoCategories.map((c) => c.trim());
    }

    if (digestEnabled !== undefined) {
        if (typeof digestEnabled !== 'boolean') {
            return res.status(400).json({ error: 'digestEnabled must be a boolean' });
        }
        updates.push('digestEnabled = :de');
        values[':de'] = digestEnabled;
    }

    if (timezone !== undefined) {
        if (typeof timezone !== 'string' || timezone.length > 100) {
            return res.status(400).json({ error: 'Invalid timezone' });
        }
        // Validate IANA timezone
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
        } catch {
            return res.status(400).json({ error: 'Invalid timezone' });
        }
        updates.push('#tz = :tz');
        names['#tz'] = 'timezone';
        values[':tz'] = timezone;
    }

    if (hasSeenIntro !== undefined) {
        if (typeof hasSeenIntro !== 'boolean') {
            return res.status(400).json({ error: 'hasSeenIntro must be a boolean' });
        }
        updates.push('hasSeenIntro = :hsi');
        values[':hsi'] = hasSeenIntro;
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    try {
        const result = await docClient.send(
            new UpdateCommand({
                TableName: process.env.USERS_TABLE,
                Key: { email: req.user.email },
                UpdateExpression: 'SET ' + updates.join(', '),
                ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
                ExpressionAttributeValues: values,
                ReturnValues: 'ALL_NEW',
            }),
        );

        const user = result.Attributes;
        res.json({
            firstName: user.firstName || user.name.split(' ')[0],
            lastName: user.lastName || user.name.split(' ').slice(1).join(' '),
            name: user.name,
            email: user.email,
            darkMode: user.darkMode || false,
            palette: user.palette || 'ethereal-ivory',
            dashboardStats: user.dashboardStats || DEFAULT_STATS,
            todoCategories: user.todoCategories || [],
            digestEnabled: user.digestEnabled || false,
            timezone: user.timezone || '',
            hasSeenIntro: user.hasSeenIntro || false,
        });
    } catch (err) {
        logger.error({ err }, 'DynamoDB UpdateItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/me/password — change password
router.patch('/me/password', authenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
        return res.status(400).json({ error: 'New password is too long' });
    }

    if (!isStrongPassword(newPassword)) {
        return res
            .status(400)
            .json({ error: 'New password must contain uppercase, lowercase, and a digit' });
    }

    // Fetch current user
    let user;
    try {
        const result = await docClient.send(
            new GetCommand({
                TableName: process.env.USERS_TABLE,
                Key: { email: req.user.email },
            }),
        );
        user = result.Item;
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    // Verify current password
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and save new password, increment tokenVersion to invalidate old tokens
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    let newVersion;
    try {
        const result = await docClient.send(
            new UpdateCommand({
                TableName: process.env.USERS_TABLE,
                Key: { email: req.user.email },
                UpdateExpression: 'SET #p = :password, tokenVersion = if_not_exists(tokenVersion, :zero) + :one',
                ExpressionAttributeNames: { '#p': 'password' },
                ExpressionAttributeValues: { ':password': hashedPassword, ':zero': 0, ':one': 1 },
                ReturnValues: 'ALL_NEW',
            }),
        );
        newVersion = result.Attributes.tokenVersion;
    } catch (err) {
        logger.error({ err }, 'DynamoDB UpdateItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    // Issue fresh token with updated tokenVersion
    const token = jwt.sign({ email: req.user.email, tokenVersion: newVersion }, process.env.JWT_SECRET, {
        expiresIn: '24h',
    });
    res.cookie('token', token, COOKIE_OPTIONS);

    res.json({ message: 'Password updated successfully' });
});

module.exports = router;
