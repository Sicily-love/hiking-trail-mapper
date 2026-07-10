import type { TrackIndexPoint } from '../../core/types.ts';
import { applyMeasureEndpointState, reverseMeasureEndpoints } from '../../core/measure.ts';

export interface MeasureInteractionState {
  active: boolean;
  ptA: TrackIndexPoint | null;
  ptB: TrackIndexPoint | null;
  layer: unknown;
  segmentLine: unknown;
  _justDragged: boolean;
  _computeSeq: number;
  _liveFrame: number;
}
export function createMeasureInteractionState(): MeasureInteractionState {
  return {
    active: false,
    ptA: null,
    ptB: null,
    layer: null,
    segmentLine: null,
    _justDragged: false,
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
