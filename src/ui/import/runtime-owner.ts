// @ts-nocheck

export interface ImportRuntimeDependencies {
  document: Document;
  [name: string]: unknown;
}

/** Owns KML/ZIP import DOM and delegates all project writes to FileImportController. */
export function createImportRuntime(dependencies: ImportRuntimeDependencies) {
  const {document, HTM_APP, fflate, runtimeContext, trailContentHash, applyChange,
    resetView, selectors, projectActions, projectSelectors, buildEscapeRoutes, parseAndProcessKml, escapeUiText, t,
    studioDialogs, getCurrentLang} = dependencies;
  /* ============ Add Trail UI (KML upload) ============ */
  const addBtn = document.getElementById('add-trail-btn');
  const addModal = document.getElementById('add-trail-modal');
  const addCancel = document.getElementById('add-cancel');
  const addStatus = document.getElementById('add-status');
  const kmlDrop = document.getElementById('kml-drop');
  const kmlFile = document.getElementById('kml-file');
  const kmlList = document.getElementById('kml-list');
  const projectRestoreBtn = document.getElementById('project-restore-btn');
  const projectFile = document.getElementById('project-file');

  function _closeAddModal() {
    addModal.classList.remove('open');
    // 清除上次的解析记录
    setTimeout(() => {
      if(kmlList) kmlList.innerHTML = '';
      if(addStatus) addStatus.textContent = '';
      if(kmlFile) kmlFile.value = '';
      if(projectFile) projectFile.value = '';
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
   * 保证 trail.id 在 projectSelectors.trails() 中唯一（时间戳+随机极端撞车时补序号）
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
    const trailId = escapeUiText(trail.id);
    const trailSource = escapeUiText(trail.source || '');
    row.innerHTML = `
      <div style="color:#5cb85c;font-size:11px;margin-bottom:6px">✓ ${escapeUiText(displayLabel)} → <b>${escapeUiText(trail.name)}</b> (${trail.stats.distance_km}km, ↑${trail.stats.ascent_m}m, ${trail.waypoints.length} ${t('add.waypoints') || '标注点'})</div>
      <div style="display:flex;gap:6px;align-items:center;font-size:11px">
        <span style="color:var(--text-muted);min-width:30px">${t('trail.id')}:</span>
        <input type="text" class="kml-row-id" data-tid="${trailId}" value="${trailId}" style="flex:1;background:var(--bg-2);border:1px solid var(--line);color:var(--text);padding:4px 6px;border-radius:3px;font-size:11px;font-family:monospace">
      </div>
      <div style="display:flex;gap:6px;align-items:center;font-size:11px;margin-top:4px">
        <span style="color:var(--text-muted);min-width:30px">🔗:</span>
        <input type="text" class="kml-row-source" data-tid="${trailId}" value="${trailSource}" placeholder="${t('add.urlPlaceholder') || 'None'}" style="flex:1;background:var(--bg-2);border:1px solid var(--line);color:var(--text);padding:4px 6px;border-radius:3px;font-size:11px">
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
          title:getCurrentLang() === 'zh' ? '无法修改 ID' : 'Cannot change ID',
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
      kmlList.insertAdjacentHTML('beforeend', `<div style="color:#ff8888">❌ ${escapeUiText(f.name)}：不是 KML/ZIP 文件</div>`);
      return 'failed';
    }
    const displayLabel = f._fromZip ? `${f._fromZip} → ${f.name}` : f.name;
    addStatus.textContent = `⏳ 解析 ${displayLabel}...`;
    addStatus.style.color = 'var(--text-dim)';

    try {
      const text = await f.text();
      const trail = parseAndProcessKml(text, f.name);
      if(!trail) {
        kmlList.insertAdjacentHTML('beforeend', `<div style="color:#ff8888">❌ ${escapeUiText(displayLabel)}：未找到轨迹点</div>`);
        return 'failed';
      }

      const result = fileImportController.addTrail(trail);
      if(result.status === 'duplicate') {
        kmlList.insertAdjacentHTML('beforeend', `<div style="color:#f59e0b">⚠ ${escapeUiText(displayLabel)}：与「${escapeUiText(result.duplicate.name)}」重复，已跳过</div>`);
        return 'skipped';
      }

      renderKmlImportRow(displayLabel, trail);
      addStatus.textContent = '';
      return 'added';
    } catch(err) {
      console.error('[importSingleKml] 处理失败:', displayLabel, err);
      kmlList.insertAdjacentHTML('beforeend', `<div style="color:#ff8888">❌ ${escapeUiText(displayLabel)}：${escapeUiText(err.message)}</div>`);
      return 'failed';
    }
  }

  /**
   * 完成导入后的收尾：清下撤高亮、重算 escape_routes（可选）、fit 视野、持久化
   */
  function postImportFinalize(addedCount) {
    if(addedCount === 0) return;
    if(selectors.autoGenerateEscape()) {
      projectActions.mutateTrails('escape.generate', trails => {
        for(const tr of trails) {
          if(!tr.waypoints || !tr.track || !tr.track.length) continue;
          const fakePts = tr.track.map(p => ({ lat: p[0], lng: p[1], elev: p[2] || 0 }));
          const others = trails.filter(t => t.id !== tr.id);
          tr.escape_routes = buildEscapeRoutes(tr.waypoints, fakePts, others);
        }
      });
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

  return Object.freeze({
    addBtn, addModal, addCancel, addStatus, kmlDrop, kmlFile, kmlList,
    projectRestoreBtn, projectFile, PALETTE_LOCAL, fileArchiveAdapter,
    fileImportController, _closeAddModal, handleFileImportEvent, expandZipFiles,
    ensureUniqueTrailId, findDuplicateTrail, renderKmlImportRow,
    bindKmlImportRowEvents, importSingleKml, postImportFinalize, handleFiles,
  });
}
