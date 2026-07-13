// @ts-nocheck
// Transitional classic fragments owned by segment interaction and itinerary editing.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment segment.runtime */
/* ============ 分段功能（在主轨迹上依次选点，标记每天行程） ============ */
const segmentState = HTM_APP.createSegmentInteractionState();

function segmentPointFromTrackIdx(trail, idx) {
  if(!trail || !trail.track || !trail.track.length) return null;
  return pointFromTrackIndex(trail.track, idx);
}

function normalizeSegmentIndexes(trail, indexes) {
  if(!trail || !trail.track || !trail.track.length) return [];
  const n = trail.track.length;
  const clean = Array.from(new Set((indexes || [])
    .map(v => clampTrackIndex(trail.track, Number(v)))
    .filter(v => Number.isInteger(v))))
    .sort((a, b) => a - b);
  if(clean[0] !== 0) clean.unshift(0);
  if(clean[clean.length - 1] !== n - 1) clean.push(n - 1);
  return clean;
}

function segmentIndexesToPoints(trail, indexes) {
  if(!trail || !trail.track || !trail.track.length) return [];
  const clean = normalizeSegmentIndexes(trail, indexes);
  return clean.map(idx => segmentPointFromTrackIdx(trail, idx)).filter(Boolean);
}

function segmentHasExplicitDayIds(trail) {
  return !!(trail && trail.track && trail.track.some(p => {
    const d = Number(p[5]);
    return Number.isInteger(d) && d > 0;
  }));
}

function segmentRangeFromDayMeta(trail, dm) {
  if(!trail || !trail.track || !trail.track.length || !dm) return null;
  const n = trail.track.length;
  const isValidIdx = v => Number.isInteger(v) && v >= 0 && v < n;
  if(isValidIdx(dm.i_start) && isValidIdx(dm.i_end)) {
    return { iStart: Math.min(dm.i_start, dm.i_end), iEnd: Math.max(dm.i_start, dm.i_end) };
  }
  return getDayIndexRange(trail, dm);
}

function segmentIndexesFromDayMeta(trail, dayMeta) {
  if(!trail || !trail.track || !trail.track.length || !dayMeta || !dayMeta.length) return [];
  const indexes = [];
  const meta = dayMeta.slice().sort((a, b) => (a.d || 0) - (b.d || 0));
  if(meta.length) {
    meta.forEach((dm, i) => {
      const range = segmentRangeFromDayMeta(trail, dm);
      if(range) {
        if(i === 0) indexes.push(range.iStart);
        indexes.push(range.iEnd);
      }
    });
  }
  return normalizeSegmentIndexes(trail, indexes);
}

function segmentIndexesFromDayIds(trail) {
  if(!trail || !trail.track || !trail.track.length || !segmentHasExplicitDayIds(trail)) return [];
  const indexes = [0];
  let currentDay = Number(trail.track[0][5]) || null;
  for(let i=1; i<trail.track.length; i++) {
    const d = Number(trail.track[i][5]) || null;
    if(d && currentDay && d !== currentDay) {
      indexes.push(i - 1);
      currentDay = d;
    } else if(d && !currentDay) {
      currentDay = d;
    }
  }
  indexes.push(trail.track.length - 1);
  return normalizeSegmentIndexes(trail, indexes);
}

function restoreSegmentIndexesForTrail(trail) {
  if(!trail || !trail.track || !trail.track.length) return [];
  const fromMeta = segmentIndexesFromDayMeta(trail, trail.day_meta || []);
  if(fromMeta.length >= 2) return fromMeta;
  const fromDays = segmentIndexesFromDayIds(trail);
  if(fromDays.length >= 2) return fromDays;
  return [0, trail.track.length - 1];
}

function segmentCampEditsFromDayMeta(dayMeta) {
  const edits = {};
  const meta = (dayMeta || []).slice().sort((a, b) => (a.d || 0) - (b.d || 0));
  meta.forEach((dm, i) => {
    if(dm.camp && dm.camp !== '-') {
      edits[dm.d || (i + 1)] = { name: dm.camp, elev: dm.camp_elev || null };
    }
  });
  return edits;
}

