const EventEmitter = require('events');

jest.mock('../../lib/metrics', () => ({
    recordRequest: jest.fn(),
}));
const { recordRequest } = require('../../lib/metrics');
const metricsMiddleware = require('../../middleware/metrics');

function mockReq(overrides) {
    return { method: 'GET', originalUrl: '/api/test', ...overrides };
}

function mockRes() {
    const res = new EventEmitter();
    res.statusCode = 200;
    return res;
}

beforeEach(() => {
    recordRequest.mockClear();
});

describe('Metrics middleware', () => {
    test('does not call recordRequest for non-API paths', () => {
        const nonApiPaths = ['/health', '/static/foo.js', '/', '/favicon.ico'];

        for (const path of nonApiPaths) {
            const req = mockReq({ originalUrl: path });
            const res = mockRes();
            const next = jest.fn();

            metricsMiddleware(req, res, next);
            res.emit('finish');
        }

        expect(recordRequest).not.toHaveBeenCalled();
    });

    test('captures method, URL, status, and responseTimeMs for API routes', () => {
        const req = mockReq({ method: 'GET', originalUrl: '/api/weights' });
        const res = mockRes();
        res.statusCode = 200;
        const next = jest.fn();

        metricsMiddleware(req, res, next);
        res.emit('finish');

        expect(recordRequest).toHaveBeenCalledTimes(1);
        const call = recordRequest.mock.calls[0][0];
        expect(call.method).toBe('GET');
        expect(call.url).toBe('/api/weights');
        expect(call.status).toBe(200);
        expect(typeof call.responseTimeMs).toBe('number');
        expect(call.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    test('captures req.user.email when authenticated', () => {
        const req = mockReq({ user: { email: 'sara@example.com' } });
        const res = mockRes();
        const next = jest.fn();

        metricsMiddleware(req, res, next);
        res.emit('finish');

        expect(recordRequest).toHaveBeenCalledTimes(1);
        expect(recordRequest.mock.calls[0][0].userEmail).toBe('sara@example.com');
    });

    test('passes null userEmail when not authenticated', () => {
        const req = mockReq(); // no user property
        const res = mockRes();
        const next = jest.fn();

        metricsMiddleware(req, res, next);
        res.emit('finish');

        expect(recordRequest).toHaveBeenCalledTimes(1);
        expect(recordRequest.mock.calls[0][0].userEmail).toBeNull();
    });

    test('detects signup (POST /api/signup with 201 status)', () => {
        const req = mockReq({ method: 'POST', originalUrl: '/api/signup' });
        const res = mockRes();
        res.statusCode = 201;
        const next = jest.fn();

        metricsMiddleware(req, res, next);
        res.emit('finish');

        expect(recordRequest).toHaveBeenCalledTimes(1);
        expect(recordRequest.mock.calls[0][0].isSignup).toBe(true);
    });

    test('does not flag as signup for other POST endpoints or non-201 status', () => {
        // POST to a different endpoint
        const req1 = mockReq({ method: 'POST', originalUrl: '/api/signin' });
        const res1 = mockRes();
        res1.statusCode = 200;
        const next1 = jest.fn();

        metricsMiddleware(req1, res1, next1);
        res1.emit('finish');

        expect(recordRequest.mock.calls[0][0].isSignup).toBe(false);

        recordRequest.mockClear();

        // POST /api/signup but with a non-201 status (e.g. 409 conflict)
        const req2 = mockReq({ method: 'POST', originalUrl: '/api/signup' });
        const res2 = mockRes();
        res2.statusCode = 409;
        const next2 = jest.fn();

        metricsMiddleware(req2, res2, next2);
        res2.emit('finish');

        expect(recordRequest.mock.calls[0][0].isSignup).toBe(false);
    });

    test('calls next() immediately without blocking the request', () => {
        const req = mockReq();
        const res = mockRes();
        const next = jest.fn();

        metricsMiddleware(req, res, next);

        // next() should be called synchronously before res finishes
        expect(next).toHaveBeenCalledTimes(1);
        // recordRequest should NOT have been called yet (only fires on 'finish')
        expect(recordRequest).not.toHaveBeenCalled();
    });
});
