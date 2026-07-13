// @ts-nocheck
// Transitional classic fragments owned by elevation Canvas rendering.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment elevation.canvas */
/* ============ 底部海拔剖面图 ============ */
const elevCanvas = document.getElementById('elev-canvas');
const elevCtx = elevCanvas ? elevCanvas.getContext('2d') : null;
const elevCrosshair = document.getElementById('elev-crosshair');
const elevTip = document.getElementById('elev-tip');
const elevLabel = document.getElementById('elev-label');

// 当前绘制数据缓存
let _elevBarData = null;
const elevationCanvasRenderer = elevCtx ? HTM_APP.createElevationCanvasRenderer(elevCtx) : null;

/** 更新顶部爬升/下降 badge */
function updateElevBadges(badges) {
  const ascEl = document.getElementById('elev-stat-asc');
  const descEl = document.getElementById('elev-stat-desc');
  if(ascEl) ascEl.textContent = badges.ascentText;
  if(descEl) descEl.textContent = badges.descentText;
}

function drawElevBar(pts, color, label, opts) {
  if(!elevCanvas || !elevationCanvasRenderer || !pts || pts.length < 2) return;
  opts = opts || {};
  const dimensions = {
    width:elevCanvas.offsetWidth || 340,
    height:elevCanvas.offsetHeight || 140,
    dpr:window.devicePixelRatio || 1,
  };
  const scene = HTM_APP.buildElevationCanvasScene(pts, {
    ...opts, width:dimensions.width, height:dimensions.height,
    axisLabel:t('elev.km'), campLabel:t('elev.anno.camp'),
    measureText:elevationCanvasRenderer.measureText,
  });
  _elevBarData = {
    pts, minE:scene.layout.minE, maxE:scene.layout.maxE, color:color || '#3F5238',
    km:scene.layout.km, PL:scene.layout.PL, PR:scene.layout.PR, pw:scene.layout.pw,
  };
  if(elevLabel) elevLabel.textContent = label || t('elev.title');
  updateElevBadges(scene.chart.badges);
  renderRuntimeStats.elevation = {sourcePoints:scene.sourcePoints, renderedPoints:scene.renderedPoints};
  drawElevBar._overflowRequest = scene.overflow;
  elevationCanvasRenderer.render(scene, dimensions);
}

function renderElevationChartNow() {
  if(!elevCanvas) return;
  // v1.20.0：无选中分组时不绘制
  const main = state.activeGroup == null ? null : DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) {
    if(elevationCanvasRenderer) elevationCanvasRenderer.clear({
      width:elevCanvas.offsetWidth || 340,
      height:elevCanvas.offsetHeight || 140,
      dpr:window.devicePixelRatio || 1,
    });
    _elevBarData = null;
    renderRuntimeStats.elevation = {sourcePoints:0, renderedPoints:0};
    return;
  }

  const bar = document.getElementById('elev-bar');

  function doDraw() {
    if(measureState.active && measureState.ptA && measureState.ptB) {
      const i1 = Math.min(measureState.ptA.idx, measureState.ptB.idx);
      const i2 = Math.max(measureState.ptA.idx, measureState.ptB.idx);
      const reversed = measureState.ptA.idx > measureState.ptB.idx;
      let segPts = main.track.slice(i1, i2 + 1);
      if(reversed) segPts = segPts.slice().reverse();
      drawElevBar(segPts, '#3F5238', t('elev.measure'), {
        kmFromZero: true,
        waypoints: main.waypoints,
        segIdxStart: i1, segIdxEnd: i2, reversed,
        measureMode: true,
      });
    } else if(dayPreviewState.active && dayPreviewState.trailId === main.id && dayPreviewState.iStart != null && dayPreviewState.iEnd != null) {
      const i1 = Math.min(dayPreviewState.iStart, dayPreviewState.iEnd);
      const i2 = Math.max(dayPreviewState.iStart, dayPreviewState.iEnd);
      const segPts = main.track.slice(i1, i2 + 1);
      drawElevBar(segPts, '#fbbf24', `D${dayPreviewState.day} · ${t('elev.measure')}`, {
        kmFromZero: true,
        waypoints: main.waypoints,
        segIdxStart: i1, segIdxEnd: i2, reversed: false,
        measureMode: true,
      });
    } else {
      drawElevBar(main.track, main.color, (main.name || t('mini.primary')) + ' · ' + t('elev.title'), {
        waypoints: main.waypoints,
        segIdxStart: 0, segIdxEnd: main.track.length - 1, reversed: false,
      });
    }
  }

  function currentElevStackContext() {
    let segPts = main.track;
    const layoutOpts = { width: elevCanvas.offsetWidth || 340, height: 140 };
    const annoOpts = {
      waypoints: main.waypoints,
      segIdxStart: 0,
      segIdxEnd: main.track.length - 1,
      reversed: false,
      measureMode: false,
    };
    if(measureState.active && measureState.ptA && measureState.ptB) {
      const i1 = Math.min(measureState.ptA.idx, measureState.ptB.idx);
      const i2 = Math.max(measureState.ptA.idx, measureState.ptB.idx);
      const reversed = measureState.ptA.idx > measureState.ptB.idx;
      segPts = main.track.slice(i1, i2 + 1);
      if(reversed) segPts = segPts.slice().reverse();
      layoutOpts.kmFromZero = true;
      layoutOpts.measureMode = true;
      Object.assign(annoOpts, { segIdxStart: i1, segIdxEnd: i2, reversed, measureMode: true });
    } else if(dayPreviewState.active && dayPreviewState.trailId === main.id && dayPreviewState.iStart != null && dayPreviewState.iEnd != null) {
      const i1 = Math.min(dayPreviewState.iStart, dayPreviewState.iEnd);
      const i2 = Math.max(dayPreviewState.iStart, dayPreviewState.iEnd);
      segPts = main.track.slice(i1, i2 + 1);
      layoutOpts.kmFromZero = true;
      layoutOpts.measureMode = true;
      Object.assign(annoOpts, { segIdxStart: i1, segIdxEnd: i2, reversed: false, measureMode: true });
    }
    return { segPts, layoutOpts, annoOpts };
  }

  // 计算目标高度：基础画布需求 + 堆叠层数 × (字高 + 间隔)
  const stackContext = currentElevStackContext();
  const targetH = HTM_APP.estimateElevationPanelHeightForPoints(stackContext.segPts, {
    ...stackContext.layoutOpts,
    ...stackContext.annoOpts,
    width:elevCanvas.offsetWidth || 340,
    campLabel:t('elev.anno.camp'),
    measureText:elevationCanvasRenderer ? elevationCanvasRenderer.measureText : undefined,
  });

  if(bar) {
    const cur = bar.offsetHeight;
    if(Math.abs(cur - targetH) > 2) {
      bar.style.height = targetH + 'px';
      void bar.offsetHeight; // 强制同步 reflow
    }
  }
  doDraw();
}

