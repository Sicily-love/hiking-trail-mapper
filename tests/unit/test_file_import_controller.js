/** Typed file-import controller contracts. */
const assert = require('assert');
const app = require('../../src/app/index.ts');
const { read } = require('./runtime_source.js');

let passed = 0;
let failed = 0;
const T = async (name, fn) => {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
};

function trail(id, points, group) {
  return {
    id, name:`Trail ${id}`, group, track:points,
    waypoints:[], stats:{distance_km:1, ascent_m:100},
  };
}

function createHarness(trails = []) {
  const state = app.createAppStateStore({trails});
  const project = {title:'Import', trails};
  const effects = {commits:0, resets:0, events:[]};
  const context = app.createRuntimeContext({
    project,
    state,
    commands:new app.CommandRegistry(),
    interactions:app.createStudioInteractionManager(),
    renderer:new app.RenderScheduler({raf:() => 1, caf:() => {}}),
    dialogs:{confirm:async () => true},
  });
  const controller = app.createFileImportController(context, {
    contentHash:item => JSON.stringify(item.track),
    unzip:() => ({}),
    decode:bytes => String.fromCharCode(...bytes),
    palette:['#111111', '#222222'],
    onEvent:event => effects.events.push(event),
    commit:() => { effects.commits++; },
    resetView:() => { effects.resets++; },
  });
  return {context, controller, effects, project, state};
}

(async () => {
  console.log('\n▸ Typed file import controller');

  await T('expands visible KML entries and skips metadata paths', async () => {
    const effects = [];
    const context = createHarness().context;
    const controller = app.createFileImportController(context, {
      contentHash:item => JSON.stringify(item.track),
      unzip:() => ({
        'routes/a.kml':new Uint8Array([65]),
        '__MACOSX/a.kml':new Uint8Array([66]),
        'routes/.hidden.kml':new Uint8Array([67]),
        'readme.txt':new Uint8Array([68]),
      }),
      decode:bytes => String.fromCharCode(...bytes),
      palette:['#111111'],
      onEvent:event => effects.push(event),
      commit:() => {}, resetView:() => {},
    });
    const files = await controller.expandFiles([{
      name:'bundle.zip', text:async () => '', arrayBuffer:async () => new ArrayBuffer(1),
    }]);
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].name, 'a.kml');
    assert.strictEqual(files[0]._fromZip, 'bundle.zip');
    assert.strictEqual(await files[0].text(), 'A');
    assert.deepStrictEqual(effects, [{type:'archive.expanded', archiveName:'bundle.zip', count:1}]);
  });

  await T('reports empty and failed archives without rejecting the batch', async () => {
    const {context} = createHarness();
    const events = [];
    let calls = 0;
    const controller = app.createFileImportController(context, {
      contentHash:item => JSON.stringify(item.track),
      unzip:() => { calls++; if(calls === 1) return {'readme.txt':new Uint8Array()}; throw new Error('bad zip'); },
      decode:() => '', palette:['#111111'], onEvent:event => events.push(event),
      commit:() => {}, resetView:() => {},
    });
    const archive = name => ({name, text:async () => '', arrayBuffer:async () => new ArrayBuffer(1)});
    assert.deepStrictEqual(await controller.expandFiles([archive('empty.zip'), archive('bad.zip')]), []);
    assert.deepStrictEqual(events.map(event => event.type), ['archive.empty', 'archive.failed']);
  });

  await T('adds unique trails and rejects duplicate content', () => {
    const existing = trail('1', [[1, 1, 1]], 'A');
    const {controller, project, state} = createHarness([existing]);
    const duplicate = trail('2', [[1, 1, 1]]);
    const collision = trail('1', [[2, 2, 2]]);
    assert.strictEqual(controller.addTrail(duplicate).status, 'duplicate');
    const added = controller.addTrail(collision);
    assert.strictEqual(added.status, 'added');
    assert.strictEqual(collision.id, '1-1');
    assert.strictEqual(collision.group, 'A');
    assert.strictEqual(collision.color, '#222222');
    assert.deepStrictEqual(project.trails.map(item => item.id), ['1', '1-1']);
    assert.strictEqual(state.snapshot().activeTrails.has('1-1'), true);
  });

  await T('renames IDs and edits source through one project mutation boundary', () => {
    const first = trail('a', [[1, 1, 1]], 'A');
    const second = trail('b', [[2, 2, 2]], 'A');
    const {controller, state, effects} = createHarness([first, second]);
    assert.strictEqual(controller.renameTrail('a', ' b ').status, 'duplicate');
    assert.strictEqual(controller.renameTrail('a', ' renamed ').status, 'renamed');
    assert.strictEqual(first.id, 'renamed');
    assert.strictEqual(state.snapshot().activeTrails.has('a'), false);
    assert.strictEqual(state.snapshot().activeTrails.has('renamed'), true);
    assert.strictEqual(state.snapshot().primaryByGroup.A, 'renamed');
    assert.strictEqual(controller.updateSource('renamed', ' https://example.test '), true);
    assert.strictEqual(first.source, 'https://example.test');
    assert.strictEqual(effects.commits, 2);
  });

  await T('finalizes only non-empty imports and resets escape selection', () => {
    const first = trail('a', [[1, 1, 1]], 'A');
    const {controller, state, effects} = createHarness([first]);
    state.dispatch({type:'escape.set-active', escapeId:'escape-1'});
    assert.strictEqual(controller.finalizeImport(0), false);
    assert.strictEqual(controller.finalizeImport(1), true);
    assert.strictEqual(state.snapshot().activeEscape, null);
    assert.strictEqual(effects.commits, 1);
    assert.strictEqual(effects.resets, 1);
  });

  await T('direct runtime keeps import DOM but not project writes', () => {
    const source = read('src/app/runtime/studio.ts');
    assert.match(source, /createFileImportController\(runtimeContext/);
    assert.match(source, /fileImportController\.addTrail\(trail\)/);
    assert.match(source, /fileImportController\.renameTrail/);
    assert.match(source, /fileImportController\.finalizeImport/);
    assert.doesNotMatch(source, /DATA\.trails\.push\(/);
    assert.doesNotMatch(source, /fflate\.unzipSync\(buf\)/);
  });

  console.log('\n══════════════════════════════════════════════════');
  console.log(`结果: ${passed}/${passed + failed} passed`);
  process.exit(failed === 0 ? 0 : 1);
})();
