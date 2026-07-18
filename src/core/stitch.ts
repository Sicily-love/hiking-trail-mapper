import { haversine, nearestPointIndex } from './geo.ts';
import { computeSegmentedTrackMetrics } from './trackSegments.ts';
import type { TrackTuple } from './types.ts';

export interface StitchWaypoint {
  id?: string;
  lat?: number;
  lng?: number;
  gps_idx?: number | null;
  km?: number;
  elev?: number;
  day?: number;
  [key: string]: unknown;
}

export interface StitchTrail {
  id: string;
  name: string;
  track: TrackTuple[];
  track_breaks?: number[];
  waypoints?: StitchWaypoint[];
  group?: string | null;
}

export interface StitchPart {
  trail: StitchTrail;
  reversed?: boolean;
  startIndex?: number;
  endIndex?: number;
}

export interface StitchJunction {
  fromTrailId: string;
  toTrailId: string;
  distanceM: number;
  merged: boolean;
  breakIndex: number | null;
}

export interface StitchedTrail {
  id: string;
  name: string;
  source: string;
  group?: string | null;
  days: number;
  track: TrackTuple[];
  track_breaks: number[];
  stats: ReturnType<typeof computeSegmentedTrackMetrics>['stats'];
  day_meta: never[];
  _descCum: number[];
  waypoints: StitchWaypoint[];
  escape_routes: never[];
  calc_method: Record<string, string>;
  stitch_sources: Array<{
    trailId: string;
    name: string;
    reversed: boolean;
    startIndex: number;
    endIndex: number;
  }>;
  stitch_junctions: StitchJunction[];
}

export interface StitchOptions {
  id: string;
  name: string;
  seamToleranceM?: number;
}

function finiteElevation(point: TrackTuple): number {
  const elevation = Number(point[2]);
  return Number.isFinite(elevation) ? elevation : 0;
}

