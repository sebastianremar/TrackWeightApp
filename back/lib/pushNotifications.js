const { QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('./db');
const logger = require('./logger');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_RETRIES = 2;

/**
 * Check if a user has logged weight today.
 */
async function hasLoggedWeightToday(email, todayStr) {
    const result = await docClient.send(
        new QueryCommand({
            TableName: process.env.WEIGHT_TABLE,
            KeyConditionExpression: 'email = :email AND #d = :date',
            ExpressionAttributeNames: { '#d': 'date' },
            ExpressionAttributeValues: { ':email': email, ':date': todayStr },
            Select: 'COUNT',
        }),
    );
    return result.Count > 0;
}

/**
 * Check if a user has completed all active (good) habits today.
 */
async function hasCompletedAllHabitsToday(email, todayStr) {
    const [habits, entries] = await Promise.all([
        docClient.send(
            new QueryCommand({
                TableName: process.env.HABITS_TABLE,
                KeyConditionExpression: 'email = :email',
                FilterExpression: 'archived <> :true',
                ExpressionAttributeValues: { ':email': email, ':true': true },
                Select: 'COUNT',
            }),
        ),
        docClient.send(
            new QueryCommand({
                TableName: process.env.HABIT_ENTRIES_TABLE,
                IndexName: 'HabitEntriesByUser',
                KeyConditionExpression: 'email = :email AND #d = :date',
                ExpressionAttributeNames: { '#d': 'date' },
                ExpressionAttributeValues: { ':email': email, ':date': todayStr },
                FilterExpression: 'completed = :true',
                Select: 'COUNT',
            }),
        ),
    ]);

    const activeCount = habits.Count;
    if (activeCount === 0) return true; // no habits = "complete"
    return entries.Count >= activeCount;
}

/**
 * Check if a user has calendar events planned for tomorrow.
 */
async function hasTomorrowPlanned(email, tomorrowStr) {
    const result = await docClient.send(
        new QueryCommand({
            TableName: process.env.CALENDAR_EVENTS_TABLE,
            IndexName: 'EventsByDate',
            KeyConditionExpression: 'email = :email AND #d = :date',
            ExpressionAttributeNames: { '#d': 'date' },
            ExpressionAttributeValues: { ':email': email, ':date': tomorrowStr },
            Select: 'COUNT',
        }),
    );
    return result.Count > 0;
}

/**
 * Send a push notification via Expo Push API with retries.
 */
async function sendExpoPush(pushToken, title, body) {
    const payload = JSON.stringify({
        to: pushToken,
        title,
        body,
        sound: 'default',
    });

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const res = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
        });

        const data = await res.json();

        if (data.data) {
            const ticket = data.data;
            if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
                const err = new Error('DeviceNotRegistered');
                err.code = 'DeviceNotRegistered';
                throw err;
            }
            return ticket;
        }

        if (attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise((r) => setTimeout(r, delay));
        }
    }

    throw new Error('Failed to send push notification after retries');
}

/**
 * Mark a notification type as sent for today.
 */
async function markNotified(email, type, todayStr) {
    await docClient.send(
        new UpdateCommand({
            TableName: process.env.USERS_TABLE,
            Key: { email },
            UpdateExpression: 'SET lastNotified.#type = :today',
            ExpressionAttributeNames: { '#type': type },
            ExpressionAttributeValues: { ':today': todayStr },
        }),
    );
}

/**
 * Clear push token and disable notifications (e.g. on DeviceNotRegistered).
 */
async function clearPushToken(email) {
    await docClient.send(
        new UpdateCommand({
            TableName: process.env.USERS_TABLE,
            Key: { email },
            UpdateExpression: 'REMOVE pushToken SET notificationsEnabled = :false',
            ExpressionAttributeValues: { ':false': false },
        }),
    );
}

const NOTIFICATION_CONFIG = {
    weight: {
        title: 'Weight Reminder',
        body: "Don't forget to log your weight today!",
        check: hasLoggedWeightToday,
    },
    habits: {
        title: 'Habits Reminder',
        body: 'You still have habits to complete today!',
        check: hasCompletedAllHabitsToday,
    },
    calendar: {
        title: 'Calendar Reminder',
        body: "Plan your day — tomorrow's calendar is empty!",
        check: hasTomorrowPlanned,
    },
};

/**
 * Check condition and send notification for a single type.
 *
 * @param {object} params
 * @param {object} params.user - DynamoDB user item
 * @param {string} params.type - 'weight' | 'habits' | 'calendar'
 * @param {string} params.todayStr - YYYY-MM-DD
 * @param {string} params.tomorrowStr - YYYY-MM-DD
 */
async function checkAndSendNotification({ user, type, todayStr, tomorrowStr }) {
    const config = NOTIFICATION_CONFIG[type];
    if (!config) return;

    // calendar uses tomorrowStr, others use todayStr
    const dateArg = type === 'calendar' ? tomorrowStr : todayStr;

    try {
        const alreadyDone = await config.check(user.email, dateArg);
        if (alreadyDone) {
            await markNotified(user.email, type, todayStr);
            logger.debug({ email: user.email, type }, 'Condition met, skipping notification');
            return;
        }

        await sendExpoPush(user.pushToken, config.title, config.body);
        await markNotified(user.email, type, todayStr);
        logger.info({ email: user.email, type }, 'Push notification sent');
    } catch (err) {
        if (err.code === 'DeviceNotRegistered') {
            logger.warn({ email: user.email }, 'Device not registered, clearing push token');
            await clearPushToken(user.email);
            return;
        }
        throw err;
    }
}

module.exports = {
    hasLoggedWeightToday,
    hasCompletedAllHabitsToday,
    hasTomorrowPlanned,
    sendExpoPush,
    markNotified,
    clearPushToken,
    checkAndSendNotification,
};
