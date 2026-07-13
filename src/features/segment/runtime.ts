// @ts-nocheck
// Transitional classic fragments owned by segment interaction and itinerary editing.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment segment.runtime */
/* ============ 分段功能（在主轨迹上依次选点，标记每天行程） ============ */
const segmentController = HTM_APP.createSegmentController(runtimeContext, {
  markRevision:markTrailRevision,
});
const segmentState = segmentController.state;

function handleSegmentTap(event, session) {
  if(segmentState._justDragged) return;
  if(event.source !== 'fast' && segmentState._fastTapUntil > Date.now()) return;
  const latlng = event.latlng;
  const commitHit = hit => {
    if(!session.isCurrent()) return;
    if(!hit) {
      showToast('请点击主轨迹附近（200m 内）', 'error');
      return;
    }
    const p = hit.point;
    segmentInsertPoint({idx:hit.idx, lat:p[0], lng:p[1], elev:p[2] || 0, km:p[3] || 0});
  };
  if(event.source !== 'fast') {
    commitHit(nearestTrackIdxOnPrimary(latlng.lat, latlng.lng));
    return;
  }
  const tempMarker = L.circleMarker([latlng.lat, latlng.lng], {
    radius:6, color:'#fff', weight:2, fillColor:'#fbbf24', fillOpacity:0.7,
  }).addTo(segmentState.layer || (segmentState.layer = L.layerGroup().addTo(map)));
  session.frame(() => {
    const hit = nearestTrackIdxOnPrimary(latlng.lat, latlng.lng);
    tempMarker.remove();
    commitHit(hit);
  });
}

function handleSegmentInteractionEvent(event, session) {
  if(event.type === 'tap') {
    handleSegmentTap(event, session);
    return;
  }
  if(event.type === 'drag-start') {
    segmentController.beginDrag();
    session.setPhase('dragging');
    return;
  }
  if(event.type !== 'drag-end') return;
  session.setPhase('editing');
  session.delay(200, () => { segmentController.endDrag(); });
  const hit = event.hit;
  if(!hit) {
    showToast('必须拖到主轨迹附近（200m 内）', 'error');
    redrawSegmentLayer();
    return;
  }
  const p = hit.point;
  const nextPoint = {idx:hit.idx, lat:p[0], lng:p[1], elev:p[2] || 0, km:p[3] || 0};
  const move = segmentController.moveBoundary(event.boundaryIndex, nextPoint);
  if(!move.ok && move.reason === 'duplicate') {
    showToast('该位置已被占用，请选另一处', 'error');
    redrawSegmentLayer();
    return;
  }
  if(!move.ok) {
    const message = move.reason === 'before-previous'
      ? '分段点必须在上一边界之后'
      : move.reason === 'after-next'
        ? '分段点必须在下一边界之前'
        : '该分段点不能移动到此处';
    showToast(message, 'error');
    redrawSegmentLayer();
    return;
  }
  updateSegmentUI();
}

function segmentEnter() {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) {
    showToast('请先设置主轨迹', 'error');
    return;
  }
  beginRuntimeInteraction('segment', 'editing', main, {
    onEvent: handleSegmentInteractionEvent,
    onCancel: opts => segmentExit(opts),
  });
  enterInteractionRenderMode('分段');

  if(!segmentController.enter(main.id)) return;
  if(!segmentState.layer) segmentState.layer = L.layerGroup().addTo(map);
  segmentState.layer.clearLayers();

  document.getElementById('segment-panel').style.display = 'flex';
  map.getContainer().style.cursor = 'crosshair';
  // v1.30.0：分段模式也开启 SVG path 命中测试跳过
  map.getContainer().classList.add('measure-active');
  if(typeof resetView === 'function') resetView({restoreActive: true});
  updateSegmentUI();
}

function segmentExit(opts = {}) {
  if(!opts.fromManager && cancelRuntimeInteraction('segment', opts.reason || 'cancelled')) return;
  segmentController.exit();
  if(segmentState.layer) segmentState.layer.clearLayers();
  document.getElementById('segment-panel').style.display = 'none';
  map.getContainer().style.cursor = '';
  // v1.30.0：恢复 SVG 命中检测
  map.getContainer().classList.remove('measure-active');
}

