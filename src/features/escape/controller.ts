import type { RuntimeContext } from '../../app/runtime/context.ts';
import {
  buildManualEscapeRoute,
  escapeItineraryDays,
  resolveEscapeRouteDay,
} from '../../core/escape.ts';
import { haversine } from '../../core/geo.ts';
import type {
  EscapeAnchorPoint,
  EscapeRoute,
  EscapeRoutePreviewResult,
} from '../../core/escape.ts';
import type { TrackTuple } from '../../core/types.ts';

export interface EscapeTrail {
  id: string;
  name: string;
  group?: string;
  track: TrackTuple[];
  escape_routes?: EscapeRoute[];
  [key: string]: unknown;
}

export interface EscapeInteractionState {
  active: boolean;
  trailId: string | null;
  referenceTrailId: string | null;
  ptA: EscapeAnchorPoint | null;
  ptB: EscapeAnchorPoint | null;
  layer: unknown;
  _pending: EscapeRoute | null;
}

export interface EscapeControllerDependencies {
  markRevision: (trail: EscapeTrail) => unknown;
  createRouteId?: () => string;
}

export interface EscapeController {
  readonly state: Readonly<EscapeInteractionState>;
  enter: (trailId: string) => boolean;
  setReferenceTrail: (trailId: string) => boolean;
  exit: () => void;
  reset: () => void;
  nearestPoint: (lat: number, lng: number, maxDistanceM?: number) => EscapeAnchorPoint | null;
  selectA: (point: EscapeAnchorPoint) => void;
  selectB: (point: EscapeAnchorPoint) => void;
  compute: () => EscapeRoutePreviewResult;
  availableDays: () => number[];
  setDay: (day: number) => boolean;
  commit: (name: string) => EscapeRoute | null;
  deleteRoute: (trailId: string, routeId: string) => boolean;
  selectDisplayedRoute: (trailId: string, routeId: string) => EscapeRoute | null;
  clearDisplayedRoute: () => void;
}

export function createEscapeInteractionState(): EscapeInteractionState {
  return {active:false, trailId:null, referenceTrailId:null, ptA:null, ptB:null, layer:null, _pending:null};
}

