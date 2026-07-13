// @ts-nocheck
// Transitional classic fragments owned by DOM modal orchestration.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment ui.help */
function showHelp() {
  let modal = document.getElementById('help-modal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'help-modal';
    modal.className = 'modal-mask';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:640px;max-height:85vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3 data-i18n="help.title" style="margin:0">${t('help.title')}</h3>
          <button class="btn-mini" data-modal-close data-i18n="changelog.close">${t('changelog.close')}</button>
        </div>
        <div id="help-body" style="font-size:12px;line-height:1.7;color:var(--text-base)"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('[data-modal-close]')?.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
  }
  const body = modal.querySelector('#help-body');
  const isZh = currentLang === 'zh';
  body.innerHTML = isZh ? `
    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📌 这是什么</h4>
    <p>多条徒步路线在同一张地图上对比的工具。支持 KML 文件导入（两步路、Strava、Gaia GPS、Garmin、All Trails 等所有户外平台均可导出 KML）。</p>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">🚀 基本流程</h4>
    <ol style="padding-left:18px;margin:6px 0">
      <li>点 <b>+ 添加轨迹</b> 上传一个或多个 KML 文件</li>
      <li>导入时直接编辑轨迹的 <b>ID</b> 和 <b>来源链接</b></li>
      <li>第一条自动设为主轨迹，可在轨迹列表点 <b>设为主轨迹</b> 切换</li>
      <li>点 <b>📤 导出</b>：打包当前组轨迹为 KML ZIP（可跨设备一键导入），或导出行程 MD</li>
    </ol>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">🎨 显示模式</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>海拔模式</b>：蓝→红表示低→高，看起伏</li>
      <li><b>标注点模式</b>：主轨迹海拔渐变 + 其他轨迹浅虚线，勾选类别标注点对比显示</li>
      <li><b>行程页</b>：点击“行程”后地图自动按天分色</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">🛠 顶部按钮</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>❓ 帮助</b>：打开本说明</li>
      <li><b>🎯 复位</b>：地图回到主轨迹中心 + 适合缩放</li>
      <li><b>🗑 清空</b>：删除所有轨迹（带确认）</li>
      <li><b>📤 导出</b>：打包当前组轨迹为 KML ZIP，或行程 MD</li>
      <li><b>📏 测距</b>：在主轨迹上选两点，计算里程 / 爬升 / 下降（见下方详细说明）</li>
      <li><b>📍 标注</b>：在主轨迹附近点选新增手动标注点</li>
      <li><b>⚡ 下撤</b>：手动选择 A/B 生成下撤路线</li>
      <li><b>+ 轨迹</b>：上传新 KML</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📏 测距工具</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>点 <b>📏 测距</b> 进入测距模式（鼠标变十字准线）</li>
      <li>在地图主轨迹上点击 <b>A 点</b>，再点击 <b>B 点</b></li>
      <li>也可以直接 <b>点击右下角海拔图</b> 在地图上定位对应点</li>
      <li>海拔图内直接标注 <b>A/B</b> 海拔，最高点/最低点仅用红蓝点区分；里程单独显示，爬升/下降使用右上统计位</li>
      <li>测距浮动按钮保留 <b>🔄 重新选点</b>、<b>⇄ 反向</b> 与 <b>✕ 退出</b></li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">⇄ 轨迹反向</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>轨迹卡片底部点 <b>⇄ 反向</b>，翻转走向</li>
      <li>里程 / 爬升 / 下降 / 天数分色 / 标注点 km 全部重算</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📊 右下角海拔图</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>默认显示主轨迹完整海拔剖面（左下角悬浮卡片）</li>
      <li>测距模式选完 A/B 后自动切换为 <b>路段海拔图</b>，退出恢复</li>
      <li>图内 <b>Hover</b>：十字准线 + 里程/海拔/爬升提示</li>
      <li>图内 <b>点击</b>：地图标记并 panTo 对应轨迹点（3 秒消失）</li>
      <li>图内显示当前路段 <b>↑爬升 / ↓下降</b> 与测距结果</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📍 标注点交互</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>点击</b>：固定显示卡片（× 关闭）</li>
      <li>卡片中 <b>点击图片</b>：全屏放大，支持双指/滚轮缩放 + 拖动</li>
      <li><b>右键</b>地图可手动添加标注点（标记 [手动]）</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📋 侧栏 4 个 Tab</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>轨迹</b>：列出所有轨迹，可设主、改 ID/链接、反向、删除、显示/隐藏</li>
      <li><b>标注点</b>：勾选要显示的标注点类别</li>
      <li><b>行程</b>：主轨迹按天列表 + 营地/最高点</li>
      <li><b>下撤</b>：自动检测营地→最近出口的下撤路线（点击高亮）</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">💡 提示</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>顶部栏显示 <b>当前主轨迹</b> 的里程/爬升/下降/最高</li>
      <li>侧栏 <b>⟩</b> 收起；地图右侧 <b>⟨</b> 展开；海拔图位置自动跟随</li>
      <li><b>双击</b>标题可改名</li>
      <li>右下角 <b>${APP_VERSION} 📝</b> 查看完整更新日志</li>
      <li>数据存 IndexedDB，刷新不丢，导出可离线分享</li>
    </ul>
  ` : `
    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📌 What is this</h4>
    <p>Compare multiple hiking trails on one map. Supports KML from 2bulu, Strava, Gaia GPS, Garmin, All Trails, and any outdoor platform.</p>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">🚀 Quick Start</h4>
    <ol style="padding-left:18px;margin:6px 0">
      <li>Click <b>+ Add Trail</b> to upload KML files</li>
      <li>Edit trail <b>ID</b> and <b>source URL</b> in the upload panel</li>
      <li>First trail becomes main; click <b>Set as Main</b> to switch</li>
      <li>Click <b>📤 Export</b> to save as a single offline HTML</li>
    </ol>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">🎨 Display Modes</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>Elevation</b>: blue→red = low→high</li>
      <li><b>Waypoints</b>: main trail elevation gradient, others dashed</li>
      <li><b>Itinerary</b>: opening the Itinerary tab automatically colors the map by day</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">🛠 Top Buttons</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>❓ Help</b>: this guide</li>
      <li><b>🎯 Reset</b>: zoom to main trail</li>
      <li><b>🗑 Clear</b>: remove all trails (confirm)</li>
      <li><b>📤 Export</b>: pack active group as KML ZIP, or itinerary MD</li>
      <li><b>📏 Measure</b>: pick two points on main trail → distance / ascent / descent</li>
      <li><b>📍 Mark</b>: add a manual waypoint near the primary trail</li>
      <li><b>⚡ Escape</b>: manually pick A/B for an escape route</li>
      <li><b>+ Trail</b>: upload new KML</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📏 Measure Tool</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>Click <b>📏 Measure</b> → crosshair cursor</li>
      <li>Click <b>point A</b> then <b>point B</b> on the main trail</li>
      <li>Or click the <b>elevation chart</b> to pan to any point</li>
      <li>The elevation chart labels <b>A/B</b> elevations directly; high and low points are color dots only, with distance separate and ascent/descent in the top-right stats</li>
      <li>The measure floating controls only keep <b>🔄 Reset</b> and <b>✕ Exit</b></li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">⇄ Reverse Trail</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>Click <b>⇄ Reverse</b> on any trail card to flip direction</li>
      <li>Distance / ascent / descent / day colors / waypoint km all recalculated</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📊 Elevation Chart (bottom-right)</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>Always shows main trail elevation profile</li>
      <li>In measure mode with A+B: switches to <b>segment view</b>, restores on exit</li>
      <li><b>Hover</b>: crosshair + km / elev / cumulative ascent tooltip</li>
      <li><b>Click</b>: map marker + panTo corresponding point (3s auto-remove)</li>
      <li>The chart shows <b>↑ascent / ↓descent</b> plus measure stats for the current view</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📍 Waypoints</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>Click</b>: pin card (× to close)</li>
      <li><b>Click photo</b>: fullscreen with pinch/scroll zoom + drag</li>
      <li><b>Right-click map</b>: add manual waypoint</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📋 Sidebar Tabs</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>Trails</b>: set main, edit, reverse, delete, toggle visibility</li>
      <li><b>Waypoints</b>: filter categories</li>
      <li><b>Itinerary</b>: day breakdown for main trail</li>
      <li><b>Escape</b>: auto-detected camp→exit routes (click to highlight)</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">💡 Tips</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>Header shows <b>current main trail</b> stats only</li>
      <li>Sidebar <b>⟩</b> collapse; map edge <b>⟨</b> expand; elevation chart auto-follows</li>
      <li><b>Double-click</b> title to rename</li>
      <li>Bottom-right <b>${APP_VERSION} 📝</b> for changelog</li>
      <li>Data in IndexedDB (refresh-safe); export for offline sharing</li>
    </ul>
  `;
  modal.classList.add('open');
}



