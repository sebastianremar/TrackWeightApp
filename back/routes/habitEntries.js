const express = require('express');
const { PutCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');
const logger = require('../lib/logger');

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LIMIT = 200;

function isValidDate(dateStr) {
    if (!DATE_REGEX.test(dateStr)) return false;
    const d = new Date(dateStr + 'T00:00:00Z');
    return !isNaN(d.getTime());
}

// GET /api/habits/stats/summary — aggregated completion stats for all habits
router.get('/stats/summary', async (req, res) => {
    const email = req.user.email;
    const period = req.query.period === 'month' ? 'month' : 'week';

    const now = new Date();
    let from, to;

    if (period === 'week') {
        const dow = (now.getDay() + 6) % 7; // Monday=0
        from = new Date(now);
        from.setDate(now.getDate() - dow);
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setDate(from.getDate() + 6);
    } else {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: process.env.HABIT_ENTRIES_TABLE,
                IndexName: 'HabitEntriesByUser',
                KeyConditionExpression: 'email = :email AND #d BETWEEN :from AND :to',
                ExpressionAttributeNames: { '#d': 'date' },
                ExpressionAttributeValues: { ':email': email, ':from': fromStr, ':to': toStr },
            }),
        );

        // Group completions by habitId
        const counts = {};
        for (const item of result.Items || []) {
            if (item.completed) {
                counts[item.habitId] = (counts[item.habitId] || 0) + 1;
            }
        }

        // Calculate total days in the period
        const diffMs = to.getTime() - from.getTime();
        const totalDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;

        res.json({ counts, period, from: fromStr, to: toStr, totalDays });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/habits/entries/all — MUST come before /:id routes
router.get('/entries/all', async (req, res) => {
    const email = req.user.email;
    const { from, to, cursor } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, 500);

    const params = {
        TableName: process.env.HABIT_ENTRIES_TABLE,
        IndexName: 'HabitEntriesByUser',
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
            habitId: item.habitId,
            date: item.date,
            completed: item.completed,
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

// POST /api/habits/:id/entries — log habit completion
router.post('/:id/entries', async (req, res) => {
    const email = req.user.email;
    const habitId = req.params.id;
    const date = req.body.date || new Date().toISOString().split('T')[0];
    const note = req.body.note || '';

    if (!isValidDate(date)) {
        return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    }

    if (typeof note === 'string' && note.length > 500) {
        return res.status(400).json({ error: 'Note must be 500 characters or less' });
    }

    const emailHabitId = email + '#' + habitId;

    const item = {
        emailHabitId,
        date,
        email,
        habitId,
        completed: true,
        note: typeof note === 'string' ? note.trim() : '',
        createdAt: new Date().toISOString(),
    };

    try {
        await docClient.send(
            new PutCommand({
                TableName: process.env.HABIT_ENTRIES_TABLE,
                Item: item,
            }),
        );
        res.status(201).json({ entry: { date, completed: true, note: item.note } });
    } catch (err) {
        logger.error({ err }, 'DynamoDB PutItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/habits/:id/entries/:date — remove entry
router.delete('/:id/entries/:date', async (req, res) => {
    const email = req.user.email;
    const habitId = req.params.id;
    const date = req.params.date;

    if (!isValidDate(date)) {
        return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    }

    const emailHabitId = email + '#' + habitId;

    try {
        const result = await docClient.send(
            new DeleteCommand({
                TableName: process.env.HABIT_ENTRIES_TABLE,
                Key: { emailHabitId, date },
                ReturnValues: 'ALL_OLD',
            }),
        );
        if (!result.Attributes) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        res.json({ message: 'Entry deleted' });
    } catch (err) {
        logger.error({ err }, 'DynamoDB DeleteItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/habits/:id/entries — get entries for a habit (?from=&to=&limit=&cursor=)
router.get('/:id/entries', async (req, res) => {
    const email = req.user.email;
    const habitId = req.params.id;
    const { from, to, cursor } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, 500);
    const emailHabitId = email + '#' + habitId;

    const params = {
        TableName: process.env.HABIT_ENTRIES_TABLE,
        KeyConditionExpression: 'emailHabitId = :pk',
        ExpressionAttributeValues: { ':pk': emailHabitId },
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
    }

    if (cursor) {
        try {
            const startKey = JSON.parse(Buffer.from(cursor, 'base64url').toString());
            if (!startKey.emailHabitId || !startKey.emailHabitId.startsWith(email + '#')) {
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
            completed: item.completed,
            note: item.note || '',
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

// GET /api/habits/:id/stats — weekly completion rates
router.get('/:id/stats', async (req, res) => {
    const email = req.user.email;
    const habitId = req.params.id;
    const weeks = Math.min(Math.max(parseInt(req.query.weeks) || 4, 1), 52);
    const emailHabitId = email + '#' + habitId;

    // Calculate date range
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - weeks * 7);
    const fromStr = from.toISOString().split('T')[0];

    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: process.env.HABIT_ENTRIES_TABLE,
                KeyConditionExpression: 'emailHabitId = :pk AND #d >= :from',
                ExpressionAttributeNames: { '#d': 'date' },
                ExpressionAttributeValues: {
                    ':pk': emailHabitId,
                    ':from': fromStr,
                },
            }),
        );

        // Group entries by week
        const weeklyStats = [];
        for (var w = 0; w < weeks; w++) {
            var weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (weeks - w) * 7);
            var weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            var startStr = weekStart.toISOString().split('T')[0];
            var endStr = weekEnd.toISOString().split('T')[0];

            var count = (result.Items || []).filter(function (item) {
                return item.date >= startStr && item.date < endStr;
            }).length;

            weeklyStats.push({
                weekStart: startStr,
                completions: count,
            });
        }

        res.json({ stats: weeklyStats });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
