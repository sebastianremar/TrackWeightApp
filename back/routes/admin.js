const express = require('express');
const { QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');
const logger = require('../lib/logger');

const router = express.Router();

const PERIOD_HOURS = {
    '24h': 24,
    '7d': 7 * 24,
    '30d': 30 * 24,
};

// GET /api/admin/metrics?period=24h|7d|30d
router.get('/metrics', async (req, res) => {
    const period = PERIOD_HOURS[req.query.period] ? req.query.period : '24h';
    const hours = PERIOD_HOURS[period];

    const now = new Date();
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    from.setMinutes(0, 0, 0);
    const fromStr = from.toISOString();

    const tableName = process.env.METRICS_TABLE;
    if (!tableName) {
        return res.status(503).json({ error: 'Metrics not configured' });
    }

    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: 'metricType = :mt AND timeBucket >= :from',
                ExpressionAttributeValues: {
                    ':mt': 'hourly',
                    ':from': fromStr,
                },
                ScanIndexForward: true,
            }),
        );

        const items = result.Items || [];

        // Build time series
        const timeSeries = items.map((item) => ({
            time: item.timeBucket,
            requests: item.totalRequests,
            errors: (item.byStatus?.['4xx'] || 0) + (item.byStatus?.['5xx'] || 0),
            uniqueUsers: item.uniqueUsers || 0,
            avgResponseMs: item.totalRequests > 0
                ? Math.round(item.totalResponseTimeMs / item.totalRequests)
                : 0,
        }));

        // Aggregate summary
        let totalRequests = 0;
        let totalResponseTimeMs = 0;
        let totalErrors = 0;
        let totalSignups = 0;
        const endpointTotals = {};

        for (const item of items) {
            totalRequests += item.totalRequests;
            totalResponseTimeMs += item.totalResponseTimeMs;
            totalErrors += (item.byStatus?.['4xx'] || 0) + (item.byStatus?.['5xx'] || 0);
            totalSignups += item.newSignups || 0;

            if (item.byEndpoint) {
                for (const [ep, count] of Object.entries(item.byEndpoint)) {
                    endpointTotals[ep] = (endpointTotals[ep] || 0) + count;
                }
            }
        }

        const topEndpoints = Object.entries(endpointTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([endpoint, count]) => ({ endpoint, count }));

        const summary = {
            totalRequests,
            avgResponseMs: totalRequests > 0 ? Math.round(totalResponseTimeMs / totalRequests) : 0,
            errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 10000) / 100 : 0,
            newSignups: totalSignups,
            topEndpoints,
        };

        res.json({ period, timeSeries, summary });
    } catch (err) {
        logger.error({ err }, 'Failed to query metrics');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/users/count
router.get('/users/count', async (req, res) => {
    try {
        let count = 0;
        let lastKey;

        do {
            const params = {
                TableName: process.env.USERS_TABLE,
                Select: 'COUNT',
            };
            if (lastKey) {
                params.ExclusiveStartKey = lastKey;
            }
            const result = await docClient.send(new ScanCommand(params));
            count += result.Count;
            lastKey = result.LastEvaluatedKey;
        } while (lastKey);

        res.json({ count });
    } catch (err) {
        logger.error({ err }, 'Failed to count users');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
