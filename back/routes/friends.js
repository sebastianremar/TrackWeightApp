const express = require('express');
const { QueryCommand, GetCommand, TransactWriteCommand, UpdateCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');
const logger = require('../lib/logger');

const router = express.Router();

// POST /api/friends/request — send a friend request
router.post('/request', async (req, res) => {
    const senderEmail = req.user.email;
    const { email: recipientEmail } = req.body;

    if (!recipientEmail || typeof recipientEmail !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
    }

    const recipient = recipientEmail.trim().toLowerCase();

    if (recipient === senderEmail) {
        return res.status(400).json({ error: 'You cannot add yourself' });
    }

    // Check recipient exists
    try {
        const userResult = await docClient.send(
            new GetCommand({
                TableName: process.env.USERS_TABLE,
                Key: { email: recipient },
            }),
        );
        if (!userResult.Item) {
            return res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    // Check if already friends or pending
    try {
        const existing = await docClient.send(
            new GetCommand({
                TableName: process.env.FRIENDSHIPS_TABLE,
                Key: { email: senderEmail, friendEmail: recipient },
            }),
        );
        if (existing.Item) {
            var status = existing.Item.status;
            if (status === 'accepted') {
                return res.status(400).json({ error: 'Already friends' });
            }
            return res.status(400).json({ error: 'Request already pending' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const now = new Date().toISOString();

    // Write two rows atomically: sender row + recipient row
    try {
        await docClient.send(
            new TransactWriteCommand({
                TransactItems: [
                    {
                        Put: {
                            TableName: process.env.FRIENDSHIPS_TABLE,
                            Item: {
                                email: senderEmail,
                                friendEmail: recipient,
                                status: 'pending',
                                direction: 'sent',
                                createdAt: now,
                                updatedAt: now,
                            },
                        },
                    },
                    {
                        Put: {
                            TableName: process.env.FRIENDSHIPS_TABLE,
                            Item: {
                                email: recipient,
                                friendEmail: senderEmail,
                                status: 'pending',
                                direction: 'received',
                                createdAt: now,
                                updatedAt: now,
                            },
                        },
                    },
                ],
            }),
        );
        res.status(201).json({ message: 'Friend request sent' });
    } catch (err) {
        logger.error({ err }, 'DynamoDB TransactWrite error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/friends/respond — accept or reject a request
router.post('/respond', async (req, res) => {
    const userEmail = req.user.email;
    const { email: senderEmail, accept } = req.body;

    if (!senderEmail || typeof accept !== 'boolean') {
        return res.status(400).json({ error: 'Email and accept (boolean) are required' });
    }

    const sender = senderEmail.trim().toLowerCase();

    // Check that there's a pending received request
    try {
        const existing = await docClient.send(
            new GetCommand({
                TableName: process.env.FRIENDSHIPS_TABLE,
                Key: { email: userEmail, friendEmail: sender },
            }),
        );
        if (
            !existing.Item ||
            existing.Item.status !== 'pending' ||
            existing.Item.direction !== 'received'
        ) {
            return res.status(404).json({ error: 'No pending request from this user' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const now = new Date().toISOString();

    if (accept) {
        // Update both rows to accepted atomically
        try {
            await docClient.send(
                new TransactWriteCommand({
                    TransactItems: [
                        {
                            Put: {
                                TableName: process.env.FRIENDSHIPS_TABLE,
                                Item: {
                                    email: userEmail,
                                    friendEmail: sender,
                                    status: 'accepted',
                                    direction: 'received',
                                    createdAt: now,
                                    updatedAt: now,
                                },
                            },
                        },
                        {
                            Put: {
                                TableName: process.env.FRIENDSHIPS_TABLE,
                                Item: {
                                    email: sender,
                                    friendEmail: userEmail,
                                    status: 'accepted',
                                    direction: 'sent',
                                    createdAt: now,
                                    updatedAt: now,
                                },
                            },
                        },
                    ],
                }),
            );
            res.json({ message: 'Friend request accepted' });
        } catch (err) {
            logger.error({ err }, 'DynamoDB TransactWrite error');
            return res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        // Delete both rows atomically
        try {
            await docClient.send(
                new TransactWriteCommand({
                    TransactItems: [
                        {
                            Delete: {
                                TableName: process.env.FRIENDSHIPS_TABLE,
                                Key: { email: userEmail, friendEmail: sender },
                            },
                        },
                        {
                            Delete: {
                                TableName: process.env.FRIENDSHIPS_TABLE,
                                Key: { email: sender, friendEmail: userEmail },
                            },
                        },
                    ],
                }),
            );
            res.json({ message: 'Friend request rejected' });
        } catch (err) {
            logger.error({ err }, 'DynamoDB TransactWrite error');
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// GET /api/friends — list accepted friends
router.get('/', async (req, res) => {
    const email = req.user.email;

    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: process.env.FRIENDSHIPS_TABLE,
                KeyConditionExpression: 'email = :email',
                FilterExpression: '#s = :accepted',
                ExpressionAttributeNames: { '#s': 'status' },
                ExpressionAttributeValues: { ':email': email, ':accepted': 'accepted' },
            }),
        );

        const items = result.Items || [];
        if (items.length === 0) {
            return res.json({ friends: [] });
        }

        // Batch lookup friend names (up to 100 per BatchGet)
        const nameMap = {};
        const keys = items.map((item) => ({ email: item.friendEmail }));
        for (let i = 0; i < keys.length; i += 100) {
            try {
                const batch = await docClient.send(
                    new BatchGetCommand({
                        RequestItems: {
                            [process.env.USERS_TABLE]: {
                                Keys: keys.slice(i, i + 100),
                                ProjectionExpression: 'email, #n',
                                ExpressionAttributeNames: { '#n': 'name' },
                            },
                        },
                    }),
                );
                for (const user of batch.Responses[process.env.USERS_TABLE] || []) {
                    nameMap[user.email] = user.name;
                }
            } catch (err) {
                logger.error({ err }, 'BatchGet friend names failed');
            }
        }

        const friends = items.map((item) => ({
            email: item.friendEmail,
            name: nameMap[item.friendEmail] || item.friendEmail,
            favorite: item.favorite || false,
        }));

        res.json({ friends });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/friends/requests — pending incoming requests
router.get('/requests', async (req, res) => {
    const email = req.user.email;

    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: process.env.FRIENDSHIPS_TABLE,
                KeyConditionExpression: 'email = :email',
                FilterExpression: '#s = :pending AND direction = :received',
                ExpressionAttributeNames: { '#s': 'status' },
                ExpressionAttributeValues: {
                    ':email': email,
                    ':pending': 'pending',
                    ':received': 'received',
                },
            }),
        );

        const items = result.Items || [];
        if (items.length === 0) {
            return res.json({ requests: [] });
        }

        // Batch lookup requester names
        const nameMap = {};
        const keys = items.map((item) => ({ email: item.friendEmail }));
        for (let i = 0; i < keys.length; i += 100) {
            try {
                const batch = await docClient.send(
                    new BatchGetCommand({
                        RequestItems: {
                            [process.env.USERS_TABLE]: {
                                Keys: keys.slice(i, i + 100),
                                ProjectionExpression: 'email, #n',
                                ExpressionAttributeNames: { '#n': 'name' },
                            },
                        },
                    }),
                );
                for (const user of batch.Responses[process.env.USERS_TABLE] || []) {
                    nameMap[user.email] = user.name;
                }
            } catch (err) {
                logger.error({ err }, 'BatchGet requester names failed');
            }
        }

        const requests = items.map((item) => ({
            email: item.friendEmail,
            name: nameMap[item.friendEmail] || item.friendEmail,
            createdAt: item.createdAt,
        }));

        res.json({ requests });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/friends/:email/favorite — toggle favorite status
router.patch('/:email/favorite', async (req, res) => {
    const userEmail = req.user.email;
    const friendEmail = decodeURIComponent(req.params.email).trim().toLowerCase();
    const { favorite } = req.body;

    if (typeof favorite !== 'boolean') {
        return res.status(400).json({ error: 'favorite must be a boolean' });
    }

    try {
        await docClient.send(
            new UpdateCommand({
                TableName: process.env.FRIENDSHIPS_TABLE,
                Key: { email: userEmail, friendEmail },
                UpdateExpression: 'SET favorite = :fav',
                ConditionExpression: '#s = :accepted',
                ExpressionAttributeNames: { '#s': 'status' },
                ExpressionAttributeValues: { ':fav': favorite, ':accepted': 'accepted' },
            }),
        );
        res.json({ favorite });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Friendship not found' });
        }
        logger.error({ err }, 'DynamoDB UpdateItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/friends/:email — remove friendship
router.delete('/:email', async (req, res) => {
    const userEmail = req.user.email;
    const friendEmail = decodeURIComponent(req.params.email).trim().toLowerCase();

    try {
        await docClient.send(
            new TransactWriteCommand({
                TransactItems: [
                    {
                        Delete: {
                            TableName: process.env.FRIENDSHIPS_TABLE,
                            Key: { email: userEmail, friendEmail },
                        },
                    },
                    {
                        Delete: {
                            TableName: process.env.FRIENDSHIPS_TABLE,
                            Key: { email: friendEmail, friendEmail: userEmail },
                        },
                    },
                ],
            }),
        );
        res.json({ message: 'Friend removed' });
    } catch (err) {
        logger.error({ err }, 'DynamoDB TransactWrite error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/friends/:email/habits — get friend's habits
router.get('/:email/habits', async (req, res) => {
    const userEmail = req.user.email;
    const friendEmail = decodeURIComponent(req.params.email).trim().toLowerCase();

    // Verify accepted friendship
    try {
        const friendship = await docClient.send(
            new GetCommand({
                TableName: process.env.FRIENDSHIPS_TABLE,
                Key: { email: userEmail, friendEmail },
            }),
        );
        if (!friendship.Item || friendship.Item.status !== 'accepted') {
            return res.status(403).json({ error: 'Not friends with this user' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: process.env.HABITS_TABLE,
                KeyConditionExpression: 'email = :email',
                FilterExpression: 'attribute_not_exists(archived) OR archived <> :t',
                ExpressionAttributeValues: { ':email': friendEmail, ':t': true },
            }),
        );

        const habits = (result.Items || []).map((item) => ({
            habitId: item.habitId,
            name: item.name,
            targetFrequency: item.targetFrequency,
            color: item.color,
            type: item.type || 'good',
            limitPeriod: item.limitPeriod,
            createdAt: item.createdAt,
        }));

        res.json({ habits });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/friends/:email/habits/stats — friend's habit completion stats
router.get('/:email/habits/stats', async (req, res) => {
    const userEmail = req.user.email;
    const friendEmail = decodeURIComponent(req.params.email).trim().toLowerCase();
    const period = req.query.period === 'month' ? 'month' : 'week';

    // Verify accepted friendship
    try {
        const friendship = await docClient.send(
            new GetCommand({
                TableName: process.env.FRIENDSHIPS_TABLE,
                Key: { email: userEmail, friendEmail },
            }),
        );
        if (!friendship.Item || friendship.Item.status !== 'accepted') {
            return res.status(403).json({ error: 'Not friends with this user' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const now = new Date();
    let from, to;

    if (period === 'week') {
        const dow = (now.getDay() + 6) % 7;
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
                ExpressionAttributeValues: { ':email': friendEmail, ':from': fromStr, ':to': toStr },
            }),
        );

        const counts = {};
        for (const item of result.Items || []) {
            if (item.completed) {
                counts[item.habitId] = (counts[item.habitId] || 0) + 1;
            }
        }

        const diffMs = to.getTime() - from.getTime();
        const totalDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;

        res.json({ counts, period, from: fromStr, to: toStr, totalDays });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/friends/:email/weight — get friend's weight data (if they share)
router.get('/:email/weight', async (req, res) => {
    const userEmail = req.user.email;
    const friendEmail = decodeURIComponent(req.params.email).trim().toLowerCase();

    // Verify accepted friendship
    try {
        const friendship = await docClient.send(
            new GetCommand({
                TableName: process.env.FRIENDSHIPS_TABLE,
                Key: { email: userEmail, friendEmail },
            }),
        );
        if (!friendship.Item || friendship.Item.status !== 'accepted') {
            return res.status(403).json({ error: 'Not friends with this user' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    // Fetch friend's weight history (last 90 days)
    const from = new Date();
    from.setDate(from.getDate() - 90);
    const fromStr = from.toISOString().split('T')[0];

    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: process.env.WEIGHT_TABLE,
                KeyConditionExpression: 'email = :email AND #d >= :from',
                ExpressionAttributeNames: { '#d': 'date' },
                ExpressionAttributeValues: { ':email': friendEmail, ':from': fromStr },
                ScanIndexForward: true,
            }),
        );

        const entries = (result.Items || []).map((item) => ({
            date: item.date,
            weight: item.weight,
        }));

        res.json({ entries });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
