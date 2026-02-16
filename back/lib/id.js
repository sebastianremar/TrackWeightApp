const crypto = require('crypto');

function generateId() {
    const t = Date.now().toString(36);
    const r = crypto.randomBytes(8).toString('hex');
    return t + r;
}

module.exports = { generateId };