function restoreSegmentStateFromTrail(trail) {
  segmentState.points = [];
  segmentState.campEdits = {};
  if(!trail || !trail.track || !trail.track.length) return;
  segmentState.campEdits = segmentCampEditsFromDayMeta(trail.day_meta || []);
  segmentState.points = segmentIndexesToPoints(trail, restoreSegmentIndexesForTrail(trail));
}

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
    segmentState._justDragged = true;
    session.setPhase('dragging');
    return;
  }
  if(event.type !== 'drag-end') return;
  session.setPhase('editing');
  session.delay(200, () => { segmentState._justDragged = false; });
  const hit = event.hit;
  if(!hit) {
    showToast('必须拖到主轨迹附近（200m 内）', 'error');
    redrawSegmentLayer();
    return;
  }
  const p = hit.point;
  const nextPoint = {idx:hit.idx, lat:p[0], lng:p[1], elev:p[2] || 0, km:p[3] || 0};
  const move = moveSegmentBoundary(segmentState.points, event.boundaryIndex, nextPoint);
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
  segmentState.points = move.points;
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

  segmentState.active = true;
  segmentState.trailId = main.id;
  segmentState._fastTapUntil = 0;
  if(!segmentState.layer) segmentState.layer = L.layerGroup().addTo(map);
  segmentState.layer.clearLayers();
  restoreSegmentStateFromTrail(main);

  document.getElementById('segment-panel').style.display = 'flex';
  map.getContainer().style.cursor = 'crosshair';
  // v1.30.0：分段模式也开启 SVG path 命中测试跳过
  map.getContainer().classList.add('measure-active');
  if(typeof resetView === 'function') resetView({restoreActive: true});
  updateSegmentUI();
}

function segmentExit(opts = {}) {
  if(!opts.fromManager && cancelRuntimeInteraction('segment', opts.reason || 'cancelled')) return;
  segmentState.active = false;
  segmentState.trailId = null;
  segmentState._justDragged = false;
  segmentState._fastTapUntil = 0;
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
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  segmentState.points = main ? segmentIndexesToPoints(main, [0, main.track.length - 1]) : [];
  segmentState.campEdits = {};
  updateSegmentUI();
}

function renumberSegmentCampEditsForInsertFrom(old, insertAt) {
  const next = {};
  Object.keys(old || {}).forEach(k => {
    const d = Number(k);
    next[d >= insertAt ? d + 1 : d] = old[k];
  });
  return next;
}

function renumberSegmentCampEditsForDeleteFrom(old, dayNo, oldDayCount) {
  const next = {};
  for(let d=1; d<=oldDayCount; d++) {
    if(d === dayNo) continue;
    const newDay = d < dayNo ? d : d - 1;
    if(old && old[d]) next[newDay] = old[d];
  }
  return next;
}

function renumberSegmentCampEditsForInsert(insertAt) {
  segmentState.campEdits = renumberSegmentCampEditsForInsertFrom(segmentState.campEdits || {}, insertAt);
}

function renumberSegmentCampEditsForDelete(dayNo, oldDayCount) {
  segmentState.campEdits = renumberSegmentCampEditsForDeleteFrom(segmentState.campEdits || {}, dayNo, oldDayCount);
}

function insertSegmentPointInto(points, pt) {
  if(!pt) return { ok: false, reason: 'empty' };
  if(points.some(p => p.idx === pt.idx)) return { ok: false, reason: 'duplicate' };
  let insertAt = -1;
  for(let i=1; i<points.length; i++) {
    if(pt.idx > points[i-1].idx && pt.idx < points[i].idx) {
      insertAt = i;
      break;
    }
  }
  if(insertAt < 0) return { ok: false, reason: 'out-of-range' };
  const next = points.slice();
  next.splice(insertAt, 0, pt);
  return { ok: true, points: next, insertAt };
}

function deleteSegmentDayFrom(points, dayNo) {
  const oldDayCount = points.length - 1;
  if(oldDayCount <= 1) return { ok: false, reason: 'min-days', oldDayCount };
  if(dayNo < 1 || dayNo > oldDayCount) return { ok: false, reason: 'out-of-range', oldDayCount };
  const removePointIdx = dayNo < oldDayCount ? dayNo : dayNo - 1;
  const next = points.slice();
  next.splice(removePointIdx, 1);
  return { ok: true, points: next, oldDayCount, removePointIdx };
}


function segmentInsertPoint(pt) {
  const result = insertSegmentPointInto(segmentState.points, pt);
  if(!result.ok) {
    if(result.reason === 'empty') return false;
    if(result.reason === 'duplicate') {
      showToast('该点已选中，请选另一个位置', 'error');
      return false;
    }
    showToast('请点击现有行程范围内的未占用位置', 'error');
    return false;
  }
  segmentState.campEdits = renumberSegmentCampEditsForInsertFrom(segmentState.campEdits || {}, result.insertAt);
  segmentState.points = result.points;
  updateSegmentUI();
  return true;
}

