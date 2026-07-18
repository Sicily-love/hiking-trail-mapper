/**
 * Unit test · KML parsing core helpers
 * Run: node tests/unit/test_kml_core.js
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

console.log('\n▸ KML core helpers');

T('parseKmlCoordinateText parses LineString coordinate triples', () => {
  assert.deepStrictEqual(
    core.parseKmlCoordinateText('100.1,30.2,4000 100.2,30.3,4010\nbad 100.3,30.4'),
    [
      [100.1, 30.2, 4000],
      [100.2, 30.3, 4010],
      [100.3, 30.4, 0],
    ],
  );
});

T('parseKmlCoordinateText skips invalid coordinates', () => {
  assert.deepStrictEqual(core.parseKmlCoordinateText('x,30,1 100,y,2 101,31,abc'), [[101, 31, 0]]);
  assert.deepStrictEqual(core.parseKmlCoordinateText(''), []);
});

T('parseGxCoordText parses gx:coord whitespace triples', () => {
  assert.deepStrictEqual(core.parseGxCoordText('100.1 30.2 4000'), [100.1, 30.2, 4000]);
  assert.deepStrictEqual(core.parseGxCoordText('100.1 30.2'), [100.1, 30.2, 0]);
  assert.strictEqual(core.parseGxCoordText('bad'), null);
});

T('kmlCoordsToTrackPoints attaches optional timestamps', () => {
  assert.deepStrictEqual(
    core.kmlCoordsToTrackPoints([[100, 30, 4000], [101, 31, 4100]], ['2026-01-01T00:00:00Z']),
    [
      { lng: 100, lat: 30, elev: 4000, t: '2026-01-01T00:00:00Z', spd: 0 },
      { lng: 101, lat: 31, elev: 4100, t: '', spd: 0 },
    ],
  );
});

T('extractKmlImageUrl prefers img src and falls back to direct image URL', () => {
  assert.strictEqual(core.extractKmlImageUrl('<p><img src="https://example.com/a.jpg"></p>'), 'https://example.com/a.jpg');
  assert.strictEqual(core.extractKmlImageUrl('photo https://example.com/b.webp end'), 'https://example.com/b.webp');
  assert.strictEqual(core.extractKmlImageUrl('no image here'), '');
});

T('shortKmlLabel removes numbered prefixes', () => {
  assert.strictEqual(core.shortKmlLabel('12. 营地'), '营地');
  assert.strictEqual(core.shortKmlLabel('  普通标注  '), '普通标注');
});

T('normalizeKmlTitle falls back when title is blank', () => {
  assert.strictEqual(core.normalizeKmlTitle('  Route A  '), 'Route A');
  assert.strictEqual(core.normalizeKmlTitle('   '), 'KML 轨迹');
});

T('classifyWaypointTag recognizes itinerary waypoint names', () => {
  assert.strictEqual(core.classifyWaypointTag('12. 仲达营地'), 'camp');
  assert.strictEqual(core.classifyWaypointTag('翻越山口垭口'), 'pass');
  assert.strictEqual(core.classifyWaypointTag('普通拍照位置'), 'other');
});

T('buildKmlParseModel combines LineString track points and metadata', () => {
  const model = core.buildKmlParseModel({
    title: ' Route A ',
    lineStringCoordinateTexts: ['100,30,4000 101,31,4100'],
    data: [
      { name: 'TrackId', value: 'T-1' },
      { name: 'BeginTime', value: '2026-01-01 08:00' },
    ],
  });
  assert.strictEqual(model.title, 'Route A');
  assert.deepStrictEqual(model.trackPoints, [
    { lng: 100, lat: 30, elev: 4000, t: '', spd: 0 },
    { lng: 101, lat: 31, elev: 4100, t: '', spd: 0 },
  ]);
  assert.strictEqual(model.trackId, 'T-1');
  assert.strictEqual(model.beginTime, '2026-01-01 08:00');
});

T('buildKmlParseModel records gaps between disconnected LineStrings', () => {
  const model = core.buildKmlParseModel({
    lineStringCoordinateTexts:['100,30,100 100.001,30,110', '101,31,4000 101.001,31,4010'],
  });
  assert.deepStrictEqual(model.trackBreaks, [2]);
});

T('buildKmlParseModel falls back to gx:Track only when LineString is empty', () => {
  const model = core.buildKmlParseModel({
    lineStringCoordinateTexts: ['bad'],
    gxTracks: [{
      coords: ['100 30 4000', '101 31 4100'],
      whens: ['2026-01-01T00:00:00Z'],
    }],
  });
  assert.deepStrictEqual(model.trackPoints, [
    { lng: 100, lat: 30, elev: 4000, t: '2026-01-01T00:00:00Z', spd: 0 },
    { lng: 101, lat: 31, elev: 4100, t: '', spd: 0 },
  ]);
});

T('buildKmlParseModel extracts waypoint coordinates and photos', () => {
  const model = core.buildKmlParseModel({
    waypoints: [
      { name: ' 12. 营地 ', coordinateText: '100,30,4000', description: '<img src="https://example.com/a.jpg">' },
      { coordinateText: '101,31,4100', description: 'none' },
      { name: 'bad', coordinateText: 'bad', description: '' },
    ],
  });
  assert.deepStrictEqual(model.waypoints, [
    { id: 1, name: '12. 营地', tag: 'camp', time: '', lng: 100, lat: 30, photo: 'https://example.com/a.jpg' },
    { id: 2, name: '标注点2', tag: 'other', time: '', lng: 101, lat: 31, photo: '' },
  ]);
});

T('buildKmlParseModel preserves LineString priority over gx:Track', () => {
  const model = core.buildKmlParseModel({
    lineStringCoordinateTexts: ['100,30,4000'],
    gxTracks: [{ coords: ['101 31 4100'] }],
  });
  assert.deepStrictEqual(model.trackPoints, [
    { lng: 100, lat: 30, elev: 4000, t: '', spd: 0 },
  ]);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
