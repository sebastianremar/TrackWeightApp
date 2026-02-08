const request = require('supertest');
const app = require('../../server');
const { ddbMock } = require('../helpers/dynamoMock');
const { authHeader } = require('../helpers/auth');
const { friendUser } = require('../helpers/fixtures');
const {
    GetCommand,
    PutCommand,
    QueryCommand,
    DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

beforeEach(() => {
    ddbMock.reset();
});

// --- POST /api/friends/request ---
describe('POST /api/friends/request', () => {
    test('sends friend request', async () => {
        // 1. Recipient exists
        ddbMock
            .on(GetCommand, { TableName: process.env.USERS_TABLE, Key: { email: 'friend@example.com' } })
            .resolves({ Item: friendUser });
        // 2. No existing friendship
        ddbMock
            .on(GetCommand, {
                TableName: process.env.FRIENDSHIPS_TABLE,
                Key: { email: 'test@example.com', friendEmail: 'friend@example.com' },
            })
            .resolves({ Item: undefined });
        // 3. PutCommand for both rows
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/friends/request')
            .set(authHeader('test@example.com'))
            .send({ email: 'friend@example.com' });
        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/sent/i);
    });

    test('returns 400 for self-add', async () => {
        const res = await request(app)
            .post('/api/friends/request')
            .set(authHeader('test@example.com'))
            .send({ email: 'test@example.com' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/yourself/i);
    });

    test('returns 400 when email missing', async () => {
        const res = await request(app)
            .post('/api/friends/request')
            .set(authHeader('test@example.com'))
            .send({});
        expect(res.status).toBe(400);
    });

    test('returns 404 when recipient does not exist', async () => {
        ddbMock.on(GetCommand).resolves({ Item: undefined });

        const res = await request(app)
            .post('/api/friends/request')
            .set(authHeader('test@example.com'))
            .send({ email: 'nobody@example.com' });
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/i);
    });

    test('returns 400 when already friends', async () => {
        ddbMock
            .on(GetCommand, { TableName: process.env.USERS_TABLE })
            .resolves({ Item: friendUser });
        ddbMock
            .on(GetCommand, { TableName: process.env.FRIENDSHIPS_TABLE })
            .resolves({ Item: { status: 'accepted', direction: 'sent' } });

        const res = await request(app)
            .post('/api/friends/request')
            .set(authHeader('test@example.com'))
            .send({ email: 'friend@example.com' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/already friends/i);
    });

    test('returns 400 when request already pending', async () => {
        ddbMock
            .on(GetCommand, { TableName: process.env.USERS_TABLE })
            .resolves({ Item: friendUser });
        ddbMock
            .on(GetCommand, { TableName: process.env.FRIENDSHIPS_TABLE })
            .resolves({ Item: { status: 'pending', direction: 'sent' } });

        const res = await request(app)
            .post('/api/friends/request')
            .set(authHeader('test@example.com'))
            .send({ email: 'friend@example.com' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/pending/i);
    });
});

// --- POST /api/friends/respond ---
describe('POST /api/friends/respond', () => {
    test('accepts a friend request', async () => {
        ddbMock.on(GetCommand).resolves({
            Item: { status: 'pending', direction: 'received' },
        });
        ddbMock.on(PutCommand).resolves({});

        const res = await request(app)
            .post('/api/friends/respond')
            .set(authHeader('test@example.com'))
            .send({ email: 'friend@example.com', accept: true });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/accepted/i);
    });

    test('rejects a friend request', async () => {
        ddbMock.on(GetCommand).resolves({
            Item: { status: 'pending', direction: 'received' },
        });
        ddbMock.on(DeleteCommand).resolves({});

        const res = await request(app)
            .post('/api/friends/respond')
            .set(authHeader('test@example.com'))
            .send({ email: 'friend@example.com', accept: false });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/rejected/i);
    });

    test('returns 400 when fields missing', async () => {
        const res = await request(app)
            .post('/api/friends/respond')
            .set(authHeader('test@example.com'))
            .send({ email: 'friend@example.com' });
        expect(res.status).toBe(400);
    });

    test('returns 404 when no pending request exists', async () => {
        ddbMock.on(GetCommand).resolves({ Item: undefined });

        const res = await request(app)
            .post('/api/friends/respond')
            .set(authHeader('test@example.com'))
            .send({ email: 'friend@example.com', accept: true });
        expect(res.status).toBe(404);
    });

    test('returns 404 when request is not direction=received', async () => {
        ddbMock.on(GetCommand).resolves({
            Item: { status: 'pending', direction: 'sent' },
        });

        const res = await request(app)
            .post('/api/friends/respond')
            .set(authHeader('test@example.com'))
            .send({ email: 'friend@example.com', accept: true });
        expect(res.status).toBe(404);
    });
});