/* @runtime-fragment ui.lightbox */
/* ============ Lightbox ============ */
const lightboxEl = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCap = document.getElementById('lightbox-caption');

// ── Lightbox 内置缩放/拖动状态 ──
const lbState = { scale: 1, tx: 0, ty: 0, startDist: 0, startScale: 1, startTx: 0, startTy: 0, startCx: 0, startCy: 0, dragging: false, pinching: false };

function lbApply() {
  lightboxImg.style.transform = `translate(${lbState.tx}px,${lbState.ty}px) scale(${lbState.scale})`;
}
function lbReset() {
  lbState.scale = 1; lbState.tx = 0; lbState.ty = 0;
  lightboxImg.style.transition = 'transform 0.2s ease-out';
  lbApply();
  setTimeout(() => { lightboxImg.style.transition = 'transform 0.15s ease-out'; }, 220);
}

function openLightbox(src, caption) {
  lightboxImg.src = decodeURIComponent(src);
  lightboxCap.textContent = decodeURIComponent(caption || '');
  lightboxEl.style.display = 'flex';
  lbReset();
}
function closeLightbox() {
  lightboxEl.style.display = 'none';
  lbReset();
  // 兜底：如果 visual viewport 被意外缩放（旧版浏览器），强制滚回顶部
  try {
    if(window.visualViewport && Math.abs(window.visualViewport.scale - 1) > 0.01) {
      window.scrollTo({top: 0, left: 0, behavior: 'instant'});
      // iOS Safari: 通过给 body 加 zoom hack 强制重置
      document.body.style.zoom = 1;
    }
  } catch(e) {}
}

// 点击背景关闭，但不要在拖拽/缩放后误关
lightboxEl.addEventListener('click', e => {
  if(e.target === lightboxImg) return;     // 点图本身不关
  if(lbState.dragging || lbState.pinching) return;
  closeLightbox();
});
// 双击图片 → 切换 1x / 2.5x
// 禁止 lightbox 内容被选中（双击放大时浏览器会选中元素）
lightboxEl.addEventListener('selectstart', e => e.preventDefault());
lightboxEl.addEventListener('mousedown', e => { if(e.detail >= 2) e.preventDefault(); }); // 双击时阻止选中

lightboxImg.addEventListener('dblclick', e => {
  e.preventDefault(); e.stopPropagation();
  if(lbState.scale > 1.05) lbReset();
  else { lbState.scale = 2.5; lbApply(); }
});

// 滚轮缩放（桌面）
lightboxEl.addEventListener('wheel', e => {
  e.preventDefault();
  const delta = -e.deltaY * 0.002;
  const newScale = Math.max(1, Math.min(6, lbState.scale * (1 + delta)));
  lbState.scale = newScale;
  if(newScale === 1) { lbState.tx = 0; lbState.ty = 0; }
  lbApply();
}, {passive: false});

// 鼠标拖动（缩放后才能拖）
let lbMouseDown = false;
lightboxImg.addEventListener('mousedown', e => {
  if(lbState.scale <= 1.05) return;
  e.preventDefault();
  lbMouseDown = true;
  lbState.startCx = e.clientX; lbState.startCy = e.clientY;
  lbState.startTx = lbState.tx; lbState.startTy = lbState.ty;
  lightboxImg.style.transition = 'none';
});
window.addEventListener('mousemove', e => {
  if(!lbMouseDown) return;
  lbState.tx = lbState.startTx + (e.clientX - lbState.startCx);
  lbState.ty = lbState.startTy + (e.clientY - lbState.startCy);
  lbApply();
});
window.addEventListener('mouseup', () => {
  if(lbMouseDown) { lbMouseDown = false; lightboxImg.style.transition = 'transform 0.15s ease-out'; }
});

// ── 触摸：pinch zoom + pan，阻止页面级缩放 ──
function lbTouchDist(t1, t2) { return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY); }
function lbTouchCenter(t1, t2) { return { x: (t1.clientX + t2.clientX)/2, y: (t1.clientY + t2.clientY)/2 }; }

lightboxEl.addEventListener('touchstart', e => {
  e.preventDefault(); // 阻断页面级 pinch
  if(e.touches.length === 2) {
    lbState.pinching = true;
    lbState.startDist = lbTouchDist(e.touches[0], e.touches[1]);
    lbState.startScale = lbState.scale;
    const c = lbTouchCenter(e.touches[0], e.touches[1]);
    lbState.startCx = c.x; lbState.startCy = c.y;
    lbState.startTx = lbState.tx; lbState.startTy = lbState.ty;
    lightboxImg.style.transition = 'none';
  } else if(e.touches.length === 1 && lbState.scale > 1.05) {
    lbState.dragging = true;
    lbState.startCx = e.touches[0].clientX; lbState.startCy = e.touches[0].clientY;
    lbState.startTx = lbState.tx; lbState.startTy = lbState.ty;
    lightboxImg.style.transition = 'none';
  }
}, {passive: false});

lightboxEl.addEventListener('touchmove', e => {
  e.preventDefault();
  if(e.touches.length === 2 && lbState.pinching) {
    const dist = lbTouchDist(e.touches[0], e.touches[1]);
    const newScale = Math.max(1, Math.min(6, lbState.startScale * (dist / lbState.startDist)));
    lbState.scale = newScale;
    lbApply();
  } else if(e.touches.length === 1 && lbState.dragging) {
    lbState.tx = lbState.startTx + (e.touches[0].clientX - lbState.startCx);
    lbState.ty = lbState.startTy + (e.touches[0].clientY - lbState.startCy);
    lbApply();
  }
}, {passive: false});

lightboxEl.addEventListener('touchend', e => {
  if(e.touches.length === 0) {
    setTimeout(() => { lbState.pinching = false; lbState.dragging = false; }, 50);
    lightboxImg.style.transition = 'transform 0.15s ease-out';
    if(lbState.scale < 1.02) { lbState.scale = 1; lbState.tx = 0; lbState.ty = 0; lbApply(); }
  }
}, {passive: false});

// 阻止 iOS Safari 的 gesturestart 触发页面级缩放
lightboxEl.addEventListener('gesturestart', e => e.preventDefault());
lightboxEl.addEventListener('gesturechange', e => e.preventDefault());
lightboxEl.addEventListener('gestureend', e => e.preventDefault());

