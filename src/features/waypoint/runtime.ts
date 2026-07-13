// @ts-nocheck
// Transitional classic fragments owned by waypoint and marker rendering.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment waypoint.models */
/* ============ Waypoints ============ */
const tagColors = {
  start:'#5eb3ff', end:'#5eb3ff',
  fork:'#ff8c42',
  camp:'#22c55e',
  pass:'#ef4444',
  water:'#3b82f6',
  supply:'#facc15',
  warn:'#dc2626',
  shelter:'#a855f7',
  village:'#d97706',
  bridge:'#06b6d4',
  river:'#06b6d4',
  other:'#94a3b8',
};
const tagIcons = {
  start:'🚩',
  end:'🏁',
  fork:'⑫',
  camp:'🏕',
  pass:'🏔',
  water:'💧',
  supply:'🏪',
  warn:'⚠',
  shelter:'🏠',
  village:'🏘',
  bridge:'🌉',
  river:'🏞',
  highpoint:'⛰',
  other:'📍',
  view:'📍',
};
function waypointIcon(wpOrTag) {
  const tag = typeof wpOrTag === 'string' ? wpOrTag : (wpOrTag && wpOrTag.tag);
  return tagIcons[tag] || (wpOrTag && wpOrTag.icon) || '📍';
}
const tagLabels = {
  start:'起终点', end:'起终点',
  fork:'分叉点', camp:'营地', pass:'垭口',
  water:'水源', supply:'补给', warn:'高强度',
  shelter:'庇护', village:'村落/牧民', bridge:'桥/河',
  river:'小溪', other:'其他'
};

const wpMarkers = {};

const leafletMarkerRenderer = HTM_APP.createLeafletMarkerRenderer({
  leaflet:L,
  waypointLayer:wpLayer,
  highPointLayer,
  waypointRegistry:wpMarkers,
  onWaypointClick:(event, model) => pinWpCard(event, model.waypoint, model.trail),
});

function collectWaypointMarkerModels() {
  if(!state.showLabel) return [];
  const models = [];
  const isWpMode = state.mode === 'waypoint';
  DATA.trails.forEach(trail => {
    if(!isWpMode && !isTrailActive(trail)) return;
    const isPrimary = trail.id === state.primaryTrailId;
    if(!isWpMode && !isPrimary) return;
    (trail.waypoints || []).forEach(wp => {
      if(!state.visibleTags.has(wp.tag)) return;
      models.push(addWpMarker(trail, wp, isPrimary));
    });
  });
  return models;
}

function renderWaypointsNow() {
  renderRuntimeStats.markers = leafletMarkerRenderer.renderWaypoints(collectWaypointMarkerModels());
  drawHighPoints();
}

function drawWaypoints() {
  invalidateRender(HTM_APP.RENDER_DIRTY.MARKERS);
}

/* @runtime-fragment waypoint.markers */
function addWpMarker(trail, wp, isPrimary) {
      const color = tagColors[wp.tag] || '#aaa';
      const isWpMode = state.mode === 'waypoint';
      const iconText = waypointIcon(wp);
      const dayBadge = wp.day != null ? '<span class="wp-day-badge">D'+wp.day+'</span>' : '';
      void dayBadge;
      return HTM_APP.buildWaypointMarkerModel({trail, waypoint:wp, isPrimary, waypointMode:isWpMode, color, iconText});
}

function drawHighPoints() {
  const isWpMode = state.mode === 'waypoint';
  const showInThisMode = state.visibleTags.has('highpoint');
  const models = [];
  DATA.trails.forEach(trail => {
    if(!isWpMode && !isTrailActive(trail)) return;
    if(!showInThisMode) return;
    const isMain = trail.id === state.primaryTrailId;
    const model = HTM_APP.buildHighPointMarkerModel(trail, isMain);
    if(model) models.push(model);
  });
  leafletMarkerRenderer.renderHighPoints(models);
}

/* ============ Tooltip ============ */
const tooltipEl = document.getElementById('tooltip');

