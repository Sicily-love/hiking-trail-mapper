// @ts-nocheck
// Transitional classic fragments owned by file import, export, and KML processing.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment files.import */
/* ============ Add Trail UI (KML upload) ============ */
const addBtn = document.getElementById('add-trail-btn');
const addModal = document.getElementById('add-trail-modal');
const addCancel = document.getElementById('add-cancel');
const addStatus = document.getElementById('add-status');
const kmlDrop = document.getElementById('kml-drop');
const kmlFile = document.getElementById('kml-file');
const kmlList = document.getElementById('kml-list');

function _closeAddModal() {
  addModal.classList.remove('open');
  // 清除上次的解析记录
  setTimeout(() => {
    if(kmlList) kmlList.innerHTML = '';
    if(addStatus) addStatus.textContent = '';
    if(kmlFile) kmlFile.value = '';
  }, 250);
}
addCancel.addEventListener('click', _closeAddModal);
addModal.addEventListener('click', e => { if(e.target === addModal) _closeAddModal(); });

kmlDrop.addEventListener('click', () => kmlFile.click());
kmlDrop.addEventListener('dragover', e => { e.preventDefault(); kmlDrop.style.borderColor = 'var(--accent)'; kmlDrop.style.background = 'var(--bg-2)'; });
kmlDrop.addEventListener('dragleave', e => { kmlDrop.style.borderColor = 'var(--line)'; kmlDrop.style.background = 'var(--bg-0)'; });
kmlDrop.addEventListener('drop', e => {
  e.preventDefault();
  kmlDrop.style.borderColor = 'var(--line)';
  kmlDrop.style.background = 'var(--bg-0)';
  handleFiles(e.dataTransfer.files);
});
kmlFile.addEventListener('change', e => handleFiles(e.target.files));

const PALETTE_LOCAL = ['#f97316','#3b82f6','#10b981','#a855f7','#eab308','#ec4899','#06b6d4','#f59e0b','#84cc16'];

function handleFileImportEvent(event) {
  if(event.type === 'archive.expanded') {
    kmlList.innerHTML += `<div style="color:#5cb85c;font-size:11px">📦 ${event.archiveName} → 提取 ${event.count} 个 KML</div>`;
  } else if(event.type === 'archive.empty') {
    kmlList.innerHTML += `<div style="color:#ff8888">❌ ${event.archiveName}：压缩包内未找到 .kml 文件</div>`;
  } else if(event.type === 'archive.failed') {
    console.error('[expandZipFiles] 解压 zip 失败:', event.archiveName, event.error);
    const detail = event.error && event.error.message ? event.error.message : String(event.error);
    kmlList.innerHTML += `<div style="color:#ff8888">❌ ${event.archiveName}：解压失败（${detail}）</div>`;
  }
}

const fileArchiveAdapter = HTM_APP.createFileArchiveAdapter(
  typeof fflate === 'undefined' ? null : fflate,
);
const fileImportController = HTM_APP.createFileImportController(runtimeContext, {
  contentHash:trailContentHash,
  unzip:fileArchiveAdapter.unzip,
  decode:fileArchiveAdapter.decode,
  palette:PALETTE_LOCAL,
  onEvent:handleFileImportEvent,
  commit:() => applyChange({fit:false}),
  resetView:() => { if(typeof resetView === 'function') resetView(); },
});


/* ═════════════════════════════════════════════════════════════════
   File Import Pipeline（v1.18.0 拆分：主函数 + 6 个辅助）
   ─────────────────────────────────────────────────────────────────
   handleFiles(files)
     │
     ├── expandZipFiles(files)          —— .zip → 逐条虚拟 File-like
     ├── for each file:
     │     ├── importSingleKml(f)        —— 解析 + 去重 + 加入 DATA
     │     └── renderKmlImportRow(f, trail, displayLabel)  —— UI 反馈行
     └── postImportFinalize(addedCount)  —— 全部完成后统一 fit+save
   ═════════════════════════════════════════════════════════════════ */

/**
 * 将 zip 文件展开为一批虚拟 File-like 对象。非 zip 文件原样返回。
 * @param {FileList|Array<File>} files
 * @returns {Promise<Array<File | {name:string, text:()=>Promise<string>, _fromZip:string}>>}
 */
async function expandZipFiles(files) {
  return fileImportController.expandFiles(files);
}

