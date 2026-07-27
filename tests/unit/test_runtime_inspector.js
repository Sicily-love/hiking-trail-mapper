const assert = require('assert');
const {
  createReadonlyRuntimeInspector,
  createReadonlyRuntimeView,
} = require('../../src/app/runtime/inspector.ts');

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

const source = {trail:{name:'A', points:[[1, 2, 3]]}, selected:new Set(['a'])};
const view = createReadonlyRuntimeView(source);
assert.equal(view.trail.name, 'A');
assert.equal(view.selected.has('a'), true);
assert.throws(() => { view.trail.name = 'B'; }, /read-only/);
assert.throws(() => view.trail.points.push([4, 5, 6]), /read-only/);
assert.throws(() => view.selected.add('b'), /read-only/);
source.trail.name = 'Live';
source.selected.add('b');
assert.equal(view.trail.name, 'Live');
assert.deepEqual([...view.selected], ['a', 'b']);
const runtimeSource = require('fs').readFileSync(
  require('path').resolve(__dirname, '../../src/app/runtime/studio.ts'),
  'utf8',
);
assert.ok(runtimeSource.includes('advanceTrailRevision:(trailId: any)'));
assert.ok(runtimeSource.includes('projectSelectors.trailById(String(trailId))'));
console.log('\nRuntime inspector\n  PASS exposes live read-only bindings\n  PASS protects nested runtime values\n  PASS keeps fixture revisions behind the test driver\n\nResult: 3/3 passed');
