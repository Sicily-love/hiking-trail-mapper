import { buildElevationPolylineSegments } from '../../core/performance/elevation.ts';
import type { TrackTuple } from '../../core/types.ts';

export type TrackLatLng = [lat: number, lng: number];
export type TrackPolylineLatLngs = TrackLatLng[] | TrackLatLng[][];

export interface TrackRenderTrail {
  id: string;
  name: string;
  color?: string;
  track: TrackTuple[];
}

export interface TrackRenderInputTrail extends TrackRenderTrail {
  active: boolean;
}

export interface TrackPolylineRenderModel {
  key: string;
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
}

export interface BuildTrackRenderModelOptions {
  trails: TrackRenderInputTrail[];
  primaryTrailId: string | null;
  mode: 'day' | 'elev' | 'waypoint';
  showTrack: boolean;
  activeEscape: string | null;
  dayPalette: readonly string[];
  elevationBandCount?: number;
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

function latLngs(track: TrackTuple[]): TrackLatLng[] {
  return track.map(point => [point[0], point[1]]);
}

/** Builds Leaflet-independent track drawing instructions in stable z-order. */
export function buildTrackRenderModel(options: BuildTrackRenderModelOptions): TrackRenderModel {
  const [minElevation, maxElevation] = elevationRange(options.trails);
  const model: TrackRenderModel = {polylines: [], elevationBands: 0, minElevation, maxElevation};
  if(!options.showTrack) return model;

  const ordered = [
    ...options.trails.filter(trail => trail.id !== options.primaryTrailId),
    ...options.trails.filter(trail => trail.id === options.primaryTrailId),
  ];

  for(const trail of ordered) {
    if(!trail.active || trail.track.length < 2) continue;
    const isMain = trail.id === options.primaryTrailId;
    if(options.mode === 'waypoint' && !isMain) {
      model.polylines.push({
        key:`${trail.id}:waypoint-reference`, trail, latLngs:latLngs(trail.track), selectable:true,
        tooltip:trail.name,
        lineStyle:{color:trail.color || '#888', weight:1.8, opacity:0.45, dashArray:'4,6'},
      });
      continue;
    }

    const baseOpacity = isMain ? 0.95 : 0.4;
    const baseWeight = isMain ? 4.5 : 2.5;
    const opacity = options.activeEscape ? baseOpacity * 0.35 : baseOpacity;
    const weight = options.activeEscape ? Math.max(1, baseWeight - 1.5) : baseWeight;
    const renderMode = options.mode === 'waypoint' && isMain ? 'elev' : options.mode;

    if(renderMode === 'day' && !isMain) {
      model.polylines.push({
        key:`${trail.id}:day-base`, trail, latLngs:latLngs(trail.track), hoverable:true,
        lineStyle:{color:trail.color, weight, opacity, smoothFactor:1, lineCap:'round'},
      });
      continue;
    }

    if(isMain && (renderMode === 'elev' || renderMode === 'day') && !options.activeEscape) {
      const allLatLngs = latLngs(trail.track);
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
      const groups = buildElevationPolylineSegments(trail.track, {
        bandCount:options.elevationBandCount ?? 40,
        minElevation,
        maxElevation,
      });
      model.elevationBands += groups.length;
      for(const group of groups) {
        model.polylines.push({
          key:`${trail.id}:elev:${group.bandIndex}`, trail, hoverable:true,
          latLngs:group.paths.map(path => path.latLngs),
          lineStyle:{
            color:elevationTrackColor(minElevation + group.ratio * (maxElevation - minElevation), minElevation, maxElevation),
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
    for(let index = 0; index < trail.track.length; index += 1) {
      const point = trail.track[index];
      const day = Number(point[5]) || 1;
      const color = options.dayPalette[(day - 1) % options.dayPalette.length];
      if(color !== currentColor) {
        flush();
        currentColor = color;
        currentPath = index > 0
          ? [[trail.track[index - 1][0], trail.track[index - 1][1]], [point[0], point[1]]]
          : [[point[0], point[1]]];
      } else currentPath.push([point[0], point[1]]);
    }
    flush();
  }
  return model;
}
