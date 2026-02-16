let PutCommand;
let ddbMock;
let recordRequest, flushMetrics, startFlushInterval, stopFlushInterval;

beforeEach(() => {
    jest.resetModules();
    process.env.METRICS_TABLE = 'TestMetrics';

    // Re-require everything after resetModules so all modules share the same
    // docClient instance and PutCommand class reference
    ({ PutCommand } = require('@aws-sdk/lib-dynamodb'));
    ({ ddbMock } = require('../helpers/dynamoMock'));
    ({ recordRequest, flushMetrics, startFlushInterval, stopFlushInterval } =
        require('../../lib/metrics'));

    ddbMock.reset();
});

afterEach(() => {
    delete process.env.METRICS_TABLE;
});

// ---------------------------------------------------------------------------
// normalizeEndpoint -- tested indirectly via recordRequest + flushMetrics
// ---------------------------------------------------------------------------
describe('normalizeEndpoint (via byEndpoint)', () => {
    async function endpointFor(method, url) {
        ddbMock.on(PutCommand).resolves({});
        recordRequest({ method, url, status: 200, responseTimeMs: 10 });
        await flushMetrics();

        const putCall = ddbMock.commandCalls(PutCommand)[0];
        const item = putCall.args[0].input.Item;
        return Object.keys(item.byEndpoint)[0];
    }

    // --- habits ---
    test('normalizes /api/habits/:id', async () => {
        const key = await endpointFor('GET', '/api/habits/abc123');
        expect(key).toBe('GET /api/habits/:id');
    });

    test('normalizes /api/habits/:id/entries', async () => {
        const key = await endpointFor('GET', '/api/habits/abc/entries');
        expect(key).toBe('GET /api/habits/:id/entries');
    });

    test('normalizes /api/habits/:id/entries/:date', async () => {
        const key = await endpointFor('PUT', '/api/habits/abc/entries/2024-01-01');
        expect(key).toBe('PUT /api/habits/:id/entries/:date');
    });

    test('normalizes /api/habits/:id/stats', async () => {
        const key = await endpointFor('GET', '/api/habits/abc/stats');
        expect(key).toBe('GET /api/habits/:id/stats');
    });

    test('keeps /api/habits/stats as-is', async () => {
        const key = await endpointFor('GET', '/api/habits/stats');
        expect(key).toBe('GET /api/habits/stats');
    });

    test('keeps /api/habits/entries as-is', async () => {
        const key = await endpointFor('GET', '/api/habits/entries');
        expect(key).toBe('GET /api/habits/entries');
    });

    // --- weight ---
    test('normalizes /api/weight/:date', async () => {
        const key = await endpointFor('DELETE', '/api/weight/2024-01-01');
        expect(key).toBe('DELETE /api/weight/:date');
    });

    test('keeps /api/weight/latest as-is', async () => {
        const key = await endpointFor('GET', '/api/weight/latest');
        expect(key).toBe('GET /api/weight/latest');
    });

    // --- friends ---
    test('normalizes /api/friends/:email', async () => {
        const key = await endpointFor('DELETE', '/api/friends/a@b.com');
        expect(key).toBe('DELETE /api/friends/:email');
    });

    test('normalizes /api/friends/:email/weight', async () => {
        const key = await endpointFor('GET', '/api/friends/a@b.com/weight');
        expect(key).toBe('GET /api/friends/:email/weight');
    });

    test('normalizes /api/friends/:email/habits', async () => {
        const key = await endpointFor('GET', '/api/friends/a@b.com/habits');
        expect(key).toBe('GET /api/friends/:email/habits');
    });

    test('normalizes /api/friends/:email/habits/stats', async () => {
        const key = await endpointFor('GET', '/api/friends/a@b.com/habits/stats');
        expect(key).toBe('GET /api/friends/:email/habits/stats');
    });

    test('normalizes /api/friends/:email/favorite', async () => {
        const key = await endpointFor('PUT', '/api/friends/a@b.com/favorite');
        expect(key).toBe('PUT /api/friends/:email/favorite');
    });

    test('keeps /api/friends/request as-is', async () => {
        const key = await endpointFor('POST', '/api/friends/request');
        expect(key).toBe('POST /api/friends/request');
    });

    test('keeps /api/friends/respond as-is', async () => {
        const key = await endpointFor('POST', '/api/friends/respond');
        expect(key).toBe('POST /api/friends/respond');
    });

    test('keeps /api/friends/requests as-is', async () => {
        const key = await endpointFor('GET', '/api/friends/requests');
        expect(key).toBe('GET /api/friends/requests');
    });

    // --- query strings ---
    test('strips query strings before normalizing', async () => {
        const key = await endpointFor('GET', '/api/weight?from=2024-01-01');
        expect(key).toBe('GET /api/weight');
    });
});

