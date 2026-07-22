const assert = require('assert');
const {createAppStateStore} = require('../../src/app/state-store.ts');
const {createAppStateSelectors} = require('../../src/app/selectors.ts');

let passed = 0;
const test = (name, fn) => { fn(); passed += 1; console.log(`  PASS ${name}`); };

console.log('\nApplication state selectors');

test('derive active and primary trails without exposing a write path', () => {
  const trails = [
    {id:'a', group:'A'},
    {id:'b', group:'A'},
    {id:'c', group:'B'},
  ];
  const store = createAppStateStore({trails});
  const selectors = createAppStateSelectors(() => store.snapshot());
  assert.strictEqual(selectors.primaryTrail(trails), trails[0]);
  assert.deepStrictEqual(selectors.trailsInActiveGroup(trails), trails.slice(0, 2));
  assert.deepStrictEqual(selectors.activeTrails(trails), trails.slice(0, 2));
  assert.deepStrictEqual([...selectors.activeTrailIds()], ['a', 'b', 'c']);
  assert.strictEqual(selectors.isPrimaryTrail(trails[0]), true);
  assert.strictEqual(selectors.isTrailActive(trails[2]), false);
  assert.strictEqual('dispatch' in selectors, false);
});

test('selectors remain live after typed state commands', () => {
  const trails = [{id:'a', group:'A'}, {id:'b', group:'A'}];
  const store = createAppStateStore({trails});
  const selectors = createAppStateSelectors(() => store.snapshot());
  store.dispatch({type:'primary-trail.set', trailId:'b'});
  store.dispatch({type:'active-trail.set', trailId:'a', active:false});
  store.dispatch({type:'mode.set', mode:'waypoint'});
  assert.strictEqual(selectors.primaryTrailId(), 'b');
  assert.strictEqual(selectors.primaryTrail(trails), trails[1]);
  assert.deepStrictEqual(selectors.activeTrails(trails), [trails[1]]);
  assert.strictEqual(selectors.mode(), 'waypoint');
  assert.strictEqual(selectors.baseLayer(), 'sat');
});

test('null active group yields no derived trail ownership', () => {
  const trails = [{id:'a', group:'A'}];
  const store = createAppStateStore({trails});
  const selectors = createAppStateSelectors(() => store.snapshot());
  store.dispatch({type:'group.set-active', group:null});
  assert.strictEqual(selectors.activeGroup(), null);
  assert.strictEqual(selectors.primaryTrail(trails), null);
  assert.deepStrictEqual(selectors.activeTrails(trails), []);
});

console.log(`\nResult: ${passed}/${passed} passed`);
