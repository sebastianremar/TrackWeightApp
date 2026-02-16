process.env.TODOS_TABLE = 'TestTodos';

const request = require('supertest');
const app = require('../../server');
const { ddbMock } = require('../helpers/dynamoMock');
const { authHeader } = require('../helpers/auth');
const {
    PutCommand,
    QueryCommand,
    UpdateCommand,
    DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

const todoFixture = {
    email: 'test@example.com',
    todoId: 'todo#abc123',
    title: 'Buy groceries',
    description: 'Milk, eggs, bread',
    priority: 'medium',
    category: 'Shopping',
    dueDate: '2026-03-01',
    completed: false,
    createdAt: '2026-02-15T12:00:00.000Z',
};

beforeEach(() => {
    ddbMock.reset();
});

// --- POST /api/todos ---
describe('POST /api/todos', () => {
    test('creates todo with valid data', async () => {
        ddbMock.on(QueryCommand).resolves({ Count: 0 });
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/todos')
            .set(authHeader('test@example.com'))
            .send({
                title: 'Buy groceries',
                description: 'Milk, eggs, bread',
                dueDate: '2026-03-01',
                priority: 'high',
                category: 'Shopping',
            });
        expect(res.status).toBe(201);
        expect(res.body.todo.title).toBe('Buy groceries');
        expect(res.body.todo.description).toBe('Milk, eggs, bread');
        expect(res.body.todo.dueDate).toBe('2026-03-01');
        expect(res.body.todo.priority).toBe('high');
        expect(res.body.todo.category).toBe('Shopping');
        expect(res.body.todo.completed).toBe(false);
        expect(res.body.todo.todoId).toMatch(/^todo#/);
    });

    test('returns 400 when title missing', async () => {
        const res = await request(app)
            .post('/api/todos')
            .set(authHeader('test@example.com'))
            .send({ description: 'No title here' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Title/i);
    });

    test('returns 400 for invalid priority value', async () => {
        const res = await request(app)
            .post('/api/todos')
            .set(authHeader('test@example.com'))
            .send({ title: 'Test', priority: 'urgent' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Priority/i);
    });

    test('returns 400 for invalid dueDate format', async () => {
        const res = await request(app)
            .post('/api/todos')
            .set(authHeader('test@example.com'))
            .send({ title: 'Test', dueDate: '03-01-2026' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/YYYY-MM-DD/);
    });

    test('defaults priority to medium when not provided', async () => {
        ddbMock.on(QueryCommand).resolves({ Count: 0 });
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/todos')
            .set(authHeader('test@example.com'))
            .send({ title: 'Simple task' });
        expect(res.status).toBe(201);
        expect(res.body.todo.priority).toBe('medium');
    });

    test('returns 401 without auth', async () => {
        const res = await request(app)
            .post('/api/todos')
            .send({ title: 'No auth' });
        expect(res.status).toBe(401);
    });
});

// --- GET /api/todos ---
describe('GET /api/todos', () => {
    test('lists all todos', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [todoFixture] });

        const res = await request(app)
            .get('/api/todos')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.todos).toHaveLength(1);
        expect(res.body.todos[0].title).toBe('Buy groceries');
    });

    test('filters by completed=true', async () => {
        const completedTodo = { ...todoFixture, completed: true, completedAt: '2026-02-15T14:00:00.000Z' };
        ddbMock.on(QueryCommand).resolves({ Items: [completedTodo] });

        const res = await request(app)
            .get('/api/todos?completed=true')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.todos).toHaveLength(1);
        expect(res.body.todos[0].completed).toBe(true);
    });

    test('filters by category', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [todoFixture] });

        const res = await request(app)
            .get('/api/todos?category=Shopping')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.todos).toHaveLength(1);
        expect(res.body.todos[0].category).toBe('Shopping');
    });
});

// --- PATCH /api/todos/:id ---
describe('PATCH /api/todos/:id', () => {
    test('updates todo title', async () => {
        const updatedTodo = { ...todoFixture, title: 'Buy organic groceries' };
        ddbMock.on(UpdateCommand).resolves({ Attributes: updatedTodo });

        const res = await request(app)
            .patch('/api/todos/todo%23abc123')
            .set(authHeader('test@example.com'))
            .send({ title: 'Buy organic groceries' });
        expect(res.status).toBe(200);
        expect(res.body.todo.title).toBe('Buy organic groceries');
    });

    test('toggles completed to true and sets completedAt', async () => {
        const completedTodo = {
            ...todoFixture,
            completed: true,
            completedAt: '2026-02-15T14:00:00.000Z',
        };
        ddbMock.on(UpdateCommand).resolves({ Attributes: completedTodo });

        const res = await request(app)
            .patch('/api/todos/todo%23abc123')
            .set(authHeader('test@example.com'))
            .send({ completed: true });
        expect(res.status).toBe(200);
        expect(res.body.todo.completed).toBe(true);
        expect(res.body.todo.completedAt).toBeDefined();
    });

    test('returns 404 for non-existent todo', async () => {
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(UpdateCommand).rejects(err);

        const res = await request(app)
            .patch('/api/todos/todo%23nope')
            .set(authHeader('test@example.com'))
            .send({ title: 'Nope' });
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/i);
    });
});

// --- DELETE /api/todos/:id ---
describe('DELETE /api/todos/:id', () => {
    test('deletes todo and returns success message', async () => {
        ddbMock.on(DeleteCommand).resolves({});

        const res = await request(app)
            .delete('/api/todos/todo%23abc123')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/deleted/i);
    });

    test('returns 404 for non-existent todo', async () => {
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(DeleteCommand).rejects(err);

        const res = await request(app)
            .delete('/api/todos/todo%23nope')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/i);
    });
});
