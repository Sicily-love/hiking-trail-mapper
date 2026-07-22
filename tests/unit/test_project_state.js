const assert = require('assert');
const app = require('../../src/app/index.ts');
const {read, runtimeSource} = require('./runtime_source.js');

let passed = 0;
const test = (name, fn) => { fn(); passed += 1; console.log(`  PASS ${name}`); };

console.log('\nProject state boundary');

test('actions preserve the project and trail-array identities while emitting typed changes', () => {
  const trail = {id:'a', name:'A'};
  const project = {title:'Routes', trails:[trail], calc_method:{}};
  const store = app.createProjectStore(project);
  const actions = app.createProjectActions(store);
  const selectors = app.createProjectSelectors(() => store.snapshot());
  const events = [];
  store.subscribe(event => events.push(event));
  const originalTrails = project.trails;

  actions.mutateTrail('a', 'trail.rename', candidate => { candidate.name = 'Renamed'; });
  actions.addTrail({id:'b', name:'B'});
  actions.replaceProject({title:'Restored', trails:[{id:'c', name:'C'}], calc_method:{x:1}}, 'archive.restore');

  assert.strictEqual(selectors.snapshot(), project);
  assert.strictEqual(selectors.trails(), originalTrails);
  assert.strictEqual(selectors.title(), 'Restored');
  assert.deepStrictEqual(selectors.trails().map(item => item.id), ['c']);
  assert.deepStrictEqual(events.map(event => event.type), [
    'trail.changed', 'trail.added', 'project.replaced',
  ]);
  assert.deepStrictEqual(events.map(event => event.revision), [1, 2, 3]);
});

test('structural actions report missing trails without emitting false revisions', () => {
  const store = app.createProjectStore({title:'Routes', trails:[]});
  const actions = app.createProjectActions(store);
  const events = [];
  store.subscribe(event => events.push(event));
  assert.strictEqual(actions.removeTrail('missing'), false);
  assert.strictEqual(actions.mutateTrail('missing', 'trail.reverse', () => {}), null);
  assert.deepStrictEqual(events, []);
});

test('RuntimeContext and feature modules expose selectors and actions, not raw stores', () => {
  const context = read('src/app/runtime/context.ts');
  assert.match(context, /projectActions: ProjectActions/);
  assert.match(context, /projectSelectors: ProjectSelectors/);
  assert.match(context, /stateActions: AppStateActions/);
  assert.match(context, /stateSelectors: AppStateSelectors/);
  assert.doesNotMatch(context, /readonly project:/);
  assert.doesNotMatch(context, /readonly state:/);

  const featureFiles = [
    'src/features/files/import-controller.ts',
    'src/features/files/export-controller.ts',
    'src/features/project/archive-controller.ts',
    'src/features/history/controller.ts',
    'src/features/storage/controller.ts',
    'src/features/trails/controller.ts',
    'src/features/waypoint/controller.ts',
    'src/features/segment/controller.ts',
    'src/features/escape/controller.ts',
    'src/features/itinerary/controller.ts',
    'src/features/map/render-model.ts',
    'src/features/waypoint/render-model.ts',
  ];
  for(const file of featureFiles) {
    const source = read(file);
    assert.doesNotMatch(source, /context\.(?:project|state)\b/, file);
  }
  assert.doesNotMatch(read('src/ui/sidebar/runtime-owner.ts'), /\bDATA\.trails\b/);
  assert.doesNotMatch(read('src/ui/import/runtime-owner.ts'), /\bDATA\.trails\b/);
  const productionRuntime = runtimeSource.split('if(studioTestMode) {\n    window.__HTM_RUNTIME_INSPECTOR__')[0];
  assert.doesNotMatch(productionRuntime, /\bDATA\.trails\b/);
  assert.match(productionRuntime, /createProjectStore\(initialProject\)/);
  assert.match(productionRuntime, /createProjectActions\(projectStore\)/);
  assert.match(productionRuntime, /createProjectSelectors/);
});

console.log(`\nResult: ${passed}/${passed} passed`);
