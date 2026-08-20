import type {TrackTuple} from '../types.ts';

export type MapRenderTier = 'compact' | 'balanced' | 'full';

export interface MapRenderCapabilities {
  viewportWidth: number;
  coarsePointer?: boolean;
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
  saveData?: boolean;
}

export interface MapRenderLoad {
  activeTrailCount: number;
  totalTrackPoints: number;
}

export interface MapRenderPolicy {
  tier: MapRenderTier;
  maxPointsPerTrail: number;
  elevationBandCount: number;
  maxLabels: number;
  labelMinZoom: number;
}

export interface MapLabelCandidate {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  priority?: number;
}

export interface MapLabelLayout {
  viewportWidth: number;
  viewportHeight: number;
  maxLabels: number;
  padding?: number;
}

interface NormalizedTrackPoint {
  index: number;
  lat: number;
  lng: number;
  elevation: number;
}

function finitePositive(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/** Resolves one deterministic display budget without changing source data fidelity. */
export function resolveMapRenderPolicy(
  capabilities: MapRenderCapabilities,
  load: MapRenderLoad,
): MapRenderPolicy {
  const width = finitePositive(capabilities.viewportWidth, 1440);
  const memory = finitePositive(capabilities.deviceMemoryGb, Infinity);
  const cores = finitePositive(capabilities.hardwareConcurrency, Infinity);
  const trailCount = Math.max(1, Math.floor(finitePositive(load.activeTrailCount, 1)));
  const pointCount = Math.max(0, Math.floor(Number(load.totalTrackPoints) || 0));
  const phone = width <= 600;
  const constrained = capabilities.saveData === true || memory <= 4 || cores <= 4 || phone;
  const balanced = !constrained && (
    capabilities.coarsePointer === true || width < 1100 || memory <= 8 || pointCount > 300_000
  );
  const tier:MapRenderTier = constrained ? 'compact' : balanced ? 'balanced' : 'full';

  const totalBudget = tier === 'compact'
    ? (pointCount > 150_000 ? 10_000 : 12_000)
    : tier === 'balanced'
      ? (pointCount > 200_000 ? 24_000 : 30_000)
      : (pointCount > 200_000 ? 60_000 : pointCount > 100_000 ? 72_000 : 90_000);
  const minimum = tier === 'compact' ? 700 : tier === 'balanced' ? 1_200 : 2_000;
  const maximum = tier === 'compact' ? 2_400 : tier === 'balanced' ? 5_000 : 10_000;
  const maxPointsPerTrail = clamp(Math.floor(totalBudget / trailCount), minimum, maximum);

  return Object.freeze({
    tier,
    maxPointsPerTrail,
    elevationBandCount:tier === 'compact' ? 24 : tier === 'balanced' ? 32 : 40,
    maxLabels:tier === 'compact' ? 10 : tier === 'balanced' ? 22 : 40,
    labelMinZoom:tier === 'compact' ? 10.5 : tier === 'balanced' ? 9.5 : 8.5,
  });
}

/** Gradually reveals labels as the map zooms in instead of switching all labels at once. */
export function mapLabelBudgetForZoom(policy: MapRenderPolicy, zoom: number): number {
  if(!Number.isFinite(zoom) || zoom < policy.labelMinZoom) return 0;
  const delta = zoom - policy.labelMinZoom;
  if(delta < 0.75) return Math.max(1, Math.floor(policy.maxLabels * 0.3));
  if(delta < 1.75) return Math.max(1, Math.floor(policy.maxLabels * 0.6));
  return policy.maxLabels;
}

function normalizedTrack(track: ReadonlyArray<TrackTuple>): NormalizedTrackPoint[] {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  for(const point of track) {
    const lat = Number(point[0]);
    const lng = Number(point[1]);
    const elevation = Number.isFinite(point[2]) ? Number(point[2]) : 0;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minElevation = Math.min(minElevation, elevation);
    maxElevation = Math.max(maxElevation, elevation);
  }
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;
  const elevationRange = maxElevation - minElevation || 1;
  const indexRange = Math.max(1, track.length - 1);
  return track.map((point, index) => ({
    index:index / indexRange,
    lat:(Number(point[0]) - minLat) / latRange,
    lng:(Number(point[1]) - minLng) / lngRange,
    elevation:((Number.isFinite(point[2]) ? Number(point[2]) : 0) - minElevation) / elevationRange,
  }));
}

function triangleImportance(
  previous: NormalizedTrackPoint,
  point: NormalizedTrackPoint,
  next: NormalizedTrackPoint,
): number {
  const geographic = Math.abs(
    (previous.lat - next.lat) * (point.lng - previous.lng)
    - (previous.lat - point.lat) * (next.lng - previous.lng),
  );
  const elevation = Math.abs(
    (previous.index - next.index) * (point.elevation - previous.elevation)
    - (previous.index - point.index) * (next.elevation - previous.elevation),
  );
  return geographic * 0.72 + elevation * 0.28;
}

function lttbIndices(points: NormalizedTrackPoint[], threshold: number): number[] {
  if(points.length <= threshold) return points.map((_, index) => index);
  const every = (points.length - 2) / (threshold - 2);
  const selected = [0];
  let anchorIndex = 0;

  for(let bucket = 0; bucket < threshold - 2; bucket++) {
    const averageStart = Math.min(points.length - 1, Math.floor((bucket + 1) * every) + 1);
    const averageEnd = Math.min(points.length, Math.floor((bucket + 2) * every) + 1);
    let average = {index:0, lat:0, lng:0, elevation:0};
    const averageCount = Math.max(1, averageEnd - averageStart);
    for(let index = averageStart; index < averageEnd; index++) {
      average.index += points[index].index;
      average.lat += points[index].lat;
      average.lng += points[index].lng;
      average.elevation += points[index].elevation;
    }
    average = {
      index:average.index / averageCount,
      lat:average.lat / averageCount,
      lng:average.lng / averageCount,
      elevation:average.elevation / averageCount,
    };

    const rangeStart = Math.floor(bucket * every) + 1;
    const rangeEnd = Math.min(points.length - 1, Math.floor((bucket + 1) * every) + 1);
    let nextAnchor = rangeStart;
    let maxImportance = -1;
    for(let index = rangeStart; index < rangeEnd; index++) {
      const importance = triangleImportance(points[anchorIndex], points[index], average);
      if(importance > maxImportance) {
        maxImportance = importance;
        nextAnchor = index;
      }
    }
    selected.push(nextAnchor);
    anchorIndex = nextAnchor;
  }
  selected.push(points.length - 1);
  return selected;
}

function mandatoryTrackIndexes(track: ReadonlyArray<TrackTuple>): Set<number> {
  const indexes = new Set<number>([0, track.length - 1]);
  let minIndex = 0;
  let maxIndex = 0;
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  for(let index = 0; index < track.length; index++) {
    const elevation = Number.isFinite(track[index][2]) ? Number(track[index][2]) : 0;
    if(elevation < minElevation) { minElevation = elevation; minIndex = index; }
    if(elevation > maxElevation) { maxElevation = elevation; maxIndex = index; }
    if(index > 0 && track[index][5] !== track[index - 1][5]) {
      indexes.add(index - 1);
      indexes.add(index);
    }
  }
  indexes.add(minIndex);
  indexes.add(maxIndex);
  return indexes;
}

/**
 * Keeps map geometry, elevation extrema, day boundaries, and endpoints within a
 * fixed display budget. Returned tuples retain source identity for inspection.
 */
export function downsampleTrackForMap(
  track: ReadonlyArray<TrackTuple>,
  maxPoints: number,
): TrackTuple[] {
  if(!Number.isSafeInteger(maxPoints) || maxPoints < 2) {
    throw new RangeError('maxPoints must be an integer of at least 2');
  }
  if(track.length <= maxPoints) return track as TrackTuple[];

  const normalized = normalizedTrack(track);
  let mandatory = mandatoryTrackIndexes(track);
  if(mandatory.size > maxPoints) {
    const essentials = new Set<number>([0, track.length - 1]);
    let minIndex = 0;
    let maxIndex = 0;
    for(let index = 1; index < track.length; index++) {
      const elevation = Number.isFinite(track[index][2]) ? Number(track[index][2]) : 0;
      const minimum = Number.isFinite(track[minIndex][2]) ? Number(track[minIndex][2]) : 0;
      const maximum = Number.isFinite(track[maxIndex][2]) ? Number(track[maxIndex][2]) : 0;
      if(elevation < minimum) minIndex = index;
      if(elevation > maximum) maxIndex = index;
    }
    for(const index of [minIndex, maxIndex]) {
      if(essentials.size < maxPoints) essentials.add(index);
    }
    const candidates = [...mandatory].filter(index => !essentials.has(index)).sort((a, b) => a - b);
    const available = Math.max(0, maxPoints - essentials.size);
    for(let slot = 0; slot < available && candidates.length; slot++) {
      essentials.add(candidates[Math.round(slot * (candidates.length - 1) / Math.max(1, available - 1))]);
    }
    mandatory = essentials;
  }

  const selected = new Set(lttbIndices(normalized, maxPoints));
  for(const index of mandatory) selected.add(index);
  if(selected.size > maxPoints) {
    const ordered = [...selected].sort((a, b) => a - b);
    const removable = ordered
      .map((index, orderedIndex) => ({index, orderedIndex}))
      .filter(({index, orderedIndex}) => orderedIndex > 0
        && orderedIndex < ordered.length - 1
        && !mandatory.has(index))
      .map(({index, orderedIndex}) => {
        const previous = ordered[Math.max(0, orderedIndex - 1)];
        const next = ordered[Math.min(ordered.length - 1, orderedIndex + 1)];
        return {index, importance:triangleImportance(normalized[previous], normalized[index], normalized[next])};
      })
      .sort((left, right) => left.importance - right.importance || left.index - right.index);
    for(let index = 0; selected.size > maxPoints && index < removable.length; index++) {
      selected.delete(removable[index].index);
    }
  }
  return [...selected].sort((left, right) => left - right).map(index => track[index] as TrackTuple);
}

interface LabelRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function intersects(left: LabelRect, right: LabelRect): boolean {
  return left.left < right.right && left.right > right.left
    && left.top < right.bottom && left.bottom > right.top;
}

/** Chooses the highest-priority non-overlapping map labels in viewport space. */
export function planMapLabelVisibility(
  candidates: ReadonlyArray<MapLabelCandidate>,
  layout: MapLabelLayout,
): Set<string> {
  const visible = new Set<string>();
  const maximum = Math.max(0, Math.floor(layout.maxLabels));
  if(maximum === 0) return visible;
  const padding = Math.max(0, Number(layout.padding) || 0);
  const occupied:LabelRect[] = [];
  const ordered = [...candidates].sort((left, right) =>
    (right.priority || 0) - (left.priority || 0) || left.key.localeCompare(right.key));

  for(const candidate of ordered) {
    if(visible.size >= maximum) break;
    const width = Math.max(1, Number(candidate.width) || 1);
    const height = Math.max(1, Number(candidate.height) || 1);
    const left = candidate.x + (candidate.offsetX || 0);
    const top = candidate.y + (candidate.offsetY || 0);
    const box:LabelRect = {
      left:left - padding,
      top:top - padding,
      right:left + width + padding,
      bottom:top + height + padding,
    };
    if(box.right < 0 || box.bottom < 0
      || box.left > layout.viewportWidth || box.top > layout.viewportHeight) continue;
    if(occupied.some(existing => intersects(existing, box))) continue;
    occupied.push(box);
    visible.add(candidate.key);
  }
  return visible;
}
