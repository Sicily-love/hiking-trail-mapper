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
  const expanded = [];
  for(const f of files) {
    const lower = f.name.toLowerCase();
    if(!(lower.endsWith('.zip') || lower.endsWith('.kml.zip'))) {
      expanded.push(f); continue;
    }
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      if(typeof fflate === 'undefined' || typeof fflate.unzipSync !== 'function') {
        throw new Error('fflate 未加载，无法解压 zip');
      }
      const entries = fflate.unzipSync(buf);
      let picked = 0;
      for(const [path, bytes] of Object.entries(entries)) {
        if(!path.toLowerCase().endsWith('.kml')) continue;
        // 跳过 __MACOSX 和隐藏文件（macOS 打包容易带进去）
        if(path.startsWith('__MACOSX/') || path.split('/').some(seg => seg.startsWith('.'))) continue;
        const text = new TextDecoder('utf-8').decode(bytes);
        expanded.push({
          name: path.split('/').pop() || path,
          _fromZip: f.name,
          text: async () => text,
        });
        picked++;
      }
      if(picked === 0) {
        kmlList.innerHTML += `<div style="color:#ff8888">❌ ${f.name}：压缩包内未找到 .kml 文件</div>`;
      } else {
        kmlList.innerHTML += `<div style="color:#5cb85c;font-size:11px">📦 ${f.name} → 提取 ${picked} 个 KML</div>`;
      }
    } catch(err) {
      console.error('[expandZipFiles] 解压 zip 失败:', f.name, err);
      kmlList.innerHTML += `<div style="color:#ff8888">❌ ${f.name}：解压失败（${err.message}）</div>`;
    }
  }
  return expanded;
}

/**
 * 保证 trail.id 在 DATA.trails 中唯一（时间戳+随机极端撞车时补序号）
 */
function ensureUniqueTrailId(trail) {
  let safeId = trail.id;
  let suffix = 0;
  while(DATA.trails.some(t => t.id === safeId)) {
    suffix++;
    safeId = trail.id + '-' + suffix;
  }
  trail.id = safeId;
}

/**
 * 检查 trail 是否与已有轨迹重复（基于 trailContentHash）
 * @returns {Trail|null} 重复的现有轨迹；null 表示不重复
 */
