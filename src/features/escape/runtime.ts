// @ts-nocheck
// Transitional classic fragments owned by escape presentation and interaction.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment escape.display */
/* ============ Escape ============ */
const escapeController = HTM_APP.createEscapeController(runtimeContext, {
  markRevision:markTrailRevision,
});
const addEscapeState = escapeController.state;

function showEscape(trailId, escapeId) {
  escapeLayer.clearLayers();
  const r = escapeId ? escapeController.selectDisplayedRoute(trailId, escapeId) : null;
  if(!escapeId) escapeController.clearDisplayedRoute();
  drawTracks();
  if(!r) return;

  const pl = L.polyline(r.line, {
    color:'#ff3030', weight:5.5, opacity:0.95,
    dashArray:'10,8', lineCap:'round',
  }).addTo(escapeLayer);

  const decorator = L.polylineDecorator(pl, {
    patterns: [{
      offset:'5%', repeat:'10%',
      symbol: L.Symbol.arrowHead({ pixelSize:10, polygon:false, pathOptions:{stroke:true, color:'#fff', weight:2.5}})
    }]
  }).addTo(escapeLayer);

  map.flyToBounds(pl.getBounds().pad(0.2), {duration:0.8});
}

function clearEscape() {
  escapeLayer.clearLayers();
  escapeController.clearDisplayedRoute();
  drawTracks();
  document.querySelectorAll('.escape-item').forEach(el => el.classList.remove('active'));
}

/* @runtime-fragment escape.sidebar */
function buildEscapeTab() {
  const tab = document.getElementById('tab-escape');
  tab.innerHTML = '<div class="section" style="padding-bottom:0"><h3>主轨迹下撤方案</h3><div style="font-size:10px;color:var(--text-muted);margin-bottom:6px">点击任意方案在地图上高亮，再次点击退出</div></div>';
  const trail = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!trail) return;
  if(!trail.escape_routes || trail.escape_routes.length === 0) {
    tab.innerHTML += '<div style="color:var(--text-muted);font-size:11px;padding:8px 12px">暂无下撤方案（需含营地标注点，或手动添加）</div>';
  } else {
    trail.escape_routes.forEach(r => {
      const item = document.createElement('div');
      item.className = 'escape-item';
      item.dataset.trail = trail.id;
      item.dataset.id = r.id;
      const isOtherTrail = r._anchor && r._anchor.trailId !== trail.id;
      const crossTag = isOtherTrail
        ? `<span style="background:#1e3a5f;color:#60a5fa;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:4px">跨轨迹</span>`
        : '';
      const manualTag = r._manual
        ? `<span style="background:#1a2e1a;color:#4ade80;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:4px">手动</span>`
        : '';
      const delBtn = r._manual
        ? `<button class="escape-del-btn" data-id="${r.id}" style="float:right;background:transparent;border:none;color:#6b7280;font-size:13px;cursor:pointer;padding:0 2px;line-height:1" title="删除">🗑</button>`
        : '';
      item.innerHTML = `
        <h4>${delBtn}⚡ ${r.name}${crossTag}${manualTag}</h4>
        <p>${r.desc}</p>
        <div class="meta">
          <span>📏 沿迹 ${r.distance_km} km</span>
          ${r.straight_km != null ? `<span>↗直线 ${r.straight_km} km</span>` : ''}
          <span>${r.drop_m > 0 ? '⬇' : r.drop_m < 0 ? '⬆' : '—'} ${Math.abs(r.drop_m)} m</span>
        </div>
      `;
      item.addEventListener('click', e => {
        if(e.target.classList.contains('escape-del-btn')) {
          const delId = e.target.dataset.id;
          const wasActive = state.activeEscape === delId;
          if(escapeController.deleteRoute(trail.id, delId)) {
            if(wasActive) clearEscape();
            saveToStorage();
            buildEscapeTab();
          }
          return;
        }
        if(state.activeEscape === r.id) {
          clearEscape();
        } else {
          document.querySelectorAll('.escape-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          showEscape(trail.id, r.id);
        }
      });
      tab.appendChild(item);
    });
  }
  // 手动添加按钮
  const addBtn = document.createElement('button');
  addBtn.textContent = '＋ 手动添加下撤路线';
  addBtn.style.cssText = 'width:100%;margin-top:10px;padding:7px;background:rgba(127,29,29,0.3);border:1px dashed #7f1d1d;border-radius:5px;color:#fca5a5;font-size:11px;cursor:pointer';
  addBtn.addEventListener('mouseenter', () => addBtn.style.background = 'rgba(127,29,29,0.5)');
  addBtn.addEventListener('mouseleave', () => addBtn.style.background = 'rgba(127,29,29,0.3)');
  addBtn.dataset.commandId = STUDIO_COMMANDS.ESCAPE_TOGGLE;
  addBtn.addEventListener('click', () => dispatchStudioCommand(STUDIO_COMMANDS.ESCAPE_TOGGLE));
  tab.appendChild(addBtn);
}

/* @runtime-fragment escape.interaction */
/* ============ 手动添加下撤路线 ============ */

function handleEscapeInteractionEvent(event, session) {
  if(event.type !== 'tap') return;
  const hit = escapeController.nearestPoint(event.latlng.lat, event.latlng.lng);
  if(!hit) {
    showToast('请点击轨迹附近（2km 内）', 'error');
    return;
  }
  if(session.phase === 'select-a') {
    escapeController.selectA(hit);
    addEscapeState.layer.clearLayers();
    L.circleMarker([hit.lat, hit.lng], {radius:8, color:'#fff', weight:2, fillColor:'#22c55e', fillOpacity:1})
      .bindTooltip('A（起点）', {permanent:true, direction:'top', offset:[0,-8], className:'measure-tip'})
      .addTo(addEscapeState.layer);
    document.getElementById('addescape-result').style.display = 'none';
    document.getElementById('addescape-hint').innerHTML =
      '✓ 起点 A 已选。再点击 <b style="color:#ef4444">终点 B</b>。';
    session.setPhase('select-b');
    return;
  }
  if(session.phase === 'preview') session.setPhase('select-b');
  if(session.phase !== 'select-b') return;
  escapeController.selectB(hit);
  addEscapeCompute();
}

