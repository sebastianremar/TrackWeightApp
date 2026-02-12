const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../../server');
const { ddbMock } = require('../helpers/dynamoMock');
const { authHeader } = require('../helpers/auth');
const { testUser } = require('../helpers/fixtures');
const { GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const rateLimit = require('../../middleware/rateLimit');

jest.mock('bcrypt');

beforeEach(() => {
    ddbMock.reset();
    jest.restoreAllMocks();
    rateLimit._buckets.clear();
});

// --- SIGNUP ---
describe('POST /api/signup', () => {
    test('creates user with valid data', async () => {
        bcrypt.hash.mockResolvedValue('hashed-pw');
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app).post('/api/signup').send({
            name: 'New User',
            email: 'new@example.com',
            password: 'StrongPass1',
        });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('Account created successfully');
        expect(res.body.user.email).toBe('new@example.com');
        expect(res.headers['set-cookie']).toBeDefined();
    });

    test('returns 400 when name missing', async () => {
        const res = await request(app).post('/api/signup').send({
            email: 'a@b.com',
            password: 'StrongPass1',
        });
        expect(res.status).toBe(400);
    });

    test('returns 400 when email missing', async () => {
        const res = await request(app).post('/api/signup').send({
            name: 'User',
            password: 'StrongPass1',
        });
        expect(res.status).toBe(400);
    });

    test('returns 400 when password missing', async () => {
        const res = await request(app).post('/api/signup').send({
            name: 'User',
            email: 'a@b.com',
        });
        expect(res.status).toBe(400);
    });

    test('returns 400 for invalid email format', async () => {
        const res = await request(app).post('/api/signup').send({
            name: 'User',
            email: 'not-an-email',
            password: 'StrongPass1',
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/email/i);
    });

    test('returns 400 for short password', async () => {
        const res = await request(app).post('/api/signup').send({
            name: 'User',
            email: 'a@b.com',
            password: 'Short1',
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/8 characters/);
    });

    test('returns 400 for weak password (no uppercase)', async () => {
        const res = await request(app).post('/api/signup').send({
            name: 'User',
            email: 'a@b.com',
            password: 'weakpassword1',
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/uppercase/);
    });

    test('returns 400 for name over 100 chars', async () => {
        const res = await request(app).post('/api/signup').send({
            name: 'x'.repeat(101),
            email: 'a@b.com',
            password: 'StrongPass1',
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/100/);
    });

    test('returns 409 for duplicate email', async () => {
        bcrypt.hash.mockResolvedValue('hashed-pw');
        const err = new Error('Condition not met');
        err.name = 'ConditionalCheckFailedException';
        ddbMock.on(PutCommand).rejects(err);

        const res = await request(app).post('/api/signup').send({
            name: 'User',
            email: 'existing@b.com',
            password: 'StrongPass1',
        });
        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/already exists/);
    });
});

// --- SIGNIN ---
describe('POST /api/signin', () => {
    test('signs in with valid credentials', async () => {
        ddbMock.on(GetCommand).resolves({ Item: testUser });
        bcrypt.compare.mockResolvedValue(true);

        const res = await request(app).post('/api/signin').send({
            email: 'test@example.com',
            password: 'ValidPass1',
        });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Signed in successfully');
        expect(res.headers['set-cookie']).toBeDefined();
    });

    test('returns 400 when email or password missing', async () => {
        const res = await request(app).post('/api/signin').send({ email: 'a@b.com' });
        expect(res.status).toBe(400);
    });

    test('returns 401 for non-existent user', async () => {
        ddbMock.on(GetCommand).resolves({ Item: undefined });

        const res = await request(app).post('/api/signin').send({
            email: 'noone@b.com',
            password: 'Anything1',
        });
        expect(res.status).toBe(401);
    });

    test('returns 401 for wrong password', async () => {
        ddbMock.on(GetCommand).resolves({ Item: testUser });
        bcrypt.compare.mockResolvedValue(false);

        const res = await request(app).post('/api/signin').send({
            email: 'test@example.com',
            password: 'WrongPass1',
        });
        expect(res.status).toBe(401);
    });
});

// --- SIGNOUT ---
describe('POST /api/signout', () => {
    test('clears the token cookie', async () => {
        const res = await request(app).post('/api/signout');
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Signed out');
        // Set-Cookie header should clear the token
        const cookie = res.headers['set-cookie'];
        expect(cookie).toBeDefined();
    });
});

// --- GET /api/me ---
describe('GET /api/me', () => {
    test('returns user profile', async () => {
        ddbMock.on(GetCommand).resolves({ Item: testUser });

        const res = await request(app).get('/api/me').set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.email).toBe('test@example.com');
        expect(res.body.name).toBe('Test User');
        expect(res.body).not.toHaveProperty('shareWeight');
        expect(res.body).toHaveProperty('darkMode');
    });

    test('returns 404 if user not found in DB', async () => {
        ddbMock.on(GetCommand).resolves({ Item: undefined });

        const res = await request(app).get('/api/me').set(authHeader('ghost@example.com'));
        expect(res.status).toBe(404);
    });

    test('returns 401 without auth', async () => {
        const res = await request(app).get('/api/me');
        expect(res.status).toBe(401);
    });
});

// --- PATCH /api/me ---
describe('PATCH /api/me', () => {
    test('updates name', async () => {
        ddbMock.on(UpdateCommand).resolves({
            Attributes: { ...testUser, name: 'Updated' },
        });

        const res = await request(app)
            .patch('/api/me')
            .set(authHeader('test@example.com'))
            .send({ name: 'Updated' });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Updated');
    });

    test('returns 400 for empty update', async () => {
        const res = await request(app)
            .patch('/api/me')
            .set(authHeader('test@example.com'))
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/no valid fields/i);
    });

    test('returns 400 for invalid name (too long)', async () => {
        const res = await request(app)
            .patch('/api/me')
            .set(authHeader('test@example.com'))
            .send({ name: 'x'.repeat(101) });
        expect(res.status).toBe(400);
    });

    test('returns 400 for non-boolean darkMode', async () => {
        const res = await request(app)
            .patch('/api/me')
            .set(authHeader('test@example.com'))
            .send({ darkMode: 'yes' });
        expect(res.status).toBe(400);
    });

    test('updates darkMode', async () => {
        ddbMock.on(UpdateCommand).resolves({
            Attributes: { ...testUser, darkMode: true },
        });

        const res = await request(app)
            .patch('/api/me')
            .set(authHeader('test@example.com'))
            .send({ darkMode: true });
        expect(res.status).toBe(200);
        expect(res.body.darkMode).toBe(true);
        expect(res.body).not.toHaveProperty('shareWeight');
    });
});

// --- PATCH /api/me/password ---
describe('PATCH /api/me/password', () => {
    test('changes password with valid current password', async () => {
        ddbMock.on(GetCommand).resolves({ Item: testUser });
        ddbMock.on(UpdateCommand).resolves({});
        bcrypt.compare.mockResolvedValue(true);
        bcrypt.hash.mockResolvedValue('new-hashed');

        const res = await request(app)
            .patch('/api/me/password')
            .set(authHeader('test@example.com'))
            .send({ currentPassword: 'OldPass1', newPassword: 'NewPass1x' });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/password updated/i);
    });

    test('returns 401 for wrong current password', async () => {
        ddbMock.on(GetCommand).resolves({ Item: testUser });
        bcrypt.compare.mockResolvedValue(false);

        const res = await request(app)
            .patch('/api/me/password')
            .set(authHeader('test@example.com'))
            .send({ currentPassword: 'Wrong1xx', newPassword: 'NewPass1x' });
        expect(res.status).toBe(401);
    });

    test('returns 400 when fields missing', async () => {
        const res = await request(app)
            .patch('/api/me/password')
            .set(authHeader('test@example.com'))
            .send({ currentPassword: 'OldPass1' });
        expect(res.status).toBe(400);
    });
});