/* @runtime-fragment ui.sidebar */
/* ============ Build sidebar ============ */
function buildHeaderStats() {
  const card = document.getElementById('primary-card');
  const toolbarContext = document.getElementById('toolbar-context');
  if(!card) return;
  const main = state.activeGroup == null ? null : DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main) {
    // v1.20.0：区分"未选中分组"和"没有轨迹/主轨迹"两种空态
    const emptyKey = (state.activeGroup == null && DATA.trails.length > 0)
      ? 'pc.emptyGroup'
      : 'pc.empty';
    card.innerHTML = `<div style="font-size:11px;color:var(--text-muted);font-style:italic;text-align:center;padding:20px 4px">${t(emptyKey)}</div>`;
    if(toolbarContext) toolbarContext.textContent = DATA.trails.length ? 'NO ACTIVE GROUP' : 'NO TRAIL LOADED';
    return;
  }
  if(toolbarContext) toolbarContext.textContent = `${main.stats.distance_km} KM · ${main.name}`;
  const sourceLink = main.source && main.source.startsWith('http')
    ? `<a href="${main.source}" target="_blank" class="pc-link" title="${main.source}">${t('pc.source')}</a>` : '';
  card.innerHTML = `
    <div class="pc-eyebrow">${t('pc.eyebrow')}</div>
    <div class="pc-name" id="pc-name" title="点击重命名" style="cursor:pointer">${main.name}</div>
    <div class="pc-stats">
      <div class="pc-stat"><b>${main.stats.distance_km}</b><span>${t('pc.distance')}</span></div>
      <div class="pc-stat"><b>${main.days || '-'}</b><span>${(main.days||1) > 1 ? t('pc.daysUnit') : t('pc.dayUnit')}</span></div>
      <div class="pc-stat"><b>${main.stats.ascent_m}</b><span>${t('pc.ascent')}</span></div>
      <div class="pc-stat"><b>${main.stats.descent_m || 0}</b><span>${t('pc.descent')}</span></div>
      <div class="pc-stat"><b>${main.stats.max_elev}</b><span>${t('pc.maxElev')}</span></div>
      <div class="pc-stat"><b>${main.stats.min_elev || '-'}</b><span>${t('pc.minElev')}</span></div>
    </div>
    <div class="pc-actions">
      <a href="#" class="pc-dl-kml" id="pc-dl-kml" title="下载 KML">${t('pc.dlKml')}</a>
      ${sourceLink}
      <a href="#" class="pc-edit-link" id="pc-edit-link" title="编辑链接">${t('pc.editLink')}</a>
    </div>
  `;
  // 绑定事件
  const renameEl = document.getElementById('pc-name');
  if(renameEl) renameEl.addEventListener('click', async () => {
    const newName = await studioDialogs.prompt({
      title:currentLang === 'zh' ? '重命名主轨迹' : 'Rename primary trail',
      inputLabel:currentLang === 'zh' ? '轨迹名称' : 'Trail name',
      value:main.name,
      required:true,
      selectOnOpen:true,
      confirmLabel:currentLang === 'zh' ? '保存' : 'Save',
      cancelLabel:currentLang === 'zh' ? '取消' : 'Cancel',
    });
    if(newName && newName.trim() && newName !== main.name) {
      main.name = newName.trim();
      saveToStorage(); rebuildAll({fit: false});
    }
  });
  const dlBtn = document.getElementById('pc-dl-kml');
  if(dlBtn) dlBtn.addEventListener('click', e => {
    e.preventDefault();
    if(window.downloadTrailKml) window.downloadTrailKml(main.id);
    else if(typeof downloadTrailKML === 'function') downloadTrailKML(main.id);
  });
  const editLinkBtn = document.getElementById('pc-edit-link');
  if(editLinkBtn) editLinkBtn.addEventListener('click', async e => {
    e.preventDefault();
    const newLink = await studioDialogs.prompt({
      title:currentLang === 'zh' ? '编辑来源链接' : 'Edit source link',
      inputLabel:'URL',
      value:main.source || '',
      selectOnOpen:true,
      confirmLabel:currentLang === 'zh' ? '保存' : 'Save',
      cancelLabel:currentLang === 'zh' ? '取消' : 'Cancel',
    });
    if(newLink !== null) {
      main.source = newLink.trim();
      saveToStorage(); buildHeaderStats();
    }
  });
  // 同步小卡（侧栏收起时显示）
  buildPrimaryMini();
}

const PRIMARY_MINI_POS_KEY = 'hiking_primary_mini_pos';

function clampPrimaryMiniPosition(mini, left, top) {
  const mapEl = document.getElementById('map');
  if(!mapEl) return { left, top };
  const mapRect = mapEl.getBoundingClientRect();
  const miniRect = mini.getBoundingClientRect();
  const w = miniRect.width || 240;
  const h = miniRect.height || 92;
  const margin = 8;
  const maxLeft = Math.max(margin, mapRect.width - w - margin);
  const maxTop = Math.max(margin, mapRect.height - h - margin);
  return {
    left: Math.min(Math.max(margin, left), maxLeft),
    top: Math.min(Math.max(margin, top), maxTop),
  };
}

function applyPrimaryMiniPosition(mini) {
  if(!mini) return;
  try {
    const raw = localStorage.getItem(PRIMARY_MINI_POS_KEY);
    if(!raw) return;
    const pos = JSON.parse(raw);
    if(!pos || !isFinite(pos.left) || !isFinite(pos.top)) return;
    const p = clampPrimaryMiniPosition(mini, pos.left, pos.top);
    mini.style.left = p.left + 'px';
    mini.style.top = p.top + 'px';
    mini.style.right = 'auto';
  } catch(e) {}
}

function schedulePrimaryMiniPositionApply(mini) {
  if(!mini) return;
  requestAnimationFrame(() => applyPrimaryMiniPosition(mini));
  setTimeout(() => applyPrimaryMiniPosition(mini), 280);
  setTimeout(() => applyPrimaryMiniPosition(mini), 360);
}

function savePrimaryMiniPosition(mini) {
  const mapEl = document.getElementById('map');
  if(!mini || !mapEl) return;
  const mapRect = mapEl.getBoundingClientRect();
  const miniRect = mini.getBoundingClientRect();
  try {
    localStorage.setItem(PRIMARY_MINI_POS_KEY, JSON.stringify({
      left: Math.round(miniRect.left - mapRect.left),
      top: Math.round(miniRect.top - mapRect.top),
    }));
  } catch(e) {}
}

