/**
 * Unit test · exclusive InteractionManager contracts
 * Run: node tests/unit/test_interaction_manager.js
 */
const assert = require('assert');
const interactions = require('../../src/app/interactions/index.ts');

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

function createFakeScheduler() {
  let nextHandle = 1;
  const frames = new Map();
  const delays = new Map();
  const cancelledFrames = [];
  const clearedDelays = [];

  return {
    scheduler: {
      requestFrame(callback) {
        const handle = nextHandle++;
        frames.set(handle, callback);
        return handle;
      },
      cancelFrame(handle) {
        cancelledFrames.push(handle);
        frames.delete(handle);
      },
      setDelay(callback, delayMs) {
        const handle = nextHandle++;
        delays.set(handle, { callback, delayMs });
        return handle;
      },
      clearDelay(handle) {
        clearedDelays.push(handle);
        delays.delete(handle);
      },
    },
    frames,
    delays,
    cancelledFrames,
    clearedDelays,
    firstFrame() {
      return frames.entries().next().value || null;
    },
    firstDelay() {
      return delays.entries().next().value || null;
    },
    flushFrame(timestamp = 16) {
      const entry = this.firstFrame();
      if(!entry) return false;
      const [handle, callback] = entry;
      frames.delete(handle);
      callback(timestamp);
      return true;
    },
    flushDelay() {
      const entry = this.firstDelay();
      if(!entry) return false;
      const [handle, pending] = entry;
      delays.delete(handle);
      pending.callback();
      return true;
    },
  };
}

const owner = (trailId = 'trail-a', revision = 1) => ({ trailId, revision });

console.log('\n▸ InteractionManager');

T('exports the complete interaction vocabulary and starts in idle', () => {
  assert.deepStrictEqual(interactions.INTERACTION_KINDS, [
    'idle',
    'measure',
    'segment',
    'waypoint',
    'escape',
    'stitch',
    'day-preview',
  ]);
  assert.deepStrictEqual(interactions.ACTIVE_INTERACTION_KINDS, [
    'measure',
    'segment',
    'waypoint',
    'escape',
    'stitch',
    'day-preview',
  ]);

  const manager = interactions.createInteractionManager();
  assert.strictEqual(manager.current, interactions.IDLE_INTERACTION);
  assert.strictEqual(manager.current.kind, 'idle');
  assert.strictEqual(manager.current.phase, 'idle');
  assert.strictEqual(manager.current.sessionId, 0);
  assert.strictEqual(manager.active, null);
  assert.strictEqual(manager.isIdle, true);
  assert.strictEqual(manager.cancel(), false);
});

T('activate creates an immutable owner-bound session with its own AbortController', () => {
  const sourceOwner = owner('trail-a', 7);
  const manager = interactions.createInteractionManager();
  const session = manager.activate('measure', {
    phase: 'pick-a',
    owner: sourceOwner,
  });
  sourceOwner.revision = 99;

  assert.strictEqual(manager.current, session);
  assert.strictEqual(manager.active, session);
  assert.strictEqual(manager.isIdle, false);
  assert.strictEqual(session.kind, 'measure');
  assert.strictEqual(session.phase, 'pick-a');
  assert.deepStrictEqual(session.owner, owner('trail-a', 7));
  assert.ok(Object.isFrozen(session));
  assert.ok(Object.isFrozen(session.owner));
  assert.ok(session.abortController instanceof AbortController);
  assert.strictEqual(session.signal, session.abortController.signal);
  assert.strictEqual(session.signal.aborted, false);
  assert.strictEqual(session.sessionId, 1);
  assert.strictEqual(session.isCurrent(), true);
});

T('activate atomically replaces and aborts the previous session', () => {
  const fake = createFakeScheduler();
  const cancellations = [];
  const manager = interactions.createInteractionManager({ scheduler: fake.scheduler });
  const first = manager.activate({
    kind: 'measure',
    phase: 'pick-a',
    owner: owner(),
    onCancel: (reason, session) => cancellations.push([reason, session.sessionId]),
  });
  const pendingFrame = first.frame(() => assert.fail('replaced frame must not run'));
  const second = manager.activate({
    kind: 'segment',
    phase: 'editing',
    owner: owner('trail-b', 2),
  });

  assert.strictEqual(manager.current, second);
  assert.strictEqual(first.isCurrent(), false);
  assert.strictEqual(second.isCurrent(), true);
  assert.strictEqual(first.signal.aborted, true);
  assert.strictEqual(first.signal.reason, 'replaced');
  assert.strictEqual(second.signal.aborted, false);
  assert.ok(second.sessionId > first.sessionId);
  assert.deepStrictEqual(cancellations, [['replaced', first.sessionId]]);
  assert.strictEqual(pendingFrame.pending, false);
  assert.strictEqual(fake.frames.size, 0);
  assert.strictEqual(fake.cancelledFrames.length, 1);
});

