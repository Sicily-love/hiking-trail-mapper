import type { RuntimeContext } from '../../app/runtime/context.ts';
import {
  buildDayMetaFromSegments,
  deleteSegmentDay as deleteSegmentDayFromPoints,
  insertSegmentPoint,
  moveSegmentBoundary,
  renumberCampEditsForDelete,
  renumberCampEditsForInsert,
  restoreSegmentIndexes,
  segmentIndexesToPoints,
} from '../../core/itinerary.ts';
import type {
  DayMeta,
  SegmentBoundaryMoveResult,
  SegmentCampEdit,
  SegmentCampEdits,
  TrackIndexPoint,
  TrackTuple,
} from '../../core/types.ts';

export interface SegmentInteractionState {
  active: boolean;
  trailId: string | null;
  points: TrackIndexPoint[];
  campEdits: SegmentCampEdits;
  layer: unknown;
  _justDragged: boolean;
  _fastTapUntil: number;
}

export interface SegmentTrailWaypoint {
  lat?: number;
  lng?: number;
  gps_idx?: number | null;
  trackIdx?: number | null;
  day?: number | null;
  [key: string]: unknown;
}

export interface SegmentTrail {
  id: string;
  track: TrackTuple[];
  day_meta?: DayMeta[];
  days?: number;
  waypoints?: SegmentTrailWaypoint[];
  [key: string]: unknown;
}

export type SegmentEditReason = 'empty' | 'duplicate' | 'out-of-range' | 'min-days';

export interface SegmentEditResult {
  ok: boolean;
  reason?: SegmentEditReason;
}

export interface SegmentApplyResult {
  trail: SegmentTrail;
  dayCount: number;
}

export interface SegmentControllerDependencies {
  markRevision: (trail: SegmentTrail) => unknown;
}

export interface SegmentController {
  readonly state: Readonly<SegmentInteractionState>;
  enter: (trailId: string) => boolean;
  exit: () => void;
  isDirty: () => boolean;
  restore: () => boolean;
  insertPoint: (point: TrackIndexPoint | null) => SegmentEditResult;
  deleteDay: (dayNo: number) => SegmentEditResult;
  moveBoundary: (pointIndex: number, point: TrackIndexPoint | null) => SegmentBoundaryMoveResult;
  updateCamp: (dayNo: number, edit: SegmentCampEdit) => boolean;
  beginDrag: () => void;
  endDrag: () => void;
  suppressFastTap: (until: number) => void;
  apply: () => SegmentApplyResult | null;
}

export function createSegmentInteractionState(): SegmentInteractionState {
  return {
    active: false,
    trailId: null,
    points: [],
    campEdits: {},
    layer: null,
    _justDragged: false,
    _fastTapUntil: 0,
  };
}

function campEditsFromDayMeta(dayMeta: Array<Partial<DayMeta>> = []): SegmentCampEdits {
  const edits: SegmentCampEdits = {};
  const ordered = dayMeta.slice().sort((left, right) => (left.d || 0) - (right.d || 0));
  ordered.forEach((meta, index) => {
    if(!meta.camp || meta.camp === '-') return;
    edits[meta.d || index + 1] = {name:meta.camp};
  });
  return edits;
}

function assignTrackDayIds(track: TrackTuple[], points: TrackIndexPoint[]): void {
  const dayIds = new Array(track.length).fill(1);
  for(let day = 1; day < points.length; day += 1) {
    const start = Math.min(points[day - 1].idx, points[day].idx);
    const end = Math.max(points[day - 1].idx, points[day].idx);
    for(let index = start; index <= end; index += 1) dayIds[index] = day;
  }
  for(let index = 0; index < track.length; index += 1) {
    while(track[index].length < 6) track[index].push(null);
    track[index][5] = dayIds[index];
  }
}