function bindPrimaryMiniDrag(mini) {
  if(!mini || mini._dragBound) return;
  mini._dragBound = true;
  let drag = null;

  mini.addEventListener('pointerdown', e => {
    if(e.button !== undefined && e.button !== 0) return;
    const mapEl = document.getElementById('map');
    if(!mapEl) return;
    const mapRect = mapEl.getBoundingClientRect();
    const miniRect = mini.getBoundingClientRect();
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      left: miniRect.left - mapRect.left,
      top: miniRect.top - mapRect.top,
      moved: false,
    };
    mini.setPointerCapture && mini.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  });

  mini.addEventListener('pointermove', e => {
    if(!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if(!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    mini.classList.add('dragging');
    const p = clampPrimaryMiniPosition(mini, drag.left + dx, drag.top + dy);
    mini.style.left = p.left + 'px';
    mini.style.top = p.top + 'px';
    mini.style.right = 'auto';
    e.preventDefault();
    e.stopPropagation();
  });

  const finish = (e, cancelled = false) => {
    if(!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    mini.classList.remove('dragging');
    try { mini.releasePointerCapture && mini.releasePointerCapture(e.pointerId); } catch(err) {}
    e.preventDefault();
    e.stopPropagation();
    if(moved) savePrimaryMiniPosition(mini);
    else if(!cancelled && typeof toggleSidebar === 'function') toggleSidebar(true);
  };
  mini.addEventListener('pointerup', e => finish(e, false));
  mini.addEventListener('pointercancel', e => finish(e, true));
}

function buildPrimaryMini() {
  const mini = document.getElementById('primary-mini');
  if(!mini) return false;
  const main = state.activeGroup == null ? null : DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main) {
    mini.innerHTML = '';
    mini.style.display = 'none';
    return false;
  }
  mini.title = t('mini.openSidebar') + ' / 拖动可移动';
  mini.innerHTML = `
    <div style="font-size:9px;color:#7A6E54;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:4px">${t('mini.primary')}</div>
    <div style="font-size:13px;font-weight:600;color:#1F2A1C;line-height:1.3;margin-bottom:6px;font-family:var(--serif)">${main.name}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 8px;font-size:10px;color:#3F5238">
      <div><b style="font-size:13px;color:#1F2A1C;font-family:var(--serif)">${main.stats.distance_km}</b> ${t('mini.km')}</div>
      <div><b style="font-size:13px;color:#1F2A1C;font-family:var(--serif)">${main.stats.ascent_m}</b> ${t('mini.ascent')}</div>
      <div><b style="font-size:13px;color:#1F2A1C;font-family:var(--serif)">${main.stats.max_elev}</b> ${t('mini.peak')}</div>
    </div>
  `;
  applyPrimaryMiniPosition(mini);
  bindPrimaryMiniDrag(mini);
  return true;
}

function floatingBoundaryRect(mode) {
  if(mode === 'map') {
    const mapEl = document.getElementById('map');
    if(mapEl) return mapEl.getBoundingClientRect();
  }
  return { left:0, top:0, width:window.innerWidth, height:window.innerHeight };
}

function floatingStyleOriginRect(el) {
  if(!el || !el.offsetParent) return { left:0, top:0 };
  return el.offsetParent.getBoundingClientRect();
}

function clampFloatingPanelPosition(el, left, top, mode) {
  const rect = el.getBoundingClientRect();
  const bounds = floatingBoundaryRect(mode);
  const margin = 8;
  const w = rect.width || el.offsetWidth || 300;
  const h = rect.height || el.offsetHeight || 120;
  const maxLeft = Math.max(margin, bounds.width - w - margin);
  const maxTop = Math.max(margin, bounds.height - h - margin);
  return {
    left: Math.min(Math.max(margin, left), maxLeft),
    top: Math.min(Math.max(margin, top), maxTop),
  };
}

function setFloatingPanelStyle(el, pos, mode) {
  const bounds = floatingBoundaryRect(mode);
  const origin = floatingStyleOriginRect(el);
  el.style.left = (bounds.left - origin.left + pos.left) + 'px';
  el.style.top = (bounds.top - origin.top + pos.top) + 'px';
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.style.transform = 'none';
}

function applyFloatingPanelPosition(el, opts) {
  if(!el || !opts || !opts.storageKey) return;
  try {
    const raw = localStorage.getItem(opts.storageKey);
    if(!raw) return;
    const pos = JSON.parse(raw);
    if(!pos || !isFinite(pos.left) || !isFinite(pos.top)) return;
    const p = clampFloatingPanelPosition(el, pos.left, pos.top, opts.mode);
    setFloatingPanelStyle(el, p, opts.mode);
  } catch(e) {}
}

function resetFloatingPanelPosition(el, opts) {
  if(!el || !opts) return;
  try { if(opts.storageKey) localStorage.removeItem(opts.storageKey); } catch(e) {}
  const defaults = opts.defaultStyle || {};
  ['left','right','top','bottom','transform'].forEach(k => {
    el.style[k] = defaults[k] != null ? defaults[k] : '';
  });
}

function bindFloatingPanelDrag(el, opts) {
  if(!el || el._floatingDragBound) return;
  el._floatingDragBound = true;
  const handle = opts.handleSelector ? el.querySelector(opts.handleSelector) : el;
  if(!handle) return;
  let drag = null;
  el._applyFloatingPosition = () => applyFloatingPanelPosition(el, opts);
  el._resetFloatingPosition = () => resetFloatingPanelPosition(el, opts);
  if(typeof L !== 'undefined' && L.DomEvent) {
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }

  handle.addEventListener('pointerdown', e => {
    if(e.button !== undefined && e.button !== 0) return;
    if(e.target && e.target.closest && e.target.closest('button,a,input,textarea,select')) return;
    const bounds = floatingBoundaryRect(opts.mode);
    const rect = el.getBoundingClientRect();
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      left: rect.left - bounds.left,
      top: rect.top - bounds.top,
      moved: false,
    };
    handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  });

  handle.addEventListener('pointermove', e => {
    if(!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if(!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    el.classList.add('floating-dragging');
    const p = clampFloatingPanelPosition(el, drag.left + dx, drag.top + dy, opts.mode);
    setFloatingPanelStyle(el, p, opts.mode);
    e.preventDefault();
    e.stopPropagation();
  });

  const finish = e => {
    if(!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    el.classList.remove('floating-dragging');
    try { handle.releasePointerCapture && handle.releasePointerCapture(e.pointerId); } catch(err) {}
    e.preventDefault();
    e.stopPropagation();
    if(moved && opts.storageKey) {
      const bounds = floatingBoundaryRect(opts.mode);
      const rect = el.getBoundingClientRect();
      const p = clampFloatingPanelPosition(el, rect.left - bounds.left, rect.top - bounds.top, opts.mode);
      try { localStorage.setItem(opts.storageKey, JSON.stringify({left:Math.round(p.left), top:Math.round(p.top)})); } catch(err) {}
    }
  };
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', finish);
  handle.addEventListener('dblclick', e => {
    if(e.target && e.target.closest && e.target.closest('button,a,input,textarea,select')) return;
    e.preventDefault();
    e.stopPropagation();
    resetFloatingPanelPosition(el, opts);
  });
  applyFloatingPanelPosition(el, opts);
}

function initFloatingPanelPositions() {
  bindFloatingPanelDrag(document.getElementById('elev-bar'), {
    storageKey: 'hiking_elev_bar_pos',
    mode: 'map',
    handleSelector: '[data-panel-drag]',
    defaultStyle: { left:'14px', right:'auto', top:'auto', bottom:'28px', transform:'' },
  });
  bindFloatingPanelDrag(document.getElementById('measure-panel'), {
    storageKey: 'hiking_measure_panel_pos',
    mode: 'viewport',
    handleSelector: '[data-panel-drag]',
    defaultStyle: { left:'50%', right:'auto', top:'80px', bottom:'auto', transform:'translateX(-50%)' },
  });
}

// 更新当前模式 · 标注点 标题
function updateModeTagTitle() {
  const el = document.getElementById('mode-tag-title');
  if(!el) return;
  const key = 'mode.tagTitle.' + state.mode;
  el.textContent = t(key);
}

// 生成轨迹缩略图：左侧轨迹形状（GPS 平面投影 + 类等高线底） + 右侧海拔迷你图
function buildTrailThumbnail(tr) {
  const W = 280, H = 60;
  const pad = 4;
  const track = tr.track || [];
  if(track.length < 2) return '';
  // 左侧 33% 区域：地图轨迹（lat/lng 投影到 box）
  const mapW = Math.floor(W * 0.34) - pad * 2;
  const mapH = H - pad * 2;
  const lats = track.map(p => p[0]);
  const lngs = track.map(p => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latR = maxLat - minLat || 1, lngR = maxLng - minLng || 1;
  // 等比缩放
  const aspectMap = mapW / mapH;
  const aspectGeo = lngR / latR;
  let mw, mh;
  if(aspectGeo > aspectMap) { mw = mapW; mh = mapW / aspectGeo; }
  else { mh = mapH; mw = mapH * aspectGeo; }
  const mox = pad + (mapW - mw) / 2;
  const moy = pad + (mapH - mh) / 2;
  const proj = (lat, lng) => [
    mox + ((lng - minLng) / lngR) * mw,
    moy + (1 - (lat - minLat) / latR) * mh,
  ];
  // 抽稀：最多 80 个点
  const stride = Math.max(1, Math.floor(track.length / 80));
  const mapPts = [];
  for(let i = 0; i < track.length; i += stride) mapPts.push(proj(track[i][0], track[i][1]));
  if(mapPts[mapPts.length-1][0] !== proj(track[track.length-1][0], track[track.length-1][1])[0])
    mapPts.push(proj(track[track.length-1][0], track[track.length-1][1]));
  const mapPath = 'M ' + mapPts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L ');
  // 起终点
  const startPt = mapPts[0], endPt = mapPts[mapPts.length-1];
  // 山顶（最高海拔点）在地图上的位置
  let peakIdxAll = 0, maxAlt = -Infinity;
  for(let i=0; i<track.length; i++) {
    if((track[i][2] || 0) > maxAlt) { maxAlt = track[i][2] || 0; peakIdxAll = i; }
  }
  const peakMapPt = proj(track[peakIdxAll][0], track[peakIdxAll][1]);

  // 右侧 65% 区域：迷你海拔
  const elevX = Math.floor(W * 0.36) + pad;
  const elevW = W - elevX - pad;
  const elevH = H - pad * 2;
  const eY = pad;
  const alts = track.map(p => p[2]);
  const minE = Math.min(...alts), maxE = Math.max(...alts);
  const eR = maxE - minE || 1;
  const eStride = Math.max(1, Math.floor(track.length / 70));
  const ePts = [];
  for(let i = 0; i < track.length; i += eStride) {
    const x = elevX + (i / (track.length - 1)) * elevW;
    const y = eY + elevH * (1 - (alts[i] - minE) / eR);
    ePts.push([x, y]);
  }
  ePts.push([elevX + elevW, eY + elevH * (1 - (alts[alts.length-1] - minE) / eR)]);
  const elevPath = 'M ' + ePts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L ');
  const elevFill = elevPath + ` L ${elevX + elevW},${eY + elevH} L ${elevX},${eY + elevH} Z`;
  // 海拔图最高点
  const ePeakX = elevX + (peakIdxAll / (track.length - 1)) * elevW;
  const ePeakY = eY + elevH * (1 - (maxE - minE) / eR);
  // 最低点
  let valleyIdxAll = 0, minAlt = Infinity;
  for(let i=0; i<track.length; i++) {
    if((track[i][2] || 0) < minAlt) { minAlt = track[i][2] || 0; valleyIdxAll = i; }
  }
  const eValleyX = elevX + (valleyIdxAll / (track.length - 1)) * elevW;
  const eValleyY = eY + elevH * (1 - (minE - minE) / eR); // 最低点 y = elevH 底部

  const c = tr.color || '#3F5238';

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="width:100%;height:60px;display:block">
      <!-- 整体米色底 -->
      <rect x="0" y="0" width="${W}" height="${H}" fill="#FAF6EA" rx="3"/>
      <!-- 中间分隔线 -->
      <line x1="${Math.floor(W*0.345)}" y1="${pad}" x2="${Math.floor(W*0.345)}" y2="${H-pad}" stroke="#C8B998" stroke-width="0.5" stroke-dasharray="2,2"/>
      <!-- 左：地图轨迹 -->
      <path d="${mapPath}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      <circle cx="${startPt[0].toFixed(1)}" cy="${startPt[1].toFixed(1)}" r="2" fill="#3F5238" stroke="#fff" stroke-width="0.7"/>
      <circle cx="${endPt[0].toFixed(1)}" cy="${endPt[1].toFixed(1)}" r="2" fill="#A8543C" stroke="#fff" stroke-width="0.7"/>
      <!-- 右：海拔填充 -->
      <path d="${elevFill}" fill="${c}" opacity="0.18"/>
      <path d="${elevPath}" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      <!-- 海拔图山顶 -->
      <circle cx="${ePeakX.toFixed(1)}" cy="${ePeakY.toFixed(1)}" r="1.6" fill="#A8543C" stroke="#fff" stroke-width="0.5"/>
      <!-- 海拔 max/min 标签（min 标在最低点附近） -->
      <text x="${ePeakX+4}" y="${ePeakY+3}" font-family="'Source Serif 4',serif" font-size="8" fill="#A8543C" font-style="italic">${Math.round(maxE)}m</text>
      <circle cx="${eValleyX.toFixed(1)}" cy="${eValleyY.toFixed(1)}" r="1.4" fill="#5C7A8C" stroke="#fff" stroke-width="0.4"/>
      <text x="${eValleyX+4}" y="${eValleyY-2}" font-family="'Source Serif 4',serif" font-size="8" fill="#5C7A8C" font-style="italic">${Math.round(minE)}m</text>
    </svg>
  `;
}

/* ═════════════════════════════════════════════════════════════════
   Trail 列表渲染（v1.17.0 拆分：主函数 + 4 个辅助）
   ─────────────────────────────────────────────────────────────────
   主函数 buildTrailList() 只负责编排：
     1. renderGroupTabs()        —— 顶部分组切换
     2. renderBatchToolbar()     —— 批量操作工具栏（size>0 才显示）
     3. renderTrailCard(tr)      —— 单张轨迹卡片
     4. attachTrailCardHandlers() —— 卡片事件绑定
   ═════════════════════════════════════════════════════════════════ */

/** 顶部分组 Tab bar（仅在存在自定义分组时显示） */
function renderGroupTabs() {
  const groups = getGroups();
  if(groups.length <= 1 && groups[0] === '默认') return null;
  const bar = document.createElement('div');
  bar.className = 'group-tab-bar';
  groups.forEach(g => {
    const btn = document.createElement('button');
    const count = DATA.trails.filter(t => trailGroup(t) === g).length;
    btn.className = 'group-tab' + (g === state.activeGroup ? ' active' : '');
    btn.textContent = `${g}·${count}`;
    btn.title = g === state.activeGroup
      ? `再次点击取消选中「${g}」组`
      : `切换到「${g}」组`;
    btn.addEventListener('click', () => {
      // v1.20.0：再次点击当前 tab → 取消选中（进入无分组显示状态）
      if(g === state.activeGroup) switchGroup(null);
      else switchGroup(g);
    });
    bar.appendChild(btn);
  });
  return bar;
}

/** 批量工具栏（仅在 batchSelected.size > 0 时显示） */
function renderBatchToolbar(others) {
  if(state.batchSelected.size === 0) return null;
  const toolbar = document.createElement('div');
  toolbar.className = 'batch-toolbar';

  const info = document.createElement('span');
  info.className = 'info';
  info.textContent = `已选 ${state.batchSelected.size} / ${others.length}`;
  toolbar.appendChild(info);

  const btn = (text, muted, onClick) => {
    const b = document.createElement('button');
    if(muted) b.className = 'muted';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  };
  toolbar.appendChild(btn('全选', false, () => {
    dispatchState({type:'batch.replace', trailIds:others.map(t => t.id)});
    buildTrailList();
  }));
  toolbar.appendChild(btn('反选', false, () => {
    const cur = state.batchSelected;
    dispatchState({type:'batch.replace', trailIds:others.map(t => t.id).filter(id => !cur.has(id))});
    buildTrailList();
  }));

  const moveSel = document.createElement('select');
  moveSel.innerHTML = '<option value="">移到…</option>'
    + getGroups().filter(g => g !== state.activeGroup).map(g => `<option value="${g}">${g}</option>`).join('')
    + '<option value="__new__">＋ 新建组…</option>';
  moveSel.addEventListener('change', async e => {
    let target = e.target.value;
    if(!target) return;
    if(target === '__new__') {
      const name = await studioDialogs.prompt({
        title:currentLang === 'zh' ? '新建分组' : 'New group',
        inputLabel:currentLang === 'zh' ? '分组名称' : 'Group name',
        required:true,
        confirmLabel:currentLang === 'zh' ? '创建' : 'Create',
        cancelLabel:currentLang === 'zh' ? '取消' : 'Cancel',
      });
      if(!name || !name.trim()) { e.target.value = ''; return; }
      target = name.trim();
    }
    moveBatchToGroup(target);
  });
  toolbar.appendChild(moveSel);

  toolbar.appendChild(btn('清除', true, () => {
    dispatchState({type:'batch.replace', trailIds:[]});
    buildTrailList();
  }));
  return toolbar;
}

/** 执行批量移动（供 renderBatchToolbar 调用） */
function moveBatchToGroup(target) {
  const ids = [...state.batchSelected];
  let moved = 0;
  DATA.trails.forEach(t => {
    if(!ids.includes(t.id)) return;
    const oldGroup = trailGroup(t);
    t.group = target;
    // v1.21.0：如果被移动的 trail 是 activeGroup 的主轨迹，重新挑一条
    if(t.id === state.primaryTrailId) {
      const remaining = DATA.trails.filter(x => trailGroup(x) === state.activeGroup && x.id !== t.id);
      dispatchState({type:'primary-trail.set', trailId:remaining[0] ? remaining[0].id : null});
    }
    // v1.21.0：如果 trail 是它原来组的主轨迹，清掉原组的记忆（避免"幽灵主轨迹"）
    if(oldGroup !== target && state.primaryByGroup[oldGroup] === t.id) {
      const remaining = DATA.trails.filter(x => trailGroup(x) === oldGroup && x.id !== t.id);
      dispatchState({type:'group.set-primary', group:oldGroup, trailId:remaining[0] ? remaining[0].id : null});
    }
    moved++;
  });
  dispatchState({type:'batch.replace', trailIds:[]});
  applyChange();
  showToast(`✓ 已将 ${moved} 条轨迹移至「${target}」`);
}

/** 单张轨迹卡片的 HTML 头部（收起态和展开态共用） */
/**
 * 单张轨迹卡片的头部 HTML
 * @param {Trail} tr
 * @param {boolean} isActive       是否叠加到地图
 * @param {boolean} isExpanded     是否展开详情
 * @param {boolean} isBatchChecked 是否被批量选中
 * @param {boolean} [isPrimary]    是否是当前分组的主轨迹（v1.21.0）
 */
function trailCardHeaderHtml(tr, isActive, isExpanded, isBatchChecked, isPrimary) {
  return `
    <div class="trail-card-hdr">
      <div class="trail-checkbox ${isBatchChecked ? 'checked' : ''}" data-action="batch-toggle" title="${isBatchChecked ? '已选（点击取消）' : '选中此轨迹'}">${isBatchChecked ? '☑' : '☐'}</div>
      <div class="trail-expand-arrow ${isExpanded ? 'expanded' : ''}" data-action="toggle-expand" title="${isExpanded ? '收起详情' : '展开详情'}">${isExpanded ? '▾' : '▸'}</div>
      <div class="trail-color-dot" style="background:${tr.color}"></div>
      <div class="trail-name">${tr.name}</div>
      <div class="trail-toggle" style="${isActive ? 'color:var(--accent);font-weight:600' : ''}">${isActive ? '叠加中 ●' : '点击叠加'}</div>
    </div>
  `;
}

/** 单张轨迹卡片的详情区 HTML（仅展开态） */
function trailCardExpandedHtml(tr) {
  const thumbSvg = buildTrailThumbnail(tr);
  const linkArea = tr.source && tr.source.startsWith('http')
    ? `<a href="${tr.source}" target="_blank" class="trail-link-btn" title="${tr.source}" style="color:var(--accent);font-size:10px;text-decoration:none;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🔗 ${tr.name}</a><a href="#" class="trail-edit-link-btn" data-tid="${tr.id}" title="${t('trail.editLink')}" style="color:var(--text-muted);font-size:10px;text-decoration:none">✎</a>`
    : `<a href="#" class="trail-edit-link-btn" data-tid="${tr.id}" title="${t('trail.editLink')}" style="color:var(--text-muted);font-size:10px;text-decoration:none">🔗 ${t('trail.addLink') || '添加链接'} ✎</a>`;
  const groupOpts = getGroups().map(g => `<option value="${g}" ${trailGroup(tr)===g?'selected':''}>${g}</option>`).join('');
  // v1.21.0：主轨迹卡不显示"设为主轨迹"按钮，显示 "★ 主轨迹" 标识
  const isPrimary = (tr.id === state.primaryTrailId);
  const primaryLabel = isPrimary
    ? `<span style="color:#C6912D;font-size:10px;font-weight:600;letter-spacing:0.02em">★ ${t('trail.isPrimary') || '主轨迹'}</span>`
    : `<a href="#" class="set-primary-btn" data-tid="${tr.id}" style="color:var(--accent);font-size:10px;text-decoration:none;font-weight:600;letter-spacing:0.02em">${t('trail.setPrimary')}</a>`;
  return `
    <div class="trail-thumb">${thumbSvg}</div>
    <div class="trail-info" style="align-items:center;gap:8px;flex-wrap:wrap">
      <span><b>${tr.stats.distance_km}</b>${t('header.km')}</span>
      <span>↑<b>${tr.stats.ascent_m}</b>m</span>
      <span>↓<b>${tr.stats.descent_m || 0}</b>m</span>
      <span><b>${tr.days}</b>${t('trail.days')}</span>
      <span style="margin-left:auto;display:inline-flex;align-items:center;gap:4px;font-family:monospace;font-size:10px;color:var(--text-muted);user-select:all">${t('trail.id')}: <span class="trail-id-text" data-tid="${tr.id}">${tr.id}</span><a href="#" class="trail-edit-id-btn" data-tid="${tr.id}" title="${t('trail.editId')}" style="color:var(--accent);font-size:10px;text-decoration:none">✎</a></span>
    </div>
    <div class="trail-info" style="margin-top:4px;align-items:center;gap:10px">
      ${primaryLabel}
      ${linkArea}
      <a href="#" class="trail-dl-kml-btn" data-tid="${tr.id}" title="下载 KML" style="color:var(--accent);font-size:10px;text-decoration:none">⬇ KML</a>
      <a href="#" class="trail-delete-btn" data-tid="${tr.id}" title="${t('trail.delete')}" style="margin-left:auto;color:var(--accent-2);font-size:10px;text-decoration:none">${t('trail.delete')}</a>
    </div>
    <div class="trail-info" style="margin-top:4px;align-items:center;gap:6px">
      <span style="font-size:10px;color:var(--text-muted)">分组：</span>
      <select class="trail-group-select" data-tid="${tr.id}" style="font-size:10px;padding:2px 6px;border:1px solid var(--line);border-radius:3px;background:var(--bg-0);color:var(--text);cursor:pointer;max-width:120px">
        ${groupOpts}
        <option value="__new__">＋ 新建组…</option>
      </select>
    </div>
  `;
}

/** 判断 click 是否来自"要走详情按钮独立 handler"的元素 */
function isDetailButtonTarget(el) {
  return el.closest('.trail-link-btn')
      || el.classList.contains('trail-edit-link-btn')
      || el.classList.contains('trail-edit-id-btn')
      || el.classList.contains('trail-dl-kml-btn')
      || el.classList.contains('trail-reverse-btn')
      || el.classList.contains('trail-delete-btn')
      || el.classList.contains('set-primary-btn')
      || el.classList.contains('trail-group-select');
}

/** 卡片主点击 handler（复选框 / 展开箭头 / 其他区域=切换叠加） */
function handleTrailCardClick(tr, e) {
  if(e.target.classList.contains('trail-checkbox')) {
    e.preventDefault(); e.stopPropagation();
    toggleTrailBatch(tr.id);
    buildTrailList();
    return true;
  }
  if(e.target.classList.contains('trail-expand-arrow')) {
    e.preventDefault(); e.stopPropagation();
    toggleTrailExpanded(tr.id);
    buildTrailList();
    return true;
  }
  if(isDetailButtonTarget(e.target)) return false; // 让详情按钮 handler 接管
  // 其他区域：切换地图叠加
  toggleTrailActive(tr.id);
  dispatchState({type:'escape.set-active', escapeId:null});
  document.querySelectorAll('.escape-item').forEach(el => el.classList.remove('active'));
  applyChange();
  return true;
}

/** 展开态特有的详情按钮 handler（编辑 ID / 编辑链接 / 删除 / 反向 / 设为主 等） */
async function editTrailSource(tr) {
  const newUrl = await studioDialogs.prompt({
    title:t('trail.editLink'),
    inputLabel:'URL',
    value:tr.source || '',
    selectOnOpen:true,
    confirmLabel:currentLang === 'zh' ? '保存' : 'Save',
    cancelLabel:currentLang === 'zh' ? '取消' : 'Cancel',
  });
  if(newUrl === null || !DATA.trails.includes(tr)) return false;
  tr.source = newUrl.trim();
  applyChange();
  return true;
}

async function editTrailId(tr) {
  const newId = await studioDialogs.prompt({
    title:t('trail.editId'),
    inputLabel:'ID',
    value:tr.id,
    required:true,
    selectOnOpen:true,
    confirmLabel:currentLang === 'zh' ? '保存' : 'Save',
    cancelLabel:currentLang === 'zh' ? '取消' : 'Cancel',
    validate:value => {
      const trimmed = value.trim();
      return DATA.trails.some(other => other !== tr && other.id === trimmed)
        ? 'ID 已存在 / ID already exists'
        : null;
    },
  });
  if(!newId || !newId.trim() || newId === tr.id || !DATA.trails.includes(tr)) return false;
  const trimmed = newId.trim();
  const oldId = tr.id;
  tr.id = trimmed;
  dispatchState({type:'trail-id.rename', oldId, newId:trimmed});
  applyChange();
  return true;
}

async function confirmDeleteTrail(tr) {
  const confirmed = await studioDialogs.confirm({
    title:currentLang === 'zh' ? '删除轨迹' : 'Delete trail',
    message:currentLang === 'zh' ? `确定删除「${tr.name}」吗？` : `Delete "${tr.name}"?`,
    danger:true,
    confirmLabel:currentLang === 'zh' ? '删除' : 'Delete',
    cancelLabel:currentLang === 'zh' ? '取消' : 'Cancel',
  });
  if(!confirmed || !DATA.trails.includes(tr)) return false;
  deleteTrail(tr.id);
  return true;
}

function handleTrailDetailClick(tr, e) {
  if(e.target.classList.contains('trail-edit-link-btn')) {
    e.preventDefault(); e.stopPropagation();
    void editTrailSource(tr);
    return true;
  }
  if(e.target.classList.contains('trail-edit-id-btn')) {
    e.preventDefault(); e.stopPropagation();
    void editTrailId(tr);
    return true;
  }
  if(e.target.classList.contains('trail-dl-kml-btn')) {
    e.preventDefault(); e.stopPropagation();
    downloadTrailKML(tr.id); return true;
  }
  if(e.target.classList.contains('trail-reverse-btn')) {
    e.preventDefault(); e.stopPropagation();
    reverseTrail(tr.id); return true;
  }
  if(e.target.classList.contains('trail-delete-btn')) {
    e.preventDefault(); e.stopPropagation();
    void confirmDeleteTrail(tr);
    return true;
  }
  if(e.target.classList.contains('set-primary-btn')) {
    e.preventDefault(); e.stopPropagation();
    dispatchState({type:'primary-trail.set', trailId:tr.id});
    dispatchState({type:'active-trail.set', trailId:tr.id, active:true});
    dispatchState({type:'escape.set-active', escapeId:null});
    document.querySelectorAll('.escape-item').forEach(el => el.classList.remove('active'));
    applyChange();
    return true;
  }
  return false;
}

/** 分组下拉的 change handler（展开态） */
async function handleTrailGroupChange(tr, newGroup, selectEl) {
  if(newGroup === '__new__') {
    const name = await studioDialogs.prompt({
      title:currentLang === 'zh' ? '新建分组' : 'New group',
      inputLabel:currentLang === 'zh' ? '分组名称' : 'Group name',
      required:true,
      confirmLabel:currentLang === 'zh' ? '创建' : 'Create',
      cancelLabel:currentLang === 'zh' ? '取消' : 'Cancel',
    });
    if(!name || !name.trim()) { selectEl.value = trailGroup(tr); return; }
    newGroup = name.trim();
  }
  const oldGroup = trailGroup(tr);
  tr.group = newGroup;
  // v1.21.0：如果被移出的 trail 是原组的主轨迹，清掉原组的记忆
  if(oldGroup !== newGroup && state.primaryByGroup[oldGroup] === tr.id) {
    const remaining = DATA.trails.filter(t => trailGroup(t) === oldGroup && t.id !== tr.id);
    dispatchState({type:'group.set-primary', group:oldGroup, trailId:remaining[0] ? remaining[0].id : null});
  }
  applyChange();
  showToast(`已移至「${newGroup}」组`);
}

/** 渲染单张 trail 卡片并绑定所有 handler */
function renderTrailCard(tr) {
  const card = document.createElement('div');
  const isActive = state.activeTrails.has(tr.id);
  const isExpanded = state.expandedTrails.has(tr.id);
  const isBatchChecked = state.batchSelected.has(tr.id);
  const isPrimary = (tr.id === state.primaryTrailId);

  card.className = 'trail-card'
    + (isActive ? ' active' : '')
    + (isBatchChecked ? ' batch-checked' : '')
    + (isPrimary ? ' is-primary' : '');
  card.style.setProperty('--card-color', tr.color || '#3F5238');
  if(isBatchChecked) {
    card.style.outline = '2px solid var(--accent)';
    card.style.outlineOffset = '-2px';
  }

  const headerHtml = trailCardHeaderHtml(tr, isActive, isExpanded, isBatchChecked, isPrimary);

  if(!isExpanded) {
    card.innerHTML = headerHtml;
    card.addEventListener('click', e => handleTrailCardClick(tr, e));
    return card;
  }

  // 展开态：header + 详情
  card.innerHTML = headerHtml + trailCardExpandedHtml(tr);

  // 详情区里的 <a class="trail-link-btn"> 保留浏览器默认行为（打开新标签），阻止 click 冒泡即可
  const linkBtn = card.querySelector('.trail-link-btn');
  if(linkBtn) linkBtn.addEventListener('click', e => e.stopPropagation());

  card.addEventListener('click', e => {
    if(handleTrailDetailClick(tr, e)) return;
    handleTrailCardClick(tr, e);
  });

  const groupSel = card.querySelector('.trail-group-select');
  if(groupSel) {
    groupSel.addEventListener('change', e => {
      e.stopPropagation();
      void handleTrailGroupChange(tr, e.target.value, e.target);
    });
  }
  return card;
}

function buildTrailList() {
  const list = document.getElementById('trail-list');
  list.innerHTML = '';

  const tabs = renderGroupTabs();
  if(tabs) list.appendChild(tabs);

  // v1.20.0：无选中分组时给一个明确提示（而不是"当前组暂无备选轨迹"的误导）
  if(state.activeGroup == null && DATA.trails.length > 0) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:var(--text-muted);font-style:italic;padding:10px 4px;letter-spacing:0.04em;text-align:center';
    hint.textContent = t('trail.emptyNoGroup');
    list.appendChild(hint);
    return;
  }

  // v1.21.0：主轨迹不再被剔除，而是保留在列表里（用 is-primary class 视觉标记）
  //          排序：主轨迹在最前，其他按原顺序
  const inGroup = DATA.trails.filter(tr => trailGroup(tr) === state.activeGroup);
  const primary = inGroup.find(tr => tr.id === state.primaryTrailId);
  const others = primary
    ? [primary, ...inGroup.filter(tr => tr.id !== state.primaryTrailId)]
    : inGroup;

  const toolbar = renderBatchToolbar(others);
  if(toolbar) list.appendChild(toolbar);

  if(others.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:11px;color:var(--text-muted);font-style:italic;padding:10px 4px;letter-spacing:0.04em';
    empty.textContent = '当前组暂无轨迹，点 ＋ 添加或从其他组移入。';
    list.appendChild(empty);
    return;
  }
  others.forEach(tr => list.appendChild(renderTrailCard(tr)));
}

function buildFilterGrid() {
  const grid = document.getElementById('filter-grid');
  grid.innerHTML = '';
  // 统计各tag数量（active trails）
  const counts = {};
  DATA.trails.forEach(t => {
    if(!isTrailActive(t)) return;
    t.waypoints.forEach(w => counts[w.tag] = (counts[w.tag]||0) + 1);
  });

  const tagOrder = ['camp','pass','supply','water','fork','warn','shelter','village','bridge','river','other','start','end'];

  tagOrder.forEach(tag => {
    if(!counts[tag]) return;
    const chip = document.createElement('div');
    chip.className = 'filter-chip' + (state.visibleTags.has(tag) ? ' on' : '');
    chip.innerHTML = `<span class="ic">${waypointIcon(tag)}</span><span>${t('tag.'+tag)}</span><span class="cnt">${counts[tag]}</span>`;
    chip.addEventListener('click', () => {
      dispatchState({type:'visible-tag.set', tag, visible:!state.visibleTags.has(tag)});
      buildFilterGrid();
      drawWaypoints();
    });
    grid.appendChild(chip);
  });
}

/* @runtime-fragment ui.legend */
function buildLegend() {
  const lg = document.getElementById('legend');
  if(state.mode === 'day') {
    if(DATA.trails.length === 1) {
      lg.innerHTML = `
        <h4>按天分色</h4>
        ${dayPalette.map((c,i)=>`<div class="lg-row"><div class="swatch" style="background:${c}"></div>D${i+1}</div>`).join('')}
      `;
    } else {
      lg.innerHTML = `<h4><span data-i18n="legend.title">多轨迹（主轨迹高亮）</span></h4>` + DATA.trails.filter(t=>isTrailActive(t))
        .map(t=>{
          const isP = t.id === state.primaryTrailId;
          return `<div class="lg-row" style="opacity:${isP?1:0.6}"><div class="swatch" style="background:${t.color};height:${isP?5:3}px"></div>${isP?'★ ':''}${t.name}</div>`;
        }).join('');
    }
  } else if(state.mode === 'elev') {
    lg.innerHTML = `
      <h4>海拔渐变</h4>
      <div class="lg-row"><div class="swatch elev-grad" style="width:140px"></div></div>
      <div class="lg-row" style="justify-content:space-between"><span>${minE}m</span><span>${maxE}m</span></div>
    `;
  }
}

/* @runtime-fragment ui.controls */
/* ============ Wire up controls ============ */
// tabs
let lastNonDayMode = state.mode === 'day' ? 'elev' : state.mode;
const sidebarTabCommands = {
  trails:STUDIO_COMMANDS.WORKSPACE_TRAILS,
  days:STUDIO_COMMANDS.WORKSPACE_ITINERARY,
  escape:STUDIO_COMMANDS.WORKSPACE_ESCAPE,
};

function activateSidebarTab(tabName) {
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  const pane = document.getElementById('tab-' + tabName);
  if(!tab || !pane) return false;
  document.querySelectorAll('.tab').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(item => item.classList.remove('active'));
  tab.classList.add('active');
  pane.classList.add('active');
  if(tabName === 'days') {
    if(state.mode !== 'day') lastNonDayMode = state.mode;
    setMapMode('day');
  } else if(state.mode === 'day') {
    if(typeof clearDaySegmentPreview === 'function') clearDaySegmentPreview({silent:true});
    setMapMode(lastNonDayMode || 'elev');
    if(typeof refreshElevBar === 'function') refreshElevBar();
  }
  return true;
}

document.querySelectorAll('.tab').forEach(t => {
  const commandId = sidebarTabCommands[t.dataset.tab];
  if(commandId) t.dataset.commandId = commandId;
  t.addEventListener('click', () => {
    if(commandId) dispatchStudioCommand(commandId);
  });
});

// day collapse
document.addEventListener('click', e => {
  if(e.target.closest('[data-toggle]')) {
    e.target.closest('[data-toggle]').nextElementSibling.classList.toggle('open');
  }
});

// day evac button
document.addEventListener('click', e => {
  if(e.target.classList && e.target.classList.contains('day-evac-btn')) {
    dispatchStudioCommand(STUDIO_COMMANDS.WORKSPACE_ESCAPE);
  }
});

function setMapMode(mode, opts = {}) {
  document.querySelectorAll('[data-mode]').forEach(x => {
    x.classList.toggle('on', x.dataset.mode === mode);
  });
  dispatchState({type:'mode.set', mode});
  if(mode !== 'day') lastNonDayMode = mode;
  // 标注点模式下显示 tag 选择面板，并确保已渲染按钮
  const wpModePanel = document.getElementById('waypoint-mode-tags');
  if(wpModePanel) {
    wpModePanel.style.display = state.mode === 'waypoint' ? 'block' : 'none';
    if(state.mode === 'waypoint') {
      // 防御性重渲染（避免在某些时序下 grid 为空）
      try { buildWaypointModeTagGrid(); } catch(e) {}
    }
  }
  // 切换模式后更新模式·标注点 标题 + 重建 filter-grid（visibleTags 现在是该模式独立 Set）
  if(typeof updateModeTagTitle === 'function') updateModeTagTitle();
  if(typeof buildFilterGrid === 'function') buildFilterGrid();
  drawTracks(); drawWaypoints(); buildLegend();
  if(opts.toast) showToast(opts.toast, 'info');
  commandRegistry.notifyChanged();
}

function enterInteractionRenderMode(toolName) {
  if(state.mode !== 'waypoint') {
    setMapMode('waypoint', { toast: `${toolName}已切换到标注点模式以提升拖动流畅度` });
  }
}

// mode buttons
document.querySelectorAll('[data-mode]').forEach(b => {
  const commandId = b.dataset.mode === 'waypoint'
    ? STUDIO_COMMANDS.MODE_WAYPOINT
    : STUDIO_COMMANDS.MODE_ELEVATION;
  b.dataset.commandId = commandId;
  b.addEventListener('click', () => dispatchStudioCommand(commandId));
});

// 标注点模式：tag 选择按钮
function buildWaypointModeTagGrid() {
  const grid = document.getElementById('wpmode-tag-grid');
  if(!grid) return;
  grid.innerHTML = '';
  if(typeof TAG_RULES_JS === 'undefined') return;  // 还没定义，等后面再调
  TAG_RULES_JS.forEach(([tag, kws, icon, color]) => {
    const btn = document.createElement('button');
    const on = state.waypointModeTags.has(tag);
    btn.className = 'btn-mini' + (on ? ' on' : '');
    btn.style.cssText = 'padding:6px 8px;font-size:11px;display:flex;align-items:center;gap:6px;justify-content:flex-start;text-align:left;width:100%';
    btn.innerHTML = `<span style="color:${color}">${waypointIcon(tag)}</span> ${t('tag.'+tag)}`;
    btn.addEventListener('click', () => {
      dispatchState({type:'waypoint-tag.set', tag, visible:!state.waypointModeTags.has(tag)});
      buildWaypointModeTagGrid();
      if(state.mode === 'waypoint') drawWaypoints();
    });
    grid.appendChild(btn);
  });
}
// 不在这里立即调，TAG_RULES_JS 还未定义；放到 Boot 里调

// base layer
document.querySelectorAll('[data-base]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-base]').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    map.removeLayer(currentBase);
    currentBase = baseLayers[b.dataset.base].addTo(map);
  });
});