/** Owns escape-route interaction and project mutations without Leaflet or DOM access. */
export function createEscapeController(
  context: RuntimeContext<EscapeTrail>,
  dependencies: EscapeControllerDependencies,
): EscapeController {
  if(typeof dependencies.markRevision !== 'function') {
    throw new TypeError('EscapeController requires markRevision');
  }
  const createRouteId = dependencies.createRouteId || (() => `manual-escape-${Date.now()}`);
  const state = createEscapeInteractionState();
  const findTrail = (trailId: string | null): EscapeTrail | null =>
    context.project.trails.find(trail => trail.id === trailId) || null;

  const reset = (): void => {
    state.ptA = null;
    state.ptB = null;
    state._pending = null;
  };

  const enter = (trailId: string): boolean => {
    const trail = findTrail(trailId);
    if(!trail?.track.length || context.state.snapshot().primaryTrailId !== trailId) return false;
    state.active = true;
    state.trailId = trailId;
    state.referenceTrailId = trailId;
    reset();
    return true;
  };

  const setReferenceTrail = (trailId: string): boolean => {
    if(!state.active) return false;
    const trail = findTrail(trailId);
    const appState = context.state.snapshot();
    if(!trail?.track.length || appState.activeGroup == null || (trail.group || '默认') !== appState.activeGroup) {
      return false;
    }
    state.referenceTrailId = trailId;
    reset();
    return true;
  };

  const exit = (): void => {
    state.active = false;
    state.trailId = null;
    state.referenceTrailId = null;
    reset();
  };

  const nearestPoint = (lat: number, lng: number, maxDistanceM = 2000): EscapeAnchorPoint | null => {
    const appState = context.state.snapshot();
    if(appState.activeGroup == null) return null;
    let best: EscapeAnchorPoint | null = null;
    let bestDistance = Infinity;
    for(const trail of context.project.trails) {
      if(trail.id !== state.referenceTrailId || (trail.group || '默认') !== appState.activeGroup) continue;
      for(let index = 0; index < trail.track.length; index += 1) {
        const point = trail.track[index];
        const distance = haversine(lat, lng, point[0], point[1]);
        if(distance >= bestDistance) continue;
        bestDistance = distance;
        best = {
          lat:point[0], lng:point[1], elev:point[2] || 0, km:point[3] || 0,
          trailId:trail.id, trailName:trail.name, trackIdx:index,
        };
      }
    }
    return bestDistance < maxDistanceM ? best : null;
  };

  const selectA = (point: EscapeAnchorPoint): void => {
    state.ptA = point;
    state.ptB = null;
    state._pending = null;
  };

  const selectB = (point: EscapeAnchorPoint): void => {
    state.ptB = point;
    state._pending = null;
  };

  const compute = (): EscapeRoutePreviewResult => {
    const pointA = state.ptA;
    const pointB = state.ptB;
    if(!pointA || !pointB) return {ok:false, reason:'empty-track'};
    if(pointA.trailId !== state.referenceTrailId || pointB.trailId !== state.referenceTrailId) {
      return {ok:false, reason:'empty-track'};
    }
    const referenceTrail = findTrail(state.referenceTrailId);
    if(!referenceTrail?.track.length) return {ok:false, reason:'empty-track'};
    const result = buildManualEscapeRoute(referenceTrail, pointA, pointB, createRouteId());
    if(result.ok) {
      const primaryTrail = findTrail(state.trailId);
      const day = primaryTrail ? resolveEscapeRouteDay(primaryTrail, result.preview.pointA) : null;
      if(day != null) result.preview.route.day = day;
    }
    state._pending = result.ok ? result.preview.route : null;
    return result;
  };

  const availableDays = (): number[] => {
    const trail = findTrail(state.trailId);
    return trail ? escapeItineraryDays(trail) : [];
  };

  const setDay = (day: number): boolean => {
    if(!state._pending || !availableDays().includes(day)) return false;
    state._pending.day = day;
    return true;
  };

  const commit = (name: string): EscapeRoute | null => {
    const trail = findTrail(state.trailId);
    if(!trail || context.state.snapshot().primaryTrailId !== trail.id || !state._pending) return null;
    const cleanName = name.trim();
    const route: EscapeRoute = {...state._pending};
    if(cleanName) {
      const anchorName = route._anchor?.trailName || '';
      const terrain = route.drop_m > 0 ? '下降' : route.drop_m < 0 ? '上升' : '平路';
      const direction = route.direction === 'reverse' ? '逆向（反方向）' : '正向';
      route.name = cleanName;
      route.desc = `手动标注 · ${direction} · 依据轨迹《${anchorName}》，沿轨迹约 ${route.distance_km}km，落差 ${Math.abs(route.drop_m)}m（${terrain}）。`;
    }
    trail.escape_routes = (trail.escape_routes || []).filter(candidate => candidate.id !== route.id);
    trail.escape_routes.push(route);
    state._pending = route;
    dependencies.markRevision(trail);
    return route;
  };

  const deleteRoute = (trailId: string, routeId: string): boolean => {
    const trail = findTrail(trailId);
    if(!trail?.escape_routes) return false;
    const route = trail.escape_routes.find(candidate => candidate.id === routeId);
    if(!route?._manual) return false;
    trail.escape_routes = trail.escape_routes.filter(candidate => candidate.id !== routeId);
    if(context.state.snapshot().activeEscape === routeId) {
      context.state.dispatch({type:'escape.set-active', escapeId:null});
    }
    dependencies.markRevision(trail);
    return true;
  };

  const selectDisplayedRoute = (trailId: string, routeId: string): EscapeRoute | null => {
    context.state.dispatch({type:'escape.set-active', escapeId:null});
    const trail = findTrail(trailId);
    const route = trail?.escape_routes?.find(candidate => candidate.id === routeId) || null;
    if(!route) return null;
    context.state.dispatch({type:'escape.set-active', escapeId:routeId});
    return route;
  };

  const clearDisplayedRoute = (): void => {
    context.state.dispatch({type:'escape.set-active', escapeId:null});
  };

  return Object.freeze({
    state,
    enter,
    setReferenceTrail,
    exit,
    reset,
    nearestPoint,
    selectA,
    selectB,
    compute,
    availableDays,
    setDay,
    commit,
    deleteRoute,
    selectDisplayedRoute,
    clearDisplayedRoute,
  });
}
