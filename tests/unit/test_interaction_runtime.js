/** Runtime wiring contracts for the unified Studio interaction state machine. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const { read, runtimeSource } = require('./runtime_source');
const measureRuntime = read('src/features/measure/runtime-owner.ts');
const segmentRuntime = read('src/features/segment/runtime-owner.ts');
const mapInput = read('src/features/map/interaction-input.ts');
const runtime = [
  runtimeSource,
  read('src/app/runtime/interaction-owner.ts'),
  read('src/ui/sidebar/runtime-owner.ts'),
  read('src/features/stitch/runtime-owner.ts'),
  read('src/features/waypoint/runtime-owner.ts'),
  read('src/features/escape/runtime-owner.ts'),
  measureRuntime,
  segmentRuntime,
  mapInput,
].join('\n');
const workbench = fs.readFileSync(path.join(root, 'src/ui/layout/workbench.ts'), 'utf8');
const segmentController = fs.readFileSync(path.join(root, 'src/features/segment/controller.ts'), 'utf8');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS ${name}`);
  } catch(error) {
    failed += 1;
    console.log(`  FAIL ${name}\n    ${error.stack || error.message}`);
  }
}

console.log('\nInteraction 2.0 runtime contracts');

test('runtime instantiates the strict Studio manager once', () => {
  assert.strictEqual((runtime.match(/createStudioInteractionManager\(\)/g) || []).length, 1);
  assert.strictEqual(runtime.includes('const interactionManager = HTM_APP.createInteractionManager()'), false);
});

test('all six modes activate owner-bound sessions', () => {
  for(const [kind, phase] of [
    ['measure', 'select-a'],
    ['segment', 'editing'],
    ['stitch', 'editing'],
    ['day-preview', 'preview'],
  ]) {
    const token = kind === 'measure' || kind === 'segment'
      ? `beginInteraction('${kind}', '${phase}'`
      : `beginRuntimeInteraction('${kind}', '${phase}'`;
    assert.ok(runtime.includes(token), `${kind}:${phase}`);
  }
  assert.ok(runtime.includes("beginInteraction('waypoint', 'select'"), 'waypoint:select');
  assert.ok(runtime.includes("beginInteraction('escape', 'select-a'"), 'escape:select-a');
});

test('the original five cleanup paths cancel through the manager', () => {
  for(const [kind, source] of [['measure', measureRuntime], ['segment', segmentRuntime]]) {
    const start = source.indexOf('function exit(');
    assert.ok(start >= 0, `${kind} exit`);
    assert.ok(source.slice(start, start + 500).includes(`cancelInteraction('${kind}'`));
  }
  const dayExit = runtime.slice(runtime.indexOf('function clearDaySegmentPreview('));
  assert.ok(dayExit.slice(0, 500).includes("cancelRuntimeInteraction('day-preview'"));
  const waypointExit = runtime.slice(runtime.indexOf('function exitAddWaypointMode('));
  assert.ok(waypointExit.slice(0, 500).includes("cancelInteraction('waypoint'"));
  const escapeExit = runtime.slice(runtime.indexOf('function exit(options:'));
  assert.ok(escapeExit.slice(0, 500).includes("cancelInteraction('escape'"));
});

test('stitch cleanup exits through its owner-bound session', () => {
  assert.ok(runtime.includes("interactionManager.current.kind === 'stitch'"));
  assert.ok(runtime.includes("interactionManager.cancel('stitch-exit')"));
  assert.ok(runtime.includes('function cleanup()'));
});

test('map taps use one active-kind dispatcher', () => {
  assert.ok(mapInput.includes("if(!['measure', 'segment', 'waypoint', 'escape'].includes(kind)) return;"));
  assert.ok(mapInput.includes("dispatch(kind as MapInputInteractionKind, {type:'tap', source:'leaflet'"));
  assert.strictEqual(runtime.includes('if(!addEscapeState.active) return;'), false);
  assert.strictEqual(runtime.includes('if(!addWaypointState.active) return;'), false);
});

test('fast taps and both drag systems dispatch typed events', () => {
  assert.ok(mapInput.includes("dispatch(kind, {type:'tap', source:'fast', latlng})"));
  for(const eventType of ['drag-start', 'drag-snap', 'drag-end']) {
    assert.ok(runtime.includes(`type:'${eventType}'`), eventType);
  }
  assert.ok(measureRuntime.includes("dispatchInteraction('measure'"));
  assert.ok(segmentRuntime.includes("dispatchInteraction('segment'"));
});

test('scheduled drag work is session-owned', () => {
  assert.match(measureRuntime, /scheduleFrame:callback => scheduleInteractionFrame\('measure', callback\)/);
  assert.match(segmentRuntime, /scheduleFrame:callback => scheduleInteractionFrame\('segment', callback\)/);
  assert.ok(runtime.includes("scheduleRuntimeInteractionFrame('stitch', callback)"));
  assert.ok(runtime.includes('session.delay(250'));
  assert.ok(runtime.includes('session.delay(200'));
});

test('owner revisions are checked before dispatch and render work', () => {
  assert.ok(runtime.includes('const revalidateRuntimeInteractionOwner = interactionRuntime.revalidate'));
  assert.ok(runtime.includes('const ownerIsCurrent ='));
  assert.ok(runtime.includes("dependencies.manager.cancel('owner-invalid'"));
  assert.ok(segmentRuntime.includes('controller.apply()'));
  assert.ok(segmentController.includes('dependencies.markRevision(updated)'));
  assert.ok(runtime.includes('markTrailRevision(trail)'));
});

test('Escape dispatches the cancel command while open dialogs retain priority', () => {
  assert.ok(workbench.includes("event.key !== 'Escape'"));
  assert.ok(workbench.includes("document.querySelector('dialog[open]')"));
  assert.ok(workbench.includes('dispatchCommand(STUDIO_COMMANDS.INTERACTION_CANCEL)'));
  assert.ok(runtime.includes('function cancelActiveCommand()'));
  assert.ok(runtime.includes("interactionManager.cancel('escape-key')"));
  assert.strictEqual(runtime.includes("document.addEventListener('keydown'"), false);
});

test('waypoint quick actions also use transient sessions', () => {
  assert.ok(runtime.includes('function dispatchTransientWaypointTap('));
  assert.ok(runtime.includes("source, latlng, requireNear:false, transient:true"));
  assert.match(runtime, /dispatchTransientWaypointTap\([^,]+\.latlng, 'contextmenu'\)/);
  assert.match(runtime, /dispatchTransientWaypointTap\(map\.containerPointToLatLng\([^)]*\), 'long-press'\)/);
});

test('Day preview replaces other modes instead of keeping manual conflict checks', () => {
  const start = runtime.indexOf('function showDaySegmentPreview(');
  const body = runtime.slice(start, start + 1800);
  assert.ok(body.includes("beginRuntimeInteraction('day-preview', 'preview'"));
  assert.strictEqual(body.includes('请先退出测距/分段'), false);
});

console.log(`\nResult: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
