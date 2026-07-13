// @ts-nocheck
// Transitional classic fragments owned by escape presentation and interaction.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment escape.display */
/* ============ Escape ============ */
function showEscape(trailId, escapeId) {
  escapeLayer.clearLayers();
  dispatchState({type:'escape.set-active', escapeId:null});
  drawTracks();  // 重绘以淡化

  if(!escapeId) return;
  const trail = DATA.trails.find(t => t.id === trailId);
  if(!trail) return;
  const r = trail.escape_routes.find(e => e.id === escapeId);
  if(!r) return;

  dispatchState({type:'escape.set-active', escapeId});
  drawTracks();  // 再画一次（淡化版）

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
  dispatchState({type:'escape.set-active', escapeId:null});
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
          trail.escape_routes = trail.escape_routes.filter(x => x.id !== delId);
          markTrailRevision(trail);
          if(state.activeEscape === delId) clearEscape();
          saveToStorage();
          buildEscapeTab();
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
const addEscapeState = {
  active: false,
  trailId: null,
  ptA: null,   // {lat, lng, elev, trailId, trackIdx}
  ptB: null,
  layer: null,
  _pending: null, // 待保存的路线对象
};

// 在所有活跃轨迹中，找离 (lat,lng) 最近的轨迹点
function nearestPointOnAnyTrail(lat, lng) {
  let best = null, bestD = Infinity;
  for(const tr of DATA.trails) {
    if(!isTrailActive(tr)) continue;
    if(!tr.track || !tr.track.length) continue;
    for(let i = 0; i < tr.track.length; i++) {
      const p = tr.track[i];
      const d = haversine(lat, lng, p[0], p[1]);
      if(d < bestD) {
        bestD = d;
        best = { lat: p[0], lng: p[1], elev: p[2] || 0, km: p[3] || 0,
                 trailId: tr.id, trailName: tr.name, trackIdx: i };
      }
    }
  }
  return bestD < 2000 ? best : null; // 2km 内才吸附
}

function handleEscapeInteractionEvent(event, session) {
  if(event.type !== 'tap') return;
  const hit = nearestPointOnAnyTrail(event.latlng.lat, event.latlng.lng);
  if(!hit) {
    showToast('请点击轨迹附近（2km 内）', 'error');
    return;
  }
  if(session.phase === 'select-a') {
    addEscapeState.ptA = hit;
    addEscapeState.ptB = null;
    addEscapeState._pending = null;
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
  addEscapeState.ptB = hit;
  addEscapeCompute();
}

function addEscapeEnter() {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) { showToast('请先设置主轨迹', 'error'); return; }
  beginRuntimeInteraction('escape', 'select-a', main, {
    onEvent: handleEscapeInteractionEvent,
    onCancel: opts => addEscapeExit(opts),
  });
  addEscapeState.active = true;
  addEscapeState.trailId = main.id;
  const btn = document.getElementById('add-escape-btn');
  if(btn) btn.classList.add('on');
  addEscapeState.ptA = null;
  addEscapeState.ptB = null;
  addEscapeState._pending = null;
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
  addEscapeState.active = false;
  addEscapeState.trailId = null;
  const btn = document.getElementById('add-escape-btn');
  if(btn) btn.classList.remove('on');
  addEscapeState.ptA = null;
  addEscapeState.ptB = null;
  addEscapeState._pending = null;
  if(addEscapeState.layer) addEscapeState.layer.clearLayers();
  document.getElementById('addescape-panel').style.display = 'none';
  map.getContainer().style.cursor = '';
}

function addEscapeReset() {
  addEscapeState.ptA = null;
  addEscapeState.ptB = null;
  addEscapeState._pending = null;
  if(addEscapeState.layer) addEscapeState.layer.clearLayers();
  document.getElementById('addescape-result').style.display = 'none';
  document.getElementById('addescape-hint').innerHTML =
    '在地图上点击 <b style="color:#22c55e">起点 A</b>，再点击 <b style="color:#ef4444">终点 B</b>。<br><span style="font-size:10px">系统自动找最近的轨迹段作为路线依据。</span>';
  setRuntimeInteractionPhase('escape', 'select-a');
}

function addEscapeCompute() {
  const a = addEscapeState.ptA, b = addEscapeState.ptB;
  if(!a || !b) return;

  // 找两点共同最近的轨迹（优先同一条；若不同条，选 A 所在轨迹）
  let refTrailId = a.trailId;
  // 如果 B 在同一轨迹上，直接用该轨迹；否则也用 A 的轨迹（B 已 snap 到该轨迹）
  // 重新 snap B 到 refTrail 上
  const refTrail = DATA.trails.find(t => t.id === refTrailId);
  if(!refTrail) return;

  // 在 refTrail.track 上找 A、B 最近点
  function snapToTrail(lat, lng, track) {
    let best = 0, bestD = Infinity;
    for(let i = 0; i < track.length; i++) {
      const d = haversine(lat, lng, track[i][0], track[i][1]);
      if(d < bestD) { bestD = d; best = i; }
    }
    return { idx: best, pt: track[best] };
  }
  const snapA = snapToTrail(a.lat, a.lng, refTrail.track);
  const snapB = snapToTrail(b.lat, b.lng, refTrail.track);

  if(snapA.idx === snapB.idx) {
    showToast('两点太近，请重新选择', 'error'); return;
  }

  const i1 = Math.min(snapA.idx, snapB.idx);
  const i2 = Math.max(snapA.idx, snapB.idx);
  const seg = refTrail.track.slice(i1, i2 + 1);

  // 计算里程
  let dist_m = 0;
  for(let i = 1; i < seg.length; i++) {
    dist_m += haversine(seg[i-1][0], seg[i-1][1], seg[i][0], seg[i][1]);
  }
  const elevs = seg.map(p => p[2] || 0);
  const asc = Math.round((accumulatorAscent(elevs, 10) || [0]).slice(-1)[0]);
  const desc = Math.round((accumulatorDescent(elevs, 10) || [0]).slice(-1)[0]);
  const drop = Math.round(snapA.pt[2] - snapB.pt[2]);
  const km = +(dist_m / 1000).toFixed(1);

  // 抽稀构建 line
  const line = [];
  for(let i = 0; i < seg.length; i += Math.max(1, Math.floor(seg.length / 200))) {
    line.push([+seg[i][0].toFixed(6), +seg[i][1].toFixed(6)]);
  }
  if(line[line.length-1][0] !== seg[seg.length-1][0]) {
    line.push([+seg[seg.length-1][0].toFixed(6), +seg[seg.length-1][1].toFixed(6)]);
  }

  // 预览高亮
  addEscapeState.layer.clearLayers();
  L.circleMarker([snapA.pt[0], snapA.pt[1]], {radius:8, color:'#fff', weight:2, fillColor:'#22c55e', fillOpacity:1})
    .bindTooltip('A（起点）', {permanent:true, direction:'top', offset:[0,-8], className:'measure-tip'})
    .addTo(addEscapeState.layer);
  L.circleMarker([snapB.pt[0], snapB.pt[1]], {radius:8, color:'#fff', weight:2, fillColor:'#ef4444', fillOpacity:1})
    .bindTooltip('B（终点）', {permanent:true, direction:'top', offset:[0,-8], className:'measure-tip'})
    .addTo(addEscapeState.layer);
  L.polyline(line, {color:'#f87171', weight:5, opacity:0.9, dashArray:'10,7'}).addTo(addEscapeState.layer);
  map.flyToBounds(L.latLngBounds(line).pad(0.2), {duration:0.6});

  // 填充面板
  document.getElementById('ae-dist').textContent = km + ' km';
  document.getElementById('ae-trail').textContent = refTrail.name;
  document.getElementById('ae-asc').textContent = asc + ' m';
  document.getElementById('ae-desc').textContent = desc + ' m';
  document.getElementById('ae-eA').textContent = Math.round(snapA.pt[2] || 0) + ' m';
  document.getElementById('ae-eB').textContent = Math.round(snapB.pt[2] || 0) + ' m';

  const autoName = `手动下撤 A→B（${refTrail.name}，${km}km）`;
  document.getElementById('addescape-name').value = autoName;
  document.getElementById('addescape-result').style.display = 'block';
  document.getElementById('addescape-hint').textContent = '✓ 路线已预览。确认后点击「保存」。';

  const direction = snapA.idx < snapB.idx ? '正向' : '逆向（反方向）';
  addEscapeState._pending = {
    id: `manual-escape-${Date.now()}`,
    name: autoName,
    desc: `手动选点 · ${direction} · 依据轨迹《${refTrail.name}》，沿轨迹约 ${km}km，落差 ${Math.abs(drop)}m（${drop > 0 ? '下降' : drop < 0 ? '上升' : '平路'}）。↑${asc}m ↓${desc}m`,
    distance_km: km, drop_m: drop, line,
    _manual: true,
    _anchor: { trailId: refTrailId, trailName: refTrail.name },
  };
  setRuntimeInteractionPhase('escape', 'preview');
  return true;
}

function addEscapeCommit() {
  const pending = addEscapeState._pending;
  if(!pending) return;
  const trail = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!trail) { showToast('请先设置主轨迹', 'error'); return; }
  if(!trail.escape_routes) trail.escape_routes = [];
  if(!setRuntimeInteractionPhase('escape', 'committing')) return;
  // 用用户填写的名称覆盖
  const nameInput = document.getElementById('addescape-name').value.trim();
  if(nameInput) {
    pending.name = nameInput;
    pending.desc = pending.desc.replace(/^手动选点.*?）/, `${nameInput}`).replace(/^[^·]+·/, `${nameInput} ·`);
    // 重写 desc 更简洁
    pending.desc = `手动标注 · 依据轨迹《${pending._anchor.trailName}》，沿轨迹约 ${pending.distance_km}km，落差 ${Math.abs(pending.drop_m)}m（${pending.drop_m > 0 ? '下降' : pending.drop_m < 0 ? '上升' : '平路'}）。`;
    pending.name = nameInput;
  }
  // 去重（同 id）
  trail.escape_routes = trail.escape_routes.filter(r => r.id !== pending.id);
  trail.escape_routes.push(pending);
  markTrailRevision(trail);
  saveToStorage();
  buildEscapeTab();
  showToast(`✓ 下撤路线「${pending.name}」已保存`);
  addEscapeExit({reason:'committed'});
}

// 按钮绑定
document.getElementById('addescape-close').addEventListener('click', addEscapeExit);
document.getElementById('addescape-exit').addEventListener('click', addEscapeExit);
document.getElementById('addescape-reset').addEventListener('click', addEscapeReset);
document.getElementById('addescape-commit').addEventListener('click', addEscapeCommit);
