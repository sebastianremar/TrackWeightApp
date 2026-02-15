const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('./db');
const logger = require('./logger');

const TTL_DAYS = 90;

function getHourBucket(date = new Date()) {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    return d.toISOString();
}

let currentBucket = createEmptyBucket();
let flushInterval = null;

function createEmptyBucket() {
    return {
        timeBucket: getHourBucket(),
        totalRequests: 0,
        byEndpoint: {},
        byMethod: {},
        byStatus: {},
        uniqueUsers: new Set(),
        newSignups: 0,
        totalResponseTimeMs: 0,
    };
}

function normalizeEndpoint(method, url) {
    const path = url.split('?')[0];
    const normalized = path
        // habits: preserve fixed sub-routes before dynamic replacements
        .replace(/\/api\/habits\/(stats|entries)(\/|$)/, '/api/habits/$1$2')
        .replace(/\/api\/habits\/[^/]+\/entries\/\d{4}-\d{2}-\d{2}/, '/api/habits/:id/entries/:date')
        .replace(/\/api\/habits\/[^/]+\/entries/, '/api/habits/:id/entries')
        .replace(/\/api\/habits\/[^/]+\/stats/, '/api/habits/:id/stats')
        .replace(/\/api\/habits\/(?!stats|entries)[^/]+/, '/api/habits/:id')
        // weight: preserve /weight/latest
        .replace(/\/api\/weight\/(?!latest)[^/]+/, '/api/weight/:date')
        // friends: preserve fixed sub-routes before dynamic replacements
        .replace(/\/api\/friends\/(?!request$|respond$|requests$)[^/]+\/weight/, '/api/friends/:email/weight')
        .replace(/\/api\/friends\/(?!request$|respond$|requests$)[^/]+\/habits\/stats/, '/api/friends/:email/habits/stats')
        .replace(/\/api\/friends\/(?!request$|respond$|requests$)[^/]+\/habits/, '/api/friends/:email/habits')
        .replace(/\/api\/friends\/(?!request$|respond$|requests$)[^/]+\/favorite/, '/api/friends/:email/favorite')
        .replace(/\/api\/friends\/(?!request|respond|requests)[^/]+/, '/api/friends/:email');
    return `${method} ${normalized}`;
}

function recordRequest({ method, url, status, responseTimeMs, userEmail, isSignup }) {
    if (url === '/health') return;

    const now = getHourBucket();
    if (now !== currentBucket.timeBucket) {
        flushMetrics();
        currentBucket = createEmptyBucket();
    }

    currentBucket.totalRequests++;
    currentBucket.totalResponseTimeMs += responseTimeMs;

    const endpoint = normalizeEndpoint(method, url);
    currentBucket.byEndpoint[endpoint] = (currentBucket.byEndpoint[endpoint] || 0) + 1;

    currentBucket.byMethod[method] = (currentBucket.byMethod[method] || 0) + 1;

    const statusGroup = `${Math.floor(status / 100)}xx`;
    currentBucket.byStatus[statusGroup] = (currentBucket.byStatus[statusGroup] || 0) + 1;

    if (userEmail) {
        currentBucket.uniqueUsers.add(userEmail);
    }

    if (isSignup) {
        currentBucket.newSignups++;
    }
}

async function flushMetrics() {
    if (currentBucket.totalRequests === 0) return;

    const tableName = process.env.METRICS_TABLE;
    if (!tableName) return;

    const ttl = Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60;

    const item = {
        metricType: 'hourly',
        timeBucket: currentBucket.timeBucket,
        totalRequests: currentBucket.totalRequests,
        byEndpoint: currentBucket.byEndpoint,
        byMethod: currentBucket.byMethod,
        byStatus: currentBucket.byStatus,
        uniqueUsers: currentBucket.uniqueUsers.size,
        newSignups: currentBucket.newSignups,
        totalResponseTimeMs: currentBucket.totalResponseTimeMs,
        flushedAt: new Date().toISOString(),
        ttl,
    };

    try {
        await docClient.send(
            new PutCommand({
                TableName: tableName,
                Item: item,
            }),
        );
    } catch (err) {
        logger.error({ err }, 'Failed to flush metrics to DynamoDB');
    }
}

function startFlushInterval(ms = 60000) {
    flushInterval = setInterval(() => flushMetrics(), ms);
}

function stopFlushInterval() {
    if (flushInterval) {
        clearInterval(flushInterval);
        flushInterval = null;
    }
    return flushMetrics();
}

module.exports = { recordRequest, flushMetrics, startFlushInterval, stopFlushInterval };
