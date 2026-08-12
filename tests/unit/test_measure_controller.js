/** Typed measurement controller contracts. */
const assert = require('assert');
const app = require('../../src/app/index.ts');
const { read } = require('./runtime_source.js');

let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
};

const point = (idx, elev = 1000) => ({idx, lat:30 + idx / 100, lng:100, elev, km:idx});

console.log('\n▸ Typed measurement controller');

T('owns enter, reset, and exit while preserving one stable state view', () => {
  const controller = app.createMeasureController();
  const state = controller.state;
  controller.enter('trail-a');
  assert.strictEqual(controller.state, state);
  assert.strictEqual(state.active, true);
  assert.strictEqual(state.trailId, 'trail-a');
  assert.strictEqual(state._computeSeq, 1);

  controller.updateEndpoint('A', point(1));
  controller.updateEndpoint('B', point(3));
  controller.reset();
  assert.strictEqual(state.ptA, null);
  assert.strictEqual(state.ptB, null);
  assert.strictEqual(state.active, true);
  assert.strictEqual(state.trailId, 'trail-a');
  assert.strictEqual(state._computeSeq, 2);

  controller.exit();
  assert.strictEqual(state.active, false);
  assert.strictEqual(state.trailId, null);
  assert.strictEqual(state._computeSeq, 3);
});

T('updates and reverses endpoints while rejecting endpoint collisions', () => {
  const controller = app.createMeasureController();
  const a = point(2, 1100);
  const b = point(6, 1400);
  assert.strictEqual(controller.updateEndpoint('A', a), true);
  assert.strictEqual(controller.updateEndpoint('B', b), true);
  assert.strictEqual(controller.updateEndpoint('A', b), false);
  assert.strictEqual(controller.state.ptA, a);
  assert.strictEqual(controller.reverse(), true);
  assert.strictEqual(controller.state.ptA, b);
  assert.strictEqual(controller.state.ptB, a);
});

T('owns drag suppression and fast-tap arbitration', () => {
  const controller = app.createMeasureController();
  controller.beginDrag();
  controller.suppressFastTap(1234);
  assert.strictEqual(controller.state._justDragged, true);
  assert.strictEqual(controller.state._fastTapUntil, 1234);
  controller.endDrag();
  controller.suppressFastTap(-1);
  assert.strictEqual(controller.state._justDragged, false);
  assert.strictEqual(controller.state._fastTapUntil, 0);
});

T('invalidates stale asynchronous computations monotonically', () => {
  const controller = app.createMeasureController();
  const first = controller.nextComputeSequence();
  assert.strictEqual(controller.isComputeCurrent(first), true);
  const second = controller.nextComputeSequence();
  assert.strictEqual(second, first + 1);
  assert.strictEqual(controller.isComputeCurrent(first), false);
  assert.strictEqual(controller.isComputeCurrent(second), true);
  controller.reset();
  assert.strictEqual(controller.isComputeCurrent(second), false);
});

T('direct runtime delegates all measure session mutations to the controller', () => {
  const runtime = read('src/app/runtime/studio.ts');
  const measure = read('src/features/measure/runtime-owner.ts');
  const controllerSource = read('src/features/measure/controller.ts');
  const map = [runtime, measure].join('\n');
  const directBusinessWrite = /measureState\.(?:active|trailId|ptA|ptB|_justDragged|_fastTapUntil|_computeSeq)\s*(?:=|\+\+)/;
  assert.match(runtime, /createMeasureRuntime\(/);
  assert.match(measure, /createMeasureController\(\)/);
  assert.match(measure, /const state = controller\.state/);
  assert.match(measure, /controller\.enter/);
  assert.match(measure, /controller\.updateEndpoint/);
  assert.match(measure, /controller\.nextComputeSequence/);
  assert.match(runtime, /measureController\.suppressFastTap/);
  assert.doesNotMatch(measure, directBusinessWrite);
  assert.doesNotMatch(map, directBusinessWrite);
  assert.doesNotMatch(controllerSource, /\blayer:|\bsegmentLine:|\b_liveFrame:/);
  assert.match(measure, /const layer = L\.layerGroup\(\)\.addTo\(map\)/);
  assert.match(measure, /let segmentLine: unknown = null/);
  assert.match(measure, /let liveFrame: unknown = null/);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
