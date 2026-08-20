import type { TrackTuple } from '../../core/types.ts';
import type { RuntimeContext } from '../../app/runtime/context.ts';
import { escapeHtmlText, sanitizeHexColor } from '../../ui/safe-content.ts';

export interface WaypointRenderRecord {
  id: string | number;
  lat: number;
  lng: number;
  tag?: string;
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
  baseSignature?: string;
  kind: 'waypoint' | 'highpoint';
  position: [number, number];
  iconHtml: string;
  iconSize: [number | null, number];
  iconAnchor: [number, number];
  className?: string;
  labelLayout?: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    priority: number;
  };
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

const WAYPOINT_LABEL_PRIORITY:Readonly<Record<string, number>> = Object.freeze({
  start:90, end:90, camp:80, pass:70, water:65, warn:60, fork:55,
  supply:50, shelter:45, village:40, bridge:35, river:35, other:20,
});

export function buildWaypointMarkerModel(options: BuildWaypointMarkerOptions): LeafletMarkerRenderModel {
  const {trail, waypoint, isPrimary, waypointMode, color, iconText} = options;
  const safeColor = sanitizeHexColor(color);
  const onlyEmoji = waypointMode && !isPrimary;
  const opacity = waypointMode ? 1 : (isPrimary ? 1 : 0.7);
  const dayBadge = waypoint.day != null ? `<span class="wp-day-badge">D${waypoint.day}</span>` : '';
  const labelText = `${waypoint.day != null ? `D${waypoint.day} ` : ''}${waypoint.km ?? '-'}km · ${waypoint.elev ?? '-'}m`;
  const label = onlyEmoji ? '' : `<div class="wp-marker-label" style="color:${safeColor};border-color:${safeColor};opacity:${opacity}">${dayBadge}${waypoint.km ?? '-'}km · ${waypoint.elev ?? '-'}m</div>`;
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
    key:`${trail.id}#${waypoint.id}`, signature, baseSignature:signature, kind:'waypoint',
    position:[waypoint.lat, waypoint.lng], iconHtml, iconSize:[24, 24], iconAnchor:[12, 12],
    className:'map-marker map-marker--waypoint map-marker-label-visible',
    labelLayout:onlyEmoji ? undefined : {
      width:Math.min(154, Math.max(68, 18 + labelText.length * 6)),
      height:20,
      offsetX:16,
      offsetY:-10,
      priority:(isPrimary ? 1000 : 0) + (WAYPOINT_LABEL_PRIORITY[waypoint.tag || 'other'] || 0),
    },
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
  const iconHtml = `<div class="highpoint-marker" style="--highpoint-color:${sanitizeHexColor(trail.color)}"><span class="highpoint-marker__icon">⛰</span><span class="highpoint-marker__label">${maxElevation} m</span></div>`;
  const signature = JSON.stringify([trail.name, trail.color, point[0], point[1], point[3], maxElevation, isPrimary]);
  return {
    key:`highpoint:${trail.id}`,
    signature,
    baseSignature:signature,
    kind:'highpoint', position:[point[0], point[1]], iconHtml, iconSize:[null, 36], iconAnchor:[12, 30],
    className:'map-marker map-marker--highpoint map-marker-label-visible',
    labelLayout:{width:72, height:20, offsetX:-30, offsetY:-4, priority:(isPrimary ? 1000 : 0) + 75},
    markerOptions:{zIndexOffset:isPrimary ? 800 : 750, opacity:isPrimary ? 1 : 0.85},
    popupHtml:`<div class="popup-content"><h4>⛰ ${escapeHtmlText(trail.name)} 最高点</h4><div class="pmeta">海拔 <b>${maxElevation}</b> m</div><div class="pmeta">里程 <b>${point[3]}</b> km</div></div>`,
    popupOptions:{maxWidth:260}, trail,
  };
}

/** Applies decluttering without rebuilding marker content or hiding its icon. */
export function setMarkerLabelVisibility(
  model: LeafletMarkerRenderModel,
  visible: boolean,
): LeafletMarkerRenderModel {
  if(!model.labelLayout) return model;
  const stateClass = visible ? 'map-marker-label-visible' : 'map-marker-label-hidden';
  const className = `${model.className || 'map-marker'} ${stateClass}`
    .replace(/\bmap-marker-label-(?:visible|hidden)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    ...model,
    className:`${className} ${stateClass}`,
    signature:`${model.signature}|label:${visible ? 1 : 0}`,
  };
}

/** Centralizes marker visibility and model creation outside browser orchestration. */
export function createMarkerRenderController<TTrail extends WaypointRenderTrail>(
  context: RuntimeContext<TTrail>,
  options: MarkerRenderControllerOptions,
): MarkerRenderController {
  const build = (): MarkerRenderScene => {
    const state = context.stateSelectors.snapshot();
    const waypointMode = state.mode === 'waypoint';
    const waypoints: LeafletMarkerRenderModel[] = [];
    const highPoints: LeafletMarkerRenderModel[] = [];

    for(const trail of context.projectSelectors.trails()) {
      const active = state.activeGroup !== null
        && (trail.group || '默认') === state.activeGroup
        && state.activeTrails.has(trail.id);
      const isPrimary = trail.id === state.primaryTrailId;
      if(state.showLabel && (waypointMode || (active && isPrimary))) {
        for(const waypoint of trail.waypoints || []) {
          if(!state.visibleTags.has(waypoint.tag || 'other')) continue;
          waypoints.push(buildWaypointMarkerModel({
            trail,
            waypoint,
            isPrimary,
            waypointMode,
            color:options.tagColors[waypoint.tag || 'other'] || '#aaa',
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