T('dispatch routes only to the current kind and consumes each event object once', () => {
  const handled = [];
  const manager = interactions.createInteractionManager();
  const session = manager.activate('measure', {
    phase: 'pick-a',
    owner: owner(),
    onEvent: (event, activeSession) => handled.push([event.type, activeSession.sessionId]),
  });
  const event = { type: 'map-tap' };

  assert.strictEqual(manager.dispatch('segment', event), false);
  assert.strictEqual(manager.dispatch('measure', event, { owner: owner('trail-a', 2) }), false);
  assert.strictEqual(manager.dispatch('measure', event, { sessionId: session.sessionId + 1 }), false);
  assert.strictEqual(manager.dispatch({
    kind: 'measure',
    event,
    owner: owner(),
    sessionId: session.sessionId,
  }), true);
  assert.strictEqual(manager.dispatch('measure', event), false);
  assert.strictEqual(session.dispatch(event), false);
  assert.deepStrictEqual(handled, [['map-tap', session.sessionId]]);

  const secondEvent = { type: 'pointer-up' };
  assert.strictEqual(session.dispatch(secondEvent), true);
  assert.deepStrictEqual(handled.map(item => item[0]), ['map-tap', 'pointer-up']);
});

T('events are claimed only when an active handler exists', () => {
  const manager = interactions.createInteractionManager();
  const event = { type: 'map-tap' };
  manager.activate('waypoint', { phase: 'placing', owner: owner() });
  assert.strictEqual(manager.dispatch('waypoint', event), false);

  let calls = 0;
  manager.activate('waypoint', {
    phase: 'placing',
    owner: owner(),
    onEvent: () => calls++,
  });
  assert.strictEqual(manager.dispatch('waypoint', event), true);
  assert.strictEqual(calls, 1);
});

T('phase transitions stay in-session and invalidate work from the old phase', () => {
  const fake = createFakeScheduler();
  const manager = interactions.createInteractionManager({ scheduler: fake.scheduler });
  const session = manager.activate('measure', { phase: 'pick-a', owner: owner() });
  const task = session.frame(() => assert.fail('old-phase frame must not run'));

  assert.strictEqual(session.setPhase('pick-b'), true);
  assert.strictEqual(session.phase, 'pick-b');
  assert.strictEqual(session.sessionId, manager.current.sessionId);
  assert.strictEqual(session.signal.aborted, false);
  assert.strictEqual(task.pending, false);
  assert.strictEqual(fake.frames.size, 0);
  assert.strictEqual(manager.setPhase('ready', {
    owner: owner(),
    sessionId: session.sessionId,
  }), true);
  assert.strictEqual(session.phase, 'ready');

  const replacement = manager.activate('segment', { phase: 'editing', owner: owner() });
  assert.strictEqual(session.setPhase('ready'), false);
  assert.strictEqual(replacement.phase, 'editing');
});

T('Studio state machine declares every mode and rejects illegal phase jumps', () => {
  assert.deepStrictEqual(Object.keys(interactions.STUDIO_INTERACTION_PHASES), [
    'measure', 'segment', 'waypoint', 'escape', 'stitch', 'day-preview',
  ]);
  assert.strictEqual(interactions.isStudioInteractionPhase('measure', 'select-a'), true);
  assert.strictEqual(interactions.isStudioInteractionPhase('measure', 'committing'), false);
  assert.strictEqual(interactions.canTransitionStudioInteraction('measure', 'select-a', 'select-b'), true);
  assert.strictEqual(interactions.canTransitionStudioInteraction('measure', 'select-a', 'ready'), false);
  assert.strictEqual(interactions.canTransitionStudioInteraction('segment', 'editing', 'dragging'), true);
  assert.strictEqual(interactions.canTransitionStudioInteraction('escape', 'preview', 'committing'), true);
  assert.strictEqual(interactions.canTransitionStudioInteraction('stitch', 'editing', 'dragging'), true);

  const manager = interactions.createStudioInteractionManager();
  assert.throws(() => manager.activate('measure', {
    phase: 'editing',
    owner: owner(),
  }), /Invalid initial phase editing for measure/);
  const measure = manager.activate('measure', {
    phase: 'select-a',
    owner: owner(),
  });
  assert.strictEqual(measure.setPhase('ready'), false);
  assert.strictEqual(measure.phase, 'select-a');
  assert.strictEqual(measure.setPhase('select-b'), true);
  assert.strictEqual(measure.setPhase('ready'), true);
});

