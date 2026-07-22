const assert = require('assert');
const fs = require('fs');
const app = require('../../src/app/index.ts');

let passed = 0;
let failed = 0;
const T = async (name, fn) => {
  try { await fn(); console.log(`  PASS ${name}`); passed += 1; }
  catch(error) { console.log(`  FAIL ${name}\n    ${error.stack || error.message}`); failed += 1; }
};

function trail(id = 'main', name = 'Main') {
  return {id, name, group:'A', track:[[30,100,1000],[30.01,100.01,1100]],
    stats:{distance_km:1, ascent_m:100, descent_m:0}, waypoints:[]};
}

function harness(options = {}) {
  if(typeof options === 'number') options = {maxEntries:options};
  const source = trail();
  const project = {title:'History', trails:[source], calc_method:{}};
  const state = app.createAppStateStore({trails:[source]});
  const context = app.createRuntimeContext({
    project, state, commands:new app.CommandRegistry(),
    interactions:app.createStudioInteractionManager(),
    renderer:new app.RenderScheduler({raf:() => 1, caf:() => {}}),
    dialogs:{confirm:async () => true},
  });
  const effects = {persist:0, render:0, before:0, events:[]};
  const history = app.createProjectHistoryController(context, {
    appVersion:'v2.2.0',
    maxEntries:options.maxEntries,
    maxBytes:options.maxBytes,
    persist:() => { effects.persist += 1; },
    render:() => { effects.render += 1; },
    beforeApply:() => { effects.before += 1; },
    onEvent:event => effects.events.push(event),
  });
  return {project, state, history, effects};
}

(async () => {
  console.log('\nProject history');

  await T('restores project plus workspace on undo and redo', () => {
    const {project, state, history, effects} = harness();
    history.execute('Rename trail', () => {
      project.trails[0].name = 'Renamed';
      state.dispatch({type:'mode.set', mode:'waypoint'});
    });
    assert.strictEqual(history.undoLabel, 'Rename trail');
    assert.strictEqual(history.undo(), true);
    assert.strictEqual(project.trails[0].name, 'Main');
    assert.strictEqual(state.snapshot().mode, 'elev');
    assert.strictEqual(history.redo(), true);
    assert.strictEqual(project.trails[0].name, 'Renamed');
    assert.strictEqual(state.snapshot().mode, 'waypoint');
    assert.deepStrictEqual([effects.persist, effects.render, effects.before], [2,2,2]);
  });

  await T('does not record no-op or rejected async mutations', async () => {
    const {project, history} = harness();
    history.execute('No-op', () => false);
    assert.strictEqual(history.canUndo, false);
    await assert.rejects(() => history.execute('Failed', async () => {
      project.title = 'Transient';
      throw new Error('failed');
    }), /failed/);
    assert.strictEqual(history.canUndo, false);
    assert.strictEqual(project.title, 'History');
  });

  await T('clears redo when a new edit branches from an undone state', () => {
    const {project, history} = harness();
    history.execute('First', () => { project.title = 'First'; });
    history.execute('Second', () => { project.title = 'Second'; });
    history.undo();
    assert.strictEqual(history.canRedo, true);
    history.execute('Branch', () => { project.title = 'Branch'; });
    assert.strictEqual(history.canRedo, false);
    assert.strictEqual(history.undoCount, 2);
  });

  await T('bounds retained snapshots and keeps the newest edits', () => {
    const {project, history} = harness(2);
    for(const title of ['One','Two','Three']) history.execute(title, () => { project.title = title; });
    assert.strictEqual(history.undoCount, 2);
    history.undo();
    history.undo();
    assert.strictEqual(project.title, 'One');
    assert.strictEqual(history.undo(), false);
  });

  await T('bounds retained history by serialized bytes', () => {
    const maxBytes = 3000;
    const {project, history} = harness({maxBytes});
    for(const title of ['A'.repeat(120), 'B'.repeat(120), 'C'.repeat(120)]) {
      history.execute('Rename', () => { project.title = title; });
    }
    assert.ok(history.undoCount >= 1 && history.undoCount < 3);
    assert.ok(history.retainedBytes > 0 && history.retainedBytes <= maxBytes);
  });

  await T('clears unsafe history when one edit exceeds the byte budget', () => {
    const {project, history, effects} = harness({maxBytes:3000});
    history.execute('Small edit', () => { project.title = 'Small'; });
    assert.strictEqual(history.canUndo, true);
    history.execute('Attach large content', () => {
      project.title = 'X'.repeat(6000);
    });
    assert.strictEqual(history.canUndo, false);
    assert.strictEqual(history.canRedo, false);
    assert.strictEqual(history.retainedBytes, 0);
    const skipped = effects.events.find(event => event.type === 'history.skipped');
    assert.strictEqual(skipped.label, 'Attach large content');
    assert.ok(skipped.estimatedBytes > skipped.maxBytes);
  });

  await T('runtime routes durable edits through project history', () => {
    const source = fs.readFileSync('src/app/runtime/studio.ts', 'utf8');
    const feature = fs.readFileSync('src/features/project/runtime.ts', 'utf8');
    assert.match(source, /createProjectRuntimeController\(runtimeContext/);
    assert.match(feature, /createProjectHistoryController\(context/);
    assert.match(source, /EDIT_UNDO/);
    assert.match(source, /EDIT_REDO/);
    for(const label of ['添加标注点','应用行程分段','添加下撤路线','生成拼接轨迹','重命名轨迹']) {
      assert.ok(source.includes(label), label);
    }
  });

  console.log(`\nResult: ${passed}/${passed + failed} passed`);
  process.exit(failed === 0 ? 0 : 1);
})();