function segmentDeleteDay(dayNo) {
  const result = deleteSegmentDayFrom(segmentState.points, dayNo);
  if(!result.ok) {
    if(result.reason === 'min-days') {
      showToast('至少保留 1 天行程', 'info');
    }
    return false;
  }
  segmentState.points = result.points;
  segmentState.campEdits = renumberSegmentCampEditsForDeleteFrom(segmentState.campEdits || {}, dayNo, result.oldDayCount);
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
      if(!segmentState.campEdits[d]) segmentState.campEdits[d] = {};
      segmentState.campEdits[d].name = e.target.value;
    });
  });
  list.querySelectorAll('.seg-camp-elev').forEach(inp => {
    inp.addEventListener('input', e => {
      const d = +e.target.dataset.day;
      if(!segmentState.campEdits[d]) segmentState.campEdits[d] = {};
      const v = parseFloat(e.target.value);
      segmentState.campEdits[d].elev = isNaN(v) ? null : v;
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
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main) return;
  const pts = segmentState.points;
  if(pts.length < 2) {
    showToast('至少需要 2 个分段点（1 天）', 'error');
    return;
  }
  if(!setRuntimeInteractionPhase('segment', 'committing')) return;
  const tk = main.track;
  // 写 track[i][5] = dayId
  // 分段点之间的所有点归属该天；两点方向可能反转，用 min/max
  // 先全部重置为 1，再按段覆盖
  const dayIds = new Array(tk.length).fill(1);
  for(let d=1; d<pts.length; d++) {
    const i1 = Math.min(pts[d-1].idx, pts[d].idx);
    const i2 = Math.max(pts[d-1].idx, pts[d].idx);
    for(let i=i1; i<=i2; i++) dayIds[i] = d;
  }
  // 覆盖到 track（每个点第 6 个位置存 dayId，若原本没有则扩展）
  for(let i=0; i<tk.length; i++) {
    if(tk[i].length < 6) {
      while(tk[i].length < 6) tk[i].push(null);
    }
    tk[i][5] = dayIds[i];
  }
  // 生成 day_meta
  const day_meta = [];
  for(let d=1; d<pts.length; d++) {
    const stats = segmentStats(pts[d-1].idx, pts[d].idx);
    const campData = segmentState.campEdits[d] || {};
    const startElev = Math.round(pts[d-1].elev);
    const endElev = Math.round(pts[d].elev);
    const iStart = Math.min(pts[d-1].idx, pts[d].idx);
    const iEnd = Math.max(pts[d-1].idx, pts[d].idx);
    // seg 描述：起点海拔 → 最高海拔 → 终点海拔（km）
    const seg = `起 ${startElev}m → 顶 ${stats.maxE}m → 低 ${stats.minE}m → 终 ${endElev}m（${stats.km}km）`;
    day_meta.push({
      d: d,
      km: parseFloat(stats.km),
      asc: stats.asc,
      desc: stats.desc,
      max: stats.maxE,
      min: stats.minE,
      seg: seg,
      camp: campData.name && campData.name.trim() ? campData.name.trim() : '-',
      camp_elev: campData.elev != null ? Math.round(campData.elev) : Math.round(pts[d].elev),
      i_start: iStart,
      i_end: iEnd,
    });
  }
  main.day_meta = day_meta;
  main.days = day_meta.length;
  markTrailRevision(main);
  // v1.27.0：给主轨迹的 waypoints 也打上 day 字段（按最近 track idx 匹配所在段）
  if(main.waypoints && main.waypoints.length && main.track && main.track.length) {
    main.waypoints.forEach(wp => {
      // 找 waypoint 对应的 track idx（优先用 wp.trackIdx，否则做一次 nearest 搜索）
      let idx = wp.gps_idx != null ? wp.gps_idx : wp.trackIdx;
      if(idx == null || idx < 0 || idx >= main.track.length) {
        // 用 haversine 找最近点（简易 O(n)）
        let bestI = 0, bestD = Infinity;
        const cosL = Math.cos(wp.lat * Math.PI / 180);
        for(let i=0; i<main.track.length; i++) {
          const dy = main.track[i][0] - wp.lat;
          const dx = (main.track[i][1] - wp.lng) * cosL;
          const d2 = dx*dx + dy*dy;
          if(d2 < bestD) { bestD = d2; bestI = i; }
        }
        idx = bestI;
      }
      const dayId = main.track[idx][5];
      if(dayId != null) wp.day = dayId;
    });
  }
  showToast('✓ 已应用 ' + (pts.length-1) + ' 天分段');
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
