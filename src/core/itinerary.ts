import { computeMeasureStats, computeSegmentStats, pointFromTrackIndex } from './measure.ts';
import type {
  DayIndexRange,
  DayMeta,
  DayRangeStats,
  DayRangeTrail,
  EnrichedWaypoint,
  SegmentCampEdits,
  SegmentBoundaryMoveResult,
  TrackIndexPoint,
  TrackTuple,
} from './types.ts';

const KEY_WAYPOINT_TAGS = new Set(['start', 'camp', 'pass', 'village', 'supply', 'end']);

function clampIndex(length: number, idx: number): number {
  if(length <= 0) return 0;
  const numeric = Number.isFinite(idx) ? idx : 0;
  return Math.max(0, Math.min(length - 1, Math.round(numeric)));
}

export function normalizeSegmentIndexes(track: TrackTuple[], indexes: number[]): number[] {
  if(!track.length) return [];
  const last = track.length - 1;
  const clean = Array.from(new Set((indexes || [])
    .map(v => clampIndex(track.length, Number(v)))
    .filter(Number.isInteger)))
    .sort((a, b) => a - b);
  if(clean[0] !== 0) clean.unshift(0);
  if(clean[clean.length - 1] !== last) clean.push(last);
  return clean;
}

export function segmentIndexesToPoints(track: TrackTuple[], indexes: number[]): TrackIndexPoint[] {
  return normalizeSegmentIndexes(track, indexes)
    .map(idx => pointFromTrackIndex(track, idx))
    .filter((p): p is TrackIndexPoint => !!p);
}

export function segmentHasExplicitDayIds(track: TrackTuple[]): boolean {
  return track.some(p => {
    const d = Number(p[5]);
    return Number.isInteger(d) && d > 0;
  });
}

export function segmentIndexesFromDayMeta(track: TrackTuple[], dayMeta: Array<Partial<DayMeta>>): number[] {
  if(!track.length || !dayMeta.length) return [];
  const indexes: number[] = [];
  const ordered = dayMeta.slice().sort((a, b) => (a.d || 0) - (b.d || 0));
  ordered.forEach((dm, i) => {
    const iStart = Number(dm.i_start);
    const iEnd = Number(dm.i_end);
    if(!Number.isInteger(iStart) || !Number.isInteger(iEnd)) return;
    const start = clampIndex(track.length, iStart);
    const end = clampIndex(track.length, iEnd);
    if(i === 0) indexes.push(Math.min(start, end));
    indexes.push(Math.max(start, end));
  });
  return normalizeSegmentIndexes(track, indexes);
}

export function segmentIndexesFromDayIds(track: TrackTuple[]): number[] {
  if(!track.length || !segmentHasExplicitDayIds(track)) return [];
  const indexes = [0];
  let currentDay = Number(track[0][5]) || null;
  for(let i = 1; i < track.length; i++) {
    const d = Number(track[i][5]) || null;
    if(d && currentDay && d !== currentDay) {
      indexes.push(i - 1);
      currentDay = d;
    } else if(d && !currentDay) {
      currentDay = d;
    }
  }
  indexes.push(track.length - 1);
  return normalizeSegmentIndexes(track, indexes);
}

export function restoreSegmentIndexes(
  track: TrackTuple[],
  dayMeta: Array<Partial<DayMeta>> = [],
): number[] {
  if(!track.length) return [];
  const fromMeta = segmentIndexesFromDayMeta(track, dayMeta);
  if(fromMeta.length >= 2) return fromMeta;
  const fromDays = segmentIndexesFromDayIds(track);
  if(fromDays.length >= 2) return fromDays;
  return [0, track.length - 1];
}

