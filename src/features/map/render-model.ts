import { buildElevationPolylineSegments } from '../../core/performance/elevation.ts';
import { downsampleTrackForMap } from '../../core/performance/map-rendering.ts';
import { splitTrackByBreaks } from '../../core/track-segments.ts';
import type { TrackTuple } from '../../core/types.ts';
import type { RuntimeContext } from '../../app/runtime/context.ts';

export type TrackLatLng = [lat: number, lng: number];
export type TrackPolylineLatLngs = TrackLatLng[] | TrackLatLng[][];

export interface TrackRenderTrail {
  id: string;
  name: string;
  color?: string;
  group?: string;
  track: TrackTuple[];
  track_breaks?: number[];
}

export interface TrackRenderInputTrail extends TrackRenderTrail {
  active: boolean;
}

export interface TrackPolylineRenderModel {
  key: string;
  signature?: string;
  trail: TrackRenderTrail;
  latLngs: TrackPolylineLatLngs;
  lineStyle: Record<string, unknown>;
  hoverable?: boolean;
  selectable?: boolean;
  tooltip?: string;
}

export interface TrackRenderModel {
  polylines: TrackPolylineRenderModel[];
  elevationBands: number;
  minElevation: number;
  maxElevation: number;
  sourcePoints: number;
  renderedPoints: number;
}

export interface BuildTrackRenderModelOptions {
  trails: TrackRenderInputTrail[];
  primaryTrailId: string | null;
  mode: 'day' | 'elev' | 'waypoint';
  showTrack: boolean;
  activeEscape: string | null;
  escapeReferenceTrailId?: string | null;
  dayPalette: readonly string[];
  elevationBandCount?: number;
  maxPointsPerTrail?: number;
}

export interface MapRenderController {
  buildTracks(options: Pick<BuildTrackRenderModelOptions,
    'dayPalette' | 'elevationBandCount' | 'escapeReferenceTrailId' | 'maxPointsPerTrail'>): TrackRenderModel;
}

/** Reads map state through RuntimeContext so browser orchestration does not mirror selection rules. */
export function createMapRenderController<TTrail extends TrackRenderTrail>(
  context: RuntimeContext<TTrail>,
): MapRenderController {
  const buildTracks = (
    options: Pick<BuildTrackRenderModelOptions,
      'dayPalette' | 'elevationBandCount' | 'escapeReferenceTrailId' | 'maxPointsPerTrail'>,
  ): TrackRenderModel => {
    const state = context.stateSelectors.snapshot();
    const trails: TrackRenderInputTrail[] = context.projectSelectors.trails().map(trail => ({
      ...trail,
      active:state.activeGroup !== null
        && (trail.group || '默认') === state.activeGroup
        && state.activeTrails.has(trail.id),
    }));
    return buildTrackRenderModel({
      ...options,
      trails,
      primaryTrailId:state.primaryTrailId,
      mode:state.mode,
      showTrack:state.showTrack,
      activeEscape:state.activeEscape,
    });
  };
  return Object.freeze({buildTracks});
}

const ELEVATION_STOPS: ReadonlyArray<readonly [number, readonly [number, number, number]]> = [
  [0, [59, 130, 246]],
  [0.2, [6, 182, 212]],
  [0.4, [132, 204, 22]],
  [0.6, [250, 204, 21]],
  [0.8, [249, 115, 22]],
  [1, [239, 68, 68]],
];

export function elevationTrackColor(elevation: number, minElevation: number, maxElevation: number): string {
  const ratio = Math.max(0, Math.min(1, (elevation - minElevation) / (maxElevation - minElevation || 1)));
  for(let index = 0; index < ELEVATION_STOPS.length - 1; index += 1) {
    const [startRatio, start] = ELEVATION_STOPS[index];
    const [endRatio, end] = ELEVATION_STOPS[index + 1];
    if(ratio < startRatio || ratio > endRatio) continue;
    const localRatio = (ratio - startRatio) / (endRatio - startRatio);
    const channel = (from: number, to: number) => Math.round(from + (to - from) * localRatio);
    return `rgb(${channel(start[0], end[0])},${channel(start[1], end[1])},${channel(start[2], end[2])})`;
  }
  return 'rgb(239,68,68)';
}

function elevationRange(trails: TrackRenderInputTrail[]): [number, number] {
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  for(const trail of trails) {
    if(!trail.active) continue;
    for(const point of trail.track) {
      const elevation = Number(point[2]);
      if(!Number.isFinite(elevation)) continue;
      minElevation = Math.min(minElevation, elevation);
      maxElevation = Math.max(maxElevation, elevation);
    }
  }
  return minElevation === Infinity ? [0, 5000] : [minElevation, maxElevation];
}