/* ============ Waypoint Photo Hover ============ */
const wpPhotoEl = document.getElementById('wp-photo-tip');
function pinWpCard(e, wp, trail) {
  // 点击标注点 → 固定显示卡片，卡片中图片可点击放大
  const photoSrc = wp.photo || '';
  const iconText = waypointIcon(wp);
  const photoHtml = photoSrc ? `<img id="pin-card-img" src="${photoSrc}" loading="lazy" style="display:block;max-width:260px;max-height:200px;border-radius:4px;cursor:zoom-in" onerror="this.style.display='none'">` : '';
  const trailLine = trail ? `<div style="color:${trail.color || '#aaa'};font-size:10px;font-weight:600;margin-bottom:3px">${t('popup.trailLabel')}: ${trail.name}</div>` : '';
  const descLine = wp.name && wp.name !== wp.label ? `<div style="color:#cfd6e0;font-size:10px;margin-top:3px;line-height:1.4;max-width:260px">${wp.name}</div>` : '';
  wpPhotoEl.innerHTML = `
    <button id="pin-card-close" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.4);border:none;color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;padding:0">×</button>
    ${trailLine}
    ${photoHtml}
    <div style="color:#cfd6e0;font-size:11px;margin-top:${photoHtml ? '4px' : '0'};padding:0 2px">${iconText} <b>${wp.label}</b> · ${wp.km}${t('header.km')} · ${wp.elev}m</div>
    ${descLine}
    ${photoSrc ? `<div style="color:var(--text-dim);font-size:9px;margin-top:3px">${t('popup.clickPhotoZoom')}</div>` : ''}
  `;
  wpPhotoEl.style.display = 'block';
  wpPhotoEl.style.pointerEvents = 'auto';  // 卡片接收事件（关闭按钮+图片点击）
  const oe = e.originalEvent;
  // 显示在地图视口中央偏上（避免被 marker 遮挡）
  const x = Math.min(Math.max(oe.clientX - 140, 10), window.innerWidth - 290);
  const y = Math.min(Math.max(oe.clientY + 20, 10), window.innerHeight - 280);
  wpPhotoEl.style.left = x + 'px';
  wpPhotoEl.style.top = y + 'px';

  // 关闭按钮
  const closeBtn = document.getElementById('pin-card-close');
  if(closeBtn) closeBtn.addEventListener('click', ev => { ev.stopPropagation(); hideWpPhoto(); });
  // 图片点击放大
  const imgEl = document.getElementById('pin-card-img');
  if(imgEl) imgEl.addEventListener('click', ev => {
    ev.stopPropagation();
    openLightbox(photoSrc, `${iconText} ${wp.label} · ${wp.km}${t('header.km')} · ${wp.elev}m`);
  });

  // 阻止事件冒泡到地图（否则 map click 会立即关掉）
  if(oe) oe.stopPropagation && oe.stopPropagation();
}

function hideWpPhoto() {
  wpPhotoEl.style.display = 'none';
  wpPhotoEl.style.pointerEvents = 'none';
}

// 点击地图空白处 → 关闭卡片
if(typeof map !== 'undefined' && map) {
  map.on('click', () => hideWpPhoto());
}

function showTooltip(e, a, b, trail, heat) {
  // a[4] = 累计爬升，通过 trail 反查累计下降
  let descVal = '-';
  if(trail && trail._descCum && a[3] !== undefined) {
    // 找最近索引的累计下降
    const idx = trail.track ? trail.track.findIndex(p => p[3] >= a[3]) : -1;
    if(idx >= 0 && trail._descCum[idx] !== undefined) descVal = Math.round(trail._descCum[idx]) + ' m';
  }
  let html = `
    <div class="row"><span class="lab">里程</span><span class="val">${a[3]} km</span></div>
    <div class="row"><span class="lab">海拔</span><span class="val">${a[2]} m</span></div>
    <div class="row"><span class="lab">爬升</span><span class="val">${a[4]} m</span></div>
    <div class="row"><span class="lab">下降</span><span class="val">${descVal}</span></div>
    <div class="row"><span class="lab">天数</span><span class="val">D${a[5]}</span></div>
    <div class="row"><span class="lab">轨迹</span><span style="color:${trail.color}">${trail.name}</span></div>
  `;
  if(heat !== undefined) {
    html += `<div class="row"><span class="lab">重合度</span><span class="val">${heat}x</span></div>`;
  }
  tooltipEl.innerHTML = html;
  tooltipEl.style.display = 'block';
  tooltipEl.style.left = e.originalEvent.clientX + 'px';
  tooltipEl.style.top = e.originalEvent.clientY + 'px';
}
function hideTooltip() { tooltipEl.style.display = 'none'; }

/* @runtime-fragment waypoint.interaction */
const waypointController = HTM_APP.createWaypointController(runtimeContext, {
  iconForTag:waypointIcon,
  markRevision:markTrailRevision,
  renderWaypoints:drawWaypoints,
  renderFilters:buildFilterGrid,
  renderDays:buildDaysTab,
  persist:saveToStorage,
  notify:message => showToast(message),
});
const addWaypointState = waypointController.state;

function nextWaypointId(trail) {
  return waypointController.nextId(trail);
}

