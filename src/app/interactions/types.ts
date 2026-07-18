export const INTERACTION_KINDS = [
  'idle',
  'measure',
  'segment',
  'waypoint',
  'escape',
  'stitch',
  'day-preview',
] as const;

export const ACTIVE_INTERACTION_KINDS = [
  'measure',
  'segment',
  'waypoint',
  'escape',
  'stitch',
  'day-preview',
] as const;

export type InteractionKind = typeof INTERACTION_KINDS[number];
export type ActiveInteractionKind = typeof ACTIVE_INTERACTION_KINDS[number];

export interface InteractionOwner {
  readonly trailId: string;
  readonly revision: number;
}

export type InteractionEventMap = {
  [K in ActiveInteractionKind]: object;
};

export type InteractionPhaseMap = {
  [K in ActiveInteractionKind]: string;
};

export interface InteractionGuard {
  readonly owner?: InteractionOwner;
  readonly sessionId?: number;
}

export const INTERACTION_CANCEL_REASONS = [
  'cancelled',
  'replaced',
  'owner-invalid',
  'aborted',
] as const;

export type BuiltinInteractionCancelReason = typeof INTERACTION_CANCEL_REASONS[number];
export type InteractionCancelReason = BuiltinInteractionCancelReason | (string & {});

export interface InteractionTask {
  readonly pending: boolean;
  cancel(): void;
}

export interface InteractionScheduler {
  requestFrame(callback: (timestamp: number) => void): unknown;
  cancelFrame(handle: unknown): void;
  setDelay(callback: () => void, delayMs: number): unknown;
  clearDelay(handle: unknown): void;
}

export interface InteractionManagerOptions {
  readonly scheduler?: InteractionScheduler;
  readonly canTransition?: (
    kind: ActiveInteractionKind,
    currentPhase: string,
    nextPhase: string,
  ) => boolean;
}

export interface IdleInteraction {
  readonly kind: 'idle';
  readonly phase: 'idle';
  readonly owner: null;
  readonly sessionId: 0;
  readonly abortController: null;
  readonly signal: null;
}

export interface InteractionSession<
  K extends ActiveInteractionKind = ActiveInteractionKind,
  P extends string = string,
  E extends object = object,
> {
  readonly kind: K;
  readonly phase: P;
  readonly owner: Readonly<InteractionOwner>;
  readonly sessionId: number;
  readonly abortController: AbortController;
  readonly signal: AbortSignal;

  isCurrent(): boolean;
  setPhase(nextPhase: P): boolean;
  dispatch(event: E): boolean;
  cancel(reason?: InteractionCancelReason): boolean;
  frame(callback: (timestamp: number, session: InteractionSession<K, P, E>) => void): InteractionTask | null;
  delay(delayMs: number, callback: (session: InteractionSession<K, P, E>) => void): InteractionTask | null;
}

export type AnyInteractionSession<
  Events extends InteractionEventMap = InteractionEventMap,
  Phases extends InteractionPhaseMap = InteractionPhaseMap,
> = {
  [K in ActiveInteractionKind]: InteractionSession<K, Phases[K], Events[K]>;
}[ActiveInteractionKind];

export type InteractionState<
  Events extends InteractionEventMap = InteractionEventMap,
  Phases extends InteractionPhaseMap = InteractionPhaseMap,
> = IdleInteraction | AnyInteractionSession<Events, Phases>;

export type InteractionEventHandler<
  K extends ActiveInteractionKind,
  P extends string,
  E extends object,
> = (event: E, session: InteractionSession<K, P, E>) => void;

export type InteractionCancelHandler<
  K extends ActiveInteractionKind,
  P extends string,
  E extends object,
> = (reason: InteractionCancelReason, session: InteractionSession<K, P, E>) => void;

export interface InteractionActivation<
  K extends ActiveInteractionKind,
  P extends string,
  E extends object,
> {
  readonly kind: K;
  readonly phase: P;
  readonly owner: InteractionOwner;
  readonly onEvent?: InteractionEventHandler<K, P, E>;
  readonly onCancel?: InteractionCancelHandler<K, P, E>;
}

export type InteractionActivationOptions<
  K extends ActiveInteractionKind,
  P extends string,
  E extends object,
> = Omit<InteractionActivation<K, P, E>, 'kind'>;

export interface InteractionDispatch<K extends ActiveInteractionKind, E extends object> extends InteractionGuard {
  readonly kind: K;
  readonly event: E;
}
