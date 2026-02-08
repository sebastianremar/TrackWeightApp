const request = require('supertest');
const express = require('express');
const rateLimit = require('../../middleware/rateLimit');

function createTestApp(opts) {
    const app = express();
    app.use(express.json());
    app.post('/test', rateLimit(opts), (req, res) => {
        res.json({ ok: true });
    });
    app.post('/other', rateLimit(opts), (req, res) => {
        res.json({ ok: true });
    });
    return app;
}

describe('Rate limiter', () => {
    test('allows requests under the limit', async () => {
        const app = createTestApp({ maxHits: 3, windowMs: 60000 });

        const res = await request(app).post('/test');
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });

    test('returns 429 when limit exceeded', async () => {
        const app = createTestApp({ maxHits: 2, windowMs: 60000 });

        await request(app).post('/test');
        await request(app).post('/test');
        const res = await request(app).post('/test');
        expect(res.status).toBe(429);
        expect(res.body.error).toMatch(/too many requests/i);
    });

    test('includes Retry-After header on 429', async () => {
        const app = createTestApp({ maxHits: 1, windowMs: 60000 });

        await request(app).post('/test');
        const res = await request(app).post('/test');
        expect(res.status).toBe(429);
        expect(res.headers['retry-after']).toBeDefined();
        expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    });

    test('isolates rate limits per path', async () => {
        const app = createTestApp({ maxHits: 1, windowMs: 60000 });

        await request(app).post('/test');
        // /other should still be allowed since it's a different path
        const res = await request(app).post('/other');
        expect(res.status).toBe(200);
    });

    test('resets after window expires', async () => {
        jest.useFakeTimers();
        const app = createTestApp({ maxHits: 1, windowMs: 1000 });

        await request(app).post('/test');
        const blocked = await request(app).post('/test');
        expect(blocked.status).toBe(429);

        // Advance past window
        jest.advanceTimersByTime(1100);

        const allowed = await request(app).post('/test');
        expect(allowed.status).toBe(200);

        jest.useRealTimers();
    });
});
