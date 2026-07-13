import type { TrackIndexPoint } from '../../core/types.ts';
import { applyMeasureEndpointState, reverseMeasureEndpoints } from '../../core/measure.ts';

export interface MeasureInteractionState {
  active: boolean;
  trailId: string | null;
  ptA: TrackIndexPoint | null;
  ptB: TrackIndexPoint | null;
  layer: unknown;
  segmentLine: unknown;
  _justDragged: boolean;
  _fastTapUntil: number;
  _computeSeq: number;
  _liveFrame: unknown;
}

export interface MeasureController {
  readonly state: Readonly<MeasureInteractionState>;
  enter: (trailId: string) => void;
  exit: () => void;
  reset: () => void;
  updateEndpoint: (label: 'A' | 'B', point: TrackIndexPoint | null) => boolean;
  reverse: () => boolean;
  beginDrag: () => void;
  endDrag: () => void;
  suppressFastTap: (until: number) => void;
  nextComputeSequence: () => number;
  isComputeCurrent: (sequence: number) => boolean;
}

export function createMeasureInteractionState(): MeasureInteractionState {
  return {
    active: false,
    trailId: null,
    ptA: null,
    ptB: null,
    layer: null,
    segmentLine: null,
    _justDragged: false,
    _fastTapUntil: 0,
    _computeSeq: 0,
    _liveFrame: 0,
  };
}

export function updateMeasureEndpoint(
  state: MeasureInteractionState,
  label: 'A' | 'B',
  point: TrackIndexPoint | null,
): boolean {
  const result = applyMeasureEndpointState(state.ptA, state.ptB, label, point);
  if(!result.ok) return false;
  state.ptA = result.ptA;
  state.ptB = result.ptB;
  return result.changed;
}

export function reverseMeasureInteraction(state: MeasureInteractionState): boolean {
  const result = reverseMeasureEndpoints(state.ptA, state.ptB);
  if(!result) return false;
  state.ptA = result.ptA;
  state.ptB = result.ptB;
  return true;
}

export function resetMeasureInteraction(state: MeasureInteractionState): void {
  state.ptA = null;
  state.ptB = null;
  state.segmentLine = null;
  state._computeSeq += 1;
}

/** Owns measurement session state without Leaflet, DOM, or scheduling effects. */
export function createMeasureController(): MeasureController {
  const state = createMeasureInteractionState();

  const invalidateComputation = (): number => {
    state._computeSeq += 1;
    return state._computeSeq;
  };

  const clearSelection = (): void => {
    state.ptA = null;
    state.ptB = null;
    state._justDragged = false;
    state._fastTapUntil = 0;
    invalidateComputation();
  };

  const enter = (trailId: string): void => {
    state.active = true;
    state.trailId = trailId;
    clearSelection();
  };

  const exit = (): void => {
    state.active = false;
    state.trailId = null;
    clearSelection();
  };

  const reset = (): void => {
    clearSelection();
  };

  const updateEndpoint = (label: 'A' | 'B', point: TrackIndexPoint | null): boolean =>
    updateMeasureEndpoint(state, label, point);

  const reverse = (): boolean => reverseMeasureInteraction(state);
  const beginDrag = (): void => { state._justDragged = true; };
  const endDrag = (): void => { state._justDragged = false; };
  const suppressFastTap = (until: number): void => {
    state._fastTapUntil = Math.max(0, until);
  };
  const nextComputeSequence = (): number => invalidateComputation();
  const isComputeCurrent = (sequence: number): boolean => sequence === state._computeSeq;

  return Object.freeze({
    state,
    enter,
    exit,
    reset,
    updateEndpoint,
    reverse,
    beginDrag,
    endDrag,
    suppressFastTap,
    nextComputeSequence,
    isComputeCurrent,
  });
}
