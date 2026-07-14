/** Typed Day-preview controller contracts. */
const assert = require('assert');
const app = require('../../src/app/index.ts');
const { read } = require('./runtime_source.js');

let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
};

const track = () => [
  [30.000, 100, 1000, 0, 0, 1],
  [30.001, 100, 1100, 1, 100, 1],
  [30.002, 100, 1050, 2, 100, 2],
  [30.003, 100, 1200, 3, 250, 2],
  [30.004, 100, 1150, 4, 250, 2],
];

function createHarness(trails) {
  const context = app.createRuntimeContext({
    project:{title:'Day preview', trails},
    state:app.createAppStateStore({trails}),
    commands:new app.CommandRegistry(),
    interactions:app.createStudioInteractionManager(),
    renderer:new app.RenderScheduler({raf:() => 1, caf:() => {}}),
    dialogs:{confirm:async () => true},
  });
  return {context, controller:app.createDayPreviewController(context)};
}

console.log('\n▸ Typed Day-preview controller');

T('prepares a bounded render model and stats from day_meta indexes', () => {
  const trail = {id:'a', track:track(), day_meta:[{d:2, i_start:2, i_end:4}]};
  const {controller} = createHarness([trail]);
  const plan = controller.prepare('a', trail.day_meta[0], 2);
  assert.ok(plan);
  assert.strictEqual(plan.trail, trail);
  assert.strictEqual(plan.day, 2);
  assert.deepStrictEqual([plan.model.iStart, plan.model.iEnd], [2, 4]);
  assert.strictEqual(plan.model.latLngs.length, 2);
  assert.deepStrictEqual(plan.model.endpoints.map(item => item.label), ['A', 'B']);
  assert.strictEqual(plan.stats.km, 2);
  assert.strictEqual(plan.stats.max, 1200);
  assert.strictEqual(plan.stats.min, 1050);
});

T('falls back to explicit track Day ids when metadata lacks indexes', () => {
  const trail = {id:'a', track:track(), day_meta:[{d:1}, {d:2}]};
  const {controller} = createHarness([trail]);
  const plan = controller.prepare('a', trail.day_meta[1]);
  assert.ok(plan);
  assert.deepStrictEqual([plan.model.iStart, plan.model.iEnd], [2, 4]);
});

T('activates one stable state view and exits without touching effect state', () => {
  const trail = {id:'a', track:track(), day_meta:[{d:1, i_start:0, i_end:1}]};
  const {controller} = createHarness([trail]);
  const state = controller.state;
  state.layer = {name:'leaflet'};
  const plan = controller.prepare('a', trail.day_meta[0]);
  assert.strictEqual(controller.activate(plan), true);
  assert.strictEqual(controller.state, state);
  assert.strictEqual(controller.isActive('a', 1), true);
  assert.deepStrictEqual(
    {active:state.active, trailId:state.trailId, day:state.day, iStart:state.iStart, iEnd:state.iEnd},
    {active:true, trailId:'a', day:1, iStart:0, iEnd:1},
  );
  controller.exit();
  assert.strictEqual(state.active, false);
  assert.strictEqual(state.trailId, null);
  assert.deepStrictEqual(state.layer, {name:'leaflet'});
});

T('rejects invalid days, non-primary trails, and stale plans', () => {
  const first = {id:'a', group:'A', track:track(), day_meta:[{d:1, i_start:0, i_end:1}]};
  const second = {id:'b', group:'A', track:track(), day_meta:[{d:1, i_start:0, i_end:1}]};
  const {context, controller} = createHarness([first, second]);
  assert.strictEqual(controller.prepare('missing', {d:1}), null);
  assert.strictEqual(controller.prepare('a', {d:0}), null);
  assert.strictEqual(controller.prepare('b', second.day_meta[0]), null);
  const plan = controller.prepare('a', first.day_meta[0]);
  context.state.dispatch({type:'primary-trail.set', trailId:'b'});
  assert.strictEqual(controller.activate(plan), false);
});

T('direct runtime delegates Day selection state and uses core range helpers', () => {
  const source = read('src/app/runtime/studio.ts');
  const directBusinessWrite = /dayPreviewState\.(?:active|trailId|day|iStart|iEnd)\s*(?:=(?!=)|\+\+)/;
  assert.match(source, /createDayPreviewController\(runtimeContext\)/);
  assert.match(source, /const dayPreviewState = dayPreviewController\.state/);
  assert.match(source, /dayPreviewController\.prepare/);
  assert.match(source, /dayPreviewController\.activate/);
  assert.match(source, /dayPreviewController\.isActive/);
  assert.match(source, /dayPreviewController\.exit/);
  assert.match(source, /HTM_CORE\.getDayIndexRange/);
  assert.match(source, /HTM_CORE\.computeDayRangeStats/);
  assert.doesNotMatch(source, directBusinessWrite);
  assert.doesNotMatch(source, /function getDayIndexRange\(/);
  assert.doesNotMatch(source, /function computeDayRangeStats\(/);
  assert.match(source, /dayPreviewState\.layer\s*=/);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
