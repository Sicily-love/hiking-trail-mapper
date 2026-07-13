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
const waypointMarkerEntries = new Map();
let waypointMarkerModels = [];

function waypointMarkerSignature(trail, wp, isPrimary) {
  const photo = String(wp.photo || '');
  const photoSignature = photo
    ? `${photo.length}:${photo.slice(0, 24)}:${photo.slice(-24)}`
    : '';
  return JSON.stringify([
    trail.name, trail.color, state.mode, isPrimary,
    wp.lat, wp.lng, wp.tag, wp.day, wp.km, wp.elev,
    wp.icon, wp.label, wp.name, photoSignature,
  ]);
}

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
      const key = `${trail.id}#${wp.id}`;
      models.push({
        key,
        trail,
        wp,
        isPrimary,
        signature:waypointMarkerSignature(trail, wp, isPrimary),
      });
    });
  });
  return models;
}

function removeWaypointMarkerEntry(key) {
  const entry = waypointMarkerEntries.get(key);
  if(!entry) return;
  wpLayer.removeLayer(entry.marker);
  waypointMarkerEntries.delete(key);
  delete wpMarkers[key];
}

function mountWaypointMarkerModel(model) {
  const marker = addWpMarker(model.trail, model.wp, model.isPrimary);
  waypointMarkerEntries.set(model.key, {marker, model});
  wpMarkers[model.key] = marker;
}

function renderWaypointsNow() {
  const nextModels = collectWaypointMarkerModels();
  const diff = planKeyedWaypointDiff(
    waypointMarkerModels,
    nextModels,
    model => model.key,
    (previous, next) => previous.signature === next.signature,
  );

  diff.remove.forEach(item => removeWaypointMarkerEntry(item.key));
  diff.update.forEach(item => {
    removeWaypointMarkerEntry(item.key);
    mountWaypointMarkerModel(item.next);
  });
  diff.add.forEach(item => mountWaypointMarkerModel(item.next));
  diff.keep.forEach(item => {
    const entry = waypointMarkerEntries.get(item.key);
    if(entry) entry.model = item.next;
  });
  waypointMarkerModels = nextModels;
  renderRuntimeStats.markers = {
    add:diff.add.length,
    update:diff.update.length,
    remove:diff.remove.length,
    keep:diff.keep.length,
  };
  drawHighPoints();
}

function drawWaypoints() {
  invalidateRender(HTM_APP.RENDER_DIRTY.MARKERS);
}

/* @runtime-fragment waypoint.markers */
function addWpMarker(trail, wp, isPrimary) {
      const color = tagColors[wp.tag] || '#aaa';
      const isWpMode = state.mode === 'waypoint';
      // waypoint 模式 + 非主轨迹：只显示 emoji 图标（无 km·elev label），但颜色和主轨迹一样深
      const onlyEmoji = isWpMode && !isPrimary;
      // waypoint 模式下所有显示中轨迹的标注点都是全色（用户要求）
      const labelOpacity = isWpMode ? 1 : (isPrimary ? 1 : 0.7);
      const labelBorder = color;
      const iconText = waypointIcon(wp);
      const dayBadge = wp.day != null ? `<span class="wp-day-badge">D${wp.day}</span>` : '';
      const label = onlyEmoji ? '' : `<div class="wp-marker-label" style="color:${color};border-color:${labelBorder};opacity:${labelOpacity}">${dayBadge}${wp.km}km · ${wp.elev}m</div>`;
      const emojiSize = onlyEmoji ? 'font-size:16px;' : '';
      const emojiShadow = onlyEmoji ? 'filter:drop-shadow(0 1px 2px rgba(0,0,0,0.7));' : '';
      const html = `<div style="display:flex;align-items:center;gap:4px">
        <span class="wp-marker-emoji" style="opacity:${labelOpacity};${emojiSize}${emojiShadow}">${iconText}</span>
        ${label}
      </div>`;
      const icon = L.divIcon({ html, className:'', iconSize:[null, 24], iconAnchor:[12,12] });
      const m = L.marker([wp.lat, wp.lng], { icon, zIndexOffset: isPrimary ? 700 : 600, opacity: 1 });
      // 点击标注点 → 固定显示卡片；卡片中点图片再放大
      m.on('click', e => pinWpCard(e, wp, trail));
      m.addTo(wpLayer);
      wpMarkers[`${trail.id}#${wp.id}`] = m;
      return m;
}

function drawHighPoints() {
  highPointLayer.clearLayers();
  // 根据当前模式决定是否显示
  const isWpMode = state.mode === 'waypoint';
  // v1.14.1：统一走 state.visibleTags（getter 自动反射 modeVisibleTags[当前模式]）
  const showInThisMode = state.visibleTags.has('highpoint');

  DATA.trails.forEach(trail => {
    // 标注点模式忽略 activeTrails
    if(!isWpMode && !isTrailActive(trail)) return;
    if(!showInThisMode) return;
    // waypoint 模式下，非主轨迹也显示，但要标识
    const isMainCheck = trail.id === state.primaryTrailId;
    if(!isWpMode && !isMainCheck) {
      // 普通模式下只画主轨迹（保持原逻辑）
      // 不过这里允许所有显示中轨迹都画——保持原行为，每条都画
    }
    const track = trail.track;
    if(!track || track.length === 0) return;
    let maxIdx = 0, maxE = -Infinity;
    for(let i=0; i<track.length; i++) {
      const e = track[i][2];
      if(typeof e === 'number' && isFinite(e) && e > maxE) { maxE = e; maxIdx = i; }
    }
    if(maxE === -Infinity) return;  // 整条轨迹无有效海拔
    const p = track[maxIdx];
    const isMain = trail.id === state.primaryTrailId;
    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto">
        <div style="font-size:18px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6))">⛰</div>
        <div style="background:${trail.color};color:#fff;font-size:10px;padding:2px 6px;border-radius:3px;margin-top:2px;white-space:nowrap;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.3)">${maxE} m</div>
      </div>
    `;
    const icon = L.divIcon({ html, className:'', iconSize:[null, 36], iconAnchor:[12, 30] });
    const m = L.marker([p[0], p[1]], { icon, zIndexOffset: isMain ? 800 : 750, opacity: isMain ? 1 : 0.85 });
    m.bindPopup(`
      <div class="popup-content">
        <h4>⛰ ${trail.name} 最高点</h4>
        <div class="pmeta">海拔 <b>${maxE}</b> m</div>
        <div class="pmeta">里程 <b>${p[3]}</b> km</div>
      </div>
    `, { maxWidth: 260 });
    m.addTo(highPointLayer);
  });
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
