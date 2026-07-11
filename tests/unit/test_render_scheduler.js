/**
 * Unit test: dirty-mask render scheduler.
 * Run: node tests/unit/test_render_scheduler.js
 */
const assert = require('assert');
const {
  CHART,
  DAYS,
  FIT,
  LEGEND,
  MARKERS,
  RENDER_DIRTY,
  RENDER_FLUSH_ORDER,
  RenderScheduler,
  SIDEBAR,
  TRACKS,
} = require('../../src/app/rendering/index.ts');

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

function createFrameClock() {
  let nextHandle = 1;
  const callbacks = new Map();
  const requested = [];
  const cancelled = [];

  return {
    requested,
    cancelled,
    raf(callback) {
      const handle = nextHandle++;
      requested.push(handle);
      callbacks.set(handle, callback);
      return handle;
    },
    caf(handle) {
      cancelled.push(handle);
      callbacks.delete(handle);
    },
    runNext(timestamp = 16) {
      const entry = callbacks.entries().next().value;
      assert.ok(entry, 'expected a queued animation frame');
      const [handle, callback] = entry;
      callbacks.delete(handle);
      callback(timestamp);
      return handle;
    },
    pendingCount() {
      return callbacks.size;
    },
  };
}

function createScheduler(handlers = {}) {
  const clock = createFrameClock();
  const scheduler = new RenderScheduler({
    handlers,
    raf: clock.raf,
    caf: clock.caf,
  });
  return {clock, scheduler};
}

console.log('\n▸ RenderScheduler');

T('dirty flags are unique powers of two in the fixed flush order', () => {
  const flags = [TRACKS, MARKERS, SIDEBAR, DAYS, LEGEND, CHART, FIT];
  assert.deepStrictEqual(RENDER_FLUSH_ORDER, flags);
  assert.strictEqual(new Set(flags).size, flags.length);
  flags.forEach(flag => assert.strictEqual(flag & (flag - 1), 0));
  assert.strictEqual(flags.reduce((mask, flag) => mask | flag, 0), RENDER_DIRTY.ALL);
  assert.strictEqual(RENDER_DIRTY.NONE, 0);
  assert.ok(Object.isFrozen(RENDER_DIRTY));
  assert.ok(Object.isFrozen(RENDER_FLUSH_ORDER));
});

T('multiple invalidations merge into one frame and each phase flushes once', () => {
  const calls = [];
  const contexts = [];
  const handlers = {};
  for(const phase of ['tracks', 'markers', 'sidebar', 'days', 'legend', 'chart']) {
    handlers[phase] = context => {
      calls.push(phase);
      contexts.push(context);
    };
  }
  handlers.fit = context => {
    calls.push('fit');
    contexts.push(context);
  };
  const {clock, scheduler} = createScheduler(handlers);

  scheduler.invalidate(CHART | TRACKS);
  scheduler.invalidate(FIT, {id: 'fit'});
  scheduler.invalidate(MARKERS | SIDEBAR | DAYS);
  scheduler.invalidate(LEGEND | TRACKS | CHART);

  assert.strictEqual(clock.requested.length, 1);
  assert.strictEqual(clock.pendingCount(), 1);
  assert.strictEqual(scheduler.pendingMask, RENDER_DIRTY.ALL);
  assert.strictEqual(scheduler.hasScheduledFrame, true);

  clock.runNext(42);

  assert.deepStrictEqual(calls, ['tracks', 'markers', 'sidebar', 'days', 'legend', 'chart', 'fit']);
  assert.ok(contexts.every(context => context.frameMask === RENDER_DIRTY.ALL));
  assert.ok(contexts.every(context => context.timestamp === 42));
  assert.strictEqual(new Set(calls).size, calls.length);
  assert.strictEqual(scheduler.pendingMask, RENDER_DIRTY.NONE);
  assert.strictEqual(scheduler.hasScheduledFrame, false);
  assert.strictEqual(clock.pendingCount(), 0);
});

T('FIT keeps only the latest request and exposes a current epoch guard', () => {
  const fitCalls = [];
  const {clock, scheduler} = createScheduler({fit: context => fitCalls.push(context)});

  const firstEpoch = scheduler.requestFit({id: 'first'});
  const secondEpoch = scheduler.requestFit({id: 'second'});
  scheduler.invalidate(FIT, {id: 'last'});

  assert.strictEqual(firstEpoch, 1);
  assert.strictEqual(secondEpoch, 2);
  assert.strictEqual(scheduler.fitEpoch, 3);
  assert.strictEqual(scheduler.isFitEpochCurrent(firstEpoch), false);
  assert.strictEqual(scheduler.isFitEpochCurrent(secondEpoch), false);
  assert.strictEqual(clock.requested.length, 1);

  clock.runNext();

  assert.strictEqual(fitCalls.length, 1);
  assert.deepStrictEqual(fitCalls[0].request, {id: 'last'});
  assert.strictEqual(fitCalls[0].epoch, 3);
  assert.strictEqual(fitCalls[0].isCurrent(), true);

  const previousGuard = fitCalls[0].isCurrent;
  const fourthEpoch = scheduler.requestFit({id: 'newer'});
  assert.strictEqual(fourthEpoch, 4);
  assert.strictEqual(previousGuard(), false);
  clock.runNext();
  assert.deepStrictEqual(fitCalls.map(call => call.request.id), ['last', 'newer']);
  assert.strictEqual(fitCalls[1].isCurrent(), true);
  scheduler.cancel();
  assert.strictEqual(fitCalls[1].isCurrent(), false);
});

