const crypto = require('crypto');

const createId = (prefix) => `${prefix}${crypto.randomUUID()}`;

module.exports = { createId };