T('Studio modes share one exclusive replacement lifecycle', () => {
  const cancelled = [];
  const manager = interactions.createStudioInteractionManager();
  const activations = [
    ['measure', 'select-a'],
    ['segment', 'editing'],
    ['waypoint', 'select'],
    ['escape', 'select-a'],
    ['stitch', 'editing'],
    ['day-preview', 'preview'],
  ];
  let previous = null;
  activations.forEach(([kind, phase], index) => {
    const session = manager.activate(kind, {
      phase,
      owner: owner(`trail-${index}`, index),
      onCancel: reason => cancelled.push([kind, reason]),
    });
    if(previous) {
      assert.strictEqual(previous.isCurrent(), false);
      assert.strictEqual(previous.signal.reason, 'replaced');
    }
    assert.strictEqual(manager.current, session);
    previous = session;
  });
  assert.deepStrictEqual(cancelled, [
    ['measure', 'replaced'],
    ['segment', 'replaced'],
    ['waypoint', 'replaced'],
    ['escape', 'replaced'],
    ['stitch', 'replaced'],
  ]);
  assert.strictEqual(manager.cancel('cancelled'), true);
  assert.deepStrictEqual(cancelled.at(-1), ['day-preview', 'cancelled']);
  assert.strictEqual(manager.isIdle, true);
});

T('cancel is guarded, idempotent, and cannot be invoked by a stale handle', () => {
  const cancellations = [];
  const manager = interactions.createInteractionManager();
  const session = manager.activate('escape', {
    phase: 'pick-start',
    owner: owner('trail-a', 4),
    onCancel: reason => cancellations.push(reason),
  });

  assert.strictEqual(manager.cancel('cancelled', { owner: owner('trail-a', 3) }), false);
  assert.strictEqual(manager.current, session);
  assert.strictEqual(session.cancel('escape-key'), true);
  assert.strictEqual(session.signal.aborted, true);
  assert.strictEqual(session.signal.reason, 'escape-key');
  assert.strictEqual(session.cancel(), false);
  assert.strictEqual(manager.isIdle, true);
  assert.deepStrictEqual(cancellations, ['escape-key']);

  const next = manager.activate('day-preview', { phase: 'visible', owner: owner() });
  assert.strictEqual(session.cancel(), false);
  assert.strictEqual(manager.current, next);
});

T('aborting the exposed controller returns the manager to idle exactly once', () => {
  const cancellations = [];
  const manager = interactions.createInteractionManager();
  const session = manager.activate('waypoint', {
    phase: 'placing',
    owner: owner(),
    onCancel: reason => cancellations.push(reason),
  });

  session.abortController.abort('external-abort');
  session.abortController.abort('ignored');
  assert.strictEqual(manager.isIdle, true);
  assert.strictEqual(session.isCurrent(), false);
  assert.deepStrictEqual(cancellations, ['external-abort']);
});

T('owner validation includes both trailId and revision', () => {
  assert.strictEqual(interactions.isInteractionOwner(owner()), true);
  assert.strictEqual(interactions.isInteractionOwner({ trailId: '', revision: 1 }), false);
  assert.strictEqual(interactions.isInteractionOwner({ trailId: 'a', revision: -1 }), false);
  assert.strictEqual(interactions.sameInteractionOwner(owner(), owner()), true);
  assert.strictEqual(interactions.sameInteractionOwner(owner(), owner('trail-a', 2)), false);

  const cancellations = [];
  const manager = interactions.createInteractionManager();
  const session = manager.activate('segment', {
    phase: 'editing',
    owner: owner('trail-a', 5),
    onCancel: reason => cancellations.push(reason),
  });
  assert.strictEqual(manager.validateOwner(owner('trail-a', 5)), true);
  assert.strictEqual(manager.validateOwner(owner('trail-b', 5)), false);
  assert.strictEqual(manager.validateOwner(owner('trail-a', 6)), false);
  assert.strictEqual(manager.validateOwner(owner('trail-a', 5), session.sessionId + 1), false);
  assert.strictEqual(manager.current, session);

  assert.strictEqual(manager.revalidateOwner(owner('trail-a', 6)), false);
  assert.strictEqual(manager.isIdle, true);
  assert.strictEqual(session.signal.reason, 'owner-invalid');
  assert.deepStrictEqual(cancellations, ['owner-invalid']);
});

