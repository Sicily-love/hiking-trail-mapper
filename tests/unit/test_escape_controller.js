/** Typed escape-route core and controller contracts. */
const assert = require('assert');
const app = require('../../src/app/index.ts');
const core = require('../../src/core/index.ts');
const { read } = require('./runtime_source.js');

let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
};

const track = (lat = 30) => Array.from({length:401}, (_, index) => [
  lat + index / 10000,
  100,
  1000 + index * 2,
  index / 10,
]);

const anchor = (trail, index) => ({
  lat:trail.track[index][0],
  lng:trail.track[index][1],
  elev:trail.track[index][2],
  km:trail.track[index][3],
  trailId:trail.id,
  trailName:trail.name,
  trackIdx:index,
});

function createHarness(trails) {
  const context = app.createRuntimeContext({
    project:{title:'Escape', trails},
    state:app.createAppStateStore({trails}),
    commands:new app.CommandRegistry(),
    interactions:app.createStudioInteractionManager(),
    renderer:new app.RenderScheduler({raf:() => 1, caf:() => {}}),
    dialogs:{confirm:async () => true},
  });
  const effects = {revisions:0};
  const controller = app.createEscapeController(context, {
    createRouteId:() => 'manual-test',
    markRevision:() => { effects.revisions++; },
  });
  return {context, controller, effects};
}

console.log('\n▸ Typed escape-route controller');

T('builds a bounded A-to-B route and keeps endpoint direction', () => {
  const trail = {id:'a', name:'Main', track:track()};
  const forward = core.buildManualEscapeRoute(trail, anchor(trail, 0), anchor(trail, 400), 'forward', 40);
  assert.strictEqual(forward.ok, true);
  assert.strictEqual(forward.preview.route.line.length, 40);
  assert.deepStrictEqual(forward.preview.route.line[0], [trail.track[0][0], trail.track[0][1]]);
  assert.deepStrictEqual(forward.preview.route.line.at(-1), [trail.track[400][0], trail.track[400][1]]);
  assert.strictEqual(forward.preview.route.drop_m, -800);
  assert.ok(forward.preview.ascentM > 0);
  assert.strictEqual(forward.preview.descentM, 0);

  const reverse = core.buildManualEscapeRoute(trail, anchor(trail, 400), anchor(trail, 0), 'reverse', 40);
  assert.strictEqual(reverse.ok, true);
  assert.deepStrictEqual(reverse.preview.route.line[0], [trail.track[400][0], trail.track[400][1]]);
  assert.deepStrictEqual(reverse.preview.route.line.at(-1), [trail.track[0][0], trail.track[0][1]]);
  assert.strictEqual(reverse.preview.route.drop_m, 800);
  assert.strictEqual(reverse.preview.ascentM, 0);
  assert.ok(reverse.preview.descentM > 0);
  assert.match(reverse.preview.route.desc, /逆向/);
});

T('rejects empty tracks and anchors that snap to one point', () => {
  const empty = {id:'empty', name:'Empty', track:[]};
  assert.deepStrictEqual(core.buildManualEscapeRoute(empty, {lat:0, lng:0}, {lat:1, lng:1}, 'x'), {
    ok:false, reason:'empty-track',
  });
  const trail = {id:'a', name:'Main', track:track()};
  assert.deepStrictEqual(
    core.buildManualEscapeRoute(trail, anchor(trail, 10), anchor(trail, 10), 'x'),
    {ok:false, reason:'same-point'},
  );
});

T('snaps only to active trails in the active group and enforces the radius', () => {
  const first = {id:'a', name:'A', group:'A', track:track(30)};
  const hidden = {id:'b', name:'Hidden', group:'A', track:track(31)};
  const otherGroup = {id:'c', name:'Other', group:'B', track:track(32)};
  const {context, controller} = createHarness([first, hidden, otherGroup]);
  context.state.dispatch({type:'active-trail.set', trailId:'b', active:false});
  const hit = controller.nearestPoint(first.track[20][0], first.track[20][1]);
  assert.strictEqual(hit.trailId, 'a');
  assert.strictEqual(hit.trackIdx, 20);
  assert.strictEqual(controller.nearestPoint(0, 0), null);
  context.state.dispatch({type:'group.set-active', group:null});
  assert.strictEqual(controller.nearestPoint(first.track[20][0], first.track[20][1]), null);
});

