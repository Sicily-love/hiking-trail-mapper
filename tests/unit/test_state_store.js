/** Typed application state ownership contracts. */
const assert = require('assert');
const { createAppStateStore } = require('../../src/app/state-store.ts');
const { runtimeSource } = require('./runtime_source.js');

let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
};

console.log('\n▸ Typed application state store');
T('dispatches typed writes and emits ordered revision events', () => {
  const store = createAppStateStore({trails:[{id:'a', group:'A'}, {id:'b', group:'A'}]});
  const events = [];
  const unsubscribe = store.subscribe(event => events.push(event));
  store.dispatch({type:'active-trail.set', trailId:'a', active:false});
  store.dispatch({type:'primary-trail.set', trailId:'b'});
  unsubscribe();
  store.dispatch({type:'escape.set-active', escapeId:'escape-1'});
  const state = store.snapshot();
  assert.strictEqual(state.activeTrails.has('a'), false);
  assert.strictEqual(state.primaryTrailId, 'b');
  assert.strictEqual(state.activeEscape, 'escape-1');
  assert.deepStrictEqual(events.map(event => event.revision), [1, 2]);
  assert.deepStrictEqual(events.map(event => event.command.type), ['active-trail.set', 'primary-trail.set']);
});
T('renames and removes trail references atomically', () => {
  const store = createAppStateStore({trails:[{id:'a', group:'A'}]});
  store.dispatch({type:'batch.replace', trailIds:['a']});
  store.dispatch({type:'expanded.toggle', trailId:'a'});
  store.dispatch({type:'trail-id.rename', oldId:'a', newId:'renamed'});
  let state = store.snapshot();
  assert.strictEqual(state.activeTrails.has('renamed'), true);
  assert.strictEqual(state.primaryByGroup.A, 'renamed');
  store.dispatch({type:'trail.remove', trailId:'renamed'});
  state = store.snapshot();
  assert.strictEqual(state.activeTrails.has('renamed'), false);
  assert.strictEqual(state.batchSelected.has('renamed'), false);
  assert.strictEqual(state.expandedTrails.has('renamed'), false);
  assert.strictEqual(state.primaryByGroup.A, undefined);
});
T('restores workspace ownership without replacing stable Set views', () => {
  const store = createAppStateStore({trails:[{id:'a', group:'A'}]});
  const activeView = store.snapshot().activeTrails;
  store.dispatch({type:'workspace.restore', activeTrails:['b'], activeGroup:'B', primaryByGroup:{B:'b'}});
  const state = store.snapshot();
  assert.strictEqual(state.activeTrails, activeView);
  assert.deepStrictEqual([...state.activeTrails], ['b']);
  assert.strictEqual(state.activeGroup, 'B');
  assert.strictEqual(state.primaryTrailId, 'b');
});
T('restores complete workspace preferences and clears transient selections', () => {
  const store = createAppStateStore({trails:[{id:'a', group:'A'}]});
  store.dispatch({type:'batch.replace', trailIds:['a']});
  store.dispatch({type:'expanded.toggle', trailId:'a'});
  store.dispatch({type:'escape.set-active', escapeId:'escape-1'});
  store.dispatch({
    type:'workspace.restore',
    activeTrails:[],
    activeGroup:'B',
    primaryByGroup:{B:'b'},
    mode:'waypoint',
    modeVisibleTags:{day:['camp'], elev:['pass'], waypoint:['water']},
    waypointModeTags:['water'],
    display:{showTrack:false, showLabel:false, showHighPoint:true},
    baseLayer:'sat',
    autoGenerateEscape:true,
  });
  const state = store.snapshot();
  assert.deepStrictEqual([...state.activeTrails], []);
  assert.deepStrictEqual([...state.modeVisibleTags.day], ['camp']);
  assert.deepStrictEqual([...state.modeVisibleTags.elev], ['pass']);
  assert.deepStrictEqual([...state.modeVisibleTags.waypoint], ['water']);
  assert.deepStrictEqual([...state.waypointModeTags], ['water']);
  assert.strictEqual(state.mode, 'waypoint');
  assert.strictEqual(state.showTrack, false);
  assert.strictEqual(state.showLabel, false);
  assert.strictEqual(state.showHighPoint, true);
  assert.strictEqual(state.autoGenerateEscape, true);
  assert.strictEqual(state.batchSelected.size, 0);
  assert.strictEqual(state.expandedTrails.size, 0);
  assert.strictEqual(state.activeEscape, null);
});
T('direct runtime cannot bypass the typed application-state boundary', () => {
  const source = runtimeSource
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(source, /\bstate\.[A-Za-z_$][\w$]*\s*=(?!=)/);
  assert.doesNotMatch(source, /\bstate\.[A-Za-z_$][\w$]*\.(?:add|delete|clear)\s*\(/);
  assert.doesNotMatch(source, /\bstate\.primaryByGroup\[[^\]]+\]\s*=(?!=)/);
  assert.doesNotMatch(source, /\bdelete\s+state\.primaryByGroup/);
  assert.match(source, /createAppStateStore\(initialProject\)/);
  assert.match(source, /createAppStateActions\(appStateStore\)/);
  assert.match(source, /createAppStateSelectors\(\(\) => appStateStore\.snapshot\(\)\)/);
  assert.doesNotMatch(source, /function dispatchState\(/);
  for(const owner of ['src/ui/sidebar/runtime-owner.ts', 'src/ui/import/runtime-owner.ts']) {
    const ownerSource = require('./runtime_source.js').read(owner)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(ownerSource, /\bstate\./, owner);
    assert.doesNotMatch(ownerSource, /\bdispatchState\b/, owner);
  }
});
T('removed classic mirror fields stay absent', () => {
  for(const name of [
    '__HTM_CORE_RUNTIME__', '__HTM_APP_RUNTIME__', '__HTM_INTERACTION_MANAGER__',
    '__wpCardMapBound', '__wpAddBound', '_sandboxWarned', '_toastTimer',
  ]) assert.strictEqual(runtimeSource.includes(name), false, name);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
