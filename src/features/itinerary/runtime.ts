// @ts-nocheck
// Transitional classic fragments owned by Day preview and itinerary DOM.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment itinerary.day-preview */
const dayPreviewState = HTM_APP.createDayPreviewInteractionState();

function getDayIndexRange(trail, dm) {
  if(!trail || !trail.track || !trail.track.length || !dm) return null;
  const n = trail.track.length;
  const isValidIdx = v => Number.isInteger(v) && v >= 0 && v < n;
  if(isValidIdx(dm.i_start) && isValidIdx(dm.i_end)) {
    return { iStart: Math.min(dm.i_start, dm.i_end), iEnd: Math.max(dm.i_start, dm.i_end) };
  }
  let first = -1, last = -1;
  let hasExplicitDayId = false;
  for(let i=0; i<n; i++) {
    const dayId = Number(trail.track[i][5]);
    if(Number.isInteger(dayId) && dayId > 0) {
      hasExplicitDayId = true;
      if(dayId === dm.d) {
        if(first < 0) first = i;
        last = i;
      }
    }
  }
  if(hasExplicitDayId && first >= 0 && last >= first) return { iStart:first, iEnd:last };
  if(trail.day_meta && typeof dm.km === 'number') {
    let prevKm = 0;
    for(const item of trail.day_meta) {
      if(item === dm || item.d === dm.d) break;
      prevKm += Number(item.km) || 0;
    }
    const endKm = prevKm + (Number(dm.km) || 0);
    first = trail.track.findIndex(p => (p[3] || 0) >= prevKm - 0.02);
    last = -1;
    for(let i=n-1; i>=0; i--) {
      if((trail.track[i][3] || 0) <= endKm + 0.02) { last = i; break; }
    }
    if(first >= 0 && last >= first) return { iStart:first, iEnd:last };
  }
  return null;
}

function computeDayRangeStats(trail, range) {
  if(!trail || !range) return null;
  const i1 = Math.max(0, Math.min(range.iStart, range.iEnd));
  const i2 = Math.min(trail.track.length - 1, Math.max(range.iStart, range.iEnd));
  if(i2 < i1) return null;
  const cache = getMeasureStatsCache(trail);
  let minE = Infinity, maxE = -Infinity;
  for(let i=i1; i<=i2; i++) {
    const e = trail.track[i][2] || 0;
    if(e < minE) minE = e;
    if(e > maxE) maxE = e;
  }
  if(cache) {
    return {
      km: Math.abs((cache.distCum[i2] || 0) - (cache.distCum[i1] || 0)),
      asc: Math.max(0, (cache.ascCum[i2] || 0) - (cache.ascCum[i1] || 0)),
      desc: Math.max(0, (cache.descCum[i2] || 0) - (cache.descCum[i1] || 0)),
      max: maxE,
      min: minE,
    };
  }
  return segmentStats(i1, i2);
}

function clearDaySegmentPreview(opts = {}) {
  if(!opts.fromManager && cancelRuntimeInteraction('day-preview', opts.reason || 'cancelled')) return;
  if(dayPreviewState.layer) dayPreviewState.layer.clearLayers();
  HTM_APP.clearDayPreviewState(dayPreviewState);
  document.querySelectorAll('.day-preview-target.active').forEach(el => el.classList.remove('active'));
  if(!measureState.active) hideMeasureElevReadout();
  if(!opts.silent && typeof refreshElevBar === 'function') refreshElevBar();
}

function handleDayPreviewInteractionEvent(event) {
  if(event.type === 'refresh' && typeof refreshElevBar === 'function') refreshElevBar();
}

function showDaySegmentPreview(trail, dm) {
  const range = getDayIndexRange(trail, dm);
  if(!range) { showToast('这一天缺少可定位的轨迹范围', 'error'); return; }
  if(interactionManager.current.kind === 'day-preview'
      && dayPreviewState.active
      && dayPreviewState.trailId === trail.id
      && dayPreviewState.day === dm.d) {
    clearDaySegmentPreview();
    return;
  }
  const model = buildDayPreviewRenderModel(trail.track, range, 1200);
  if(!model) return;
  const session = beginRuntimeInteraction('day-preview', 'preview', trail, {
    onEvent: handleDayPreviewInteractionEvent,
    onCancel: opts => clearDaySegmentPreview(opts),
  });
  if(!session) return;
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
  dayPreviewState.active = true;
  dayPreviewState.trailId = trail.id;
  dayPreviewState.day = dm.d;
  dayPreviewState.iStart = model.iStart;
  dayPreviewState.iEnd = model.iEnd;
  document.querySelectorAll(`[data-day-preview="${dm.d}"]`).forEach(el => el.classList.add('active'));
  const stats = computeDayRangeStats(trail, range);
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
      const range = getDayIndexRange(trail, dm);
      const computed = computeDayRangeStats(trail, range) || {};
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