T('frame and delay callbacks execute once with the captured current session', () => {
  const fake = createFakeScheduler();
  const calls = [];
  const manager = interactions.createInteractionManager({ scheduler: fake.scheduler });
  const session = manager.activate('measure', { phase: 'ready', owner: owner() });
  const frameTask = manager.frame((timestamp, activeSession) => {
    calls.push(['frame', timestamp, activeSession.sessionId]);
  });
  const delayTask = session.delay(25, activeSession => {
    calls.push(['delay', 25, activeSession.sessionId]);
  });

  assert.strictEqual(fake.firstDelay()[1].delayMs, 25);
  assert.strictEqual(frameTask.pending, true);
  assert.strictEqual(delayTask.pending, true);
  assert.strictEqual(fake.flushFrame(42), true);
  assert.strictEqual(fake.flushDelay(), true);
  assert.strictEqual(frameTask.pending, false);
  assert.strictEqual(delayTask.pending, false);
  assert.deepStrictEqual(calls, [
    ['frame', 42, session.sessionId],
    ['delay', 25, session.sessionId],
  ]);
  assert.strictEqual(fake.flushFrame(), false);
  assert.strictEqual(fake.flushDelay(), false);
});

T('queued frame and delay callbacks remain inert after replacement races', () => {
  const fake = createFakeScheduler();
  const calls = [];
  const manager = interactions.createInteractionManager({ scheduler: fake.scheduler });
  const session = manager.activate('measure', { phase: 'ready', owner: owner() });
  const frameTask = session.frame(() => calls.push('frame'));
  const delayTask = session.delay(100, () => calls.push('delay'));
  const staleFrame = fake.firstFrame()[1];
  const staleDelay = fake.firstDelay()[1].callback;

  manager.activate('segment', { phase: 'editing', owner: owner() });
  assert.strictEqual(frameTask.pending, false);
  assert.strictEqual(delayTask.pending, false);
  assert.strictEqual(fake.frames.size, 0);
  assert.strictEqual(fake.delays.size, 0);
  assert.strictEqual(fake.cancelledFrames.length, 1);
  assert.strictEqual(fake.clearedDelays.length, 1);

  staleFrame(99);
  staleDelay();
  assert.deepStrictEqual(calls, []);
});

T('scheduled tasks can be cancelled explicitly and reject invalid delays', () => {
  const fake = createFakeScheduler();
  const manager = interactions.createInteractionManager({ scheduler: fake.scheduler });
  const session = manager.activate('day-preview', { phase: 'visible', owner: owner() });
  const task = session.delay(10, () => assert.fail('cancelled delay must not run'));

  task.cancel();
  task.cancel();
  assert.strictEqual(task.pending, false);
  assert.strictEqual(fake.delays.size, 0);
  assert.strictEqual(fake.clearedDelays.length, 1);
  assert.throws(() => session.delay(-1, () => {}), /finite, non-negative/);
  assert.throws(() => manager.delay(Number.NaN, () => {}), /finite, non-negative/);
});

T('runtime validation rejects malformed JS inputs without disturbing the active session', () => {
  const manager = interactions.createInteractionManager();
  assert.throws(() => manager.activate('idle', { phase: 'idle', owner: owner() }), /Unknown active interaction kind/);
  assert.throws(() => manager.activate('measure', { phase: '', owner: owner() }), /non-empty string/);
  assert.throws(() => manager.activate('measure', {
    phase: 'ready',
    owner: { trailId: 'trail-a', revision: 1.5 },
  }), /non-negative integer revision/);

  const session = manager.activate('measure', { phase: 'ready', owner: owner() });
  assert.throws(() => manager.dispatch('measure', null), /non-null objects/);
  assert.strictEqual(manager.current, session);
  assert.throws(() => interactions.createInteractionManager({
    scheduler: { requestFrame() {} },
  }), /missing cancelFrame/);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
