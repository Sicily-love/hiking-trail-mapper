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

function computeElevLayout(pts, opts) {
  opts = opts || {};
  const W = elevCanvas.offsetWidth || 340;
  const H = elevCanvas.offsetHeight || 140;
  const dpr = window.devicePixelRatio || 1;
  elevCanvas.width = W * dpr;
  elevCanvas.height = H * dpr;
  elevCtx.setTransform(1, 0, 0, 1, 0, 0);
  elevCtx.scale(dpr, dpr);
  return computeElevationLayout(pts, Object.assign({}, opts, { width: W, height: H }));
}


/** 绘制米色卡纸背景 + 微噪点纹理 */
function drawElevBackground(layout, renderModel) {
  renderModel = renderModel || computeElevationRenderModel([], layout);
  const bg = renderModel.background;
  const bgGrad = elevCtx.createLinearGradient(bg.gradient.x0, bg.gradient.y0, bg.gradient.x1, bg.gradient.y1);
  bg.gradient.stops.forEach(stop => bgGrad.addColorStop(stop.offset, stop.color));
  elevCtx.fillStyle = bgGrad;
  elevCtx.fillRect(bg.rect.x, bg.rect.y, bg.rect.w, bg.rect.h);
  const noise = bg.noise;
  for(let i = 0; i < noise.count; i++) {
    elevCtx.fillStyle = 'rgba(' + noise.rgb[0] + ',' + noise.rgb[1] + ',' + noise.rgb[2] + ',' + (Math.random()*noise.maxAlpha).toFixed(3) + ')';
    elevCtx.fillRect(Math.random()*bg.rect.w, Math.random()*bg.rect.h, noise.size, noise.size);
  }
}

/** 绘制 25% / 50% / 75% 横向参考虚线 */
function drawElevGridLines(layout, renderModel) {
  renderModel = renderModel || computeElevationRenderModel([], layout);
  const style = renderModel.gridStyle;
  renderModel.gridLines.forEach(line => {
    elevCtx.beginPath();
    elevCtx.moveTo(line.x1, line.y1);
    elevCtx.lineTo(line.x2, line.y2);
    elevCtx.strokeStyle = style.strokeStyle;
    elevCtx.lineWidth = style.lineWidth;
    elevCtx.setLineDash(style.lineDash || []);
    elevCtx.stroke();
    elevCtx.setLineDash([]);
  });
}

/** 绘制与海拔曲线完全同路径的填充，避免曲线和下方面积边缘错位 */
function drawElevFill(pts, layout, renderModel) {
  if(!pts || pts.length < 2) return;
  renderModel = renderModel || computeElevationRenderModel(pts, layout);
  const fillPolygon = renderModel.fillPolygon;
  if(fillPolygon.length < 3) return;
  const fillGrad = renderModel.fillStyle.gradient;
  const grad = elevCtx.createLinearGradient(fillGrad.x0, fillGrad.y0, fillGrad.x1, fillGrad.y1);
  fillGrad.stops.forEach(stop => grad.addColorStop(stop.offset, stop.color));
  elevCtx.beginPath();
  elevCtx.moveTo(fillPolygon[0].x, fillPolygon[0].y);
  for(let i=1; i<fillPolygon.length; i++) {
    elevCtx.lineTo(fillPolygon[i].x, fillPolygon[i].y);
  }
  elevCtx.closePath();
  elevCtx.fillStyle = grad;
  elevCtx.fill();
}

/** 绘制海拔曲线（深森林绿主线 + 底线） */
function drawElevCurve(pts, layout, renderModel) {
  renderModel = renderModel || computeElevationRenderModel(pts, layout);
  const curve = renderModel.curve;
  if(!curve.length) return;
  elevCtx.beginPath();
  curve.forEach((p, i) => i === 0 ? elevCtx.moveTo(p.x, p.y) : elevCtx.lineTo(p.x, p.y));
  const curveStyle = renderModel.curveStyle;
  elevCtx.strokeStyle = curveStyle.strokeStyle;
  elevCtx.lineWidth = curveStyle.lineWidth;
  elevCtx.lineJoin = curveStyle.lineJoin || 'miter';
  elevCtx.lineCap = curveStyle.lineCap || 'butt';
  elevCtx.stroke();
  // 底线
  const { baseline } = renderModel;
  const baselineStyle = renderModel.baselineStyle;
  elevCtx.beginPath();
  elevCtx.moveTo(baseline.x1, baseline.y1);
  elevCtx.lineTo(baseline.x2, baseline.y2);
  elevCtx.strokeStyle = baselineStyle.strokeStyle;
  elevCtx.lineWidth = baselineStyle.lineWidth;
  elevCtx.stroke();
}