// --- GET /api/friends ---
describe('GET /api/friends', () => {
    test('returns accepted friends with names', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [{ friendEmail: 'friend@example.com', status: 'accepted' }],
        });
        ddbMock.on(GetCommand).resolves({ Item: friendUser });

        const res = await request(app).get('/api/friends').set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.friends).toHaveLength(1);
        expect(res.body.friends[0].name).toBe('Friend User');
        expect(res.body.friends[0].shareWeight).toBe(true);
    });

    test('returns empty array when no friends', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const res = await request(app).get('/api/friends').set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.friends).toHaveLength(0);
    });
});

// --- GET /api/friends/requests ---
describe('GET /api/friends/requests', () => {
    test('returns pending incoming requests', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [
                {
                    friendEmail: 'friend@example.com',
                    status: 'pending',
                    direction: 'received',
                    createdAt: '2024-01-01T00:00:00.000Z',
                },
            ],
        });
        ddbMock.on(GetCommand).resolves({ Item: friendUser });

        const res = await request(app)
            .get('/api/friends/requests')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.requests).toHaveLength(1);
        expect(res.body.requests[0].name).toBe('Friend User');
    });
});

// --- DELETE /api/friends/:email ---
describe('DELETE /api/friends/:email', () => {
    test('removes friendship', async () => {
        ddbMock.on(DeleteCommand).resolves({});

        const res = await request(app)
            .delete('/api/friends/friend%40example.com')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/removed/i);
    });
});

// --- GET /api/friends/:email/weight ---
describe('GET /api/friends/:email/weight', () => {
    test('returns friend weight when friendship accepted and sharing enabled', async () => {
        // Friendship check
        ddbMock
            .on(GetCommand, { TableName: process.env.FRIENDSHIPS_TABLE })
            .resolves({ Item: { status: 'accepted' } });
        // Friend user with shareWeight=true
        ddbMock
            .on(GetCommand, { TableName: process.env.USERS_TABLE })
            .resolves({ Item: friendUser });
        // Weight entries
        ddbMock.on(QueryCommand).resolves({
            Items: [{ date: '2024-06-15', weight: 160 }],
        });

        const res = await request(app)
            .get('/api/friends/friend%40example.com/weight')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(200);
        expect(res.body.entries).toHaveLength(1);
    });

    test('returns 403 when not friends', async () => {
        ddbMock.on(GetCommand).resolves({ Item: undefined });

        const res = await request(app)
            .get('/api/friends/friend%40example.com/weight')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/not friends/i);
    });

    test('returns 403 when friend does not share weight', async () => {
        ddbMock
            .on(GetCommand, { TableName: process.env.FRIENDSHIPS_TABLE })
            .resolves({ Item: { status: 'accepted' } });
        ddbMock
            .on(GetCommand, { TableName: process.env.USERS_TABLE })
            .resolves({ Item: { ...friendUser, shareWeight: false } });

        const res = await request(app)
            .get('/api/friends/friend%40example.com/weight')
            .set(authHeader('test@example.com'));
        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/does not share/i);
    });
});