function addEscapeEnter() {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) { showToast('请先设置主轨迹', 'error'); return; }
  beginRuntimeInteraction('escape', 'select-a', main, {
    onEvent: handleEscapeInteractionEvent,
    onCancel: opts => addEscapeExit(opts),
  });
  if(!escapeController.enter(main.id)) return;
  const btn = document.getElementById('add-escape-btn');
  if(btn) btn.classList.add('on');
  if(!addEscapeState.layer) addEscapeState.layer = L.layerGroup().addTo(map);
  addEscapeState.layer.clearLayers();
  document.getElementById('addescape-panel').style.display = 'block';
  document.getElementById('addescape-result').style.display = 'none';
  document.getElementById('addescape-hint').innerHTML =
    '在地图上点击 <b style="color:#22c55e">起点 A</b>，再点击 <b style="color:#ef4444">终点 B</b>。<br><span style="font-size:10px">系统自动找最近的轨迹段作为路线依据。</span>';
  map.getContainer().style.cursor = 'crosshair';
}

function addEscapeExit(opts = {}) {
  if(!opts.fromManager && cancelRuntimeInteraction('escape', opts.reason || 'cancelled')) return;
  escapeController.exit();
  const btn = document.getElementById('add-escape-btn');
  if(btn) btn.classList.remove('on');
  if(addEscapeState.layer) addEscapeState.layer.clearLayers();
  document.getElementById('addescape-panel').style.display = 'none';
  map.getContainer().style.cursor = '';
}

function addEscapeReset() {
  escapeController.reset();
  if(addEscapeState.layer) addEscapeState.layer.clearLayers();
  document.getElementById('addescape-result').style.display = 'none';
  document.getElementById('addescape-hint').innerHTML =
    '在地图上点击 <b style="color:#22c55e">起点 A</b>，再点击 <b style="color:#ef4444">终点 B</b>。<br><span style="font-size:10px">系统自动找最近的轨迹段作为路线依据。</span>';
  setRuntimeInteractionPhase('escape', 'select-a');
}

function addEscapeCompute() {
  const result = escapeController.compute();
  if(!result.ok) {
    if(result.reason === 'same-point') {
      showToast('两点太近，请重新选择', 'error');
    }
    return false;
  }
  const preview = result.preview;
  const route = preview.route;
  if(!route._anchor) return false;
  if(!route.line.length) return false;
  const pointA = preview.pointA;
  const pointB = preview.pointB;

  // 预览高亮
  addEscapeState.layer.clearLayers();
  L.circleMarker([pointA.lat, pointA.lng], {radius:8, color:'#fff', weight:2, fillColor:'#22c55e', fillOpacity:1})
    .bindTooltip('A（起点）', {permanent:true, direction:'top', offset:[0,-8], className:'measure-tip'})
    .addTo(addEscapeState.layer);
  L.circleMarker([pointB.lat, pointB.lng], {radius:8, color:'#fff', weight:2, fillColor:'#ef4444', fillOpacity:1})
    .bindTooltip('B（终点）', {permanent:true, direction:'top', offset:[0,-8], className:'measure-tip'})
    .addTo(addEscapeState.layer);
  L.polyline(route.line, {color:'#f87171', weight:5, opacity:0.9, dashArray:'10,7'}).addTo(addEscapeState.layer);
  map.flyToBounds(L.latLngBounds(route.line).pad(0.2), {duration:0.6});

  // 填充面板
  document.getElementById('ae-dist').textContent = route.distance_km + ' km';
  document.getElementById('ae-trail').textContent = route._anchor.trailName;
  document.getElementById('ae-asc').textContent = preview.ascentM + ' m';
  document.getElementById('ae-desc').textContent = preview.descentM + ' m';
  document.getElementById('ae-eA').textContent = Math.round(pointA.elev) + ' m';
  document.getElementById('ae-eB').textContent = Math.round(pointB.elev) + ' m';

  document.getElementById('addescape-name').value = route.name;
  document.getElementById('addescape-result').style.display = 'block';
  document.getElementById('addescape-hint').textContent = '✓ 路线已预览。确认后点击「保存」。';
  setRuntimeInteractionPhase('escape', 'preview');
  return true;
}

function addEscapeCommit() {
  if(!addEscapeState._pending) return;
  if(!setRuntimeInteractionPhase('escape', 'committing')) return;
  const nameInput = document.getElementById('addescape-name').value.trim();
  const route = escapeController.commit(nameInput);
  if(!route) {
    setRuntimeInteractionPhase('escape', 'preview');
    showToast('下撤状态已失效，请重新选择', 'error');
    return;
  }
  saveToStorage();
  buildEscapeTab();
  showToast(`✓ 下撤路线「${route.name}」已保存`);
  addEscapeExit({reason:'committed'});
}

// 按钮绑定
document.getElementById('addescape-close').addEventListener('click', addEscapeExit);
document.getElementById('addescape-exit').addEventListener('click', addEscapeExit);
document.getElementById('addescape-reset').addEventListener('click', addEscapeReset);
document.getElementById('addescape-commit').addEventListener('click', addEscapeCommit);
