const express = require('express');
const { PutCommand, QueryCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');
const logger = require('../lib/logger');

const router = express.Router();

const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const VALID_TYPES = ['good', 'bad'];
const VALID_LIMIT_PERIODS = ['week', 'month'];

function generateUlid() {
    // Simple ULID-like ID: timestamp + random
    var t = Date.now().toString(36);
    var r = Math.random().toString(36).substring(2, 10);
    return t + r;
}

// POST /api/habits — create a habit
router.post('/', async (req, res) => {
    const email = req.user.email;
    const { name, targetFrequency, color, type, limitPeriod } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
        return res.status(400).json({ error: 'Name is required (max 100 chars)' });
    }

    const habitType = type || 'good';
    if (!VALID_TYPES.includes(habitType)) {
        return res.status(400).json({ error: 'Type must be "good" or "bad"' });
    }

    const period = limitPeriod || 'week';
    if (habitType === 'bad' && !VALID_LIMIT_PERIODS.includes(period)) {
        return res.status(400).json({ error: 'Limit period must be "week" or "month"' });
    }

    const maxFreq = habitType === 'bad' && period === 'month' ? 30 : 7;
    const freq = parseInt(targetFrequency);
    if (!freq || freq < 1 || freq > maxFreq) {
        return res.status(400).json({ error: `Target frequency must be between 1 and ${maxFreq}` });
    }

    if (color !== undefined && (typeof color !== 'string' || !COLOR_REGEX.test(color))) {
        return res.status(400).json({ error: 'Color must be a valid hex color (#rrggbb)' });
    }

    // Check max 20 active habits
    try {
        const existing = await docClient.send(
            new QueryCommand({
                TableName: process.env.HABITS_TABLE,
                KeyConditionExpression: 'email = :email',
                FilterExpression: 'archived <> :true',
                ExpressionAttributeValues: { ':email': email, ':true': true },
            }),
        );
        if (existing.Items && existing.Items.length >= 20) {
            return res.status(400).json({ error: 'Maximum 20 active habits allowed' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const habitId = 'habit#' + generateUlid();
    const item = {
        email,
        habitId,
        name: name.trim(),
        targetFrequency: freq,
        color: color || '#667eea',
        type: habitType,
        archived: false,
        createdAt: new Date().toISOString(),
    };
    if (habitType === 'bad') {
        item.limitPeriod = period;
    }

    try {
        await docClient.send(
            new PutCommand({
                TableName: process.env.HABITS_TABLE,
                Item: item,
            }),
        );
        res.status(201).json({ habit: item });
    } catch (err) {
        logger.error({ err }, 'DynamoDB PutItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/habits — list habits
router.get('/', async (req, res) => {
    const email = req.user.email;
    const includeArchived = req.query.archived === 'true';

    const params = {
        TableName: process.env.HABITS_TABLE,
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
    };

    if (!includeArchived) {
        params.FilterExpression = 'archived <> :true';
        params.ExpressionAttributeValues[':true'] = true;
    }

    try {
        const result = await docClient.send(new QueryCommand(params));
        res.json({ habits: result.Items || [] });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/habits/:id — get single habit
router.get('/:id', async (req, res) => {
    const email = req.user.email;
    const habitId = req.params.id;

    try {
        const result = await docClient.send(
            new GetCommand({
                TableName: process.env.HABITS_TABLE,
                Key: { email, habitId },
            }),
        );
        if (!result.Item) {
            return res.status(404).json({ error: 'Habit not found' });
        }
        res.json({ habit: result.Item });
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/habits/:id — update habit
router.patch('/:id', async (req, res) => {
    const email = req.user.email;
    const habitId = req.params.id;
    const { name, targetFrequency, color, type, limitPeriod } = req.body;

    const updates = [];
    const values = {};
    const names = {};

    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
            return res.status(400).json({ error: 'Name must be between 1 and 100 characters' });
        }
        updates.push('#n = :name');
        names['#n'] = 'name';
        values[':name'] = name.trim();
    }

    if (targetFrequency !== undefined) {
        const freq = parseInt(targetFrequency);
        if (!freq || freq < 1 || freq > 30) {
            return res.status(400).json({ error: 'Target frequency must be between 1 and 30' });
        }
        updates.push('targetFrequency = :freq');
        values[':freq'] = freq;
    }

    if (color !== undefined) {
        if (typeof color !== 'string' || !COLOR_REGEX.test(color)) {
            return res.status(400).json({ error: 'Color must be a valid hex color (#rrggbb)' });
        }
        updates.push('color = :color');
        values[':color'] = color;
    }

    if (type !== undefined) {
        if (!VALID_TYPES.includes(type)) {
            return res.status(400).json({ error: 'Type must be "good" or "bad"' });
        }
        updates.push('#t = :type');
        names['#t'] = 'type';
        values[':type'] = type;
    }

    if (limitPeriod !== undefined) {
        if (!VALID_LIMIT_PERIODS.includes(limitPeriod)) {
            return res.status(400).json({ error: 'Limit period must be "week" or "month"' });
        }
        updates.push('limitPeriod = :limitPeriod');
        values[':limitPeriod'] = limitPeriod;
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    try {
        const result = await docClient.send(
            new UpdateCommand({
                TableName: process.env.HABITS_TABLE,
                Key: { email, habitId },
                UpdateExpression: 'SET ' + updates.join(', '),
                ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
                ExpressionAttributeValues: values,
                ConditionExpression: 'attribute_exists(email)',
                ReturnValues: 'ALL_NEW',
            }),
        );
        res.json({ habit: result.Attributes });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Habit not found' });
        }
        logger.error({ err }, 'DynamoDB UpdateItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/habits/:id — archive habit (soft delete)
router.delete('/:id', async (req, res) => {
    const email = req.user.email;
    const habitId = req.params.id;

    try {
        await docClient.send(
            new UpdateCommand({
                TableName: process.env.HABITS_TABLE,
                Key: { email, habitId },
                UpdateExpression: 'SET archived = :true',
                ExpressionAttributeValues: { ':true': true },
                ConditionExpression: 'attribute_exists(email)',
            }),
        );
        res.json({ message: 'Habit archived' });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Habit not found' });
        }
        logger.error({ err }, 'DynamoDB UpdateItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
