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

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
