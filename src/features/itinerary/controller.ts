import type { RuntimeContext } from '../../app/runtime/context.ts';
import { computeDayRangeStats, getDayIndexRange } from '../../core/itinerary.ts';
import { buildDayPreviewRenderModel } from '../../core/render.ts';
import type {
  DayMeta,
  DayPreviewRenderModel,
  DayRangeStats,
  DayRangeTrail,
} from '../../core/types.ts';

export interface DayPreviewInteractionState {
  active: boolean;
  layer: unknown;
  trailId: string | null;
  day: number | null;
  iStart: number | null;
  iEnd: number | null;
}

export interface DayPreviewTrail extends DayRangeTrail {
  id: string;
}

export interface DayPreviewPlan {
  trail: DayPreviewTrail;
  trailId: string;
  day: number;
  model: DayPreviewRenderModel;
  stats: DayRangeStats;
}

export interface DayPreviewController {
  readonly state: Readonly<DayPreviewInteractionState>;
  prepare: (trailId: string, dayMeta: Partial<DayMeta>, maxPoints?: number) => DayPreviewPlan | null;
  activate: (plan: DayPreviewPlan) => boolean;
  isActive: (trailId: string, day: number) => boolean;
  exit: () => void;
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

/** Owns Day-preview selection state while rendering remains in the runtime adapter. */
export function createDayPreviewController(
  context: RuntimeContext<DayPreviewTrail>,
): DayPreviewController {
  const state = createDayPreviewInteractionState();

  const prepare = (
    trailId: string,
    dayMeta: Partial<DayMeta>,
    maxPoints = 1200,
  ): DayPreviewPlan | null => {
    const trail = context.project.trails.find(candidate => candidate.id === trailId);
    const day = Number(dayMeta.d);
    if(!trail?.track.length || !Number.isInteger(day) || day < 1) return null;
    if(context.state.snapshot().primaryTrailId !== trailId) return null;
    const range = getDayIndexRange(trail, dayMeta);
    if(!range) return null;
    const model = buildDayPreviewRenderModel(trail.track, range, maxPoints);
    const stats = computeDayRangeStats(trail, range);
    if(!model || !stats) return null;
    return {trail, trailId, day, model, stats};
  };

  const activate = (plan: DayPreviewPlan): boolean => {
    const trail = context.project.trails.find(candidate => candidate.id === plan.trailId);
    if(trail !== plan.trail || context.state.snapshot().primaryTrailId !== plan.trailId) return false;
    state.active = true;
    state.trailId = plan.trailId;
    state.day = plan.day;
    state.iStart = plan.model.iStart;
    state.iEnd = plan.model.iEnd;
    return true;
  };

  const isActive = (trailId: string, day: number): boolean =>
    state.active && state.trailId === trailId && state.day === day;

  const exit = (): void => clearDayPreviewState(state);
  return Object.freeze({state, prepare, activate, isActive, exit});
}
