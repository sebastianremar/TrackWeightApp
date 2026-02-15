const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const adminCache = new Map();

async function requireAdmin(req, res, next) {
    const email = req.user.email;

    const cached = adminCache.get(email);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        if (!cached.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        return next();
    }

    try {
        const result = await docClient.send(
            new GetCommand({
                TableName: process.env.USERS_TABLE,
                Key: { email },
                ProjectionExpression: 'isAdmin',
            }),
        );

        const isAdmin = !!(result.Item && result.Item.isAdmin);
        adminCache.set(email, { isAdmin, ts: Date.now() });

        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = requireAdmin;
