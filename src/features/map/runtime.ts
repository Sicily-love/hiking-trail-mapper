// @ts-nocheck
// Transitional classic fragments owned by track and Leaflet rendering.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment map.tracks */
/* ============ Computed: all elev range ============ */
let minE = 0, maxE = 5000;
function recomputeElevRange() {
  let nextMin = Infinity;
  let nextMax = -Infinity;
  DATA.trails.forEach(t => {
    if(state.activeTrails && !isTrailActive(t)) return;
    t.track.forEach(p => {
      const elevation = Number(p[2]);
      if(!Number.isFinite(elevation)) return;
      if(elevation < nextMin) nextMin = elevation;
      if(elevation > nextMax) nextMax = elevation;
    });
  });
  if(nextMin !== Infinity) {
    minE = nextMin;
    maxE = nextMax;
  } else {
    minE = 0; maxE = 5000;
  }
}

/* ============ Color helpers ============ */
// 天数分色：柔和但有区分度，适合卫星图与米色面板上的连续天数阅读
const dayPalette = ['#2F6B5F','#D96C4A','#E1A93B','#5577B8','#8A6BBE','#C45D83','#5E9F65','#C58B54'];

function elevColor(e) {
  const t = Math.max(0, Math.min(1, (e - minE) / (maxE - minE || 1)));
  // 6-stop gradient
  const stops = [
    [0.00, [59,130,246]],   // blue
    [0.20, [6,182,212]],    // cyan
    [0.40, [132,204,22]],   // lime
    [0.60, [250,204,21]],   // yellow
    [0.80, [249,115,22]],   // orange
    [1.00, [239,68,68]],    // red
  ];
  for(let i=0;i<stops.length-1;i++){
    if(t>=stops[i][0] && t<=stops[i+1][0]){
      const r=(t-stops[i][0])/(stops[i+1][0]-stops[i][0]);
      const c1=stops[i][1], c2=stops[i+1][1];
      return `rgb(${Math.round(c1[0]+(c2[0]-c1[0])*r)},${Math.round(c1[1]+(c2[1]-c1[1])*r)},${Math.round(c1[2]+(c2[2]-c1[2])*r)})`;
    }
  }
  return 'rgb(239,68,68)';
}

