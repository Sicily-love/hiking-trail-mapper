/** Direct-runtime architecture contracts after removal of the classic composer. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { read, root, runtimeSource } = require('./runtime_source');

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

console.log('\nDirect TypeScript runtime');

test('bootstrap imports and starts one direct runtime module', () => {
  const bootstrap = read('src/app/bootstrap.ts');
  assert.ok(bootstrap.includes("import { startStudioRuntime"));
  assert.strictEqual((bootstrap.match(/startStudioRuntime\(/g) || []).length, 1);
  assert.strictEqual(bootstrap.includes('?raw'), false);
  assert.strictEqual(bootstrap.includes('executeClassicScript'), false);
  assert.strictEqual(bootstrap.includes('composeClassicRuntime'), false);
});

test('classic template, composer, and vertical runtime owners are absent', () => {
  const retired = [
    'src/app/runtime.ts',
    'src/app/runtime/classic.ts',
    'src/app/runtime/compose.ts',
    'src/features/files/runtime.ts',
    'src/features/storage/runtime.ts',
    'src/features/waypoint/runtime.ts',
    'src/features/map/runtime.ts',
    'src/features/elevation/runtime.ts',
    'src/features/localization/runtime.ts',
    'src/features/escape/runtime.ts',
    'src/features/itinerary/runtime.ts',
    'src/features/measure/runtime.ts',
    'src/features/segment/runtime.ts',
    'src/features/trails/runtime.ts',
    'src/ui/orchestration/runtime.ts',
  ];
  retired.forEach(name => assert.strictEqual(fs.existsSync(path.join(root, name)), false, name));
});

test('runtime has no fragment slots or dynamic script execution', () => {
  assert.strictEqual(runtimeSource.includes('@runtime-slice'), false);
  assert.strictEqual(runtimeSource.includes('@runtime-fragment'), false);
  assert.strictEqual(runtimeSource.includes('createElement(\'script\')'), false);
  assert.strictEqual(runtimeSource.includes('new Function'), false);
  assert.strictEqual(runtimeSource.includes('eval('), false);
  assert.ok(runtimeSource.includes('export function startStudioRuntime'));
});

test('all browser capabilities remain present exactly once', () => {
  for(const functionName of [
    'handleFiles', 'loadFromStorage', 'renderWaypointsNow', 'renderTracksNow',
    'drawElevBar', 'setLang', 'beginRuntimeInteraction',
    'buildTrailList', 'showDaySegmentPreview', 'measureEnter', 'addEscapeEnter',
    'segmentEnter', 'resetView', 'addManualWaypointAt',
  ]) {
    assert.strictEqual(
      (runtimeSource.match(new RegExp(`function ${functionName}\\(`, 'g')) || []).length,
      1,
      functionName,
    );
  }
  const lightbox = read('src/ui/lightbox.ts');
  assert.match(runtimeSource, /createImageLightboxController\(/);
  assert.match(runtimeSource, /const openLightbox = .*lightboxController\.open/);
  assert.match(lightbox, /container\.addEventListener\('touchstart'/);
  assert.doesNotMatch(runtimeSource, /lightboxEl\.addEventListener/);
});

console.log(`\nResult: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
