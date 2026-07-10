import type { TrailStats } from './types.ts';

export function smoothElev(elevs: number[], win = 7): number[] {
  if(!elevs.length) return [];
  const half = Math.floor(win / 2);
  const out = new Array<number>(elevs.length);
  for(let i = 0; i < elevs.length; i++) {
    let s = 0;
    let c = 0;
    for(let j = Math.max(0, i - half); j <= Math.min(elevs.length - 1, i + half); j++) {
      s += elevs[j];
      c++;
    }
    out[i] = s / c;
  }
  return out;
}

export function accumulatorAscent(elevs: number[], thr = 10): number[] {
  const out = new Array<number>(elevs.length).fill(0);
  let total = 0;
  let refLow = elevs[0] ?? 0;
  for(let i = 1; i < elevs.length; i++) {
    if(elevs[i] < refLow) refLow = elevs[i];
    else if(elevs[i] - refLow >= thr) {
      total += elevs[i] - refLow;
      refLow = elevs[i];
    }
    out[i] = total;
  }
  return out;
}

export function accumulatorDescent(elevs: number[], thr = 10): number[] {
  const out = new Array<number>(elevs.length).fill(0);
  let total = 0;
  let refHigh = elevs[0] ?? 0;
  for(let i = 1; i < elevs.length; i++) {
    if(elevs[i] > refHigh) refHigh = elevs[i];
    else if(refHigh - elevs[i] >= thr) {
      total += refHigh - elevs[i];
      refHigh = elevs[i];
    }
    out[i] = total;
  }
  return out;
}

export function elevRatioColor(ratio: number): [number, number, number] {
  const stops: Array<[number, [number, number, number]]> = [
    [0, [220, 226, 200]],
    [0.35, [156, 184, 134]],
    [0.65, [99, 134, 92]],
    [1.0, [53, 78, 60]],
  ];
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for(let i = 0; i < stops.length - 1; i++) {
    if(ratio >= stops[i][0] && ratio <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const t = lo[0] === hi[0] ? 0 : (ratio - lo[0]) / (hi[0] - lo[0]);
  return [
    Math.round(lo[1][0] + t * (hi[1][0] - lo[1][0])),
    Math.round(lo[1][1] + t * (hi[1][1] - lo[1][1])),
    Math.round(lo[1][2] + t * (hi[1][2] - lo[1][2])),
  ];
}

export function computeTrailStats(elevs: number[], cumD: number[], smoothE: number[]): TrailStats {
  const validSmoothE = smoothE.filter(e => isFinite(e) && e > 0);
  return {
    distance_km: +(cumD[cumD.length - 1] / 1000).toFixed(1),
    ascent_m: Math.round(accumulatorAscent(elevs, 10).slice(-1)[0] || 0),
    descent_m: Math.round(accumulatorDescent(elevs, 10).slice(-1)[0] || 0),
    max_elev: Math.round(validSmoothE.reduce((a, b) => Math.max(a, b), 0) || 0),
    min_elev: Math.round(validSmoothE.reduce((a, b) => Math.min(a, b), Infinity) || 0),
  };
}
