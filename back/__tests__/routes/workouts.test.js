const request = require('supertest');
const app = require('../../server');
const { ddbMock } = require('../helpers/dynamoMock');
const { authHeader } = require('../helpers/auth');
const { workoutRoutine, workoutLog } = require('../helpers/fixtures');
const {
    PutCommand,
    QueryCommand,
    GetCommand,
    UpdateCommand,
    DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

beforeEach(() => {
    ddbMock.reset();
});

// ===================
// ROUTINE ENDPOINTS
// ===================

describe('POST /api/workouts/routines', () => {
    const validRoutine = {
        name: 'Push Pull Legs',
        schedule: {
            '1': {
                label: 'Push Day',
                exercises: [{ name: 'Bench Press', sets: 4, reps: '8-10' }],
            },
        },
        isActive: true,
    };

    test('creates a routine with valid data', async () => {
        // Count query (max check) + deactivate query + put
        ddbMock.on(QueryCommand).resolves({ Count: 0, Items: [] });
        ddbMock.on(UpdateCommand).resolves({});
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/workouts/routines')
            .set(authHeader('test@example.com'))
            .send(validRoutine);
        expect(res.status).toBe(201);
        expect(res.body.routine.name).toBe('Push Pull Legs');
        expect(res.body.routine.routineId).toMatch(/^routine#/);
        expect(res.body.routine.isActive).toBe(true);
    });

    test('returns 400 when name missing', async () => {
        const res = await request(app)
            .post('/api/workouts/routines')
            .set(authHeader('test@example.com'))
            .send({ schedule: validRoutine.schedule });
        expect(res.status).toBe(400);
    });

    test('returns 400 for name over 100 chars', async () => {
        const res = await request(app)
            .post('/api/workouts/routines')
            .set(authHeader('test@example.com'))
            .send({ ...validRoutine, name: 'x'.repeat(101) });
        expect(res.status).toBe(400);
    });

    test('returns 400 for invalid schedule day key', async () => {
        const res = await request(app)
            .post('/api/workouts/routines')
            .set(authHeader('test@example.com'))
            .send({
                name: 'Test',
                schedule: {
                    '9': {
                        label: 'Bad Day',
                        exercises: [{ name: 'Press', sets: 3, reps: '10' }],
                    },
                },
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Invalid day key/);
    });

    test('returns 400 for empty schedule', async () => {
        const res = await request(app)
            .post('/api/workouts/routines')
            .set(authHeader('test@example.com'))
            .send({ name: 'Test', schedule: {} });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/at least 1 day/);
    });

    test('returns 400 when exercise name is missing', async () => {
        const res = await request(app)
            .post('/api/workouts/routines')
            .set(authHeader('test@example.com'))
            .send({
                name: 'Test',
                schedule: {
                    '0': {
                        label: 'Leg Day',
                        exercises: [{ sets: 3, reps: '10' }],
                    },
                },
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/exercise.*name/i);
    });

    test('returns 400 when max 10 routines reached', async () => {
        ddbMock.on(QueryCommand).resolves({ Count: 10 });

        const res = await request(app)
            .post('/api/workouts/routines')
            .set(authHeader('test@example.com'))
            .send(validRoutine);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/10/);
    });

    test('returns 401 without auth', async () => {
        const res = await request(app)
            .post('/api/workouts/routines')
            .send(validRoutine);
        expect(res.status).toBe(401);
    });
});

describe('GET /api/workouts/routines', () => {
    test('returns list of routines', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [workoutRoutine] });

        const res = await request(app)
            .get('/api/workouts/routines')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.routines).toHaveLength(1);
        expect(res.body.routines[0].name).toBe('Push Pull Legs');
    });

    test('returns empty array when no routines', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const res = await request(app)
            .get('/api/workouts/routines')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.routines).toHaveLength(0);
    });
});

describe('GET /api/workouts/routines/:id', () => {
    test('returns a single routine', async () => {
        ddbMock.on(GetCommand).resolves({ Item: workoutRoutine });

        const res = await request(app)
            .get('/api/workouts/routines/routine%23test123')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.routine.name).toBe('Push Pull Legs');
    });

    test('returns 404 for non-existent routine', async () => {
        ddbMock.on(GetCommand).resolves({ Item: undefined });

        const res = await request(app)
            .get('/api/workouts/routines/routine%23nope')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
    });
});

