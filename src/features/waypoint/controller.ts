import type { RuntimeContext } from '../../app/runtime/context.ts';

export type WaypointTrackPoint = [
  lat: number,
  lng: number,
  elevation?: number,
  distanceKm?: number,
  ascentM?: number,
  dayId?: number | null,
];

export interface WaypointRecord {
  id: number | string;
  name?: string;
  label?: string;
  icon?: string;
  tag?: string;
  km?: number;
  elev?: number;
  lat?: number;
  lng?: number;
  gps_idx?: number;
  day?: number | null;
  time?: string;
  photo?: string;
  description?: string;
  manuallyAdded?: boolean;
  [key: string]: unknown;
}

export interface WaypointTrail {
  id: string;
  track: WaypointTrackPoint[];
  waypoints?: WaypointRecord[];
  [key: string]: unknown;
}

export interface WaypointControllerState {
  active: boolean;
  trailId: string | null;
}

export interface ManualWaypointAnchor {
  trailId: string;
  trackIndex: number;
  point: WaypointTrackPoint;
}

export interface ManualWaypointInput {
  name: string;
  tag: string;
  description?: string;
  photo?: string;
}

export interface WaypointControllerDependencies {
  iconForTag: (tag: string) => string;
  markRevision: (trail: WaypointTrail) => unknown;
  renderWaypoints: () => void;
  renderFilters: () => void;
  renderDays: () => void;
  persist: () => void;
  notify: (message: string) => void;
}

export interface WaypointController {
  readonly state: Readonly<WaypointControllerState>;
  enter: (trailId: string) => boolean;
  exit: () => void;
  nextId: (trail: WaypointTrail) => number;
  addManualWaypoint: (anchor: ManualWaypointAnchor, input: ManualWaypointInput) => WaypointRecord | null;
}

/** Owns manual-waypoint state and project mutations without Leaflet or DOM access. */
export function createWaypointController(
  context: RuntimeContext<WaypointTrail>,
  dependencies: WaypointControllerDependencies,
): WaypointController {
  const state: WaypointControllerState = {active:false, trailId:null};

  const enter = (trailId: string): boolean => {
    const trail = context.projectSelectors.trailById(trailId);
    if(!trail?.track.length) return false;
    state.active = true;
    state.trailId = trailId;
    return true;
  };

  const exit = (): void => {
    state.active = false;
    state.trailId = null;
  };

  const nextId = (trail: WaypointTrail): number => {
    const ids = (trail.waypoints || [])
      .map(waypoint => Number.parseInt(String(waypoint.id), 10))
      .filter(Number.isFinite);
    return ids.length ? Math.max(...ids) + 1 : 1;
  };

  const addManualWaypoint = (anchor: ManualWaypointAnchor, input: ManualWaypointInput): WaypointRecord | null => {
    const cleanName = input.name.trim();
    if(!cleanName) return null;
    const trail = context.projectSelectors.trailById(anchor.trailId);
    if(!trail || trail.id !== context.stateSelectors.primaryTrailId()) return null;
    if(trail.track[anchor.trackIndex] !== anchor.point) return null;

    const point = anchor.point;
    const displayName = `${cleanName} [手动]`;
    const waypoint: WaypointRecord = {
      id:nextId(trail),
      name:displayName,
      label:displayName,
      icon:dependencies.iconForTag(input.tag),
      tag:input.tag,
      km:Number.parseFloat((point[3] || 0).toFixed(1)),
      elev:Math.round(point[2] || 0),
      lat:point[0],
      lng:point[1],
      gps_idx:anchor.trackIndex,
      day:point[5] || null,
      time:'',
      photo:input.photo || '',
      description:input.description?.trim() || '',
      manuallyAdded:true,
    };
    const updated = context.projectActions.mutateTrail(trail.id, 'waypoint.add', candidate => {
      (candidate.waypoints ||= []).push(waypoint);
    });
    if(!updated) return null;
    dependencies.markRevision(updated);
    dependencies.renderWaypoints();
    dependencies.renderFilters();
    dependencies.renderDays();
    dependencies.persist();
    dependencies.notify(`✓ "${cleanName}" 已添加`);
    return waypoint;
  };

  return Object.freeze({state, enter, exit, nextId, addManualWaypoint});
}