export function getDayIndexRange(
  trail: DayRangeTrail | null | undefined,
  dayMeta: Partial<DayMeta> | null | undefined,
): DayIndexRange | null {
  if(!trail || !trail.track || !trail.track.length || !dayMeta) return null;
  const { track } = trail;
  const n = track.length;
  const isValidIdx = (v: unknown): v is number => Number.isInteger(v) && Number(v) >= 0 && Number(v) < n;
  if(isValidIdx(dayMeta.i_start) && isValidIdx(dayMeta.i_end)) {
    return {
      iStart: Math.min(Number(dayMeta.i_start), Number(dayMeta.i_end)),
      iEnd: Math.max(Number(dayMeta.i_start), Number(dayMeta.i_end)),
    };
  }

  let first = -1;
  let last = -1;
  let hasExplicitDayId = false;
  for(let i = 0; i < n; i++) {
    const dayId = Number(track[i][5]);
    if(Number.isInteger(dayId) && dayId > 0) {
      hasExplicitDayId = true;
      if(dayId === dayMeta.d) {
        if(first < 0) first = i;
        last = i;
      }
    }
  }
  if(hasExplicitDayId && first >= 0 && last >= first) return { iStart: first, iEnd: last };

  if(trail.day_meta && typeof dayMeta.km === 'number') {
    let prevKm = 0;
    for(const item of trail.day_meta) {
      if(item === dayMeta || item.d === dayMeta.d) break;
      prevKm += Number(item.km) || 0;
    }
    const endKm = prevKm + (Number(dayMeta.km) || 0);
    first = track.findIndex(p => (p[3] || 0) >= prevKm - 0.02);
    last = -1;
    for(let i = n - 1; i >= 0; i--) {
      if((track[i][3] || 0) <= endKm + 0.02) {
        last = i;
        break;
      }
    }
    if(first >= 0 && last >= first) return { iStart: first, iEnd: last };
  }

  return null;
}

export function computeDayRangeStats(
  trail: DayRangeTrail | null | undefined,
  range: DayIndexRange | null | undefined,
): DayRangeStats | null {
  if(!trail || !trail.track || !trail.track.length || !range) return null;
  const iStart = Math.max(0, Math.min(range.iStart, range.iEnd));
  const iEnd = Math.min(trail.track.length - 1, Math.max(range.iStart, range.iEnd));
  if(iEnd < iStart) return null;

  const hasDistanceCum = trail.track.some(p => Number.isFinite(p[3]));
  if(hasDistanceCum) {
    const measureStats = computeMeasureStats(trail.track, iStart, iEnd);
    if(measureStats) {
      return {
        km: measureStats.distKm,
        asc: measureStats.asc,
        desc: measureStats.desc,
        max: measureStats.maxE,
        min: measureStats.minE,
      };
    }
  }

  const segmentStats = computeSegmentStats(trail.track, iStart, iEnd);
  if(!segmentStats) return null;
  return {
    km: segmentStats.km,
    asc: segmentStats.asc,
    desc: segmentStats.desc,
    max: segmentStats.maxE,
    min: segmentStats.minE,
  };
}

export function renumberCampEditsForInsert(
  campEdits: SegmentCampEdits,
  insertAt: number,
): SegmentCampEdits {
  const next: SegmentCampEdits = {};
  Object.keys(campEdits || {}).forEach(k => {
    const d = Number(k);
    if(!Number.isInteger(d)) return;
    next[d >= insertAt ? d + 1 : d] = campEdits[d];
  });
  return next;
}

export function renumberCampEditsForDelete(
  campEdits: SegmentCampEdits,
  dayNo: number,
  oldDayCount: number,
): SegmentCampEdits {
  const next: SegmentCampEdits = {};
  for(let d = 1; d <= oldDayCount; d++) {
    if(d === dayNo) continue;
    const newDay = d < dayNo ? d : d - 1;
    if(campEdits && campEdits[d]) next[newDay] = campEdits[d];
  }
  return next;
}

export function insertSegmentPoint(
  points: TrackIndexPoint[],
  point: TrackIndexPoint,
): { points: TrackIndexPoint[]; insertAt: number } | null {
  if(!point || points.some(p => p.idx === point.idx)) return null;
  let insertAt = -1;
  for(let i = 1; i < points.length; i++) {
    if(point.idx > points[i - 1].idx && point.idx < points[i].idx) {
      insertAt = i;
      break;
    }
  }
  if(insertAt < 0) return null;
  const next = points.slice();
  next.splice(insertAt, 0, point);
  return { points: next, insertAt };
}

export function deleteSegmentDay(points: TrackIndexPoint[], dayNo: number): TrackIndexPoint[] {
  const oldDayCount = points.length - 1;
  if(oldDayCount <= 1 || dayNo < 1 || dayNo > oldDayCount) return points.slice();
  const removePointIdx = dayNo < oldDayCount ? dayNo : dayNo - 1;
  const next = points.slice();
  next.splice(removePointIdx, 1);
  return next;
}

