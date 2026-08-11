import type {
  ActiveInteractionKind,
  InteractionCancelReason,
  InteractionOwner,
} from '../interactions/types.ts';

export interface InteractionSessionLike {
  readonly kind: string;
  readonly phase: string;
  readonly owner: InteractionOwner | null;
  readonly sessionId: number;
  isCurrent(): boolean;
  setPhase(phase: string): boolean;
  dispatch(event: object): boolean;
  cancel(reason?: InteractionCancelReason): boolean;
  frame(callback: (timestamp: number, session: InteractionSessionLike) => void): unknown;
  delay(delayMs: number, callback: (session: InteractionSessionLike) => void): unknown;
}

interface InteractionManagerLike {
  readonly current: any;
  activate(
    kind: ActiveInteractionKind,
    options: {
      phase: string;
      owner: InteractionOwner;
      onEvent?: (event: object, session: InteractionSessionLike) => void;
      onCancel?: (reason: InteractionCancelReason, session: InteractionSessionLike) => void;
    },
  ): InteractionSessionLike;
  cancel(reason?: InteractionCancelReason, guard?: {sessionId?: number}): boolean;
}

export interface RuntimeInteractionOwnerDependencies<TTrail extends {id: string}> {
  manager: InteractionManagerLike;
  findTrail: (trailId: string) => TTrail | null;
  primaryTrailId: () => string | null;
  sameOwner: (left: InteractionOwner | null, right: InteractionOwner | null) => boolean;
  notifyBlocked: () => void;
  notifyCommands: () => void;
}

export interface RuntimeInteractionOwner<TTrail extends {id: string}> {
  trailRevision(trail: TTrail | null | undefined): number;
  markTrailRevision(trail: TTrail | null | undefined): number;
  interactionOwner(trail: TTrail | null | undefined): InteractionOwner | null;
  setSegmentDirtyReader(reader: () => boolean): void;
  begin(
    kind: ActiveInteractionKind,
    phase: string,
    trail: TTrail | null | undefined,
    options?: {
      onEvent?: (event: object, session: InteractionSessionLike) => void;
      onCancel?: (event: {
        fromManager: true;
        reason: InteractionCancelReason;
        session: InteractionSessionLike;
      }) => void;
    },
  ): InteractionSessionLike | null;
  cancel(kind: ActiveInteractionKind, reason?: InteractionCancelReason): boolean;
  isCurrent(kind: ActiveInteractionKind, trailId?: string | null): boolean;
  setPhase(kind: ActiveInteractionKind, phase: string): boolean;
  scheduleFrame(kind: ActiveInteractionKind, callback: (session: InteractionSessionLike) => void): unknown;
  ownerIsCurrent(session?: InteractionSessionLike): boolean;
  revalidate(): boolean;
  dispatch(kind: ActiveInteractionKind, event: object): boolean;
}

/** Owns trail revision guards and the shared interaction-session lifecycle. */
export function createRuntimeInteractionOwner<TTrail extends {id: string}>(
  dependencies: RuntimeInteractionOwnerDependencies<TTrail>,
): RuntimeInteractionOwner<TTrail> {
  const revisions = new WeakMap<TTrail, number>();
  let segmentIsDirty = (): boolean => false;

  const trailRevision = (trail: TTrail | null | undefined): number =>
    trail ? revisions.get(trail) || 0 : 0;

  const markTrailRevision = (trail: TTrail | null | undefined): number => {
    if(!trail) return 0;
    const revision = trailRevision(trail) + 1;
    revisions.set(trail, revision);
    return revision;
  };

  const interactionOwner = (trail: TTrail | null | undefined): InteractionOwner | null =>
    trail ? {trailId:String(trail.id), revision:trailRevision(trail)} : null;

  const ownerIsCurrent = (session = dependencies.manager.current): boolean => {
    if(!session || session.kind === 'idle') return true;
    const owner = session.owner;
    if(!owner) return false;
    const trail = dependencies.findTrail(owner.trailId);
    if(!trail || dependencies.primaryTrailId() !== owner.trailId) return false;
    return dependencies.sameOwner(owner, interactionOwner(trail));
  };

  const revalidate = (): boolean => {
    const current = dependencies.manager.current;
    if(current.kind === 'idle' || ownerIsCurrent(current)) return true;
    dependencies.manager.cancel('owner-invalid', {sessionId:current.sessionId});
    return false;
  };

  const begin = (
    kind: ActiveInteractionKind,
    phase: string,
    trail: TTrail | null | undefined,
    options: Parameters<RuntimeInteractionOwner<TTrail>['begin']>[3] = {},
  ): InteractionSessionLike | null => {
    if(kind !== 'segment' && dependencies.manager.current.kind === 'segment' && segmentIsDirty()) {
      dependencies.notifyBlocked();
      return null;
    }
    const owner = interactionOwner(trail);
    if(!owner) return null;
    const session = dependencies.manager.activate(kind, {
      phase,
      owner,
      onEvent:(event, current) => options.onEvent?.(event, current),
      onCancel:(reason, current) => {
        try {
          options.onCancel?.({fromManager:true, reason, session:current});
        } finally {
          dependencies.notifyCommands();
        }
      },
    });
    dependencies.notifyCommands();
    return session;
  };

  return Object.freeze({
    trailRevision,
    markTrailRevision,
    interactionOwner,
    setSegmentDirtyReader(reader: () => boolean): void {
      segmentIsDirty = reader;
    },
    begin,
    cancel(kind: ActiveInteractionKind, reason: InteractionCancelReason = 'cancelled'): boolean {
      if(dependencies.manager.current.kind !== kind) return false;
      return dependencies.manager.cancel(reason);
    },
    isCurrent(kind: ActiveInteractionKind, trailId: string | null = null): boolean {
      const current = dependencies.manager.current;
      return current.kind === kind
        && current.isCurrent()
        && ownerIsCurrent(current)
        && (trailId == null || current.owner?.trailId === String(trailId));
    },
    setPhase(kind: ActiveInteractionKind, phase: string): boolean {
      if(dependencies.manager.current.kind !== kind || !revalidate()) return false;
      return dependencies.manager.current.setPhase(phase);
    },
    scheduleFrame(
      kind: ActiveInteractionKind,
      callback: (session: InteractionSessionLike) => void,
    ): unknown {
      const current = dependencies.manager.current;
      if(current.kind !== kind || !revalidate()) return null;
      return current.frame(() => callback(current));
    },
    ownerIsCurrent,
    revalidate,
    dispatch(kind: ActiveInteractionKind, event: object): boolean {
      const current = dependencies.manager.current;
      if(current.kind !== kind || !revalidate()) return false;
      return current.dispatch(event);
    },
  });
}