/* ============ Draw Track ============ */
function renderTracksNow() {
  trackLayer.clearLayers();
  networkLayer.clearLayers();
  if(!state.showTrack) return;
  recomputeElevRange();
  renderRuntimeStats.elevationBands = 0;

  const isWaypointMode = state.mode === 'waypoint';

  // 按trail绘制：先非主，后主（主轨迹在上层）
  const ordered = [
    ...DATA.trails.filter(t => t.id !== state.primaryTrailId),
    ...DATA.trails.filter(t => t.id === state.primaryTrailId)
  ];

  ordered.forEach(trail => {
    if(!isTrailActive(trail)) return;
    const track = trail.track;
    if(track.length < 2) return;
    const isMain = (trail.id === state.primaryTrailId);

    // 标注点对比模式：非主轨迹画浅色虚线
    if(isWaypointMode && !isMain) {
      const latlngs = track.map(p => [p[0], p[1]]);
      const line = L.polyline(latlngs, {
        color: trail.color || '#888',
        weight: 1.8,
        opacity: 0.45,
        dashArray: '4,6',
      });
      line.bindTooltip(trail.name, {sticky: true});
      line.on('click', () => {
        if(measureState.active) return;  // 测距模式下不切换主轨迹
        if(typeof segmentState !== 'undefined' && segmentState.active) return; // 分段模式下不切换
        dispatchState({type:'primary-trail.set', trailId:trail.id});
        rebuildAll({fit: false});
        saveToStorage();
      });
      line.addTo(trackLayer);
      return;
    }

    const baseOpacity = isMain ? 0.95 : 0.4;
    const baseWeight = isMain ? 4.5 : 2.5;
    const opacity = state.activeEscape ? baseOpacity * 0.35 : baseOpacity;
    const weight = state.activeEscape ? Math.max(1, baseWeight - 1.5) : baseWeight;

    // 标注点对比模式下的主轨迹：强制走海拔渐变
    const renderMode = (isWaypointMode && isMain) ? 'elev' : state.mode;

    if(renderMode === 'day' && !isMain) {
      // 非主轨迹：单 polyline 一种颜色，性能最好
      const latlngs = track.map(p => [p[0], p[1]]);
      const line = L.polyline(latlngs, {
        color: trail.color, weight, opacity, smoothFactor: 1, lineCap:'round',
      });
      line.__trail = trail;
      // v1.29.0：mousemove 用 rAF 节流；测距/分段模式下完全禁用（避免 pointer 事件阻塞）
      let _rafId = null;
      line.on('mouseover mousemove', e => {
        if(measureState.active || (typeof segmentState !== 'undefined' && segmentState.active)) return;
        if(_rafId) return;
        _rafId = requestAnimationFrame(() => {
          _rafId = null;
          const ll = e.latlng;
          const i = nearestTrackIdx(track, ll.lat, ll.lng);
          showTooltip(e, track[i], track[Math.min(i+1, track.length-1)], trail);
        });
      });
      line.on('mouseout', () => {
        if(_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
        hideTooltip();
      });
      trackLayer.addLayer(line);
      return;
    }

    // 主轨迹（按天分色）或海拔渐变模式：按颜色分组成多个 polyline
    // 主轨迹海拔渐变 / 天数模式下加 Bloom 外发光（保持杂志风的暖色辉光）
    const isElevMain = isMain && renderMode === 'elev';
    const isDayMain = isMain && renderMode === 'day';
    if((isElevMain || isDayMain) && !state.activeEscape) {
      const allLatLngs = track.map(p => [p[0], p[1]]);
      // 暖色辉光：白光 + 米黄
      const bloomOuter = L.polyline(allLatLngs, {
        color: '#ffffff', weight: weight + 5, opacity: 0.32,
        smoothFactor: 1, lineCap:'round', lineJoin:'round', interactive: false,
      });
      const bloomInner = L.polyline(allLatLngs, {
        color: '#FAF6EA', weight: weight + 2.5, opacity: 0.42,
        smoothFactor: 1, lineCap:'round', lineJoin:'round', interactive: false,
      });
      trackLayer.addLayer(bloomOuter);
      trackLayer.addLayer(bloomInner);
    }

    if(renderMode === 'elev') {
      const groups = buildElevationPolylineSegments(track, {
        bandCount:40,
        minElevation:minE,
        maxElevation:maxE,
      });
      renderRuntimeStats.elevationBands += groups.length;
      groups.forEach(group => {
        const line = L.polyline(group.paths.map(path => path.latLngs), {
          color:elevColor(minE + group.ratio * (maxE - minE)),
          weight,
          opacity,
          smoothFactor:1,
          lineCap:'round',
        });
        line.__trail = trail;
        let _rafId = null;
        line.on('mouseover mousemove', e => {
          if(measureState.active || (typeof segmentState !== 'undefined' && segmentState.active)) return;
          if(_rafId) return;
          _rafId = requestAnimationFrame(() => {
            _rafId = null;
            const ll = e.latlng;
            const i = nearestTrackIdx(track, ll.lat, ll.lng);
            showTooltip(e, track[i], track[Math.min(i+1, track.length-1)], trail);
          });
        });
        line.on('mouseout', () => {
          if(_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
          hideTooltip();
        });
        trackLayer.addLayer(line);
      });
      return;
    }

    let curColor = null, curPath = [];
    const flush = () => {
      if(curPath.length < 2) return;
      const line = L.polyline(curPath, {
        color: curColor, weight, opacity, smoothFactor: 1, lineCap:'round',
      });
      line.__trail = trail;
      // v1.29.0：mousemove 用 rAF 节流；测距/分段模式下完全禁用（避免 pointer 事件阻塞）
      let _rafId = null;
      line.on('mouseover mousemove', e => {
        if(measureState.active || (typeof segmentState !== 'undefined' && segmentState.active)) return;
        if(_rafId) return;
        _rafId = requestAnimationFrame(() => {
          _rafId = null;
          const ll = e.latlng;
          const i = nearestTrackIdx(track, ll.lat, ll.lng);
          showTooltip(e, track[i], track[Math.min(i+1, track.length-1)], trail);
        });
      });
      line.on('mouseout', () => {
        if(_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
        hideTooltip();
      });
      trackLayer.addLayer(line);
    };
    for(let i=0; i<track.length; i++) {
      const a = track[i];
      const b = track[Math.min(i+1, track.length-1)];
      let color;
      if(renderMode === 'day') {
        color = dayPalette[(a[5]-1) % dayPalette.length];
      } else {
        color = elevColor((a[2]+b[2])/2);
      }
      if(color !== curColor) {
        flush();
        curColor = color;
        curPath = i > 0 ? [[track[i-1][0], track[i-1][1]], [a[0], a[1]]] : [[a[0], a[1]]];
      } else {
        curPath.push([a[0], a[1]]);
      }
    }
    flush();
  });
}

function drawTracks() {
  invalidateRender(HTM_APP.RENDER_DIRTY.TRACKS);
}

// 用于鼠标悬停时找最近轨迹点
function nearestTrackIdx(track, lat, lng) {
  let best = 0, bestD = Infinity;
  for(let i=0; i<track.length; i+=Math.max(1, Math.floor(track.length/200))) {
    const dx = track[i][0] - lat, dy = track[i][1] - lng;
    const d = dx*dx + dy*dy;
    if(d < bestD) { bestD = d; best = i; }
  }
  // 在最佳点附近精修
  const lo = Math.max(0, best - 20), hi = Math.min(track.length, best + 20);
  for(let i=lo; i<hi; i++) {
    const dx = track[i][0] - lat, dy = track[i][1] - lng;
    const d = dx*dx + dy*dy;
    if(d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/* @runtime-fragment map.bootstrap */
/* ============ Map ============ */
const map = L.map('map', {
  center: [29.74, 99.65], zoom: 11,
  zoomControl: true, attributionControl: true,
  dragging: true, tap: false, touchZoom: true,  // v1.27.0：关闭 L.Tap 消除触屏 tap 延迟
  // v1.31.7：+/- 按钮步进调大，滚轮仍保持半级吸附
  zoomSnap: 0.5,             // 缩放对齐到 0.5 级
  zoomDelta: 1,              // +/- 按钮和键盘每次变化 1 级（更快放大/缩小）
  wheelPxPerZoomLevel: 120,  // 滚轮每 120px 触发 1 级缩放，比默认 60 更平滑
  wheelDebounceTime: 40,     // 滚轮防抖（默认 40，保留）
  // v1.25.0：关闭双击缩放，消除 Leaflet 内部 200ms click 延迟
  doubleClickZoom: false,
});
// 把版本号塞进 Leaflet attribution prefix，与 Leaflet/Esri 同一行同一基线
// 版本号独立浮层（独立背景框 + 与 Leaflet attribution 完全同款样式）
map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank">Leaflet</a>');
(function(){
  const tag = document.createElement('div');
  // 关键：套上 leaflet-control-attribution 类，自动继承同款 background/font-size/padding/line-height
  tag.className = 'leaflet-control-attribution';
  tag.id = 'version-tag-float';
  tag.innerHTML = '<a href="javascript:void(0)" id="version-tag-link" title="点击查看更新日志">v1.32.2</a>';
  // 仅覆盖定位相关；样式继承自 .leaflet-control-attribution
  tag.style.position = 'absolute';
  tag.style.zIndex = '600';
  tag.style.pointerEvents = 'auto';
  setTimeout(() => {
    const map_el = document.getElementById('map');
    if(!map_el) return;
    map_el.appendChild(tag);
    const reposition = () => {
      const attr = map_el.querySelector('.leaflet-control-attribution:not(#version-tag-float)');
      if(!attr) return;
      const mapRect = map_el.getBoundingClientRect();
      const attrRect = attr.getBoundingClientRect();
      const attrRightOffset = mapRect.right - attrRect.left;
      tag.style.right = (attrRightOffset + 6) + 'px';  // 与 attribution 间隔 6px
      tag.style.bottom = (mapRect.bottom - attrRect.bottom) + 'px';
    };
    reposition();
    setTimeout(reposition, 200);
    setTimeout(reposition, 600);
    const attr = map_el.querySelector('.leaflet-control-attribution:not(#version-tag-float)');
    if(attr) new MutationObserver(reposition).observe(attr, {childList:true, subtree:true, characterData:true});
    window.addEventListener('resize', reposition);
    document.getElementById('version-tag-link').addEventListener('click', e => {
      e.preventDefault(); showChangelog();
    });
  }, 100);
})();
// v1.14.1：撤销 v1.13.3 的 ctrl/meta+wheel 放行
//   原因：trackpad pinch-zoom 被浏览器映射成 ctrl+wheel；放行后双指捏合在地图上触发的是
//   浏览器整页缩放而不是地图缩放，反而把"地图缩放"功能搞坏了。
//   用户要做浏览器整页缩放可以用 Cmd/Ctrl +/-/0 快捷键或菜单，不必从地图区域捕捉。
const _toolbarEl = document.getElementById('map-toolbar');
if(_toolbarEl) {
  L.DomEvent.disableClickPropagation(_toolbarEl);
  L.DomEvent.disableScrollPropagation(_toolbarEl);
  // 进一步：每个按钮再单独阻止 dblclick（双击放大 = map 的 doubleClickZoom）
  _toolbarEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('dblclick', e => { e.preventDefault(); e.stopPropagation(); });
  });
}
// 同时给 mini card 也加一层防护
const _miniEl = document.getElementById('primary-mini');
if(_miniEl) {
  L.DomEvent.disableClickPropagation(_miniEl);
  L.DomEvent.disableScrollPropagation(_miniEl);
}

const baseLayers = {
  sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {attribution:'© Esri', maxZoom:18}),
};
let currentBase = baseLayers.sat.addTo(map);

/* ============ Layer groups ============ */
const trackLayer = L.layerGroup().addTo(map);
const wpLayer = L.layerGroup().addTo(map);
const highPointLayer = L.layerGroup().addTo(map);
const escapeLayer = L.layerGroup().addTo(map);
const networkLayer = L.layerGroup().addTo(map);

/* @runtime-fragment map.input */
// v1.26.0：测距/分段模式改用原生 pointerdown/pointerup 快速触发（绕过 Leaflet click 内部延迟）
// 判断"不是拖拽" = down 到 up 位置差 < 6px 且时间 < 400ms
(function() {
  const container = map.getContainer();
  let pd = null; // {x, y, t}
  function isFastTap(x, y, t) {
    if(!pd) return false;
    const dx = x - pd.x, dy = y - pd.y;
    // v1.27.0：放宽阈值（10px 位移 + 800ms 时间），覆盖 trackpad 慢速点击
    return (dx*dx + dy*dy) < 100 && (t - pd.t) < 800;
  }
  function onDown(x, y, target) {
    // 只有测距/分段模式激活时才捕获
    if(!['measure', 'segment'].includes(interactionManager.current.kind)) { pd = null; return; }
    // 别拦截控件/UI 上的点击
    if(target && (target.closest('.leaflet-marker-icon') || target.closest('.leaflet-control') ||
                   target.closest('#segment-panel') || target.closest('#measure-panel') ||
                   target.closest('#map-toolbar') || target.closest('#sidebar'))) {
      pd = null; return;
    }
    pd = { x, y, t: (typeof performance !== 'undefined' ? performance.now() : Date.now()) };
  }
  function onUp(x, y, target) {
    if(!pd) return;
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if(!isFastTap(x, y, t)) { pd = null; return; }
    // 别拦截控件/marker 上的点击
    if(target && (target.closest('.leaflet-marker-icon') || target.closest('.leaflet-control'))) {
      pd = null; return;
    }
    // 转换 x,y → latlng（相对 container 的位置）
    const rect = container.getBoundingClientRect();
    const latlng = map.containerPointToLatLng([x - rect.left, y - rect.top]);
    // 派发到 measure/segment 处理逻辑，先阻止 Leaflet 的默认 click（避免重复）
    handleFastTap(latlng);
    pd = null;
  }
  function handleFastTap(latlng) {
    const kind = interactionManager.current.kind;
    if(kind !== 'measure' && kind !== 'segment') return;
    if(!dispatchRuntimeInteraction(kind, {type:'tap', source:'fast', latlng})) return;
    const until = Date.now() + 350;
    if(kind === 'measure') measureController.suppressFastTap(until);
    else segmentState._fastTapUntil = until;
  }
  // 优先使用 pointer 事件（覆盖鼠标 + 触屏 + 触控笔）
  if(window.PointerEvent) {
    container.addEventListener('pointerdown', e => {
      if(e.pointerType !== 'mouse' && e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      onDown(e.clientX, e.clientY, e.target);
    }, {capture: true, passive: true});
    container.addEventListener('pointerup', e => {
      onUp(e.clientX, e.clientY, e.target);
    }, {capture: true, passive: true});
    container.addEventListener('pointercancel', () => { pd = null; }, {capture: true, passive: true});
  } else {
    container.addEventListener('mousedown', e => onDown(e.clientX, e.clientY, e.target), {capture: true});
    container.addEventListener('mouseup', e => onUp(e.clientX, e.clientY, e.target), {capture: true});
    container.addEventListener('touchstart', e => {
      if(e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }, {capture: true, passive: true});
    container.addEventListener('touchend', e => {
      if(e.changedTouches.length === 1) onUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY, e.target);
    }, {capture: true, passive: true});
  }
})();

// 监听地图点击：测距模式下选点（fallback：如果 fast-tap 没触发，click 兜底）
map.on('click', e => {
  const kind = interactionManager.current.kind;
  if(!['measure', 'segment', 'waypoint', 'escape'].includes(kind)) return;
  dispatchRuntimeInteraction(kind, {type:'tap', source:'leaflet', latlng:e.latlng});
});

/* @runtime-fragment map.fit */
function resetView(opts = {}) {
  const resetEpoch = ++workspaceResetEpoch;
  renderRuntimeStats.fit.lastResetEpoch = resetEpoch;
  if(map && typeof map.stop === 'function') map.stop();
  if(opts.restoreActive && (!state.activeTrails || state.activeTrails.size === 0)) {
    dispatchState({type:'active-trails.replace', trailIds:DATA.trails.map(t => t.id)});
  }
  // 兜底主轨迹（当前组内）
  if(state.activeGroup != null && !state.primaryTrailId && DATA.trails.length) {
    const inGroup = DATA.trails.filter(t => trailGroup(t) === state.activeGroup);
    dispatchState({type:'primary-trail.set', trailId:(inGroup[0] || DATA.trails[0]).id});
  }
  invalidateRender(
    HTM_APP.RENDER_DIRTY.TRACKS
    | HTM_APP.RENDER_DIRTY.MARKERS
    | HTM_APP.RENDER_DIRTY.SIDEBAR
    | HTM_APP.RENDER_DIRTY.LEGEND
    | HTM_APP.RENDER_DIRTY.CHART,
  );

  // v1.24.0：测距模式下，若已选中段（A+B），复位到该段
  if(typeof measureState !== 'undefined' && measureState.active && measureState.ptA && measureState.ptB) {
    const main = DATA.trails.find(t => t.id === state.primaryTrailId);
    if(main && main.track) {
      const i1 = Math.min(measureState.ptA.idx, measureState.ptB.idx);
      const i2 = Math.max(measureState.ptA.idx, measureState.ptB.idx);
      const segLL = buildTrackLatLngs(main.track, i1, i2, 1600);
      if(segLL.length >= 2) {
        if(typeof measureCompute === 'function') measureCompute();
        const fitPromise = fitWorkspaceBounds(
          L.latLngBounds(segLL),
          {padding:[60,60]},
          {source:'reset-measure', resetEpoch},
        );
        saveToStorage();
        return fitPromise;
      }
    }
  }

  // 计算 fit 目标：优先主轨迹，其次当前组所有 active 轨迹
  const main = state.activeGroup == null ? null : DATA.trails.find(t => t.id === state.primaryTrailId);
  if(main && main.track && main.track.length) {
    const latlngs = main.track.map(p => [p[0], p[1]]);
    const fitPromise = fitWorkspaceBounds(
      L.latLngBounds(latlngs),
      {padding:[40,40]},
      {source:'reset-primary', resetEpoch},
    );
    saveToStorage();
    return fitPromise;
  } else {
    const allLatLngs = [];
    DATA.trails.forEach(t => {
      if(isTrailActive(t)) t.track.forEach(p => allLatLngs.push([p[0], p[1]]));
    });
    if(allLatLngs.length) {
      const fitPromise = fitWorkspaceBounds(
        L.latLngBounds(allLatLngs),
        {padding:[40,40]},
        {source:'reset-active', resetEpoch},
      );
      saveToStorage();
      return fitPromise;
    }
  }
  saveToStorage();
  return Promise.resolve(false);
}

function finishWorkspaceFit(epoch, applied) {
  if(!pendingWorkspaceFit || pendingWorkspaceFit.epoch !== epoch) return;
  const pending = pendingWorkspaceFit;
  pendingWorkspaceFit = null;
  if(applied) renderRuntimeStats.fit.applied += 1;
  pending.resolve(applied);
}

function executeWorkspaceFit(context) {
  const request = context.request;
  if(!request) return;
  const isCurrent = () => context.isCurrent()
    && (request.resetEpoch == null || request.resetEpoch === workspaceResetEpoch);
  if(!isCurrent()) {
    finishWorkspaceFit(context.epoch, false);
    return;
  }
  const applyFit = () => {
    map.invalidateSize({pan:false});
    map.fitBounds(request.bounds, request.options);
  };
  applyFit();
  if(!request.closeOverlay) {
    finishWorkspaceFit(context.epoch, true);
    return;
  }
  setTimeout(() => {
    if(!isCurrent()) {
      finishWorkspaceFit(context.epoch, false);
      return;
    }
    applyFit();
    finishWorkspaceFit(context.epoch, true);
  }, 260);
}

function fitWorkspaceBounds(bounds, options = {}, meta = {}) {
  if(!bounds || !map) return Promise.resolve(false);
  const sidebar = document.getElementById('sidebar');
  const sidebarCollapsed = !sidebar || sidebar.classList.contains('collapsed');
  const closeOverlay = HTM_APP.shouldCloseSidebarForFit(window.innerWidth, sidebarCollapsed);
  if(closeOverlay && typeof toggleSidebar === 'function') toggleSidebar(false);

  if(pendingWorkspaceFit) {
    renderRuntimeStats.fit.superseded += 1;
    pendingWorkspaceFit.resolve(false);
    pendingWorkspaceFit = null;
  }
  let resolveFit;
  const promise = new Promise(resolve => { resolveFit = resolve; });
  const epoch = renderScheduler.requestFit({
    bounds,
    options,
    closeOverlay,
    resetEpoch:meta.resetEpoch ?? null,
    source:meta.source || 'workspace',
  });
  if(epoch == null) {
    resolveFit(false);
    return promise;
  }
  pendingWorkspaceFit = {epoch, resolve:resolveFit};
  renderRuntimeStats.fit.requested += 1;
  renderRuntimeStats.fit.lastEpoch = epoch;
  return promise;
}

// Sidebar collapse
