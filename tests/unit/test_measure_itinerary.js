/**
 * Unit test · measurement and itinerary core contracts
 * Run: node tests/unit/test_measure_itinerary.js
 */
const assert = require('assert');
const core = require('./trail_core');

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

const track = [
  [30.0000, 100.0000, 1000, 0, 0, 1],
  [30.0100, 100.0000, 1120, 1.1, 120, 1],
  [30.0200, 100.0000, 1080, 2.2, 120, 2],
  [30.0300, 100.0000, 1260, 3.3, 300, 2],
  [30.0400, 100.0000, 1180, 4.4, 300, 3],
];

console.log('\n▸ measure core');

T('pointFromTrackIndex clamps and exposes map fields', () => {
  const p = core.pointFromTrackIndex(track, 999);
  assert.strictEqual(p.idx, 4);
  assert.strictEqual(p.elev, 1180);
  assert.strictEqual(p.km, 4.4);
});

T('computeSegmentStats keeps A/B direction for ascent and descent', () => {
  const forward = core.computeSegmentStats(track, 1, 3);
  const reversed = core.computeSegmentStats(track, 3, 1);
  assert.strictEqual(forward.iStart, 1);
  assert.strictEqual(forward.iEnd, 3);
  assert.strictEqual(forward.reversed, false);
  assert.strictEqual(reversed.reversed, true);
  assert.strictEqual(forward.asc, reversed.desc);
  assert.strictEqual(forward.desc, reversed.asc);
  assert.strictEqual(forward.maxE, 1260);
  assert.strictEqual(forward.minE, 1080);
  assert.ok(forward.km > 2);
  assert.strictEqual(forward.kmText, forward.km.toFixed(2));
});

T('buildTrackLatLngs preserves first and last point when thinning', () => {
  const ll = core.buildTrackLatLngs(track, 0, 4, 3);
  assert.strictEqual(ll.length, 3);
  assert.deepStrictEqual(ll[0], [track[0][0], track[0][1]]);
  assert.deepStrictEqual(ll[2], [track[4][0], track[4][1]]);
});

T('computeMeasureStats mirrors cumulative readout fields', () => {
  const descCum = core.accumulatorDescent(track.map(p => p[2]), 10);
  const stats = core.computeMeasureStats(track, 1, 3, descCum);
  assert.strictEqual(stats.distKm.toFixed(2), '2.20');
  assert.strictEqual(stats.asc, 180);
  assert.strictEqual(stats.desc, 40);
  assert.strictEqual(stats.maxE, 1260);
  assert.strictEqual(stats.minE, 1080);
});

T('computeMeasureStats swaps ascent and descent for reversed A/B', () => {
  const descCum = core.accumulatorDescent(track.map(p => p[2]), 10);
  const forward = core.computeMeasureStats(track, 1, 3, descCum);
  const reversed = core.computeMeasureStats(track, 3, 1, descCum);
  assert.strictEqual(reversed.reversed, true);
  assert.strictEqual(reversed.asc, forward.desc);
  assert.strictEqual(reversed.desc, forward.asc);
});

T('applyMeasureEndpointState updates one endpoint and rejects collisions', () => {
  const a = core.pointFromTrackIndex(track, 1);
  const b = core.pointFromTrackIndex(track, 3);
  const nextA = core.pointFromTrackIndex(track, 2);
  const updated = core.applyMeasureEndpointState(a, b, 'A', nextA);
  assert.strictEqual(updated.ok, true);
  assert.strictEqual(updated.ptA.idx, 2);
  assert.strictEqual(updated.ptB.idx, 3);
  const collision = core.applyMeasureEndpointState(updated.ptA, updated.ptB, 'A', updated.ptB);
  assert.strictEqual(collision.ok, false);
  assert.strictEqual(collision.reason, 'same-as-other');
});

T('reverseMeasureEndpoints swaps A and B only when both exist', () => {
  const a = core.pointFromTrackIndex(track, 1);
  const b = core.pointFromTrackIndex(track, 3);
  assert.strictEqual(core.reverseMeasureEndpoints(a, null), null);
  const reversed = core.reverseMeasureEndpoints(a, b);
  assert.strictEqual(reversed.ptA.idx, 3);
  assert.strictEqual(reversed.ptB.idx, 1);
});