function findDuplicateTrail(trail) {
  const newHash = trailContentHash(trail);
  const dup = DATA.trails.find(t => {
    if(!t._contentHash) t._contentHash = trailContentHash(t);
    return t._contentHash === newHash;
  });
  if(dup) return dup;
  trail._contentHash = newHash;
  return null;
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
    const tr = DATA.trails.find(x => x.id === cachedTid);
    if(!tr || newId === cachedTid) return;
    if(!newId) { idInput.value = cachedTid; return; }
    if(DATA.trails.some(other => other !== tr && other.id === newId)) {
      void studioDialogs.info({
        title:currentLang === 'zh' ? '无法修改 ID' : 'Cannot change ID',
        message:'ID 已存在 / ID already exists',
        danger:true,
      });
      idInput.value = cachedTid;
      return;
    }
    const oldId = cachedTid;
    tr.id = newId;
    dispatchState({type:'trail-id.rename', oldId, newId});
    cachedTid = newId;
    srcInput.dataset.tid = newId;
    idInput.dataset.tid = newId;
    applyChange();
  });

  srcInput.addEventListener('change', () => {
    const tr = DATA.trails.find(x => x.id === cachedTid);
    if(!tr) return;
    tr.source = srcInput.value.trim();
    applyChange();
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

    const dup = findDuplicateTrail(trail);
    if(dup) {
      kmlList.innerHTML += `<div style="color:#f59e0b">⚠ ${displayLabel}：与「${dup.name}」重复，已跳过</div>`;
      return 'skipped';
    }

    ensureUniqueTrailId(trail);
    trail.color = PALETTE_LOCAL[DATA.trails.length % PALETTE_LOCAL.length];
    // v1.20.0：当前无选中分组时，新轨迹归入「默认」组（否则会成为"孤儿"）
    if(!trail.group) trail.group = state.activeGroup || '默认';
    DATA.trails.push(trail);
    dispatchState({type:'active-trail.set', trailId:trail.id, active:true});

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
  dispatchState({type:'escape.set-active', escapeId:null});
  if(state.autoGenerateEscape) {
    for(const tr of DATA.trails) {
      if(!tr.waypoints || !tr.track || !tr.track.length) continue;
      const fakePts = tr.track.map(p => ({ lat: p[0], lng: p[1], elev: p[2] || 0 }));
      const others = DATA.trails.filter(t => t.id !== tr.id);
      tr.escape_routes = buildEscapeRoutes(tr.waypoints, fakePts, others);
    }
  }
  applyChange({ fit: false });
  // v1.22.0：导入完成后自动执行完整复位
  if(typeof resetView === 'function') resetView();
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
function downloadTrailKML(id) {
  const trail = DATA.trails.find(t => t.id === id);
  if(!trail) return;
  const track = trail.track;
  const waypoints = trail.waypoints;
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name><![CDATA[${trail.name}]]></name>
    <description><![CDATA[${trail.id} | ${trail.stats.distance_km}km ↑${trail.stats.ascent_m}m | 最高${trail.stats.max_elev}m]]></description>
    <Style id="trackStyle">
      <LineStyle><color>ff${trail.color.replace('#','').split('').reverse().join('')}</color><width>3</width></LineStyle>
    </Style>
`;
  // 轨迹线
  kml += `    <Placemark>
      <name><![CDATA[${trail.name}]]></name>
      <styleUrl>#trackStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
`;
  track.forEach(p => { kml += `          ${p[1]},${p[0]},${p[2]||0}
`; });
  kml += `        </coordinates>
      </LineString>
    </Placemark>
`;
  // 标注点
  waypoints.forEach(wp => {
    if(!wp.lat || !wp.lng) return;
    kml += `    <Placemark>
      <name><![CDATA[${wp.label || wp.icon}]]></name>
      <description><![CDATA[${wp.tag} | ${wp.elev}m | ${wp.km}km]]></description>
      <Point><coordinates>${wp.lng},${wp.lat},${wp.elev||0}</coordinates></Point>
    </Placemark>
`;
  });
  kml += `  </Document>
</kml>`;
  const blob = new Blob([kml], {type:'application/vnd.google-earth.kml+xml'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${trail.name}.kml`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('✓ KML 已下载：' + trail.name);
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

/* ─── v1.14.1：批量导出当前组叠加中的轨迹为 ZIP ───────────────
   ZIP 内容：
     - 每条轨迹独立一个 .kml（含轨迹线 + 标注点）
     - _<组名>_合并.kml：所有轨迹合并到一个 Document（便于一键导入不支持多文件的设备）
     - README.txt：说明与轨迹清单
   fflate 未加载时降级为逐条下载 KML。
   ────────────────────────────────────────────────────────────── */
function _trailToKMLString(trail) {
  const track = trail.track;
  const waypoints = trail.waypoints || [];
  const colorHex = (trail.color || '#3F5238').replace('#','');
  const kmlColor = 'ff' + colorHex.slice(4,6) + colorHex.slice(2,4) + colorHex.slice(0,2);
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name><![CDATA[${trail.name}]]></name>
    <description><![CDATA[${trail.id} | ${trail.stats.distance_km}km ↑${trail.stats.ascent_m}m | 最高${trail.stats.max_elev}m | 分组：${trailGroup(trail)}]]></description>
    <Style id="trackStyle"><LineStyle><color>${kmlColor}</color><width>3</width></LineStyle></Style>
    <Placemark>
      <name><![CDATA[${trail.name}]]></name>
      <styleUrl>#trackStyle</styleUrl>
      <LineString><tessellate>1</tessellate><coordinates>
`;
  track.forEach(p => { kml += `        ${p[1]},${p[0]},${p[2]||0}\n`; });
  kml += `      </coordinates></LineString>
    </Placemark>
`;
  waypoints.forEach(wp => {
    if(!wp.lat || !wp.lng) return;
    kml += `    <Placemark>
      <name><![CDATA[${wp.label || wp.icon || wp.tag}]]></name>
      <description><![CDATA[${wp.tag} | ${wp.elev}m | ${wp.km}km]]></description>
      <Point><coordinates>${wp.lng},${wp.lat},${wp.elev||0}</coordinates></Point>
    </Placemark>
`;
  });
  kml += `  </Document>
</kml>`;
  return kml;
}

function _buildMergedKML(trails, groupName) {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name><![CDATA[${groupName}（合并）]]></name>
    <description><![CDATA[导出时间：${new Date().toLocaleString('zh-CN')} | 共 ${trails.length} 条轨迹]]></description>
`;
  trails.forEach(trail => {
    const colorHex = (trail.color || '#3F5238').replace('#','');
    const kmlColor = 'ff' + colorHex.slice(4,6) + colorHex.slice(2,4) + colorHex.slice(0,2);
    kml += `    <Style id="s_${trail.id}"><LineStyle><color>${kmlColor}</color><width>3</width></LineStyle></Style>
    <Folder><name><![CDATA[${trail.name}]]></name>
      <Placemark>
        <name><![CDATA[${trail.name} 轨迹]]></name>
        <styleUrl>#s_${trail.id}</styleUrl>
        <LineString><tessellate>1</tessellate><coordinates>
`;
    trail.track.forEach(p => { kml += `          ${p[1]},${p[0]},${p[2]||0}\n`; });
    kml += `        </coordinates></LineString>
      </Placemark>
`;
    (trail.waypoints || []).forEach(wp => {
      if(!wp.lat || !wp.lng) return;
      kml += `      <Placemark>
        <name><![CDATA[${wp.label||wp.icon||wp.tag}]]></name>
        <description><![CDATA[${wp.tag}|${wp.elev}m|${wp.km}km]]></description>
        <Point><coordinates>${wp.lng},${wp.lat},${wp.elev||0}</coordinates></Point>
      </Placemark>
`;
    });
    kml += `    </Folder>
`;
  });
  kml += `  </Document>
</kml>`;
  return kml;
}

function exportGroupKML() {
  const trails = DATA.trails.filter(t => isTrailActive(t));
  if(!trails.length) {
    showToast('当前组没有叠加中的轨迹', 'error');
    return;
  }
  const groupName = state.activeGroup || '未选中';
  const timestamp = new Date().toISOString().slice(0,10);
  const safeGroup = groupName.replace(/[\\/:*?"<>|]/g, '_');

  if(typeof fflate !== 'undefined') {
    const files = {};
    // 独立 KML
    trails.forEach(trail => {
      const kml = _trailToKMLString(trail);
      const safeName = trail.name.replace(/[\\/:*?"<>|]/g, '_');
      files[`轨迹/${safeName}.kml`] = fflate.strToU8(kml);
    });
    // 合并 KML（前缀 _ 排在前面）
    files[`_${safeGroup}_合并导入.kml`] = fflate.strToU8(_buildMergedKML(trails, groupName));
    // README
    const readme = `# ${groupName} 轨迹包

导出时间：${new Date().toLocaleString('zh-CN')}
共 ${trails.length} 条轨迹

## 使用方式
- **推荐**：直接拖拽本文件夹里所有 *.kml 到目标地图（支持多选）
- **一键导入**：拖拽 _${safeGroup}_合并导入.kml 一个文件，即可加载全部
- **单条查看**：轨迹/ 目录下每条轨迹独立 KML

## 轨迹清单
${trails.map((t, i) => `${i+1}. ${t.name}  (${t.stats.distance_km}km, ↑${t.stats.ascent_m}m, 最高 ${t.stats.max_elev}m, ${t.waypoints.length} 个标注点)`).join('\n')}
`;
    files['README.txt'] = fflate.strToU8(readme);

    fflate.zip(files, {level: 6}, (err, data) => {
      if(err) { showToast('ZIP 打包失败：' + err.message, 'error'); return; }
      const blob = new Blob([data], {type: 'application/zip'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${safeGroup}_轨迹_${timestamp}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast(`✓ 已导出 ${trails.length} 条轨迹 → ${a.download}`);
    });
  } else {
    // fflate 未加载：先下载合并 KML（一键导入用），再逐条下载单独 KML
    showToast(`ZIP 库未加载，将下载 ${trails.length + 1} 个 KML 文件（首个为合并版）…`, 'info', 4000);
    // 合并版
    const mergedBlob = new Blob([_buildMergedKML(trails, groupName)], {type:'application/vnd.google-earth.kml+xml'});
    const a0 = document.createElement('a');
    a0.href = URL.createObjectURL(mergedBlob);
    a0.download = `_${safeGroup}_合并导入.kml`;
    a0.click();
    URL.revokeObjectURL(a0.href);
    // 单独 KML
    trails.forEach((trail, i) => {
      setTimeout(() => {
        const kml = _trailToKMLString(trail);
        const blob = new Blob([kml], {type:'application/vnd.google-earth.kml+xml'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const safeName = trail.name.replace(/[\\/:*?"<>|]/g, '_');
        a.download = `${safeName}.kml`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, (i + 1) * 400);
    });
  }
}


/* ─── 生成单天海拔剖面图 Canvas，返回 base64 PNG dataURL ─── */
function buildDayElevChart(pts, color, dayLabel) {
  const CW = 900, CH = 200;
  const c = document.createElement('canvas'); c.width = CW; c.height = CH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1f2e'; ctx.fillRect(0, 0, CW, CH);
  const alts = pts.map(p => p[2]);
  const minE = Math.min(...alts), maxE = Math.max(...alts), eRng = maxE - minE || 1;
  const PL = 52, PR = 12, PT = 24, PB = 32;
  const pw = CW - PL - PR, ph = CH - PT - PB;
  const pX = i => PL + (i / (pts.length - 1)) * pw;
  const pY = a => PT + ph * (1 - (a - minE) / eRng);
  // 填充区域
  ctx.beginPath();
  ctx.moveTo(PL, PT + ph);
  pts.forEach((p, i) => ctx.lineTo(pX(i), pY(p[2])));
  ctx.lineTo(PL + pw, PT + ph);
  ctx.closePath();
  // 将 hex color 转为 rgba
  let r=100,g=150,b=255;
  const m = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if(m){r=parseInt(m[1],16);g=parseInt(m[2],16);b=parseInt(m[3],16);}
  const grad = ctx.createLinearGradient(0, PT, 0, PT + ph);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad; ctx.fill();
  // 轮廓线
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(pX(i), pY(p[2])) : ctx.lineTo(pX(i), pY(p[2])));
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  // Y 轴刻度
  ctx.font = '11px monospace'; ctx.textAlign = 'right';
  [0, 0.5, 1].forEach(f => {
    const e = minE + f * eRng, y = PT + ph * (1 - f);
    ctx.fillStyle = 'rgba(100,120,150,0.25)';
    ctx.fillRect(PL, y - 0.5, pw, 1);
    ctx.fillStyle = '#8899aa'; ctx.fillText(Math.round(e) + 'm', PL - 4, y + 4);
  });
  // 最高点
  const peakIdx = alts.indexOf(maxE);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(pX(peakIdx), pY(maxE), 4, 0, Math.PI * 2); ctx.fill();
  ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
  ctx.fillText('▲' + Math.round(maxE) + 'm', pX(peakIdx), pY(maxE) - 10);
  // 起终高度
  ctx.font = '11px monospace'; ctx.fillStyle = '#aabbcc';
  ctx.textAlign = 'left';  ctx.fillText(Math.round(alts[0]) + 'm', PL + 2, CH - 8);
  ctx.textAlign = 'right'; ctx.fillText(Math.round(alts[alts.length-1]) + 'm', PL + pw - 2, CH - 8);
  // 标题
  ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = color; ctx.textAlign = 'left';
  ctx.fillText(dayLabel + ' 海拔剖面', PL, 16);
  return c.toDataURL('image/png');
}


async function exportItineraryMD() {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main) { showToast('请先设置主轨迹', 'error'); return; }
  const isZh = currentLang === 'zh';

  // ── 按天分组 ──
  const track = main.track;
  const days = {};
  track.forEach(p => { const d = p[5] || 1; if(!days[d]) days[d] = []; days[d].push(p); });
  const dayKeys = Object.keys(days).map(Number).sort((a,b) => a-b);
  const DAY_COLORS = dayPalette;

  // ── 辅助函数 ──
  function haversine2d(p1, p2) {
    const R=6371, dLat=(p2[0]-p1[0])*Math.PI/180, dLon=(p2[1]-p1[1])*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(p1[0]*Math.PI/180)*Math.cos(p2[0]*Math.PI/180)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }
  function dayDist2(pts) { let d=0; for(let i=1;i<pts.length;i++) d+=haversine2d(pts[i-1],pts[i]); return d.toFixed(1); }
  function dayAsc2(pts) { let a=0,prev=pts[0][2]; pts.forEach(p=>{const d=p[2]-prev;if(d>10)a+=d;prev=p[2];}); return Math.round(a); }
  function dayMax2(pts) { return Math.round(Math.max(...pts.map(p=>p[2]))); }
  function dayMin2(pts) { return Math.round(Math.min(...pts.map(p=>p[2]))); }

  // ── 生成每天海拔剖面图 ──
  showToast('⏳ 生成行程图…');
  const dayCharts = {};
  dayKeys.forEach((dk, di) => {
    dayCharts[dk] = buildDayElevChart(days[dk], DAY_COLORS[di % DAY_COLORS.length], 'D' + dk);
  });

  // ── 生成 MD 内容 ──
  let md = `# ${main.name} ${isZh ? '行程表' : 'Itinerary'}\n\n`;
  md += `> 总里程 **${main.stats.distance_km}km** · 爬升 **${main.stats.ascent_m}m** · 最高 **${main.stats.max_elev}m** · ${dayKeys.length}天\n\n---\n\n`;

  // 汇总表格
  md += `| 天数 | 里程 | 爬升 | 最高海拔 | 最低海拔 | 营地 |\n|---|---|---|---|---|---|\n`;
  if(main.day_meta && main.day_meta.length) {
    main.day_meta.forEach(d => {
      md += `| D${d.d||'?'} | ${d.km||'-'}km | ${d.asc||'-'}m | ${d.max||'-'}m | ${d.min||'-'}m | ${d.camp||'-'}(${d.camp_elev||'?'}m) |\n`;
    });
  } else {
    dayKeys.forEach((dk, di) => {
      const pts = days[dk];
      const camp = main.waypoints.find(w => w.tag === 'camp' && (w.day || di+1) === dk);
      md += `| D${dk} | ${dayDist2(pts)}km | ${dayAsc2(pts)}m | ${dayMax2(pts)}m | ${dayMin2(pts)}m | ${camp ? camp.label + ' ' + camp.elev + 'm' : '-'} |\n`;
    });
  }
  md += '\n---\n\n';

  // 每天详情 + 海拔剖面图
  dayKeys.forEach((dk, di) => {
    const pts = days[dk];
    const color = DAY_COLORS[di % DAY_COLORS.length];
    const km = dayDist2(pts), asc = dayAsc2(pts), maxE = dayMax2(pts), minE = dayMin2(pts);
    const camp = main.waypoints.find(w => w.tag === 'camp' && ((w.day || di+1) === dk));
    const passes = main.waypoints.filter(w => w.tag === 'pass' && ((w.day || di+1) === dk));
    const imgUrl = dayCharts[dk];

    md += `## D${dk}\n\n`;
    md += `**里程**: ${km}km　**爬升**: ${asc}m　**最高**: ${maxE}m　**最低**: ${minE}m`;
    if(camp) md += `　**营地**: ${camp.label} (${camp.elev}m)`;
    md += '\n\n';
    if(passes.length) md += passes.map(p => `**垭口**: ${p.label} (${p.elev}m)`).join('　') + '\n\n';

    // 嵌入 base64 海拔剖面图
    md += `![D${dk} 海拔剖面](${imgUrl})\n\n`;

    md += '---\n\n';
  });

  const blob = new Blob([md], {type:'text/markdown;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `${main.name}_${isZh?'行程':'itinerary'}.md`;
  if(window.showSaveFilePicker) {
    try {
      const h = await showSaveFilePicker({suggestedName:a.download,types:[{description:'MD',accept:{'text/markdown':['.md']}}]});
      const w = await h.createWritable(); await w.write(blob); await w.close();
      showToast('✓ MD 已保存'); return;
    } catch(e) {}
  }
  a.click(); URL.revokeObjectURL(a.href); showToast('✓ 行程 MD（含海拔图）已导出');
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