function segmentUndo() {
  segmentDeleteDay(segmentState.points.length - 1);
}

function segmentClear() {
  if(segmentController.clear()) updateSegmentUI();
}


function segmentInsertPoint(pt) {
  const result = segmentController.insertPoint(pt);
  if(!result.ok) {
    if(result.reason === 'empty') return false;
    if(result.reason === 'duplicate') {
      showToast('该点已选中，请选另一个位置', 'error');
      return false;
    }
    showToast('请点击现有行程范围内的未占用位置', 'error');
    return false;
  }
  updateSegmentUI();
  return true;
}

function segmentDeleteDay(dayNo) {
  const result = segmentController.deleteDay(dayNo);
  if(!result.ok) {
    if(result.reason === 'min-days') {
      showToast('至少保留 1 天行程', 'info');
    }
    return false;
  }
  updateSegmentUI();
  return true;
}


function segmentStats(startIdx, endIdx) {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track) return null;
  const stats = computeSegmentStatsForTrack(main.track, startIdx, endIdx);
  if(!stats) return null;
  return { km: stats.kmText, asc: stats.asc, desc: stats.desc, maxE: stats.maxE, max: stats.max, minE: stats.minE, min: stats.min };
}

function updateSegmentUI() {
  const pts = segmentState.points;
  const hint = document.getElementById('segment-hint');
  if(pts.length === 0) {
    hint.innerHTML = '自动使用主轨迹起点与终点作为 1 天行程；点击轨迹中间位置可插入新的分段边界。';
  } else if(pts.length === 1) {
    hint.innerHTML = '✓ 起点已选（<span style="color:#22c55e">▲</span> D1 起点）。再点击选择 <b style="color:#fbbf24">D1 终点</b>（也是 D2 起点）。';
  } else {
    hint.innerHTML = '✓ 已分 <b style="color:#60a5fa">' + (pts.length - 1) + '</b> 天。点击轨迹插入边界，拖动黄色分段点调整，或在列表中删除指定日期。';
  }
  renderSegmentList();
  redrawSegmentLayer();
}

function renderSegmentList() {
  const list = document.getElementById('segment-list');
  const pts = segmentState.points;
  if(pts.length < 2) {
    list.innerHTML = '<div style="color:#64748b;text-align:center;padding:16px 0;font-size:11px">尚未选中任何一天…</div>';
    return;
  }
  const DAY_COLORS = dayPalette;
  let html = '';
  for(let d=1; d<pts.length; d++) {
    const stats = segmentStats(pts[d-1].idx, pts[d].idx);
    const color = DAY_COLORS[(d-1) % DAY_COLORS.length];
    const campData = segmentState.campEdits[d] || {};
    const campName = campData.name || '';
    const campElev = campData.elev != null ? campData.elev : Math.round(pts[d].elev);
    html += '<div class="segment-day-card" style="--day-color:'+color+'">' +
      '<div class="segment-day-head">' +
        '<b class="segment-day-title">D'+d+'</b>' +
        '<span class="segment-day-stats">'+stats.km+'km · ↑'+stats.asc+' · ↓'+stats.desc+' · 高'+stats.maxE+' · 低'+stats.minE+'</span>' +
        '<button class="seg-day-delete" data-day="'+d+'" title="删除 D'+d+'">删除</button>' +
      '</div>' +
      '<div class="segment-field">' +
        '<label>营地名</label>' +
        '<input class="seg-camp-name" data-day="'+d+'" placeholder="选填，如「仲达牧场」" value="'+campName.replace(/"/g,'&quot;')+'">' +
      '</div>' +
      '<div class="segment-field">' +
        '<label>营地海拔</label>' +
        '<input class="seg-camp-elev" data-day="'+d+'" type="number" placeholder="米" value="'+campElev+'">' +
        '<span class="unit">m</span>' +
      '</div>' +
    '</div>';
  }
  list.innerHTML = html;
  // 绑定输入事件
  list.querySelectorAll('.seg-camp-name').forEach(inp => {
    inp.addEventListener('input', e => {
      const d = +e.target.dataset.day;
      segmentController.updateCamp(d, {name:e.target.value});
    });
  });
  list.querySelectorAll('.seg-camp-elev').forEach(inp => {
    inp.addEventListener('input', e => {
      const d = +e.target.dataset.day;
      const v = parseFloat(e.target.value);
      segmentController.updateCamp(d, {elev:isNaN(v) ? null : v});
    });
  });
  list.querySelectorAll('.seg-day-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      segmentDeleteDay(+e.currentTarget.dataset.day);
    });
  });
}


