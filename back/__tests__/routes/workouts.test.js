const request = require('supertest');
const app = require('../../server');
const { ddbMock } = require('../helpers/dynamoMock');
const { authHeader } = require('../helpers/auth');
const { workoutTemplate, customExercise, workoutLog } = require('../helpers/fixtures');
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
// EXERCISE ENDPOINTS
// ===================

describe('GET /api/workouts/exercises', () => {
    test('returns library and custom exercises', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [customExercise] });

        const res = await request(app)
            .get('/api/workouts/exercises')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.library).toBeDefined();
        expect(res.body.library.length).toBeGreaterThan(40);
        expect(res.body.custom).toHaveLength(1);
        expect(res.body.custom[0].name).toBe('Landmine Press');
        expect(res.body.custom[0].custom).toBe(true);
    });

    test('returns empty custom array when none exist', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const res = await request(app)
            .get('/api/workouts/exercises')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.custom).toHaveLength(0);
        expect(res.body.library.length).toBeGreaterThan(0);
    });

    test('returns 401 without auth', async () => {
        const res = await request(app).get('/api/workouts/exercises');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/workouts/exercises', () => {
    const validExercise = {
        name: 'Landmine Press',
        muscleGroup: 'Shoulders',
    };

    test('creates a custom exercise', async () => {
        ddbMock.on(QueryCommand).resolves({ Count: 0 });
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/workouts/exercises')
            .set(authHeader('test@example.com'))
            .send(validExercise);
        expect(res.status).toBe(201);
        expect(res.body.exercise.name).toBe('Landmine Press');
        expect(res.body.exercise.id).toMatch(/^exercise#/);
        expect(res.body.exercise.custom).toBe(true);
    });

    test('returns 400 for missing name', async () => {
        const res = await request(app)
            .post('/api/workouts/exercises')
            .set(authHeader('test@example.com'))
            .send({ muscleGroup: 'Chest' });
        expect(res.status).toBe(400);
    });

    test('returns 400 for invalid muscleGroup', async () => {
        const res = await request(app)
            .post('/api/workouts/exercises')
            .set(authHeader('test@example.com'))
            .send({ name: 'Test', muscleGroup: 'InvalidGroup' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/muscleGroup/);
    });

    test('returns 400 when max 50 custom exercises reached', async () => {
        ddbMock.on(QueryCommand).resolves({ Count: 50 });

        const res = await request(app)
            .post('/api/workouts/exercises')
            .set(authHeader('test@example.com'))
            .send(validExercise);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/50/);
    });
});

describe('DELETE /api/workouts/exercises/:id', () => {
    test('deletes a custom exercise', async () => {
        ddbMock.on(DeleteCommand).resolves({});

        const res = await request(app)
            .delete('/api/workouts/exercises/exercise%23test123')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/deleted/i);
    });

    test('returns 400 for invalid exercise ID prefix', async () => {
        const res = await request(app)
            .delete('/api/workouts/exercises/bad-id')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(400);
    });

    test('returns 404 when exercise not found', async () => {
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(DeleteCommand).rejects(err);

        const res = await request(app)
            .delete('/api/workouts/exercises/exercise%23nope')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
    });
});

// ===================
// TEMPLATE ENDPOINTS
// ===================

describe('GET /api/workouts/templates', () => {
    test('returns list of templates', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [workoutTemplate] });

        const res = await request(app)
            .get('/api/workouts/templates')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.templates).toHaveLength(1);
        expect(res.body.templates[0].name).toBe('Push Day');
    });

    test('returns empty array when no templates', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const res = await request(app)
            .get('/api/workouts/templates')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.templates).toHaveLength(0);
    });
});