function refreshElevBar() {
  invalidateRender(HTM_APP.RENDER_DIRTY.CHART);
}

// hover：在海拔图上移动鼠标显示十字准线和数值
if(elevCanvas) {
  elevCanvas.style.pointerEvents = 'auto';

  // 共用：根据鼠标 X 找到对应 track 点
  function elevHitTest(e) {
    if(!_elevBarData) return null;
    const rect = elevCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const PL = _elevBarData.PL != null ? _elevBarData.PL : 44;
    const PR = _elevBarData.PR != null ? _elevBarData.PR : 16;
    const pw = rect.width - PL - PR;
    if(mx < PL || mx > PL + pw) return null;
    const ratio = (mx - PL) / pw;
    const km = _elevBarData.km || [];
    const pts = _elevBarData.pts;
    if(!km.length || !pts.length) return null;
    // X 是按 km 等距映射，不是按 idx —— 二分定位 idx
    const kmStart = km[0], kmEnd = km[km.length - 1];
    const targetKm = kmStart + (kmEnd - kmStart) * ratio;
    let lo = 0, hi = km.length - 1;
    while(lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if(km[mid] < targetKm) lo = mid; else hi = mid;
    }
    const idx = (Math.abs(km[lo] - targetKm) < Math.abs(km[hi] - targetKm)) ? lo : hi;
    return { idx, pt: pts[idx], mx };
  }

  elevCanvas.addEventListener('mousemove', e => {
    const hit = elevHitTest(e);
    if(!hit) { elevCrosshair.style.display = 'none'; elevTip.style.display = 'none'; return; }
    const { pt, mx } = hit;
    elevCrosshair.style.display = 'block';
    elevCrosshair.style.left = mx + 'px';
    elevTip.style.display = 'block';
    const rect = elevCanvas.getBoundingClientRect();
    elevTip.style.left = Math.min(mx + 8, rect.width - 140) + 'px';
    elevTip.innerHTML = `<b>${pt[3] !== undefined ? pt[3] + 'km' : ''}</b> · ${pt[2]}m · ↑<b>${pt[4]}m</b>`;
  });

  elevCanvas.addEventListener('mouseleave', () => {
    elevCrosshair.style.display = 'none';
    elevTip.style.display = 'none';
  });

  // 点击：无论是否测距模式，海拔图内点击 → 地图定位
  let _elevClickMarker = null;
  elevCanvas.addEventListener('click', e => {
    const hit = elevHitTest(e);
    if(!hit) return;
    const { pt } = hit;
    if(!pt || pt[0] == null) return;

    // 移除旧标记
    if(_elevClickMarker) { _elevClickMarker.remove(); _elevClickMarker = null; }

    const latlng = [pt[0], pt[1]];
    const color = (_elevBarData && _elevBarData.color) || '#fbbf24';
    _elevClickMarker = L.circleMarker(latlng, {
      radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1,
      pane: 'tooltipPane'
    }).addTo(map);
    const tipTxt = `${pt[3] !== undefined ? pt[3] + 'km · ' : ''}${Math.round(pt[2])}m`;
    _elevClickMarker.bindTooltip(tipTxt, { permanent: true, direction: 'top', offset: [0,-8], className: 'measure-tip' }).openTooltip();
    map.panTo(latlng, { animate: true, duration: 0.4 });

    clearTimeout(_elevClickMarker._autoRemove);
    _elevClickMarker._autoRemove = setTimeout(() => {
      if(_elevClickMarker) { _elevClickMarker.remove(); _elevClickMarker = null; }
    }, 3000);
  });
}

// window resize 时重绘
window.addEventListener('resize', () => { if(_elevBarData) refreshElevBar(); });