function findWaypointAnchorOnPrimary(latlng, requireNear = false) {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) return null;
  const hit = nearestTrackIdxOnPrimary(latlng.lat, latlng.lng);
  if(hit) return hit;
  if(requireNear) return null;
  let bestI = 0, bestD = Infinity;
  for(let i=0; i<main.track.length; i++) {
    const p = main.track[i];
    const d = haversine(latlng.lat, latlng.lng, p[0], p[1]);
    if(d < bestD) { bestD = d; bestI = i; }
  }
  return { idx: bestI, point: main.track[bestI], dist: bestD, trail: main };
}

async function addManualWaypointAt(latlng, opts = {}) {
  const { requireNear = false, isCurrent = null } = opts;
  const anchor = findWaypointAnchorOnPrimary(latlng, requireNear);
  if(!anchor) {
    showToast('请点击主轨迹附近（200m 内）', 'error');
    return false;
  }
  const main = anchor.trail;
  const name = await studioDialogs.prompt({
    title:currentLang === 'zh' ? '新增标注点' : 'Add waypoint',
    inputLabel:currentLang === 'zh' ? '标注点名称' : 'Waypoint name',
    required:true,
    placeholder:currentLang === 'zh' ? '名称将标记为手动添加' : 'Saved as a manual waypoint',
    confirmLabel:currentLang === 'zh' ? '添加' : 'Add',
    cancelLabel:currentLang === 'zh' ? '取消' : 'Cancel',
  });
  if(!name || !name.trim()) return false;
  if(typeof isCurrent === 'function' && !isCurrent()) return false;
  return !!waypointController.addManualWaypoint({
    trailId:main.id,
    trackIndex:anchor.idx,
    point:anchor.point,
  }, name);
}

function handleWaypointInteractionEvent(event, session) {
  if(event.type !== 'tap') return;
  if(!session.setPhase('committing')) return;
  void addManualWaypointAt(event.latlng, {
    requireNear:event.requireNear !== false,
    isCurrent:() => session.isCurrent() && runtimeInteractionOwnerIsCurrent(session),
  }).then(added => {
    if(!session.isCurrent()) return;
    if(added) {
      session.cancel('committed');
      return;
    }
    if(event.transient) session.cancel('cancelled');
    else session.setPhase('select');
  }).catch(error => {
    console.error('Failed to add waypoint', error);
    if(session.isCurrent()) session.setPhase('select');
  });
}

function exitAddWaypointMode(opts = {}) {
  if(!opts.fromManager && cancelRuntimeInteraction('waypoint', opts.reason || 'cancelled')) return;
  waypointController.exit();
  const btn = document.getElementById('add-waypoint-btn');
  if(btn) btn.classList.remove('on');
  map.getContainer().style.cursor = '';
}

function enterAddWaypointMode(opts = {}) {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) {
    showToast('请先设置主轨迹', 'error');
    return null;
  }
  const session = beginRuntimeInteraction('waypoint', 'select', main, {
    onEvent: handleWaypointInteractionEvent,
    onCancel: cancelOpts => exitAddWaypointMode(cancelOpts),
  });
  if(!waypointController.enter(main.id)) return null;
  const btn = document.getElementById('add-waypoint-btn');
  if(btn) btn.classList.add('on');
  map.getContainer().style.cursor = 'crosshair';
  if(opts.announce !== false) showToast('在主轨迹附近点击一次，添加手动标注点');
  return session;
}

function dispatchTransientWaypointTap(latlng, source) {
  const session = enterAddWaypointMode({announce:false});
  if(!session) return false;
  return dispatchRuntimeInteraction('waypoint', {
    type:'tap', source, latlng, requireNear:false, transient:true,
  });
}

// 右键/长按地图添加标注点
if(map) {
  // 桌面端：右键 contextmenu
  map.on('contextmenu', e => {
    dispatchTransientWaypointTap(e.latlng, 'contextmenu');
  });
  // 移动端：长按 600ms
  let longPressTimer = null;
  map.getContainer().addEventListener('touchstart', e => {
    if(e.touches.length === 1) {
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      longPressTimer = setTimeout(() => {
        const rect = map.getContainer().getBoundingClientRect();
        const pt = L.point(clientX - rect.left, clientY - rect.top);
        const ll = map.containerPointToLatLng(pt);
        dispatchTransientWaypointTap(ll, 'long-press');
      }, 600);
    }
  }, {passive: true});
  map.getContainer().addEventListener('touchend', () => { if(longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } }, {passive: true});
  map.getContainer().addEventListener('touchmove', () => { if(longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } }, {passive: true});
}
