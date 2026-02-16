#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { SendEmailCommand } = require('@aws-sdk/client-ses');
const { docClient } = require('../lib/db');
const { sesClient } = require('../lib/ses');
const { gatherDigestData } = require('../lib/digestData');
const { buildDigestHtml } = require('../lib/digestTemplate');
const { generateDigestInsight } = require('../lib/llm');
const logger = require('../lib/logger');

const FROM_EMAIL = process.env.SES_FROM_EMAIL;
const APP_URL = process.env.APP_URL || 'https://sarapeso.com';
const CONCURRENCY_LIMIT = 5;
const MAX_RETRIES = 2;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    logger.fatal('JWT_SECRET must be set and at least 32 characters long');
    process.exit(1);
}

if (!FROM_EMAIL) {
    logger.fatal('SES_FROM_EMAIL must be set');
    process.exit(1);
}

logger.info({ llmEnabled: !!process.env.OPENAI_API_KEY }, 'LLM digest insight status');

/**
 * Build a map of timezone → current hour for all IANA timezones.
 */
function buildTimezoneHourMap() {
    const now = new Date();
    const zones = Intl.supportedValuesOf('timeZone');
    const map = new Map();

    for (const tz of zones) {
        try {
            const hour = parseInt(
                new Intl.DateTimeFormat('en-US', {
                    timeZone: tz,
                    hour: 'numeric',
                    hour12: false,
                }).format(now),
            );
            map.set(tz, hour);
        } catch {
            // Skip invalid timezone
        }
    }
    return map;
}

/**
 * Get today/tomorrow/weekStart date strings in a given timezone.
 */
function getDatesForTimezone(tz) {
    const now = new Date();

    const fmt = (d, options) =>
        new Intl.DateTimeFormat('en-CA', { timeZone: tz, ...options }).format(d);

    const todayStr = fmt(now, { year: 'numeric', month: '2-digit', day: '2-digit' });

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = fmt(tomorrow, { year: 'numeric', month: '2-digit', day: '2-digit' });

    // Week start (Monday)
    const dayOfWeek = new Date(todayStr + 'T00:00:00Z').getUTCDay();
    const mondayOffset = (dayOfWeek + 6) % 7;
    const weekStart = new Date(todayStr + 'T00:00:00Z');
    weekStart.setUTCDate(weekStart.getUTCDate() - mondayOffset);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Is it Sunday? (dayOfWeek === 0)
    const isSunday = dayOfWeek === 0;

    return { todayStr, tomorrowStr, weekStartStr, isSunday };
}

/**
 * Build unsubscribe URL with a signed JWT token.
 */
function buildUnsubscribeUrl(email) {
    const token = jwt.sign(
        { email, action: 'unsubscribe-digest' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' },
    );
    return `${APP_URL}/api/digest/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * Send a single digest email with retries.
 */
async function sendDigestEmail(user, html) {
    const params = {
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [user.email] },
        Message: {
            Subject: { Data: 'Your Daily Digest', Charset: 'UTF-8' },
            Body: { Html: { Data: html, Charset: 'UTF-8' } },
        },
    };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            await sesClient.send(new SendEmailCommand(params));
            return;
        } catch (err) {
            if (attempt === MAX_RETRIES) throw err;
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise((r) => setTimeout(r, delay));
        }
    }
}

/**
 * Process users in batches with concurrency limit.
 */
async function processInBatches(items, fn, limit) {
    const results = [];
    for (let i = 0; i < items.length; i += limit) {
        const batch = items.slice(i, i + limit);
        const batchResults = await Promise.allSettled(batch.map(fn));
        results.push(...batchResults);
    }
    return results;
}

/**
 * Main digest job: find users in matching timezones, gather data, send emails.
 */
async function runDigest() {
    const timezoneHourMap = buildTimezoneHourMap();

    logger.info('Running digest — checking all digest-enabled users');

    // Scan for users with digestEnabled=true and a timezone set
    let users = [];
    let lastKey;

    do {
        const scanParams = {
            TableName: process.env.USERS_TABLE,
            FilterExpression: 'digestEnabled = :true AND attribute_exists(#tz)',
            ExpressionAttributeNames: { '#tz': 'timezone' },
            ExpressionAttributeValues: { ':true': true },
        };
        if (lastKey) scanParams.ExclusiveStartKey = lastKey;

        const result = await docClient.send(new ScanCommand(scanParams));
        const filtered = (result.Items || []).filter((u) => {
            const currentHour = timezoneHourMap.get(u.timezone);
            const preferredHour = u.digestHour ?? 19;
            return currentHour === preferredHour;
        });
        users.push(...filtered);
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    if (users.length === 0) {
        logger.info('No users to send digest to');
        return;
    }

    logger.info({ userCount: users.length }, 'Sending digest emails');

    const results = await processInBatches(users, async (user) => {
        try {
            const { todayStr, tomorrowStr, weekStartStr, isSunday } = getDatesForTimezone(user.timezone);
            const data = await gatherDigestData(user.email, todayStr, tomorrowStr, weekStartStr);
            const aiInsight = await generateDigestInsight(data);
            const firstName = user.firstName || user.name.split(' ')[0] || 'there';

            const dateLabel = new Intl.DateTimeFormat('en-US', {
                timeZone: user.timezone,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }).format(new Date());

            const unsubscribeUrl = buildUnsubscribeUrl(user.email);

            const html = buildDigestHtml({
                firstName,
                dateLabel,
                isSunday,
                appUrl: APP_URL,
                unsubscribeUrl,
                data,
                aiInsight,
            });

            await sendDigestEmail(user, html);
            logger.info({ email: user.email }, 'Digest sent');
        } catch (err) {
            logger.error({ err, email: user.email }, 'Failed to send digest');
            throw err;
        }
    }, CONCURRENCY_LIMIT);

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    logger.info({ succeeded, failed, total: users.length }, 'Digest run complete');
}

// Schedule: run every hour at minute 0
cron.schedule('0 * * * *', () => {
    runDigest().catch((err) => {
        logger.error({ err }, 'Digest cron job failed');
    });
});

logger.info('Daily digest scheduler started (runs hourly at :00)');

// Graceful shutdown
function shutdown(signal) {
    logger.info(`${signal} received, shutting down digest scheduler`);
    process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
