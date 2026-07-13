// @ts-nocheck
// Transitional classic fragments owned by measurement interaction and rendering.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment measure.runtime */
/* ============ 测距功能（主轨迹上选两点 → 爬升/下降/里程） ============ */
const measureController = HTM_APP.createMeasureController();
const measureState = measureController.state;
const measureTrackCache = new WeakMap();
const measureStatsCache = new WeakMap();

function nearestTrackIdxOnPrimary(lat, lng) {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) return null;
  const tk = main.track;
  const sig = `${tk[0][0]},${tk[0][1]}|${tk[tk.length-1][0]},${tk[tk.length-1][1]}`;
  // 缓存主轨迹 typed array + 经纬度网格；测距点击只查附近网格，避免每次全轨扫描。
  let cache = measureTrackCache.get(main);
  if(!cache || cache.length !== tk.length || cache.sig !== sig) {
    const cellSize = 0.0015; // 约 160m，经纬度网格只用于候选点粗筛
    const latCache = new Float64Array(tk.length);
    const lngCache = new Float64Array(tk.length);
    const grid = new Map();
    for(let i=0; i<tk.length; i++) {
      const la = tk[i][0], ln = tk[i][1];
      latCache[i] = la;
      lngCache[i] = ln;
      const key = `${Math.floor(la / cellSize)}:${Math.floor(ln / cellSize)}`;
      let bucket = grid.get(key);
      if(!bucket) { bucket = []; grid.set(key, bucket); }
      bucket.push(i);
    }
    cache = { length: tk.length, sig, cellSize, grid, latCache, lngCache };
    measureTrackCache.set(main, cache);
  }
  const lats = cache.latCache;
  const lngs = cache.lngCache;
  const cellSize = cache.cellSize;
  const cosL = Math.cos(lat * Math.PI / 180);
  let bestI = 0, bestPlanar = Infinity;

  const cLat = Math.floor(lat / cellSize);
  const cLng = Math.floor(lng / cellSize);
  const latRadius = 2;
  const lngRadius = Math.max(2, Math.ceil((0.002 / Math.max(cosL, 0.15)) / cellSize));
  let seenCandidate = false;
  for(let gy = cLat - latRadius; gy <= cLat + latRadius; gy++) {
    for(let gx = cLng - lngRadius; gx <= cLng + lngRadius; gx++) {
      const bucket = cache.grid.get(`${gy}:${gx}`);
      if(!bucket) continue;
      for(let k=0; k<bucket.length; k++) {
        const i = bucket[k];
        const dy = lats[i] - lat;
        const dx = (lngs[i] - lng) * cosL;
        const d2 = dx*dx + dy*dy;
        if(d2 < bestPlanar) { bestPlanar = d2; bestI = i; }
      }
      seenCandidate = true;
    }
  }

  if(!seenCandidate) return null;
  // 邻近网格可能仍有多点集中，候选内取最近；不再扫描整条主轨迹。
  const p = tk[bestI];
  const distM = haversine(lat, lng, p[0], p[1]);
  if(distM > 200) return null;
  return { idx: bestI, point: p, dist: distM, trail: main };
}

function nearestTrackIdxNearPrimary(lat, lng, centerIdx, windowSize = 700) {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length || centerIdx == null || !isFinite(centerIdx)) {
    return nearestTrackIdxOnPrimary(lat, lng);
  }
  const tk = main.track;
  const lo = Math.max(0, Math.floor(centerIdx) - windowSize);
  const hi = Math.min(tk.length - 1, Math.floor(centerIdx) + windowSize);
  const cosL = Math.cos(lat * Math.PI / 180);
  let bestI = -1, bestPlanar = Infinity;
  for(let i=lo; i<=hi; i++) {
    const dy = tk[i][0] - lat;
    const dx = (tk[i][1] - lng) * cosL;
    const d2 = dx*dx + dy*dy;
    if(d2 < bestPlanar) { bestPlanar = d2; bestI = i; }
  }
  if(bestI >= 0) {
    const p = tk[bestI];
    const distM = haversine(lat, lng, p[0], p[1]);
    if(distM <= 200) return { idx: bestI, point: p, dist: distM, trail: main };
  }
  return nearestTrackIdxOnPrimary(lat, lng);
}

