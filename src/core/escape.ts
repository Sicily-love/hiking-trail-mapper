import { accumulatorAscent, accumulatorDescent } from './elevation.ts';
import { haversine } from './geo.ts';
import type { TrackTuple } from './types.ts';

export interface EscapeAnchorPoint {
  lat: number;
  lng: number;
  elev: number;
  km: number;
  trailId: string;
  trailName: string;
  trackIdx: number;
}

export interface EscapeRouteAnchor {
  trailId: string;
  trailName: string;
}

export type EscapeRouteDirection = 'forward' | 'reverse';

export interface EscapeRoute {
  id: string;
  name: string;
  desc: string;
  distance_km: number;
  straight_km?: number;
  drop_m: number;
  day?: number;
  days?: number[];
  direction?: EscapeRouteDirection;
  line: Array<[number, number]>;
  _manual?: boolean;
  _anchor?: EscapeRouteAnchor;
}

export function escapeRouteDays(route: Pick<EscapeRoute, 'day' | 'days'>): number[] {
  const values = Array.isArray(route.days) && route.days.length ? route.days : [route.day];
  return [...new Set(values
    .map(value => Math.trunc(Number(value)))
    .filter(value => value > 0))]
    .sort((left, right) => left - right);
}

export interface EscapeReferenceTrail {
  id: string;
  name: string;
  track: TrackTuple[];
  day_meta?: Array<{d?: number; i_start?: number; i_end?: number}>;
}

export interface EscapeRoutePreview {
  route: EscapeRoute;
  pointA: EscapeAnchorPoint;
  pointB: EscapeAnchorPoint;
  ascentM: number;
  descentM: number;
}

export type EscapeRoutePreviewResult =
  | {ok: true; preview: EscapeRoutePreview}
  | {ok: false; reason: 'empty-track' | 'same-point'};

function nearestTrackIndex(track: TrackTuple[], lat: number, lng: number): number {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for(let index = 0; index < track.length; index += 1) {
    const point = track[index];
    const distance = haversine(lat, lng, point[0], point[1]);
    if(distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

export function resolveEscapeRouteDay(
  trail: EscapeReferenceTrail,
  point: Pick<EscapeAnchorPoint, 'lat' | 'lng'>,
): number | null {
  if(!trail.track.length) return null;
  const index = nearestTrackIndex(trail.track, point.lat, point.lng);
  const explicitDay = Math.trunc(Number(trail.track[index]?.[5]));
  if(explicitDay > 0) return explicitDay;
  for(const meta of trail.day_meta || []) {
    const day = Math.trunc(Number(meta.d));
    const start = Math.trunc(Number(meta.i_start));
    const end = Math.trunc(Number(meta.i_end));
    if(day > 0 && Number.isFinite(start) && Number.isFinite(end) && index >= start && index <= end) {
      return day;
    }
  }
  return null;
}

export function escapeItineraryDays(trail: EscapeReferenceTrail): number[] {
  const metadataDays = new Set<number>();
  for(const meta of trail.day_meta || []) {
    const day = Math.trunc(Number(meta.d));
    if(day > 0) metadataDays.add(day);
  }
  if(metadataDays.size) return [...metadataDays].sort((left, right) => left - right);
  const days = new Set<number>();
  for(const point of trail.track) {
    const day = Math.trunc(Number(point[5]));
    if(day > 0) days.add(day);
  }
  if(!days.size && trail.track.length) days.add(1);
  return [...days].sort((left, right) => left - right);
}

export function resolveEscapeRouteDirection(
  route: Pick<EscapeRoute, 'direction' | 'desc'>,
): EscapeRouteDirection {
  if(route.direction === 'forward' || route.direction === 'reverse') return route.direction;
  return /逆向|反向|返回|reverse|backtrack/i.test(route.desc || '') ? 'reverse' : 'forward';
}

function anchorFromTrack(trail: EscapeReferenceTrail, index: number): EscapeAnchorPoint {
  const point = trail.track[index];
  return {
    lat:point[0],
    lng:point[1],
    elev:point[2] || 0,
    km:point[3] || 0,
    trailId:trail.id,
    trailName:trail.name,
    trackIdx:index,
  };
}

function thinEscapeLine(track: TrackTuple[], maxPoints = 200): Array<[number, number]> {
  if(!track.length) return [];
  const limit = Math.max(2, Math.floor(maxPoints));
  const sampleCount = Math.min(track.length, limit);
  return Array.from({length:sampleCount}, (_, sampleIndex) => {
    const trackIndex = sampleCount === 1
      ? 0
      : Math.round(sampleIndex * (track.length - 1) / (sampleCount - 1));
    return [+track[trackIndex][0].toFixed(6), +track[trackIndex][1].toFixed(6)];
  });
}

export function buildManualEscapeRoute(
  trail: EscapeReferenceTrail,
  pointA: Pick<EscapeAnchorPoint, 'lat' | 'lng'>,
  pointB: Pick<EscapeAnchorPoint, 'lat' | 'lng'>,
  routeId: string,
  maxLinePoints = 200,
): EscapeRoutePreviewResult {
  if(!trail.track.length) return {ok:false, reason:'empty-track'};
  const indexA = nearestTrackIndex(trail.track, pointA.lat, pointA.lng);
  const indexB = nearestTrackIndex(trail.track, pointB.lat, pointB.lng);
  if(indexA === indexB) return {ok:false, reason:'same-point'};

  const start = Math.min(indexA, indexB);
  const end = Math.max(indexA, indexB);
  const segment = trail.track.slice(start, end + 1);
  const directedSegment = indexA < indexB ? segment : [...segment].reverse();
  let distanceM = 0;
  for(let index = 1; index < directedSegment.length; index += 1) {
    distanceM += haversine(
      directedSegment[index - 1][0], directedSegment[index - 1][1],
      directedSegment[index][0], directedSegment[index][1],
    );
  }
  const elevations = directedSegment.map(point => point[2] || 0);
  const ascent = accumulatorAscent(elevations, 10);
  const descent = accumulatorDescent(elevations, 10);
  const ascentM = Math.round(ascent.at(-1) || 0);
  const descentM = Math.round(descent.at(-1) || 0);
  const snappedA = anchorFromTrack(trail, indexA);
  const snappedB = anchorFromTrack(trail, indexB);
  const dropM = Math.round(snappedA.elev - snappedB.elev);
  const distanceKm = +(distanceM / 1000).toFixed(1);
  const direction = indexA < indexB ? '正向' : '逆向（反方向）';
  const terrain = dropM > 0 ? '下降' : dropM < 0 ? '上升' : '平路';
  const name = `手动下撤 A→B（${trail.name}，${distanceKm}km）`;
  const route: EscapeRoute = {
    id:routeId,
    name,
    desc:`手动选点 · ${direction} · 依据轨迹《${trail.name}》，沿轨迹约 ${distanceKm}km，落差 ${Math.abs(dropM)}m（${terrain}）。↑${ascentM}m ↓${descentM}m`,
    distance_km:distanceKm,
    drop_m:dropM,
    direction:indexA < indexB ? 'forward' : 'reverse',
    line:thinEscapeLine(directedSegment, maxLinePoints),
    _manual:true,
    _anchor:{trailId:trail.id, trailName:trail.name},
  };
  return {
    ok:true,
    preview:{route, pointA:snappedA, pointB:snappedB, ascentM, descentM},
  };
}