T('render models separate geometry data from Leaflet rendering', () => {
  const a = core.pointFromTrackIndex(track, 1);
  const b = core.pointFromTrackIndex(track, 3);
  const measureModel = core.buildMeasureSegmentRenderModel(track, a, b, 3);
  assert.strictEqual(measureModel.iStart, 1);
  assert.strictEqual(measureModel.iEnd, 3);
  assert.strictEqual(measureModel.latLngs.length, 3);
  assert.deepStrictEqual(measureModel.lineStyle, { color: '#fbbf24', weight: 6, opacity: 0.9, interactive: false });

  const points = core.segmentIndexesToPoints(track, [0, 2, 4]);
  const model = core.buildSegmentLayerModel(track, points, ['#111', '#222'], 4);
  assert.deepStrictEqual(model.segments.map(s => s.day), [1, 2]);
  assert.deepStrictEqual(model.segments.map(s => s.color), ['#111', '#222']);
  assert.deepStrictEqual(model.segments.map(s => s.lineStyle.color), ['#111', '#222']);
  assert.deepStrictEqual(model.markers.map(m => m.label), ['起', 'D1', '终']);
  assert.strictEqual(model.markers[1].isBoundary, true);
  assert.deepStrictEqual(model.markers[1].markerOptions, { draggable: true, autoPan: true });

  const dayPreview = core.buildDayPreviewRenderModel(track, { iStart: 1, iEnd: 3 }, 3);
  assert.strictEqual(dayPreview.iStart, 1);
  assert.strictEqual(dayPreview.iEnd, 3);
  assert.strictEqual(dayPreview.latLngs.length, 3);
  assert.deepStrictEqual(dayPreview.fitOptions, { padding: [60, 60] });
  assert.deepStrictEqual(dayPreview.endpoints.map(endpoint => endpoint.label), ['A', 'B']);
  assert.deepStrictEqual(dayPreview.endpoints.map(endpoint => endpoint.lat), [30.01, 30.03]);
});

T('collectElevationAnnotations builds peak/low, A/B, and camp labels', () => {
  const layout = {
    alts: track.map(p => p[2]),
    minE: 1000,
    maxE: 1260,
    km: track.map(p => p[3]),
    kmRange: 4.4,
  };
  const annotations = core.collectElevationAnnotations(track, layout, {
    measureMode: true,
    waypoints: [{ lat: 30.03, lng: 100, name: 'Camp', label: 'Camp', tag: 'camp', gps_idx: 3, elev: 1260 }],
    segIdxStart: 0,
    segIdxEnd: 4,
  });
  assert.deepStrictEqual(annotations.map(a => a.kind), ['low', 'measure-a', 'peak', 'camp', 'measure-b']);
  assert.strictEqual(annotations.find(a => a.kind === 'measure-a').text, 'A 1000m');
  assert.strictEqual(annotations.find(a => a.kind === 'measure-b').text, 'B 1180m');
  assert.strictEqual(annotations.find(a => a.kind === 'camp').text, 'Camp 1260m');
});

T('computeElevationLayout builds full-track chart geometry', () => {
  const layout = core.computeElevationLayout(track, { width: 340, height: 140 });
  assert.strictEqual(layout.W, 340);
  assert.strictEqual(layout.H, 140);
  assert.strictEqual(layout.PL, 44);
  assert.strictEqual(layout.PR, 16);
  assert.strictEqual(layout.PT, 22);
  assert.strictEqual(layout.PB, 34);
  assert.strictEqual(layout.minE, 1000);
  assert.strictEqual(layout.maxE, 1260);
  assert.strictEqual(layout.kmStart, 0);
  assert.strictEqual(layout.kmEnd, 4.4);
  assert.strictEqual(+layout.pX(0).toFixed(2), 44);
  assert.strictEqual(+layout.pX(4).toFixed(2), 324);
  assert.strictEqual(+layout.pY(1260).toFixed(2), 22);
});

T('computeElevationLayout supports measure mode km-from-zero geometry', () => {
  const seg = track.slice(1, 4);
  const layout = core.computeElevationLayout(seg, {
    width: 340,
    height: 160,
    measureMode: true,
    kmFromZero: true,
  });
  assert.strictEqual(layout.PL, 58);
  assert.strictEqual(layout.PR, 58);
  assert.strictEqual(layout.pw, 224);
  assert.strictEqual(layout.ph, 104);
  assert.strictEqual(layout.kmStart, 0);
  assert.ok(layout.kmEnd > 2);
  assert.strictEqual(+layout.pX(0).toFixed(2), 58);
  assert.strictEqual(+layout.pX(2).toFixed(2), 282);
});

