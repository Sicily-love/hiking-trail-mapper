export interface DayPreviewInteractionState {
  active: boolean;
  layer: unknown;
  trailId: string | null;
  day: number | null;
  iStart: number | null;
  iEnd: number | null;
}

export function createDayPreviewInteractionState(): DayPreviewInteractionState {
  return { active: false, layer: null, trailId: null, day: null, iStart: null, iEnd: null };
}

export function clearDayPreviewState(state: DayPreviewInteractionState): void {
  state.active = false;
  state.trailId = null;
  state.day = null;
  state.iStart = null;
  state.iEnd = null;
}