/** 收集要标注的关键点：最高点、最低点（若与最高点足够远）、营地 */
function collectElevAnnotations(pts, layout, opts) {
  const { alts, minE, maxE, km, kmRange } = layout;
  const annos = [];

  const peakIdx = alts.indexOf(maxE);
  annos.push({
    idx: peakIdx, kmVal: km[peakIdx], elev: maxE,
    text: Math.round(maxE) + 'm',
    color: '#A8543C', dotColor: '#A8543C', dotRadius: 3.4,
    priority: 100, side: 'top', kind: 'peak',
  });

  const valleyIdx = alts.indexOf(minE);
  if(Math.abs(km[valleyIdx] - km[peakIdx]) > kmRange * 0.08) {
    annos.push({
      idx: valleyIdx, kmVal: km[valleyIdx], elev: minE,
      text: Math.round(minE) + 'm',
      color: '#5C7A8C', dotColor: '#5C7A8C', dotRadius: 3.4,
      priority: 50, side: 'bottom', kind: 'low',
    });
  }

  if(opts.measureMode && pts.length >= 2) {
    annos.push({
      idx: 0, kmVal: km[0], elev: pts[0][2] || 0,
      text: 'A ' + Math.round(pts[0][2] || 0) + 'm',
      color: '#2F7D55', dotColor: '#22c55e', priority: 130, labelSide: 'left', kind: 'measure-a',
    });
    const endIdx = pts.length - 1;
    annos.push({
      idx: endIdx, kmVal: km[endIdx], elev: pts[endIdx][2] || 0,
      text: 'B ' + Math.round(pts[endIdx][2] || 0) + 'm',
      color: '#A8543C', dotColor: '#ef4444', priority: 130, labelSide: 'right', kind: 'measure-b',
    });
  }

  if(opts.waypoints && opts.waypoints.length) {
    const segIdxStart = opts.segIdxStart || 0;
    const segIdxEnd = opts.segIdxEnd != null ? opts.segIdxEnd : (segIdxStart + pts.length - 1);
    const reversed = !!opts.reversed;
    opts.waypoints.forEach(wp => {
      if(wp.tag !== 'camp' || wp.gps_idx == null) return;
      if(wp.gps_idx < segIdxStart || wp.gps_idx > segIdxEnd) return;
      let localIdx = wp.gps_idx - segIdxStart;
      if(reversed) localIdx = (pts.length - 1) - localIdx;
      if(localIdx < 0 || localIdx >= pts.length) return;
      const elv = pts[localIdx][2] || 0;
      const nm = (wp.label || wp.name || t('elev.anno.camp')).toString().trim();
      annos.push({
        idx: localIdx, kmVal: km[localIdx], elev: elv,
        text: nm + ' ' + Math.round(elv) + 'm',
        color: '#3F5238', priority: 80, side: 'top', kind: 'camp',
      });
    });
  }
  annos.sort((a, b) => a.kmVal - b.kmVal);
  return annos;
}


/** Canvas 文本测量适配：兼容原入口，布局计算仍由纯函数负责。 */
function layoutElevLabels(annotations, layout) {
  return layoutElevationAnnotations(annotations, layout, {
    measureText: (text, fontSize, font) => {
      elevCtx.font = font;
      return elevCtx.measureText(text).width;
    },
  });
}

/** Canvas 适配层：执行纯渲染模型。 */
function renderElevLabels(renderModel) {
  renderModel.commands.forEach(command => {
    elevCtx.beginPath();
    elevCtx.arc(command.dot.x, command.dot.y, command.dot.radius, 0, Math.PI * 2);
    elevCtx.fillStyle = command.dot.fillStyle || renderModel.defaultDotFillStyle;
    elevCtx.fill();
    elevCtx.strokeStyle = renderModel.dotStrokeStyle;
    elevCtx.lineWidth = renderModel.dotStrokeWidth;
    elevCtx.stroke();
    if(command.leader) {
      elevCtx.beginPath();
      elevCtx.moveTo(command.leader.x1, command.leader.y1);
      elevCtx.lineTo(command.leader.x2, command.leader.y2);
      elevCtx.strokeStyle = renderModel.leaderStyle.strokeStyle;
      elevCtx.lineWidth = renderModel.leaderStyle.lineWidth;
      elevCtx.stroke();
    }
    if(command.text) {
      elevCtx.font = renderModel.textStyle.font;
      elevCtx.fillStyle = command.text.fillStyle || renderModel.textStyle.fillStyle;
      elevCtx.textAlign = renderModel.textStyle.textAlign;
      elevCtx.textBaseline = renderModel.textStyle.textBaseline;
      elevCtx.fillText(command.text.value, command.text.x, command.text.y);
      elevCtx.textBaseline = 'alphabetic';
    }
  });
}

