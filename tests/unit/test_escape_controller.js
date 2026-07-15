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
  assert.strictEqual(forward.preview.route.direction, 'forward');
  assert.ok(forward.preview.ascentM > 0);
  assert.strictEqual(forward.preview.descentM, 0);

  const reverse = core.buildManualEscapeRoute(trail, anchor(trail, 400), anchor(trail, 0), 'reverse', 40);
  assert.strictEqual(reverse.ok, true);
  assert.deepStrictEqual(reverse.preview.route.line[0], [trail.track[400][0], trail.track[400][1]]);
  assert.deepStrictEqual(reverse.preview.route.line.at(-1), [trail.track[0][0], trail.track[0][1]]);
  assert.strictEqual(reverse.preview.route.drop_m, 800);
  assert.strictEqual(reverse.preview.route.direction, 'reverse');
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

T('resolves the itinerary day from point metadata with day_meta fallback', () => {
  const explicit = {id:'a', name:'Main', track:track()};
  explicit.track.forEach((item, index) => { item[5] = index < 200 ? 1 : 2; });
  assert.strictEqual(core.resolveEscapeRouteDay(explicit, anchor(explicit, 260)), 2);

  const fallback = {
    id:'b', name:'Fallback', track:track(),
    day_meta:[
      {d:1, i_start:0, i_end:150},
      {d:2, i_start:151, i_end:400},
    ],
  };
  assert.strictEqual(core.resolveEscapeRouteDay(fallback, anchor(fallback, 260)), 2);
  assert.deepStrictEqual(core.escapeItineraryDays(fallback), [1, 2]);
  assert.deepStrictEqual(core.escapeItineraryDays({id:'plain', name:'Plain', track:track()}), [1]);
  assert.strictEqual(core.resolveEscapeRouteDirection({desc:'原路返回（反向）'}), 'reverse');
  assert.strictEqual(core.resolveEscapeRouteDirection({direction:'forward', desc:'反向'}), 'forward');
  assert.strictEqual(core.resolveEscapeRouteDay({id:'empty', name:'Empty', track:[]}, {lat:0, lng:0}), null);
});

T('snaps only to the selected reference trail in the active group and enforces the radius', () => {
  const first = {id:'a', name:'A', group:'A', track:track(30)};
  const hidden = {id:'b', name:'Hidden', group:'A', track:track(31)};
  const otherGroup = {id:'c', name:'Other', group:'B', track:track(32)};
  const {context, controller} = createHarness([first, hidden, otherGroup]);
  assert.strictEqual(controller.enter('a'), true);
  context.state.dispatch({type:'active-trail.set', trailId:'b', active:false});
  const hit = controller.nearestPoint(first.track[20][0], first.track[20][1]);
  assert.strictEqual(hit.trailId, 'a');
  assert.strictEqual(hit.trackIdx, 20);
  assert.strictEqual(controller.setReferenceTrail('b'), true);
  const hiddenHit = controller.nearestPoint(hidden.track[30][0], hidden.track[30][1]);
  assert.strictEqual(hiddenHit.trailId, 'b');
  assert.strictEqual(hiddenHit.trackIdx, 30);
  assert.strictEqual(controller.setReferenceTrail('c'), false);
  assert.strictEqual(controller.nearestPoint(0, 0), null);
  context.state.dispatch({type:'group.set-active', group:null});
  assert.strictEqual(controller.nearestPoint(first.track[20][0], first.track[20][1]), null);
});

T('owns lifecycle, selection, preview, commit, and stale-primary rejection', () => {
  const first = {id:'a', name:'Main', group:'A', track:track()};
  first.track.forEach((item, index) => { item[5] = index < 200 ? 1 : 2; });
  const second = {id:'b', name:'Second', group:'A', track:track(30.002)};
  const {context, controller, effects} = createHarness([first, second]);
  const state = controller.state;
  assert.strictEqual(controller.enter('a'), true);
  assert.strictEqual(controller.state, state);
  assert.strictEqual(state.referenceTrailId, 'a');
  assert.strictEqual(controller.setReferenceTrail('b'), true);
  controller.selectA(anchor(second, 10));
  controller.selectB(anchor(second, 300));
  const result = controller.compute();
  assert.strictEqual(result.ok, true);
  assert.ok(state._pending);
  assert.deepStrictEqual(controller.availableDays(), [1, 2]);
  assert.strictEqual(controller.setDay(3), false);
  assert.strictEqual(controller.setDay(2), true);
  const committed = controller.commit(' Ridge exit ');
  assert.strictEqual(committed.name, 'Ridge exit');
  assert.strictEqual(first.escape_routes.length, 1);
  assert.strictEqual(committed._anchor.trailId, 'b');
  assert.strictEqual(committed.day, 2);
  assert.strictEqual(effects.revisions, 1);

  controller.selectA(anchor(second, 20));
  controller.selectB(anchor(second, 200));
  controller.compute();
  context.state.dispatch({type:'primary-trail.set', trailId:'b'});
  assert.strictEqual(controller.commit('stale'), null);
  assert.strictEqual(effects.revisions, 1);
  controller.exit();
  assert.deepStrictEqual(
    {active:state.active, trailId:state.trailId, referenceTrailId:state.referenceTrailId, ptA:state.ptA, ptB:state.ptB, pending:state._pending},
    {active:false, trailId:null, referenceTrailId:null, ptA:null, ptB:null, pending:null},
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

T('direct runtime retains escape effects but delegates business state and writes', () => {
  const source = read('src/app/runtime/studio.ts');
  const directBusinessWrite = /addEscapeState\.(?:active|trailId|referenceTrailId|ptA|ptB|_pending)\s*(?:=|\+\+)/;
  assert.match(source, /createEscapeController\(runtimeContext/);
  assert.match(source, /const addEscapeState = escapeController\.state/);
  for(const method of [
    'enter', 'setReferenceTrail', 'exit', 'reset', 'nearestPoint', 'selectA', 'selectB', 'compute',
    'availableDays', 'setDay', 'commit',
    'deleteRoute', 'selectDisplayedRoute', 'clearDisplayedRoute',
  ]) assert.match(source, new RegExp(`escapeController\\.${method}`), method);
  assert.doesNotMatch(source, directBusinessWrite);
  assert.doesNotMatch(source, /function nearestPointOnAnyTrail\(/);
  assert.doesNotMatch(source, /function snapToTrail\(/);
  assert.match(source, /addEscapeState\.layer\s*=/);
  assert.match(source, /escapeReferenceTrailId:addEscapeState\.active/);
  assert.match(source, /document\.getElementById\('ae-day'\)/);
  assert.match(source, /addescape-day-select/);
  assert.match(source, /resolveEscapeRouteDirection/);
  assert.match(source, /escape-filter-bar/);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