describe('POST /api/workouts/templates', () => {
    const validTemplate = {
        name: 'Push Day',
        exercises: [
            { exerciseId: 'bench-press', name: 'Bench Press', muscleGroup: 'Chest', sets: 4, reps: '8-10' },
        ],
    };

    test('creates a template with valid data', async () => {
        ddbMock.on(QueryCommand).resolves({ Count: 0 });
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/workouts/templates')
            .set(authHeader('test@example.com'))
            .send(validTemplate);
        expect(res.status).toBe(201);
        expect(res.body.template.name).toBe('Push Day');
        expect(res.body.template.routineId).toMatch(/^tmpl#/);
    });

    test('returns 400 when name missing', async () => {
        const res = await request(app)
            .post('/api/workouts/templates')
            .set(authHeader('test@example.com'))
            .send({ exercises: validTemplate.exercises });
        expect(res.status).toBe(400);
    });

    test('returns 400 for missing exerciseId', async () => {
        const res = await request(app)
            .post('/api/workouts/templates')
            .set(authHeader('test@example.com'))
            .send({
                name: 'Test',
                exercises: [{ name: 'Bench', muscleGroup: 'Chest', sets: 3, reps: '10' }],
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/exerciseId/);
    });

    test('returns 400 when max 20 templates reached', async () => {
        ddbMock.on(QueryCommand).resolves({ Count: 20 });

        const res = await request(app)
            .post('/api/workouts/templates')
            .set(authHeader('test@example.com'))
            .send(validTemplate);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/20/);
    });

    test('returns 401 without auth', async () => {
        const res = await request(app)
            .post('/api/workouts/templates')
            .send(validTemplate);
        expect(res.status).toBe(401);
    });
});

describe('GET /api/workouts/templates/:id', () => {
    test('returns a single template', async () => {
        ddbMock.on(GetCommand).resolves({ Item: workoutTemplate });

        const res = await request(app)
            .get('/api/workouts/templates/tmpl%23test123')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.template.name).toBe('Push Day');
    });

    test('returns 404 for non-existent template', async () => {
        ddbMock.on(GetCommand).resolves({ Item: undefined });

        const res = await request(app)
            .get('/api/workouts/templates/tmpl%23nope')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
    });
});

describe('PATCH /api/workouts/templates/:id', () => {
    test('updates template name', async () => {
        ddbMock.on(UpdateCommand).resolves({
            Attributes: { ...workoutTemplate, name: 'Pull Day' },
        });

        const res = await request(app)
            .patch('/api/workouts/templates/tmpl%23test123')
            .set(authHeader('test@example.com'))
            .send({ name: 'Pull Day' });
        expect(res.status).toBe(200);
        expect(res.body.template.name).toBe('Pull Day');
    });

    test('returns 400 for empty update', async () => {
        const res = await request(app)
            .patch('/api/workouts/templates/tmpl%23test123')
            .set(authHeader('test@example.com'))
            .send({});
        expect(res.status).toBe(400);
    });

    test('returns 404 when template not found', async () => {
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(UpdateCommand).rejects(err);

        const res = await request(app)
            .patch('/api/workouts/templates/tmpl%23nope')
            .set(authHeader('test@example.com'))
            .send({ name: 'Nope' });
        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/workouts/templates/:id', () => {
    test('deletes a template', async () => {
        ddbMock.on(DeleteCommand).resolves({});

        const res = await request(app)
            .delete('/api/workouts/templates/tmpl%23test123')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/deleted/i);
    });

    test('returns 400 for invalid template ID prefix', async () => {
        const res = await request(app)
            .delete('/api/workouts/templates/bad-id')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(400);
    });

    test('returns 404 when template not found', async () => {
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(DeleteCommand).rejects(err);

        const res = await request(app)
            .delete('/api/workouts/templates/tmpl%23nope')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(404);
    });
});

describe('GET /api/workouts/templates/:id/prefill', () => {
    test('returns last session weights', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [workoutLog] });

        const res = await request(app)
            .get('/api/workouts/templates/tmpl%23test123/prefill')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.exercises).toHaveLength(1);
        expect(res.body.exercises[0].name).toBe('Bench Press');
        expect(res.body.exercises[0].sets).toHaveLength(2);
        expect(res.body.date).toBe('2024-06-15');
    });

    test('returns empty exercises when no history', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const res = await request(app)
            .get('/api/workouts/templates/tmpl%23test123/prefill')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.exercises).toHaveLength(0);
        expect(res.body.date).toBeNull();
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

    test('creates a log with template info', async () => {
        ddbMock.on(QueryCommand).resolves({ Count: 0 });
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/workouts/logs')
            .set(authHeader('test@example.com'))
            .send({ ...validLog, templateId: 'tmpl#test123', templateName: 'Push Day' });
        expect(res.status).toBe(201);
        expect(res.body.log.templateId).toBe('tmpl#test123');
        expect(res.body.log.templateName).toBe('Push Day');
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
