const { mockClient } = require('aws-sdk-client-mock');
const { docClient } = require('../../lib/db');

const ddbMock = mockClient(docClient);

module.exports = { ddbMock };
