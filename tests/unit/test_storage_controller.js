/** Typed storage-controller lifecycle contracts. */
const assert = require('assert');
const app = require('../../src/app/index.ts');
const { read } = require('./runtime_source.js');
const {createTestRuntimeContext} = require('./runtime_context_harness.js');

let passed = 0;
let failed = 0;
const T = async (name, fn) => {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
};

function createContext(trails = [{id:'a', group:'A'}]) {
  const state = app.createAppStateStore({trails});
  return createTestRuntimeContext(app, {title:'Storage', trails}, state);
}

(async () => {
  console.log('\n▸ Typed storage controller');

  await T('opens one database and writes the latest project snapshot', async () => {
    const context = createContext();
    const db = {};
    const operations = [];
    const events = [];
    let opens = 0;
    const controller = app.createStorageController(context, {
      openDatabase:async () => { opens++; return db; },
      execute:async (actualDb, operation) => {
        assert.strictEqual(actualDb, db);
        operations.push(operation);
      },
      onEvent:event => events.push(event),
    });
    assert.strictEqual(await controller.flush(), true);
    assert.strictEqual(await controller.flush(), true);
    assert.strictEqual(opens, 1);
    assert.strictEqual(operations[0].kind, 'write');
    assert.deepStrictEqual(operations[0].value.activeTrails, ['a']);
    assert.deepStrictEqual(events.map(event => event.type), ['storage.saved', 'storage.saved']);
  });

  await T('coalesces scheduled saves and clears the pending timer on dispose', async () => {
    const callbacks = new Map();
    const cleared = [];
    let nextTimer = 1;
    let writes = 0;
    const controller = app.createStorageController(createContext(), {
      openDatabase:async () => ({}),
      execute:async () => { writes++; },
      setTimer:callback => { const id = nextTimer++; callbacks.set(id, callback); return id; },
      clearTimer:id => { cleared.push(id); callbacks.delete(id); },
    });
    controller.scheduleSave();
    controller.scheduleSave();
    assert.deepStrictEqual(cleared, [1]);
    callbacks.get(2)();
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(writes, 1);
    controller.scheduleSave();
    controller.dispose();
    assert.deepStrictEqual(cleared, [1, 3]);
  });

  await T('loads and normalizes a snapshot without mutating project state', async () => {
    const context = createContext();
    const snapshot = {
      trails:[{id:'b', group:'B'}], activeTrails:['b'], activeGroup:'B', primaryByGroup:{B:'b'},
    };
    const events = [];
    const controller = app.createStorageController(context, {
      openDatabase:async () => ({}),
      execute:async (_db, operation) => operation.kind === 'read' ? snapshot : undefined,
      onEvent:event => events.push(event.type),
    });
    const restored = await controller.load('A');
    assert.strictEqual(restored.ok, true);
    assert.strictEqual(restored.primaryTrailId, 'b');
    assert.strictEqual(context.projectSelectors.trails()[0].id, 'a');
    assert.deepStrictEqual(events, ['storage.snapshot', 'storage.loaded']);
  });

  await T('reports quota and availability failures as typed events', async () => {
    const quotaEvents = [];
    const quota = app.createStorageController(createContext(), {
      openDatabase:async () => ({}),
      execute:async () => { throw {name:'QuotaExceededError'}; },
      onEvent:event => quotaEvents.push(event.type),
    });
    assert.strictEqual(await quota.flush(), false);
    assert.deepStrictEqual(quotaEvents, ['storage.quota-exceeded']);
    assert.strictEqual(quota.available, true);

    const unavailableEvents = [];
    let opens = 0;
    const unavailable = app.createStorageController(createContext(), {
      openDatabase:async () => { opens++; throw new Error('blocked'); },
      execute:async () => undefined,
      onEvent:event => unavailableEvents.push(event.type),
    });
    assert.strictEqual(await unavailable.flush(), false);
    assert.strictEqual(await unavailable.flush(), false);
    assert.strictEqual(opens, 1);
    assert.strictEqual(unavailable.available, false);
    assert.deepStrictEqual(unavailableEvents, ['storage.unavailable']);
  });

  await T('clears through a delete operation', async () => {
    let operation;
    const controller = app.createStorageController(createContext(), {
      openDatabase:async () => ({}),
      execute:async (_db, nextOperation) => { operation = nextOperation; },
    });
    assert.strictEqual(await controller.clear(), true);
    assert.strictEqual(operation.kind, 'delete');
  });

  await T('direct runtime remains a UI and migration adapter for typed storage', () => {
    const source = read('src/app/runtime/studio.ts');
    assert.match(source, /createStorageController\(runtimeContext/);
    assert.match(source, /storageController\.scheduleSave\(\)/);
    assert.match(source, /storageController\.load\(selectors\.activeGroup\(\)\)/);
    assert.doesNotMatch(source, /indexedDB\.open\(/);
    assert.doesNotMatch(source, /let _dbPromise/);
    assert.doesNotMatch(source, /let _saveTimer/);
  });

  console.log('\n══════════════════════════════════════════════════');
  console.log(`结果: ${passed}/${passed + failed} passed`);
  process.exit(failed === 0 ? 0 : 1);
})();