function waypointSourceIndex(waypoint: StitchWaypoint, trail: StitchTrail): number | null {
  const explicit = Number(waypoint.gps_idx);
  if(Number.isInteger(explicit) && explicit >= 0 && explicit < trail.track.length) return explicit;
  const lat = Number(waypoint.lat);
  const lng = Number(waypoint.lng);
  if(!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return nearestPointIndex(
    {lat, lng},
    trail.track.map(point => ({lat:point[0], lng:point[1]})),
  );
}

function normalizePartRange(part: StitchPart): {startIndex: number; endIndex: number} {
  const lastIndex = part.trail.track.length - 1;
  const requestedStart = Number.isFinite(part.startIndex) ? Math.round(Number(part.startIndex)) : 0;
  const requestedEnd = Number.isFinite(part.endIndex) ? Math.round(Number(part.endIndex)) : lastIndex;
  const startIndex = Math.max(0, Math.min(lastIndex, Math.min(requestedStart, requestedEnd)));
  const endIndex = Math.max(0, Math.min(lastIndex, Math.max(requestedStart, requestedEnd)));
  if(endIndex <= startIndex) throw new RangeError(`Trail ${part.trail.id} range requires at least two points`);
  return {startIndex, endIndex};
}

/** Joins whole existing trails while leaving every source trail untouched. */
export function stitchTrails(parts: StitchPart[], options: StitchOptions): StitchedTrail {
  if(parts.length < 2) throw new RangeError('At least two trails are required');
  if(!options.id.trim()) throw new TypeError('A stitched trail id is required');
  if(!options.name.trim()) throw new TypeError('A stitched trail name is required');
  const tolerance = Math.max(0, options.seamToleranceM ?? 5);
  const merged: TrackTuple[] = [];
  const waypoints: StitchWaypoint[] = [];
  const junctions: StitchJunction[] = [];
  const trackBreaks: number[] = [];
  const sourceRanges: Array<{startIndex: number; endIndex: number}> = [];

  for(const [partIndex, part] of parts.entries()) {
    const source = part.trail;
    if(!source.track?.length) throw new RangeError(`Trail ${source.id} has no track points`);
    const range = normalizePartRange(part);
    sourceRanges.push(range);
    const selected = source.track.slice(range.startIndex, range.endIndex + 1);
    const oriented = part.reversed ? selected.reverse() : selected;
    let skipFirst = false;
    if(merged.length) {
      const previous = merged[merged.length - 1];
      const next = oriented[0];
      const distanceM = haversine(previous[0], previous[1], next[0], next[1]);
      skipFirst = distanceM <= tolerance;
      const breakIndex = skipFirst ? null : merged.length;
      if(breakIndex !== null) trackBreaks.push(breakIndex);
      junctions.push({
        fromTrailId:parts[partIndex - 1].trail.id,
        toTrailId:source.id,
        distanceM,
        merged:skipFirst,
        breakIndex,
      });
    }
    const offset = merged.length;
    for(let index = skipFirst ? 1 : 0; index < oriented.length; index += 1) {
      const point = oriented[index];
      merged.push([point[0], point[1], finiteElevation(point)]);
    }
    for(const sourceBreak of source.track_breaks || []) {
      if(sourceBreak <= range.startIndex || sourceBreak > range.endIndex) continue;
      const localBreak = sourceBreak - range.startIndex;
      const orientedBreak = part.reversed ? selected.length - localBreak : localBreak;
      const mergedBreak = offset + orientedBreak - (skipFirst ? 1 : 0);
      if(mergedBreak > 0 && mergedBreak < merged.length && !trackBreaks.includes(mergedBreak)) {
        trackBreaks.push(mergedBreak);
      }
    }

    for(const waypoint of source.waypoints || []) {
      const originalIndex = waypointSourceIndex(waypoint, source);
      if(originalIndex == null) continue;
      if(originalIndex < range.startIndex || originalIndex > range.endIndex) continue;
      const localIndex = originalIndex - range.startIndex;
      const orientedIndex = part.reversed ? selected.length - 1 - localIndex : localIndex;
      const mergedIndex = skipFirst && orientedIndex === 0
        ? Math.max(0, offset - 1)
        : offset + orientedIndex - (skipFirst ? 1 : 0);
      const point = merged[mergedIndex];
      if(!point) continue;
      waypoints.push({
        ...waypoint,
        id:`${options.id}-wp-${waypoints.length + 1}`,
        lat:point[0],
        lng:point[1],
        gps_idx:mergedIndex,
        elev:Math.round(finiteElevation(point)),
        day:undefined,
      });
    }
  }

  if(merged.length < 2) throw new RangeError('The stitched trail requires at least two track points');
  const metrics = computeSegmentedTrackMetrics(merged, trackBreaks, 10);
  trackBreaks.sort((left, right) => left - right);
  for(let index = 0; index < merged.length; index += 1) {
    merged[index][3] = +(metrics.cumulativeDistanceM[index] / 1000).toFixed(2);
    merged[index][4] = Math.round(metrics.cumulativeAscentM[index]);
  }
  for(const waypoint of waypoints) {
    const index = Number(waypoint.gps_idx);
    waypoint.km = +Number(merged[index]?.[3] || 0).toFixed(1);
  }
  waypoints.sort((left, right) => Number(left.km || 0) - Number(right.km || 0));

  return {
    id:options.id.trim(),
    name:options.name.trim(),
    source:'',
    group:parts[0].trail.group || null,
    days:0,
    track:merged,
    track_breaks:trackBreaks,
    stats:metrics.stats,
    day_meta:[],
    _descCum:metrics.cumulativeDescentM,
    waypoints,
    escape_routes:[],
    calc_method:{
      distance:'haversine球面公式累加',
      ascent:'累加器法 thr=10m',
      elev_smooth:'滑动平均 win=7',
      stitch:`轨迹区间顺序拼接，${tolerance}m 内接缝点自动合并，断点不计距离与高差`,
    },
    stitch_sources:parts.map((part, index) => ({
      trailId:part.trail.id,
      name:part.trail.name,
      reversed:Boolean(part.reversed),
      startIndex:sourceRanges[index].startIndex,
      endIndex:sourceRanges[index].endIndex,
    })),
    stitch_junctions:junctions,
  };
}
