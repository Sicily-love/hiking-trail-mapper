/**
 * Generated release runtime vs src/core behavior alignment.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = require('../../src/core/index.ts');

const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'hiking-trail-mapper.html'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const bundle = html.match(/<script data-generated-core-runtime[^>]*>([\s\S]*?)<\/script>/)?.[1];
if(!bundle) throw new Error('Generated core runtime not found');
const context = {};
vm.runInNewContext(bundle, context);
const embedded = context.HikingTrailCore;

let passed = 0;
let failed = 0;
function T(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch(error) {
    console.log(`  ✗ ${name}\n    ${error.message}`);
    failed++;
  }
}
const plain = value => JSON.parse(JSON.stringify(value));
const same = (name, args) => T(name, () => {
  assert.deepStrictEqual(plain(embedded[name](...args)), plain(source[name](...args)));
});

console.log('\n▸ Generated HTML ↔ src/core runtime alignment');
T('root release entries are identical', () => assert.strictEqual(index, html));
T('all TypeScript exports exist in embedded runtime', () => {
  Object.keys(source).forEach(name => assert.strictEqual(typeof embedded[name], typeof source[name], name));
});

const track = [
  [30, 100, 1000, 0, 0, 1],
  [30.001, 100.001, 1080, 0.15, 80, 1],
  [30.002, 100.002, 1020, 0.30, 80, 2],
  [30.003, 100.003, 1150, 0.45, 210, 2],
];
const points = [source.pointFromTrackIndex(track, 0), source.pointFromTrackIndex(track, 3)];

same('haversine', [30, 100, 31, 101]);
same('smoothElev', [[1000, 1010, 1200, 1020], 3]);
same('accumulatorAscent', [[1000, 1080, 1020, 1150], 10]);
same('accumulatorDescent', [[1000, 1080, 1020, 1150], 10]);
same('computeCumulativeDistance', [[{lat: 30, lng: 100}, {lat: 30.1, lng: 100.1}]]);
same('computeSegmentStats', [track, 0, 3]);
same('computeMeasureStats', [track, 0, 3]);
same('buildTrackLatLngs', [track, 0, 3, 3]);
same('buildMeasureSegmentRenderModel', [track, points[0], points[1], 3]);
same('buildSegmentLayerModel', [track, points, ['#255C43'], 3]);
same('buildDayPreviewRenderModel', [track, {iStart: 0, iEnd: 3}, 3]);
same('normalizeSegmentIndexes', [track, [2]]);
same('restoreSegmentIndexes', [track, []]);
same('getDayIndexRange', [{track, day_meta: []}, {d: 2, i_start: 2, i_end: 3}]);
same('segmentIndexesToPoints', [track, [0, 2, 3]]);
same('insertSegmentPoint', [[points[0], points[1]], source.pointFromTrackIndex(track, 2)]);
same('buildKmlParseModel', [{title: 'T', lineStringCoordinateTexts: ['100,30,1000 101,31,1100']}]);
same('serializeStorageSnapshot', [[{id: '1', group: 'A'}], {activeTrails: new Set(['1']), primaryByGroup: {A: '1'}, activeGroup: 'A', primaryTrailId: '1'}]);
same('elevRatioColor', [0.55]);

T('elevation layout geometry stays aligned', () => {
  const a = embedded.computeElevationLayout(track, {width: 360, height: 180, measureMode: true, kmFromZero: true});
  const b = source.computeElevationLayout(track, {width: 360, height: 180, measureMode: true, kmFromZero: true});
  assert.deepStrictEqual(plain({W:a.W, H:a.H, minE:a.minE, maxE:a.maxE, x:a.pX(2), y:a.pY(1080)}),
    plain({W:b.W, H:b.H, minE:b.minE, maxE:b.maxE, x:b.pX(2), y:b.pY(1080)}));
});
T('core fallbacks are absent from browser runtime source', () => {
  const runtime = fs.readFileSync(path.join(root, 'src/app/runtime.js'), 'utf8');
  ['haversine', 'buildTrackLatLngs', 'buildSegmentLayerModel', 'computeElevationRenderModel']
    .forEach(name => assert.ok(!new RegExp(`function\\s+${name}\\s*\\(`).test(runtime), name));
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} generated-runtime checks`);
process.exit(failed === 0 ? 0 : 1);