/**
 * 保证 trail.id 在 DATA.trails 中唯一（时间戳+随机极端撞车时补序号）
 */
function ensureUniqueTrailId(trail) {
  return fileImportController.ensureUniqueId(trail);
}

/**
 * 检查 trail 是否与已有轨迹重复（基于 trailContentHash）
 * @returns {Trail|null} 重复的现有轨迹；null 表示不重复
 */
function findDuplicateTrail(trail) {
  return fileImportController.findDuplicate(trail);
}

/**
 * 渲染一条 KML 导入的 UI 行（含 ID / source 可编辑输入框）
 */
function renderKmlImportRow(displayLabel, trail) {
  const row = document.createElement('div');
  row.style.cssText = 'border:1px solid var(--line);border-radius:5px;padding:8px;margin-top:6px;background:var(--bg-0)';
  row.innerHTML = `
    <div style="color:#5cb85c;font-size:11px;margin-bottom:6px">✓ ${displayLabel} → <b>${trail.name}</b> (${trail.stats.distance_km}km, ↑${trail.stats.ascent_m}m, ${trail.waypoints.length} ${t('add.waypoints') || '标注点'})</div>
    <div style="display:flex;gap:6px;align-items:center;font-size:11px">
      <span style="color:var(--text-muted);min-width:30px">${t('trail.id')}:</span>
      <input type="text" class="kml-row-id" data-tid="${trail.id}" value="${trail.id}" style="flex:1;background:var(--bg-2);border:1px solid var(--line);color:var(--text);padding:4px 6px;border-radius:3px;font-size:11px;font-family:monospace">
    </div>
    <div style="display:flex;gap:6px;align-items:center;font-size:11px;margin-top:4px">
      <span style="color:var(--text-muted);min-width:30px">🔗:</span>
      <input type="text" class="kml-row-source" data-tid="${trail.id}" value="${trail.source || ''}" placeholder="${t('add.urlPlaceholder') || 'None'}" style="flex:1;background:var(--bg-2);border:1px solid var(--line);color:var(--text);padding:4px 6px;border-radius:3px;font-size:11px">
    </div>
  `;
  kmlList.appendChild(row);
  bindKmlImportRowEvents(row, trail);
}

/**
 * 绑定导入行的 ID / source 输入框事件（v1.18.0 从 handleFiles 拆出）
 */
function bindKmlImportRowEvents(row, trail) {
  const idInput = row.querySelector('.kml-row-id');
  const srcInput = row.querySelector('.kml-row-source');
  let cachedTid = trail.id;

  idInput.addEventListener('change', () => {
    const newId = idInput.value.trim();
    const result = fileImportController.renameTrail(cachedTid, newId);
    if(result.status === 'missing' || result.status === 'unchanged') return;
    if(result.status === 'empty') { idInput.value = cachedTid; return; }
    if(result.status === 'duplicate') {
      void studioDialogs.info({
        title:currentLang === 'zh' ? '无法修改 ID' : 'Cannot change ID',
        message:'ID 已存在 / ID already exists',
        danger:true,
      });
      idInput.value = cachedTid;
      return;
    }
    cachedTid = result.newId;
    srcInput.dataset.tid = result.newId;
    idInput.dataset.tid = result.newId;
  });

  srcInput.addEventListener('change', () => {
    fileImportController.updateSource(cachedTid, srcInput.value);
  });
}

/**
 * 导入单个 KML 文件（含解析、去重、入库、UI 反馈）
 * @returns {'added' | 'skipped' | 'failed'}
 */
async function importSingleKml(f) {
  if(!f.name.toLowerCase().endsWith('.kml')) {
    kmlList.innerHTML += `<div style="color:#ff8888">❌ ${f.name}：不是 KML/ZIP 文件</div>`;
    return 'failed';
  }
  const displayLabel = f._fromZip ? `${f._fromZip} → ${f.name}` : f.name;
  addStatus.textContent = `⏳ 解析 ${displayLabel}...`;
  addStatus.style.color = 'var(--text-dim)';

  try {
    const text = await f.text();
    const trail = parseAndProcessKml(text, f.name);
    if(!trail) {
      kmlList.innerHTML += `<div style="color:#ff8888">❌ ${displayLabel}：未找到轨迹点</div>`;
      return 'failed';
    }

    const result = fileImportController.addTrail(trail);
    if(result.status === 'duplicate') {
      kmlList.innerHTML += `<div style="color:#f59e0b">⚠ ${displayLabel}：与「${result.duplicate.name}」重复，已跳过</div>`;
      return 'skipped';
    }

    renderKmlImportRow(displayLabel, trail);
    addStatus.textContent = '';
    return 'added';
  } catch(err) {
    console.error('[importSingleKml] 处理失败:', displayLabel, err);
    kmlList.innerHTML += `<div style="color:#ff8888">❌ ${displayLabel}：${err.message}</div>`;
    return 'failed';
  }
}

