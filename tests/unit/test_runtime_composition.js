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

test('browser capabilities have one explicit module owner', () => {
  const sidebar = read('src/ui/sidebar/runtime-owner.ts');
  const importer = read('src/ui/import/runtime-owner.ts');
  const workspace = read('src/features/map/workspace-controller.ts');
  for(const functionName of [
    'loadFromStorage', 'renderWaypointsNow', 'renderTracksNow', 'drawElevBar',
    'setLang', 'beginRuntimeInteraction', 'measureEnter', 'addEscapeEnter',
    'segmentEnter', 'addManualWaypointAt',
  ]) assert.strictEqual((runtimeSource.match(new RegExp(`function ${functionName}\\(`, 'g')) || []).length, 1, functionName);
  for(const functionName of ['buildTrailList', 'showDaySegmentPreview']) {
    assert.strictEqual((sidebar.match(new RegExp(`function ${functionName}\\(`, 'g')) || []).length, 1, functionName);
    assert.strictEqual(runtimeSource.includes(`function ${functionName}(`), false, functionName);
  }
  assert.strictEqual((importer.match(/function handleFiles\(/g) || []).length, 1);
  assert.strictEqual(runtimeSource.includes('function handleFiles('), false);
  assert.match(workspace, /const resetView =/);
  assert.match(runtimeSource, /createWorkspaceController\(/);
  assert.match(runtimeSource, /createSidebarRuntime\(/);
  assert.match(runtimeSource, /createImportRuntime\(/);
  const lightbox = read('src/ui/lightbox.ts');
  assert.match(runtimeSource, /createImageLightboxController\(/);
  assert.match(runtimeSource, /const openLightbox = .*lightboxController\.open/);
  assert.match(lightbox, /container\.addEventListener\('touchstart'/);
  assert.doesNotMatch(runtimeSource, /lightboxEl\.addEventListener/);
});

test('production runtime does not publish mutable business globals', () => {
  assert.doesNotMatch(runtimeSource, /window\.__exportedMap/);
  assert.doesNotMatch(runtimeSource, /window\.downloadTrailKml/);
  assert.doesNotMatch(runtimeSource, /window\.__HTM_RUNTIME_COMMAND_DISPOSERS__/);
  assert.match(runtimeSource, /if\(studioTestMode\) window\.__HTM_BOOT_READY__/);
  assert.match(runtimeSource, /if\(studioTestMode\) \{/);
});

console.log(`\nResult: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