T('owns lifecycle, selection, preview, commit, and stale-primary rejection', () => {
  const first = {id:'a', name:'Main', group:'A', track:track()};
  const second = {id:'b', name:'Second', group:'A', track:track(31)};
  const {context, controller, effects} = createHarness([first, second]);
  const state = controller.state;
  assert.strictEqual(controller.enter('a'), true);
  assert.strictEqual(controller.state, state);
  controller.selectA(anchor(first, 10));
  controller.selectB(anchor(first, 300));
  const result = controller.compute();
  assert.strictEqual(result.ok, true);
  assert.ok(state._pending);
  const committed = controller.commit(' Ridge exit ');
  assert.strictEqual(committed.name, 'Ridge exit');
  assert.strictEqual(first.escape_routes.length, 1);
  assert.strictEqual(effects.revisions, 1);

  controller.selectA(anchor(first, 20));
  controller.selectB(anchor(first, 200));
  controller.compute();
  context.state.dispatch({type:'primary-trail.set', trailId:'b'});
  assert.strictEqual(controller.commit('stale'), null);
  assert.strictEqual(effects.revisions, 1);
  controller.exit();
  assert.deepStrictEqual(
    {active:state.active, trailId:state.trailId, ptA:state.ptA, ptB:state.ptB, pending:state._pending},
    {active:false, trailId:null, ptA:null, ptB:null, pending:null},
  );
});

T('selects display routes and deletes only manual routes', () => {
  const manual = {id:'manual', name:'Manual', desc:'', distance_km:1, drop_m:0, line:[], _manual:true};
  const generated = {id:'generated', name:'Generated', desc:'', distance_km:1, drop_m:0, line:[]};
  const trail = {id:'a', name:'Main', track:track(), escape_routes:[manual, generated]};
  const {context, controller, effects} = createHarness([trail]);
  assert.strictEqual(controller.selectDisplayedRoute('a', 'manual'), manual);
  assert.strictEqual(context.state.snapshot().activeEscape, 'manual');
  assert.strictEqual(controller.deleteRoute('a', 'generated'), false);
  assert.strictEqual(controller.deleteRoute('a', 'manual'), true);
  assert.deepStrictEqual(trail.escape_routes, [generated]);
  assert.strictEqual(context.state.snapshot().activeEscape, null);
  assert.strictEqual(effects.revisions, 1);
  controller.clearDisplayedRoute();
  assert.strictEqual(controller.selectDisplayedRoute('a', 'missing'), null);
});

T('classic escape owner retains effects but delegates business state and writes', () => {
  const source = read('src/features/escape/runtime.ts');
  const directBusinessWrite = /addEscapeState\.(?:active|trailId|ptA|ptB|_pending)\s*(?:=|\+\+)/;
  assert.match(source, /createEscapeController\(runtimeContext/);
  assert.match(source, /const addEscapeState = escapeController\.state/);
  for(const method of [
    'enter', 'exit', 'reset', 'nearestPoint', 'selectA', 'selectB', 'compute', 'commit',
    'deleteRoute', 'selectDisplayedRoute', 'clearDisplayedRoute',
  ]) assert.match(source, new RegExp(`escapeController\\.${method}`), method);
  assert.doesNotMatch(source, directBusinessWrite);
  assert.doesNotMatch(source, /escape_routes\s*=/);
  assert.doesNotMatch(source, /function nearestPointOnAnyTrail\(/);
  assert.doesNotMatch(source, /function snapToTrail\(/);
  assert.match(source, /addEscapeState\.layer\s*=/);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
