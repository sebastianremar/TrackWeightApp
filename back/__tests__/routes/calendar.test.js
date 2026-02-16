const request = require('supertest');
const app = require('../../server');
const { ddbMock } = require('../helpers/dynamoMock');
const { authHeader } = require('../helpers/auth');
const { calendarEvent } = require('../helpers/fixtures');
const { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

beforeEach(() => {
    ddbMock.reset();
});

// --- POST /api/calendar ---
describe('POST /api/calendar', () => {
    test('creates event with valid data', async () => {
        ddbMock.on(QueryCommand).resolves({ Count: 0 });
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/calendar')
            .set(authHeader('test@example.com'))
            .send({
                title: 'Team Meeting',
                date: '2024-06-15',
                startTime: '09:00',
                endTime: '10:00',
                category: 'Work',
                color: '#2563EB',
            });
        expect(res.status).toBe(201);
        expect(res.body.event.title).toBe('Team Meeting');
        expect(res.body.event.date).toBe('2024-06-15');
        expect(res.body.event.startTime).toBe('09:00');
        expect(res.body.event.eventId).toMatch(/^event#/);
    });

    test('returns 400 when title missing', async () => {
        const res = await request(app)
            .post('/api/calendar')
            .set(authHeader('test@example.com'))
            .send({ date: '2024-06-15', startTime: '09:00' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Title/i);
    });

    test('returns 400 for invalid date format', async () => {
        const res = await request(app)
            .post('/api/calendar')
            .set(authHeader('test@example.com'))
            .send({ title: 'Meeting', date: '06-15-2024', startTime: '09:00' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Date/i);
    });

    test('returns 400 for invalid time format', async () => {
        const res = await request(app)
            .post('/api/calendar')
            .set(authHeader('test@example.com'))
            .send({ title: 'Meeting', date: '2024-06-15', startTime: '9am' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Start time/i);
    });

    test('returns 400 when endTime <= startTime', async () => {
        const res = await request(app)
            .post('/api/calendar')
            .set(authHeader('test@example.com'))
            .send({
                title: 'Meeting',
                date: '2024-06-15',
                startTime: '10:00',
                endTime: '09:00',
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/End time must be after/i);
    });

    test('returns 400 for invalid color (not hex)', async () => {
        const res = await request(app)
            .post('/api/calendar')
            .set(authHeader('test@example.com'))
            .send({
                title: 'Meeting',
                date: '2024-06-15',
                startTime: '09:00',
                color: 'red',
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/hex color/i);
    });

    test('returns 401 without auth', async () => {
        const res = await request(app)
            .post('/api/calendar')
            .send({ title: 'Meeting', date: '2024-06-15', startTime: '09:00' });
        expect(res.status).toBe(401);
    });
});

// --- GET /api/calendar ---
describe('GET /api/calendar', () => {
    test('lists events by date range', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [calendarEvent] });

        const res = await request(app)
            .get('/api/calendar?from=2024-06-01&to=2024-06-30')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.events).toHaveLength(1);
        expect(res.body.events[0].title).toBe('Team Meeting');
    });

    test('returns 400 when from/to missing', async () => {
        const res = await request(app)
            .get('/api/calendar')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/from and to/i);
    });
});

// --- PATCH /api/calendar/:id ---
describe('PATCH /api/calendar/:id', () => {
    test('updates event title', async () => {
        ddbMock.on(UpdateCommand).resolves({
            Attributes: { ...calendarEvent, title: 'Updated Meeting' },
        });

        const res = await request(app)
            .patch('/api/calendar/event%23test123')
            .set(authHeader('test@example.com'))
            .send({ title: 'Updated Meeting' });
        expect(res.status).toBe(200);
        expect(res.body.event.title).toBe('Updated Meeting');
    });

    test('returns 404 for non-existent event', async () => {
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(UpdateCommand).rejects(err);

        const res = await request(app)
            .patch('/api/calendar/event%23nope')
            .set(authHeader('test@example.com'))
            .send({ title: 'Nope' });
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/i);
    });
});

// --- DELETE /api/calendar/:id ---
describe('DELETE /api/calendar/:id', () => {
    test('deletes event', async () => {
        ddbMock.on(DeleteCommand).resolves({});

        const res = await request(app)
            .delete('/api/calendar/event%23test123')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/deleted/i);
    });

    test('returns 404 for non-existent event', async () => {
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(DeleteCommand).rejects(err);

        const res = await request(app)
            .delete('/api/calendar/event%23nope')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/i);
    });
});
