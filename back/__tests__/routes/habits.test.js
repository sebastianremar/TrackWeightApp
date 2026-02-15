const request = require('supertest');
const app = require('../../server');
const { ddbMock } = require('../helpers/dynamoMock');
const { authHeader } = require('../helpers/auth');
const { habit } = require('../helpers/fixtures');
const {
    PutCommand,
    QueryCommand,
    GetCommand,
    UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

beforeEach(() => {
    ddbMock.reset();
});

// --- POST /api/habits ---
describe('POST /api/habits', () => {
    test('creates a habit with valid data', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/habits')
            .set(authHeader('test@example.com'))
            .send({ name: 'Meditate', targetFrequency: 5 });
        expect(res.status).toBe(201);
        expect(res.body.habit.name).toBe('Meditate');
        expect(res.body.habit.targetFrequency).toBe(5);
        expect(res.body.habit.habitId).toMatch(/^habit#/);
    });

    test('uses default color when none provided', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/habits')
            .set(authHeader('test@example.com'))
            .send({ name: 'Read', targetFrequency: 1 });
        expect(res.status).toBe(201);
        expect(res.body.habit.color).toBe('#667eea');
    });

    test('returns 400 when name missing', async () => {
        const res = await request(app)
            .post('/api/habits')
            .set(authHeader('test@example.com'))
            .send({ targetFrequency: 3 });
        expect(res.status).toBe(400);
    });

    test('returns 400 for name over 100 chars', async () => {
        const res = await request(app)
            .post('/api/habits')
            .set(authHeader('test@example.com'))
            .send({ name: 'x'.repeat(101), targetFrequency: 3 });
        expect(res.status).toBe(400);
    });

    test('returns 400 for frequency out of range', async () => {
        const res = await request(app)
            .post('/api/habits')
            .set(authHeader('test@example.com'))
            .send({ name: 'Run', targetFrequency: 8 });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/1 and 7/);
    });

    test('returns 400 for frequency of 0', async () => {
        const res = await request(app)
            .post('/api/habits')
            .set(authHeader('test@example.com'))
            .send({ name: 'Run', targetFrequency: 0 });
        expect(res.status).toBe(400);
    });

    test('creates a bad habit with type and limitPeriod', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/habits')
            .set(authHeader('test@example.com'))
            .send({ name: 'Junk food', targetFrequency: 3, type: 'bad', limitPeriod: 'week' });
        expect(res.status).toBe(201);
        expect(res.body.habit.type).toBe('bad');
        expect(res.body.habit.limitPeriod).toBe('week');
        expect(res.body.habit.targetFrequency).toBe(3);
    });

    test('creates a bad habit with monthly limit up to 30', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/habits')
            .set(authHeader('test@example.com'))
            .send({ name: 'Sweets', targetFrequency: 15, type: 'bad', limitPeriod: 'month' });
        expect(res.status).toBe(201);
        expect(res.body.habit.targetFrequency).toBe(15);
    });

    test('returns 400 for bad habit with weekly frequency > 7', async () => {
        const res = await request(app)
            .post('/api/habits')
            .set(authHeader('test@example.com'))
            .send({ name: 'Snack', targetFrequency: 10, type: 'bad', limitPeriod: 'week' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/1 and 7/);
    });

    test('returns 400 for invalid type', async () => {
        const res = await request(app)
            .post('/api/habits')
            .set(authHeader('test@example.com'))
            .send({ name: 'Test', targetFrequency: 3, type: 'neutral' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Type/);
    });

    test('returns 400 for invalid limitPeriod on bad habit', async () => {
        const res = await request(app)
            .post('/api/habits')
            .set(authHeader('test@example.com'))
            .send({ name: 'Test', targetFrequency: 3, type: 'bad', limitPeriod: 'year' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Limit period/);
    });

    test('defaults type to good when not provided', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/habits')
            .set(authHeader('test@example.com'))
            .send({ name: 'Yoga', targetFrequency: 4 });
        expect(res.status).toBe(201);
        expect(res.body.habit.type).toBe('good');
        expect(res.body.habit.limitPeriod).toBeUndefined();
    });

    test('returns 400 when 20 active habits exist', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: new Array(20).fill(habit) });

        const res = await request(app)
            .post('/api/habits')
            .set(authHeader('test@example.com'))
            .send({ name: 'One More', targetFrequency: 1 });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/20/);
    });
});

