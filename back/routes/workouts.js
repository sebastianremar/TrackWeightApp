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
const { EXERCISE_LIBRARY, MUSCLE_GROUPS } = require('../lib/exercises');
const { generateId } = require('../lib/id');

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateTemplateExercises(exercises) {
    if (!Array.isArray(exercises) || exercises.length === 0 || exercises.length > 30) {
        return 'Exercises must be an array (1-30 items)';
    }
    for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        if (!ex.exerciseId || typeof ex.exerciseId !== 'string' || ex.exerciseId.length > 100) {
            return `Exercise ${i} exerciseId is required (max 100 chars)`;
        }
        if (!ex.name || typeof ex.name !== 'string' || ex.name.trim().length === 0 || ex.name.trim().length > 100) {
            return `Exercise ${i} name is required (max 100 chars)`;
        }
        if (!ex.muscleGroup || typeof ex.muscleGroup !== 'string' || ex.muscleGroup.length > 30) {
            return `Exercise ${i} muscleGroup is required (max 30 chars)`;
        }
        const sets = parseInt(ex.sets);
        if (!Number.isInteger(sets) || sets < 1 || sets > 20) {
            return `Exercise ${i} sets must be an integer 1-20`;
        }
        if (!ex.reps || typeof ex.reps !== 'string' || ex.reps.length > 20) {
            return `Exercise ${i} reps is required (max 20 chars)`;
        }
        if (ex.restSec !== undefined) {
            const rest = parseInt(ex.restSec);
            if (!Number.isInteger(rest) || rest < 0 || rest > 600) {
                return `Exercise ${i} restSec must be 0-600`;
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

// ===================
// EXERCISE ENDPOINTS
// ===================

// GET /api/workouts/exercises — returns library + user's custom exercises
router.get('/exercises', async (req, res) => {
    const email = req.user.email;

    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                KeyConditionExpression: 'email = :email AND begins_with(routineId, :prefix)',
                ExpressionAttributeValues: { ':email': email, ':prefix': 'exercise#' },
            }),
        );
        const custom = (result.Items || []).map((item) => ({
            id: item.routineId,
            name: item.name,
            muscleGroup: item.muscleGroup,
            custom: true,
        }));
        res.json({ library: EXERCISE_LIBRARY, custom });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/workouts/exercises — create custom exercise
router.post('/exercises', async (req, res) => {
    const email = req.user.email;
    const { name, muscleGroup } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
        return res.status(400).json({ error: 'Name is required (max 100 chars)' });
    }
    if (!muscleGroup || !MUSCLE_GROUPS.includes(muscleGroup)) {
        return res.status(400).json({ error: `muscleGroup must be one of: ${MUSCLE_GROUPS.join(', ')}` });
    }

    // Check max 50 custom exercises
    try {
        const existing = await docClient.send(
            new QueryCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                KeyConditionExpression: 'email = :email AND begins_with(routineId, :prefix)',
                ExpressionAttributeValues: { ':email': email, ':prefix': 'exercise#' },
                Select: 'COUNT',
            }),
        );
        if (existing.Count >= 50) {
            return res.status(400).json({ error: 'Maximum 50 custom exercises allowed' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const exerciseId = 'exercise#' + generateId();
    const item = {
        email,
        routineId: exerciseId,
        name: name.trim(),
        muscleGroup,
        createdAt: new Date().toISOString(),
    };

    try {
        await docClient.send(
            new PutCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                Item: item,
            }),
        );
        res.status(201).json({
            exercise: {
                id: exerciseId,
                name: item.name,
                muscleGroup: item.muscleGroup,
                custom: true,
            },
        });
    } catch (err) {
        logger.error({ err }, 'DynamoDB PutItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/workouts/exercises/:id
router.delete('/exercises/:id', async (req, res) => {
    const email = req.user.email;
    const routineId = req.params.id;

    if (!routineId.startsWith('exercise#')) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
    }

    try {
        await docClient.send(
            new DeleteCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                Key: { email, routineId },
                ConditionExpression: 'attribute_exists(email)',
            }),
        );
        res.json({ message: 'Exercise deleted' });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Exercise not found' });
        }
        logger.error({ err }, 'DynamoDB DeleteItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ====================
// TEMPLATE ENDPOINTS
// ====================

// GET /api/workouts/templates
router.get('/templates', async (req, res) => {
    const email = req.user.email;

    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                KeyConditionExpression: 'email = :email AND begins_with(routineId, :prefix)',
                ExpressionAttributeValues: { ':email': email, ':prefix': 'tmpl#' },
            }),
        );
        res.json({ templates: result.Items || [] });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/workouts/templates
router.post('/templates', async (req, res) => {
    const email = req.user.email;
    const { name, exercises } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
        return res.status(400).json({ error: 'Name is required (max 100 chars)' });
    }

    const exErr = validateTemplateExercises(exercises);
    if (exErr) return res.status(400).json({ error: exErr });

    // Check max 20 templates
    try {
        const existing = await docClient.send(
            new QueryCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                KeyConditionExpression: 'email = :email AND begins_with(routineId, :prefix)',
                ExpressionAttributeValues: { ':email': email, ':prefix': 'tmpl#' },
                Select: 'COUNT',
            }),
        );
        if (existing.Count >= 20) {
            return res.status(400).json({ error: 'Maximum 20 templates allowed' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const routineId = 'tmpl#' + generateId();
    const item = {
        email,
        routineId,
        name: name.trim(),
        exercises,
        createdAt: new Date().toISOString(),
    };

    try {
        await docClient.send(
            new PutCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                Item: item,
            }),
        );
        res.status(201).json({ template: item });
    } catch (err) {
        logger.error({ err }, 'DynamoDB PutItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/workouts/templates/:id
router.get('/templates/:id', async (req, res) => {
    const email = req.user.email;
    const routineId = req.params.id;

    try {
        const result = await docClient.send(
            new GetCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                Key: { email, routineId },
            }),
        );
        if (!result.Item || !result.Item.routineId.startsWith('tmpl#')) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json({ template: result.Item });
    } catch (err) {
        logger.error({ err }, 'DynamoDB GetItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/workouts/templates/:id
router.patch('/templates/:id', async (req, res) => {
    const email = req.user.email;
    const routineId = req.params.id;
    const { name, exercises } = req.body;

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

    if (exercises !== undefined) {
        const exErr = validateTemplateExercises(exercises);
        if (exErr) return res.status(400).json({ error: exErr });
        updates.push('exercises = :exercises');
        values[':exercises'] = exercises;
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    values[':tmplPrefix'] = 'tmpl#';

    try {
        const result = await docClient.send(
            new UpdateCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                Key: { email, routineId },
                UpdateExpression: 'SET ' + updates.join(', '),
                ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
                ExpressionAttributeValues: values,
                ConditionExpression: 'attribute_exists(email) AND begins_with(routineId, :tmplPrefix)',
                ReturnValues: 'ALL_NEW',
            }),
        );
        res.json({ template: result.Attributes });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Template not found' });
        }
        logger.error({ err }, 'DynamoDB UpdateItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/workouts/templates/:id
router.delete('/templates/:id', async (req, res) => {
    const email = req.user.email;
    const routineId = req.params.id;

    if (!routineId.startsWith('tmpl#')) {
        return res.status(400).json({ error: 'Invalid template ID' });
    }

    try {
        await docClient.send(
            new DeleteCommand({
                TableName: process.env.WORKOUT_ROUTINES_TABLE,
                Key: { email, routineId },
                ConditionExpression: 'attribute_exists(email)',
            }),
        );
        res.json({ message: 'Template deleted' });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Template not found' });
        }
        logger.error({ err }, 'DynamoDB DeleteItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/workouts/templates/:id/prefill — last session's weights for a template
router.get('/templates/:id/prefill', async (req, res) => {
    const email = req.user.email;
    const templateId = req.params.id;

    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: process.env.WORKOUT_LOGS_TABLE,
                IndexName: 'LogsByDate',
                KeyConditionExpression: 'email = :email',
                FilterExpression: 'templateId = :tid',
                ExpressionAttributeValues: { ':email': email, ':tid': templateId },
                ScanIndexForward: false,
                Limit: 50,
            }),
        );
        const items = result.Items || [];
        if (items.length === 0) {
            return res.json({ exercises: [], date: null });
        }
        const latest = items[0];
        res.json({
            exercises: (latest.exercises || []).map((ex) => ({
                exerciseId: ex.exerciseId || null,
                name: ex.name,
                sets: ex.sets,
            })),
            date: latest.date,
        });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ===============
// LOG ENDPOINTS
// ===============

// POST /api/workouts/logs
router.post('/logs', async (req, res) => {
    const email = req.user.email;
    const { date, exercises, durationMin, notes, templateId, templateName } = req.body;

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

    const logId = 'log#' + generateId();
    const item = {
        email,
        logId,
        date,
        exercises,
        createdAt: new Date().toISOString(),
    };
    if (durationMin !== undefined) item.durationMin = parseInt(durationMin);
    if (notes) item.notes = notes;
    if (templateId) item.templateId = templateId;
    if (templateName) item.templateName = templateName;

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
    const { date, exercises, durationMin, notes, templateId, templateName } = req.body;

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

    if (templateId !== undefined) {
        updates.push('templateId = :templateId');
        values[':templateId'] = templateId || null;
    }

    if (templateName !== undefined) {
        updates.push('templateName = :templateName');
        values[':templateName'] = templateName || null;
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
