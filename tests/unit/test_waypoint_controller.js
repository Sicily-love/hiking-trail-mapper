/** Typed manual-waypoint controller contracts. */
const assert = require('assert');
const app = require('../../src/app/index.ts');
const { read } = require('./runtime_source.js');
const {createTestRuntimeContext} = require('./runtime_context_harness.js');

let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
};

function createHarness(trails) {
  const state = app.createAppStateStore({trails});
  const context = createTestRuntimeContext(app, {title:'Waypoints', trails}, state);
  const effects = {revision:0, waypoints:0, filters:0, days:0, persist:0, messages:[]};
  const controller = app.createWaypointController(context, {
    iconForTag:tag => `icon:${tag}`,
    markRevision:() => { effects.revision++; },
    renderWaypoints:() => { effects.waypoints++; },
    renderFilters:() => { effects.filters++; },
    renderDays:() => { effects.days++; },
    persist:() => { effects.persist++; },
    notify:message => effects.messages.push(message),
  });
  return {context, controller, effects};
}

console.log('\n▸ Typed waypoint controller');

T('owns enter and exit state without a classic mirror', () => {
  const trail = {id:'a', track:[[30, 100, 1000]], waypoints:[]};
  const {controller} = createHarness([trail]);
  assert.strictEqual(controller.enter('missing'), false);
  assert.strictEqual(controller.enter('a'), true);
  assert.deepStrictEqual(controller.state, {active:true, trailId:'a'});
  controller.exit();
  assert.deepStrictEqual(controller.state, {active:false, trailId:null});
});

T('allocates the next numeric waypoint id while ignoring non-numeric ids', () => {
  const trail = {
    id:'a', track:[[30, 100, 1000]],
    waypoints:[{id:2}, {id:'7'}, {id:'manual'}],
  };
  const {controller} = createHarness([trail]);
  assert.strictEqual(controller.nextId(trail), 8);
});

T('adds one manual waypoint and commits all dependent views once', () => {
  const point = [30, 100, 1234, 5.67, 200, 2];
  const trail = {id:'a', track:[point], waypoints:[]};
  const {controller, effects} = createHarness([trail]);
  const waypoint = controller.addManualWaypoint({trailId:'a', trackIndex:0, point}, {
    name:' Camp ', tag:'camp', description:'Sheltered site', photo:'data:image/png;base64,test',
  });
  assert.deepStrictEqual(waypoint, {
    id:1, name:'Camp [手动]', label:'Camp [手动]', icon:'icon:camp', tag:'camp',
    km:5.7, elev:1234, lat:30, lng:100, gps_idx:0, day:2,
    time:'', photo:'data:image/png;base64,test', description:'Sheltered site', manuallyAdded:true,
  });
  assert.strictEqual(trail.waypoints[0], waypoint);
  assert.deepStrictEqual(effects, {
    revision:1, waypoints:1, filters:1, days:1, persist:1,
    messages:['✓ "Camp" 已添加'],
  });
});

T('rejects stale anchors, blank names, and non-primary trails', () => {
  const pointA = [30, 100, 1000];
  const pointB = [31, 101, 1100];
  const a = {id:'a', group:'A', track:[pointA], waypoints:[]};
  const b = {id:'b', group:'A', track:[pointB], waypoints:[]};
  const {controller, effects} = createHarness([a, b]);
  assert.strictEqual(controller.addManualWaypoint({trailId:'a', trackIndex:0, point:pointA}, {name:' ', tag:'other'}), null);
  assert.strictEqual(controller.addManualWaypoint({trailId:'a', trackIndex:0, point:[...pointA]}, {name:'Stale', tag:'other'}), null);
  assert.strictEqual(controller.addManualWaypoint({trailId:'b', trackIndex:0, point:pointB}, {name:'Other', tag:'other'}), null);
  assert.strictEqual(effects.revision, 0);
});

T('direct runtime delegates waypoint state and mutation to the controller', () => {
  const source = read('src/app/runtime/studio.ts');
  const interaction = source.slice(source.indexOf('const waypointController'));
  assert.match(interaction, /createWaypointController\(runtimeContext/);
  assert.match(interaction, /const addWaypointState = waypointController\.state/);
  assert.match(interaction, /waypointController\.addManualWaypoint/);
  assert.match(interaction, /studioDialogs\.openCustom/);
  assert.match(interaction, /waypointController\.enter/);
  assert.match(interaction, /waypointController\.exit/);
  assert.doesNotMatch(interaction, /main\.waypoints\.push\(/);
  assert.doesNotMatch(interaction, /addWaypointState\.(?:active|trailId)\s*=/);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
