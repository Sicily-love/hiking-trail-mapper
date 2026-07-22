const assert = require('assert');
const {createReadonlyRuntimeInspector} = require('../../src/app/runtime/inspector.ts');

let value = 1;
const inspector = createReadonlyRuntimeInspector({
  value:() => value,
  stable:() => 'ok',
});

assert.strictEqual(inspector.value, 1);
value = 2;
assert.strictEqual(inspector.value, 2);
assert.strictEqual(inspector.stable, 'ok');
assert.strictEqual(Object.isFrozen(inspector), true);
assert.throws(() => createReadonlyRuntimeInspector({bad:1}), /reader/);
console.log('\nRuntime inspector\n  PASS exposes live read-only bindings\n\nResult: 1/1 passed');
