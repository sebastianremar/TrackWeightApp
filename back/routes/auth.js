const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');

const router = express.Router();

// POST /api/signup
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password: hashedPassword,
        createdAt: new Date().toISOString()
    };

    try {
        await docClient.send(new PutCommand({
            TableName: process.env.USERS_TABLE,
            Item: user,
            ConditionExpression: 'attribute_not_exists(email)'
        }));
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(409).json({ error: 'A user with this email already exists' });
        }
        console.error('DynamoDB PutItem error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
        message: 'Account created successfully',
        token,
        user: { name: user.name, email: user.email }
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
        result = await docClient.send(new GetCommand({
            TableName: process.env.USERS_TABLE,
            Key: { email: email.trim().toLowerCase() }
        }));
    } catch (err) {
        console.error('DynamoDB GetItem error:', err);
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

    res.json({
        message: 'Signed in successfully',
        token,
        user: { name: user.name, email: user.email }
    });
});

module.exports = router;