// ---------------------------------------------------------------------------
// recordRequest
// ---------------------------------------------------------------------------
describe('recordRequest', () => {
    test('increments totalRequests counter', async () => {
        ddbMock.on(PutCommand).resolves({});

        recordRequest({ method: 'GET', url: '/api/weight', status: 200, responseTimeMs: 50 });
        recordRequest({ method: 'GET', url: '/api/weight', status: 200, responseTimeMs: 30 });
        recordRequest({ method: 'GET', url: '/api/weight', status: 200, responseTimeMs: 20 });

        await flushMetrics();

        const item = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item;
        expect(item.totalRequests).toBe(3);
    });

    test('tracks unique users via userEmail', async () => {
        ddbMock.on(PutCommand).resolves({});

        recordRequest({ method: 'GET', url: '/api/weight', status: 200, responseTimeMs: 10, userEmail: 'a@b.com' });
        recordRequest({ method: 'GET', url: '/api/weight', status: 200, responseTimeMs: 10, userEmail: 'a@b.com' });
        recordRequest({ method: 'GET', url: '/api/weight', status: 200, responseTimeMs: 10, userEmail: 'c@d.com' });

        await flushMetrics();

        const item = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item;
        expect(item.uniqueUsers).toBe(2);
        expect(item.uniqueUserEmails).toEqual(expect.arrayContaining(['a@b.com', 'c@d.com']));
    });

    test('counts signups when isSignup flag is set', async () => {
        ddbMock.on(PutCommand).resolves({});

        recordRequest({ method: 'POST', url: '/api/auth/signup', status: 201, responseTimeMs: 100, isSignup: true });
        recordRequest({ method: 'POST', url: '/api/auth/signup', status: 201, responseTimeMs: 80, isSignup: true });
        recordRequest({ method: 'POST', url: '/api/auth/signin', status: 200, responseTimeMs: 50 });

        await flushMetrics();

        const item = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item;
        expect(item.newSignups).toBe(2);
    });

    test('skips /health URL', async () => {
        ddbMock.on(PutCommand).resolves({});

        recordRequest({ method: 'GET', url: '/health', status: 200, responseTimeMs: 1 });

        await flushMetrics();

        // No PutCommand should have been sent since totalRequests is still 0
        expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
    });

    test('accumulates totalResponseTimeMs', async () => {
        ddbMock.on(PutCommand).resolves({});

        recordRequest({ method: 'GET', url: '/api/weight', status: 200, responseTimeMs: 100 });
        recordRequest({ method: 'GET', url: '/api/weight', status: 200, responseTimeMs: 250 });

        await flushMetrics();

        const item = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item;
        expect(item.totalResponseTimeMs).toBe(350);
    });

    test('groups status codes into Nxx buckets', async () => {
        ddbMock.on(PutCommand).resolves({});

        recordRequest({ method: 'GET', url: '/api/weight', status: 200, responseTimeMs: 10 });
        recordRequest({ method: 'GET', url: '/api/weight', status: 201, responseTimeMs: 10 });
        recordRequest({ method: 'GET', url: '/api/missing', status: 404, responseTimeMs: 10 });
        recordRequest({ method: 'GET', url: '/api/fail', status: 500, responseTimeMs: 10 });

        await flushMetrics();

        const item = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item;
        expect(item.byStatus).toEqual({ '2xx': 2, '4xx': 1, '5xx': 1 });
    });
});

// ---------------------------------------------------------------------------
// flushMetrics
// ---------------------------------------------------------------------------
describe('flushMetrics', () => {
    test('writes correct item shape to DynamoDB', async () => {
        ddbMock.on(PutCommand).resolves({});

        recordRequest({
            method: 'POST',
            url: '/api/weight',
            status: 201,
            responseTimeMs: 42,
            userEmail: 'user@test.com',
            isSignup: false,
        });

        await flushMetrics();

        const calls = ddbMock.commandCalls(PutCommand);
        expect(calls).toHaveLength(1);

        const { TableName, Item } = calls[0].args[0].input;
        expect(TableName).toBe('TestMetrics');
        expect(Item.metricType).toBe('hourly');
        expect(Item.timeBucket).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/);
        expect(Item.totalRequests).toBe(1);
        expect(Item.byEndpoint).toEqual({ 'POST /api/weight': 1 });
        expect(Item.byMethod).toEqual({ POST: 1 });
        expect(Item.byStatus).toEqual({ '2xx': 1 });
        expect(Item.uniqueUsers).toBe(1);
        expect(Item.uniqueUserEmails).toEqual(['user@test.com']);
        expect(Item.newSignups).toBe(0);
        expect(Item.totalResponseTimeMs).toBe(42);
        expect(Item.flushedAt).toBeDefined();
        expect(typeof Item.ttl).toBe('number');
        expect(Item.ttl).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    test('does not write when totalRequests is 0', async () => {
        ddbMock.on(PutCommand).resolves({});

        await flushMetrics();

        expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
    });

    test('does not write when METRICS_TABLE is not set', async () => {
        delete process.env.METRICS_TABLE;
        ddbMock.on(PutCommand).resolves({});

        recordRequest({ method: 'GET', url: '/api/weight', status: 200, responseTimeMs: 10 });

        await flushMetrics();

        expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// startFlushInterval / stopFlushInterval
// ---------------------------------------------------------------------------
describe('startFlushInterval / stopFlushInterval', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('periodically calls flushMetrics on the given interval', async () => {
        ddbMock.on(PutCommand).resolves({});

        recordRequest({ method: 'GET', url: '/api/weight', status: 200, responseTimeMs: 10 });

        startFlushInterval(5000);

        // Advance by one interval -- should trigger a flush
        jest.advanceTimersByTime(5000);

        // Allow the async flushMetrics() promise to resolve
        await Promise.resolve();

        expect(ddbMock.commandCalls(PutCommand).length).toBeGreaterThanOrEqual(1);

        // Clean up
        await stopFlushInterval();
    });

    test('stopFlushInterval clears the timer and performs a final flush', async () => {
        ddbMock.on(PutCommand).resolves({});

        recordRequest({ method: 'GET', url: '/api/weight', status: 200, responseTimeMs: 10 });

        startFlushInterval(60000);

        // Stop immediately -- should still flush remaining data
        await stopFlushInterval();

        expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);

        // Advancing timers should not cause another flush since interval is cleared
        ddbMock.reset();
        ddbMock.on(PutCommand).resolves({});

        jest.advanceTimersByTime(120000);
        await Promise.resolve();

        expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
    });
});
