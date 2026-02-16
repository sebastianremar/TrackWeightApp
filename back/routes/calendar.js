const express = require('express');
const { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');
const logger = require('../lib/logger');
const { generateId } = require('../lib/id');

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

// POST /api/calendar — create an event
router.post('/', async (req, res) => {
    const email = req.user.email;
    const { title, description, date, startTime, endTime, category, color } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 200) {
        return res.status(400).json({ error: 'Title is required (max 200 chars)' });
    }

    if (description !== undefined) {
        if (typeof description !== 'string' || description.length > 1000) {
            return res.status(400).json({ error: 'Description must be 1000 chars or less' });
        }
    }

    if (!date || typeof date !== 'string' || !DATE_REGEX.test(date)) {
        return res.status(400).json({ error: 'Date is required in YYYY-MM-DD format' });
    }

    if (!startTime || typeof startTime !== 'string' || !TIME_REGEX.test(startTime)) {
        return res.status(400).json({ error: 'Start time is required in HH:mm format' });
    }

    if (endTime !== undefined) {
        if (typeof endTime !== 'string' || !TIME_REGEX.test(endTime)) {
            return res.status(400).json({ error: 'End time must be in HH:mm format' });
        }
        if (endTime <= startTime) {
            return res.status(400).json({ error: 'End time must be after start time' });
        }
    }

    if (category !== undefined) {
        if (typeof category !== 'string' || category.trim().length > 50) {
            return res.status(400).json({ error: 'Category must be 50 chars or less' });
        }
    }

    if (color !== undefined) {
        if (typeof color !== 'string' || !HEX_COLOR_REGEX.test(color)) {
            return res.status(400).json({ error: 'Color must be a hex color (#rrggbb)' });
        }
    }

    // Check max 500 events per user
    try {
        const existing = await docClient.send(
            new QueryCommand({
                TableName: process.env.CALENDAR_EVENTS_TABLE,
                KeyConditionExpression: 'email = :email',
                ExpressionAttributeValues: { ':email': email },
                Select: 'COUNT',
            }),
        );
        if (existing.Count >= 500) {
            return res.status(400).json({ error: 'Maximum 500 events allowed' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const eventId = 'event#' + generateId();
    const item = {
        email,
        eventId,
        title: title.trim(),
        date,
        startTime,
        createdAt: new Date().toISOString(),
    };
    if (description !== undefined) item.description = description;
    if (endTime !== undefined) item.endTime = endTime;
    if (category !== undefined && category.trim()) item.category = category.trim();
    if (color !== undefined) item.color = color;

    try {
        await docClient.send(
            new PutCommand({
                TableName: process.env.CALENDAR_EVENTS_TABLE,
                Item: item,
            }),
        );
        res.status(201).json({ event: item });
    } catch (err) {
        logger.error({ err }, 'DynamoDB PutItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/calendar — list events by date range
router.get('/', async (req, res) => {
    const email = req.user.email;
    const { from, to } = req.query;

    if (!from || !to || !DATE_REGEX.test(from) || !DATE_REGEX.test(to)) {
        return res.status(400).json({ error: 'from and to query params required (YYYY-MM-DD)' });
    }

    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: process.env.CALENDAR_EVENTS_TABLE,
                IndexName: 'EventsByDate',
                KeyConditionExpression: 'email = :email AND #d BETWEEN :from AND :to',
                ExpressionAttributeNames: { '#d': 'date' },
                ExpressionAttributeValues: { ':email': email, ':from': from, ':to': to },
            }),
        );
        res.json({ events: result.Items || [] });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/calendar/:id — update event
router.patch('/:id', async (req, res) => {
    const email = req.user.email;
    const eventId = req.params.id;
    const { title, description, date, startTime, endTime, category, color } = req.body;

    const updates = [];
    const values = {};
    const names = {};
    const removes = [];

    if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 200) {
            return res.status(400).json({ error: 'Title must be between 1 and 200 characters' });
        }
        updates.push('title = :title');
        values[':title'] = title.trim();
    }

    if (description !== undefined) {
        if (description === null || description === '') {
            removes.push('description');
        } else {
            if (typeof description !== 'string' || description.length > 1000) {
                return res.status(400).json({ error: 'Description must be 1000 chars or less' });
            }
            updates.push('description = :desc');
            values[':desc'] = description;
        }
    }

    if (date !== undefined) {
        if (typeof date !== 'string' || !DATE_REGEX.test(date)) {
            return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
        }
        updates.push('#d = :date');
        names['#d'] = 'date';
        values[':date'] = date;
    }

    if (startTime !== undefined) {
        if (typeof startTime !== 'string' || !TIME_REGEX.test(startTime)) {
            return res.status(400).json({ error: 'Start time must be in HH:mm format' });
        }
        updates.push('startTime = :startTime');
        values[':startTime'] = startTime;
    }

    if (endTime !== undefined) {
        if (endTime === null || endTime === '') {
            removes.push('endTime');
        } else {
            if (typeof endTime !== 'string' || !TIME_REGEX.test(endTime)) {
                return res.status(400).json({ error: 'End time must be in HH:mm format' });
            }
            updates.push('endTime = :endTime');
            values[':endTime'] = endTime;
        }
    }

    if (category !== undefined) {
        if (category === null || category === '') {
            removes.push('category');
        } else {
            if (typeof category !== 'string' || category.trim().length > 50) {
                return res.status(400).json({ error: 'Category must be 50 chars or less' });
            }
            updates.push('category = :category');
            values[':category'] = category.trim();
        }
    }

    if (color !== undefined) {
        if (color === null || color === '') {
            removes.push('color');
        } else {
            if (typeof color !== 'string' || !HEX_COLOR_REGEX.test(color)) {
                return res.status(400).json({ error: 'Color must be a hex color (#rrggbb)' });
            }
            updates.push('color = :color');
            values[':color'] = color;
        }
    }

    if (updates.length === 0 && removes.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    let updateExpression = '';
    if (updates.length > 0) {
        updateExpression = 'SET ' + updates.join(', ');
    }
    if (removes.length > 0) {
        updateExpression += ' REMOVE ' + removes.join(', ');
    }

    try {
        const result = await docClient.send(
            new UpdateCommand({
                TableName: process.env.CALENDAR_EVENTS_TABLE,
                Key: { email, eventId },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
                ExpressionAttributeValues: Object.keys(values).length > 0 ? values : undefined,
                ConditionExpression: 'attribute_exists(email)',
                ReturnValues: 'ALL_NEW',
            }),
        );
        res.json({ event: result.Attributes });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Event not found' });
        }
        logger.error({ err }, 'DynamoDB UpdateItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/calendar/:id — hard delete
router.delete('/:id', async (req, res) => {
    const email = req.user.email;
    const eventId = req.params.id;

    try {
        await docClient.send(
            new DeleteCommand({
                TableName: process.env.CALENDAR_EVENTS_TABLE,
                Key: { email, eventId },
                ConditionExpression: 'attribute_exists(email)',
            }),
        );
        res.json({ message: 'Event deleted' });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Event not found' });
        }
        logger.error({ err }, 'DynamoDB DeleteItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
