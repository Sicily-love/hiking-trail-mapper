// @ts-nocheck
// Transitional classic fragments owned by Day preview and itinerary DOM.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment itinerary.day-preview */
const dayPreviewController = HTM_APP.createDayPreviewController(runtimeContext);
const dayPreviewState = dayPreviewController.state;

function clearDaySegmentPreview(opts = {}) {
  if(!opts.fromManager && cancelRuntimeInteraction('day-preview', opts.reason || 'cancelled')) return;
  if(dayPreviewState.layer) dayPreviewState.layer.clearLayers();
  dayPreviewController.exit();
  document.querySelectorAll('.day-preview-target.active').forEach(el => el.classList.remove('active'));
  if(!measureState.active) hideMeasureElevReadout();
  if(!opts.silent && typeof refreshElevBar === 'function') refreshElevBar();
}

function handleDayPreviewInteractionEvent(event) {
  if(event.type === 'refresh' && typeof refreshElevBar === 'function') refreshElevBar();
}

function showDaySegmentPreview(trail, dm) {
  const plan = dayPreviewController.prepare(trail.id, dm, 1200);
  if(!plan) { showToast('这一天缺少可定位的轨迹范围', 'error'); return; }
  if(interactionManager.current.kind === 'day-preview'
      && dayPreviewController.isActive(trail.id, dm.d)) {
    clearDaySegmentPreview();
    return;
  }
  const session = beginRuntimeInteraction('day-preview', 'preview', trail, {
    onEvent: handleDayPreviewInteractionEvent,
    onCancel: opts => clearDaySegmentPreview(opts),
  });
  if(!session) return;
  if(!dayPreviewController.activate(plan)) {
    clearDaySegmentPreview({reason:'owner-invalid'});
    return;
  }
  const model = plan.model;
  if(!dayPreviewState.layer) dayPreviewState.layer = L.layerGroup().addTo(map);
  dayPreviewState.layer.clearLayers();
  L.polyline(model.latLngs, model.lineStyle).addTo(dayPreviewState.layer);
  fitWorkspaceBounds(
    L.latLngBounds(model.latLngs),
    model.fitOptions,
    {source:'day-preview'},
  );
  model.endpoints.forEach(endpoint => {
    measureMarker(endpoint.lat, endpoint.lng, endpoint.label, endpoint.color).addTo(dayPreviewState.layer);
  });
  document.querySelectorAll(`[data-day-preview="${dm.d}"]`).forEach(el => el.classList.add('active'));
  const stats = plan.stats;
  const distEl = document.getElementById('m-dist');
  const distBox = document.getElementById('measure-distance');
  if(distEl && stats) distEl.textContent = Number(stats.km || 0).toFixed(1) + ' km';
  if(distBox) distBox.classList.add('active');
  setMeasureElevHint('');
  if(typeof refreshElevBar === 'function') refreshElevBar();
}