/**
 * 完成导入后的收尾：清下撤高亮、重算 escape_routes（可选）、fit 视野、持久化
 */
function postImportFinalize(addedCount) {
  if(addedCount === 0) return;
  if(state.autoGenerateEscape) {
    for(const tr of DATA.trails) {
      if(!tr.waypoints || !tr.track || !tr.track.length) continue;
      const fakePts = tr.track.map(p => ({ lat: p[0], lng: p[1], elev: p[2] || 0 }));
      const others = DATA.trails.filter(t => t.id !== tr.id);
      tr.escape_routes = buildEscapeRoutes(tr.waypoints, fakePts, others);
    }
  }
  fileImportController.finalizeImport(addedCount);
}

async function handleFiles(files) {
  if(!files || files.length === 0) return;

  const expanded = await expandZipFiles(files);
  let added = 0;

  // 串行处理，让出主线程避免同 tick id 冲突
  for(const f of expanded) {
    const result = await importSingleKml(f);
    if(result === 'added') added++;
    // 每条之间让出主线程一帧
    await new Promise(r => setTimeout(r, 0));
  }
  postImportFinalize(added);
}



/* @runtime-fragment files.download */
const browserFileAdapter = HTM_APP.createBrowserFileAdapter({
  document,
  url:URL,
  BlobCtor:Blob,
  showSaveFilePicker:typeof showSaveFilePicker === 'function'
    ? options => showSaveFilePicker(options)
    : undefined,
});

function handleFileExportEvent(event) {
  if(event.type === 'export.error') {
    if(event.reason === 'missing-trails') showToast('当前组没有叠加中的轨迹', 'error');
    else if(event.reason === 'missing-primary') showToast('请先设置主轨迹', 'error');
    else showToast('ZIP 打包失败：' + (event.error?.message || event.error || 'unknown'), 'error');
    return;
  }
  if(event.type === 'export.progress') {
    showToast('⏳ 生成行程图…');
  } else if(event.type === 'export.fallback') {
    showToast(`ZIP 库未加载，将下载 ${event.downloadCount} 个 KML 文件（首个为合并版）…`, 'info', 4000);
  } else if(event.type === 'export.completed') {
    if(event.kind === 'trail-kml') showToast('✓ KML 已下载：' + event.filename.replace(/\.kml$/i, ''));
    else if(event.kind === 'group-zip') showToast(`✓ 已导出 ${event.trailCount} 条轨迹 → ${event.filename}`);
    else showToast('✓ 行程 MD（含海拔图）已导出');
  }
}

const fileExportController = HTM_APP.createFileExportController(runtimeContext, {
  archive:fileArchiveAdapter,
  files:browserFileAdapter,
  dayPalette,
  renderDayChart:(points, color, label) =>
    HTM_APP.renderDayElevationChart(document, points, color, label),
  getLanguage:() => currentLang === 'en' ? 'en' : 'zh',
  schedule:(callback, delayMs) => setTimeout(callback, delayMs),
  onEvent:handleFileExportEvent,
});

function downloadTrailKML(id) {
  return fileExportController.downloadTrailKml(id);
}


/* @runtime-fragment files.export */
/* ============ Export Offline ============ */
async function exportOffline() {
  if(!DATA.trails.length) { showToast('没有轨迹可导出', 'error'); return; }
  // v1.14.1：点击式选择菜单（附着在导出按钮下方），不用 confirm 阻塞对话框
  showExportMenu();
}