function latLngs(track: ReadonlyArray<TrackTuple>): TrackLatLng[] {
  return track.map(point => [point[0], point[1]]);
}

function segmentedLatLngs(segments: ReadonlyArray<ReadonlyArray<TrackTuple>>): TrackPolylineLatLngs {
  const paths = segments.map(latLngs);
  return paths.length === 1 ? paths[0] : paths;
}

function sampledTrailSegments(trail: TrackRenderTrail, maxPoints?: number): TrackTuple[][] {
  const segments = splitTrackByBreaks(trail.track, trail.track_breaks).filter(segment => segment.length >= 2);
  const sourcePoints = segments.reduce((sum, segment) => sum + segment.length, 0);
  if(!maxPoints || sourcePoints <= maxPoints) return segments;

  const minimumBudget = segments.length * 2;
  const target = Math.max(minimumBudget, Math.floor(maxPoints));
  const interiorPoints = segments.reduce((sum, segment) => sum + Math.max(0, segment.length - 2), 0);
  const extraBudget = Math.max(0, target - minimumBudget);
  const budgets = segments.map(segment => 2 + Math.floor(
    extraBudget * Math.max(0, segment.length - 2) / Math.max(1, interiorPoints),
  ));
  let remaining = target - budgets.reduce((sum, budget) => sum + budget, 0);
  const byLength = segments.map((segment, index) => ({index, length:segment.length}))
    .sort((left, right) => right.length - left.length || left.index - right.index);
  for(let cursor = 0; remaining > 0 && byLength.length; cursor++, remaining--) {
    budgets[byLength[cursor % byLength.length].index] += 1;
  }
  return segments.map((segment, index) => downsampleTrackForMap(
    segment,
    Math.min(segment.length, budgets[index]),
  ));
}

function updateHash(hash: number, value: number): number {
  return Math.imul(hash ^ value, 0x01000193) >>> 0;
}

function polylineSignature(model: TrackPolylineRenderModel): string {
  let hash = 0x811c9dc5;
  const paths = Array.isArray(model.latLngs[0]?.[0])
    ? model.latLngs as TrackLatLng[][]
    : [model.latLngs as TrackLatLng[]];
  for(const path of paths) {
    hash = updateHash(hash, path.length);
    for(const point of path) {
      hash = updateHash(hash, Math.round(point[0] * 1_000_000));
      hash = updateHash(hash, Math.round(point[1] * 1_000_000));
    }
  }
  return `${model.key}:${hash.toString(16)}:${JSON.stringify(model.lineStyle)}:${model.tooltip || ''}`;
}

function finalizeTrackRenderModel(model: TrackRenderModel): TrackRenderModel {
  for(const polyline of model.polylines) polyline.signature = polylineSignature(polyline);
  return model;
}

