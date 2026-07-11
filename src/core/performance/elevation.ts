import type { TrackTuple } from '../types.ts';

export const DEFAULT_ELEVATION_BAND_COUNT = 40;

export type PerformanceLatLng = [lat: number, lng: number];

export type ElevationPolylinePath = {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly latLngs: PerformanceLatLng[];
};

export type ElevationPolylineSegment = {
  readonly bandIndex: number;
  readonly ratio: number;
  readonly edgeCount: number;
  readonly paths: ElevationPolylinePath[];
};

export type ElevationPolylineOptions = {
  readonly bandCount?: number;
  readonly minElevation?: number;
  readonly maxElevation?: number;
};

type MutableElevationPolylineSegment = {
  bandIndex: number;
  ratio: number;
  edgeCount: number;
  paths: ElevationPolylinePath[];
};

function assertBandCount(bandCount: number): void {
  if(!Number.isSafeInteger(bandCount) || bandCount < 1) {
    throw new RangeError('bandCount must be a positive safe integer');
  }
}

function finiteElevation(point: TrackTuple): number {
  return Number.isFinite(point[2]) ? Number(point[2]) : 0;
}

function assertFiniteCoordinate(point: TrackTuple, index: number): void {
  if(!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new RangeError(`track point ${index} must have finite latitude and longitude`);
  }
}

function resolveElevationRange(
  track: ReadonlyArray<TrackTuple>,
  options: ElevationPolylineOptions,
): { minElevation: number; maxElevation: number } {
  const hasMin = options.minElevation !== undefined;
  const hasMax = options.maxElevation !== undefined;
  if(hasMin !== hasMax) {
    throw new TypeError('minElevation and maxElevation must be provided together');
  }

  if(hasMin && hasMax) {
    const minElevation = options.minElevation as number;
    const maxElevation = options.maxElevation as number;
    if(!Number.isFinite(minElevation) || !Number.isFinite(maxElevation)) {
      throw new RangeError('elevation range must be finite');
    }
    if(maxElevation < minElevation) {
      throw new RangeError('maxElevation must be greater than or equal to minElevation');
    }
    return { minElevation, maxElevation };
  }

  let minElevation = Infinity;
  let maxElevation = -Infinity;
  for(const point of track) {
    const elevation = finiteElevation(point);
    if(elevation < minElevation) minElevation = elevation;
    if(elevation > maxElevation) maxElevation = elevation;
  }
  if(minElevation === Infinity) return { minElevation: 0, maxElevation: 0 };
  return { minElevation, maxElevation };
}

/** Maps an elevation to a stable zero-based color band. */
export function quantizeElevationBand(
  elevation: number,
  minElevation: number,
  maxElevation: number,
  bandCount = DEFAULT_ELEVATION_BAND_COUNT,
): number {
  assertBandCount(bandCount);
  if(!Number.isFinite(elevation) || !Number.isFinite(minElevation) || !Number.isFinite(maxElevation)) {
    throw new RangeError('elevation and range must be finite');
  }
  if(maxElevation < minElevation) {
    throw new RangeError('maxElevation must be greater than or equal to minElevation');
  }
  if(maxElevation === minElevation || bandCount === 1) return 0;

  const ratio = Math.max(0, Math.min(1, (elevation - minElevation) / (maxElevation - minElevation)));
  return Math.min(bandCount - 1, Math.floor(ratio * bandCount));
}

/** Returns the palette ratio represented by a color band, including exact endpoints. */
export function elevationBandRatio(bandIndex: number, bandCount = DEFAULT_ELEVATION_BAND_COUNT): number {
  assertBandCount(bandCount);
  if(!Number.isSafeInteger(bandIndex) || bandIndex < 0 || bandIndex >= bandCount) {
    throw new RangeError('bandIndex must be within bandCount');
  }
  return bandCount === 1 ? 0 : bandIndex / (bandCount - 1);
}

/**
 * Builds at most `bandCount` render groups. Each path inside a group is one
 * contiguous run of edges in that color band, so no edge is bridged or lost.
 */
export function buildElevationPolylineSegments(
  track: ReadonlyArray<TrackTuple>,
  options: ElevationPolylineOptions = {},
): ElevationPolylineSegment[] {
  const bandCount = options.bandCount ?? DEFAULT_ELEVATION_BAND_COUNT;
  assertBandCount(bandCount);
  if(track.length < 2) return [];

  for(let i = 0; i < track.length; i++) assertFiniteCoordinate(track[i], i);
  const { minElevation, maxElevation } = resolveElevationRange(track, options);
  const segmentsByBand = new Map<number, MutableElevationPolylineSegment>();

  let currentBand = -1;
  let currentPath: ElevationPolylinePath | null = null;

  const appendPath = (bandIndex: number, path: ElevationPolylinePath): void => {
    let segment = segmentsByBand.get(bandIndex);
    if(!segment) {
      segment = {
        bandIndex,
        ratio: elevationBandRatio(bandIndex, bandCount),
        edgeCount: 0,
        paths: [],
      };
      segmentsByBand.set(bandIndex, segment);
    }
    segment.paths.push(path);
    segment.edgeCount += path.endIndex - path.startIndex;
  };

  for(let edgeIndex = 0; edgeIndex < track.length - 1; edgeIndex++) {
    const start = track[edgeIndex];
    const end = track[edgeIndex + 1];
    const edgeElevation = (finiteElevation(start) + finiteElevation(end)) / 2;
    const bandIndex = quantizeElevationBand(edgeElevation, minElevation, maxElevation, bandCount);

    if(currentPath && bandIndex === currentBand) {
      currentPath.latLngs.push([end[0], end[1]]);
      currentPath = {
        startIndex: currentPath.startIndex,
        endIndex: edgeIndex + 1,
        latLngs: currentPath.latLngs,
      };
      continue;
    }

    if(currentPath) appendPath(currentBand, currentPath);
    currentBand = bandIndex;
    currentPath = {
      startIndex: edgeIndex,
      endIndex: edgeIndex + 1,
      latLngs: [
        [start[0], start[1]],
        [end[0], end[1]],
      ],
    };
  }

  if(currentPath) appendPath(currentBand, currentPath);
  return Array.from(segmentsByBand.values()).sort((left, right) => left.bandIndex - right.bandIndex);
}
