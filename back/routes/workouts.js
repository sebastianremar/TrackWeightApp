const express = require('express');
const {
    PutCommand,
    QueryCommand,
    GetCommand,
    UpdateCommand,
    DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');
const logger = require('../lib/logger');

const router = express.Router();

// --- Helpers ---

function generateUlid() {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).substring(2, 10);
    return t + r;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_DAY_KEYS = ['0', '1', '2', '3', '4', '5', '6'];

function validateSchedule(schedule) {
    if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
        return 'Schedule must be an object';
    }
    const keys = Object.keys(schedule);
    if (keys.length === 0) return 'Schedule must have at least 1 day';
    for (const key of keys) {
        if (!VALID_DAY_KEYS.includes(key)) {
            return `Invalid day key "${key}" (must be 0-6)`;
        }
        const day = schedule[key];
        if (!day || typeof day !== 'object') return `Day "${key}" must be an object`;
        if (!day.label || typeof day.label !== 'string' || day.label.trim().length === 0 || day.label.trim().length > 50) {
            return `Day "${key}" label is required (max 50 chars)`;
        }
        if (day.muscleGroups !== undefined) {
            if (!Array.isArray(day.muscleGroups) || day.muscleGroups.length > 10) {
                return `Day "${key}" muscleGroups must be an array (max 10)`;
            }
            for (const mg of day.muscleGroups) {
                if (typeof mg !== 'string' || mg.length > 30) {
                    return `Day "${key}" muscleGroups items must be strings (max 30 chars)`;
                }
            }
        }
        if (!Array.isArray(day.exercises) || day.exercises.length === 0 || day.exercises.length > 20) {
            return `Day "${key}" exercises must be an array (1-20 items)`;
        }
        for (let i = 0; i < day.exercises.length; i++) {
            const ex = day.exercises[i];
            if (!ex.name || typeof ex.name !== 'string' || ex.name.trim().length === 0 || ex.name.trim().length > 100) {
                return `Day "${key}" exercise ${i} name is required (max 100 chars)`;
            }
            if (ex.muscleGroup !== undefined && (typeof ex.muscleGroup !== 'string' || ex.muscleGroup.length > 30)) {
                return `Day "${key}" exercise ${i} muscleGroup must be a string (max 30 chars)`;
            }
            const sets = parseInt(ex.sets);
            if (!Number.isInteger(sets) || sets < 1 || sets > 20) {
                return `Day "${key}" exercise ${i} sets must be an integer 1-20`;
            }
            if (!ex.reps || typeof ex.reps !== 'string' || ex.reps.length > 20) {
                return `Day "${key}" exercise ${i} reps is required (max 20 chars)`;
            }
            if (ex.restSec !== undefined) {
                const rest = parseInt(ex.restSec);
                if (!Number.isInteger(rest) || rest < 0 || rest > 600) {
                    return `Day "${key}" exercise ${i} restSec must be 0-600`;
                }
            }
        }
    }
    return null;
}

function validateLogExercises(exercises) {
    if (!Array.isArray(exercises) || exercises.length === 0 || exercises.length > 30) {
        return 'Exercises must be an array (1-30 items)';
    }
    for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        if (!ex.name || typeof ex.name !== 'string' || ex.name.trim().length === 0 || ex.name.trim().length > 100) {
            return `Exercise ${i} name is required (max 100 chars)`;
        }
        if (ex.muscleGroup !== undefined && (typeof ex.muscleGroup !== 'string' || ex.muscleGroup.length > 30)) {
            return `Exercise ${i} muscleGroup must be a string (max 30 chars)`;
        }
        if (!Array.isArray(ex.sets) || ex.sets.length === 0 || ex.sets.length > 20) {
            return `Exercise ${i} sets must be an array (1-20 items)`;
        }
        for (let j = 0; j < ex.sets.length; j++) {
            const s = ex.sets[j];
            if (typeof s.weight !== 'number' || s.weight < 0 || s.weight > 2000) {
                return `Exercise ${i} set ${j} weight must be 0-2000`;
            }
            if (typeof s.reps !== 'number' || s.reps < 0 || s.reps > 999) {
                return `Exercise ${i} set ${j} reps must be 0-999`;
            }
        }
    }
    return null;
}