// show track checkbox
const _showTrackEl = document.getElementById('showTrack');
if(_showTrackEl) _showTrackEl.addEventListener('change', e => {
  dispatchState({type:'display.set', option:'showTrack', visible:e.target.checked});
  drawTracks();
});
const _showLabelEl = document.getElementById('showLabel');
if(_showLabelEl) _showLabelEl.addEventListener('change', e => {
  dispatchState({type:'display.set', option:'showLabel', visible:e.target.checked});
  drawWaypoints();
});
const _showHighPointEl = document.getElementById('showHighPoint');
if(_showHighPointEl) _showHighPointEl.addEventListener('change', e => {
  dispatchState({type:'display.set', option:'showHighPoint', visible:e.target.checked});
  drawWaypoints();
});

// filter all/none
document.getElementById('filterAll').addEventListener('click', () => {
  dispatchState({
    type:'visible-tags.replace',
    tags:['start','end','camp','pass','water','supply','fork','warn','shelter','village','bridge','river','other'],
  });
  buildFilterGrid(); drawWaypoints();
});
document.getElementById('filterNone').addEventListener('click', () => {
  dispatchState({type:'visible-tags.replace', tags:[]});
  buildFilterGrid(); drawWaypoints();
});

// click empty to clear escape
map.on('click', e => {
  if(state.activeEscape) {
    const target = e.originalEvent.target;
    if(!target.closest('.leaflet-marker-icon, .leaflet-interactive')) clearEscape();
  }
});

