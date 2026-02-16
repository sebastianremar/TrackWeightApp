const express = require('express');
const jwt = require('jsonwebtoken');
const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');
const logger = require('../lib/logger');

const router = express.Router();

// GET /api/digest/unsubscribe?token=xxx — public, no auth middleware
router.get('/unsubscribe', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send(unsubPage('Missing token', false));
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.status(400).send(unsubPage('Invalid or expired link. Please update your settings in the app.', false));
    }

    if (payload.action !== 'unsubscribe-digest' || !payload.email) {
        return res.status(400).send(unsubPage('Invalid token', false));
    }

    try {
        await docClient.send(
            new UpdateCommand({
                TableName: process.env.USERS_TABLE,
                Key: { email: payload.email },
                UpdateExpression: 'SET digestEnabled = :false',
                ExpressionAttributeValues: { ':false': false },
            }),
        );
    } catch (err) {
        logger.error({ err, email: payload.email }, 'Failed to unsubscribe user from digest');
        return res.status(500).send(unsubPage('Something went wrong. Please try again later.', false));
    }

    res.send(unsubPage('You have been unsubscribed from the daily digest.', true));
});

function unsubPage(message, success) {
    const color = success ? '#16a34a' : '#dc2626';
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribe - Sara Peso</title></head>
<body style="margin:0;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;text-align:center;">
<div style="max-width:400px;margin:0 auto;background:#fff;padding:40px;border-radius:8px;">
    <h1 style="font-size:20px;color:${color};margin:0 0 12px;">${success ? 'Unsubscribed' : 'Error'}</h1>
    <p style="color:#374151;font-size:15px;margin:0 0 20px;">${message}</p>
    <a href="${process.env.APP_URL || '/'}" style="color:#19747E;text-decoration:none;font-size:14px;">Go to Sara Peso</a>
</div>
</body>
</html>`;
}

module.exports = router;
