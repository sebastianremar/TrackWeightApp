const { SESClient } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

module.exports = { sesClient };
