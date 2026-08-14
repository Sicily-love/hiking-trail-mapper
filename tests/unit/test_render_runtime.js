/** Runtime contracts for RenderScheduler and Performance 2.0 integration. */
const assert = require('assert');
const { read, runtimeSource: runtime } = require('./runtime_source');
const elevationRuntime = read('src/features/elevation/runtime-owner.ts');
const mapRuntime = read('src/features/map/runtime-owner.ts');
const renderOwner = read('src/app/runtime/render-owner.ts');
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
  assert.strictEqual((renderOwner.match(/new RenderScheduler</g) || []).length, 1);
  for(const phase of ['tracks', 'markers', 'sidebar', 'days', 'legend', 'chart', 'fit']) {
    assert.match(renderOwner, new RegExp(`${phase}\\(context\\)`), phase);
  }
  assert.ok(runtime.includes('createRuntimeRenderOwner'));
  assert.ok(runtime.includes('window.__HTM_RENDER_SCHEDULER__ = renderScheduler'));
  assert.ok(runtime.includes('window.__HTM_RENDER_STATS__ = renderRuntimeStats'));
});

test('legacy redraw entrypoints only invalidate dirty flags', () => {
  const chart = functionSource('refreshElevBar');
  assert.match(runtime, /invalidateTracks:\(\) => invalidateRender\(HTM_APP\.RENDER_DIRTY\.TRACKS\)/);
  assert.match(runtime, /invalidateMarkers:\(\) => invalidateRender\(HTM_APP\.RENDER_DIRTY\.MARKERS\)/);
  assert.match(mapRuntime, /drawTracks:dependencies\.invalidateTracks/);
  assert.match(mapRuntime, /drawWaypoints:dependencies\.invalidateMarkers/);
  assert.ok(chart.includes('elevationRuntime?.refresh'));
  assert.ok(elevationRuntime.includes('invalidateChart()'));
  assert.strictEqual(mapRuntime.includes('trackLayer.clearLayers'), false);
  assert.strictEqual(mapRuntime.includes('waypointLayer.clearLayers'), false);
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
  const source = functionSource('renderTracksNow', 'renderWaypointsNow');
  assert.ok(source.includes('mapRuntime.renderTracks()'));
  assert.ok(mapRuntime.includes('mapRenderController.buildTracks'));
  assert.ok(mapRuntime.includes('elevationBandCount:40'));
  assert.ok(mapRuntime.includes('trackRenderer.render(model)'));
  assert.ok(mapRuntime.includes('recordElevationBands(model.elevationBands)'));
  assert.strictEqual(source.includes('L.polyline'), false);
  assert.strictEqual(source.includes('DATA.'), false);
  assert.strictEqual(source.includes('state.'), false);
  assert.ok(mapRuntime.includes('createLeafletTrackRenderer'));
  assert.ok(mapRuntime.includes('createMapRenderController'));
  assert.match(mapRuntime, /onInspectPoint:\(event, model\) => trackPointInspector\.inspect/);
  assert.ok(elevationRuntime.includes('formatTrackPointCoordinates(point)'));
});

test('Canvas elevation rendering downsamples without replacing full hit data', () => {
  const draw = elevationRuntime.slice(
    elevationRuntime.indexOf('function draw('),
    elevationRuntime.indexOf('function buildStackContext('),
  );
  const model = read('src/features/elevation/render-model.ts');
  const adapter = read('src/adapters/elevation-canvas.ts');
  assert.ok(model.includes('downsampleMinMaxIndices'));
  assert.ok(model.includes('sourcePoints:points.length'));
  assert.ok(model.includes('renderedPoints:sampleIndices.length'));
  assert.ok(model.includes('computeElevationRenderModel(points, layout, sourceBreaks).badges'));
  assert.ok(model.includes('sampledBreaks'));
  assert.ok(draw.includes('data ='));
  assert.ok(draw.includes('app.buildElevationCanvasScene'));
  assert.ok(draw.includes('renderer.render(scene, dimensions)'));
  assert.strictEqual(draw.includes('elevCtx.'), false);
  assert.ok(adapter.includes('chart.fillPolygon'));
  assert.ok(adapter.includes('chart.curve'));
  assert.ok(adapter.includes('chart.fillPolygons'));
  assert.ok(adapter.includes('chart.curveSegments'));
});

test('waypoint runtime delegates keyed Marker ownership to the Leaflet adapter', () => {
  const source = functionSource('renderWaypointsNow', 'showHelp');
  assert.ok(source.includes('mapRuntime.renderWaypoints()'));
  assert.ok(mapRuntime.includes('markerRenderer.renderWaypoints'));
  assert.strictEqual(source.includes('wpLayer.clearLayers'), false);
  assert.strictEqual(source.includes('L.marker'), false);
  assert.ok(mapRuntime.includes('createLeafletMarkerRenderer'));
  assert.ok(mapRuntime.includes('createMarkerRenderController'));
  assert.ok(mapRuntime.includes('waypointRegistry'));
  assert.strictEqual(source.includes('DATA.'), false);
  assert.strictEqual(source.includes('state.'), false);
});

test('FIT is last-request-wins and reset is epoch guarded', () => {
  const workspace = read('src/features/map/workspace-controller.ts');
  const reset = workspace.slice(workspace.indexOf('const resetView ='));
  const execute = workspace.slice(workspace.indexOf('const executeFit ='), workspace.indexOf('const resetView ='));
  const fit = workspace.slice(workspace.indexOf('const fitBounds ='), workspace.indexOf('const finishFit ='));
  assert.ok(reset.includes('++resetEpoch'));
  assert.ok(reset.includes('dependencies.map.stop?.()'));
  assert.ok(execute.includes('request.resetEpoch === resetEpoch'));
  assert.ok(fit.includes('dependencies.requestFit'));
  assert.ok(fit.includes('pending.resolve(false)'));
  assert.ok(reset.includes('gesture:Boolean(options.gesture)'));
  assert.strictEqual(execute.includes('map.flyToBounds'), false);
  assert.ok(execute.includes('planResetTransition'));
  assert.ok(execute.includes('reducedMotion:dependencies.prefersReducedMotion'));
  assert.ok(execute.includes('request.closeOverlay'));
  assert.ok(execute.includes('targetZoom'));
  assert.strictEqual((execute.match(/apply\(\)/g) || []).length, 2);
  assert.ok(reset.includes('if(stateChanged)'));
  assert.ok(reset.includes('cachedTrailBounds(primary)'));
  assert.strictEqual(reset.includes('main.track.map'), false);
  assert.strictEqual(reset.includes('measureCompute()'), false);
  assert.ok(reset.includes('dependencies.stateActions'));
  assert.ok(runtime.includes('workspaceController?.executeFit(context)'));
  assert.ok(runtime.includes('resetView({restoreActive:true, gesture:true})'));
  assert.strictEqual((workspace.match(/map\.fitBounds\(/g) || []).length, 1);
});

test('cache restore waits for the guarded final reset', () => {
  const source = functionSource('schedulePostRestoreReset');
  assert.ok(source.includes('let completed = false'));
  assert.ok(source.includes('await resetView({restoreActive: true})'));
  assert.ok(source.includes('map.whenReady'));
});

console.log(`\nResult: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
