/** Unit tests for one-shot runtime resource ownership. */
const assert = require('assert');
const {createRuntimeLifecycle} = require('../../src/app/runtime/lifecycle.ts');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS ${name}`);
  } catch(error) {
    failed += 1;
    console.log(`  FAIL ${name}\n    ${error.stack || error.message}`);
  }
}

console.log('\nRuntime lifecycle');

test('disposes owned resources once in reverse registration order', () => {
  const viewport = new EventTarget();
  const lifecycle = createRuntimeLifecycle(viewport);
  const calls = [];
  lifecycle.add(() => calls.push('first'));
  lifecycle.add(() => calls.push('second'));

  assert.strictEqual(lifecycle.size, 2);
  lifecycle.dispose();
  lifecycle.dispose();

  assert.deepStrictEqual(calls, ['second', 'first']);
  assert.strictEqual(lifecycle.disposed, true);
  assert.strictEqual(lifecycle.size, 0);
});

test('pagehide releases resources and late registrations immediately clean up', () => {
  const viewport = new EventTarget();
  const lifecycle = createRuntimeLifecycle(viewport);
  let cleanups = 0;
  lifecycle.add(() => { cleanups += 1; });

  viewport.dispatchEvent(new Event('pagehide'));
  lifecycle.add(() => { cleanups += 1; });

  assert.strictEqual(cleanups, 2);
  assert.strictEqual(lifecycle.disposed, true);
  assert.strictEqual(lifecycle.size, 0);
});

console.log(`\nResult: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
