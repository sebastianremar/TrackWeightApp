const request = require('supertest');
const app = require('../../server');
const { makeToken, expiredToken } = require('../helpers/auth');
const { ddbMock } = require('../helpers/dynamoMock');
const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { testUser } = require('../helpers/fixtures');

beforeEach(() => {
    ddbMock.reset();
});

describe('Auth middleware', () => {
    // Use GET /api/me as a protected endpoint to test the middleware

    test('returns 401 when no token provided', async () => {
        const res = await request(app).get('/api/me');
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('No token provided');
    });

    test('returns 401 for invalid token', async () => {
        const res = await request(app)
            .get('/api/me')
            .set('Authorization', 'Bearer invalid-token');
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid or expired token');
    });

    test('returns 401 for expired token', async () => {
        const token = expiredToken('test@example.com');
        // Small delay to ensure token is expired
        await new Promise((r) => setTimeout(r, 10));
        const res = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid or expired token');
    });

    test('accepts valid token from Authorization header', async () => {
        ddbMock.on(GetCommand).resolves({ Item: testUser });

        const token = makeToken('test@example.com');
        const res = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.email).toBe('test@example.com');
    });

    test('accepts valid token from cookie', async () => {
        ddbMock.on(GetCommand).resolves({ Item: testUser });

        const token = makeToken('test@example.com');
        const res = await request(app).get('/api/me').set('Cookie', `token=${token}`);
        expect(res.status).toBe(200);
        expect(res.body.email).toBe('test@example.com');
    });

    test('prefers cookie over Authorization header', async () => {
        ddbMock.on(GetCommand).resolves({ Item: testUser });

        const cookieToken = makeToken('test@example.com');
        const headerToken = makeToken('other@example.com');
        const res = await request(app)
            .get('/api/me')
            .set('Cookie', `token=${cookieToken}`)
            .set('Authorization', `Bearer ${headerToken}`);
        expect(res.status).toBe(200);
        expect(res.body.email).toBe('test@example.com');
    });

    test('returns 401 for malformed Authorization header', async () => {
        const res = await request(app).get('/api/me').set('Authorization', 'NotBearer token123');
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('No token provided');
    });
});
