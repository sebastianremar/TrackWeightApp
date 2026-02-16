function mockReq(email) {
    return { user: { email } };
}

function mockRes() {
    const res = { statusCode: null, body: null };
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    return res;
}

describe('Admin middleware', () => {
    let requireAdmin;
    let ddbMock;
    let GetCommand;

    beforeEach(() => {
        jest.resetModules();
        ({ ddbMock } = require('../helpers/dynamoMock'));
        ({ GetCommand } = require('@aws-sdk/lib-dynamodb'));
        requireAdmin = require('../../middleware/admin');
    });

    test('calls next() when user isAdmin: true', async () => {
        ddbMock.on(GetCommand).resolves({ Item: { isAdmin: true } });

        const req = mockReq('admin@example.com');
        const res = mockRes();
        const next = jest.fn();

        await requireAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBeNull();
    });

    test('returns 403 when user isAdmin: false', async () => {
        ddbMock.on(GetCommand).resolves({ Item: { isAdmin: false } });

        const req = mockReq('user@example.com');
        const res = mockRes();
        const next = jest.fn();

        await requireAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({ error: 'Admin access required' });
    });

    test('returns 403 when user not found in DB', async () => {
        ddbMock.on(GetCommand).resolves({});

        const req = mockReq('unknown@example.com');
        const res = mockRes();
        const next = jest.fn();

        await requireAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({ error: 'Admin access required' });
    });

    test('returns 500 when DynamoDB throws an error', async () => {
        ddbMock.on(GetCommand).rejects(new Error('DynamoDB failure'));

        const req = mockReq('admin@example.com');
        const res = mockRes();
        const next = jest.fn();

        await requireAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({ error: 'Internal server error' });
    });

    test('uses cache on subsequent calls and does not query DB again', async () => {
        ddbMock.on(GetCommand).resolves({ Item: { isAdmin: true } });

        const req = mockReq('cached@example.com');
        const res1 = mockRes();
        const next1 = jest.fn();

        await requireAdmin(req, res1, next1);
        expect(next1).toHaveBeenCalled();

        // DynamoDB should have been called once
        expect(ddbMock.commandCalls(GetCommand).length).toBe(1);

        // Second call with same email should use cache
        const res2 = mockRes();
        const next2 = jest.fn();

        await requireAdmin(req, res2, next2);
        expect(next2).toHaveBeenCalled();

        // DynamoDB should still have been called only once (cached)
        expect(ddbMock.commandCalls(GetCommand).length).toBe(1);
    });
});
