/**
 * Unit test: Performance 2.0 pure core helpers.
 * Run: node tests/unit/test_performance_core.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const performanceCore = require('../../src/core/performance/index.ts');

let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch(error) {
    console.log(`  ✗ ${name}\n    ${error.stack || error.message}`);
    failed++;
  }
};

function makeTrack(count, elevationAt = index => index) {
  return Array.from({length: count}, (_, index) => [
    30 + index / 100000,
    100 + index / 100000,
    elevationAt(index),
    index / 100,
    index,
    (index % 5) + 1,
  ]);
}

function assertOrderedSubset(samples, source) {
  let previousIndex = -1;
  for(const sample of samples) {
    const index = source.indexOf(sample);
    assert.ok(index > previousIndex, `sample index ${index} must follow ${previousIndex}`);
    previousIndex = index;
  }
}

console.log('\n▸ Performance 2.0 pure core');

T('exports the performance core contract', () => {
  [
    'quantizeElevationBand',
    'elevationBandRatio',
    'buildElevationPolylineSegments',
    'downsampleMinMaxIndices',
    'downsampleForCanvas',
    'downsampleTrackForCanvas',
    'planKeyedWaypointDiff',
    'planWaypointDiff',
    'createTrackSignature',
    'createTrackRevision',
    'nextTrackRevision',
  ].forEach(name => assert.strictEqual(typeof performanceCore[name], 'function', name));
  assert.strictEqual(performanceCore.DEFAULT_ELEVATION_BAND_COUNT, 40);
});

T('elevation quantization clamps into 40 bands and exposes palette endpoints', () => {
  const {quantizeElevationBand, elevationBandRatio} = performanceCore;
  assert.strictEqual(quantizeElevationBand(-100, 0, 100), 0);
  assert.strictEqual(quantizeElevationBand(0, 0, 100), 0);
  assert.strictEqual(quantizeElevationBand(50, 0, 100), 20);
  assert.strictEqual(quantizeElevationBand(100, 0, 100), 39);
  assert.strictEqual(quantizeElevationBand(200, 0, 100), 39);
  assert.strictEqual(elevationBandRatio(0), 0);
  assert.strictEqual(elevationBandRatio(39), 1);
  assert.throws(() => quantizeElevationBand(0, 0, 1, 0), /bandCount/);
});

T('10k oscillating elevations produce at most 40 polyline render groups', () => {
  const track = makeTrack(10000, index => {
    const phase = index % 4;
    return phase < 2 ? phase * 10 : 1000 - (phase - 2) * 10;
  });
  const segments = performanceCore.buildElevationPolylineSegments(track);
  const paths = segments.flatMap(segment => segment.paths);
  const edgeCount = segments.reduce((sum, segment) => sum + segment.edgeCount, 0);
  const coordinateCount = paths.reduce((sum, run) => sum + run.latLngs.length, 0);

  assert.ok(segments.length <= 40, `got ${segments.length} render groups`);
  assert.strictEqual(edgeCount, track.length - 1);
  assert.ok(coordinateCount <= 2 * (track.length - 1));
  assert.ok(paths.some(run => run.startIndex === 0));
  assert.ok(paths.some(run => run.endIndex === track.length - 1));
  segments.forEach(segment => {
    assert.ok(segment.bandIndex >= 0 && segment.bandIndex < 40);
    segment.paths.forEach(run => {
      assert.strictEqual(run.latLngs.length, run.endIndex - run.startIndex + 1);
      run.latLngs.flat().forEach(value => assert.ok(Number.isFinite(value)));
    });
  });
});

T('1k monotonic elevations stay bounded and every path joins adjacent source points', () => {
  const track = makeTrack(1000, index => index);
  const segments = performanceCore.buildElevationPolylineSegments(track);
  const paths = segments.flatMap(segment => segment.paths);
  assert.ok(segments.length <= 40);
  assert.ok(paths.length <= 40);
  for(const run of paths) {
    assert.deepStrictEqual(run.latLngs[0], track[run.startIndex].slice(0, 2));
    assert.deepStrictEqual(run.latLngs.at(-1), track[run.endIndex].slice(0, 2));
  }
});

for(const [count, pixelWidth] of [[1000, 120], [10000, 320]]) {
  T(`${count} point canvas downsample preserves endpoints/min/max within 2x width`, () => {
    const points = Array.from({length: count}, (_, index) => ({
      index,
      elevation: Math.sin(index / 13) * 200 + index / count,
    }));
    const minPoint = points[Math.floor(count * 0.31)];
    const maxPoint = points[Math.floor(count * 0.73)];
    minPoint.elevation = -99999;
    maxPoint.elevation = 99999;

    const samples = performanceCore.downsampleForCanvas(
      points,
      pixelWidth,
      point => point.elevation,
    );

    assert.ok(samples.length <= 2 * pixelWidth, `${samples.length} exceeds ${2 * pixelWidth}`);
    assert.strictEqual(samples[0], points[0]);
    assert.strictEqual(samples.at(-1), points.at(-1));
    assert.ok(samples.includes(minPoint), 'global minimum was dropped');
    assert.ok(samples.includes(maxPoint), 'global maximum was dropped');
    assertOrderedSubset(samples, points);
  });
}

T('track canvas wrapper keeps tuple identity and extreme elevations', () => {
  const track = makeTrack(1000, index => index % 17);
  track[411][2] = -5000;
  track[812][2] = 9000;
  const samples = performanceCore.downsampleTrackForCanvas(track, 80);
  assert.ok(samples.length <= 160);
  assert.strictEqual(samples[0], track[0]);
  assert.strictEqual(samples.at(-1), track.at(-1));
  assert.ok(samples.includes(track[411]));
  assert.ok(samples.includes(track[812]));
});

T('waypoint diff plans add/update/remove/keep in stable list order', () => {
  const previous = [
    {id: 'remove', name: 'old'},
    {id: 'keep', name: 'same'},
    {id: 'update', name: 'before'},
  ];
  const next = [
    {id: 'keep', name: 'same'},
    {id: 'update', name: 'after'},
    {id: 'add', name: 'new'},
  ];
  const plan = performanceCore.planWaypointDiff(previous, next);
  assert.deepStrictEqual(plan.add.map(item => item.key), ['add']);
  assert.deepStrictEqual(plan.update.map(item => item.key), ['update']);
  assert.deepStrictEqual(plan.remove.map(item => item.key), ['remove']);
  assert.deepStrictEqual(plan.keep.map(item => item.key), ['keep']);
  assert.strictEqual(plan.changed, true);
  assert.strictEqual(plan.update[0].previousIndex, 2);
  assert.strictEqual(plan.update[0].nextIndex, 1);
});

T('custom waypoint keys/equality work and duplicate keys fail fast', () => {
  const previous = [{code: 1, nested: {value: 1}}];
  const next = [{code: 1, nested: {value: 1}}];
  let keyCalls = 0;
  const plan = performanceCore.planKeyedWaypointDiff(
    previous,
    next,
    waypoint => {
      keyCalls++;
      return waypoint.code;
    },
    (left, right) => left.nested.value === right.nested.value,
  );
  assert.deepStrictEqual(plan.keep.map(item => item.key), [1]);
  assert.strictEqual(plan.changed, false);
  assert.strictEqual(keyCalls, previous.length + next.length);
  assert.throws(
    () => performanceCore.planWaypointDiff([{id: 'x'}, {id: 'x'}], []),
    /duplicate key x/,
  );
});

T('track signature covers interior points and all tuple fields', () => {
  const track = makeTrack(10000, index => 1000 + index % 300);
  const same = track.map(point => point.slice());
  const changedInterior = same.map(point => point.slice());
  changedInterior[4321][2] += 1;
  const changedDay = same.map(point => point.slice());
  changedDay[4321][5] += 1;

  const signature = performanceCore.createTrackSignature(track);
  assert.match(signature, /^track-v1:10000:[0-9a-f]{16}$/);
  assert.strictEqual(performanceCore.createTrackSignature(same), signature);
  assert.notStrictEqual(performanceCore.createTrackSignature(changedInterior), signature);
  assert.notStrictEqual(performanceCore.createTrackSignature(changedDay), signature);
  assert.ok(signature.length < 64, `signature unexpectedly large: ${signature.length}`);
});

T('track revision remains stable or advances exactly once from signatures', () => {
  const track = makeTrack(1000, index => 1000 + index);
  const initial = performanceCore.createTrackRevision(track, 7);
  const same = performanceCore.nextTrackRevision(initial, track.map(point => point.slice()));
  assert.deepStrictEqual(same, {...initial, changed: false});

  const changedTrack = track.map(point => point.slice());
  changedTrack[500][0] += 0.00001;
  const changed = performanceCore.nextTrackRevision(same, changedTrack);
  assert.strictEqual(changed.changed, true);
  assert.strictEqual(changed.revision, 8);
  assert.notStrictEqual(changed.signature, same.signature);
  assert.strictEqual(changed.pointCount, track.length);
});

T('performance core has no DOM or Leaflet dependency', () => {
  const dir = path.resolve(__dirname, '../../src/core/performance');
  const source = fs.readdirSync(dir)
    .filter(file => file.endsWith('.ts'))
    .map(file => fs.readFileSync(path.join(dir, file), 'utf8'))
    .join('\n');
  assert.ok(!/\b(?:document|window|HTMLElement|Leaflet)\b/.test(source));
  assert.ok(!/\bL\s*\./.test(source));
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
