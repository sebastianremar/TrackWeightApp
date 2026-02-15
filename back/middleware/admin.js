const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');

async function requireAdmin(req, res, next) {
    try {
        const result = await docClient.send(
            new GetCommand({
                TableName: process.env.USERS_TABLE,
                Key: { email: req.user.email },
                ProjectionExpression: 'isAdmin',
            }),
        );

        if (!result.Item || !result.Item.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = requireAdmin;