/* @runtime-fragment ui.toast */
/* ============ Toast ============ */
function showToast(msg, type='info', duration=2400) {
  let el = document.getElementById('toast');
  if(!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(20,24,32,0.96);border:1px solid var(--line);padding:8px 16px;border-radius:5px;color:var(--text);font-size:12px;z-index:5500;box-shadow:0 4px 16px rgba(0,0,0,0.4);transition:opacity 0.3s;max-width:80vw';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.color = type === 'error' ? '#ff8888' : 'var(--text)';
  el.style.opacity = '1';
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { el.style.opacity = '0'; }, duration);
}
showToast.timer = null;

/* @runtime-fragment ui.sidebar-toggle */
const _sidebar = document.getElementById('sidebar');
const _sbClose = document.getElementById('sidebar-close');
const _sbToggle = document.getElementById('sidebar-toggle');
function toggleSidebar(open) {
  if(open === undefined) open = _sidebar.classList.contains('collapsed');
  if(open) {
    _sidebar.classList.remove('collapsed');
    if(_sbToggle) _sbToggle.classList.remove('show');
  } else {
    _sidebar.classList.add('collapsed');
    if(_sbToggle) _sbToggle.classList.add('show');
  }
  // 触发地图重排
  setTimeout(() => {
    if(typeof map !== 'undefined' && map) map.invalidateSize();
    if(typeof refreshElevBar === 'function') refreshElevBar();
  }, 280);
  // 主轨迹小卡：侧栏收起时显示
  const mini = document.getElementById('primary-mini');
  if(mini) {
    if(_sidebar.classList.contains('collapsed')) {
      const hasPrimary = typeof buildPrimaryMini === 'function' ? buildPrimaryMini() : false;
      mini.style.display = hasPrimary ? 'block' : 'none';
      if(hasPrimary && typeof schedulePrimaryMiniPositionApply === 'function') schedulePrimaryMiniPositionApply(mini);
    } else {
      mini.style.display = 'none';
    }
  }
}
if(_sbClose) _sbClose.addEventListener('click', () => toggleSidebar(false));
if(_sbToggle) _sbToggle.addEventListener('click', () => toggleSidebar(true));
