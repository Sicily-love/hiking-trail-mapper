/**
 * 徒步路线地图 · 纯函数模块（v1.19.0 抽取）
 * ─────────────────────────────────────────────
 * 目的：把 HTML 里的纯计算函数镜像到独立 .js 文件，方便单元测试与 Node 端复用
 * 保持接口一致：HTML 里的实现应当与本文件按位复制/生成
 *
 * 使用：
 *   const { haversine, accumulatorAscent, ... } = require('./trail_core');
 */

/**
 * Haversine 球面距离
 * @param {number} lat1 @param {number} lng1 @param {number} lat2 @param {number} lng2
 * @returns {number} 距离（米）
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * 滑动平均平滑
 * @param {number[]} elevs @param {number} [win=7]
 * @returns {number[]}
 */
function smoothElev(elevs, win=7) {
  if(!elevs.length) return [];
  const half = Math.floor(win / 2);
  const out = new Array(elevs.length);
  for(let i = 0; i < elevs.length; i++) {
    let s = 0, c = 0;
    for(let j = Math.max(0, i-half); j <= Math.min(elevs.length-1, i+half); j++) {
      s += elevs[j]; c++;
    }
    out[i] = s / c;
  }
  return out;
}

/**
 * 累加器法累计爬升
 * @param {number[]} elevs @param {number} [thr=10]
 * @returns {number[]}
 */
function accumulatorAscent(elevs, thr=10) {
  const out = new Array(elevs.length).fill(0);
  let total = 0, refLow = elevs[0] ?? 0;
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

/**
 * 累加器法累计下降
 * @param {number[]} elevs @param {number} [thr=10]
 * @returns {number[]}
 */
function accumulatorDescent(elevs, thr=10) {
  const out = new Array(elevs.length).fill(0);
  let total = 0, refHigh = elevs[0] ?? 0;
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

/**
 * 海拔比例 → 分段绿色 RGB
 * @param {number} ratio 0-1
 * @returns {[number,number,number]}
 */
function elevRatioColor(ratio) {
  const stops = [
    [0,    [220, 226, 200]],
    [0.35, [156, 184, 134]],
    [0.65, [ 99, 134,  92]],
    [1.0,  [ 53,  78,  60]],
  ];
  let lo = stops[0], hi = stops[stops.length-1];
  for(let i=0; i<stops.length-1; i++) {
    if(ratio >= stops[i][0] && ratio <= stops[i+1][0]) { lo = stops[i]; hi = stops[i+1]; break; }
  }
  const t = lo[0] === hi[0] ? 0 : (ratio - lo[0]) / (hi[0] - lo[0]);
  return [
    Math.round(lo[1][0] + t*(hi[1][0]-lo[1][0])),
    Math.round(lo[1][1] + t*(hi[1][1]-lo[1][1])),
    Math.round(lo[1][2] + t*(hi[1][2]-lo[1][2])),
  ];
}

/**
 * 累计里程数组
 * @param {{lat:number,lng:number}[]} pts
 * @returns {number[]} 长度与 pts 相同，单位米
 */
function computeCumulativeDistance(pts) {
  const cumD = [0];
  for(let i=1; i<pts.length; i++) {
    cumD.push(cumD[i-1] + haversine(pts[i-1].lat, pts[i-1].lng, pts[i].lat, pts[i].lng));
  }
  return cumD;
}

/**
 * 全轨迹统计
 */
function computeTrailStats(elevs, cumD, smoothE) {
  const validSmoothE = smoothE.filter(e => isFinite(e) && e > 0);
  return {
    distance_km: +(cumD[cumD.length-1] / 1000).toFixed(1),
    ascent_m:  Math.round(accumulatorAscent(elevs, 10).slice(-1)[0] || 0),
    descent_m: Math.round(accumulatorDescent(elevs, 10).slice(-1)[0] || 0),
    max_elev:  Math.round(validSmoothE.reduce((a,b) => Math.max(a,b), 0) || 0),
    min_elev:  Math.round(validSmoothE.reduce((a,b) => Math.min(a,b), Infinity) || 0),
  };
}

/**
 * 生成下一个可用 id
 * @param {{id:string}[]} existingTrails
 * @returns {string}
 */
function generateNextTrailId(existingTrails) {
  let nextSeq = 1;
  for(const ex of existingTrails) {
    const n = parseInt(ex.id, 10);
    if(!isNaN(n) && String(n) === String(ex.id) && n >= nextSeq) nextSeq = n + 1;
  }
  while(existingTrails.some(ex => ex.id === String(nextSeq))) nextSeq++;
  return String(nextSeq);
}

/**
 * 将标注 snap 到最近 GPS 点（简化版：只需 gps_idx，不改坐标）
 * @param {{lat:number,lng:number,name:string,tag?:string}[]} wps
 * @param {{lat:number,lng:number}[]} pts
 * @returns {Array} 每项含 gps_idx
 */
function enrichWaypoints(wps, pts) {
  return wps.map(w => {
    let best = 0, bestD = Infinity;
    for(let i=0; i<pts.length; i++) {
      const d = haversine(w.lat, w.lng, pts[i].lat, pts[i].lng);
      if(d < bestD) { bestD = d; best = i; }
    }
    return Object.assign({}, w, {
      gps_idx: best,
      label: w.name,
      elev: pts[best]?.elev ?? 0,
    });
  });
}

/**
 * 内容哈希（简易 djb2 变体）— 只取轨迹关键特征做去重
 * @param {{track:number[][]}} trail
 * @returns {string}
 */
function trailContentHash(trail) {
  if(!trail || !trail.track || trail.track.length === 0) return '0';
  const pts = trail.track;
  const first = pts[0], last = pts[pts.length-1];
  const mid = pts[Math.floor(pts.length/2)];
  const s = `${pts.length}|${first[0].toFixed(5)},${first[1].toFixed(5)}|${mid[0].toFixed(5)},${mid[1].toFixed(5)}|${last[0].toFixed(5)},${last[1].toFixed(5)}`;
  let h = 5381;
  for(let i=0; i<s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

module.exports = {
  haversine,
  smoothElev,
  accumulatorAscent,
  accumulatorDescent,
  elevRatioColor,
  computeCumulativeDistance,
  computeTrailStats,
  generateNextTrailId,
  enrichWaypoints,
  trailContentHash,
};