function measurePointFromHit(hit) {
  const p = hit.point;
  return { idx: hit.idx, lat: p[0], lng: p[1], elev: p[2] || 0, km: p[3] || 0 };
}


function getMeasureStatsCache(main) {
  if(!main || !main.track || !main.track.length) return null;
  const tk = main.track;
  const sig = `${tk[0][0]},${tk[0][1]}|${tk[tk.length-1][0]},${tk[tk.length-1][1]}|${tk.length}`;
  let cache = measureStatsCache.get(main);
  if(cache && cache.sig === sig) return cache;

  const n = tk.length;
  const ascCum = new Float64Array(n);
  const descCum = new Float64Array(n);
  const distCum = new Float64Array(n);
  const elevs = new Array(n);
  for(let i=0; i<n; i++) {
    distCum[i] = Number.isFinite(tk[i][3]) ? tk[i][3] : (i ? distCum[i-1] : 0);
    ascCum[i] = Number.isFinite(tk[i][4]) ? tk[i][4] : 0;
    descCum[i] = main._descCum && Number.isFinite(main._descCum[i]) ? main._descCum[i] : 0;
    elevs[i] = Number.isFinite(tk[i][2]) ? tk[i][2] : 0;
  }
  if(!main._descCum || main._descCum.length !== n) {
    const d = accumulatorDescent(elevs, 10);
    for(let i=0; i<n; i++) descCum[i] = d[i] || 0;
  }
  if(!Number.isFinite(tk[n-1][4])) {
    const a = accumulatorAscent(elevs, 10);
    for(let i=0; i<n; i++) ascCum[i] = a[i] || 0;
  }

  const blockSize = 256;
  const blockCount = Math.ceil(n / blockSize);
  const maxBlocks = new Float64Array(blockCount);
  for(let b=0; b<blockCount; b++) {
    let maxE = -Infinity;
    const start = b * blockSize;
    const end = Math.min(n, start + blockSize);
    for(let i=start; i<end; i++) if(elevs[i] > maxE) maxE = elevs[i];
    maxBlocks[b] = maxE;
  }
  cache = { sig, distCum, ascCum, descCum, elevs, blockSize, maxBlocks };
  measureStatsCache.set(main, cache);
  return cache;
}

function measureRangeMaxElev(cache, i1, i2) {
  if(!cache) return 0;
  const { elevs, blockSize, maxBlocks } = cache;
  let maxE = -Infinity;
  let i = i1;
  while(i <= i2 && i % blockSize !== 0) {
    if(elevs[i] > maxE) maxE = elevs[i];
    i++;
  }
  while(i + blockSize - 1 <= i2) {
    const b = Math.floor(i / blockSize);
    if(maxBlocks[b] > maxE) maxE = maxBlocks[b];
    i += blockSize;
  }
  while(i <= i2) {
    if(elevs[i] > maxE) maxE = elevs[i];
    i++;
  }
  return maxE;
}

function measureRangeMinElev(cache, i1, i2) {
  if(!cache) return 0;
  const { elevs } = cache;
  let minE = Infinity;
  for(let i=i1; i<=i2; i++) {
    if(elevs[i] < minE) minE = elevs[i];
  }
  return minE;
}

