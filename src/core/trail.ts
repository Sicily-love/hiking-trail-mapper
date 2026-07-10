import { haversine, nearestPointIndex, pointElevation } from './geo.ts';
import type { ElevationPoint, EnrichedWaypoint, TrailLike, WaypointInput } from './types.ts';

export function generateNextTrailId(existingTrails: Array<{ id: string }>): string {
  let nextSeq = 1;
  for(const ex of existingTrails) {
    const n = parseInt(ex.id, 10);
    if(!isNaN(n) && String(n) === String(ex.id) && n >= nextSeq) nextSeq = n + 1;
  }
  while(existingTrails.some(ex => ex.id === String(nextSeq))) nextSeq++;
  return String(nextSeq);
}

export function enrichWaypoints(wps: WaypointInput[], pts: ElevationPoint[]): EnrichedWaypoint[] {
  return wps.map(w => {
    const best = nearestPointIndex(w, pts);
    return {
      ...w,
      gps_idx: best,
      label: w.name,
      elev: pointElevation(pts[best]),
    };
  });
}

export function trailContentHash(trail: TrailLike | null): string {
  if(!trail || !trail.track || trail.track.length === 0) return '0';
  const pts = trail.track;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const mid = pts[Math.floor(pts.length / 2)];
  const s = `${pts.length}|${first[0].toFixed(5)},${first[1].toFixed(5)}|${mid[0].toFixed(5)},${mid[1].toFixed(5)}|${last[0].toFixed(5)},${last[1].toFixed(5)}`;
  let h = 5381;
  for(let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

export { haversine };
