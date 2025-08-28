const assert = require('assert');
const { getHello } = require('../backend/controllers/helloController');

assert.strictEqual(getHello(), 'バックエンドからこんにちは！');

console.log('helloController test passed');