function redrawSegmentLayer() {
  if(!segmentState.layer) return;
  segmentState.layer.clearLayers();
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main) return;
  const tk = main.track;
  const pts = segmentState.points;
  const DAY_COLORS = dayPalette;
  const model = buildSegmentLayerModel(tk, pts, DAY_COLORS, 900);
  // 为每天绘制不同颜色高亮线段
  model.segments.forEach(seg => {
    L.polyline(seg.latLngs, seg.lineStyle).addTo(segmentState.layer);
  });
  // 绘制分段点标记（可拖拽的 divIcon Marker）
  model.markers.forEach(m => {
    const icon = L.divIcon({
      className: 'segment-marker',
      html: '<div style="width:22px;height:22px;background:'+m.color+';border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-weight:700;color:#1a1a1a;font-size:10px;font-family:sans-serif;cursor:'+m.cursor+'">'+m.label+'</div>',
      iconSize: m.iconSize,
      iconAnchor: m.iconAnchor,
    });
    const marker = L.marker([m.lat, m.lng], Object.assign({ icon }, m.markerOptions)).addTo(segmentState.layer);
    marker._segIdx = m.pointIndex;
    if(!m.isBoundary) return;
    const snapper = createPrimaryTrackDragSnapper(marker, {
      scheduleFrame: callback => scheduleRuntimeInteractionFrame('segment', callback),
    });
    marker.on('dragstart', () => {
      dispatchRuntimeInteraction('segment', {type:'drag-start', boundaryIndex:marker._segIdx});
    });
    // 拖动过程中：吸附到主轨迹上（同时约束在相邻分段点之间）
    marker.on('drag', ev => snapper.schedule(ev));
    // 拖动结束：确定 idx，检查冲突，重排（保持递增顺序）后重绘
    marker.on('dragend', ev => {
      const ll = ev.target.getLatLng();
      const hit = snapper.resolve(ll);
      snapper.cancel();
      dispatchRuntimeInteraction('segment', {type:'drag-end', boundaryIndex:marker._segIdx, hit});
    });
  });
}

function segmentApply() {
  if(segmentState.points.length < 2) {
    showToast('至少需要 2 个分段点（1 天）', 'error');
    return;
  }
  if(!setRuntimeInteractionPhase('segment', 'committing')) return;
  const result = segmentController.apply();
  if(!result) {
    setRuntimeInteractionPhase('segment', 'editing');
    showToast('分段状态已失效，请重新进入分段模式', 'error');
    return;
  }
  showToast('✓ 已应用 ' + result.dayCount + ' 天分段');
  // 保存 + 完整重绘（fit:false 保持当前视野，但同步地图标注、行程、主轨迹小卡等所有 UI）
  saveToStorage();
  rebuildAll({fit:false});
  if(typeof refreshElevBar === 'function') refreshElevBar();
  segmentExit({reason:'committed'});
}

const segmentCloseBtn = document.getElementById('segment-close');
if(segmentCloseBtn) segmentCloseBtn.addEventListener('click', segmentExit);
const segmentExitBtn = document.getElementById('segment-exit');
if(segmentExitBtn) segmentExitBtn.addEventListener('click', segmentExit);
const segmentUndoBtn = document.getElementById('segment-undo');
if(segmentUndoBtn) segmentUndoBtn.addEventListener('click', segmentUndo);
const segmentClearBtn = document.getElementById('segment-clear');
if(segmentClearBtn) segmentClearBtn.addEventListener('click', segmentClear);
const segmentApplyBtn = document.getElementById('segment-apply');
if(segmentApplyBtn) segmentApplyBtn.addEventListener('click', segmentApply);
