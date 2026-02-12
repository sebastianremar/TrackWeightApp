const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');
const logger = require('../lib/logger');
const authenticate = require('../middleware/auth');

const router = express.Router();

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
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (typeof name !== 'string' || name.trim().length > 100) {
        return res.status(400).json({ error: 'Name must be 100 characters or less' });
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

    const user = {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password: hashedPassword,
        darkMode: false,
        createdAt: new Date().toISOString(),
    };

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
            return res.status(409).json({ error: 'A user with this email already exists' });
        }
        logger.error({ err }, 'DynamoDB PutItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, COOKIE_OPTIONS);

    res.status(201).json({
        message: 'Account created successfully',
        user: { name: user.name, email: user.email },
    });
});

// POST /api/signin
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    let result;
    try {
        result = await docClient.send(
            new GetCommand({
                TableName: process.env.USERS_TABLE,
                Key: { email: email.trim().toLowerCase() },
            }),
        );
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const user = result.Item;
    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, COOKIE_OPTIONS);

    res.json({
        message: 'Signed in successfully',
        user: { name: user.name, email: user.email },
    });
});

// POST /api/signout
router.post('/signout', (req, res) => {
    res.clearCookie('token', { path: '/' });
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
            name: user.name,
            email: user.email,
            darkMode: user.darkMode || false,
            createdAt: user.createdAt,
        });
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/me — update profile
router.patch('/me', authenticate, async (req, res) => {
    const { name, darkMode } = req.body;
    const updates = [];
    const names = {};
    const values = {};

    if (name !== undefined) {
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
            name: user.name,
            email: user.email,
            darkMode: user.darkMode || false,
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

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    try {
        await docClient.send(
            new UpdateCommand({
                TableName: process.env.USERS_TABLE,
                Key: { email: req.user.email },
                UpdateExpression: 'SET #p = :password',
                ExpressionAttributeNames: { '#p': 'password' },
                ExpressionAttributeValues: { ':password': hashedPassword },
            }),
        );
    } catch (err) {
        logger.error({ err }, 'DynamoDB UpdateItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    // Issue fresh token
    const token = jwt.sign({ email: req.user.email }, process.env.JWT_SECRET, {
        expiresIn: '24h',
    });
    res.cookie('token', token, COOKIE_OPTIONS);

    res.json({ message: 'Password updated successfully' });
});

module.exports = router;