// --- GET /api/habits ---
describe('GET /api/habits', () => {
    test('returns list of habits', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [habit] });

        const res = await request(app).get('/api/habits').set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.habits).toHaveLength(1);
    });

    test('returns empty array when no habits', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const res = await request(app).get('/api/habits').set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.habits).toHaveLength(0);
    });
});

// --- GET /api/habits/:id ---
describe('GET /api/habits/:id', () => {
    test('returns a single habit', async () => {
        ddbMock.on(GetCommand).resolves({ Item: habit });

        const res = await request(app)
            .get('/api/habits/habit%23test123')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.habit.name).toBe('Exercise');
    });

    test('returns 404 for non-existent habit', async () => {
        ddbMock.on(GetCommand).resolves({ Item: undefined });

        const res = await request(app)
            .get('/api/habits/habit%23nope')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
    });
});

// --- PATCH /api/habits/:id ---
describe('PATCH /api/habits/:id', () => {
    test('updates habit name', async () => {
        ddbMock.on(UpdateCommand).resolves({
            Attributes: { ...habit, name: 'Yoga' },
        });

        const res = await request(app)
            .patch('/api/habits/habit%23test123')
            .set(authHeader('test@example.com'))
            .send({ name: 'Yoga' });
        expect(res.status).toBe(200);
        expect(res.body.habit.name).toBe('Yoga');
    });

    test('returns 400 for empty update', async () => {
        const res = await request(app)
            .patch('/api/habits/habit%23test123')
            .set(authHeader('test@example.com'))
            .send({});
        expect(res.status).toBe(400);
    });

    test('updates type and limitPeriod', async () => {
        ddbMock.on(UpdateCommand).resolves({
            Attributes: { ...habit, type: 'bad', limitPeriod: 'month' },
        });

        const res = await request(app)
            .patch('/api/habits/habit%23test123')
            .set(authHeader('test@example.com'))
            .send({ type: 'bad', limitPeriod: 'month' });
        expect(res.status).toBe(200);
        expect(res.body.habit.type).toBe('bad');
        expect(res.body.habit.limitPeriod).toBe('month');
    });

    test('returns 400 for invalid type on PATCH', async () => {
        const res = await request(app)
            .patch('/api/habits/habit%23test123')
            .set(authHeader('test@example.com'))
            .send({ type: 'neutral' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Type/);
    });

    test('returns 400 for invalid limitPeriod on PATCH', async () => {
        const res = await request(app)
            .patch('/api/habits/habit%23test123')
            .set(authHeader('test@example.com'))
            .send({ limitPeriod: 'year' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Limit period/);
    });

    test('allows frequency up to 30 on PATCH', async () => {
        ddbMock.on(UpdateCommand).resolves({
            Attributes: { ...habit, targetFrequency: 20 },
        });

        const res = await request(app)
            .patch('/api/habits/habit%23test123')
            .set(authHeader('test@example.com'))
            .send({ targetFrequency: 20 });
        expect(res.status).toBe(200);
        expect(res.body.habit.targetFrequency).toBe(20);
    });

    test('returns 404 when habit not found (conditional check)', async () => {
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(UpdateCommand).rejects(err);

        const res = await request(app)
            .patch('/api/habits/habit%23nope')
            .set(authHeader('test@example.com'))
            .send({ name: 'Nope' });
        expect(res.status).toBe(404);
    });
});

// --- DELETE /api/habits/:id (soft delete / archive) ---
describe('DELETE /api/habits/:id', () => {
    test('archives a habit', async () => {
        ddbMock.on(UpdateCommand).resolves({});

        const res = await request(app)
            .delete('/api/habits/habit%23test123')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/archived/i);
    });

    test('returns 404 when habit not found', async () => {
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(UpdateCommand).rejects(err);

        const res = await request(app)
            .delete('/api/habits/habit%23nope')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
    });
});
