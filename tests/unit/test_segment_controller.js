/** Typed itinerary-segment controller contracts. */
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
  [30.000, 100, 1000, 0, 0],
  [30.001, 100, 1100, 1, 100],
  [30.002, 100, 1050, 2, 100],
  [30.003, 100, 1200, 3, 250],
  [30.004, 100, 1150, 4, 250],
];
const point = (trail, index) => {
  const item = trail.track[index];
  return {idx:index, lat:item[0], lng:item[1], elev:item[2], km:item[3]};
};

function createHarness(trails) {
  const context = app.createRuntimeContext({
    project:{title:'Segments', trails},
    state:app.createAppStateStore({trails}),
    commands:new app.CommandRegistry(),
    interactions:app.createStudioInteractionManager(),
    renderer:new app.RenderScheduler({raf:() => 1, caf:() => {}}),
    dialogs:{confirm:async () => true},
  });
  const effects = {revisions:0};
  const controller = app.createSegmentController(context, {
    markRevision:() => { effects.revisions++; },
  });
  return {context, controller, effects};
}

console.log('\n▸ Typed segment controller');

T('restores remembered boundaries and camp edits on enter', () => {
  const trail = {
    id:'a', track:track(),
    day_meta:[
      {d:1, i_start:0, i_end:2, camp:'Lake', camp_elev:1050},
      {d:2, i_start:2, i_end:4, camp:'-'},
    ],
  };
  const {controller} = createHarness([trail]);
  const state = controller.state;
  assert.strictEqual(controller.enter('missing'), false);
  assert.strictEqual(controller.enter('a'), true);
  assert.strictEqual(controller.state, state);
  assert.deepStrictEqual(state.points.map(item => item.idx), [0, 2, 4]);
  assert.deepStrictEqual(state.campEdits, {1:{name:'Lake', elev:1050}});
  controller.exit();
  assert.strictEqual(state.active, false);
  assert.strictEqual(state.trailId, null);
});

T('inserts, moves, and deletes boundaries with camp renumbering', () => {
  const trail = {id:'a', track:track()};
  const {controller} = createHarness([trail]);
  controller.enter('a');
  controller.updateCamp(1, {name:'Original'});
  assert.deepStrictEqual(controller.insertPoint(point(trail, 2)), {ok:true});
  assert.deepStrictEqual(controller.state.points.map(item => item.idx), [0, 2, 4]);
  assert.strictEqual(controller.state.campEdits[2].name, 'Original');
  assert.deepStrictEqual(controller.insertPoint(point(trail, 2)), {ok:false, reason:'duplicate'});

  const moved = controller.moveBoundary(1, point(trail, 3));
  assert.strictEqual(moved.ok, true);
  assert.deepStrictEqual(controller.state.points.map(item => item.idx), [0, 3, 4]);
  const invalid = controller.moveBoundary(1, point(trail, 4));
  assert.strictEqual(invalid.ok, false);
  assert.strictEqual(invalid.reason, 'duplicate');

  assert.deepStrictEqual(controller.deleteDay(1), {ok:true});
  assert.deepStrictEqual(controller.state.points.map(item => item.idx), [0, 4]);
  assert.strictEqual(controller.state.campEdits[1].name, 'Original');
  assert.deepStrictEqual(controller.deleteDay(1), {ok:false, reason:'min-days'});
});

T('owns drag and fast-tap suppression while clear restores one day', () => {
  const trail = {id:'a', track:track()};
  const {controller} = createHarness([trail]);
  controller.enter('a');
  controller.insertPoint(point(trail, 2));
  controller.beginDrag();
  controller.suppressFastTap(900);
  assert.strictEqual(controller.state._justDragged, true);
  assert.strictEqual(controller.state._fastTapUntil, 900);
  controller.endDrag();
  assert.strictEqual(controller.clear(), true);
  assert.deepStrictEqual(controller.state.points.map(item => item.idx), [0, 4]);
  assert.deepStrictEqual(controller.state.campEdits, {});
});

T('commits day ids, metadata, waypoint days, and one revision', () => {
  const trail = {
    id:'a', track:track(),
    waypoints:[
      {gps_idx:1, lat:30.001, lng:100},
      {lat:30.0031, lng:100},
    ],
  };
  const {controller, effects} = createHarness([trail]);
  controller.enter('a');
  controller.insertPoint(point(trail, 2));
  controller.updateCamp(1, {name:' Ridge ', elev:1060.4});
  const result = controller.apply();
  assert.strictEqual(result.trail, trail);
  assert.strictEqual(result.dayCount, 2);
  assert.deepStrictEqual(trail.track.map(item => item[5]), [1, 1, 2, 2, 2]);
  assert.deepStrictEqual(trail.day_meta.map(meta => [meta.d, meta.i_start, meta.i_end]), [
    [1, 0, 2], [2, 2, 4],
  ]);
  assert.strictEqual(trail.day_meta[0].camp, 'Ridge');
  assert.strictEqual(trail.day_meta[0].camp_elev, 1060);
  assert.deepStrictEqual(trail.waypoints.map(item => item.day), [1, 2]);
  assert.strictEqual(effects.revisions, 1);
});

T('rejects commit after the primary trail changes', () => {
  const first = {id:'a', group:'A', track:track()};
  const second = {id:'b', group:'A', track:track()};
  const {context, controller, effects} = createHarness([first, second]);
  controller.enter('a');
  context.state.dispatch({type:'primary-trail.set', trailId:'b'});
  assert.strictEqual(controller.apply(), null);
  assert.strictEqual(effects.revisions, 0);
});

T('direct runtime delegates segment state and project writes to the controller', () => {
  const segment = read('src/app/runtime/studio.ts');
  const map = segment;
  const directBusinessWrite = /segmentState\.(?:active|trailId|points|campEdits|_justDragged|_fastTapUntil)\s*(?:=|\+\+)/;
  assert.match(segment, /createSegmentController\(runtimeContext/);
  assert.match(segment, /const segmentState = segmentController\.state/);
  assert.match(segment, /segmentController\.enter/);
  assert.match(segment, /segmentController\.insertPoint/);
  assert.match(segment, /segmentController\.deleteDay/);
  assert.match(segment, /segmentController\.moveBoundary/);
  assert.match(segment, /segmentController\.apply/);
  assert.match(map, /segmentController\.suppressFastTap/);
  assert.doesNotMatch(segment, directBusinessWrite);
  assert.doesNotMatch(map, directBusinessWrite);
  assert.doesNotMatch(segment, /\.day_meta\s*=/);
  assert.doesNotMatch(segment, /\.days\s*=/);
  assert.doesNotMatch(segment, /track\[[^\]]+\]\[5\]\s*=/);
  assert.match(segment, /segmentState\.layer\s*=/);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