describe('PATCH /api/workouts/routines/:id', () => {
    test('updates routine name', async () => {
        ddbMock.on(UpdateCommand).resolves({
            Attributes: { ...workoutRoutine, name: 'Upper Lower' },
        });

        const res = await request(app)
            .patch('/api/workouts/routines/routine%23test123')
            .set(authHeader('test@example.com'))
            .send({ name: 'Upper Lower' });
        expect(res.status).toBe(200);
        expect(res.body.routine.name).toBe('Upper Lower');
    });

    test('returns 400 for empty update', async () => {
        const res = await request(app)
            .patch('/api/workouts/routines/routine%23test123')
            .set(authHeader('test@example.com'))
            .send({});
        expect(res.status).toBe(400);
    });

    test('returns 404 when routine not found', async () => {
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(UpdateCommand).rejects(err);

        const res = await request(app)
            .patch('/api/workouts/routines/routine%23nope')
            .set(authHeader('test@example.com'))
            .send({ name: 'Nope' });
        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/workouts/routines/:id', () => {
    test('deletes a routine', async () => {
        ddbMock.on(DeleteCommand).resolves({});

        const res = await request(app)
            .delete('/api/workouts/routines/routine%23test123')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/deleted/i);
    });

    test('returns 404 when routine not found', async () => {
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(DeleteCommand).rejects(err);

        const res = await request(app)
            .delete('/api/workouts/routines/routine%23nope')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
    });
});

// ===================
// LOG ENDPOINTS
// ===================

describe('POST /api/workouts/logs', () => {
    const validLog = {
        date: '2024-06-15',
        exercises: [
            {
                name: 'Bench Press',
                muscleGroup: 'Chest',
                sets: [{ weight: 135, reps: 10 }],
            },
        ],
        durationMin: 60,
        notes: 'Good session',
    };

    test('creates a log with valid data', async () => {
        ddbMock.on(QueryCommand).resolves({ Count: 0 });
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/workouts/logs')
            .set(authHeader('test@example.com'))
            .send(validLog);
        expect(res.status).toBe(201);
        expect(res.body.log.logId).toMatch(/^log#/);
        expect(res.body.log.date).toBe('2024-06-15');
        expect(res.body.log.exercises).toHaveLength(1);
    });

    test('returns 400 for missing date', async () => {
        const res = await request(app)
            .post('/api/workouts/logs')
            .set(authHeader('test@example.com'))
            .send({ exercises: validLog.exercises });
        expect(res.status).toBe(400);
    });

    test('returns 400 for future date', async () => {
        const res = await request(app)
            .post('/api/workouts/logs')
            .set(authHeader('test@example.com'))
            .send({ ...validLog, date: '2099-12-31' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/future/);
    });

    test('returns 400 for invalid exercise data', async () => {
        const res = await request(app)
            .post('/api/workouts/logs')
            .set(authHeader('test@example.com'))
            .send({
                date: '2024-06-15',
                exercises: [{ name: 'Bench', sets: [{ weight: -1, reps: 10 }] }],
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/weight/);
    });

    test('returns 400 for weight over 2000', async () => {
        const res = await request(app)
            .post('/api/workouts/logs')
            .set(authHeader('test@example.com'))
            .send({
                date: '2024-06-15',
                exercises: [{ name: 'Bench', sets: [{ weight: 2001, reps: 10 }] }],
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/weight/);
    });

    test('returns 400 for reps over 999', async () => {
        const res = await request(app)
            .post('/api/workouts/logs')
            .set(authHeader('test@example.com'))
            .send({
                date: '2024-06-15',
                exercises: [{ name: 'Bench', sets: [{ weight: 100, reps: 1000 }] }],
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/reps/);
    });

    test('returns 400 when max 1000 logs reached', async () => {
        ddbMock.on(QueryCommand).resolves({ Count: 1000 });

        const res = await request(app)
            .post('/api/workouts/logs')
            .set(authHeader('test@example.com'))
            .send(validLog);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/1000/);
    });

    test('returns 401 without auth', async () => {
        const res = await request(app)
            .post('/api/workouts/logs')
            .send(validLog);
        expect(res.status).toBe(401);
    });
});

describe('GET /api/workouts/logs', () => {
    test('returns logs with date range', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [workoutLog] });

        const res = await request(app)
            .get('/api/workouts/logs?from=2024-06-01&to=2024-06-30')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.logs).toHaveLength(1);
    });

    test('returns empty array when no logs', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const res = await request(app)
            .get('/api/workouts/logs')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.logs).toHaveLength(0);
    });

    test('returns nextCursor when more pages exist', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [workoutLog],
            LastEvaluatedKey: { email: 'test@example.com', logId: 'log#test123' },
        });

        const res = await request(app)
            .get('/api/workouts/logs?limit=1')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.nextCursor).toBeDefined();
    });
});

describe('GET /api/workouts/logs/:id', () => {
    test('returns a single log', async () => {
        ddbMock.on(GetCommand).resolves({ Item: workoutLog });

        const res = await request(app)
            .get('/api/workouts/logs/log%23test123')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.log.date).toBe('2024-06-15');
    });

    test('returns 404 for non-existent log', async () => {
        ddbMock.on(GetCommand).resolves({ Item: undefined });

        const res = await request(app)
            .get('/api/workouts/logs/log%23nope')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
    });
});

describe('PATCH /api/workouts/logs/:id', () => {
    test('updates log notes', async () => {
        ddbMock.on(UpdateCommand).resolves({
            Attributes: { ...workoutLog, notes: 'Updated' },
        });

        const res = await request(app)
            .patch('/api/workouts/logs/log%23test123')
            .set(authHeader('test@example.com'))
            .send({ notes: 'Updated' });
        expect(res.status).toBe(200);
        expect(res.body.log.notes).toBe('Updated');
    });

    test('returns 400 for empty update', async () => {
        const res = await request(app)
            .patch('/api/workouts/logs/log%23test123')
            .set(authHeader('test@example.com'))
            .send({});
        expect(res.status).toBe(400);
    });

    test('returns 404 when log not found', async () => {
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(UpdateCommand).rejects(err);

        const res = await request(app)
            .patch('/api/workouts/logs/log%23nope')
            .set(authHeader('test@example.com'))
            .send({ notes: 'Nope' });
        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/workouts/logs/:id', () => {
    test('deletes a log', async () => {
        ddbMock.on(DeleteCommand).resolves({});

        const res = await request(app)
            .delete('/api/workouts/logs/log%23test123')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/deleted/i);
    });

    test('returns 404 when log not found', async () => {
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(DeleteCommand).rejects(err);

        const res = await request(app)
            .delete('/api/workouts/logs/log%23nope')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
    });
});
