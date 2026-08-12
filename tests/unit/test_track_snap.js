/** Cached track snapping and drag-frame ownership contracts. */
const assert = require('assert');
const app = require('../../src/app/index.ts');
const core = require('../../src/core/index.ts');

let passed = 0;
let failed = 0;
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  PASS ${name}`); }
  catch(error) { failed += 1; console.log(`  FAIL ${name}\n    ${error.stack || error.message}`); }
};

const trail = {
  id:'main',
  track:[
    [30.0000, 100.0000, 1000, 0],
    [30.0010, 100.0000, 1100, 1],
    [30.0020, 100.0000, 1200, 2],
    [30.0030, 100.0000, 1300, 3],
  ],
};

function harness() {
  let primary = trail;
  let nextFrame = 0;
  const frames = new Map();
  const service = app.createTrackSnapService({
    primaryTrail:() => primary,
    distance:core.haversine,
    requestFrame:callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelFrame:handle => { frames.delete(handle); },
  });
  return {
    service,
    frames,
    setPrimary:value => { primary = value; },
    flush() {
      const queued = [...frames.values()];
      frames.clear();
      queued.forEach(callback => callback());
    },
  };
}

console.log('\nTrack snap service');

test('finds the nearest cached primary point and enforces the 200 m radius', () => {
  const {service} = harness();
  assert.strictEqual(service.nearestPrimary(30.00105, 100).idx, 1);
  assert.strictEqual(service.nearestPrimary(31, 100), null);
});

test('uses a bounded center window and falls back to the global cached lookup', () => {
  const {service} = harness();
  assert.strictEqual(service.nearestPrimaryNear(30.003, 100, 2, 1).idx, 3);
  assert.strictEqual(service.nearestPrimaryNear(30.00001, 100, 3, 0).idx, 0);
});

test('snaps an explicit trail without changing the primary selection', () => {
  const {service} = harness();
  const alternate = {id:'alt', track:[[29, 99, 800, 0], [29.001, 99, 900, 1]]};
  const hit = service.nearestTrail(alternate, 29.0009, 99);
  assert.strictEqual(hit.trail, alternate);
  assert.strictEqual(hit.idx, 1);
});

test('coalesces drag events into one frame and supports cancellation', () => {
  const {service, frames, flush} = harness();
  const positions = [];
  const marker = {
    current:{lat:30, lng:100},
    getLatLng() { return this.current; },
    setLatLng(value) { positions.push(value); },
  };
  const snapper = service.createDragSnapper(marker);
  marker.current = {lat:30.001, lng:100};
  snapper.schedule({target:marker});
  marker.current = {lat:30.002, lng:100};
  snapper.schedule({target:marker});
  assert.strictEqual(frames.size, 1);
  flush();
  assert.deepStrictEqual(positions, [[30.002, 100]]);

  marker.current = {lat:30.003, lng:100};
  snapper.schedule({target:marker});
  snapper.cancel();
  flush();
  assert.deepStrictEqual(positions, [[30.002, 100]]);
});

console.log(`\nResult: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
