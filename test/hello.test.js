const assert = require('assert');
const { getHello } = require('../src/controllers/helloController');

assert.strictEqual(getHello(), 'バックエンドからこんにちは！');

console.log('helloController test passed');