function buildDaysTab() {
  const tab = document.getElementById('tab-days');
  tab.innerHTML = '';
  // 只显示主轨迹的行程
  const trail = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!trail) return;
  const trailHdr = document.createElement('div');
  trailHdr.className = 'days-summary';
  const totalDays = trail.day_meta && trail.day_meta.length ? trail.day_meta.length : (trail.days || 0);
  trailHdr.innerHTML = `
    <h3 style="color:${trail.color}">★ ${trail.name}（主轨迹）</h3>
    <div class="days-summary-meta">
      <span>${totalDays || '-'} 天</span>
      <span>${trail.stats && trail.stats.distance_km != null ? trail.stats.distance_km : '-'} km</span>
      <span>↑ ${trail.stats && trail.stats.ascent_m != null ? trail.stats.ascent_m : '-'} m</span>
      <span>最高 ${trail.stats && trail.stats.max_elev != null ? trail.stats.max_elev : '-'} m</span>
    </div>
  `;
  tab.appendChild(trailHdr);

  // v1.26.0：若无 day_meta，显示占位提示
  if(!trail.day_meta || trail.day_meta.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:12px;color:var(--text-muted);font-size:11px;line-height:1.6';
    empty.innerHTML = '尚未设置每日行程。<br>点工具栏 <b>📅 分段</b> 在主轨迹上选点标记每天。';
    tab.appendChild(empty);
    return;
  }

  trail.day_meta.forEach((dm, dIdx) => {
      const range = HTM_CORE.getDayIndexRange(trail, dm);
      const computed = HTM_CORE.computeDayRangeStats(trail, range) || {};
      const dayKm = Number.isFinite(Number(dm.km)) ? Number(dm.km) : (computed.km || 0);
      const dayAsc = Number.isFinite(Number(dm.asc)) ? Number(dm.asc) : (computed.asc || 0);
      const dayDesc = Number.isFinite(Number(dm.desc)) ? Number(dm.desc) : (computed.desc || 0);
      const dayMax = Number.isFinite(Number(dm.max)) ? Number(dm.max) : (computed.max || 0);
      const dayMin = Number.isFinite(Number(dm.min)) ? Number(dm.min) : (computed.min || 0);
      const dayWps = trail.waypoints.filter(w => {
        // v1.27.0：优先用 wp.day 字段；否则用 day_meta cumulative km 划分
        if(w.day != null) return w.day === dm.d;
        if(range && w.gps_idx != null) return w.gps_idx >= range.iStart && w.gps_idx <= range.iEnd;
        let prevKm = 0;
        for(let i=0;i<dIdx;i++) prevKm += trail.day_meta[i].km;
        const endKm = prevKm + dm.km;
        return w.km >= prevKm - 0.5 && w.km <= endKm + 0.5;
      });
      const block = document.createElement('div');
      block.className = 'day-block';
      const color = dayPalette[dIdx % dayPalette.length];
      const routeText = dm.seg || ((dayKm || '-') + 'km · ↑' + (Math.round(dayAsc) || '-') + ' · ↓' + (Math.round(dayDesc) || '-') + ' · ⛰' + (Math.round(dayMax) || '-'));
      const campName = dm.camp || '未设置扎营点';
      const campElevNum = (dm.camp_elev == null || dm.camp_elev === '') ? NaN : Number(dm.camp_elev);
      const campElevText = Number.isFinite(campElevNum) ? Math.round(campElevNum) + ' m' : '-';
      block.style.setProperty('--day-color', color);
      block.innerHTML = `
        <div class="day-hdr" data-toggle>
          <span class="day-tag">D${dm.d}</span>
          <span class="day-head-main">
            <span class="day-route">${routeText}</span>
            <span class="day-title">${dayKm.toFixed(1)} km · ↑${Math.round(dayAsc)} m · ↓${Math.round(dayDesc)} m</span>
          </span>
          <span class="day-meta">▾</span>
        </div>
        <div class="day-body open">
          <div class="day-seg day-preview-target" data-day-preview="${dm.d}" title="点击高亮当天轨迹">
            <span class="ic">📍</span><span>${routeText}</span>
          </div>
          <div class="day-stats day-preview-target" data-day-preview="${dm.d}" title="点击高亮当天轨迹">
            <span class="lab">距离</span><span class="val">${dayKm.toFixed(1)} km</span>
            <span class="lab">当日爬升</span><span class="val">${Math.round(dayAsc)} m</span>
            <span class="lab">当日下降</span><span class="val">${Math.round(dayDesc)} m</span>
            <span class="lab">最高海拔</span><span class="val">${Math.round(dayMax)} m</span>
            <span class="lab">最低海拔</span><span class="val">${Math.round(dayMin)} m</span>
            <span class="lab">扎营点</span><span class="val">${campElevText}</span>
          </div>
          <div class="day-camp"><span>🏕</span><span>扎营点</span><b>${campName}</b><em>${campElevText}</em></div>
          <button class="day-evac-btn" data-trail="${trail.id}" data-day="${dm.d}">⚡ 下撤方案</button>
          <div class="wp-list"></div>
        </div>
      `;
      tab.appendChild(block);
      block.querySelectorAll('.day-preview-target').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          showDaySegmentPreview(trail, dm);
        });
      });
      const list = block.querySelector('.wp-list');
      // v1.27.0：行程 tab 固定显示这几类关键信息（不受 filter 影响）
      const DAYTAB_TAGS = new Set(['camp','pass','water','supply','bridge','river','village','shelter','warn','fork','start','end','highpoint']);
      dayWps.forEach(wp => {
        if(!DAYTAB_TAGS.has(wp.tag)) return;
        const item = document.createElement('div');
        item.className = 'wp-item';
        item.innerHTML = `
          <div class="wp-icon">${waypointIcon(wp)}</div>
          <div style="flex:1">
            <div class="wp-name" style="color:${tagColors[wp.tag]}">${wp.label}</div>
            <div class="wp-meta">km ${wp.km} · ${wp.elev}m · ${t('tag.'+wp.tag) || wp.tag}</div>
          </div>
        `;
        item.addEventListener('click', () => {
          clearEscape();
          map.flyTo([wp.lat, wp.lng], 15, {duration:0.7});
          setTimeout(() => {
            const m = wpMarkers[`${trail.id}#${wp.id}`];
            if(m) m.openPopup();
          }, 800);
        });
        list.appendChild(item);
      });
    });
  // 函数体结束（移除原 trails forEach 闭合）
}