/** 绘制 X 轴里程刻度 */
function drawElevAxes(layout, renderModel) {
  renderModel = renderModel || computeElevationRenderModel([], layout);
  const { PT, ph } = layout;
  const axisStyle = renderModel.axisStyle;

  // X 轴刻度
  elevCtx.fillStyle = axisStyle.tickText.fillStyle;
  elevCtx.font = axisStyle.tickText.font;
  renderModel.ticks.forEach(tick => {
    elevCtx.beginPath();
    elevCtx.moveTo(tick.x, PT + ph);
    elevCtx.lineTo(tick.x, PT + ph + 3);
    elevCtx.strokeStyle = axisStyle.tickLine.strokeStyle;
    elevCtx.lineWidth = axisStyle.tickLine.lineWidth;
    elevCtx.stroke();
    elevCtx.textAlign = tick.align;
    elevCtx.fillText(tick.label, tick.x, PT + ph + 14);
  });
  // X 轴标题
  elevCtx.textAlign = axisStyle.axisLabel.textAlign || 'center';
  elevCtx.fillStyle = axisStyle.axisLabel.fillStyle;
  elevCtx.font = axisStyle.axisLabel.font;
  elevCtx.fillText(t('elev.km'), renderModel.xAxisLabel.x, renderModel.xAxisLabel.y);
}

/** 更新顶部爬升/下降 badge */
function updateElevBadges(badges) {
  const ascEl = document.getElementById('elev-stat-asc');
  const descEl = document.getElementById('elev-stat-desc');
  if(ascEl) ascEl.textContent = badges.ascentText;
  if(descEl) descEl.textContent = badges.descentText;
}

function buildElevationCanvasRenderModel(pts, layout) {
  const pixelWidth = Math.max(2, Math.floor(layout.pw || layout.W || 340));
  const sampleIndices = downsampleMinMaxIndices(
    pts,
    pixelWidth,
    point => Number.isFinite(point[2]) ? Number(point[2]) : 0,
  );
  renderRuntimeStats.elevation = {
    sourcePoints:pts.length,
    renderedPoints:sampleIndices.length,
  };
  if(sampleIndices.length === pts.length) return computeElevationRenderModel(pts, layout);

  const sampledPoints = sampleIndices.map(index => pts[index]);
  const sampledLayout = {
    ...layout,
    alts:sampleIndices.map(index => layout.alts[index]),
    km:sampleIndices.map(index => layout.km[index]),
    pX:index => layout.pX(sampleIndices[index]),
  };
  const sampledModel = computeElevationRenderModel(sampledPoints, sampledLayout);
  const fullBadges = computeElevationRenderModel([], layout).badges;
  return {...sampledModel, badges:fullBadges};
}

function drawElevBar(pts, color, label, opts) {
  if(!elevCanvas || !elevCtx || !pts || pts.length < 2) return;
  opts = opts || {};

  const layout = computeElevLayout(pts, opts);
  const renderModel = buildElevationCanvasRenderModel(pts, layout);

  // 供 hit test / tooltip 使用
  _elevBarData = {
    pts, minE: layout.minE, maxE: layout.maxE,
    color: color || '#3F5238',
    km: layout.km,
    PL: layout.PL, PR: layout.PR, pw: layout.pw,
  };
  if(elevLabel) elevLabel.textContent = label || t('elev.title');
  updateElevBadges(renderModel.badges);

  elevCtx.clearRect(0, 0, layout.W, layout.H);
  drawElevBackground(layout, renderModel);
  drawElevGridLines(layout, renderModel);
  drawElevFill(pts, layout, renderModel);
  drawElevCurve(pts, layout, renderModel);

  const annos = collectElevAnnotations(pts, layout, opts);
  const annotationLayout = layoutElevLabels(annos, layout);
  drawElevBar._overflowRequest = annotationLayout.overflow;
  renderElevLabels(buildElevationAnnotationRenderModel(annotationLayout));
  drawElevAxes(layout, renderModel);
}

function renderElevationChartNow() {
  if(!elevCanvas) return;
  // v1.20.0：无选中分组时不绘制
  const main = state.activeGroup == null ? null : DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) {
    if(elevCtx) elevCtx.clearRect(0, 0, elevCanvas.width, elevCanvas.height);
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
  const stackEstimate = (() => {
    const ctx = currentElevStackContext();
    if(!ctx.segPts || ctx.segPts.length < 2) {
      return { labelCount: 0, fontSize: 9.5, lineHeight: 12.5, stackDepth: 1 };
    }
    const layout = computeElevationLayout(ctx.segPts, ctx.layoutOpts);
    const annos = collectElevAnnotations(ctx.segPts, layout, ctx.annoOpts);
    return estimateElevationLabelStackDepth(annos, layout, {
      measureText: (text, fontSize, font) => {
        if(elevCtx) elevCtx.font = font;
        return elevCtx ? elevCtx.measureText(text).width : text.length * fontSize * 0.55;
      },
    });
  })();
  const targetH = computeElevationPanelHeight(stackEstimate);

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