T('computeElevationRenderModel exposes paths, ticks, and badges', () => {
  const layout = core.computeElevationLayout(track, { width: 340, height: 140 });
  const model = core.computeElevationRenderModel(track, layout);
  assert.strictEqual(model.curve.length, 5);
  assert.strictEqual(model.fillPolygon.length, 7);
  assert.deepStrictEqual(model.gridLines.map(line => line.y1), [85, 64, 43]);
  assert.deepStrictEqual(model.baseline, { x1: 44, y1: 106, x2: 324, y2: 106 });
  assert.deepStrictEqual(model.ticks.map(t => t.label), ['0.0 km', '1.5 km', '2.9 km', '4.4 km']);
  assert.deepStrictEqual(model.ticks.map(t => t.align), ['left', 'center', 'center', 'right']);
  assert.deepStrictEqual(model.badges, {
    ascent: 300,
    descent: 120,
    ascentText: '↑300m',
    descentText: '↓120m',
  });
  assert.deepStrictEqual(model.background.gradient.stops, [
    { offset: 0, color: '#F7F9F6' },
    { offset: 1, color: '#E6ECE7' },
  ]);
  assert.deepStrictEqual(model.background.noise, {
    count: 110,
    rgb: [46, 74, 57],
    maxAlpha: 0.035,
    size: 1,
  });
  assert.deepStrictEqual(model.gridStyle, {
    strokeStyle: 'rgba(78,101,86,0.24)',
    lineWidth: 1,
    lineDash: [2, 4],
  });
  assert.deepStrictEqual(model.fillStyle.gradient.stops, [
    { offset: 0, color: 'rgba(53,78,60,0.62)' },
    { offset: 0.55, color: 'rgba(118,151,106,0.42)' },
    { offset: 1, color: 'rgba(220,226,200,0.18)' },
  ]);
  assert.deepStrictEqual(model.curveStyle, {
    strokeStyle: '#294C39',
    lineWidth: 1.6,
    lineJoin: 'round',
    lineCap: 'round',
  });
  assert.deepStrictEqual(model.baselineStyle, {
    strokeStyle: 'rgba(88,108,95,0.58)',
    lineWidth: 1,
  });
  assert.deepStrictEqual(model.axisStyle, {
    tickLine: {
      strokeStyle: 'rgba(88,108,95,0.64)',
      lineWidth: 1,
    },
    tickText: {
      fillStyle: '#526259',
      font: "italic 9.5px 'Source Serif 4', serif",
    },
    axisLabel: {
      fillStyle: '#7A887F',
      font: "9px 'Source Serif 4', 'PingFang SC', serif",
      textAlign: 'center',
    },
  });
  assert.deepStrictEqual(model.xAxisLabel, { x: 184, y: 136 });
});

T('estimateElevationLabelStackDepth predicts label crowding', () => {
  const layout = core.computeElevationLayout(track, { width: 340, height: 140 });
  const annotations = core.collectElevationAnnotations(track, layout, {
    measureMode: true,
    waypoints: [{ lat: 30.03, lng: 100, name: 'Camp', label: 'Camp', tag: 'camp', gps_idx: 3, elev: 1260 }],
    segIdxStart: 0,
    segIdxEnd: 4,
  });
  const estimate = core.estimateElevationLabelStackDepth(annotations, layout, {
    measureText: text => text.length * 6,
  });
  assert.strictEqual(estimate.labelCount, 5);
  assert.strictEqual(estimate.fontSize, 9.5);
  assert.strictEqual(estimate.lineHeight, 12.5);
  assert.ok(estimate.stackDepth >= 1);
  const single = core.estimateElevationLabelStackDepth(annotations.slice(0, 1), layout);
  assert.deepStrictEqual(single, { labelCount: 1, fontSize: 9.5, lineHeight: 12.5, stackDepth: 1 });
});

T('elevation annotation layout and render commands stay Canvas-independent', () => {
  const layout = core.computeElevationLayout(track, { width: 340, height: 180, measureMode: true });
  const annotations = core.collectElevationAnnotations(track, layout, { measureMode: true });
  const sourceSnapshot = JSON.stringify(annotations);
  const placed = core.layoutElevationAnnotations(annotations, layout, {
    measureText: text => text.length * 6,
  });
  assert.strictEqual(JSON.stringify(annotations), sourceSnapshot);
  assert.ok(placed.font.includes('9.5px'));
  assert.strictEqual(placed.annotations.length, annotations.length);
  placed.annotations.filter(annotation => annotation.text).forEach(annotation => {
    assert.ok(Number.isFinite(annotation.x));
    assert.ok(Number.isFinite(annotation.anchorY));
    assert.ok(Number.isFinite(annotation.labelLeft));
    assert.ok(Number.isFinite(annotation.labelTop));
  });

  const render = core.buildElevationAnnotationRenderModel(placed);
  assert.strictEqual(render.commands.length, annotations.length);
  assert.strictEqual(render.textStyle.font, placed.font);
  assert.strictEqual(render.dotStrokeWidth, 0.8);
  assert.ok(render.commands.some(command => command.leader && command.text));
  assert.deepStrictEqual(render.leaderStyle, {
    strokeStyle: 'rgba(41,76,57,0.48)',
    lineWidth: 0.6,
  });
});

