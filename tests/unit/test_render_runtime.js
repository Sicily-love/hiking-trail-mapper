/** Runtime contracts for RenderScheduler and Performance 2.0 integration. */
const assert = require('assert');
const { read, runtimeSource: runtime } = require('./runtime_source');
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

test('track runtime delegates bounded elevation rendering to the typed model and Leaflet adapter', () => {
  const source = functionSource('renderTracksNow', 'drawTracks');
  assert.ok(source.includes('mapRenderController.buildTracks'));
  assert.ok(source.includes('elevationBandCount:40'));
  assert.ok(source.includes('leafletTrackRenderer.render(model)'));
  assert.ok(source.includes('renderRuntimeStats.elevationBands = model.elevationBands'));
  assert.strictEqual(source.includes('L.polyline'), false);
  assert.strictEqual(source.includes('DATA.'), false);
  assert.strictEqual(source.includes('state.'), false);
  assert.ok(runtime.includes('HTM_APP.createLeafletTrackRenderer'));
  assert.ok(runtime.includes('HTM_APP.createMapRenderController'));
  assert.ok(runtime.includes('onInspectPoint:(event, model) => inspectTrackPoint(event, model.trail)'));
  assert.ok(runtime.includes('formatTrackPointCoordinates(pt)'));
});

test('Canvas elevation rendering downsamples without replacing full hit data', () => {
  const draw = functionSource('drawElevBar', 'renderElevationChartNow');
  const model = read('src/features/elevation/render-model.ts');
  const adapter = read('src/adapters/elevation-canvas.ts');
  assert.ok(model.includes('downsampleMinMaxIndices'));
  assert.ok(model.includes('sourcePoints:points.length'));
  assert.ok(model.includes('renderedPoints:sampleIndices.length'));
  assert.ok(model.includes('computeElevationRenderModel(points, layout, sourceBreaks).badges'));
  assert.ok(model.includes('sampledBreaks'));
  assert.ok(draw.includes('_elevBarData ='));
  assert.ok(draw.includes('HTM_APP.buildElevationCanvasScene'));
  assert.ok(draw.includes('elevationCanvasRenderer.render(scene, dimensions)'));
  assert.strictEqual(draw.includes('elevCtx.'), false);
  assert.ok(adapter.includes('chart.fillPolygon'));
  assert.ok(adapter.includes('chart.curve'));
  assert.ok(adapter.includes('chart.fillPolygons'));
  assert.ok(adapter.includes('chart.curveSegments'));
});

test('waypoint runtime delegates keyed Marker ownership to the Leaflet adapter', () => {
  const source = functionSource('renderWaypointsNow', 'drawWaypoints');
  assert.ok(source.includes('leafletMarkerRenderer.renderWaypoints'));
  assert.strictEqual(source.includes('wpLayer.clearLayers'), false);
  assert.strictEqual(source.includes('L.marker'), false);
  assert.ok(runtime.includes('HTM_APP.createLeafletMarkerRenderer'));
  assert.ok(runtime.includes('HTM_APP.createMarkerRenderController'));
  assert.ok(runtime.includes('waypointRegistry:wpMarkers'));
  assert.strictEqual(source.includes('DATA.'), false);
  assert.strictEqual(source.includes('state.'), false);
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
  assert.ok(reset.includes('gesture:Boolean(opts.gesture)'));
  assert.ok(execute.includes("typeof map.flyToBounds === 'function'"));
  assert.ok(execute.includes('stepCount'));
  assert.ok(execute.includes('duration'));
  assert.strictEqual((execute.match(/applyFit\(\)/g) || []).length, 2);
  assert.ok(reset.includes('if(stateChanged)'));
  assert.strictEqual(reset.includes('measureCompute()'), false);
  assert.ok(runtime.includes('resetView({restoreActive:true, gesture:true})'));
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
