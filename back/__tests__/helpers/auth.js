const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

function makeToken(email, opts = {}) {
    return jwt.sign({ email }, SECRET, { expiresIn: '24h', ...opts });
}

function authHeader(email) {
    return { Authorization: `Bearer ${makeToken(email)}` };
}

function expiredToken(email) {
    return jwt.sign({ email }, SECRET, { expiresIn: '0s' });
}

module.exports = { makeToken, authHeader, expiredToken };