T('computeElevationPanelHeight clamps adaptive elevation height', () => {
  assert.strictEqual(core.computeElevationPanelHeight({
    labelCount: 1,
    fontSize: 9.5,
    lineHeight: 12.5,
    stackDepth: 1,
  }), 155);
  assert.strictEqual(core.computeElevationPanelHeight({
    labelCount: 12,
    fontSize: 7.5,
    lineHeight: 10.5,
    stackDepth: 40,
  }), 340);
  assert.strictEqual(core.computeElevationPanelHeight({
    labelCount: 0,
    fontSize: 9.5,
    lineHeight: 12.5,
    stackDepth: 1,
  }, { minHeight: 180 }), 180);
});

T('collectElevationAnnotations maps camp index correctly for reversed segments', () => {
  const seg = track.slice(1, 4).reverse();
  const layout = {
    alts: seg.map(p => p[2]),
    minE: 1080,
    maxE: 1260,
    km: [0, 1.1, 2.2],
    kmRange: 2.2,
  };
  const annotations = core.collectElevationAnnotations(seg, layout, {
    waypoints: [{ lat: 30.03, lng: 100, name: 'High Camp', label: 'High Camp', tag: 'camp', gps_idx: 3, elev: 1260 }],
    segIdxStart: 1,
    segIdxEnd: 3,
    reversed: true,
  });
  const camp = annotations.find(a => a.kind === 'camp');
  assert.strictEqual(camp.idx, 0);
  assert.strictEqual(camp.text, 'High Camp 1260m');
});

console.log('\n▸ itinerary core');

T('normalizeSegmentIndexes always includes start and end', () => {
  assert.deepStrictEqual(core.normalizeSegmentIndexes(track, [3, 1, 3]), [0, 1, 3, 4]);
});

T('restoreSegmentIndexes prefers saved day_meta boundaries', () => {
  const dayMeta = [
    { d: 1, i_start: 0, i_end: 2 },
    { d: 2, i_start: 2, i_end: 4 },
  ];
  assert.deepStrictEqual(core.restoreSegmentIndexes(track, dayMeta), [0, 2, 4]);
});

T('restoreSegmentIndexes falls back to explicit track day ids', () => {
  assert.deepStrictEqual(core.restoreSegmentIndexes(track, []), [0, 1, 3, 4]);
});

T('restoreSegmentIndexes defaults to start and end without day data', () => {
  const plainTrack = track.map(p => p.slice(0, 5));
  assert.deepStrictEqual(core.restoreSegmentIndexes(plainTrack, []), [0, 4]);
});

T('getDayIndexRange prefers saved day_meta boundaries', () => {
  const dayMeta = [
    { d: 1, i_start: 0, i_end: 2, km: 2.2 },
    { d: 2, i_start: 2, i_end: 4, km: 2.2 },
  ];
  assert.deepStrictEqual(core.getDayIndexRange({ track, day_meta: dayMeta }, dayMeta[1]), {
    iStart: 2,
    iEnd: 4,
  });
});

T('getDayIndexRange falls back to explicit day ids and then cumulative km', () => {
  assert.deepStrictEqual(core.getDayIndexRange({ track, day_meta: [] }, { d: 2 }), {
    iStart: 2,
    iEnd: 3,
  });
  const plainTrack = track.map(p => p.slice(0, 5));
  const dayMeta = [{ d: 1, km: 2.2 }, { d: 2, km: 2.2 }];
  assert.deepStrictEqual(core.getDayIndexRange({ track: plainTrack, day_meta: dayMeta }, dayMeta[1]), {
    iStart: 2,
    iEnd: 4,
  });
});

