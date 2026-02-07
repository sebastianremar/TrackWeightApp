const express = require('express');
const { PutCommand, QueryCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');

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
        const userResult = await docClient.send(new GetCommand({
            TableName: process.env.USERS_TABLE,
            Key: { email: recipient }
        }));
        if (!userResult.Item) {
            return res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error('DynamoDB GetItem error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }

    // Check if already friends or pending
    try {
        const existing = await docClient.send(new GetCommand({
            TableName: process.env.FRIENDSHIPS_TABLE,
            Key: { email: senderEmail, friendEmail: recipient }
        }));
        if (existing.Item) {
            var status = existing.Item.status;
            if (status === 'accepted') {
                return res.status(400).json({ error: 'Already friends' });
            }
            return res.status(400).json({ error: 'Request already pending' });
        }
    } catch (err) {
        console.error('DynamoDB GetItem error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }

    const now = new Date().toISOString();

    // Write two rows: sender row + recipient row
    try {
        await docClient.send(new PutCommand({
            TableName: process.env.FRIENDSHIPS_TABLE,
            Item: {
                email: senderEmail,
                friendEmail: recipient,
                status: 'pending',
                direction: 'sent',
                createdAt: now,
                updatedAt: now
            }
        }));
        await docClient.send(new PutCommand({
            TableName: process.env.FRIENDSHIPS_TABLE,
            Item: {
                email: recipient,
                friendEmail: senderEmail,
                status: 'pending',
                direction: 'received',
                createdAt: now,
                updatedAt: now
            }
        }));
        res.status(201).json({ message: 'Friend request sent' });
    } catch (err) {
        console.error('DynamoDB PutItem error:', err);
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
        const existing = await docClient.send(new GetCommand({
            TableName: process.env.FRIENDSHIPS_TABLE,
            Key: { email: userEmail, friendEmail: sender }
        }));
        if (!existing.Item || existing.Item.status !== 'pending' || existing.Item.direction !== 'received') {
            return res.status(404).json({ error: 'No pending request from this user' });
        }
    } catch (err) {
        console.error('DynamoDB GetItem error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }

    const now = new Date().toISOString();

    if (accept) {
        // Update both rows to accepted
        try {
            await docClient.send(new PutCommand({
                TableName: process.env.FRIENDSHIPS_TABLE,
                Item: {
                    email: userEmail,
                    friendEmail: sender,
                    status: 'accepted',
                    direction: 'received',
                    createdAt: now,
                    updatedAt: now
                }
            }));
            await docClient.send(new PutCommand({
                TableName: process.env.FRIENDSHIPS_TABLE,
                Item: {
                    email: sender,
                    friendEmail: userEmail,
                    status: 'accepted',
                    direction: 'sent',
                    createdAt: now,
                    updatedAt: now
                }
            }));
            res.json({ message: 'Friend request accepted' });
        } catch (err) {
            console.error('DynamoDB PutItem error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        // Delete both rows
        try {
            await docClient.send(new DeleteCommand({
                TableName: process.env.FRIENDSHIPS_TABLE,
                Key: { email: userEmail, friendEmail: sender }
            }));
            await docClient.send(new DeleteCommand({
                TableName: process.env.FRIENDSHIPS_TABLE,
                Key: { email: sender, friendEmail: userEmail }
            }));
            res.json({ message: 'Friend request rejected' });
        } catch (err) {
            console.error('DynamoDB DeleteItem error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// GET /api/friends — list accepted friends
router.get('/', async (req, res) => {
    const email = req.user.email;

    try {
        const result = await docClient.send(new QueryCommand({
            TableName: process.env.FRIENDSHIPS_TABLE,
            KeyConditionExpression: 'email = :email',
            FilterExpression: '#s = :accepted',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':email': email, ':accepted': 'accepted' }
        }));

        // Look up friend names
        const friends = [];
        for (const item of (result.Items || [])) {
            try {
                const userResult = await docClient.send(new GetCommand({
                    TableName: process.env.USERS_TABLE,
                    Key: { email: item.friendEmail }
                }));
                friends.push({
                    email: item.friendEmail,
                    name: userResult.Item ? userResult.Item.name : item.friendEmail,
                    shareWeight: userResult.Item ? (userResult.Item.shareWeight || false) : false
                });
            } catch (e) {
                friends.push({ email: item.friendEmail, name: item.friendEmail, shareWeight: false });
            }
        }

        res.json({ friends });
    } catch (err) {
        console.error('DynamoDB Query error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/friends/requests — pending incoming requests
router.get('/requests', async (req, res) => {
    const email = req.user.email;

    try {
        const result = await docClient.send(new QueryCommand({
            TableName: process.env.FRIENDSHIPS_TABLE,
            KeyConditionExpression: 'email = :email',
            FilterExpression: '#s = :pending AND direction = :received',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: {
                ':email': email,
                ':pending': 'pending',
                ':received': 'received'
            }
        }));

        const requests = [];
        for (const item of (result.Items || [])) {
            try {
                const userResult = await docClient.send(new GetCommand({
                    TableName: process.env.USERS_TABLE,
                    Key: { email: item.friendEmail }
                }));
                requests.push({
                    email: item.friendEmail,
                    name: userResult.Item ? userResult.Item.name : item.friendEmail,
                    createdAt: item.createdAt
                });
            } catch (e) {
                requests.push({ email: item.friendEmail, name: item.friendEmail, createdAt: item.createdAt });
            }
        }

        res.json({ requests });
    } catch (err) {
        console.error('DynamoDB Query error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/friends/:email — remove friendship
router.delete('/:email', async (req, res) => {
    const userEmail = req.user.email;
    const friendEmail = decodeURIComponent(req.params.email).trim().toLowerCase();

    try {
        await docClient.send(new DeleteCommand({
            TableName: process.env.FRIENDSHIPS_TABLE,
            Key: { email: userEmail, friendEmail }
        }));
        await docClient.send(new DeleteCommand({
            TableName: process.env.FRIENDSHIPS_TABLE,
            Key: { email: friendEmail, friendEmail: userEmail }
        }));
        res.json({ message: 'Friend removed' });
    } catch (err) {
        console.error('DynamoDB DeleteItem error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/friends/:email/weight — get friend's weight data (if they share)
router.get('/:email/weight', async (req, res) => {
    const userEmail = req.user.email;
    const friendEmail = decodeURIComponent(req.params.email).trim().toLowerCase();

    // Verify accepted friendship
    try {
        const friendship = await docClient.send(new GetCommand({
            TableName: process.env.FRIENDSHIPS_TABLE,
            Key: { email: userEmail, friendEmail }
        }));
        if (!friendship.Item || friendship.Item.status !== 'accepted') {
            return res.status(403).json({ error: 'Not friends with this user' });
        }
    } catch (err) {
        console.error('DynamoDB GetItem error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }

    // Check friend's privacy setting
    try {
        const friendUser = await docClient.send(new GetCommand({
            TableName: process.env.USERS_TABLE,
            Key: { email: friendEmail }
        }));
        if (!friendUser.Item || !friendUser.Item.shareWeight) {
            return res.status(403).json({ error: 'This friend does not share their weight data' });
        }
    } catch (err) {
        console.error('DynamoDB GetItem error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }

    // Fetch friend's weight history (last 90 days)
    const from = new Date();
    from.setDate(from.getDate() - 90);
    const fromStr = from.toISOString().split('T')[0];

    try {
        const result = await docClient.send(new QueryCommand({
            TableName: process.env.WEIGHT_TABLE,
            KeyConditionExpression: 'email = :email AND #d >= :from',
            ExpressionAttributeNames: { '#d': 'date' },
            ExpressionAttributeValues: { ':email': friendEmail, ':from': fromStr },
            ScanIndexForward: true
        }));

        const entries = (result.Items || []).map(item => ({
            date: item.date,
            weight: item.weight
        }));

        res.json({ entries });
    } catch (err) {
        console.error('DynamoDB Query error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