// =============
// ROUTINE ROUTES
// =============

// POST /api/workouts/routines
router.post('/routines', async (req, res) => {
    const email = req.user.email;
    const { name, schedule, isActive } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
        return res.status(400).json({ error: 'Name is required (max 100 chars)' });
    }

    const scheduleErr = validateSchedule(schedule);
    if (scheduleErr) return res.status(400).json({ error: scheduleErr });

    // Check max 10 routines
    try {
        const existing = await docClient.send(
            new QueryCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                KeyConditionExpression: 'email = :email',
                ExpressionAttributeValues: { ':email': email },
                Select: 'COUNT',
            }),
        );
        if (existing.Count >= 10) {
            return res.status(400).json({ error: 'Maximum 10 routines allowed' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const active = isActive === true;

    // If setting active, deactivate others
    if (active) {
        try {
            const others = await docClient.send(
                new QueryCommand({
                    TableName: process.env.WORKOUT_ROUTINES_TABLE,
                    KeyConditionExpression: 'email = :email',
                    FilterExpression: 'isActive = :true',
                    ExpressionAttributeValues: { ':email': email, ':true': true },
                }),
            );
            for (const item of others.Items || []) {
                await docClient.send(
                    new UpdateCommand({
                        TableName: process.env.WORKOUT_ROUTINES_TABLE,
                        Key: { email, routineId: item.routineId },
                        UpdateExpression: 'SET isActive = :false',
                        ExpressionAttributeValues: { ':false': false },
                    }),
                );
            }
        } catch (err) {
            logger.error({ err }, 'DynamoDB deactivate error');
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    const routineId = 'routine#' + generateUlid();
    const item = {
        email,
        routineId,
        name: name.trim(),
        schedule,
        isActive: active,
        createdAt: new Date().toISOString(),
    };

    try {
        await docClient.send(
            new PutCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                Item: item,
            }),
        );
        res.status(201).json({ routine: item });
    } catch (err) {
        logger.error({ err }, 'DynamoDB PutItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/workouts/routines
router.get('/routines', async (req, res) => {
    const email = req.user.email;

    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                KeyConditionExpression: 'email = :email',
                ExpressionAttributeValues: { ':email': email },
            }),
        );
        res.json({ routines: result.Items || [] });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/workouts/routines/:id
router.get('/routines/:id', async (req, res) => {
    const email = req.user.email;
    const routineId = req.params.id;

    try {
        const result = await docClient.send(
            new GetCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                Key: { email, routineId },
            }),
        );
        if (!result.Item) {
            return res.status(404).json({ error: 'Routine not found' });
        }
        res.json({ routine: result.Item });
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/workouts/routines/:id
router.patch('/routines/:id', async (req, res) => {
    const email = req.user.email;
    const routineId = req.params.id;
    const { name, schedule, isActive } = req.body;

    const updates = [];
    const values = {};
    const names = {};

    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
            return res.status(400).json({ error: 'Name must be 1-100 characters' });
        }
        updates.push('#n = :name');
        names['#n'] = 'name';
        values[':name'] = name.trim();
    }

    if (schedule !== undefined) {
        const scheduleErr = validateSchedule(schedule);
        if (scheduleErr) return res.status(400).json({ error: scheduleErr });
        updates.push('schedule = :schedule');
        values[':schedule'] = schedule;
    }

    if (isActive !== undefined) {
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ error: 'isActive must be a boolean' });
        }
        updates.push('isActive = :isActive');
        values[':isActive'] = isActive;

        // Deactivate others if setting to active
        if (isActive) {
            try {
                const others = await docClient.send(
                    new QueryCommand({
                        TableName: process.env.WORKOUT_ROUTINES_TABLE,
                        KeyConditionExpression: 'email = :email',
                        FilterExpression: 'isActive = :true AND routineId <> :rid',
                        ExpressionAttributeValues: { ':email': email, ':true': true, ':rid': routineId },
                    }),
                );
                for (const item of others.Items || []) {
                    await docClient.send(
                        new UpdateCommand({
                            TableName: process.env.WORKOUT_ROUTINES_TABLE,
                            Key: { email, routineId: item.routineId },
                            UpdateExpression: 'SET isActive = :false',
                            ExpressionAttributeValues: { ':false': false },
                        }),
                    );
                }
            } catch (err) {
                logger.error({ err }, 'DynamoDB deactivate error');
                return res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    try {
        const result = await docClient.send(
            new UpdateCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                Key: { email, routineId },
                UpdateExpression: 'SET ' + updates.join(', '),
                ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
                ExpressionAttributeValues: values,
                ConditionExpression: 'attribute_exists(email)',
                ReturnValues: 'ALL_NEW',
            }),
        );
        res.json({ routine: result.Attributes });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Routine not found' });
        }
        logger.error({ err }, 'DynamoDB UpdateItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/workouts/routines/:id
router.delete('/routines/:id', async (req, res) => {
    const email = req.user.email;
    const routineId = req.params.id;

    try {
        await docClient.send(
            new DeleteCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                Key: { email, routineId },
                ConditionExpression: 'attribute_exists(email)',
            }),
        );
        res.json({ message: 'Routine deleted' });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Routine not found' });
        }
        logger.error({ err }, 'DynamoDB DeleteItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// =============
// LOG ROUTES
// =============

// POST /api/workouts/logs
router.post('/logs', async (req, res) => {
    const email = req.user.email;
    const { date, exercises, durationMin, notes, routineId, dayLabel } = req.body;

    if (!date || typeof date !== 'string' || !DATE_REGEX.test(date)) {
        return res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });
    }

    const today = new Date().toISOString().split('T')[0];
    if (date > today) {
        return res.status(400).json({ error: 'Date cannot be in the future' });
    }

    const exErr = validateLogExercises(exercises);
    if (exErr) return res.status(400).json({ error: exErr });

    if (durationMin !== undefined) {
        const dur = parseInt(durationMin);
        if (!Number.isInteger(dur) || dur < 1 || dur > 600) {
            return res.status(400).json({ error: 'Duration must be 1-600 minutes' });
        }
    }

    if (notes !== undefined) {
        if (typeof notes !== 'string' || notes.length > 500) {
            return res.status(400).json({ error: 'Notes must be max 500 characters' });
        }
    }

    // Check max 1000 logs
    try {
        const existing = await docClient.send(
            new QueryCommand({
                TableName: process.env.WORKOUT_LOGS_TABLE,
                KeyConditionExpression: 'email = :email',
                ExpressionAttributeValues: { ':email': email },
                Select: 'COUNT',
            }),
        );
        if (existing.Count >= 1000) {
            return res.status(400).json({ error: 'Maximum 1000 logs allowed' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const logId = 'log#' + generateUlid();
    const item = {
        email,
        logId,
        date,
        exercises,
        createdAt: new Date().toISOString(),
    };
    if (durationMin !== undefined) item.durationMin = parseInt(durationMin);
    if (notes) item.notes = notes;
    if (routineId) item.routineId = routineId;
    if (dayLabel) item.dayLabel = dayLabel;

    try {
        await docClient.send(
            new PutCommand({
                TableName: process.env.WORKOUT_LOGS_TABLE,
                Item: item,
            }),
        );
        res.status(201).json({ log: item });
    } catch (err) {
        logger.error({ err }, 'DynamoDB PutItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/workouts/logs
router.get('/logs', async (req, res) => {
    const email = req.user.email;
    const { from, to, limit, cursor } = req.query;

    const useGsi = from || to;
    const params = {
        TableName: process.env.WORKOUT_LOGS_TABLE,
        ExpressionAttributeValues: { ':email': email },
    };

    if (useGsi) {
        params.IndexName = 'LogsByDate';
        let kce = 'email = :email';
        if (from && to) {
            kce += ' AND #d BETWEEN :from AND :to';
            params.ExpressionAttributeValues[':from'] = from;
            params.ExpressionAttributeValues[':to'] = to;
        } else if (from) {
            kce += ' AND #d >= :from';
            params.ExpressionAttributeValues[':from'] = from;
        } else if (to) {
            kce += ' AND #d <= :to';
            params.ExpressionAttributeValues[':to'] = to;
        }
        params.KeyConditionExpression = kce;
        params.ExpressionAttributeNames = { '#d': 'date' };
        params.ScanIndexForward = false;
    } else {
        params.KeyConditionExpression = 'email = :email';
        params.ScanIndexForward = false;
    }

    if (limit) {
        const l = parseInt(limit);
        if (l > 0 && l <= 100) params.Limit = l;
    }

    if (cursor) {
        try {
            params.ExclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        } catch {
            return res.status(400).json({ error: 'Invalid cursor' });
        }
    }

    try {
        const result = await docClient.send(new QueryCommand(params));
        const response = { logs: result.Items || [] };
        if (result.LastEvaluatedKey) {
            response.nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url');
        }
        res.json(response);
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/workouts/logs/:id
router.get('/logs/:id', async (req, res) => {
    const email = req.user.email;
    const logId = req.params.id;

    try {
        const result = await docClient.send(
            new GetCommand({
                TableName: process.env.WORKOUT_LOGS_TABLE,
                Key: { email, logId },
            }),
        );
        if (!result.Item) {
            return res.status(404).json({ error: 'Log not found' });
        }
        res.json({ log: result.Item });
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/workouts/logs/:id
router.patch('/logs/:id', async (req, res) => {
    const email = req.user.email;
    const logId = req.params.id;
    const { date, exercises, durationMin, notes, routineId, dayLabel } = req.body;

    const updates = [];
    const values = {};
    const names = {};

    if (date !== undefined) {
        if (typeof date !== 'string' || !DATE_REGEX.test(date)) {
            return res.status(400).json({ error: 'Date must be YYYY-MM-DD format' });
        }
        const today = new Date().toISOString().split('T')[0];
        if (date > today) {
            return res.status(400).json({ error: 'Date cannot be in the future' });
        }
        updates.push('#d = :date');
        names['#d'] = 'date';
        values[':date'] = date;
    }

    if (exercises !== undefined) {
        const exErr = validateLogExercises(exercises);
        if (exErr) return res.status(400).json({ error: exErr });
        updates.push('exercises = :exercises');
        values[':exercises'] = exercises;
    }

    if (durationMin !== undefined) {
        if (durationMin === null) {
            updates.push('durationMin = :durNull');
            values[':durNull'] = null;
        } else {
            const dur = parseInt(durationMin);
            if (!Number.isInteger(dur) || dur < 1 || dur > 600) {
                return res.status(400).json({ error: 'Duration must be 1-600 minutes' });
            }
            updates.push('durationMin = :dur');
            values[':dur'] = dur;
        }
    }

    if (notes !== undefined) {
        if (notes === null || notes === '') {
            updates.push('notes = :notesNull');
            values[':notesNull'] = null;
        } else {
            if (typeof notes !== 'string' || notes.length > 500) {
                return res.status(400).json({ error: 'Notes must be max 500 characters' });
            }
            updates.push('notes = :notes');
            values[':notes'] = notes;
        }
    }

    if (routineId !== undefined) {
        updates.push('routineId = :routineId');
        values[':routineId'] = routineId || null;
    }

    if (dayLabel !== undefined) {
        updates.push('dayLabel = :dayLabel');
        values[':dayLabel'] = dayLabel || null;
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    try {
        const result = await docClient.send(
            new UpdateCommand({
                TableName: process.env.WORKOUT_LOGS_TABLE,
                Key: { email, logId },
                UpdateExpression: 'SET ' + updates.join(', '),
                ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
                ExpressionAttributeValues: values,
                ConditionExpression: 'attribute_exists(email)',
                ReturnValues: 'ALL_NEW',
            }),
        );
        res.json({ log: result.Attributes });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Log not found' });
        }
        logger.error({ err }, 'DynamoDB UpdateItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/workouts/logs/:id
router.delete('/logs/:id', async (req, res) => {
    const email = req.user.email;
    const logId = req.params.id;

    try {
        await docClient.send(
            new DeleteCommand({
                TableName: process.env.WORKOUT_LOGS_TABLE,
                Key: { email, logId },
                ConditionExpression: 'attribute_exists(email)',
            }),
        );
        res.json({ message: 'Log deleted' });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Log not found' });
        }
        logger.error({ err }, 'DynamoDB DeleteItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
