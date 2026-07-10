import { accumulatorAscent, accumulatorDescent } from './elevation.ts';
import { haversine } from './geo.ts';
import type {
  MeasureEndpointLabel,
  MeasureEndpointStateResult,
  MeasureStats,
  SegmentStats,
  TrackIndexPoint,
  TrackIndexRange,
  TrackTuple,
} from './types.ts';

export function clampTrackIndex(track: TrackTuple[], idx: number): number {
  if(!track.length) return 0;
  const numeric = Number.isFinite(idx) ? idx : 0;
  return Math.max(0, Math.min(track.length - 1, Math.round(numeric)));
}

export function pointFromTrackIndex(track: TrackTuple[], idx: number): TrackIndexPoint | null {
  if(!track.length) return null;
  const i = clampTrackIndex(track, idx);
  const p = track[i];
  return {
    idx: i,
    lat: p[0],
    lng: p[1],
    elev: Number.isFinite(p[2]) ? Number(p[2]) : 0,
    km: Number.isFinite(p[3]) ? Number(p[3]) : 0,
  };
}

export function normalizeTrackIndexRange(
  track: TrackTuple[],
  startIdx: number,
  endIdx: number,
): TrackIndexRange | null {
  if(!track.length) return null;
  const a = clampTrackIndex(track, startIdx);
  const b = clampTrackIndex(track, endIdx);
  return {
    iStart: Math.min(a, b),
    iEnd: Math.max(a, b),
    reversed: a > b,
  };
}

export function buildTrackLatLngs(
  track: TrackTuple[],
  startIdx: number,
  endIdx: number,
  maxPoints = 1200,
): Array<[number, number]> {
  const range = normalizeTrackIndexRange(track, startIdx, endIdx);
  if(!range) return [];
  const { iStart, iEnd } = range;
  const count = iEnd - iStart + 1;
  if(count <= 0) return [];
  if(count <= maxPoints || maxPoints < 2) {
    const latLngs: Array<[number, number]> = new Array(count);
    for(let i = iStart, j = 0; i <= iEnd; i++, j++) latLngs[j] = [track[i][0], track[i][1]];
    return latLngs;
  }

  const latLngs: Array<[number, number]> = new Array(maxPoints);
  const step = (count - 1) / (maxPoints - 1);
  let lastIdx = -1;
  for(let j = 0; j < maxPoints; j++) {
    let idx = Math.round(iStart + j * step);
    if(idx <= lastIdx && idx < iEnd) idx = lastIdx + 1;
    if(idx > iEnd) idx = iEnd;
    lastIdx = idx;
    latLngs[j] = [track[idx][0], track[idx][1]];
  }
  latLngs[0] = [track[iStart][0], track[iStart][1]];
  latLngs[latLngs.length - 1] = [track[iEnd][0], track[iEnd][1]];
  return latLngs;
}

export function computeSegmentStats(
  track: TrackTuple[],
  startIdx: number,
  endIdx: number,
): SegmentStats | null {
  const range = normalizeTrackIndexRange(track, startIdx, endIdx);
  if(!range) return null;
  const { iStart, iEnd, reversed } = range;
  let distance_m = 0;
  for(let i = iStart + 1; i <= iEnd; i++) {
    distance_m += haversine(track[i - 1][0], track[i - 1][1], track[i][0], track[i][1]);
  }

  const elevsRaw: number[] = [];
  for(let i = iStart; i <= iEnd; i++) elevsRaw.push(Number.isFinite(track[i][2]) ? Number(track[i][2]) : 0);
  const elevs = reversed ? elevsRaw.slice().reverse() : elevsRaw;
  const asc = Math.round(accumulatorAscent(elevs, 10).slice(-1)[0] || 0);
  const desc = Math.round(accumulatorDescent(elevs, 10).slice(-1)[0] || 0);
  const maxE = Math.round(Math.max(...elevs));
  const minE = Math.round(Math.min(...elevs));
  const km = distance_m / 1000;
  return {
    ...range,
    distance_m,
    km,
    kmText: km.toFixed(2),
    asc,
    desc,
    maxE,
    minE,
    max: maxE,
    min: minE,
  };
}

export function computeMeasureStats(
  track: TrackTuple[],
  startIdx: number,
  endIdx: number,
  descCumSource?: ArrayLike<number>,
): MeasureStats | null {
  const range = normalizeTrackIndexRange(track, startIdx, endIdx);
  if(!range) return null;
  const { iStart, iEnd, reversed } = range;
  const n = track.length;
  const distCum = new Array<number>(n);
  const ascCum = new Array<number>(n);
  const descCum = new Array<number>(n);
  const elevs = new Array<number>(n);

  for(let i = 0; i < n; i++) {
    distCum[i] = Number.isFinite(track[i][3]) ? Number(track[i][3]) : (i ? distCum[i - 1] : 0);
    ascCum[i] = Number.isFinite(track[i][4]) ? Number(track[i][4]) : 0;
    descCum[i] = descCumSource && Number.isFinite(descCumSource[i]) ? Number(descCumSource[i]) : 0;
    elevs[i] = Number.isFinite(track[i][2]) ? Number(track[i][2]) : 0;
  }

  if(!descCumSource || descCumSource.length !== n) {
    const d = accumulatorDescent(elevs, 10);
    for(let i = 0; i < n; i++) descCum[i] = d[i] || 0;
  }
  if(!Number.isFinite(track[n - 1][4])) {
    const a = accumulatorAscent(elevs, 10);
    for(let i = 0; i < n; i++) ascCum[i] = a[i] || 0;
  }

  let maxE = -Infinity;
  let minE = Infinity;
  for(let i = iStart; i <= iEnd; i++) {
    if(elevs[i] > maxE) maxE = elevs[i];
    if(elevs[i] < minE) minE = elevs[i];
  }

  const distKm = Math.abs((distCum[iEnd] || 0) - (distCum[iStart] || 0));
  const forwardAsc = Math.max(0, (ascCum[iEnd] || 0) - (ascCum[iStart] || 0));
  const forwardDesc = Math.max(0, (descCum[iEnd] || 0) - (descCum[iStart] || 0));
  return {
    ...range,
    distKm,
    asc: Math.round(reversed ? forwardDesc : forwardAsc),
    desc: Math.round(reversed ? forwardAsc : forwardDesc),
    maxE: Math.round(maxE),
    minE: Math.round(minE),
  };
}

export function applyMeasureEndpointState(
  ptA: TrackIndexPoint | null,
  ptB: TrackIndexPoint | null,
  label: MeasureEndpointLabel,
  nextPoint: TrackIndexPoint | null,
): MeasureEndpointStateResult {
  if(!nextPoint) return { ok: false, changed: false, reason: 'empty', ptA, ptB };
  const other = label === 'A' ? ptB : ptA;
  if(other && nextPoint.idx === other.idx) {
    return { ok: false, changed: false, reason: 'same-as-other', ptA, ptB };
  }
  const current = label === 'A' ? ptA : ptB;
  if(current && current.idx === nextPoint.idx) {
    return { ok: false, changed: false, reason: 'unchanged', ptA, ptB };
  }
  return {
    ok: true,
    changed: true,
    ptA: label === 'A' ? nextPoint : ptA,
    ptB: label === 'B' ? nextPoint : ptB,
  };
}

export function reverseMeasureEndpoints(
  ptA: TrackIndexPoint | null,
  ptB: TrackIndexPoint | null,
): { ptA: TrackIndexPoint; ptB: TrackIndexPoint } | null {
  if(!ptA || !ptB) return null;
  return { ptA: ptB, ptB: ptA };
}