export function moveSegmentBoundary(
  points: TrackIndexPoint[],
  pointIndex: number,
  nextPoint: TrackIndexPoint | null,
): SegmentBoundaryMoveResult {
  if(!nextPoint) return { ok: false, changed: false, reason: 'empty', points: points.slice() };
  if(pointIndex <= 0 || pointIndex >= points.length - 1) {
    return { ok: false, changed: false, reason: 'endpoint', points: points.slice() };
  }
  if(points.some((point, index) => index !== pointIndex && point.idx === nextPoint.idx)) {
    return { ok: false, changed: false, reason: 'duplicate', points: points.slice() };
  }
  if(points[pointIndex].idx === nextPoint.idx) {
    return { ok: true, changed: false, points: points.slice() };
  }

  const previous = points[pointIndex - 1];
  const following = points[pointIndex + 1];
  const ascending = points[0].idx <= points[points.length - 1].idx;
  if((ascending && nextPoint.idx <= previous.idx) || (!ascending && nextPoint.idx >= previous.idx)) {
    return { ok: false, changed: false, reason: 'before-previous', points: points.slice() };
  }
  if((ascending && nextPoint.idx >= following.idx) || (!ascending && nextPoint.idx <= following.idx)) {
    return { ok: false, changed: false, reason: 'after-next', points: points.slice() };
  }

  const next = points.slice();
  next[pointIndex] = nextPoint;
  return { ok: true, changed: true, points: next };
}

export function buildDayMetaFromSegments(
  track: TrackTuple[],
  points: TrackIndexPoint[],
  campEdits: SegmentCampEdits = {},
): DayMeta[] {
  const metas: DayMeta[] = [];
  for(let d = 1; d < points.length; d++) {
    const stats = computeSegmentStats(track, points[d - 1].idx, points[d].idx);
    if(!stats) continue;
    const campData = campEdits[d] || {};
    const startElev = Math.round(points[d - 1].elev);
    const endElev = Math.round(points[d].elev);
    const seg = `起 ${startElev}m → 顶 ${stats.maxE}m → 低 ${stats.minE}m → 终 ${endElev}m（${stats.kmText}km）`;
    metas.push({
      d,
      date: '',
      km: Number(stats.kmText),
      asc: stats.asc,
      desc: stats.desc,
      max: stats.maxE,
      min: stats.minE,
      camp: campData.name && campData.name.trim() ? campData.name.trim() : '-',
      camp_elev: campData.elev != null ? Math.round(campData.elev) : Math.round(points[d].elev),
      seg,
      i_start: stats.iStart,
      i_end: stats.iEnd,
    });
  }
  return metas;
}

export function buildDayMetaFromTrackDays(
  track: TrackTuple[],
  enrichedWps: EnrichedWaypoint[] = [],
): DayMeta[] {
  const days = new Map<number, number[]>();
  for(let i = 0; i < track.length; i++) {
    const d = Number(track[i][5]) || 1;
    if(!days.has(d)) days.set(d, []);
    days.get(d)?.push(i);
  }

  return Array.from(days.keys()).sort((a, b) => a - b).map(d => {
    const idxs = days.get(d) || [];
    const iStart = idxs[0];
    const iEnd = idxs[idxs.length - 1];
    const stats = computeSegmentStats(track, iStart, iEnd);
    const dayWps = enrichedWps.filter(w => w.gps_idx >= iStart && w.gps_idx <= iEnd);
    const camps = dayWps.filter(w => w.tag === 'camp');
    const camp = camps[camps.length - 1];
    const keyWps = dayWps.filter(w => KEY_WAYPOINT_TAGS.has(w.tag || ''));
    return {
      d,
      date: '',
      km: stats ? +stats.km.toFixed(1) : 0,
      asc: stats?.asc || 0,
      desc: stats?.desc || 0,
      max: stats?.maxE || 0,
      min: stats?.minE || 0,
      camp: camp ? camp.label : '未标注',
      camp_elev: camp ? camp.elev : (stats?.maxE || 0),
      seg: keyWps.length ? keyWps.slice(0, 5).map(w => w.label).join(' → ') : `D${d}行程`,
      i_start: iStart,
      i_end: iEnd,
    };
  });
}