/* v1.14.1：导出选择菜单（悬浮在导出按钮下方） */
function showExportMenu() {
  // 已存在则先关闭（起到 toggle 效果）
  const existing = document.getElementById('export-menu-popup');
  if(existing) { existing.remove(); return; }

  const btn = document.getElementById('export-btn');
  if(!btn) { exportGroupKML(); return; }
  const rect = btn.getBoundingClientRect();

  const popup = document.createElement('div');
  popup.id = 'export-menu-popup';
  popup.style.cssText = `
    position:fixed;
    top:${rect.bottom + 6}px;
    left:${Math.max(8, rect.right - 260)}px;
    z-index:9999;
    background:var(--bg-1, #fff);
    border:1px solid var(--line, #ccc);
    border-radius:6px;
    box-shadow:0 6px 20px rgba(0,0,0,0.22);
    min-width:260px;
    padding:6px;
    font-size:12px;
    color:var(--text, #222);
  `;

  const activeCount = DATA.trails.filter(t => isTrailActive(t)).length;
  const items = [
    {
      icon: '📦',
      label: '打包 KML ZIP',
      desc: state.activeGroup
        ? `当前组「${state.activeGroup}」叠加中 ${activeCount} 条 · 可跨设备一键导入`
        : `未选中任何分组 · 请先切换到一个分组`,
      disabled: activeCount === 0,
      handler: () => { popup.remove(); exportGroupKML(); },
    },
    {
      icon: '📄',
      label: '行程 Markdown',
      desc: '按天数/爬升/扎营点/下撤方案生成行程表',
      handler: () => { popup.remove(); exportItineraryMD(); },
    },
  ];

  items.forEach(item => {
    const el = document.createElement('div');
    el.style.cssText = `
      padding:8px 10px;
      border-radius:4px;
      cursor:${item.disabled ? 'not-allowed' : 'pointer'};
      opacity:${item.disabled ? 0.4 : 1};
      display:flex;
      align-items:flex-start;
      gap:8px;
      transition:background 0.12s;
    `;
    el.innerHTML = `
      <span style="font-size:16px;line-height:1">${item.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;line-height:1.3">${item.label}</div>
        <div style="font-size:10.5px;color:var(--text-muted, #888);margin-top:2px;line-height:1.35">${item.desc}</div>
      </div>
    `;
    if(!item.disabled) {
      el.addEventListener('mouseenter', () => el.style.background = 'var(--bg-0, rgba(0,0,0,0.04))');
      el.addEventListener('mouseleave', () => el.style.background = '');
      el.addEventListener('click', item.handler);
    }
    popup.appendChild(el);
  });

  document.body.appendChild(popup);

  // 点外部关闭
  const closeOnOutside = (e) => {
    if(!popup.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      popup.remove();
      document.removeEventListener('mousedown', closeOnOutside, true);
      document.removeEventListener('touchstart', closeOnOutside, true);
    }
  };
  setTimeout(() => {
    document.addEventListener('mousedown', closeOnOutside, true);
    document.addEventListener('touchstart', closeOnOutside, true);
  }, 0);
}

function exportGroupKML() {
  return fileExportController.exportGroupKml();
}


async function exportItineraryMD() {
  return fileExportController.exportItineraryMarkdown();
}



/* @runtime-fragment files.kml */
const TAG_RULES_JS = [
  ['start', ['开始徒步','起点','出发','起步'], '🚩', '#5eb3ff'],
  ['end',   ['终点','结束','收队'], '🏁', '#5eb3ff'],
  ['fork',  ['分叉','分岔','路口','走左边','走右边','切下去','右转','左转','岔路'], '⑫', '#ff8c42'],
  ['camp',  ['营地','扎营','宿营','过夜'], '🏕', '#22c55e'],
  ['pass',  ['垭口','口子'], '🏔', '#ef4444'],
  ['warn',  ['Z字','陡','危险','注意','小心','高反','滚石','滑'], '⚠', '#dc2626'],
  ['supply',['商店','补给','便宜','柠檬茶','咖啡','卖','夯达','小卖部','杂货'], '🏪', '#facc15'],
  ['water', ['水源','打水','取水'], '💧', '#3b82f6'],
  ['shelter',['避雨','避风','小木屋','木屋'], '🏠', '#a855f7'],
  ['bridge',['过桥','过河','涉水'], '🌉', '#06b6d4'],
  ['river', ['小溪','大河'], '🏞', '#0ea5e9'],
  ['village',['村','寨','牧民','藏民','居民点'], '🏘', '#d97706'],
  ['highpoint', [], '⛰', '#fbbf24'],
];
function classifyTag(name) {
  if(!name) return ['other', '📍', '#aaa'];
  for(const [tag, kws, icon, color] of TAG_RULES_JS) {
    for(const kw of kws) if(name.includes(kw)) return [tag, icon, color];
  }
  return ['other', '📍', '#aaa'];
}


