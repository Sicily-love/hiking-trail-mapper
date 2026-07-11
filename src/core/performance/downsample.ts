import type { TrackTuple } from '../types.ts';

export type NumericAccessor<T> = (point: T, index: number) => number;

function canvasSampleTarget(pixelWidth: number): number {
  if(!Number.isFinite(pixelWidth) || Math.floor(pixelWidth) < 2) {
    throw new RangeError('pixelWidth must be at least 2');
  }
  return Math.floor(pixelWidth) * 2;
}

/**
 * Returns an ordered subset of source indexes using min/max buckets. The first
 * and last indexes are always retained and the result never exceeds 2px points.
 */
export function downsampleMinMaxIndices<T>(
  points: ReadonlyArray<T>,
  pixelWidth: number,
  valueOf: NumericAccessor<T>,
): number[] {
  const target = canvasSampleTarget(pixelWidth);
  const pointCount = points.length;
  if(pointCount === 0) return [];
  if(pointCount <= target) return Array.from({ length: pointCount }, (_, index) => index);

  const indexes: number[] = [0];
  const interiorCount = pointCount - 2;
  const bucketCount = Math.min(interiorCount, Math.floor((target - 2) / 2));

  for(let bucket = 0; bucket < bucketCount; bucket++) {
    const start = 1 + Math.floor((bucket * interiorCount) / bucketCount);
    const end = 1 + Math.floor(((bucket + 1) * interiorCount) / bucketCount);
    let minIndex = -1;
    let maxIndex = -1;
    let minValue = Infinity;
    let maxValue = -Infinity;

    for(let index = start; index < end; index++) {
      const value = valueOf(points[index], index);
      if(!Number.isFinite(value)) continue;
      if(value < minValue) {
        minValue = value;
        minIndex = index;
      }
      if(value > maxValue) {
        maxValue = value;
        maxIndex = index;
      }
    }

    if(minIndex < 0) continue;
    if(minIndex === maxIndex) {
      indexes.push(minIndex);
    } else if(minIndex < maxIndex) {
      indexes.push(minIndex, maxIndex);
    } else {
      indexes.push(maxIndex, minIndex);
    }
  }

  indexes.push(pointCount - 1);
  return indexes;
}

/** Returns source points at the ordered indexes selected by min/max buckets. */
export function downsampleForCanvas<T>(
  points: ReadonlyArray<T>,
  pixelWidth: number,
  valueOf: NumericAccessor<T>,
): T[] {
  return downsampleMinMaxIndices(points, pixelWidth, valueOf).map(index => points[index]);
}

/** Canvas-oriented convenience wrapper using TrackTuple elevation. */
export function downsampleTrackForCanvas(
  track: ReadonlyArray<TrackTuple>,
  pixelWidth: number,
): TrackTuple[] {
  return downsampleForCanvas(
    track,
    pixelWidth,
    point => Number.isFinite(point[2]) ? Number(point[2]) : 0,
  );
}