function computeMeasureStatsFromCache(cache, startIdx, endIdx) {
  if(!cache || !cache.elevs || !cache.elevs.length) return null;
  const fakeTrack = { length: cache.elevs.length };
  const range = normalizeTrackIndexRange(fakeTrack, startIdx, endIdx);
  if(!range) return null;
  const { iStart, iEnd, reversed } = range;
  const distKm = Math.abs((cache.distCum[iEnd] || 0) - (cache.distCum[iStart] || 0));
  const forwardAsc = Math.max(0, (cache.ascCum[iEnd] || 0) - (cache.ascCum[iStart] || 0));
  const forwardDesc = Math.max(0, (cache.descCum[iEnd] || 0) - (cache.descCum[iStart] || 0));
  return {
    ...range,
    distKm,
    asc: Math.round(reversed ? forwardDesc : forwardAsc),
    desc: Math.round(reversed ? forwardAsc : forwardDesc),
    maxE: Math.round(measureRangeMaxElev(cache, iStart, iEnd)),
    minE: Math.round(measureRangeMinElev(cache, iStart, iEnd)),
  };
}

function computeMeasureStats(a, b) {
  const main = DATA.trails.find(t => t.id === (measureState.trailId || state.primaryTrailId));
  if(!main || !main.track || !a || !b) return null;
  const cache = getMeasureStatsCache(main);
  if(!cache) return null;
  return computeMeasureStatsFromCache(cache, a.idx, b.idx);
}


function createPrimaryTrackDragSnapper(marker, opts = {}) {
  let latestLatLng = null;
  let frameId = 0;
  let frameTask = null;
  const raf = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (cb) => setTimeout(cb, 16);
  const cancelRaf = typeof cancelAnimationFrame === 'function'
    ? cancelAnimationFrame
    : clearTimeout;

  function resolveLatLng(ll) {
    const centerIdx = typeof opts.getCenterIdx === 'function' ? opts.getCenterIdx() : null;
    return centerIdx != null
      ? nearestTrackIdxNearPrimary(ll.lat, ll.lng, centerIdx, opts.windowSize || 700)
      : nearestTrackIdxOnPrimary(ll.lat, ll.lng);
  }

  function flush() {
    frameId = 0;
    frameTask = null;
    if(!latestLatLng) return;
    const ll = latestLatLng;
    latestLatLng = null;
    const hit = resolveLatLng(ll);
    if(hit && marker && marker.setLatLng) {
      marker.setLatLng([hit.point[0], hit.point[1]]);
      if(typeof opts.onSnap === 'function') opts.onSnap(hit);
    }
  }

  return {
    schedule(ev) {
      latestLatLng = ev.target.getLatLng();
      if(frameId || frameTask) return;
      if(typeof opts.scheduleFrame === 'function') frameTask = opts.scheduleFrame(flush);
      else frameId = raf(flush);
    },
    cancel() {
      if(frameTask && typeof frameTask.cancel === 'function') frameTask.cancel();
      if(frameId) cancelRaf(frameId);
      frameTask = null;
      frameId = 0;
      latestLatLng = null;
    },
    resolve: resolveLatLng
  };
}

function handleMeasureTap(event, session) {
  if(measureState._justDragged) return;
  const latlng = event.latlng;
  const isFast = event.source === 'fast';
  if(!isFast && measureState._fastTapUntil > Date.now()) return;
  if(measureState.ptA && measureState.ptB) {
    showToast('已选 A/B 后请拖动端点调整，或点「重新选点」', 'info');
    return;
  }

  const isA = !measureState.ptA;
  const tempColor = isA ? '#22c55e' : '#ef4444';
  const tempLabel = isA ? 'A' : 'B';
  let tempMarker = null;
  if(isFast) {
    if(isA) measureState.layer.clearLayers();
    tempMarker = measureMarker(latlng.lat, latlng.lng, tempLabel, tempColor);
    tempMarker.addTo(measureState.layer);
  }

  const commitHit = hit => {
    if(!session.isCurrent()) return;
    if(!hit) {
      tempMarker?.remove();
      showToast('请点击主轨迹附近（200m 内）', 'error');
      return;
    }
    const pt = measurePointFromHit(hit);
    if(tempMarker?.setLatLng) tempMarker.setLatLng([hit.point[0], hit.point[1]]);
    if(!measureState.ptA) {
      measureController.updateEndpoint('A', pt);
      session.setPhase('select-b');
      if(!tempMarker) measureMarker(pt.lat, pt.lng, 'A', '#22c55e').addTo(measureState.layer);
      setMeasureElevHint('再点击终点。');
      return;
    }
    if(pt.idx === measureState.ptA.idx) {
      tempMarker?.remove();
      showToast('起点和终点不能是同一点', 'error');
      return;
    }
    measureController.updateEndpoint('B', pt);
    session.setPhase('ready');
    measureCompute();
  };

  if(isFast) session.frame(() => commitHit(nearestTrackIdxOnPrimary(latlng.lat, latlng.lng)));
  else commitHit(nearestTrackIdxOnPrimary(latlng.lat, latlng.lng));
}

