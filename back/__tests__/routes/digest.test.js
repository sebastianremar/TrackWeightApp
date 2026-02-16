const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../server');
const { ddbMock } = require('../helpers/dynamoMock');
const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');

beforeEach(() => {
    ddbMock.reset();
});

describe('GET /api/digest/unsubscribe', () => {
    function makeUnsubToken(email, overrides = {}) {
        return jwt.sign(
            { email, action: 'unsubscribe-digest', ...overrides },
            process.env.JWT_SECRET,
            { expiresIn: '30d' },
        );
    }

    test('unsubscribes user with valid token', async () => {
        ddbMock.on(UpdateCommand).resolves({});

        const token = makeUnsubToken('test@example.com');
        const res = await request(app).get(`/api/digest/unsubscribe?token=${token}`);

        expect(res.status).toBe(200);
        expect(res.text).toContain('Unsubscribed');
        expect(res.text).toContain('unsubscribed from the daily digest');

        // Verify DynamoDB was called correctly
        const calls = ddbMock.commandCalls(UpdateCommand);
        expect(calls).toHaveLength(1);
        expect(calls[0].args[0].input.Key).toEqual({ email: 'test@example.com' });
        expect(calls[0].args[0].input.ExpressionAttributeValues[':false']).toBe(false);
    });

    test('returns 400 when no token provided', async () => {
        const res = await request(app).get('/api/digest/unsubscribe');

        expect(res.status).toBe(400);
        expect(res.text).toContain('Missing token');
    });

    test('returns 400 for invalid JWT', async () => {
        const res = await request(app).get('/api/digest/unsubscribe?token=invalid-jwt');

        expect(res.status).toBe(400);
        expect(res.text).toContain('Invalid or expired');
    });

    test('returns 400 for expired token', async () => {
        const token = jwt.sign(
            { email: 'test@example.com', action: 'unsubscribe-digest' },
            process.env.JWT_SECRET,
            { expiresIn: '0s' },
        );

        // Small delay to ensure expiration
        await new Promise((r) => setTimeout(r, 10));

        const res = await request(app).get(`/api/digest/unsubscribe?token=${token}`);
        expect(res.status).toBe(400);
        expect(res.text).toContain('Invalid or expired');
    });

    test('returns 400 for wrong action in token', async () => {
        const token = jwt.sign(
            { email: 'test@example.com', action: 'wrong-action' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' },
        );

        const res = await request(app).get(`/api/digest/unsubscribe?token=${token}`);
        expect(res.status).toBe(400);
        expect(res.text).toContain('Invalid token');
    });

    test('returns 400 for token missing email', async () => {
        const token = jwt.sign(
            { action: 'unsubscribe-digest' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' },
        );

        const res = await request(app).get(`/api/digest/unsubscribe?token=${token}`);
        expect(res.status).toBe(400);
        expect(res.text).toContain('Invalid token');
    });

    test('returns 500 on DynamoDB failure', async () => {
        ddbMock.on(UpdateCommand).rejects(new Error('DynamoDB error'));

        const token = makeUnsubToken('test@example.com');
        const res = await request(app).get(`/api/digest/unsubscribe?token=${token}`);

        expect(res.status).toBe(500);
        expect(res.text).toContain('Something went wrong');
    });

    test('returns HTML response (not JSON)', async () => {
        ddbMock.on(UpdateCommand).resolves({});

        const token = makeUnsubToken('test@example.com');
        const res = await request(app).get(`/api/digest/unsubscribe?token=${token}`);

        expect(res.headers['content-type']).toMatch(/html/);
        expect(res.text).toContain('<!DOCTYPE html>');
    });
});