function extractKmlParseModelInput(doc) {
  const titleEl = doc.querySelector('Document > name') || doc.querySelector('name');
  const title = titleEl ? titleEl.textContent.trim() : '';
  const lineStringCoordinateTexts = Array.from(doc.querySelectorAll('LineString'))
    .map(ls => {
      const c = ls.querySelector('coordinates');
      return c ? c.textContent : '';
    });

  const gxTracks = Array.from(doc.getElementsByTagNameNS('http://www.google.com/kml/ext/2.2', 'Track'))
    .map(trk => ({
      whens: Array.from(trk.getElementsByTagNameNS('http://www.opengis.net/kml/2.2', 'when')).map(w => w.textContent),
      coords: Array.from(trk.getElementsByTagNameNS('http://www.google.com/kml/ext/2.2', 'coord')).map(c => c.textContent),
    }));

  // 标注点
  const waypoints = [];
  doc.querySelectorAll('Placemark').forEach(pm => {
    const point = pm.querySelector('Point');
    if(!point) return;
    const c = point.querySelector('coordinates');
    if(!c || !c.textContent) return;
    const nameEl = pm.querySelector(':scope > name');
    const descEl = pm.querySelector(':scope > description');
    waypoints.push({
      name: nameEl ? nameEl.textContent : undefined,
      coordinateText: c.textContent,
      description: descEl ? descEl.textContent : '',
    });
  });

  const data = Array.from(doc.querySelectorAll('Data')).map(d => {
    const v = d.querySelector('value');
    return { name: d.getAttribute('name'), value: v ? v.textContent : '' };
  });

  return { title, lineStringCoordinateTexts, gxTracks, waypoints, data };
}

function parseKml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  if(doc.querySelector('parsererror')) throw new Error('XML 解析失败');
  return buildKmlParseModel(extractKmlParseModelInput(doc));
}

