/** Runtime wiring contracts for the unified Studio interaction state machine. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const { runtimeSource: runtime } = require('./runtime_source');
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

test('all five modes activate owner-bound sessions', () => {
  for(const [kind, phase] of [
    ['measure', 'select-a'],
    ['segment', 'editing'],
    ['waypoint', 'select'],
    ['escape', 'select-a'],
    ['day-preview', 'preview'],
  ]) {
    assert.ok(runtime.includes(`beginRuntimeInteraction('${kind}', '${phase}'`), `${kind}:${phase}`);
  }
});

test('all five cleanup paths cancel through the manager', () => {
  for(const [kind, functionName] of [
    ['measure', 'measureExit'],
    ['segment', 'segmentExit'],
    ['waypoint', 'exitAddWaypointMode'],
    ['escape', 'addEscapeExit'],
    ['day-preview', 'clearDaySegmentPreview'],
  ]) {
    const start = runtime.indexOf(`function ${functionName}(`);
    assert.ok(start >= 0, functionName);
    const body = runtime.slice(start, start + 500);
    assert.ok(body.includes(`cancelRuntimeInteraction('${kind}'`), `${functionName} -> ${kind}`);
  }
});

test('map taps use one active-kind dispatcher', () => {
  assert.ok(runtime.includes("if(!['measure', 'segment', 'waypoint', 'escape'].includes(kind)) return;"));
  assert.ok(runtime.includes("dispatchRuntimeInteraction(kind, {type:'tap', source:'leaflet', latlng:e.latlng})"));
  assert.strictEqual(runtime.includes('if(!addEscapeState.active) return;'), false);
  assert.strictEqual(runtime.includes('if(!addWaypointState.active) return;'), false);
});

test('fast taps and both drag systems dispatch typed events', () => {
  assert.ok(runtime.includes("dispatchRuntimeInteraction(kind, {type:'tap', source:'fast', latlng})"));
  for(const eventType of ['drag-start', 'drag-snap', 'drag-end']) {
    assert.ok(runtime.includes(`type:'${eventType}'`), eventType);
  }
  assert.ok(runtime.includes("dispatchRuntimeInteraction('measure'"));
  assert.ok(runtime.includes("dispatchRuntimeInteraction('segment'"));
});

test('scheduled drag work is session-owned', () => {
  assert.ok(runtime.includes("scheduleFrame: callback => scheduleRuntimeInteractionFrame('measure', callback)"));
  assert.ok(runtime.includes("scheduleFrame: callback => scheduleRuntimeInteractionFrame('segment', callback)"));
  assert.ok(runtime.includes('session.delay(250'));
  assert.ok(runtime.includes('session.delay(200'));
});

test('owner revisions are checked before dispatch and render work', () => {
  assert.ok(runtime.includes('function revalidateRuntimeInteractionOwner()'));
  assert.ok(runtime.includes('runtimeInteractionOwnerIsCurrent(current)'));
  assert.ok(runtime.includes("interactionManager.cancel('owner-invalid'"));
  assert.ok(runtime.includes('segmentController.apply()'));
  assert.ok(segmentController.includes('dependencies.markRevision(trail)'));
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
  assert.ok(runtime.includes("dispatchTransientWaypointTap(e.latlng, 'contextmenu')"));
  assert.ok(runtime.includes("dispatchTransientWaypointTap(ll, 'long-press')"));
});

test('Day preview replaces other modes instead of keeping manual conflict checks', () => {
  const start = runtime.indexOf('function showDaySegmentPreview(');
  const body = runtime.slice(start, start + 1800);
  assert.ok(body.includes("beginRuntimeInteraction('day-preview', 'preview'"));
  assert.strictEqual(body.includes('请先退出测距/分段'), false);
});

console.log(`\nResult: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
