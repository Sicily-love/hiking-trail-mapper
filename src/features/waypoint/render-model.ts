import type { TrackTuple } from '../../core/types.ts';
import type { RuntimeContext } from '../../app/runtime/context.ts';
import { escapeHtmlText, sanitizeHexColor } from '../../ui/safe-content.ts';

export interface WaypointRenderRecord {
  id: string | number;
  lat: number;
  lng: number;
  tag: string;
  km?: number;
  elev?: number;
  day?: number | null;
  icon?: string;
  label?: string;
  name?: string;
  photo?: string;
}

export interface WaypointRenderTrail {
  id: string;
  name: string;
  color?: string;
  group?: string;
  track: TrackTuple[];
  waypoints?: WaypointRenderRecord[];
}

export interface MarkerRenderScene {
  waypoints: LeafletMarkerRenderModel[];
  highPoints: LeafletMarkerRenderModel[];
}

export interface MarkerRenderControllerOptions {
  tagColors: Readonly<Record<string, string>>;
  iconForWaypoint: (waypoint: WaypointRenderRecord) => string;
}

export interface MarkerRenderController {
  build(): MarkerRenderScene;
}

export interface LeafletMarkerRenderModel {
  key: string;
  signature: string;
  kind: 'waypoint' | 'highpoint';
  position: [number, number];
  iconHtml: string;
  iconSize: [number | null, number];
  iconAnchor: [number, number];
  markerOptions: Record<string, unknown>;
  popupHtml?: string;
  popupOptions?: Record<string, unknown>;
  trail: WaypointRenderTrail;
  waypoint?: WaypointRenderRecord;
}

export interface BuildWaypointMarkerOptions {
  trail: WaypointRenderTrail;
  waypoint: WaypointRenderRecord;
  isPrimary: boolean;
  waypointMode: boolean;
  color: string;
  iconText: string;
}

export function buildWaypointMarkerModel(options: BuildWaypointMarkerOptions): LeafletMarkerRenderModel {
  const {trail, waypoint, isPrimary, waypointMode, color, iconText} = options;
  const safeColor = sanitizeHexColor(color);
  const onlyEmoji = waypointMode && !isPrimary;
  const opacity = waypointMode ? 1 : (isPrimary ? 1 : 0.7);
  const dayBadge = waypoint.day != null ? `<span class="wp-day-badge">D${waypoint.day}</span>` : '';
  const label = onlyEmoji ? '' : `<div class="wp-marker-label" style="color:${safeColor};border-color:${safeColor};opacity:${opacity}">${dayBadge}${waypoint.km}km · ${waypoint.elev}m</div>`;
  const emojiSize = onlyEmoji ? 'font-size:16px;' : '';
  const emojiShadow = onlyEmoji ? 'filter:drop-shadow(0 1px 2px rgba(0,0,0,0.7));' : '';
  const iconHtml = `<div class="wp-marker-shell"><span class="wp-marker-emoji" style="color:${safeColor};opacity:${opacity};${emojiSize}${emojiShadow}">${iconText}</span>${label}</div>`;
  const photo = String(waypoint.photo || '');
  const signature = JSON.stringify([
    trail.name, trail.color, waypointMode, isPrimary,
    waypoint.lat, waypoint.lng, waypoint.tag, waypoint.day, waypoint.km, waypoint.elev,
    waypoint.icon, waypoint.label, waypoint.name,
    photo ? `${photo.length}:${photo.slice(0, 24)}:${photo.slice(-24)}` : '',
  ]);
  return {
    key:`${trail.id}#${waypoint.id}`, signature, kind:'waypoint',
    position:[waypoint.lat, waypoint.lng], iconHtml, iconSize:[24, 24], iconAnchor:[12, 12],
    markerOptions:{zIndexOffset:isPrimary ? 700 : 600, opacity:1},
    trail, waypoint,
  };
}

export function buildHighPointMarkerModel(
  trail: WaypointRenderTrail,
  isPrimary: boolean,
): LeafletMarkerRenderModel | null {
  let maxIndex = 0;
  let maxElevation = -Infinity;
  for(let index = 0; index < trail.track.length; index += 1) {
    const elevation = Number(trail.track[index][2]);
    if(Number.isFinite(elevation) && elevation > maxElevation) {
      maxElevation = elevation;
      maxIndex = index;
    }
  }
  if(maxElevation === -Infinity) return null;
  const point = trail.track[maxIndex];
  const iconHtml = `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto"><div style="font-size:18px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6))">⛰</div><div style="background:${sanitizeHexColor(trail.color)};color:#fff;font-size:10px;padding:2px 6px;border-radius:3px;margin-top:2px;white-space:nowrap;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.3)">${maxElevation} m</div></div>`;
  return {
    key:`highpoint:${trail.id}`,
    signature:JSON.stringify([trail.name, trail.color, point[0], point[1], point[3], maxElevation, isPrimary]),
    kind:'highpoint', position:[point[0], point[1]], iconHtml, iconSize:[null, 36], iconAnchor:[12, 30],
    markerOptions:{zIndexOffset:isPrimary ? 800 : 750, opacity:isPrimary ? 1 : 0.85},
    popupHtml:`<div class="popup-content"><h4>⛰ ${escapeHtmlText(trail.name)} 最高点</h4><div class="pmeta">海拔 <b>${maxElevation}</b> m</div><div class="pmeta">里程 <b>${point[3]}</b> km</div></div>`,
    popupOptions:{maxWidth:260}, trail,
  };
}

/** Centralizes marker visibility and model creation outside browser orchestration. */
export function createMarkerRenderController(
  context: RuntimeContext<WaypointRenderTrail>,
  options: MarkerRenderControllerOptions,
): MarkerRenderController {
  const build = (): MarkerRenderScene => {
    const state = context.state.snapshot();
    const waypointMode = state.mode === 'waypoint';
    const waypoints: LeafletMarkerRenderModel[] = [];
    const highPoints: LeafletMarkerRenderModel[] = [];

    for(const trail of context.project.trails) {
      const active = state.activeGroup !== null
        && (trail.group || '默认') === state.activeGroup
        && state.activeTrails.has(trail.id);
      const isPrimary = trail.id === state.primaryTrailId;
      if(state.showLabel && (waypointMode || (active && isPrimary))) {
        for(const waypoint of trail.waypoints || []) {
          if(!state.visibleTags.has(waypoint.tag)) continue;
          waypoints.push(buildWaypointMarkerModel({
            trail,
            waypoint,
            isPrimary,
            waypointMode,
            color:options.tagColors[waypoint.tag] || '#aaa',
            iconText:options.iconForWaypoint(waypoint),
          }));
        }
      }
      if((waypointMode || active) && state.visibleTags.has('highpoint')) {
        const highPoint = buildHighPointMarkerModel(trail, isPrimary);
        if(highPoint) highPoints.push(highPoint);
      }
    }
    return {waypoints, highPoints};
  };
  return Object.freeze({build});
}