T('computeDayRangeStats uses the same cumulative fields as Day preview', () => {
  const stats = core.computeDayRangeStats({ track, day_meta: [] }, { iStart: 1, iEnd: 3 });
  assert.strictEqual(stats.km.toFixed(2), '2.20');
  assert.strictEqual(stats.asc, 180);
  assert.strictEqual(stats.desc, 40);
  assert.strictEqual(stats.max, 1260);
  assert.strictEqual(stats.min, 1080);
});

T('insertSegmentPoint returns a new ordered point list', () => {
  const pts = core.segmentIndexesToPoints(track, [0, 4]);
  const result = core.insertSegmentPoint(pts, core.pointFromTrackIndex(track, 2));
  assert.strictEqual(result.insertAt, 1);
  assert.deepStrictEqual(result.points.map(p => p.idx), [0, 2, 4]);
  assert.deepStrictEqual(pts.map(p => p.idx), [0, 4]);
});

T('deleteSegmentDay removes the correct boundary point', () => {
  const pts = core.segmentIndexesToPoints(track, [0, 1, 3, 4]);
  assert.deepStrictEqual(core.deleteSegmentDay(pts, 2).map(p => p.idx), [0, 1, 4]);
  assert.deepStrictEqual(core.deleteSegmentDay(pts, 3).map(p => p.idx), [0, 1, 4]);
});

T('moveSegmentBoundary owns ordering and collision validation', () => {
  const points = core.segmentIndexesToPoints(track, [0, 2, 4]);
  const moved = core.moveSegmentBoundary(points, 1, core.pointFromTrackIndex(track, 3));
  assert.strictEqual(moved.ok, true);
  assert.strictEqual(moved.changed, true);
  assert.deepStrictEqual(moved.points.map(point => point.idx), [0, 3, 4]);
  assert.deepStrictEqual(points.map(point => point.idx), [0, 2, 4]);

  const duplicate = core.moveSegmentBoundary(points, 1, core.pointFromTrackIndex(track, 4));
  assert.strictEqual(duplicate.ok, false);
  assert.strictEqual(duplicate.reason, 'duplicate');
  const beforePrevious = core.moveSegmentBoundary(points, 1, { idx: -1, lat: 0, lng: 0, elev: 0, km: 0 });
  assert.strictEqual(beforePrevious.ok, false);
  assert.strictEqual(beforePrevious.reason, 'before-previous');
  const afterNext = core.moveSegmentBoundary(points, 1, { idx: 5, lat: 0, lng: 0, elev: 0, km: 0 });
  assert.strictEqual(afterNext.reason, 'after-next');
  const endpoint = core.moveSegmentBoundary(points, 0, core.pointFromTrackIndex(track, 1));
  assert.strictEqual(endpoint.reason, 'endpoint');
});

T('camp edit renumbering preserves user edits across insert and delete', () => {
  const edits = { 1: { name: 'A' }, 3: { name: 'C' } };
  assert.deepStrictEqual(core.renumberCampEditsForInsert(edits, 2), {
    1: { name: 'A' },
    4: { name: 'C' },
  });
  assert.deepStrictEqual(core.renumberCampEditsForDelete({ 1: { name: 'A' }, 3: { name: 'C' } }, 2, 3), {
    1: { name: 'A' },
    2: { name: 'C' },
  });
});

T('buildDayMetaFromSegments emits stable day stats and camp edits', () => {
  const pts = core.segmentIndexesToPoints(track, [0, 2, 4]);
  const meta = core.buildDayMetaFromSegments(track, pts, { 1: { name: 'Camp A', elev: 1099 } });
  assert.strictEqual(meta.length, 2);
  assert.strictEqual(meta[0].d, 1);
  assert.strictEqual(meta[0].camp, 'Camp A');
  assert.strictEqual(meta[0].camp_elev, 1099);
  assert.strictEqual(meta[0].i_start, 0);
  assert.strictEqual(meta[0].i_end, 2);
  assert.ok(meta[0].km > 2);
  assert.ok(meta[0].seg.includes('起 1000m'));
});

T('buildDayMetaFromTrackDays attaches nearby camp waypoints to the containing day', () => {
  const wps = [{ lat: 30.03, lng: 100, name: 'Night 2', label: 'Night 2', tag: 'camp', gps_idx: 3, elev: 1260 }];
  const meta = core.buildDayMetaFromTrackDays(track, wps);
  const day2 = meta.find(d => d.d === 2);
  assert.strictEqual(day2.camp, 'Night 2');
  assert.strictEqual(day2.camp_elev, 1260);
  assert.strictEqual(day2.i_start, 2);
  assert.strictEqual(day2.i_end, 3);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
