import type { RuntimeContext } from '../../app/runtime/context.ts';
import { computeSegmentedTrackMetrics, normalizeTrackBreaks } from '../../core/trackSegments.ts';

export type MutableTrailPoint = [
  lat: number,
  lng: number,
  elevation: number,
  distanceKm?: number,
  ascentM?: number,
  dayId?: number | null,
];

export interface MutableTrailWaypoint {
  lat?: number;
  lng?: number;
  km?: number;
  elev?: number;
  gps_idx?: number | null;
}

export interface MutableTrailStats {
  distance_km: number;
  ascent_m: number;
  descent_m: number;
}

export interface MutableTrail {
  id: string;
  name: string;
  track: MutableTrailPoint[];
  stats: MutableTrailStats;
  days?: number;
  waypoints?: MutableTrailWaypoint[];
  _descCum?: number[];
  track_breaks?: number[];
  stitch_sources?: Array<{trailId: string; name: string}>;
  escape_routes?: Array<{_anchor?: {trailId: string; trailName: string} | null}>;
}

export interface TrailControllerDependencies {
  haversine: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
  accumulatorAscent: (elevations: number[], threshold: number) => number[];
  accumulatorDescent: (elevations: number[], threshold: number) => number[];
  markRevision: (trail: MutableTrail) => unknown;
  persist: () => void;
  render: (options?: {fit?: boolean}) => void;
  clearStorage: () => Promise<void>;
  notify: (message: string) => void;
}

export interface TrailController {
  deleteTrail: (trailId: string) => boolean;
  renameTrail: (trailId: string, requestedName: string) => boolean;
  reverseTrail: (trailId: string) => boolean;
  clearTrails: () => Promise<boolean>;
}

function requireDependencies(dependencies: TrailControllerDependencies): void {
  for(const [name, dependency] of Object.entries(dependencies)) {
    if(typeof dependency !== 'function') throw new TypeError(`TrailController requires ${name}`);
  }
}

/** Owns trail collection mutations while UI confirmation remains in the caller. */
export function createTrailController(
  context: RuntimeContext<MutableTrail>,
  dependencies: TrailControllerDependencies,
): TrailController {
  requireDependencies(dependencies);
  const {project, state} = context;

  const deleteTrail = (trailId: string): boolean => {
    const nextTrails = project.trails.filter(trail => trail.id !== trailId);
    if(nextTrails.length === project.trails.length) return false;
    project.trails = nextTrails;
    state.dispatch({type:'trail.remove', trailId});
    dependencies.persist();
    dependencies.render();
    return true;
  };

  const renameTrail = (trailId: string, requestedName: string): boolean => {
    const trail = project.trails.find(candidate => candidate.id === trailId);
    const name = requestedName.trim();
    if(!trail || !name || name === trail.name) return false;
    trail.name = name;

    for(const candidate of project.trails) {
      for(const source of candidate.stitch_sources || []) {
        if(source.trailId === trailId) source.name = name;
      }
      for(const route of candidate.escape_routes || []) {
        if(route._anchor?.trailId === trailId) route._anchor.trailName = name;
      }
    }

    dependencies.persist();
    dependencies.render({fit:false});
    dependencies.notify(`「${name}」名称已更新`);
    return true;
  };

  const reverseTrail = (trailId: string): boolean => {
    const trail = project.trails.find(candidate => candidate.id === trailId);
    if(!trail?.track.length) return false;

    const previousBreaks = normalizeTrackBreaks(trail.track_breaks, trail.track.length);
    trail.track.reverse();
    trail.track_breaks = previousBreaks
      .map(index => trail.track.length - index)
      .sort((left, right) => left - right);
    const metrics = computeSegmentedTrackMetrics(trail.track, trail.track_breaks, 10);

    for(let index = 0; index < trail.track.length; index += 1) {
      const point = trail.track[index];
      point[3] = +(metrics.cumulativeDistanceM[index] / 1000).toFixed(2);
      point[4] = Math.round(metrics.cumulativeAscentM[index]);
    }

    const dayCount = trail.days || 1;
    if(dayCount > 1) {
      for(const point of trail.track) {
        if(point[5]) point[5] = dayCount - point[5] + 1;
      }
    }

    trail.stats.distance_km = metrics.stats.distance_km;
    trail.stats.ascent_m = metrics.stats.ascent_m;
    trail.stats.descent_m = metrics.stats.descent_m;
    trail._descCum = metrics.cumulativeDescentM;

    if(trail.waypoints?.length) {
      const totalDistanceKm = trail.stats.distance_km;
      for(const waypoint of trail.waypoints) {
        if(waypoint.km !== undefined) waypoint.km = +(totalDistanceKm - waypoint.km).toFixed(1);
        if(waypoint.lat && waypoint.lng) {
          let nearestIndex = 0;
          let nearestDistance = Infinity;
          for(let index = 0; index < trail.track.length; index += 1) {
            const point = trail.track[index];
            const distance = dependencies.haversine(waypoint.lat, waypoint.lng, point[0], point[1]);
            if(distance < nearestDistance) {
              nearestDistance = distance;
              nearestIndex = index;
            }
          }
          waypoint.gps_idx = nearestIndex;
          waypoint.km = +(trail.track[nearestIndex][3] || 0).toFixed(1);
          waypoint.elev = Math.round(trail.track[nearestIndex][2]);
        } else if(waypoint.gps_idx != null) {
          waypoint.gps_idx = trail.track.length - 1 - waypoint.gps_idx;
        }
      }
      trail.waypoints.sort((left, right) => (left.km || 0) - (right.km || 0));
    }

    dependencies.markRevision(trail);
    dependencies.persist();
    dependencies.render({fit:false});
    dependencies.notify(`⇄ 「${trail.name}」已反向`);
    return true;
  };

  const clearTrails = async (): Promise<boolean> => {
    if(!project.trails.length) return false;
    project.trails = [];
    state.dispatch({type:'workspace.clear'});
    await dependencies.clearStorage();
    dependencies.render();
    return true;
  };

  return Object.freeze({deleteTrail, renameTrail, reverseTrail, clearTrails});
}