function handleMeasureInteractionEvent(event, session) {
  if(event.type === 'tap') {
    handleMeasureTap(event, session);
    return;
  }
  if(event.type === 'drag-start') {
    measureController.beginDrag();
    session.setPhase('dragging');
    return;
  }
  if(event.type === 'drag-snap') {
    if(session.phase === 'dragging' && applyMeasureEndpointHit(event.endpoint, event.hit, true)) {
      queueMeasureLiveUpdate();
    }
    return;
  }
  if(event.type !== 'drag-end') return;
  session.setPhase('ready');
  session.delay(250, () => { measureController.endDrag(); });
  const hit = event.hit;
  if(!hit) {
    showToast('必须拖到主轨迹附近（200m 内）', 'error');
    measureCompute();
    return;
  }
  const other = event.endpoint === 'A' ? measureState.ptB : measureState.ptA;
  if(other && hit.idx === other.idx) {
    showToast('起点和终点不能是同一点', 'error');
    measureCompute();
    return;
  }
  applyMeasureEndpointHit(event.endpoint, hit, false);
  measureCompute();
}

function measureEnter() {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) {
    showToast('请先设置主轨迹', 'error');
    return;
  }
  beginRuntimeInteraction('measure', 'select-a', main, {
    onEvent: handleMeasureInteractionEvent,
    onCancel: opts => measureExit(opts),
  });
  measureController.enter(main.id);
  enterInteractionRenderMode('测距');
  clearDaySegmentPreview({silent:true});
  // v1.28.0：诊断日志（默认关闭，PERF_DEBUG=true 打开）
  if(window.PERF_DEBUG === true) {
    console.log('[measure-perf] 主轨迹点数:', main.track.length,
      '· 主轨迹 waypoint 数:', (main.waypoints || []).length,
      '· DATA.trails 数:', DATA.trails.length);
  }
  if(!measureState.layer) measureState.layer = L.layerGroup().addTo(map);
  clearMeasureLayer();
  const measurePanel = document.getElementById('measure-panel');
  measurePanel.style.display = 'block';
  if(measurePanel._applyFloatingPosition) measurePanel._applyFloatingPosition();
  resetMeasureElevReadout('在主轨迹上点击起点，再点击终点。');
  // 改鼠标样式
  map.getContainer().style.cursor = 'crosshair';
  // v1.30.0：加 measure-active 类，让 CSS 关闭所有 SVG path 的命中测试（消除 O(n) 命中检测的浏览器层瓶颈）
  map.getContainer().classList.add('measure-active');
}

function measureExit(opts = {}) {
  if(!opts.fromManager && cancelRuntimeInteraction('measure', opts.reason || 'cancelled')) return;
  measureController.exit();
  clearMeasureLayer();
  document.getElementById('measure-panel').style.display = 'none';
  hideMeasureElevReadout();
  map.getContainer().style.cursor = '';
  // v1.30.0：移除 measure-active 类，恢复 SVG path 的命中检测
  map.getContainer().classList.remove('measure-active');
  // 恢复完整主轨迹海拔图
  if(typeof refreshElevBar === 'function') refreshElevBar();
  // v1.30.0：取消自动复位到主轨迹（用户不希望测距退出后视图跳走）
}

