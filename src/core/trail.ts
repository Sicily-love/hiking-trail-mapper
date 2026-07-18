import { haversine, nearestPointIndex, pointElevation } from './geo.ts';
import type { ElevationPoint, EnrichedWaypoint, TrailLike, WaypointInput } from './types.ts';

const WAYPOINT_TAG_RULES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['start', ['开始徒步', '起点', '出发', '起步']],
  ['end', ['终点', '结束', '收队']],
  ['fork', ['分叉', '分岔', '路口', '走左边', '走右边', '切下去', '右转', '左转', '岔路']],
  ['camp', ['营地', '扎营', '宿营', '过夜']],
  ['pass', ['垭口', '口子']],
  ['warn', ['Z字', '陡', '危险', '注意', '小心', '高反', '滚石', '滑']],
  ['supply', ['商店', '补给', '便宜', '柠檬茶', '咖啡', '卖', '夯达', '小卖部', '杂货']],
  ['water', ['水源', '打水', '取水']],
  ['shelter', ['避雨', '避风', '小木屋', '木屋']],
  ['bridge', ['过桥', '过河', '涉水']],
  ['river', ['小溪', '大河']],
  ['village', ['村', '寨', '牧民', '藏民', '居民点']],
];

export function classifyWaypointTag(name: string | null | undefined): string {
  const normalized = String(name || '').trim();
  if(!normalized) return 'other';
  for(const [tag, keywords] of WAYPOINT_TAG_RULES) {
    if(keywords.some(keyword => normalized.includes(keyword))) return tag;
  }
  return 'other';
}

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