/** Builds Leaflet-independent track drawing instructions in stable z-order. */
export function buildTrackRenderModel(options: BuildTrackRenderModelOptions): TrackRenderModel {
  const [minElevation, maxElevation] = elevationRange(options.trails);
  const model: TrackRenderModel = {
    polylines: [], elevationBands: 0, minElevation, maxElevation,
    sourcePoints:0, renderedPoints:0,
  };
  if(!options.showTrack) return model;

  let ordered = [
    ...options.trails.filter(trail => trail.id !== options.primaryTrailId),
    ...options.trails.filter(trail => trail.id === options.primaryTrailId),
  ];
  if(options.escapeReferenceTrailId) {
    ordered = [
      ...ordered.filter(trail => trail.id !== options.escapeReferenceTrailId),
      ...ordered.filter(trail => trail.id === options.escapeReferenceTrailId),
    ];
  }

  for(const trail of ordered) {
    if(!trail.active || trail.track.length < 2) continue;
    const sampledSegments = sampledTrailSegments(trail, options.maxPointsPerTrail);
    model.sourcePoints += trail.track.length;
    model.renderedPoints += sampledSegments.reduce((sum, segment) => sum + segment.length, 0);
    const isMain = trail.id === options.primaryTrailId;
    const isEscapeReference = trail.id === options.escapeReferenceTrailId;
    const escapeSelecting = Boolean(options.escapeReferenceTrailId);
    if(isEscapeReference) {
      model.polylines.push({
        key:`${trail.id}:escape-reference-halo`, trail, latLngs:segmentedLatLngs(sampledSegments),
        lineStyle:{color:'#F59E0B', weight:9, opacity:0.92, smoothFactor:1, lineCap:'round', lineJoin:'round', interactive:false},
      });
    }
    if(options.mode === 'waypoint' && !isMain) {
      model.polylines.push({
        key:`${trail.id}:waypoint-reference`, trail, latLngs:segmentedLatLngs(sampledSegments), selectable:true,
        tooltip:trail.name,
        lineStyle:{
          color:trail.color || '#888',
          weight:isEscapeReference ? 4 : 1.8,
          opacity:isEscapeReference ? 1 : (escapeSelecting ? 0.16 : 0.45),
          dashArray:isEscapeReference ? undefined : '4,6',
        },
      });
      continue;
    }

    const baseOpacity = isMain ? 1 : 0.26;
    const baseWeight = isMain ? 5 : 2;
    const opacity = options.activeEscape
      ? baseOpacity * 0.35
      : escapeSelecting && !isEscapeReference ? baseOpacity * 0.24 : baseOpacity;
    const weight = isEscapeReference
      ? baseWeight + 1
      : options.activeEscape ? Math.max(1, baseWeight - 1.5) : baseWeight;
    const renderMode = options.mode === 'waypoint' && isMain ? 'elev' : options.mode;

    if(renderMode === 'day' && !isMain) {
      model.polylines.push({
        key:`${trail.id}:day-base`, trail, latLngs:segmentedLatLngs(sampledSegments), hoverable:true,
        lineStyle:{color:trail.color, weight, opacity, smoothFactor:1, lineCap:'round'},
      });
      continue;
    }

    if(isMain && (renderMode === 'elev' || renderMode === 'day') && !options.activeEscape) {
      const allLatLngs = segmentedLatLngs(sampledSegments);
      model.polylines.push(
        {
          key:`${trail.id}:bloom-outer`, trail, latLngs:allLatLngs,
          lineStyle:{color:'#ffffff', weight:weight + 5, opacity:0.32, smoothFactor:1, lineCap:'round', lineJoin:'round', interactive:false},
        },
        {
          key:`${trail.id}:bloom-inner`, trail, latLngs:allLatLngs,
          lineStyle:{color:'#FAF6EA', weight:weight + 2.5, opacity:0.42, smoothFactor:1, lineCap:'round', lineJoin:'round', interactive:false},
        },
      );
    }

    if(renderMode === 'elev') {
      const bandCount = options.elevationBandCount ?? 40;
      const bands = new Map<number, { ratio: number; paths: TrackLatLng[][] }>();
      for(const segment of sampledSegments) {
        const groups = buildElevationPolylineSegments(segment, {
          bandCount,
          minElevation,
          maxElevation,
        });
        for(const group of groups) {
          const band = bands.get(group.bandIndex) ?? {ratio:group.ratio, paths:[]};
          band.paths.push(...group.paths.map(path => path.latLngs));
          bands.set(group.bandIndex, band);
        }
      }
      model.elevationBands += bands.size;
      for(const [bandIndex, band] of [...bands.entries()].sort(([left], [right]) => left - right)) {
        model.polylines.push({
          key:`${trail.id}:elev:${bandIndex}`, trail, hoverable:true,
          latLngs:band.paths,
          lineStyle:{
            color:elevationTrackColor(minElevation + band.ratio * (maxElevation - minElevation), minElevation, maxElevation),
            weight, opacity, smoothFactor:1, lineCap:'round',
          },
        });
      }
      continue;
    }

    let currentColor: string | null = null;
    let currentPath: TrackLatLng[] = [];
    let runIndex = 0;
    const flush = () => {
      if(currentColor === null || currentPath.length < 2) return;
      model.polylines.push({
        key:`${trail.id}:day:${runIndex++}`, trail, latLngs:currentPath, hoverable:true,
        lineStyle:{color:currentColor, weight, opacity, smoothFactor:1, lineCap:'round'},
      });
    };
    for(const segment of sampledSegments) {
      currentColor = null;
      currentPath = [];
      for(let index = 0; index < segment.length; index += 1) {
        const point = segment[index];
        const day = Number(point[5]) || 1;
        const color = options.dayPalette[(day - 1) % options.dayPalette.length];
        if(color !== currentColor) {
          flush();
          currentColor = color;
          currentPath = index > 0
            ? [[segment[index - 1][0], segment[index - 1][1]], [point[0], point[1]]]
            : [[point[0], point[1]]];
        } else currentPath.push([point[0], point[1]]);
      }
      flush();
    }
  }
  return finalizeTrackRenderModel(model);
}
