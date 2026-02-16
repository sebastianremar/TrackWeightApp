const { mockClient } = require('aws-sdk-client-mock');
const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../../lib/db');

const ddbMock = mockClient(docClient);

// Wrap reset so auth middleware's tokenVersion check always has a default handler.
// Tests that set up their own GetCommand handler will override this.
const originalReset = ddbMock.reset.bind(ddbMock);
ddbMock.reset = function () {
    originalReset();
    ddbMock.on(GetCommand, { ProjectionExpression: 'tokenVersion' })
        .resolves({ Item: { tokenVersion: 0 } });
};

module.exports = { ddbMock };
