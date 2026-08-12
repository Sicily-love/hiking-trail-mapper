import type { TrackTuple } from '../../core/types.ts';

export interface SnapTrail {
  id: string;
  track: TrackTuple[];
}

export interface TrackSnapHit<TTrail extends SnapTrail = SnapTrail> {
  idx: number;
  point: TrackTuple;
  dist: number;
  trail: TTrail;
}

interface FrameTask {
  cancel?: () => void;
}

interface DragMarker {
  getLatLng?(): {lat: number; lng: number};
  setLatLng?(position: [number, number]): unknown;
}

export interface TrackDragSnapperOptions<TTrail extends SnapTrail> {
  trail?: TTrail;
  getCenterIdx?: () => number | null;
  globalSearch?: boolean;
  windowSize?: number;
  snapMarker?: boolean;
  scheduleFrame?: (callback: () => void) => FrameTask | number | null | undefined;
  onSnap?: (hit: TrackSnapHit<TTrail>, pointer: {lat: number; lng: number}) => void;
}

export interface TrackSnapService<TTrail extends SnapTrail> {
  nearestPrimary(lat: number, lng: number): TrackSnapHit<TTrail> | null;
  nearestPrimaryNear(lat: number, lng: number, centerIdx: number | null, windowSize?: number): TrackSnapHit<TTrail> | null;
  nearestTrail(trail: TTrail, lat: number, lng: number, centerIdx?: number | null, windowSize?: number): TrackSnapHit<TTrail> | null;
  createDragSnapper(marker: DragMarker, options?: TrackDragSnapperOptions<TTrail>): {
    schedule(event: {target: DragMarker}): void;
    cancel(): void;
    resolve(latlng: {lat: number; lng: number}): TrackSnapHit<TTrail> | null;
  };
}

interface TrackGridCache {
  length: number;
  signature: string;
  cellSize: number;
  grid: Map<string, number[]>;
  latitudes: Float64Array;
  longitudes: Float64Array;
}