T('invalidations made during flush are deferred and merged into the next frame', () => {
  const calls = [];
  let scheduler;
  let tracksPass = 0;
  const clock = createFrameClock();
  scheduler = new RenderScheduler({
    raf: clock.raf,
    caf: clock.caf,
    handlers: {
      tracks() {
        tracksPass++;
        calls.push(`tracks:${tracksPass}`);
        if(tracksPass === 1) {
          scheduler.invalidate(TRACKS | MARKERS);
          scheduler.invalidate(MARKERS);
          scheduler.requestFit({id: 'early'});
          scheduler.requestFit({id: 'late'});
        }
      },
      markers() {
        calls.push('markers');
      },
      fit(context) {
        calls.push(`fit:${context.request.id}`);
      },
    },
  });

  scheduler.invalidate(TRACKS);
  clock.runNext();

  assert.deepStrictEqual(calls, ['tracks:1']);
  assert.strictEqual(clock.requested.length, 2);
  assert.strictEqual(clock.pendingCount(), 1);

  clock.runNext();
  assert.deepStrictEqual(calls, ['tracks:1', 'tracks:2', 'markers', 'fit:late']);
  assert.strictEqual(clock.pendingCount(), 0);
});

T('manual flush cancels the queued frame and does not leave a stale callback', () => {
  const calls = [];
  const {clock, scheduler} = createScheduler({tracks: context => calls.push(context.timestamp)});

  scheduler.invalidate(TRACKS);
  const queuedHandle = clock.requested[0];
  scheduler.flush(99);

  assert.deepStrictEqual(calls, [99]);
  assert.deepStrictEqual(clock.cancelled, [queuedHandle]);
  assert.strictEqual(clock.pendingCount(), 0);
  assert.strictEqual(scheduler.hasScheduledFrame, false);
  scheduler.flush(100);
  assert.deepStrictEqual(calls, [99]);
});

T('cancel drops pending work, invalidates FIT, and leaves the scheduler reusable', () => {
  const calls = [];
  const {clock, scheduler} = createScheduler({
    tracks: () => calls.push('tracks'),
    markers: () => calls.push('markers'),
    fit: () => calls.push('fit'),
  });

  scheduler.invalidate(TRACKS);
  const firstEpoch = scheduler.requestFit({id: 'cancelled'});
  const queuedHandle = clock.requested[0];
  scheduler.cancel();

  assert.deepStrictEqual(clock.cancelled, [queuedHandle]);
  assert.strictEqual(clock.pendingCount(), 0);
  assert.strictEqual(scheduler.pendingMask, RENDER_DIRTY.NONE);
  assert.strictEqual(scheduler.hasScheduledFrame, false);
  assert.strictEqual(scheduler.isFitEpochCurrent(firstEpoch), false);
  assert.deepStrictEqual(calls, []);

  scheduler.invalidate(MARKERS);
  clock.runNext();
  assert.deepStrictEqual(calls, ['markers']);
  assert.strictEqual(scheduler.requestFit({id: 'next'}), 2);
});

T('dispose is idempotent, cancels work, and rejects future scheduling', () => {
  const calls = [];
  const {clock, scheduler} = createScheduler({tracks: () => calls.push('tracks')});

  scheduler.invalidate(TRACKS);
  scheduler.dispose();
  scheduler.dispose();
  scheduler.invalidate(RENDER_DIRTY.ALL, {id: 'ignored'});

  assert.strictEqual(scheduler.requestFit({id: 'ignored'}), null);
  scheduler.flush();
  assert.strictEqual(scheduler.disposed, true);
  assert.strictEqual(scheduler.pendingMask, RENDER_DIRTY.NONE);
  assert.strictEqual(scheduler.hasScheduledFrame, false);
  assert.strictEqual(clock.requested.length, 1);
  assert.strictEqual(clock.cancelled.length, 1);
  assert.strictEqual(clock.pendingCount(), 0);
  assert.deepStrictEqual(calls, []);
});

T('unknown dirty bits are ignored without hiding known bits', () => {
  const calls = [];
  const {clock, scheduler} = createScheduler({tracks: () => calls.push('tracks')});
  const unknown = 1 << 20;

  scheduler.invalidate(RENDER_DIRTY.NONE);
  scheduler.invalidate(unknown);
  assert.strictEqual(clock.requested.length, 0);

  scheduler.invalidate(unknown | TRACKS);
  assert.strictEqual(scheduler.pendingMask, TRACKS);
  clock.runNext();
  assert.deepStrictEqual(calls, ['tracks']);
});

T('handler failures do not skip later dirty phases', () => {
  const calls = [];
  const expected = new Error('tracks failed');
  const {clock, scheduler} = createScheduler({
    tracks() {
      calls.push('tracks');
      throw expected;
    },
    markers() {
      calls.push('markers');
    },
  });

  scheduler.invalidate(TRACKS | MARKERS);
  assert.throws(() => clock.runNext(), error => error === expected);
  assert.deepStrictEqual(calls, ['tracks', 'markers']);
  assert.strictEqual(scheduler.pendingMask, RENDER_DIRTY.NONE);
});

console.log('\n' + '='.repeat(50));
console.log(`Result: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
