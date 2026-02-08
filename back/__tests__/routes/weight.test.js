const request = require('supertest');
const app = require('../../server');
const { ddbMock } = require('../helpers/dynamoMock');
const { authHeader } = require('../helpers/auth');
const { weightEntry } = require('../helpers/fixtures');
const { PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

beforeEach(() => {
    ddbMock.reset();
});

// --- POST /api/weight ---
describe('POST /api/weight', () => {
    test('records weight entry', async () => {
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/weight')
            .set(authHeader('test@example.com'))
            .send({ weight: 155.3, date: '2024-06-15' });
        expect(res.status).toBe(201);
        expect(res.body.entry.weight).toBe(155.3);
        expect(res.body.entry.date).toBe('2024-06-15');
    });

    test('defaults to today when no date provided', async () => {
        ddbMock.on(PutCommand).resolves({});
        const today = new Date().toISOString().split('T')[0];

        const res = await request(app)
            .post('/api/weight')
            .set(authHeader('test@example.com'))
            .send({ weight: 155 });
        expect(res.status).toBe(201);
        expect(res.body.entry.date).toBe(today);
    });

    test('rounds weight to 1 decimal place', async () => {
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/weight')
            .set(authHeader('test@example.com'))
            .send({ weight: 155.37, date: '2024-06-15' });
        expect(res.status).toBe(201);
        expect(res.body.entry.weight).toBe(155.4);
    });

    test('returns 400 for weight below 20', async () => {
        const res = await request(app)
            .post('/api/weight')
            .set(authHeader('test@example.com'))
            .send({ weight: 10 });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/20 and 500/);
    });

    test('returns 400 for weight above 500', async () => {
        const res = await request(app)
            .post('/api/weight')
            .set(authHeader('test@example.com'))
            .send({ weight: 501 });
        expect(res.status).toBe(400);
    });

    test('returns 400 for non-number weight', async () => {
        const res = await request(app)
            .post('/api/weight')
            .set(authHeader('test@example.com'))
            .send({ weight: 'heavy' });
        expect(res.status).toBe(400);
    });

    test('returns 400 for invalid date format', async () => {
        const res = await request(app)
            .post('/api/weight')
            .set(authHeader('test@example.com'))
            .send({ weight: 150, date: '06-15-2024' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/YYYY-MM-DD/);
    });

    test('returns 400 for future date', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        const res = await request(app)
            .post('/api/weight')
            .set(authHeader('test@example.com'))
            .send({ weight: 150, date: futureDateStr });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/future/);
    });

    test('returns 401 without auth', async () => {
        const res = await request(app).post('/api/weight').send({ weight: 150 });
        expect(res.status).toBe(401);
    });
});

// --- GET /api/weight ---
describe('GET /api/weight', () => {
    test('returns weight entries', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [weightEntry],
        });

        const res = await request(app).get('/api/weight').set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.entries).toHaveLength(1);
        expect(res.body.entries[0].date).toBe('2024-06-15');
    });

    test('returns nextCursor when more results exist', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [weightEntry],
            LastEvaluatedKey: { email: 'test@example.com', date: '2024-06-15' },
        });

        const res = await request(app).get('/api/weight').set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.nextCursor).toBeDefined();
    });

    test('returns 400 for invalid cursor', async () => {
        const res = await request(app)
            .get('/api/weight?cursor=not-valid-base64!!')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/cursor/i);
    });
});

// --- GET /api/weight/latest ---
describe('GET /api/weight/latest', () => {
    test('returns the most recent entry', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [{ date: '2024-06-15', weight: 150.5 }],
        });

        const res = await request(app)
            .get('/api/weight/latest')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.entry.weight).toBe(150.5);
    });

    test('returns 404 when no entries exist', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const res = await request(app)
            .get('/api/weight/latest')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
    });
});

// --- DELETE /api/weight/:date ---
describe('DELETE /api/weight/:date', () => {
    test('deletes an existing entry', async () => {
        ddbMock.on(DeleteCommand).resolves({ Attributes: weightEntry });

        const res = await request(app)
            .delete('/api/weight/2024-06-15')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/deleted/i);
    });

    test('returns 404 when entry does not exist', async () => {
        ddbMock.on(DeleteCommand).resolves({ Attributes: undefined });

        const res = await request(app)
            .delete('/api/weight/2024-01-01')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
    });

    test('returns 400 for invalid date format', async () => {
        const res = await request(app)
            .delete('/api/weight/bad-date')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(400);
    });
});
