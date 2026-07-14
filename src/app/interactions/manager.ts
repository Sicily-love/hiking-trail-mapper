import {
  ACTIVE_INTERACTION_KINDS,
  type ActiveInteractionKind,
  type AnyInteractionSession,
  type IdleInteraction,
  type InteractionActivation,
  type InteractionActivationOptions,
  type InteractionCancelReason,
  type InteractionDispatch,
  type InteractionEventMap,
  type InteractionGuard,
  type InteractionManagerOptions,
  type InteractionOwner,
  type InteractionPhaseMap,
  type InteractionScheduler,
  type InteractionSession,
  type InteractionState,
  type InteractionTask,
} from './types.ts';

export const IDLE_INTERACTION: IdleInteraction = Object.freeze({
  kind: 'idle',
  phase: 'idle',
  owner: null,
  sessionId: 0,
  abortController: null,
  signal: null,
});

interface StoredSession {
  readonly kind: ActiveInteractionKind;
  phase: string;
  readonly owner: Readonly<InteractionOwner>;
  readonly sessionId: number;
  readonly abortController: AbortController;
  readonly tasks: Set<InteractionTask>;
  readonly onEvent?: (event: object, session: InteractionSession) => void;
  readonly onCancel?: (reason: InteractionCancelReason, session: InteractionSession) => void;
  publicSession: InteractionSession;
  finished: boolean;
}

const ACTIVE_KIND_SET: ReadonlySet<string> = new Set(ACTIVE_INTERACTION_KINDS);

function now(): number {
  return typeof globalThis.performance?.now === 'function'
    ? globalThis.performance.now()
    : Date.now();
}

export function createDefaultInteractionScheduler(): InteractionScheduler {
  const hasAnimationFrame = typeof globalThis.requestAnimationFrame === 'function'
    && typeof globalThis.cancelAnimationFrame === 'function';

  return {
    requestFrame(callback) {
      if(hasAnimationFrame) return globalThis.requestAnimationFrame(callback);
      return globalThis.setTimeout(() => callback(now()), 16);
    },
    cancelFrame(handle) {
      if(hasAnimationFrame) {
        globalThis.cancelAnimationFrame(handle as number);
        return;
      }
      globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>);
    },
    setDelay(callback, delayMs) {
      return globalThis.setTimeout(callback, delayMs);
    },
    clearDelay(handle) {
      globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>);
    },
  };
}

export function isInteractionOwner(value: unknown): value is InteractionOwner {
  if(!value || typeof value !== 'object') return false;
  const owner = value as Partial<InteractionOwner>;
  return typeof owner.trailId === 'string'
    && owner.trailId.trim().length > 0
    && Number.isSafeInteger(owner.revision)
    && (owner.revision as number) >= 0;
}

export function sameInteractionOwner(
  left: InteractionOwner | null | undefined,
  right: InteractionOwner | null | undefined,
): boolean {
  return isInteractionOwner(left)
    && isInteractionOwner(right)
    && left.trailId === right.trailId
    && left.revision === right.revision;
}

function assertActiveKind(value: unknown): asserts value is ActiveInteractionKind {
  if(typeof value !== 'string' || !ACTIVE_KIND_SET.has(value)) {
    throw new TypeError(`Unknown active interaction kind: ${String(value)}`);
  }
}

function assertPhase(value: unknown): asserts value is string {
  if(typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('Interaction phase must be a non-empty string');
  }
}

function copyOwner(value: unknown): Readonly<InteractionOwner> {
  if(!isInteractionOwner(value)) {
    throw new TypeError('Interaction owner requires a non-empty trailId and a non-negative integer revision');
  }
  return Object.freeze({ trailId: value.trailId, revision: value.revision });
}

function assertScheduler(value: InteractionScheduler): void {
  const methods: Array<keyof InteractionScheduler> = [
    'requestFrame',
    'cancelFrame',
    'setDelay',
    'clearDelay',
  ];
  for(const method of methods) {
    if(typeof value[method] !== 'function') {
      throw new TypeError(`Interaction scheduler is missing ${method}()`);
    }
  }
}

