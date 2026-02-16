const request = require('supertest');
const app = require('../../server');
const { ddbMock } = require('../helpers/dynamoMock');
const { authHeader } = require('../helpers/auth');
const { GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const ADMIN_EMAIL = 'admin@example.com';
const NON_ADMIN_EMAIL = 'user@example.com';

beforeEach(() => {
    ddbMock.reset();
    process.env.METRICS_TABLE = 'TestMetrics';
});

function mockAdminPass() {
    ddbMock.on(GetCommand).resolves({ Item: { isAdmin: true } });
}

function mockAdminFail() {
    ddbMock.on(GetCommand).resolves({ Item: { isAdmin: false } });
}

// --- GET /api/admin/metrics ---
describe('GET /api/admin/metrics', () => {
    test('returns time series and summary with default 24h period', async () => {
        mockAdminPass();
        ddbMock.on(QueryCommand).resolves({
            Items: [
                {
                    metricType: 'hourly',
                    timeBucket: '2026-02-15T10:00:00.000Z',
                    totalRequests: 100,
                    totalResponseTimeMs: 5000,
                    byStatus: { '2xx': 90, '4xx': 8, '5xx': 2 },
                    byEndpoint: { 'GET /api/weight': 50, 'POST /api/weight': 30, 'GET /api/habits': 20 },
                    uniqueUsers: 5,
                    uniqueUserEmails: ['a@test.com', 'b@test.com'],
                    newSignups: 1,
                },
                {
                    metricType: 'hourly',
                    timeBucket: '2026-02-15T11:00:00.000Z',
                    totalRequests: 200,
                    totalResponseTimeMs: 8000,
                    byStatus: { '2xx': 180, '4xx': 15, '5xx': 5 },
                    byEndpoint: { 'GET /api/weight': 100, 'POST /api/habits': 60, 'DELETE /api/weight': 40 },
                    uniqueUsers: 8,
                    uniqueUserEmails: ['b@test.com', 'c@test.com'],
                    newSignups: 2,
                },
            ],
        });

        const res = await request(app)
            .get('/api/admin/metrics')
            .set(authHeader(ADMIN_EMAIL));

        expect(res.status).toBe(200);
        expect(res.body.period).toBe('24h');

        // Time series
        expect(res.body.timeSeries).toHaveLength(2);
        expect(res.body.timeSeries[0]).toEqual({
            time: '2026-02-15T10:00:00.000Z',
            requests: 100,
            errors: 10,
            uniqueUsers: 5,
            avgResponseMs: 50,
        });
        expect(res.body.timeSeries[1]).toEqual({
            time: '2026-02-15T11:00:00.000Z',
            requests: 200,
            errors: 20,
            uniqueUsers: 8,
            avgResponseMs: 40,
        });

        // Summary
        const { summary } = res.body;
        expect(summary.totalRequests).toBe(300);
        expect(summary.avgResponseMs).toBe(43); // Math.round(13000 / 300)
        expect(summary.errorRate).toBe(10); // (30 / 300) * 100 = 10
        expect(summary.newSignups).toBe(3);
        expect(summary.activeUsers).toBe(3); // a, b, c deduplicated
        expect(summary.topEndpoints).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ endpoint: 'GET /api/weight', count: 150 }),
            ]),
        );
    });

    test('accepts period=7d param', async () => {
        mockAdminPass();
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const res = await request(app)
            .get('/api/admin/metrics?period=7d')
            .set(authHeader(ADMIN_EMAIL));

        expect(res.status).toBe(200);
        expect(res.body.period).toBe('7d');
        expect(res.body.timeSeries).toEqual([]);
        expect(res.body.summary.totalRequests).toBe(0);
    });

    test('defaults to 24h for invalid period value', async () => {
        mockAdminPass();
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const res = await request(app)
            .get('/api/admin/metrics?period=invalid')
            .set(authHeader(ADMIN_EMAIL));

        expect(res.status).toBe(200);
        expect(res.body.period).toBe('24h');
    });

    test('returns 503 when METRICS_TABLE not configured', async () => {
        const saved = process.env.METRICS_TABLE;
        delete process.env.METRICS_TABLE;

        mockAdminPass();

        const res = await request(app)
            .get('/api/admin/metrics')
            .set(authHeader(ADMIN_EMAIL));

        expect(res.status).toBe(503);
        expect(res.body.error).toMatch(/not configured/i);

        process.env.METRICS_TABLE = saved;
    });

    test('aggregates uniqueUserEmails correctly across multiple items (deduplication)', async () => {
        mockAdminPass();
        ddbMock.on(QueryCommand).resolves({
            Items: [
                {
                    metricType: 'hourly',
                    timeBucket: '2026-02-15T10:00:00.000Z',
                    totalRequests: 10,
                    totalResponseTimeMs: 500,
                    byStatus: {},
                    uniqueUsers: 2,
                    uniqueUserEmails: ['alice@test.com', 'bob@test.com'],
                    newSignups: 0,
                },
                {
                    metricType: 'hourly',
                    timeBucket: '2026-02-15T11:00:00.000Z',
                    totalRequests: 20,
                    totalResponseTimeMs: 1000,
                    byStatus: {},
                    uniqueUsers: 2,
                    uniqueUserEmails: ['bob@test.com', 'charlie@test.com'],
                    newSignups: 0,
                },
                {
                    metricType: 'hourly',
                    timeBucket: '2026-02-15T12:00:00.000Z',
                    totalRequests: 5,
                    totalResponseTimeMs: 250,
                    byStatus: {},
                    uniqueUsers: 1,
                    uniqueUserEmails: ['alice@test.com'],
                    newSignups: 0,
                },
            ],
        });

        const res = await request(app)
            .get('/api/admin/metrics')
            .set(authHeader(ADMIN_EMAIL));

        expect(res.status).toBe(200);
        // alice, bob, charlie = 3 unique users across all buckets
        expect(res.body.summary.activeUsers).toBe(3);
        expect(res.body.summary.totalRequests).toBe(35);
    });

    test('returns 500 when DynamoDB query fails', async () => {
        mockAdminPass();
        ddbMock.on(QueryCommand).rejects(new Error('DynamoDB failure'));

        const res = await request(app)
            .get('/api/admin/metrics')
            .set(authHeader(ADMIN_EMAIL));

        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/internal server error/i);
    });
});

// --- GET /api/admin/users/count ---
describe('GET /api/admin/users/count', () => {
    test('returns count from scan', async () => {
        mockAdminPass();
        ddbMock.on(ScanCommand).resolves({ Count: 42 });

        const res = await request(app)
            .get('/api/admin/users/count')
            .set(authHeader(ADMIN_EMAIL));

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(42);
    });

    test('non-admin user gets 403', async () => {
        mockAdminFail();

        const res = await request(app)
            .get('/api/admin/users/count')
            .set(authHeader(NON_ADMIN_EMAIL));

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/admin/i);
    });
});