function processTrack(pts) {
  const cumD = [0];
  for(let i=1; i<pts.length; i++) {
    cumD.push(cumD[i-1] + haversine(pts[i-1].lat, pts[i-1].lng, pts[i].lat, pts[i].lng));
  }
  const elevs = pts.map(p => p.elev);
  const smoothE = smoothElev(elevs, 7);
  const cumA = accumulatorAscent(elevs, 10);
  const cumDesc = accumulatorDescent(elevs, 10);
  // 分天：基于时间戳，没时间戳全归 1
  const days = pts.map(p => {
    if(!p.t) return null;
    const m = p.t.match(/(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  });
  const uniqDays = [...new Set(days.filter(d => d))];
  uniqDays.sort();
  const dayMap = {};
  uniqDays.forEach((d, i) => { dayMap[d] = i+1; });
  const dayOfIdx = days.map(d => dayMap[d] || 1);

  return pts.map((p, i) => [
    +p.lat.toFixed(6), +p.lng.toFixed(6),
    Math.round(smoothE[i]), +(cumD[i]/1000).toFixed(2),
    Math.round(cumA[i]), dayOfIdx[i],
  ]);
}


function buildEscapeRoutes(wps, pts, otherTrails) {
  // pts 是原始 trackPoints（有 lat/lng/elev 字段）
  // otherTrails: 可选，DATA.trails 中除本轨迹外的其他轨迹数组
  const cumD = [0];
  for(let i=1; i<pts.length; i++) {
    cumD.push(cumD[i-1] + haversine(pts[i-1].lat, pts[i-1].lng, pts[i].lat, pts[i].lng));
  }

  // 所有营地
  const camps = wps.filter(w => w.tag === 'camp');
  // 本轨迹下撤目标：village / start / end / supply
  const exits = wps.filter(w => ['village','start','end','supply'].includes(w.tag));

  // ── 跨轨迹下撤目标 ──
  // 策略：在其他轨迹中找与本轨迹交叉/接近的点（≤500m），作为额外下撤锚点
  const crossAnchors = []; // {lat, lng, elev, label, trailId, trailName, tag}
  if(otherTrails && otherTrails.length) {
    for(const ot of otherTrails) {
      if(!ot.track || !ot.track.length) continue;
      // 先用 start/end/supply/village/camp waypoints（最有意义的节点）
      const otWps = (ot.waypoints || []).filter(w =>
        ['start','end','supply','village','camp'].includes(w.tag)
      );
      for(const ow of otWps) {
        // 找本轨迹上离它最近的点
        let bestI = 0, bestD = Infinity;
        for(let i = 0; i < pts.length; i++) {
          const d = haversine(ow.lat, ow.lng, pts[i].lat, pts[i].lng);
          if(d < bestD) { bestD = d; bestI = i; }
        }
        if(bestD <= 500) { // 500m 以内视为可接驳
          crossAnchors.push({
            lat: pts[bestI].lat, lng: pts[bestI].lng,
            elev: pts[bestI].elev || 0,
            label: `${ow.label || ow.name}（${ot.name}）`,
            tag: ow.tag,
            trailId: ot.id,
            trailName: ot.name,
            gps_idx: bestI,
            _crossDist: Math.round(bestD),
          });
        }
      }
      // 如果没有 waypoints，退而求其次：取其他轨迹 track 的起/终点
      if(otWps.length === 0) {
        for(const rawPt of [ot.track[0], ot.track[ot.track.length-1]]) {
          if(!rawPt) continue;
          let bestI = 0, bestD = Infinity;
          for(let i = 0; i < pts.length; i++) {
            const d = haversine(rawPt[0], rawPt[1], pts[i].lat, pts[i].lng);
            if(d < bestD) { bestD = d; bestI = i; }
          }
          if(bestD <= 500) {
            crossAnchors.push({
              lat: pts[bestI].lat, lng: pts[bestI].lng,
              elev: pts[bestI].elev || 0,
              label: `${ot.name} 轨迹接入点`,
              tag: 'start',
              trailId: ot.id,
              trailName: ot.name,
              gps_idx: bestI,
              _crossDist: Math.round(bestD),
            });
          }
        }
      }
    }
  }

  if(camps.length === 0 || (exits.length === 0 && crossAnchors.length === 0)) return [];

  // 确保 gps_idx
  function ensureIdx(wp) {
    if(wp.gps_idx != null) return wp.gps_idx;
    let best = 0, bestD = Infinity;
    for(let i=0; i<pts.length; i++) {
      const d = haversine(wp.lat, wp.lng, pts[i].lat, pts[i].lng);
      if(d < bestD) { bestD = d; best = i; }
    }
    wp.gps_idx = best;
    return best;
  }

  const routes = [];
  const seen = new Set();

  // 合并本轨迹 exits + 跨轨迹 anchors
  const allExits = [
    ...exits.map(e => ({...e, _cross: false})),
    ...crossAnchors.map(a => ({...a, _cross: true})),
  ];

  for(const camp of camps) {
    const campIdx = ensureIdx(camp);
    // 找最近的下撤点（轨迹里程差最小）
    let bestExit = null, bestKmDiff = Infinity;
    for(const ex of allExits) {
      const exIdx = ensureIdx(ex);
      if(exIdx === campIdx) continue;
      const diff = Math.abs(cumD[campIdx] - cumD[exIdx]);
      if(diff < bestKmDiff) { bestKmDiff = diff; bestExit = ex; }
    }
    if(!bestExit) continue;

    const key = `${campIdx}-${bestExit.gps_idx}`;
    if(seen.has(key)) continue;
    seen.add(key);

    const i_from = campIdx, i_to = bestExit.gps_idx;
    const lo = Math.min(i_from, i_to), hi = Math.max(i_from, i_to);
    const seg = pts.slice(lo, hi+1);
    const line = [];
    for(let i=0; i<seg.length; i+= Math.max(1, Math.floor(seg.length/200))) {
      line.push([+seg[i].lat.toFixed(6), +seg[i].lng.toFixed(6)]);
    }
    if(line.length < 2) continue;

    const km = +(bestKmDiff / 1000).toFixed(1);
    const drop = Math.round(pts[i_from].elev - pts[i_to].elev);
    const direction = i_from > i_to ? '原路返回（反向）' : '继续前进';

    let desc, crossInfo;
    if(bestExit._cross) {
      const crossDist = bestExit._crossDist;
      crossInfo = `接驳至《${bestExit.trailName}》轨迹（距接驳点 ${crossDist}m 内），沿主轨迹行进约 ${km}km，落差 ${Math.abs(drop)}m。`;
      desc = `${direction}，${crossInfo}`;
    } else {
      desc = `${direction}，沿主轨迹 GPS 路线。约 ${km}km，落差 ${Math.abs(drop)}m（${drop > 0 ? '下降' : drop < 0 ? '上升' : '平路'}）。`;
    }

    routes.push({
      id: `escape-${camp.id || campIdx}`,
      name: `从 ${camp.label || camp.name} 下撤至 ${bestExit.label || bestExit.name}`,
      desc,
      distance_km: km,
      drop_m: drop,
      line,
      _anchor: bestExit._cross ? { trailId: bestExit.trailId, trailName: bestExit.trailName } : null,
    });
  }
  return routes;
}


/** 按天数把 GPS 点分组，生成每日元信息（距离/爬升/最高海拔/营地/关键标注点） */
function buildDayMeta(trackPoints, track, enrichedWps, cumD) {
  const days = {};
  for(let i=0; i<trackPoints.length; i++) {
    const d = track[i][5];
    if(!days[d]) days[d] = { indexes: [] };
    days[d].indexes.push(i);
  }
  return Object.keys(days).map(Number).sort((a,b)=>a-b).map(d => {
    const idxs = days[d].indexes;
    const i_s = idxs[0], i_e = idxs[idxs.length-1];
    const km = (cumD[i_e] - cumD[i_s]) / 1000;
    const segElevs = trackPoints.slice(i_s, i_e+1).map(p => p.elev);
    const asc = accumulatorAscent(segElevs, 10).slice(-1)[0];
    const desc = accumulatorDescent(segElevs, 10).slice(-1)[0];
    const maxE = Math.max(...segElevs);
    const minE = Math.min(...segElevs);
    const dayWps = enrichedWps.filter(w => w.gps_idx >= i_s && w.gps_idx <= i_e);
    const camps = dayWps.filter(w => w.tag === 'camp');
    const camp = camps[camps.length-1];
    const keyWps = dayWps.filter(w => ['start','camp','pass','village','supply','end'].includes(w.tag));
    return {
      d, date: '',
      km: +km.toFixed(1),
      asc: Math.round(asc),
      desc: Math.round(desc),
      max: Math.round(maxE),
      min: Math.round(minE),
      camp: camp ? camp.label : '未标注',
      camp_elev: camp ? camp.elev : Math.round(maxE),
      seg: keyWps.length ? keyWps.slice(0,5).map(w => w.label).join(' → ') : `D${d}行程`,
      i_start: i_s, i_end: i_e,
    };
  });
}


/** 生成下一个可用的自增 ID（1, 2, 3...）。用户可后续手动改成任意字符串 */
function generateNextTrailId() {
  let nextSeq = 1;
  for(const ex of DATA.trails) {
    const n = parseInt(ex.id, 10);
    if(!isNaN(n) && String(n) === String(ex.id) && n >= nextSeq) nextSeq = n + 1;
  }
  while(DATA.trails.some(ex => ex.id === String(nextSeq))) nextSeq++;
  return String(nextSeq);
}

function parseAndProcessKml(xmlText, filename) {
  const { title, trackPoints, waypoints } = parseKml(xmlText);
  if(trackPoints.length === 0) return null;

  const track = processTrack(trackPoints);
  const enrichedWps = enrichWaypoints(waypoints, trackPoints).filter(w => w.name);
  const escapeRoutes = state.autoGenerateEscape
    ? buildEscapeRoutes(enrichedWps, trackPoints, DATA.trails)
    : [];

  const cumD = computeCumulativeDistance(trackPoints);
  const dayMeta = buildDayMeta(trackPoints, track, enrichedWps, cumD);
  const elevs = trackPoints.map(p => p.elev);
  const smoothE = smoothElev(elevs, 7);

  return {
    id: generateNextTrailId(),
    name: title,
    source: '',
    color: '#f97316',
    days: dayMeta.length,
    stats: computeTrailStats(elevs, cumD, smoothE),
    day_meta: dayMeta,
    track,
    _descCum: accumulatorDescent(elevs, 10),
    waypoints: enrichedWps,
    escape_routes: escapeRoutes,
    calc_method: {
      distance: 'haversine球面公式累加',
      ascent: '累加器法 thr=10m',
      elev_smooth: '滑动平均 win=7',
      wp_match: '真实坐标投影到最近GPS点',
    },
  };
}