function waypointTrackIndex(waypoint: SegmentTrailWaypoint, track: TrackTuple[]): number {
  const storedIndex = Number(waypoint.gps_idx ?? waypoint.trackIdx);
  if(Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < track.length) return storedIndex;
  if(!Number.isFinite(waypoint.lat) || !Number.isFinite(waypoint.lng)) return 0;

  let bestIndex = 0;
  let bestDistance = Infinity;
  const cosine = Math.cos(Number(waypoint.lat) * Math.PI / 180);
  for(let index = 0; index < track.length; index += 1) {
    const latitudeDelta = track[index][0] - Number(waypoint.lat);
    const longitudeDelta = (track[index][1] - Number(waypoint.lng)) * cosine;
    const distance = longitudeDelta * longitudeDelta + latitudeDelta * latitudeDelta;
    if(distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function assignWaypointDays(trail: SegmentTrail): void {
  for(const waypoint of trail.waypoints || []) {
    const index = waypointTrackIndex(waypoint, trail.track);
    const day = trail.track[index]?.[5];
    if(day != null) waypoint.day = day;
  }
}

/** Owns segment editing and commit mutations without Leaflet or DOM access. */
export function createSegmentController(
  context: RuntimeContext<SegmentTrail>,
  dependencies: SegmentControllerDependencies,
): SegmentController {
  if(typeof dependencies.markRevision !== 'function') {
    throw new TypeError('SegmentController requires markRevision');
  }
  const state = createSegmentInteractionState();
  let initialPoints: TrackIndexPoint[] = [];
  let initialCampEdits: SegmentCampEdits = {};
  const findTrail = (trailId = state.trailId): SegmentTrail | null =>
    context.project.trails.find(trail => trail.id === trailId) || null;

  const rememberSelection = (): void => {
    initialPoints = state.points.map(point => ({...point}));
    initialCampEdits = Object.fromEntries(
      Object.entries(state.campEdits).map(([day, edit]) => [day, {...edit}]),
    );
  };

  const restoreSelection = (trail: SegmentTrail): void => {
    const indexes = restoreSegmentIndexes(trail.track, trail.day_meta || []);
    state.points = segmentIndexesToPoints(trail.track, indexes);
    state.campEdits = campEditsFromDayMeta(trail.day_meta || []);
    rememberSelection();
  };

  const selectionSignature = (points: TrackIndexPoint[], campEdits: SegmentCampEdits): string => {
    const camps = Object.entries(campEdits)
      .map(([day, edit]) => [Number(day), String(edit.name || '').trim()])
      .sort((left, right) => Number(left[0]) - Number(right[0]));
    return JSON.stringify({indexes:points.map(point => point.idx), camps});
  };

  const isDirty = (): boolean => state.active && selectionSignature(state.points, state.campEdits)
    !== selectionSignature(initialPoints, initialCampEdits);

  const enter = (trailId: string): boolean => {
    const trail = findTrail(trailId);
    if(!trail?.track.length) return false;
    state.active = true;
    state.trailId = trailId;
    state._justDragged = false;
    state._fastTapUntil = 0;
    restoreSelection(trail);
    return true;
  };

  const exit = (): void => {
    state.active = false;
    state.trailId = null;
    state._justDragged = false;
    state._fastTapUntil = 0;
  };

  const restore = (): boolean => {
    const trail = findTrail();
    if(!trail?.track.length) return false;
    state.points = initialPoints.map(point => ({...point}));
    state.campEdits = Object.fromEntries(
      Object.entries(initialCampEdits).map(([day, edit]) => [day, {...edit}]),
    );
    return true;
  };

  const insertPoint = (point: TrackIndexPoint | null): SegmentEditResult => {
    if(!point) return {ok:false, reason:'empty'};
    if(state.points.some(candidate => candidate.idx === point.idx)) return {ok:false, reason:'duplicate'};
    const result = insertSegmentPoint(state.points, point);
    if(!result) return {ok:false, reason:'out-of-range'};
    state.points = result.points;
    state.campEdits = renumberCampEditsForInsert(state.campEdits, result.insertAt);
    return {ok:true};
  };

  const deleteDay = (dayNo: number): SegmentEditResult => {
    const oldDayCount = state.points.length - 1;
    if(oldDayCount <= 1) return {ok:false, reason:'min-days'};
    if(!Number.isInteger(dayNo) || dayNo < 1 || dayNo > oldDayCount) {
      return {ok:false, reason:'out-of-range'};
    }
    state.points = deleteSegmentDayFromPoints(state.points, dayNo);
    state.campEdits = renumberCampEditsForDelete(state.campEdits, dayNo, oldDayCount);
    return {ok:true};
  };

  const moveBoundary = (
    pointIndex: number,
    point: TrackIndexPoint | null,
  ): SegmentBoundaryMoveResult => {
    const result = moveSegmentBoundary(state.points, pointIndex, point);
    if(result.ok && result.changed) state.points = result.points;
    return result;
  };

  const updateCamp = (dayNo: number, edit: SegmentCampEdit): boolean => {
    if(!Number.isInteger(dayNo) || dayNo < 1 || dayNo >= state.points.length) return false;
    state.campEdits = {
      ...state.campEdits,
      [dayNo]: {...(state.campEdits[dayNo] || {}), name:edit.name},
    };
    return true;
  };

  const beginDrag = (): void => { state._justDragged = true; };
  const endDrag = (): void => { state._justDragged = false; };
  const suppressFastTap = (until: number): void => {
    state._fastTapUntil = Math.max(0, until);
  };

  const apply = (): SegmentApplyResult | null => {
    const trail = findTrail();
    if(!trail?.track.length || state.points.length < 2) return null;
    if(context.state.snapshot().primaryTrailId !== trail.id) return null;

    assignTrackDayIds(trail.track, state.points);
    trail.day_meta = buildDayMetaFromSegments(trail.track, state.points, state.campEdits);
    trail.days = trail.day_meta.length;
    assignWaypointDays(trail);
    dependencies.markRevision(trail);
    rememberSelection();
    return {trail, dayCount:trail.days};
  };

  return Object.freeze({
    state,
    enter,
    exit,
    isDirty,
    restore,
    insertPoint,
    deleteDay,
    moveBoundary,
    updateCamp,
    beginDrag,
    endDrag,
    suppressFastTap,
    apply,
  });
}