/** Owns cached nearest-point lookup and frame-coalesced Leaflet drag snapping. */
export function createTrackSnapService<TTrail extends SnapTrail>(dependencies: {
  primaryTrail: () => TTrail | null;
  distance: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
  requestFrame: (callback: () => void) => number;
  cancelFrame: (handle: number) => void;
  maxDistanceM?: number;
}): TrackSnapService<TTrail> {
  const cacheByTrail = new WeakMap<object, TrackGridCache>();
  const maxDistanceM = dependencies.maxDistanceM ?? 200;

  const cacheFor = (trail: TTrail): TrackGridCache => {
    const track = trail.track;
    const first = track[0];
    const last = track[track.length - 1];
    const signature = `${first?.[0]},${first?.[1]}|${last?.[0]},${last?.[1]}|${track.length}`;
    const existing = cacheByTrail.get(trail);
    if(existing?.signature === signature && existing.length === track.length) return existing;

    const cellSize = 0.0015;
    const latitudes = new Float64Array(track.length);
    const longitudes = new Float64Array(track.length);
    const grid = new Map<string, number[]>();
    track.forEach((point, index) => {
      latitudes[index] = point[0];
      longitudes[index] = point[1];
      const key = `${Math.floor(point[0] / cellSize)}:${Math.floor(point[1] / cellSize)}`;
      const bucket = grid.get(key) || [];
      bucket.push(index);
      if(!grid.has(key)) grid.set(key, bucket);
    });
    const next = {length:track.length, signature, cellSize, grid, latitudes, longitudes};
    cacheByTrail.set(trail, next);
    return next;
  };

  const hitAt = (trail: TTrail, index: number, lat: number, lng: number): TrackSnapHit<TTrail> | null => {
    const point = trail.track[index];
    if(!point) return null;
    const dist = dependencies.distance(lat, lng, point[0], point[1]);
    return dist <= maxDistanceM ? {idx:index, point, dist, trail} : null;
  };

  const nearestPrimary = (lat: number, lng: number): TrackSnapHit<TTrail> | null => {
    const trail = dependencies.primaryTrail();
    if(!trail?.track.length) return null;
    const cache = cacheFor(trail);
    const cosine = Math.cos(lat * Math.PI / 180);
    const latitudeCell = Math.floor(lat / cache.cellSize);
    const longitudeCell = Math.floor(lng / cache.cellSize);
    const longitudeRadius = Math.max(2, Math.ceil((0.002 / Math.max(cosine, 0.15)) / cache.cellSize));
    let bestIndex = -1;
    let bestDistance = Infinity;
    for(let y = latitudeCell - 2; y <= latitudeCell + 2; y += 1) {
      for(let x = longitudeCell - longitudeRadius; x <= longitudeCell + longitudeRadius; x += 1) {
        for(const index of cache.grid.get(`${y}:${x}`) || []) {
          const dy = cache.latitudes[index] - lat;
          const dx = (cache.longitudes[index] - lng) * cosine;
          const distance = dx * dx + dy * dy;
          if(distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
          }
        }
      }
    }
    return bestIndex < 0 ? null : hitAt(trail, bestIndex, lat, lng);
  };

  const nearestTrail = (
    trail: TTrail,
    lat: number,
    lng: number,
    centerIdx: number | null = null,
    windowSize = 1000,
  ): TrackSnapHit<TTrail> | null => {
    if(!trail?.track.length) return null;
    let first = 0;
    let last = trail.track.length - 1;
    if(Number.isFinite(centerIdx)) {
      first = Math.max(0, Math.round(Number(centerIdx)) - windowSize);
      last = Math.min(last, Math.round(Number(centerIdx)) + windowSize);
    }
    const cosine = Math.max(0.15, Math.cos(lat * Math.PI / 180));
    let bestIndex = first;
    let bestDistance = Infinity;
    for(let index = first; index <= last; index += 1) {
      const point = trail.track[index];
      const dy = point[0] - lat;
      const dx = (point[1] - lng) * cosine;
      const distance = dx * dx + dy * dy;
      if(distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    return hitAt(trail, bestIndex, lat, lng);
  };

  const nearestPrimaryNear = (
    lat: number,
    lng: number,
    centerIdx: number | null,
    windowSize = 700,
  ): TrackSnapHit<TTrail> | null => {
    const trail = dependencies.primaryTrail();
    if(!trail?.track.length || !Number.isFinite(centerIdx)) return nearestPrimary(lat, lng);
    return nearestTrail(trail, lat, lng, centerIdx, windowSize) || nearestPrimary(lat, lng);
  };

  const createDragSnapper = (
    marker: DragMarker,
    options: TrackDragSnapperOptions<TTrail> = {},
  ) => {
    let latestLatLng: {lat: number; lng: number} | null = null;
    let frameId = 0;
    let frameTask: FrameTask | number | null = null;
    const resolve = (latlng: {lat: number; lng: number}): TrackSnapHit<TTrail> | null => {
      const centerIdx = options.getCenterIdx?.() ?? null;
      if(options.trail) {
        return nearestTrail(
          options.trail,
          latlng.lat,
          latlng.lng,
          options.globalSearch ? null : centerIdx,
          options.windowSize || 1000,
        );
      }
      return Number.isFinite(centerIdx)
        ? nearestPrimaryNear(latlng.lat, latlng.lng, centerIdx, options.windowSize || 700)
        : nearestPrimary(latlng.lat, latlng.lng);
    };
    const flush = (): void => {
      frameId = 0;
      frameTask = null;
      const pointer = latestLatLng;
      latestLatLng = null;
      if(!pointer) return;
      const hit = resolve(pointer);
      if(!hit) return;
      if(options.snapMarker !== false) marker.setLatLng?.([hit.point[0], hit.point[1]]);
      options.onSnap?.(hit, pointer);
    };
    return {
      schedule(event: {target: DragMarker}): void {
        latestLatLng = event.target.getLatLng?.() || null;
        if(!latestLatLng || frameId || frameTask) return;
        if(options.scheduleFrame) frameTask = options.scheduleFrame(flush) || null;
        else frameId = dependencies.requestFrame(flush);
      },
      cancel(): void {
        if(typeof frameTask === 'object') frameTask?.cancel?.();
        if(frameId) dependencies.cancelFrame(frameId);
        frameTask = null;
        frameId = 0;
        latestLatLng = null;
      },
      resolve,
    };
  };

  return Object.freeze({nearestPrimary, nearestPrimaryNear, nearestTrail, createDragSnapper});
}
