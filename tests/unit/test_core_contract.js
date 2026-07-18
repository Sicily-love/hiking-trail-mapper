/**
 * Unit test · TypeScript core module contract
 * Run: node tests/unit/test_core_contract.js
 */
const assert = require('assert');
const core = require('../../src/core/index.ts');

let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch(e) {
    console.log(`  ✗ ${name}\n    ${e.message}`);
    failed++;
  }
};

console.log('\n▸ src/core TypeScript module contract');

T('exports expected pure functions', () => {
  [
    'haversine',
    'smoothElev',
    'accumulatorAscent',
    'accumulatorDescent',
    'elevRatioColor',
    'computeElevationPanelHeight',
    'computeElevationLayout',
    'computeElevationRenderModel',
    'estimateElevationLabelStackDepth',
    'collectElevationAnnotations',
    'layoutElevationAnnotations',
    'buildElevationAnnotationRenderModel',
    'computeCumulativeDistance',
    'computeTrailStats',
    'generateNextTrailId',
    'enrichWaypoints',
    'trailContentHash',
    'stitchTrails',
    'parseKmlCoordinateText',
    'parseGxCoordText',
    'extractKmlImageUrl',
    'buildKmlParseModel',
    'normalizeIndexedDbStorageConfig',
    'buildStorageReadOperation',
    'buildStorageWriteOperation',
    'buildStorageDeleteOperation',
    'serializeStorageSnapshot',
    'restoreStorageSnapshot',
    'removeTrailFromPrimaryByGroup',
    'computeMeasureStats',
    'applyMeasureEndpointState',
    'reverseMeasureEndpoints',
    'computeSegmentStats',
    'buildMeasureSegmentRenderModel',
    'buildSegmentLayerModel',
    'buildDayPreviewRenderModel',
    'buildTrackLatLngs',
    'restoreSegmentIndexes',
    'moveSegmentBoundary',
    'buildDayMetaFromSegments',
    'buildDayMetaFromTrackDays',
  ].forEach(name => assert.strictEqual(typeof core[name], 'function', name));
});

T('core functions compose across modules', () => {
  const pts = [
    { lat: 30.0, lng: 100.0, elev: 1000 },
    { lat: 30.01, lng: 100.0, elev: 1120 },
    { lat: 30.02, lng: 100.0, elev: 1080 },
    { lat: 30.03, lng: 100.0, elev: 1250 },
  ];
  const cum = core.computeCumulativeDistance(pts);
  const elevs = pts.map(p => p.elev);
  const stats = core.computeTrailStats(elevs, cum, core.smoothElev(elevs, 1));
  assert.ok(stats.distance_km > 3);
  assert.strictEqual(stats.max_elev, 1250);
  assert.strictEqual(stats.min_elev, 1000);
  assert.ok(stats.ascent_m > stats.descent_m);
});

T('waypoint snap keeps input fields and assigns track fields', () => {
  const wps = [{ lat: 30.019, lng: 100.0, name: 'camp', tag: 'camp', desc: 'night' }];
  const pts = [
    { lat: 30.0, lng: 100.0, elev: 1000 },
    { lat: 30.02, lng: 100.0, elev: 1200 },
  ];
  const [wp] = core.enrichWaypoints(wps, pts);
  assert.strictEqual(wp.gps_idx, 1);
  assert.strictEqual(wp.elev, 1200);
  assert.strictEqual(wp.tag, 'camp');
  assert.strictEqual(wp.desc, 'night');
});

T('stitches ordered and reversible source trails without mutating them', () => {
  const first = {
    id:'a', name:'A', track:[[30,100,1000],[30.001,100,1100]],
    waypoints:[{id:'a-wp', name:'camp', lat:30.001, lng:100, gps_idx:1}],
  };
  const second = {
    id:'b', name:'B', track:[[30.002,100,1050],[30.001,100,1100]], waypoints:[],
  };
  const before = JSON.stringify([first, second]);
  const stitched = core.stitchTrails(
    [{trail:first}, {trail:second, reversed:true}],
    {id:'joined', name:'Joined'},
  );
  assert.strictEqual(stitched.track.length, 3);
  assert.strictEqual(stitched.stitch_junctions[0].merged, true);
  assert.strictEqual(stitched.waypoints[0].gps_idx, 1);
  assert.strictEqual(stitched.days, 0);
  assert.ok(stitched.stats.distance_km > 0);
  assert.strictEqual(JSON.stringify([first, second]), before);
});

T('stitches selected partial ranges and excludes out-of-range waypoints', () => {
  const first = {
    id:'a', name:'A',
    track:[[0,0,10],[0,0.001,20],[0,0.002,30],[0,0.003,40]],
    waypoints:[
      {id:'outside', name:'Outside', gps_idx:0, lat:0, lng:0},
      {id:'inside', name:'Inside', gps_idx:2, lat:0, lng:0.002},
    ],
  };
  const second = {
    id:'b', name:'B', track:[[0,0.003,40],[0,0.004,50],[0,0.005,60]], waypoints:[],
  };
  const stitched = core.stitchTrails([
    {trail:first, startIndex:1, endIndex:3},
    {trail:second, startIndex:0, endIndex:1},
  ], {id:'partial', name:'Partial'});
  assert.deepStrictEqual(stitched.track.map(point => point.slice(0, 2)), [
    [0,0.001], [0,0.002], [0,0.003], [0,0.004],
  ]);
  assert.deepStrictEqual(stitched.waypoints.map(waypoint => waypoint.name), ['Inside']);
  assert.deepStrictEqual(stitched.stitch_sources.map(source => [source.startIndex, source.endIndex]), [[1,3],[0,1]]);
});

T('keeps disconnected stitch parts out of distance and elevation gain', () => {
  const first = {id:'a', name:'A', track:[[0,0,100],[0,0.001,120]], waypoints:[]};
  const second = {id:'b', name:'B', track:[[1,1,4000],[1,1.001,4020]], waypoints:[]};
  const stitched = core.stitchTrails([
    {trail:first}, {trail:second},
  ], {id:'gap', name:'Gap route'});
  const expectedKm = (
    core.haversine(0, 0, 0, .001) + core.haversine(1, 1, 1, 1.001)
  ) / 1000;
  assert.deepStrictEqual(stitched.track_breaks, [2]);
  assert.strictEqual(stitched.stitch_junctions[0].breakIndex, 2);
  assert.ok(Math.abs(stitched.stats.distance_km - expectedKm) < .02);
  assert.ok(stitched.stats.ascent_m < 100);
  assert.strictEqual(stitched.track[2][3], stitched.track[1][3]);
});

T('preserves internal breaks when a stitched source is reused or reversed', () => {
  const source = {
    id:'source', name:'Source',
    track:[[0,0,10],[0,.001,20],[1,1,30],[1,1.001,40]],
    track_breaks:[2], waypoints:[],
  };
  const tail = {id:'tail', name:'Tail', track:[[2,2,50],[2,2.001,60]], waypoints:[]};
  const stitched = core.stitchTrails([
    {trail:source, reversed:true}, {trail:tail},
  ], {id:'nested', name:'Nested'});
  assert.deepStrictEqual(stitched.track_breaks, [2,4]);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
