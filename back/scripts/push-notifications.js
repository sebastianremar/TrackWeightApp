#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const cron = require('node-cron');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');
const { checkAndSendNotification } = require('../lib/pushNotifications');
const logger = require('../lib/logger');

const CONCURRENCY_LIMIT = 5;
const NOTIFICATION_TYPES = ['weight', 'habits', 'calendar'];

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    logger.fatal('JWT_SECRET must be set and at least 32 characters long');
    process.exit(1);
}

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
 * Get today and tomorrow date strings in a given timezone.
 */
function getDatesForTimezone(tz) {
    const now = new Date();

    const fmt = (d, options) =>
        new Intl.DateTimeFormat('en-CA', { timeZone: tz, ...options }).format(d);

    const todayStr = fmt(now, { year: 'numeric', month: '2-digit', day: '2-digit' });

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = fmt(tomorrow, { year: 'numeric', month: '2-digit', day: '2-digit' });

    return { todayStr, tomorrowStr };
}

/**
 * Process items in batches with concurrency limit.
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
 * Main notification job: find users whose notification hour matches,
 * check conditions, and send push notifications.
 */
async function runNotifications() {
    const timezoneHourMap = buildTimezoneHourMap();

    logger.info('Running push notifications check');

    // Scan for users with notifications enabled, a push token, and a timezone
    let users = [];
    let lastKey;

    do {
        const scanParams = {
            TableName: process.env.USERS_TABLE,
            FilterExpression:
                'notificationsEnabled = :true AND attribute_exists(pushToken) AND attribute_exists(#tz)',
            ExpressionAttributeNames: { '#tz': 'timezone' },
            ExpressionAttributeValues: { ':true': true },
        };
        if (lastKey) scanParams.ExclusiveStartKey = lastKey;

        const result = await docClient.send(new ScanCommand(scanParams));
        if (result.Items) users.push(...result.Items);
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    if (users.length === 0) {
        logger.info('No users with notifications enabled');
        return;
    }

    logger.info({ userCount: users.length }, 'Processing notification-enabled users');

    const results = await processInBatches(
        users,
        async (user) => {
            const currentHour = timezoneHourMap.get(user.timezone);
            if (currentHour === undefined) return;

            const { todayStr, tomorrowStr } = getDatesForTimezone(user.timezone);
            const settings = user.notificationSettings || {};
            const lastNotified = user.lastNotified || {};

            for (const type of NOTIFICATION_TYPES) {
                const rule = settings[type];
                if (!rule || !rule.enabled) continue;
                if (rule.hour !== currentHour) continue;
                if (lastNotified[type] === todayStr) continue;

                try {
                    await checkAndSendNotification({ user, type, todayStr, tomorrowStr });
                } catch (err) {
                    logger.error({ err, email: user.email, type }, 'Failed to process notification');
                }
            }
        },
        CONCURRENCY_LIMIT,
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    logger.info({ succeeded, failed, total: users.length }, 'Notification run complete');
}

// Schedule: run every hour at minute 5
cron.schedule('5 * * * *', () => {
    runNotifications().catch((err) => {
        logger.error({ err }, 'Notification cron job failed');
    });
});

logger.info('Push notification scheduler started (runs hourly at :05)');

// Graceful shutdown
function shutdown(signal) {
    logger.info(`${signal} received, shutting down notification scheduler`);
    process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
