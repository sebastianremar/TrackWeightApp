const express = require('express');
const { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../lib/db');
const logger = require('../lib/logger');
const { generateId } = require('../lib/id');

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_PRIORITIES = ['low', 'medium', 'high'];

// POST /api/todos — create a todo
router.post('/', async (req, res) => {
    const email = req.user.email;
    const { title, description, dueDate, priority, category } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 200) {
        return res.status(400).json({ error: 'Title is required (max 200 chars)' });
    }

    if (description !== undefined) {
        if (typeof description !== 'string' || description.length > 1000) {
            return res.status(400).json({ error: 'Description must be 1000 chars or less' });
        }
    }

    if (dueDate !== undefined) {
        if (typeof dueDate !== 'string' || !DATE_REGEX.test(dueDate)) {
            return res.status(400).json({ error: 'Due date must be in YYYY-MM-DD format' });
        }
    }

    const todoPriority = priority || 'medium';
    if (!VALID_PRIORITIES.includes(todoPriority)) {
        return res.status(400).json({ error: 'Priority must be "low", "medium", or "high"' });
    }

    if (category !== undefined) {
        if (typeof category !== 'string' || category.trim().length > 50) {
            return res.status(400).json({ error: 'Category must be 50 chars or less' });
        }
    }

    // Check max 200 active todos
    try {
        const existing = await docClient.send(
            new QueryCommand({
                TableName: process.env.TODOS_TABLE,
                KeyConditionExpression: 'email = :email',
                FilterExpression: 'completed <> :true',
                ExpressionAttributeValues: { ':email': email, ':true': true },
                Select: 'COUNT',
            }),
        );
        if (existing.Count >= 200) {
            return res.status(400).json({ error: 'Maximum 200 active todos allowed' });
        }
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }

    const todoId = 'todo#' + generateId();
    const item = {
        email,
        todoId,
        title: title.trim(),
        priority: todoPriority,
        completed: false,
        createdAt: new Date().toISOString(),
    };
    if (description !== undefined) item.description = description;
    if (dueDate !== undefined) item.dueDate = dueDate;
    if (category !== undefined && category.trim()) item.category = category.trim();

    try {
        await docClient.send(
            new PutCommand({
                TableName: process.env.TODOS_TABLE,
                Item: item,
            }),
        );
        res.status(201).json({ todo: item });
    } catch (err) {
        logger.error({ err }, 'DynamoDB PutItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/todos — list todos
router.get('/', async (req, res) => {
    const email = req.user.email;
    const completedFilter = req.query.completed;
    const categoryFilter = req.query.category;

    const params = {
        TableName: process.env.TODOS_TABLE,
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
    };

    const filters = [];
    const names = {};

    if (completedFilter !== undefined) {
        const isCompleted = completedFilter === 'true';
        filters.push('completed = :completed');
        params.ExpressionAttributeValues[':completed'] = isCompleted;
    }

    if (categoryFilter) {
        filters.push('category = :category');
        params.ExpressionAttributeValues[':category'] = categoryFilter;
    }

    if (filters.length > 0) {
        params.FilterExpression = filters.join(' AND ');
    }
    if (Object.keys(names).length > 0) {
        params.ExpressionAttributeNames = names;
    }

    try {
        const result = await docClient.send(new QueryCommand(params));
        res.json({ todos: result.Items || [] });
    } catch (err) {
        logger.error({ err }, 'DynamoDB Query error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/todos/:id — update todo
router.patch('/:id', async (req, res) => {
    const email = req.user.email;
    const todoId = req.params.id;
    const { title, description, dueDate, priority, category, completed } = req.body;

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

    if (dueDate !== undefined) {
        if (dueDate === null || dueDate === '') {
            removes.push('dueDate');
        } else {
            if (typeof dueDate !== 'string' || !DATE_REGEX.test(dueDate)) {
                return res.status(400).json({ error: 'Due date must be in YYYY-MM-DD format' });
            }
            updates.push('dueDate = :dueDate');
            values[':dueDate'] = dueDate;
        }
    }

    if (priority !== undefined) {
        if (!VALID_PRIORITIES.includes(priority)) {
            return res.status(400).json({ error: 'Priority must be "low", "medium", or "high"' });
        }
        updates.push('priority = :priority');
        values[':priority'] = priority;
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

    if (completed !== undefined) {
        if (typeof completed !== 'boolean') {
            return res.status(400).json({ error: 'completed must be a boolean' });
        }
        updates.push('completed = :completed');
        values[':completed'] = completed;
        if (completed) {
            updates.push('completedAt = :completedAt');
            values[':completedAt'] = new Date().toISOString();
        } else {
            removes.push('completedAt');
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
                TableName: process.env.TODOS_TABLE,
                Key: { email, todoId },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
                ExpressionAttributeValues: Object.keys(values).length > 0 ? values : undefined,
                ConditionExpression: 'attribute_exists(email)',
                ReturnValues: 'ALL_NEW',
            }),
        );
        res.json({ todo: result.Attributes });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Todo not found' });
        }
        logger.error({ err }, 'DynamoDB UpdateItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/todos/:id — hard delete
router.delete('/:id', async (req, res) => {
    const email = req.user.email;
    const todoId = req.params.id;

    try {
        await docClient.send(
            new DeleteCommand({
                TableName: process.env.TODOS_TABLE,
                Key: { email, todoId },
                ConditionExpression: 'attribute_exists(email)',
            }),
        );
        res.json({ message: 'Todo deleted' });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(404).json({ error: 'Todo not found' });
        }
        logger.error({ err }, 'DynamoDB DeleteItem error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
