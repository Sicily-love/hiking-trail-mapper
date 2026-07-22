const assert = require('assert');
const {createAppStateStore} = require('../../src/app/state-store.ts');
const {createAppStateActions} = require('../../src/app/actions.ts');

let passed = 0;
const test = (name, fn) => { fn(); passed += 1; console.log(`  PASS ${name}`); };

console.log('\nApplication state actions');

test('semantic actions are the only feature write surface', () => {
  const store = createAppStateStore({trails:[{id:'a', group:'A'}, {id:'b', group:'A'}]});
  const actions = createAppStateActions(store);
  actions.setTrailActive('a', false);
  actions.setPrimaryTrail('b');
  actions.setMode('waypoint');
  actions.setDisplay('showLabel', false);
  actions.replaceBatch(['b']);
  const state = store.snapshot();
  assert.strictEqual(state.activeTrails.has('a'), false);
  assert.strictEqual(state.primaryTrailId, 'b');
  assert.strictEqual(state.mode, 'waypoint');
  assert.strictEqual(state.showLabel, false);
  assert.deepStrictEqual([...state.batchSelected], ['b']);
  assert.strictEqual('dispatch' in actions, false);
  assert.strictEqual(Object.isFrozen(actions), true);
});

test('workspace restore and clear remain atomic commands', () => {
  const store = createAppStateStore({trails:[{id:'a', group:'A'}]});
  const commands = [];
  store.subscribe(event => commands.push(event.command.type));
  const actions = createAppStateActions(store);
  actions.restoreWorkspace({activeTrails:['b'], activeGroup:'B', primaryByGroup:{B:'b'}});
  actions.clearWorkspace();
  assert.deepStrictEqual(commands, ['workspace.restore', 'workspace.clear']);
  assert.strictEqual(store.snapshot().activeTrails.size, 0);
  assert.deepStrictEqual(store.snapshot().primaryByGroup, {});
});

console.log(`\nResult: ${passed}/${passed} passed`);
