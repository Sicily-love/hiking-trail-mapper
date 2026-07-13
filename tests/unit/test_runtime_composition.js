const assert = require('assert');
const { composeClassicRuntime } = require('../../src/app/runtime/compose.ts');
const {
  read,
  runtimeSource,
  runtimeTemplate,
  sliceFiles,
} = require('./runtime_source');

let passed = 0;
let failed = 0;
const test = (name, fn) => {
  try {
    fn();
    console.log(`  PASS ${name}`);
    passed += 1;
  } catch(error) {
    console.log(`  FAIL ${name}\n    ${error.stack || error.message}`);
    failed += 1;
  }
};

console.log('\nVertical classic-runtime composition');

test('runtime template is startup glue below 400 lines', () => {
  assert.ok(runtimeTemplate.split('\n').length <= 400);
  assert.ok(runtimeSource.split('\n').length > runtimeTemplate.split('\n').length);
});

test('all vertical owners are present and composed exactly once', () => {
  assert.strictEqual(sliceFiles.length, 13);
  sliceFiles.forEach(name => assert.ok(read(name).includes('@runtime-fragment'), name));
  assert.strictEqual(runtimeSource.includes('@runtime-slice'), false);
  assert.strictEqual(runtimeSource.includes('@runtime-fragment'), false);
  assert.strictEqual(runtimeSource.includes('export {};'), false);
});

test('migrated implementations no longer live in runtime.ts', () => {
  for(const functionName of [
    'handleFiles',
    'loadFromStorage',
    'renderWaypointsNow',
    'renderTracksNow',
    'drawElevBar',
    'setLang',
    'openLightbox',
    'beginRuntimeInteraction',
    'buildTrailList',
    'showDaySegmentPreview',
    'measureEnter',
    'addEscapeEnter',
    'segmentEnter',
    'resetView',
    'addManualWaypointAt',
  ]) {
    assert.strictEqual(runtimeTemplate.includes(`function ${functionName}(`), false, functionName);
    assert.strictEqual(
      (runtimeSource.match(new RegExp(`function ${functionName}\\(`, 'g')) || []).length,
      1,
      functionName,
    );
  }
});

test('composer rejects missing, duplicate, and unused fragments', () => {
  assert.throws(
    () => composeClassicRuntime('/* @runtime-slice a.main */', []),
    /Missing runtime fragment/,
  );
  const fragment = '/* @runtime-fragment a.main */\nconst value = 1;';
  assert.throws(
    () => composeClassicRuntime(
      '/* @runtime-slice a.main */\n/* @runtime-slice a.main */',
      [{ name: 'one', source: fragment }],
    ),
    /slot is duplicated/,
  );
  assert.throws(
    () => composeClassicRuntime('const value = 1;', [{ name: 'one', source: fragment }]),
    /Unused runtime fragments/,
  );
  assert.throws(
    () => composeClassicRuntime('/* @runtime-slice a.main */', [
      { name: 'one', source: fragment },
      { name: 'two', source: fragment },
    ]),
    /exists in both/,
  );
});

console.log(`\nResult: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
