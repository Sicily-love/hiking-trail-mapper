/** RuntimeContext and typed trail-controller contracts. */
const assert = require('assert');
const app = require('../../src/app/index.ts');
const core = require('../../src/core/index.ts');
const { read } = require('./runtime_source.js');

let passed = 0;
let failed = 0;
const T = async (name, fn) => {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
};

function createHarness(trails) {
  const state = app.createAppStateStore({trails});
  const project = {title:'Test', trails, calc_method:{}};
  const effects = {persist:0, render:[], clear:0, revision:0, messages:[]};
  const context = app.createRuntimeContext({
    project,
    state,
    commands:new app.CommandRegistry(),
    interactions:app.createStudioInteractionManager(),
    renderer:new app.RenderScheduler({raf:callback => { callback(0); return 1; }, caf:() => {}}),
    dialogs:{confirm:async () => true},
  });
  const controller = app.createTrailController(context, {
    haversine:core.haversine,
    accumulatorAscent:core.accumulatorAscent,
    accumulatorDescent:core.accumulatorDescent,
    markRevision:() => { effects.revision++; },
    persist:() => { effects.persist++; },
    render:options => { effects.render.push(options); },
    clearStorage:async () => { effects.clear++; },
    notify:message => { effects.messages.push(message); },
  });
  return {context, controller, effects, project, state};
}

(async () => {
  console.log('\n▸ RuntimeContext and trail controller');

  await T('RuntimeContext is frozen and validates service ownership', () => {
    const harness = createHarness([]);
    assert.strictEqual(Object.isFrozen(harness.context), true);
    assert.strictEqual(harness.context.project, harness.project);
    assert.throws(() => app.createRuntimeContext({project:{trails:[]}}), /AppStateStore/);
  });

  await T('reverses geometry, day ids, statistics, and waypoint attachment once', () => {
    const trail = {
      id:'a', name:'Alpha', days:2,
      track:[
        [30, 100, 1000, 0, 0, 1],
        [30.01, 100.01, 1100, 1, 100, 1],
        [30.02, 100.02, 900, 2, 100, 2],
      ],
      stats:{distance_km:2, ascent_m:100, descent_m:200},
      waypoints:[{lat:30, lng:100, km:0, elev:1000, gps_idx:0}],
    };
    const {controller, effects} = createHarness([trail]);
    assert.strictEqual(controller.reverseTrail('a'), true);
    assert.deepStrictEqual(trail.track.map(point => point.slice(0, 3)), [
      [30.02, 100.02, 900], [30.01, 100.01, 1100], [30, 100, 1000],
    ]);
    assert.deepStrictEqual(trail.track.map(point => point[5]), [1, 2, 2]);
    assert.strictEqual(trail.track[0][3], 0);
    assert.ok(trail.track[2][3] > 0);
    assert.strictEqual(trail.waypoints[0].gps_idx, 2);
    assert.strictEqual(trail.waypoints[0].elev, 1000);
    assert.strictEqual(effects.revision, 1);
    assert.strictEqual(effects.persist, 1);
    assert.deepStrictEqual(effects.render, [{fit:false}]);
    assert.strictEqual(effects.messages.length, 1);
  });

  await T('deletes trail and all application references through AppStateStore', () => {
    const a = {id:'a', name:'A', track:[[1, 1, 1]], stats:{distance_km:0, ascent_m:0, descent_m:0}};
    const b = {id:'b', name:'B', track:[[2, 2, 2]], stats:{distance_km:0, ascent_m:0, descent_m:0}};
    const {controller, project, state, effects} = createHarness([a, b]);
    state.dispatch({type:'batch.replace', trailIds:['a']});
    assert.strictEqual(controller.deleteTrail('a'), true);
    assert.deepStrictEqual(project.trails.map(trail => trail.id), ['b']);
    assert.strictEqual(state.snapshot().activeTrails.has('a'), false);
    assert.strictEqual(state.snapshot().batchSelected.has('a'), false);
    assert.strictEqual(controller.deleteTrail('missing'), false);
    assert.strictEqual(effects.persist, 1);
    assert.strictEqual(effects.render.length, 1);
  });

  await T('clears project data, state, and storage in one controller operation', async () => {
    const trail = {id:'a', name:'A', track:[[1, 1, 1]], stats:{distance_km:0, ascent_m:0, descent_m:0}};
    const {controller, project, state, effects} = createHarness([trail]);
    assert.strictEqual(await controller.clearTrails(), true);
    assert.deepStrictEqual(project.trails, []);
    assert.deepStrictEqual([...state.snapshot().activeTrails], []);
    assert.strictEqual(effects.clear, 1);
    assert.strictEqual(effects.render.length, 1);
    assert.strictEqual(await controller.clearTrails(), false);
  });

  await T('classic trail owner remains a thin adapter without duplicate mutation logic', () => {
    const source = read('src/features/trails/runtime.ts');
    assert.match(source, /createTrailController\(runtimeContext/);
    assert.match(source, /trailController\.deleteTrail/);
    assert.match(source, /trailController\.reverseTrail/);
    assert.match(source, /trailController\.clearTrails/);
    assert.doesNotMatch(source, /\.track\.reverse\(/);
    assert.ok(source.split('\n').length < 50);
  });

  console.log('\n══════════════════════════════════════════════════');
  console.log(`结果: ${passed}/${passed + failed} passed`);
  process.exit(failed === 0 ? 0 : 1);
})();
