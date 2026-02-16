const jwt = require('jsonwebtoken');
const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');

async function authenticate(req, res, next) {
    // Read token from HTTP-only cookie first, fall back to Authorization header
    let token = req.cookies && req.cookies.token;

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify tokenVersion against DB to support revocation
    try {
        const result = await docClient.send(
            new GetCommand({
                TableName: process.env.USERS_TABLE,
                Key: { email: decoded.email },
                ProjectionExpression: 'tokenVersion',
            }),
        );

        const dbVersion = result.Item?.tokenVersion ?? 0;
        const tokenVersion = decoded.tokenVersion ?? 0;

        if (tokenVersion !== dbVersion) {
            return res.status(401).json({ error: 'Token has been revoked' });
        }
    } catch {
        return res.status(500).json({ error: 'Internal server error' });
    }

    req.user = { email: decoded.email };
    next();
}

module.exports = authenticate;
