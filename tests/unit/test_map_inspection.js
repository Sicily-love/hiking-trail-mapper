const assert = require('assert');
const app = require('../../src/app/index.ts');

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  PASS ${name}`);
};

function fixture() {
  const shown = [];
  const removed = [];
  const timers = new Map();
  let nextTimer = 0;
  const controller = app.createTrackPointInspectionController({
    nearestIndex:() => 1,
    renderer:{show(model) {
      shown.push(model);
      return {remove:() => removed.push(model.position)};
    }},
    schedule(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    cancelSchedule(id) { timers.delete(id); },
    visibleMs:8000,
  });
  return {controller, shown, removed, timers};
}

console.log('\nTrack point inspection controller');

test('formats valid and missing coordinates consistently', () => {
  assert.strictEqual(app.formatCoordinate(30.12345678), '30.123457');
  assert.strictEqual(app.formatCoordinate(undefined), '-');
  assert.strictEqual(app.formatTrackPointCoordinates([30.1, 100.2]), '30.100000, 100.200000');
});

test('shows the nearest point with a bounded safe render model', () => {
  const {controller, shown, timers} = fixture();
  const result = controller.inspect({latlng:{lat:30, lng:100}}, {
    color:'#123456',
    track:[[30,100,1000,0], [30.1,100.1,1123.6,1.25]],
  });
  assert.strictEqual(result, true);
  assert.deepStrictEqual(shown[0].position, [30.1,100.1]);
  assert.strictEqual(shown[0].fillColor, '#123456');
  assert.match(shown[0].tooltipHtml, /1\.25 km/);
  assert.match(shown[0].tooltipHtml, /1124 m/);
  assert.match(shown[0].tooltipHtml, /30\.100000, 100\.100000/);
  assert.strictEqual(timers.size, 1);
});

test('replaces the previous marker and expiry removes the current one', () => {
  const {controller, removed, timers} = fixture();
  const trail = {color:'unsafe', track:[[30,100,1000],[31,101,1100]]};
  controller.inspect({latlng:{lat:30, lng:100}}, trail);
  controller.inspect({latlng:{lat:31, lng:101}}, trail);
  assert.strictEqual(removed.length, 1);
  assert.strictEqual(timers.size, 1);
  [...timers.values()][0]();
  assert.strictEqual(removed.length, 2);
});

test('rejects incomplete input and destroy is idempotent', () => {
  const {controller, removed} = fixture();
  assert.strictEqual(controller.inspect({}, {track:[]}), false);
  controller.inspect({latlng:{lat:30, lng:100}}, {track:[[30,100],[31,101]]});
  controller.destroy();
  controller.destroy();
  assert.strictEqual(removed.length, 1);
  assert.strictEqual(controller.inspect({latlng:{lat:30, lng:100}}, {track:[[30,100]]}), false);
});

console.log(`\nResult: ${passed}/${passed} passed`);
