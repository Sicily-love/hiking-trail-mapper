import { accumulatorAscent, accumulatorDescent } from './elevation.ts';
import { haversine } from './geo.ts';
import type { TrackTuple, TrailStats } from './types.ts';

export interface SegmentedTrackMetrics {
  cumulativeDistanceM: number[];
  cumulativeAscentM: number[];
  cumulativeDescentM: number[];
  stats: TrailStats;
}

export function normalizeTrackBreaks(
  breaks: Iterable<number> | null | undefined,
  trackLength: number,
): number[] {
  if(!breaks || trackLength < 2) return [];
  return [...new Set([...breaks]
    .map(value => Math.round(Number(value)))
    .filter(value => Number.isFinite(value) && value > 0 && value < trackLength))]
    .sort((left, right) => left - right);
}

export function splitTrackByBreaks<T>(
  track: readonly T[],
  breaks: Iterable<number> | null | undefined,
): T[][] {
  if(!track.length) return [];
  const starts = [0, ...normalizeTrackBreaks(breaks, track.length), track.length];
  const segments: T[][] = [];
  for(let index = 0; index < starts.length - 1; index += 1) {
    const segment = track.slice(starts[index], starts[index + 1]);
    if(segment.length) segments.push(segment);
  }
  return segments;
}

export function trackBreaksInRange(
  breaks: Iterable<number> | null | undefined,
  startIndex: number,
  endIndex: number,
  reversed = false,
): number[] {
  const low = Math.min(startIndex, endIndex);
  const high = Math.max(startIndex, endIndex);
  const selected = normalizeTrackBreaks(breaks, high + 1)
    .filter(index => index > low && index <= high)
    .map(index => index - low);
  if(!reversed) return selected;
  const length = high - low + 1;
  return selected.map(index => length - index).sort((left, right) => left - right);
}

/** Computes cumulative values without inventing distance or elevation gain between disconnected parts. */
export function computeSegmentedTrackMetrics(
  track: TrackTuple[],
  breaks: Iterable<number> | null | undefined,
  elevationThreshold = 10,
): SegmentedTrackMetrics {
  const normalizedBreaks = normalizeTrackBreaks(breaks, track.length);
  const breakSet = new Set(normalizedBreaks);
  const cumulativeDistanceM = new Array<number>(track.length).fill(0);
  const cumulativeAscentM = new Array<number>(track.length).fill(0);
  const cumulativeDescentM = new Array<number>(track.length).fill(0);
  let distanceOffset = 0;
  let ascentOffset = 0;
  let descentOffset = 0;

  const segmentStarts = [0, ...normalizedBreaks, track.length];
  for(let segmentIndex = 0; segmentIndex < segmentStarts.length - 1; segmentIndex += 1) {
    const start = segmentStarts[segmentIndex];
    const end = segmentStarts[segmentIndex + 1];
    const elevations = track.slice(start, end).map(point => Number.isFinite(point[2]) ? Number(point[2]) : 0);
    const localAscent = accumulatorAscent(elevations, elevationThreshold);
    const localDescent = accumulatorDescent(elevations, elevationThreshold);
    let localDistance = 0;
    for(let index = start; index < end; index += 1) {
      if(index > start && !breakSet.has(index)) {
        localDistance += haversine(
          track[index - 1][0], track[index - 1][1],
          track[index][0], track[index][1],
        );
      }
      const localIndex = index - start;
      cumulativeDistanceM[index] = distanceOffset + localDistance;
      cumulativeAscentM[index] = ascentOffset + (localAscent[localIndex] || 0);
      cumulativeDescentM[index] = descentOffset + (localDescent[localIndex] || 0);
    }
    distanceOffset += localDistance;
    ascentOffset += localAscent.at(-1) || 0;
    descentOffset += localDescent.at(-1) || 0;
  }

  const elevations = track.map(point => Number.isFinite(point[2]) ? Number(point[2]) : 0);
  return {
    cumulativeDistanceM,
    cumulativeAscentM,
    cumulativeDescentM,
    stats:{
      distance_km:+(distanceOffset / 1000).toFixed(2),
      ascent_m:Math.round(ascentOffset),
      descent_m:Math.round(descentOffset),
      max_elev:Math.round(elevations.length ? Math.max(...elevations) : 0),
      min_elev:Math.round(elevations.length ? Math.min(...elevations) : 0),
    },
  };
}
