/** Runtime contracts for RenderScheduler and Performance 2.0 integration. */
const assert = require('assert');
const { runtimeSource: runtime } = require('./runtime_source');
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

function functionSource(name, nextName) {
  const start = runtime.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = nextName ? runtime.indexOf(`function ${nextName}(`, start + 1) : -1;
  return runtime.slice(start, end > start ? end : start + 5000);
}

console.log('\nPerformance 2.0 runtime contracts');

test('one RenderScheduler owns all seven runtime phases', () => {
  assert.strictEqual((runtime.match(/new HTM_APP\.RenderScheduler\(/g) || []).length, 1);
  for(const phase of ['tracks', 'markers', 'sidebar', 'days', 'legend', 'chart', 'fit']) {
    assert.ok(runtime.includes(`${phase}(context)`), phase);
  }
  assert.ok(runtime.includes('window.__HTM_RENDER_SCHEDULER__ = renderScheduler'));
  assert.ok(runtime.includes('window.__HTM_RENDER_STATS__ = renderRuntimeStats'));
});

test('legacy redraw entrypoints only invalidate dirty flags', () => {
  const tracks = functionSource('drawTracks', 'nearestTrackIdx');
  const markers = functionSource('drawWaypoints', 'showHelp');
  const chart = functionSource('refreshElevBar');
  assert.ok(tracks.includes('RENDER_DIRTY.TRACKS'));
  assert.ok(markers.includes('RENDER_DIRTY.MARKERS'));
  assert.ok(chart.includes('RENDER_DIRTY.CHART'));
  assert.strictEqual(tracks.includes('trackLayer.clearLayers'), false);
  assert.strictEqual(markers.includes('wpLayer.clearLayers'), false);
});

test('rebuildAll schedules the complete ordered render set', () => {
  const source = functionSource('rebuildAll', 'findNearestIdx');
  for(const flag of ['TRACKS', 'MARKERS', 'SIDEBAR', 'DAYS', 'LEGEND', 'CHART']) {
    assert.ok(source.includes(`RENDER_DIRTY.${flag}`), flag);
  }
  assert.strictEqual(source.includes('buildTrailList()'), false);
  assert.strictEqual(source.includes('drawTracks()'), false);
  assert.ok(source.includes("{source:'rebuild'}"));
});

test('map elevation gradients use bounded 40-band polyline groups', () => {
  const source = functionSource('renderTracksNow', 'drawTracks');
  assert.ok(source.includes('buildElevationPolylineSegments(track'));
  assert.ok(source.includes('bandCount:40'));
  assert.ok(source.includes('group.paths.map(path => path.latLngs)'));
  assert.ok(source.includes('renderRuntimeStats.elevationBands += groups.length'));
});

test('Canvas elevation rendering downsamples without replacing full hit data', () => {
  const source = functionSource('buildElevationCanvasRenderModel', 'drawElevBar');
  const draw = functionSource('drawElevBar', 'renderElevationChartNow');
  assert.ok(source.includes('downsampleMinMaxIndices'));
  assert.ok(source.includes('sourcePoints:pts.length'));
  assert.ok(source.includes('renderedPoints:sampleIndices.length'));
  assert.ok(source.includes('computeElevationRenderModel([], layout).badges'));
  assert.ok(draw.includes('_elevBarData ='));
  assert.ok(draw.includes('pts, minE: layout.minE'));
});

test('waypoint markers use keyed diff and preserve unchanged instances', () => {
  const source = functionSource('renderWaypointsNow', 'drawWaypoints');
  assert.ok(source.includes('planKeyedWaypointDiff'));
  assert.ok(source.includes('diff.remove.forEach'));
  assert.ok(source.includes('diff.update.forEach'));
  assert.ok(source.includes('diff.add.forEach'));
  assert.ok(source.includes('diff.keep.forEach'));
  assert.strictEqual(source.includes('wpLayer.clearLayers'), false);
  assert.ok(runtime.includes('const waypointMarkerEntries = new Map()'));
});

test('FIT is last-request-wins and reset is epoch guarded', () => {
  const reset = functionSource('resetView', 'finishWorkspaceFit');
  const execute = functionSource('executeWorkspaceFit', 'fitWorkspaceBounds');
  const fit = functionSource('fitWorkspaceBounds');
  assert.ok(reset.includes('++workspaceResetEpoch'));
  assert.ok(reset.includes('map.stop()'));
  assert.ok(execute.includes('request.resetEpoch === workspaceResetEpoch'));
  assert.ok(fit.includes('renderScheduler.requestFit'));
  assert.ok(fit.includes('pendingWorkspaceFit.resolve(false)'));
  assert.strictEqual((runtime.match(/map\.fitBounds\(/g) || []).length, 1);
});

test('cache restore waits for the guarded final reset', () => {
  const source = functionSource('schedulePostRestoreReset');
  assert.ok(source.includes('let completed = false'));
  assert.ok(source.includes('await resetView({restoreActive: true})'));
  assert.ok(source.includes('map.whenReady'));
});

console.log(`\nResult: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
