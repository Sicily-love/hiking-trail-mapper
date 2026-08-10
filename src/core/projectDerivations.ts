import { escapeRouteDays, resolveEscapeRouteDirection } from './escape.ts';
import { haversine } from './geo.ts';
import {
  buildDayMetaFromTrackDays,
  computeDayRangeStats,
  getDayIndexRange,
} from './itinerary.ts';
import type { ProjectArchive, ProjectArchiveJson, ProjectArchiveTrail } from './projectArchive.ts';
import { computeSegmentedTrackMetrics, normalizeTrackBreaks } from './trackSegments.ts';
import type { DayMeta, EnrichedWaypoint, TrackTuple } from './types.ts';

type JsonRecord = Record<string, ProjectArchiveJson>;
type MutableRecord = Record<string, any>;

function isRecord(value: unknown): value is MutableRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveInteger(value: unknown): number | null {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeTrack(rawTrack: ProjectArchiveJson[]): TrackTuple[] {
  return rawTrack.map(rawPoint => {
    const source = Array.isArray(rawPoint) ? rawPoint : [];
    const point: Array<number | null> = [
      finiteNumber(source[0]),
      finiteNumber(source[1]),
      finiteNumber(source[2]),
      0,
      0,
      positiveInteger(source[5]),
    ];
    if(source.length > 6) point.push(...source.slice(6).map(value => value as number | null));
    return point as TrackTuple;
  });
}

function nearestTrackIndex(track: TrackTuple[], lat: number, lng: number): number {
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  for(let index = 0; index < track.length; index += 1) {
    const distance = haversine(lat, lng, track[index][0], track[index][1]);
    if(distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }
  return nearestIndex;
}

function rebuildWaypoints(rawWaypoints: unknown, track: TrackTuple[]): MutableRecord[] {
  if(!Array.isArray(rawWaypoints) || !track.length) return [];
  return rawWaypoints.filter(isRecord).map((raw, index) => {
    const storedIndex = Math.trunc(Number(raw.gps_idx ?? raw.trackIdx));
    const hasStoredIndex = Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < track.length;
    const hasCoordinates = Number.isFinite(Number(raw.lat)) && Number.isFinite(Number(raw.lng));
    const trackIndex = hasStoredIndex
      ? storedIndex
      : hasCoordinates ? nearestTrackIndex(track, Number(raw.lat), Number(raw.lng)) : 0;
    const point = track[trackIndex];
    const name = String(raw.name || raw.label || raw.id || `Waypoint ${index + 1}`);
    return {
      ...raw,
      id:raw.id ?? `archive-waypoint-${index + 1}`,
      name,
      label:String(raw.label || name),
      lat:hasCoordinates ? Number(raw.lat) : point[0],
      lng:hasCoordinates ? Number(raw.lng) : point[1],
      gps_idx:trackIndex,
      km:+finiteNumber(point[3]).toFixed(1),
      elev:Math.round(finiteNumber(point[2])),
      day:positiveInteger(point[5]) || 1,
    };
  });
}

function dayRangeFromMeta(
  track: TrackTuple[],
  rawDayMeta: MutableRecord[],
  meta: MutableRecord,
): {iStart: number; iEnd: number} | null {
  return getDayIndexRange(
    {track, day_meta:rawDayMeta as Array<Partial<DayMeta>>},
    meta as Partial<DayMeta>,
  );
}

function assignDayIds(track: TrackTuple[], ranges: Array<{day: number; iStart: number; iEnd: number}>): void {
  if(!ranges.length) return;
  const fallbackDay = ranges[0].day;
  for(const point of track) point[5] = fallbackDay;
  for(let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex += 1) {
    const range = ranges[rangeIndex];
    const previous = ranges[rangeIndex - 1];
    const start = previous && range.iStart === previous.iEnd ? range.iStart + 1 : range.iStart;
    for(let index = start; index <= range.iEnd; index += 1) track[index][5] = range.day;
  }
}

function rebuildDayMeta(
  rawDayMeta: unknown,
  track: TrackTuple[],
  waypoints: MutableRecord[],
  descent: number[],
  declaredDays: unknown,
): DayMeta[] {
  const source = Array.isArray(rawDayMeta) ? rawDayMeta.filter(isRecord) : [];
  const ranges = source.map((meta, index) => {
    const range = dayRangeFromMeta(track, source, meta);
    if(!range) return null;
    return {meta, day:positiveInteger(meta.d) || index + 1, ...range};
  }).filter((value): value is NonNullable<typeof value> => !!value);

  if(ranges.length) {
    assignDayIds(track, ranges);
    return ranges.map(({meta, day, iStart, iEnd}) => {
      const stats = computeDayRangeStats({track, day_meta:source, _descCum:descent}, {iStart, iEnd});
      const endpoint = track[iEnd];
      return {
        d:day,
        date:typeof meta.date === 'string' ? meta.date : '',
        km:+finiteNumber(stats?.km).toFixed(1),
        asc:Math.round(finiteNumber(stats?.asc)),
        desc:Math.round(finiteNumber(stats?.desc)),
        max:Math.round(finiteNumber(stats?.max)),
        min:Math.round(finiteNumber(stats?.min)),
        camp:typeof meta.camp === 'string' && meta.camp.trim() ? meta.camp : '未标注',
        camp_elev:Math.round(finiteNumber(endpoint?.[2])),
        seg:typeof meta.seg === 'string' && meta.seg.trim() ? meta.seg : `D${day}行程`,
        i_start:iStart,
        i_end:iEnd,
      };
    });
  }

  const hasExplicitDays = track.some(point => positiveInteger(point[5]) !== null);
  if(!hasExplicitDays && !positiveInteger(declaredDays)) return [];
  if(!hasExplicitDays) for(const point of track) point[5] = 1;
  return buildDayMetaFromTrackDays(track, waypoints as EnrichedWaypoint[]);
}

function thinTrackLine(track: TrackTuple[], start: number, end: number, maxPoints = 200): number[][] {
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const count = high - low + 1;
  const sampleCount = Math.min(count, maxPoints);
  if(sampleCount < 2) return [];
  const indexes = Array.from({length:sampleCount}, (_, sampleIndex) =>
    low + Math.round(sampleIndex * (count - 1) / (sampleCount - 1)));
  if(start > end) indexes.reverse();
  return indexes.map(index => [
    +track[index][0].toFixed(6),
    +track[index][1].toFixed(6),
  ]);
}

function validRouteLine(raw: MutableRecord): number[][] {
  const source = Array.isArray(raw.line) && raw.line.length >= 2
    ? raw.line
    : Array.isArray(raw.track) ? raw.track : [];
  return source.filter(Array.isArray).map(point => [Number(point[0]), Number(point[1])])
    .filter(point => Number.isFinite(point[0]) && Number.isFinite(point[1]));
}

function lineDistanceKm(line: number[][]): number {
  let distance = 0;
  for(let index = 1; index < line.length; index += 1) {
    distance += haversine(line[index - 1][0], line[index - 1][1], line[index][0], line[index][1]);
  }
  return +(distance / 1000).toFixed(1);
}

function rebuildEscapeRoutes(
  rawRoutes: unknown,
  owner: MutableRecord,
  trailsById: Map<string, MutableRecord>,
): MutableRecord[] {
  if(!Array.isArray(rawRoutes)) return [];
  return rawRoutes.filter(isRecord).map((raw, index) => {
    let line = validRouteLine(raw);
    const anchorId = typeof raw._anchor?.trailId === 'string' ? raw._anchor.trailId : owner.id;
    const reference = trailsById.get(anchorId) || owner;
    const referenceTrack = Array.isArray(reference.track) ? reference.track as TrackTuple[] : [];
    let distanceKm = Number.isFinite(Number(raw.distance_km))
      ? Number(raw.distance_km)
      : lineDistanceKm(line);
    let dropM = finiteNumber(raw.drop_m);
    let direction = resolveEscapeRouteDirection(raw as any);

    if(line.length >= 2 && referenceTrack.length >= 2) {
      const start = nearestTrackIndex(referenceTrack, line[0][0], line[0][1]);
      const endPoint = line[line.length - 1];
      const end = nearestTrackIndex(referenceTrack, endPoint[0], endPoint[1]);
      if(start !== end) {
        distanceKm = +Math.abs(finiteNumber(referenceTrack[end][3]) - finiteNumber(referenceTrack[start][3])).toFixed(1);
        dropM = Math.round(finiteNumber(referenceTrack[start][2]) - finiteNumber(referenceTrack[end][2]));
        direction = start < end ? 'forward' : 'reverse';
      }
    } else if(line.length < 2 && referenceTrack.length >= 2) {
      const rawStart = Number(raw.i_start ?? raw.start_idx);
      const rawEnd = Number(raw.i_end ?? raw.end_idx);
      if(Number.isInteger(rawStart) && Number.isInteger(rawEnd)) {
        const start = Math.max(0, Math.min(referenceTrack.length - 1, Math.trunc(rawStart)));
        const end = Math.max(0, Math.min(referenceTrack.length - 1, Math.trunc(rawEnd)));
        line = thinTrackLine(referenceTrack, start, end);
        distanceKm = +Math.abs(finiteNumber(referenceTrack[end][3]) - finiteNumber(referenceTrack[start][3])).toFixed(1);
        dropM = Math.round(finiteNumber(referenceTrack[start][2]) - finiteNumber(referenceTrack[end][2]));
        direction = start < end ? 'forward' : 'reverse';
      }
    }

    const days = escapeRouteDays(raw as any);
    return {
      ...raw,
      id:String(raw.id || `archive-escape-${index + 1}`),
      name:String(raw.name || `Escape route ${index + 1}`),
      desc:typeof raw.desc === 'string' ? raw.desc : '',
      distance_km:Number.isFinite(distanceKm) ? distanceKm : 0,
      drop_m:Number.isFinite(dropM) ? dropM : 0,
      direction,
      line,
      ...(Array.isArray(raw.days) ? {days} : days[0] ? {day:days[0]} : {}),
    };
  });
}

function rebuildTrailBase<TTrail extends ProjectArchiveTrail>(trail: TTrail, threshold: number): TTrail {
  const source = trail as unknown as MutableRecord;
  const track = normalizeTrack(trail.track);
  const trackBreaks = normalizeTrackBreaks(source.track_breaks, track.length);
  const metrics = computeSegmentedTrackMetrics(track, trackBreaks, threshold);
  track.forEach((point, index) => {
    point[3] = +(metrics.cumulativeDistanceM[index] / 1000).toFixed(2);
    point[4] = Math.round(metrics.cumulativeAscentM[index]);
  });

  let waypoints = rebuildWaypoints(source.waypoints, track);
  const dayMeta = rebuildDayMeta(source.day_meta, track, waypoints, metrics.cumulativeDescentM, source.days);
  waypoints = rebuildWaypoints(waypoints, track);
  const stats = isRecord(source.stats) ? source.stats : {};
  return {
    ...source,
    track,
    track_breaks:trackBreaks,
    stats:{...stats, ...metrics.stats},
    days:dayMeta.length,
    day_meta:dayMeta,
    waypoints,
    _descCum:[...metrics.cumulativeDescentM],
    escape_routes:Array.isArray(source.escape_routes)
      ? source.escape_routes.map((route: unknown) => isRecord(route) ? {...route} : route)
      : [],
  } as unknown as TTrail;
}

/** Rebuilds every derived field without mutating the parsed archive. */
export function rebuildProjectDerivedData<TTrail extends ProjectArchiveTrail>(
  project: ProjectArchive<TTrail>['project'],
): ProjectArchive<TTrail>['project'] {
  const configuredThreshold = finiteNumber((project.calc_method as JsonRecord)?.threshold, 10);
  const threshold = configuredThreshold > 0 ? configuredThreshold : 10;
  const trails = project.trails.map(trail => rebuildTrailBase(trail, threshold));
  const trailsById = new Map(trails.map(trail => [trail.id, trail as unknown as MutableRecord]));
  const completed = trails.map(trail => {
    const source = trail as unknown as MutableRecord;
    return {
      ...source,
      escape_routes:rebuildEscapeRoutes(source.escape_routes, source, trailsById),
    } as unknown as TTrail;
  });
  return {...project, trails:completed};
}
