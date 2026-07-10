/** TypeScript app/controller/adapter contracts. */
const assert = require('assert');
const app = require('../../src/app/index.ts');
let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
};

console.log('\n▸ TypeScript app architecture');
T('app state owns active group and per-group primary descriptors', () => {
  const state = app.createAppState({trails: [{id:'a', group:'A'}, {id:'b', group:'B'}]});
  assert.strictEqual(state.primaryTrailId, 'a');
  state.activeGroup = 'B';
  state.primaryTrailId = 'b';
  assert.strictEqual(state.primaryByGroup.B, 'b');
  assert.ok(state.visibleTags instanceof Set);
});
T('measure controller owns interaction lifecycle state', () => {
  const state = app.createMeasureInteractionState();
  const a = {idx:0, lat:30, lng:100, elev:1000, km:0};
  const b = {idx:1, lat:31, lng:101, elev:1100, km:1};
  assert.ok(app.updateMeasureEndpoint(state, 'A', a));
  assert.ok(app.updateMeasureEndpoint(state, 'B', b));
  assert.ok(app.reverseMeasureInteraction(state));
  assert.strictEqual(state.ptA.idx, 1);
  app.resetMeasureInteraction(state);
  assert.strictEqual(state.ptA, null);
});
T('itinerary controllers create isolated segment and Day preview state', () => {
  const segment = app.createSegmentInteractionState();
  const preview = app.createDayPreviewInteractionState();
  preview.active = true;
  preview.day = 2;
  app.clearDayPreviewState(preview);
  assert.deepStrictEqual(segment.points, []);
  assert.strictEqual(preview.active, false);
  assert.strictEqual(preview.day, null);
});
T('elevation dock state toggles immutably', () => {
  const state = app.createElevationDockState();
  const next = app.toggleElevationDock(state);
  assert.notStrictEqual(next, state);
  assert.strictEqual(next.collapsed, true);
});
T('workspace fit plan closes only an open mobile sidebar', () => {
  assert.strictEqual(app.shouldCloseSidebarForFit(390, false), true);
  assert.strictEqual(app.shouldCloseSidebarForFit(390, true), false);
  assert.strictEqual(app.shouldCloseSidebarForFit(1024, false), false);
});
T('Leaflet adapter updates existing lines without recreating them', () => {
  let nextLatLngs = null;
  const line = {setLatLngs(value) { nextLatLngs = value; }, bringToBack() { this.back = true; }};
  const result = app.upsertLeafletPolyline({}, {}, line, {latLngs:[[1,2],[3,4]], lineStyle:{}});
  assert.strictEqual(result, line);
  assert.deepStrictEqual(nextLatLngs, [[1,2],[3,4]]);
  assert.strictEqual(line.back, true);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
