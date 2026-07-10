import type { ElevationPoint, LatLng } from './types.ts';

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function computeCumulativeDistance<T extends LatLng>(pts: T[]): number[] {
  const cumD = [0];
  for(let i = 1; i < pts.length; i++) {
    cumD.push(cumD[i - 1] + haversine(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng));
  }
  return cumD;
}

export function nearestPointIndex(target: LatLng, pts: LatLng[]): number {
  let best = 0;
  let bestD = Infinity;
  for(let i = 0; i < pts.length; i++) {
    const d = haversine(target.lat, target.lng, pts[i].lat, pts[i].lng);
    if(d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function pointElevation(pt: ElevationPoint | undefined): number {
  return pt?.elev ?? 0;
}