function measureReset() {
  measureController.reset();
  setRuntimeInteractionPhase('measure', 'select-a');
  clearMeasureLayer();
  resetMeasureElevReadout('在主轨迹上点击起点，再点击终点。');
  // v1.31.0：复位时把海拔图刷回全轨模式，否则下次 measureCompute 的 refreshElevBar 会与残留状态竞态，出现"选 B 慢"
  if(typeof refreshElevBar === 'function') {
    requestAnimationFrame(() => refreshElevBar());
  }
}

function measureReverse() {
  if(!measureState.ptA || !measureState.ptB) {
    showToast('请先选择 A/B 两点', 'info');
    return;
  }
  if(!measureController.reverse()) return;
  measureCompute();
}

function measureMarker(lat, lng, label, color, opts = {}) {
  // v1.27.0：用 divIcon 替代 circleMarker+tooltip，减少 DOM 层级和 layout 触发
  const draggable = !!opts.draggable;
  const icon = L.divIcon({
    className: 'measure-marker-icon',
    html: '<div style="width:20px;height:20px;background:'+color+';border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;font-family:sans-serif;'+(draggable?'cursor:move;':'')+'">'+label+'</div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
  return L.marker([lat, lng], { icon, interactive: draggable, keyboard: false, draggable, autoPan: draggable });
}

function clearMeasureLayer() {
  if(measureState._liveFrame) {
    try {
      if(typeof measureState._liveFrame.cancel === 'function') measureState._liveFrame.cancel();
      else cancelAnimationFrame(measureState._liveFrame);
    } catch(e) {}
    measureState._liveFrame = 0;
  }
  if(measureState.layer) measureState.layer.clearLayers();
  measureState.segmentLine = null;
}

function showMeasureElevReadout() {
  const dist = document.getElementById('measure-distance');
  const hint = document.getElementById('measure-hint');
  if(dist) dist.classList.add('active');
  if(hint) hint.classList.add('active');
}

function hideMeasureElevReadout() {
  const dist = document.getElementById('measure-distance');
  const hint = document.getElementById('measure-hint');
  if(dist) dist.classList.remove('active');
  if(hint) hint.classList.remove('active');
}

function setMeasureElevHint(html) {
  const hint = document.getElementById('measure-hint');
  if(hint) hint.innerHTML = html;
  if(hint) hint.classList.toggle('active', !!html);
}

function resetMeasureElevReadout(hintText) {
  const dist = document.getElementById('measure-distance');
  const distText = document.getElementById('m-dist');
  if(dist) dist.classList.remove('active');
  if(distText) distText.textContent = '-';
  setMeasureElevHint(hintText || '在主轨迹上点击起点，再点击终点。');
}


function renderMeasureSegmentLine(maxPoints = 900) {
  if(!measureState.layer || !measureState.ptA || !measureState.ptB) return;
  const main = DATA.trails.find(t => t.id === (measureState.trailId || state.primaryTrailId));
  if(!main || !main.track) return;
  const model = buildMeasureSegmentRenderModel(main.track, measureState.ptA, measureState.ptB, maxPoints);
  if(!model) return;
  measureState.segmentLine = HTM_APP.upsertLeafletPolyline(
    L,
    measureState.layer,
    measureState.segmentLine,
    model,
  );
}

function updateMeasureReadout(loading = false) {
  const a = measureState.ptA, b = measureState.ptB;
  if(!a || !b) return;
  const dist_el = document.getElementById('m-dist');
  const ascEl = document.getElementById('elev-stat-asc');
  const descEl = document.getElementById('elev-stat-desc');
  showMeasureElevReadout();
  if(loading) {
    if(dist_el) dist_el.textContent = '⋯';
    if(ascEl) ascEl.textContent = '↑⋯';
    if(descEl) descEl.textContent = '↓⋯';
    return;
  }
  const stats = computeMeasureStats(a, b);
  if(!stats) return;
  if(dist_el) dist_el.textContent = stats.distKm.toFixed(2) + ' km';
  if(ascEl) ascEl.textContent = '↑' + stats.asc + 'm';
  if(descEl) descEl.textContent = '↓' + stats.desc + 'm';
}

function queueMeasureLiveUpdate() {
  if(measureState._liveFrame) return;
  const session = interactionManager.current.kind === 'measure' ? interactionManager.current : null;
  const task = session?.frame(() => {
    measureState._liveFrame = 0;
    renderMeasureSegmentLine(700);
    updateMeasureReadout(false);
  });
  measureState._liveFrame = task || 0;
}


function applyMeasureEndpointHit(label, hit, live = false) {
  if(!hit) return false;
  const pt = measurePointFromHit(hit);
  const changed = measureController.updateEndpoint(label, pt);
  if(!changed) return false;
  setMeasureElevHint('');
  return true;
}

function bindMeasureEndpointDrag(marker, label) {
  const snapper = createPrimaryTrackDragSnapper(marker, {
    scheduleFrame: callback => scheduleRuntimeInteractionFrame('measure', callback),
    getCenterIdx: () => {
      const pt = label === 'A' ? measureState.ptA : measureState.ptB;
      return pt ? pt.idx : null;
    },
    onSnap: hit => {
      dispatchRuntimeInteraction('measure', {type:'drag-snap', endpoint:label, hit});
    },
  });
  marker.on('dragstart', () => {
    dispatchRuntimeInteraction('measure', {type:'drag-start', endpoint:label});
  });
  marker.on('drag', ev => snapper.schedule(ev));
  marker.on('dragend', ev => {
    const ll = ev.target.getLatLng();
    const hit = snapper.resolve(ll);
    snapper.cancel();
    dispatchRuntimeInteraction('measure', {type:'drag-end', endpoint:label, hit});
  });
}

function addMeasureEndpointMarker(pt, label, color) {
  const marker = measureMarker(pt.lat, pt.lng, label, color, { draggable: true }).addTo(measureState.layer);
  bindMeasureEndpointDrag(marker, label);
  return marker;
}

/* @runtime-fragment measure.compute */
function measureCompute() {
  if(!measureState.ptA || !measureState.ptB) return;
  const seq = measureController.nextComputeSequence();
  const a = measureState.ptA, b = measureState.ptB;

  // 视觉反馈立即执行：先落 A/B marker，再把长线段绘制放到下一帧，避免拖动松手时卡住点位刷新。
  clearMeasureLayer();
  addMeasureEndpointMarker(a, 'A', '#22c55e');
  addMeasureEndpointMarker(b, 'B', '#ef4444');

  // 立即先显示计算中的数值状态，端点海拔由海拔图标注呈现。
  updateMeasureReadout(true);
  setMeasureElevHint('');

  // ── 计算重活放到下一帧，不阻塞点击 ──
  scheduleRuntimeInteractionFrame('measure', () => {
    if(!measureController.isComputeCurrent(seq)) return;
    renderMeasureSegmentLine(1200);
    if(!measureController.isComputeCurrent(seq)) return;
    updateMeasureReadout(false);

    // v1.30.0：取消 AB 计算完成后的自动 fitBounds（用户不希望测距时视图跳转）

    // 海拔图重绘放到再下一帧，让上面的数字先渲染
    if(typeof refreshElevBar === 'function') {
      scheduleRuntimeInteractionFrame('measure', () => {
        if(measureController.isComputeCurrent(seq)) refreshElevBar();
      });
    }
  });
}

/* @runtime-fragment measure.controls */
const measureCloseBtn = document.getElementById('measure-close');
if(measureCloseBtn) measureCloseBtn.addEventListener('click', measureExit);
const measureExitBtn = document.getElementById('measure-exit');
if(measureExitBtn) measureExitBtn.addEventListener('click', measureExit);
const measureResetBtn = document.getElementById('measure-reset');
if(measureResetBtn) measureResetBtn.addEventListener('click', measureReset);
const measureReverseBtn = document.getElementById('measure-reverse');
if(measureReverseBtn) measureReverseBtn.addEventListener('click', measureReverse);
