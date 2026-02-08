const request = require('supertest');
const app = require('../../server');
const { ddbMock } = require('../helpers/dynamoMock');
const { authHeader } = require('../helpers/auth');
const { habitEntry } = require('../helpers/fixtures');
const { PutCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

beforeEach(() => {
    ddbMock.reset();
});

// --- POST /api/habits/:id/entries ---
describe('POST /api/habits/:id/entries', () => {
    test('logs a habit entry', async () => {
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/habits/habit%23test123/entries')
            .set(authHeader('test@example.com'))
            .send({ date: '2024-06-15' });
        expect(res.status).toBe(201);
        expect(res.body.entry.completed).toBe(true);
        expect(res.body.entry.date).toBe('2024-06-15');
    });

    test('defaults to today when no date provided', async () => {
        ddbMock.on(PutCommand).resolves({});
        const today = new Date().toISOString().split('T')[0];

        const res = await request(app)
            .post('/api/habits/habit%23test123/entries')
            .set(authHeader('test@example.com'))
            .send({});
        expect(res.status).toBe(201);
        expect(res.body.entry.date).toBe(today);
    });

    test('accepts a note', async () => {
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/habits/habit%23test123/entries')
            .set(authHeader('test@example.com'))
            .send({ date: '2024-06-15', note: 'Felt great' });
        expect(res.status).toBe(201);
        expect(res.body.entry.note).toBe('Felt great');
    });

    test('returns 400 for invalid date', async () => {
        const res = await request(app)
            .post('/api/habits/habit%23test123/entries')
            .set(authHeader('test@example.com'))
            .send({ date: 'bad-date' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/YYYY-MM-DD/);
    });

    test('returns 400 for note over 500 chars', async () => {
        const res = await request(app)
            .post('/api/habits/habit%23test123/entries')
            .set(authHeader('test@example.com'))
            .send({ date: '2024-06-15', note: 'x'.repeat(501) });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/500/);
    });

    test('constructs composite key correctly', async () => {
        let capturedItem;
        ddbMock.on(PutCommand).callsFake((input) => {
            capturedItem = input.Item;
            return {};
        });

        await request(app)
            .post('/api/habits/habit%23test123/entries')
            .set(authHeader('test@example.com'))
            .send({ date: '2024-06-15' });

        expect(capturedItem.emailHabitId).toBe('test@example.com#habit#test123');
        expect(capturedItem.email).toBe('test@example.com');
        expect(capturedItem.habitId).toBe('habit#test123');
    });
});

// --- DELETE /api/habits/:id/entries/:date ---
describe('DELETE /api/habits/:id/entries/:date', () => {
    test('deletes an existing entry', async () => {
        ddbMock.on(DeleteCommand).resolves({ Attributes: habitEntry });

        const res = await request(app)
            .delete('/api/habits/habit%23test123/entries/2024-06-15')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/deleted/i);
    });

    test('returns 404 when entry not found', async () => {
        ddbMock.on(DeleteCommand).resolves({ Attributes: undefined });

        const res = await request(app)
            .delete('/api/habits/habit%23test123/entries/2024-01-01')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
    });

    test('returns 400 for invalid date format', async () => {
        const res = await request(app)
            .delete('/api/habits/habit%23test123/entries/bad-date')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(400);
    });
});

// --- GET /api/habits/:id/entries ---
describe('GET /api/habits/:id/entries', () => {
    test('returns entries for a habit', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [habitEntry],
        });

        const res = await request(app)
            .get('/api/habits/habit%23test123/entries')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.entries).toHaveLength(1);
        expect(res.body.entries[0].completed).toBe(true);
    });

    test('returns nextCursor when paginated', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [habitEntry],
            LastEvaluatedKey: { emailHabitId: 'x#y', date: '2024-06-15' },
        });

        const res = await request(app)
            .get('/api/habits/habit%23test123/entries')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.nextCursor).toBeDefined();
    });

    test('returns 400 for invalid cursor', async () => {
        const res = await request(app)
            .get('/api/habits/habit%23test123/entries?cursor=!!!invalid')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(400);
    });
});

// --- GET /api/habits/entries/all ---
describe('GET /api/habits/entries/all', () => {
    test('returns all habit entries for user', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [habitEntry],
        });

        const res = await request(app)
            .get('/api/habits/entries/all')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.entries).toHaveLength(1);
        expect(res.body.entries[0].habitId).toBeDefined();
    });

    test('returns 400 for invalid cursor', async () => {
        const res = await request(app)
            .get('/api/habits/entries/all?cursor=bad!')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(400);
    });
});

// --- GET /api/habits/:id/stats ---
describe('GET /api/habits/:id/stats', () => {
    test('returns weekly stats', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const res = await request(app)
            .get('/api/habits/habit%23test123/stats')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.stats).toBeDefined();
        expect(Array.isArray(res.body.stats)).toBe(true);
        // Default 4 weeks
        expect(res.body.stats).toHaveLength(4);
    });

    test('respects weeks query param', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const res = await request(app)
            .get('/api/habits/habit%23test123/stats?weeks=2')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.stats).toHaveLength(2);
    });
});
