/** Unit test: IndexedDB operations resolve only after transaction commit. */
const assert = require('assert');
const { executeIndexedDbOperation, openIndexedDbDatabase } = require('../../src/app/index.ts');

function createFakeDatabase(kind, result) {
  const request = {result: undefined, error: null};
  const transaction = {
    error: null,
    objectStore() {
      return {
        get() { return request; },
        put() { return request; },
        delete() { return request; },
      };
    },
  };
  const db = {
    transaction() { return transaction; },
  };
  const operation = {
    kind,
    mode: kind === 'read' ? 'readonly' : 'readwrite',
    storeName: 'trails',
    key: 'main',
    value: kind === 'write' ? {saved: true} : undefined,
  };
  request.result = result;
  return {db, operation, request, transaction};
}

async function expectPendingAfterRequestSuccess(kind, result) {
  const fake = createFakeDatabase(kind, result);
  let settled = false;
  const promise = executeIndexedDbOperation(fake.db, fake.operation).then(value => {
    settled = true;
    return value;
  });

  fake.request.onsuccess();
  await Promise.resolve();
  assert.strictEqual(settled, false, `${kind} resolved before transaction commit`);

  fake.transaction.oncomplete();
  const value = await promise;
  assert.strictEqual(settled, true);
  return value;
}

async function main() {
  console.log('\nIndexedDB adapter transaction contracts');

  const saved = await expectPendingAfterRequestSuccess('write');
  assert.strictEqual(saved, undefined);
  console.log('  PASS write waits for transaction.oncomplete');

  const snapshot = {trails: [{id: 'a'}]};
  const loaded = await expectPendingAfterRequestSuccess('read', snapshot);
  assert.deepStrictEqual(loaded, snapshot);
  console.log('  PASS read returns data after transaction.oncomplete');

  const removed = await expectPendingAfterRequestSuccess('delete');
  assert.strictEqual(removed, undefined);
  console.log('  PASS delete waits for transaction.oncomplete');

  const failed = createFakeDatabase('write');
  const failure = executeIndexedDbOperation(failed.db, failed.operation);
  failed.transaction.error = new Error('commit failed');
  failed.transaction.onabort();
  await assert.rejects(failure, /commit failed/);
  console.log('  PASS aborted transactions reject');

  const createdStores = [];
  const openedDatabase = {
    objectStoreNames:{contains:name => createdStores.includes(name)},
    createObjectStore:name => createdStores.push(name),
  };
  const openRequest = {result:openedDatabase, error:null};
  const opening = openIndexedDbDatabase({open:() => openRequest}, 'studio', 1, ['trails']);
  openRequest.onupgradeneeded();
  openRequest.onsuccess();
  assert.strictEqual(await opening, openedDatabase);
  assert.deepStrictEqual(createdStores, ['trails']);
  console.log('  PASS open creates required stores during upgrade');

  await assert.rejects(openIndexedDbDatabase(null, 'studio', 1, ['trails']), /not supported/);
  console.log('  PASS open rejects when IndexedDB is unavailable');

  console.log('\nResult: 6/6 passed');
}

main().catch(error => {
  console.error(`  FAIL ${error.stack || error.message}`);
  process.exit(1);
});