function abortReason(signal: AbortSignal): InteractionCancelReason {
  return typeof signal.reason === 'string' && signal.reason.length > 0
    ? signal.reason
    : 'aborted';
}

export class InteractionManager<
  Events extends InteractionEventMap = InteractionEventMap,
  Phases extends InteractionPhaseMap = InteractionPhaseMap,
> {
  readonly scheduler: InteractionScheduler;

  private activeRecord: StoredSession | null = null;
  private nextSessionId = 1;
  private readonly consumedEvents = new WeakSet<object>();
  private readonly canTransition?: InteractionManagerOptions['canTransition'];

  constructor(options: InteractionManagerOptions = {}) {
    this.scheduler = options.scheduler || createDefaultInteractionScheduler();
    assertScheduler(this.scheduler);
    if(options.canTransition !== undefined && typeof options.canTransition !== 'function') {
      throw new TypeError('Interaction canTransition must be a function');
    }
    this.canTransition = options.canTransition;
  }

  get current(): InteractionState<Events, Phases> {
    return (this.activeRecord?.publicSession || IDLE_INTERACTION) as InteractionState<Events, Phases>;
  }

  get active(): AnyInteractionSession<Events, Phases> | null {
    return this.activeRecord?.publicSession as AnyInteractionSession<Events, Phases> | undefined || null;
  }

  get isIdle(): boolean {
    return this.activeRecord === null;
  }

  activate<K extends ActiveInteractionKind>(
    activation: InteractionActivation<K, Phases[K], Events[K]>,
  ): InteractionSession<K, Phases[K], Events[K]>;
  activate<K extends ActiveInteractionKind>(
    kind: K,
    options: InteractionActivationOptions<K, Phases[K], Events[K]>,
  ): InteractionSession<K, Phases[K], Events[K]>;
  activate<K extends ActiveInteractionKind>(
    kindOrActivation: K | InteractionActivation<K, Phases[K], Events[K]>,
    options?: InteractionActivationOptions<K, Phases[K], Events[K]>,
  ): InteractionSession<K, Phases[K], Events[K]> {
    const activation = (typeof kindOrActivation === 'string'
      ? { ...options, kind: kindOrActivation }
      : kindOrActivation) as InteractionActivation<K, Phases[K], Events[K]>;

    assertActiveKind(activation.kind);
    assertPhase(activation.phase);
    if(this.canTransition && !this.canTransition(activation.kind, activation.phase, activation.phase)) {
      throw new RangeError(`Invalid initial phase ${activation.phase} for ${activation.kind}`);
    }
    const owner = copyOwner(activation.owner);
    if(activation.onEvent !== undefined && typeof activation.onEvent !== 'function') {
      throw new TypeError('Interaction onEvent must be a function');
    }
    if(activation.onCancel !== undefined && typeof activation.onCancel !== 'function') {
      throw new TypeError('Interaction onCancel must be a function');
    }

    const abortController = new AbortController();
    const sessionId = this.allocateSessionId();
    const record: StoredSession = {
      kind: activation.kind,
      phase: activation.phase,
      owner,
      sessionId,
      abortController,
      tasks: new Set(),
      onEvent: activation.onEvent
        ? (event, session) => activation.onEvent?.(
          event as Events[K],
          session as InteractionSession<K, Phases[K], Events[K]>,
        )
        : undefined,
      onCancel: activation.onCancel
        ? (reason, session) => activation.onCancel?.(
          reason,
          session as InteractionSession<K, Phases[K], Events[K]>,
        )
        : undefined,
      publicSession: undefined as unknown as InteractionSession,
      finished: false,
    };

    const session: InteractionSession<K, Phases[K], Events[K]> = Object.freeze({
      kind: activation.kind,
      get phase() {
        return record.phase as Phases[K];
      },
      owner,
      sessionId,
      abortController,
      signal: abortController.signal,
      isCurrent: () => this.activeRecord === record && !record.finished,
      setPhase: (nextPhase: Phases[K]) => this.setRecordPhase(record, nextPhase),
      dispatch: (event: Events[K]) => this.dispatchRecord(record, event),
      cancel: (reason?: InteractionCancelReason) => this.cancelRecord(record, reason || 'cancelled'),
      frame: (callback: (
        timestamp: number,
        activeSession: InteractionSession<K, Phases[K], Events[K]>,
      ) => void) => this.scheduleFrame(
        record,
        callback as (timestamp: number, activeSession: InteractionSession) => void,
      ),
      delay: (
        delayMs: number,
        callback: (activeSession: InteractionSession<K, Phases[K], Events[K]>) => void,
      ) => this.scheduleDelay(
        record,
        delayMs,
        callback as (activeSession: InteractionSession) => void,
      ),
    });
    record.publicSession = session;

    abortController.signal.addEventListener('abort', () => {
      if(this.activeRecord !== record || record.finished) return;
      this.activeRecord = null;
      this.finishRecord(record, abortReason(abortController.signal), false);
    }, { once: true });

    const previous = this.activeRecord;
    this.activeRecord = record;
    if(previous) this.finishRecord(previous, 'replaced', true);
    return session;
  }

  dispatch<K extends ActiveInteractionKind>(dispatch: InteractionDispatch<K, Events[K]>): boolean;
  dispatch<K extends ActiveInteractionKind>(
    kind: K,
    event: Events[K],
    guard?: InteractionGuard,
  ): boolean;
  dispatch<K extends ActiveInteractionKind>(
    kindOrDispatch: K | InteractionDispatch<K, Events[K]>,
    event?: Events[K],
    guard?: InteractionGuard,
  ): boolean {
    const envelope = typeof kindOrDispatch === 'string'
      ? { kind: kindOrDispatch, event, ...guard }
      : kindOrDispatch;
    assertActiveKind(envelope.kind);
    if(!eventIsObject(envelope.event)) {
      throw new TypeError('Interaction events must be non-null objects');
    }

    const record = this.activeRecord;
    if(!record || record.kind !== envelope.kind || !this.matchesGuard(record, envelope)) return false;
    return this.consumeRecordEvent(record, envelope.event);
  }

  cancel(reason: InteractionCancelReason = 'cancelled', guard?: InteractionGuard): boolean {
    const record = this.activeRecord;
    if(!record || !this.matchesGuard(record, guard)) return false;
    this.activeRecord = null;
    this.finishRecord(record, reason, true);
    return true;
  }

  validateOwner(owner: InteractionOwner, sessionId?: number): boolean {
    const record = this.activeRecord;
    return Boolean(record)
      && sameInteractionOwner(record?.owner, owner)
      && (sessionId === undefined || record?.sessionId === sessionId);
  }

  revalidateOwner(owner: InteractionOwner, sessionId?: number): boolean {
    if(this.validateOwner(owner, sessionId)) return true;
    if(this.activeRecord) this.cancel('owner-invalid');
    return false;
  }

  setPhase(nextPhase: Phases[ActiveInteractionKind], guard?: InteractionGuard): boolean {
    const record = this.activeRecord;
    if(!record || !this.matchesGuard(record, guard)) return false;
    return this.setRecordPhase(record, nextPhase);
  }

  frame(
    callback: (timestamp: number, session: AnyInteractionSession<Events, Phases>) => void,
    guard?: InteractionGuard,
  ): InteractionTask | null {
    const record = this.activeRecord;
    if(!record || !this.matchesGuard(record, guard)) return null;
    return this.scheduleFrame(record, callback as (timestamp: number, session: InteractionSession) => void);
  }

  delay(
    delayMs: number,
    callback: (session: AnyInteractionSession<Events, Phases>) => void,
    guard?: InteractionGuard,
  ): InteractionTask | null {
    const record = this.activeRecord;
    if(!record || !this.matchesGuard(record, guard)) return null;
    return this.scheduleDelay(record, delayMs, callback as (session: InteractionSession) => void);
  }

  private allocateSessionId(): number {
    if(!Number.isSafeInteger(this.nextSessionId)) {
      throw new RangeError('Interaction sessionId space exhausted');
    }
    return this.nextSessionId++;
  }

  private matchesGuard(record: StoredSession, guard?: InteractionGuard): boolean {
    if(!guard) return true;
    if(guard.sessionId !== undefined && guard.sessionId !== record.sessionId) return false;
    if(guard.owner !== undefined && !sameInteractionOwner(record.owner, guard.owner)) return false;
    return true;
  }

  private setRecordPhase(record: StoredSession, nextPhase: string): boolean {
    if(this.activeRecord !== record || record.finished) return false;
    assertPhase(nextPhase);
    if(record.phase === nextPhase) return true;
    if(this.canTransition && !this.canTransition(record.kind, record.phase, nextPhase)) return false;
    this.cancelTasks(record);
    record.phase = nextPhase;
    return true;
  }

  private dispatchRecord<E extends object>(
    record: StoredSession,
    event: E,
  ): boolean {
    if(this.activeRecord !== record || record.finished) return false;
    return this.consumeRecordEvent(record, event);
  }

  private consumeRecordEvent(record: StoredSession, event: object): boolean {
    if(!record.onEvent || this.consumedEvents.has(event)) return false;
    this.consumedEvents.add(event);
    record.onEvent(event, record.publicSession);
    return true;
  }

  private cancelRecord(record: StoredSession, reason: InteractionCancelReason): boolean {
    if(this.activeRecord !== record || record.finished) return false;
    this.activeRecord = null;
    this.finishRecord(record, reason, true);
    return true;
  }

  private finishRecord(record: StoredSession, reason: InteractionCancelReason, abort: boolean): void {
    if(record.finished) return;
    record.finished = true;
    this.cancelTasks(record);
    if(abort && !record.abortController.signal.aborted) {
      record.abortController.abort(reason);
    }
    record.onCancel?.(reason, record.publicSession);
  }

  private cancelTasks(record: StoredSession): void {
    for(const task of [...record.tasks]) task.cancel();
  }

  private scheduleFrame(
    record: StoredSession,
    callback: (timestamp: number, session: InteractionSession) => void,
  ): InteractionTask | null {
    return this.scheduleTask(
      record,
      run => this.scheduler.requestFrame(run),
      handle => this.scheduler.cancelFrame(handle),
      timestamp => callback(timestamp, record.publicSession),
    );
  }

  private scheduleDelay(
    record: StoredSession,
    delayMs: number,
    callback: (session: InteractionSession) => void,
  ): InteractionTask | null {
    if(!Number.isFinite(delayMs) || delayMs < 0) {
      throw new RangeError('Interaction delay must be a finite, non-negative number');
    }
    return this.scheduleTask(
      record,
      run => this.scheduler.setDelay(() => run(now()), delayMs),
      handle => this.scheduler.clearDelay(handle),
      () => callback(record.publicSession),
    );
  }

  private scheduleTask(
    record: StoredSession,
    schedule: (run: (timestamp: number) => void) => unknown,
    clear: (handle: unknown) => void,
    callback: (timestamp: number) => void,
  ): InteractionTask | null {
    if(this.activeRecord !== record || record.finished || record.abortController.signal.aborted) return null;

    const phase = record.phase;
    let pending = true;
    let scheduled = false;
    let handle: unknown;
    let task: InteractionTask;

    const removeAbortListener = () => {
      record.abortController.signal.removeEventListener('abort', cancel);
    };
    const cancel = () => {
      if(!pending) return;
      pending = false;
      removeAbortListener();
      record.tasks.delete(task);
      if(scheduled) clear(handle);
    };
    const run = (timestamp: number) => {
      if(!pending) return;
      pending = false;
      removeAbortListener();
      record.tasks.delete(task);
      if(this.activeRecord !== record || record.finished || record.phase !== phase) return;
      callback(timestamp);
    };

    task = Object.freeze({
      get pending() {
        return pending;
      },
      cancel,
    });
    record.tasks.add(task);
    record.abortController.signal.addEventListener('abort', cancel, { once: true });

    try {
      handle = schedule(run);
      scheduled = true;
    } catch(error) {
      cancel();
      throw error;
    }
    return task;
  }
}

function eventIsObject(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

export function createInteractionManager<
  Events extends InteractionEventMap = InteractionEventMap,
  Phases extends InteractionPhaseMap = InteractionPhaseMap,
>(options: InteractionManagerOptions = {}): InteractionManager<Events, Phases> {
  return new InteractionManager<Events, Phases>(options);
}
