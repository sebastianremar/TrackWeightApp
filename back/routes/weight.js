const express = require('express');
const { PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');
const logger = require('../lib/logger');

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LIMIT = 100;

function isValidDate(dateStr) {
    if (!DATE_REGEX.test(dateStr)) return false;
    const d = new Date(dateStr + 'T00:00:00Z');
    return !isNaN(d.getTime());
}

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

// POST /api/weight — Log or update a weight entry
router.post('/', async (req, res) => {
    const email = req.user.email;
    const { weight } = req.body;
    const date = req.body.date || getTodayStr();

    if (typeof weight !== 'number' || weight < 20 || weight > 500) {
        return res.status(400).json({ error: 'Weight must be a number between 20 and 500' });
    }

    if (!isValidDate(date)) {
        return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    }

    if (date > getTodayStr()) {
        return res.status(400).json({ error: 'Date cannot be in the future' });
    }

    const entry = {
        email,
        date,
        weight: Math.round(weight * 10) / 10,
        createdAt: new Date().toISOString(),
    };

    try {
        await docClient.send(
            new PutCommand({
                TableName: process.env.WEIGHT_TABLE,
                Item: entry,
            }),
        );
    } catch (err) {
        logger.error({ err }, 'DynamoDB PutItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    res.status(201).json({
        message: 'Weight recorded',
        entry: { date: entry.date, weight: entry.weight, createdAt: entry.createdAt },
    });
});

// GET /api/weight — Get weight history (optional ?from=&to=&limit=&cursor=)
router.get('/', async (req, res) => {
    const email = req.user.email;
    const { from, to, cursor } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, 500);

    const params = {
        TableName: process.env.WEIGHT_TABLE,
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
        ScanIndexForward: true,
        Limit: limit,
    };

    if (from && to) {
        params.KeyConditionExpression += ' AND #d BETWEEN :from AND :to';
        params.ExpressionAttributeNames = { '#d': 'date' };
        params.ExpressionAttributeValues[':from'] = from;
        params.ExpressionAttributeValues[':to'] = to;
    } else if (from) {
        params.KeyConditionExpression += ' AND #d >= :from';
        params.ExpressionAttributeNames = { '#d': 'date' };
        params.ExpressionAttributeValues[':from'] = from;
    } else if (to) {
        params.KeyConditionExpression += ' AND #d <= :to';
        params.ExpressionAttributeNames = { '#d': 'date' };
        params.ExpressionAttributeValues[':to'] = to;
    }

    if (cursor) {
        try {
            const startKey = JSON.parse(Buffer.from(cursor, 'base64url').toString());
            if (startKey.email !== email) {
                return res.status(400).json({ error: 'Invalid cursor' });
            }
            params.ExclusiveStartKey = startKey;
        } catch {
            return res.status(400).json({ error: 'Invalid cursor' });
        }
    }

    try {
        const result = await docClient.send(new QueryCommand(params));
        const entries = (result.Items || []).map((item) => ({
            date: item.date,
            weight: item.weight,
        }));

        const response = { entries };
        if (result.LastEvaluatedKey) {
            response.nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
                'base64url',
            );
        }

        res.json(response);
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/weight/latest — Get the most recent entry
router.get('/latest', async (req, res) => {
    const email = req.user.email;

    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: process.env.WEIGHT_TABLE,
                KeyConditionExpression: 'email = :email',
                ExpressionAttributeValues: { ':email': email },
                ScanIndexForward: false,
                Limit: 1,
            }),
        );

        if (!result.Items || result.Items.length === 0) {
            return res.status(404).json({ error: 'No entries yet' });
        }

        const item = result.Items[0];
        res.json({ entry: { date: item.date, weight: item.weight } });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/weight/:date — Delete a specific entry
router.delete('/:date', async (req, res) => {
    const email = req.user.email;
    const { date } = req.params;

    if (!isValidDate(date)) {
        return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    }

    try {
        const result = await docClient.send(
            new DeleteCommand({
                TableName: process.env.WEIGHT_TABLE,
                Key: { email, date },
                ReturnValues: 'ALL_OLD',
            }),
        );

        if (!result.Attributes) {
            return res.status(404).json({ error: 'No entry found for this date' });
        }

        res.json({ message: 'Entry deleted' });
    } catch (err) {
        logger.error({ err }, 'DynamoDB DeleteItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
