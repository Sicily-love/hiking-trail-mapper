// @ts-nocheck

export interface SidebarRuntimeDependencies {
  document: Document;
  window: Window;
  [name: string]: unknown;
}

/** Owns sidebar, itinerary, filter, and map-mode DOM orchestration. */
export function createSidebarRuntime(dependencies: SidebarRuntimeDependencies) {
  const {document, window, DAY_ITINERARY_WAYPOINT_TAGS, HTM_APP, HTM_CORE, L, STUDIO_COMMANDS, TAG_RULES_JS,
    applyChange, baseLayers, beginRuntimeInteraction, cancelRuntimeInteraction, clearEscape,
    commandRegistry, createFloatingPanelPositionController, createWorkbenchIcon, getCurrentLang,
    dayPalette, deleteTrail, t, stateActions, dispatchStudioCommand, downloadTrailKML, drawTracks,
    drawWaypoints, escapeController, escapeUiText, fitWorkspaceBounds, getCurrentBase, getGroups,
    hideMeasureElevReadout, interactionManager, isTrailActive, map, markTrailRevision,
    measureMarker, measureState, projectActions, projectSelectors, recordProjectEdit, refreshElevBar, requestSegmentExit,
    reverseTrail, runtimeContext, sanitizeExternalHttpUrl, sanitizeHexColor, saveToStorage,
    setCurrentBase, setMeasureElevHint, showEscape, showToast, selectors, studioDialogs,
    switchGroup, tagColors, toggleSidebar, toggleTrailActive, toggleTrailBatch,
    toggleTrailExpanded, trailController, trailGroup, waypointIconMarkup, wpMarkers} = dependencies;
  function renderPrimaryCard() {
    const card = document.getElementById('primary-card');
    const toolbarContext = document.getElementById('toolbar-context');
    if(!card) return;
    const main = selectors.activeGroup() == null ? null : projectSelectors.trails().find(t => t.id === selectors.primaryTrailId());
    if(!main) {
      // v1.20.0：区分"未选中分组"和"没有轨迹/主轨迹"两种空态
      const emptyKey = (selectors.activeGroup() == null && projectSelectors.trails().length > 0)
        ? 'pc.emptyGroup'
        : 'pc.empty';
      card.innerHTML = `<div style="font-size:11px;color:var(--text-muted);font-style:italic;text-align:center;padding:20px 4px">${t(emptyKey)}</div>`;
      if(toolbarContext) toolbarContext.textContent = t(projectSelectors.trails().length ? 'toolbar.noGroup' : 'toolbar.noTrail');
      return;
    }
    if(toolbarContext) toolbarContext.textContent = `${main.stats.distance_km} KM · ${main.name}`;
    const primarySourceUrl = sanitizeExternalHttpUrl(main.source);
    const sourceLink = primarySourceUrl
      ? `<a href="${escapeUiText(primarySourceUrl)}" target="_blank" rel="noopener noreferrer" class="pc-link" title="${escapeUiText(primarySourceUrl)}">${t('pc.source')}</a>` : '';
    card.innerHTML = `
      <div class="pc-eyebrow">${t('pc.eyebrow')}</div>
      <div class="pc-name" id="pc-name" title="${getCurrentLang() === 'zh' ? '点击重命名' : 'Click to rename'}" style="cursor:pointer">${escapeUiText(main.name)}</div>
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
    if(renameEl) renameEl.addEventListener('click', () => void editTrailName(main));
    const dlBtn = document.getElementById('pc-dl-kml');
    if(dlBtn) dlBtn.addEventListener('click', e => {
      e.preventDefault();
      downloadTrailKML(main.id);
    });
    const editLinkBtn = document.getElementById('pc-edit-link');
    if(editLinkBtn) editLinkBtn.addEventListener('click', async e => {
      e.preventDefault();
      const newLink = await studioDialogs.prompt({
        title:getCurrentLang() === 'zh' ? '编辑来源链接' : 'Edit source link',
        inputLabel:'URL',
        value:main.source || '',
        selectOnOpen:true,
        confirmLabel:getCurrentLang() === 'zh' ? '保存' : 'Save',
        cancelLabel:getCurrentLang() === 'zh' ? '取消' : 'Cancel',
      });
      if(newLink !== null) {
        projectActions.mutateTrail(main.id, 'trail.source', trail => { trail.source = newLink.trim(); });
        saveToStorage(); renderPrimaryCard();
      }
    });
    // 同步小卡（侧栏收起时显示）
    buildPrimaryMini();
  }

  const primaryMiniController = HTM_APP.createPrimaryMiniController({
    element:document.getElementById('primary-mini'),
    mapElement:document.getElementById('map'),
    storage:window.localStorage,
    getTrail:() => selectors.activeGroup() == null ? null : projectSelectors.trails().find(trail => trail.id === selectors.primaryTrailId()) || null,
    translate:t,
    escapeText:escapeUiText,
    dragHint:() => getCurrentLang() === 'zh' ? '拖动可移动' : 'Drag to move',
    openSidebar:() => toggleSidebar(true),
  });
  const PRIMARY_MINI_POS_KEY = primaryMiniController.storageKey;
  function clampPrimaryMiniPosition(_mini, left, top) { return primaryMiniController.clamp(left, top); }
  function applyPrimaryMiniPosition() { primaryMiniController.applyPosition(); }
  function schedulePrimaryMiniPositionApply() { primaryMiniController.schedulePositionApply(); }
  function savePrimaryMiniPosition() { primaryMiniController.savePosition(); }
  function bindPrimaryMiniDrag() { return primaryMiniController; }
  function buildPrimaryMini() { return primaryMiniController.render(); }

  const floatingPanelController = createFloatingPanelPositionController({
    document,
    viewport:window,
    storage:window.localStorage,
    disablePropagation:element => {
      L.DomEvent?.disableClickPropagation(element);
      L.DomEvent?.disableScrollPropagation(element);
    },
  });

  function initFloatingPanelPositions() {
    floatingPanelController.bind(document.getElementById('elev-bar'), {
      storageKey: 'hiking_elev_bar_pos',
      mode: 'map',
      handleSelector: '[data-panel-drag]',
      defaultStyle: { left:'14px', right:'auto', top:'auto', bottom:'28px', transform:'' },
    });
    floatingPanelController.bind(document.getElementById('measure-panel'), {
      storageKey: 'hiking_measure_panel_pos',
      mode: 'measure-dock',
      handleSelector: '[data-panel-drag]',
      defaultStyle: { left:'auto', right:'10px', top:'auto', bottom:'8px', transform:'none' },
    });
  }

  // 更新当前模式 · 标注点 标题
  function updateModeTagTitle() {
    const el = document.getElementById('mode-tag-title');
    if(!el) return;
    const key = 'mode.tagTitle.' + selectors.mode();
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

  /** 独立轨迹组页面中的分组选择列表。 */
  function renderGroupTabs() {
    const groups = getGroups();
    const bar = document.createElement('div');
    bar.className = 'group-tab-bar studio-group-list';
    groups.forEach(g => {
      const btn = document.createElement('button');
      const count = projectSelectors.trails().filter(t => trailGroup(t) === g).length;
      btn.className = 'group-tab' + (g === selectors.activeGroup() ? ' active' : '');
      btn.setAttribute('aria-pressed', String(g === selectors.activeGroup()));
      const name = document.createElement('span');
      const meta = document.createElement('span');
      name.className = 'group-tab-name';
      meta.className = 'group-tab-meta';
      name.textContent = g;
      meta.textContent = getCurrentLang() === 'zh' ? `${count} 条轨迹` : `${count} trails`;
      btn.append(name, meta);
      btn.title = g === selectors.activeGroup()
        ? (getCurrentLang() === 'zh' ? `再次点击取消选中「${g}」组` : `Select again to clear “${g}”`)
        : (getCurrentLang() === 'zh' ? `切换到「${g}」组` : `Switch to “${g}”`);
      btn.addEventListener('click', () => {
        // v1.20.0：再次点击当前 tab → 取消选中（进入无分组显示状态）
        if(g === selectors.activeGroup()) switchGroup(null);
        else switchGroup(g);
      });
      bar.appendChild(btn);
    });
    return bar;
  }

  /** 批量工具栏（仅在 batchSelected.size > 0 时显示） */
  function renderBatchToolbar(others) {
    if(selectors.batchSelected().size === 0) return null;
    const toolbar = document.createElement('div');
    toolbar.className = 'batch-toolbar';

    const info = document.createElement('span');
    info.className = 'info';
    info.textContent = `已选 ${selectors.batchSelected().size} / ${others.length}`;
    toolbar.appendChild(info);

    const btn = (text, muted, onClick) => {
      const b = document.createElement('button');
      if(muted) b.className = 'muted';
      b.textContent = text;
      b.addEventListener('click', onClick);
      return b;
    };
    toolbar.appendChild(btn('全选', false, () => {
      stateActions.replaceBatch(others.map(t => t.id));
      buildTrailList();
    }));
    toolbar.appendChild(btn('反选', false, () => {
      const cur = selectors.batchSelected();
      stateActions.replaceBatch(others.map(t => t.id).filter(id => !cur.has(id)));
      buildTrailList();
    }));

    const moveSel = document.createElement('select');
    const appendMoveOption = (value, label) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      moveSel.appendChild(option);
    };
    appendMoveOption('', '移到…');
    getGroups().filter(g => g !== selectors.activeGroup()).forEach(g => appendMoveOption(g, g));
    appendMoveOption('__new__', '＋ 新建组…');
    moveSel.addEventListener('change', async e => {
      let target = e.target.value;
      if(!target) return;
      if(target === '__new__') {
        const name = await studioDialogs.prompt({
          title:getCurrentLang() === 'zh' ? '新建分组' : 'New group',
          inputLabel:getCurrentLang() === 'zh' ? '分组名称' : 'Group name',
          required:true,
          confirmLabel:getCurrentLang() === 'zh' ? '创建' : 'Create',
          cancelLabel:getCurrentLang() === 'zh' ? '取消' : 'Cancel',
        });
        if(!name || !name.trim()) { e.target.value = ''; return; }
        target = name.trim();
      }
      moveBatchToGroup(target);
    });
    toolbar.appendChild(moveSel);

    toolbar.appendChild(btn('清除', true, () => {
      stateActions.replaceBatch([]);
      buildTrailList();
    }));
    return toolbar;
  }

  /** 执行批量移动（供 renderBatchToolbar 调用） */
  function moveBatchToGroup(target) {
    const ids = [...selectors.batchSelected()];
    let moved = 0;
    projectSelectors.trails().forEach(t => {
      if(!ids.includes(t.id)) return;
      const oldGroup = trailGroup(t);
      t.group = target;
      // v1.21.0：如果被移动的 trail 是 activeGroup 的主轨迹，重新挑一条
      if(t.id === selectors.primaryTrailId()) {
        const remaining = projectSelectors.trails().filter(x => trailGroup(x) === selectors.activeGroup() && x.id !== t.id);
        stateActions.setPrimaryTrail(remaining[0] ? remaining[0].id : null);
      }
      // v1.21.0：如果 trail 是它原来组的主轨迹，清掉原组的记忆（避免"幽灵主轨迹"）
      if(oldGroup !== target && selectors.primaryForGroup(oldGroup) === t.id) {
        const remaining = projectSelectors.trails().filter(x => trailGroup(x) === oldGroup && x.id !== t.id);
        stateActions.setGroupPrimary(oldGroup, remaining[0] ? remaining[0].id : null);
      }
      moved++;
    });
    stateActions.replaceBatch([]);
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
    const trailId = escapeUiText(tr.id);
    return `
      <div class="trail-card-hdr">
        <div class="trail-checkbox ${isBatchChecked ? 'checked' : ''}" data-action="batch-toggle" title="${isBatchChecked ? '已选（点击取消）' : '选中此轨迹'}">${isBatchChecked ? '☑' : '☐'}</div>
        <div class="trail-expand-arrow ${isExpanded ? 'expanded' : ''}" data-action="toggle-expand" title="${isExpanded ? '收起详情' : '展开详情'}">${isExpanded ? '▾' : '▸'}</div>
        <div class="trail-color-dot" style="background:${sanitizeHexColor(tr.color)}"></div>
        <div class="trail-name">${escapeUiText(tr.name)}</div>
        <button type="button" class="trail-rename-btn" data-tid="${trailId}" title="${getCurrentLang() === 'zh' ? '重命名轨迹' : 'Rename trail'}" aria-label="${getCurrentLang() === 'zh' ? '重命名轨迹' : 'Rename trail'}"></button>
        <div class="trail-toggle" style="${isActive ? 'color:var(--accent);font-weight:600' : ''}">${isActive ? '叠加中 ●' : '点击叠加'}</div>
      </div>
    `;
  }

  /** 单张轨迹卡片的详情区 HTML（仅展开态） */
  function trailCardExpandedHtml(tr) {
    const thumbSvg = buildTrailThumbnail(tr);
    const trailId = escapeUiText(tr.id);
    const sourceUrl = sanitizeExternalHttpUrl(tr.source);
    const linkArea = sourceUrl
      ? `<a href="${escapeUiText(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="trail-link-btn" title="${escapeUiText(sourceUrl)}" style="color:var(--accent);font-size:10px;text-decoration:none;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🔗 ${escapeUiText(tr.name)}</a><a href="#" class="trail-edit-link-btn" data-tid="${escapeUiText(tr.id)}" title="${t('trail.editLink')}" style="color:var(--text-muted);font-size:10px;text-decoration:none">✎</a>`
      : `<a href="#" class="trail-edit-link-btn" data-tid="${escapeUiText(tr.id)}" title="${t('trail.editLink')}" style="color:var(--text-muted);font-size:10px;text-decoration:none">🔗 ${t('trail.addLink') || '添加链接'} ✎</a>`;
    const groupOpts = getGroups().map(g => `<option value="${escapeUiText(g)}" ${trailGroup(tr)===g?'selected':''}>${escapeUiText(g)}</option>`).join('');
    // v1.21.0：主轨迹卡不显示"设为主轨迹"按钮，显示 "★ 主轨迹" 标识
    const isPrimary = (tr.id === selectors.primaryTrailId());
    const primaryLabel = isPrimary
      ? `<span style="color:#C6912D;font-size:10px;font-weight:600;letter-spacing:0.02em">★ ${t('trail.isPrimary') || '主轨迹'}</span>`
      : `<a href="#" class="set-primary-btn" data-tid="${trailId}" style="color:var(--accent);font-size:10px;text-decoration:none;font-weight:600;letter-spacing:0.02em">${t('trail.setPrimary')}</a>`;
    return `
      <div class="trail-thumb">${thumbSvg}</div>
      <div class="trail-info" style="align-items:center;gap:8px;flex-wrap:wrap">
        <span><b>${tr.stats.distance_km}</b>${t('header.km')}</span>
        <span>↑<b>${tr.stats.ascent_m}</b>m</span>
        <span>↓<b>${tr.stats.descent_m || 0}</b>m</span>
        <span><b>${tr.days}</b>${t('trail.days')}</span>
        <span style="margin-left:auto;display:inline-flex;align-items:center;gap:4px;font-family:monospace;font-size:10px;color:var(--text-muted);user-select:all">${t('trail.id')}: <span class="trail-id-text" data-tid="${trailId}">${trailId}</span><a href="#" class="trail-edit-id-btn" data-tid="${trailId}" title="${t('trail.editId')}" style="color:var(--accent);font-size:10px;text-decoration:none">✎</a></span>
      </div>
      <div class="trail-info" style="margin-top:4px;align-items:center;gap:10px">
        ${primaryLabel}
        ${linkArea}
        <a href="#" class="trail-dl-kml-btn" data-tid="${trailId}" title="下载 KML" style="color:var(--accent);font-size:10px;text-decoration:none">⬇ KML</a>
        <a href="#" class="trail-delete-btn" data-tid="${trailId}" title="${t('trail.delete')}" style="margin-left:auto;color:var(--accent-2);font-size:10px;text-decoration:none">${t('trail.delete')}</a>
      </div>
      <div class="trail-info" style="margin-top:4px;align-items:center;gap:6px">
        <span style="font-size:10px;color:var(--text-muted)">分组：</span>
        <select class="trail-group-select" data-tid="${trailId}" style="font-size:10px;padding:2px 6px;border:1px solid var(--line);border-radius:3px;background:var(--bg-0);color:var(--text);cursor:pointer;max-width:120px">
          ${groupOpts}
          <option value="__new__">＋ 新建组…</option>
        </select>
      </div>
    `;
  }

  /** 判断 click 是否来自"要走详情按钮独立 handler"的元素 */
  function isDetailButtonTarget(el) {
    return el.closest('.trail-link-btn')
        || el.closest('.trail-rename-btn')
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
    stateActions.setActiveEscape(null);
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
      confirmLabel:getCurrentLang() === 'zh' ? '保存' : 'Save',
      cancelLabel:getCurrentLang() === 'zh' ? '取消' : 'Cancel',
    });
    if(newUrl === null || !projectSelectors.trails().includes(tr)) return false;
    return recordProjectEdit('编辑轨迹来源', 'Edit trail source', () => {
      projectActions.mutateTrail(tr.id, 'trail.source', trail => { trail.source = newUrl.trim(); });
      applyChange();
      return true;
    });
  }

  async function editTrailName(tr) {
    const newName = await studioDialogs.prompt({
      title:getCurrentLang() === 'zh' ? '重命名轨迹' : 'Rename trail',
      inputLabel:getCurrentLang() === 'zh' ? '轨迹名称' : 'Trail name',
      value:tr.name,
      required:true,
      maxLength:120,
      selectOnOpen:true,
      confirmLabel:getCurrentLang() === 'zh' ? '保存' : 'Save',
      cancelLabel:getCurrentLang() === 'zh' ? '取消' : 'Cancel',
    });
    if(!newName || !projectSelectors.trails().includes(tr)) return false;
    return recordProjectEdit('重命名轨迹', 'Rename trail', () => trailController.renameTrail(tr.id, newName));
  }

  async function editTrailId(tr) {
    const newId = await studioDialogs.prompt({
      title:t('trail.editId'),
      inputLabel:'ID',
      value:tr.id,
      required:true,
      selectOnOpen:true,
      confirmLabel:getCurrentLang() === 'zh' ? '保存' : 'Save',
      cancelLabel:getCurrentLang() === 'zh' ? '取消' : 'Cancel',
      validate:value => {
        const trimmed = value.trim();
        return projectSelectors.trails().some(other => other !== tr && other.id === trimmed)
          ? 'ID 已存在 / ID already exists'
          : null;
      },
    });
    if(!newId || !newId.trim() || newId === tr.id || !projectSelectors.trails().includes(tr)) return false;
    return recordProjectEdit('编辑轨迹 ID', 'Edit trail ID', () => {
      const trimmed = newId.trim();
      const oldId = tr.id;
      projectActions.mutateTrail(oldId, 'trail.rename-id', trail => { trail.id = trimmed; });
      stateActions.renameTrailId(oldId, trimmed);
      applyChange();
      return true;
    });
  }

  async function confirmDeleteTrail(tr) {
    const confirmed = await studioDialogs.confirm({
      title:getCurrentLang() === 'zh' ? '删除轨迹' : 'Delete trail',
      message:getCurrentLang() === 'zh' ? `确定删除「${tr.name}」吗？` : `Delete "${tr.name}"?`,
      danger:true,
      confirmLabel:getCurrentLang() === 'zh' ? '删除' : 'Delete',
      cancelLabel:getCurrentLang() === 'zh' ? '取消' : 'Cancel',
    });
    if(!confirmed || !projectSelectors.trails().includes(tr)) return false;
    deleteTrail(tr.id);
    return true;
  }

  function handleTrailDetailClick(tr, e) {
    if(e.target.closest('.trail-rename-btn')) {
      e.preventDefault(); e.stopPropagation();
      void editTrailName(tr);
      return true;
    }
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
      stateActions.setPrimaryTrail(tr.id);
      stateActions.setTrailActive(tr.id, true);
      stateActions.setActiveEscape(null);
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
        title:getCurrentLang() === 'zh' ? '新建分组' : 'New group',
        inputLabel:getCurrentLang() === 'zh' ? '分组名称' : 'Group name',
        required:true,
        confirmLabel:getCurrentLang() === 'zh' ? '创建' : 'Create',
        cancelLabel:getCurrentLang() === 'zh' ? '取消' : 'Cancel',
      });
      if(!name || !name.trim()) { selectEl.value = trailGroup(tr); return; }
      newGroup = name.trim();
    }
    recordProjectEdit('移动轨迹组', 'Move trail to group', () => {
      const oldGroup = trailGroup(tr);
      projectActions.mutateTrail(tr.id, 'trail.move-group', trail => { trail.group = newGroup; });
      // v1.21.0：如果被移出的 trail 是原组的主轨迹，清掉原组的记忆
      if(oldGroup !== newGroup && selectors.primaryForGroup(oldGroup) === tr.id) {
        const remaining = projectSelectors.trails().filter(t => trailGroup(t) === oldGroup && t.id !== tr.id);
        stateActions.setGroupPrimary(oldGroup, remaining[0] ? remaining[0].id : null);
      }
      applyChange();
      showToast(`已移至「${newGroup}」组`);
    });
  }

  /** 渲染单张 trail 卡片并绑定所有 handler */
  function renderTrailCard(tr) {
    const card = document.createElement('div');
    const isActive = selectors.isTrailActive(tr);
    const isExpanded = selectors.expandedTrails().has(tr.id);
    const isBatchChecked = selectors.batchSelected().has(tr.id);
    const isPrimary = (tr.id === selectors.primaryTrailId());

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

    const bindCardEvents = () => {
      const renameButton = card.querySelector('.trail-rename-btn');
      if(renameButton) renameButton.replaceChildren(createWorkbenchIcon(document, 'pencil', {size:13}));
      card.addEventListener('click', e => {
        if(handleTrailDetailClick(tr, e)) return;
        handleTrailCardClick(tr, e);
      });
    };

    if(!isExpanded) {
      card.innerHTML = headerHtml;
      bindCardEvents();
      return card;
    }

    // 展开态：header + 详情
    card.innerHTML = headerHtml + trailCardExpandedHtml(tr);

    // 详情区里的 <a class="trail-link-btn"> 保留浏览器默认行为（打开新标签），阻止 click 冒泡即可
    const linkBtn = card.querySelector('.trail-link-btn');
    if(linkBtn) linkBtn.addEventListener('click', e => e.stopPropagation());

    bindCardEvents();

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

    const groupPanel = document.getElementById('trail-group-panel');
    const groupList = document.getElementById('trail-group-list');
    const tabs = renderGroupTabs();
    if(groupList) groupList.replaceChildren(tabs);
    if(groupPanel) groupPanel.hidden = false;

    // v1.20.0：无选中分组时给一个明确提示（而不是"当前组暂无备选轨迹"的误导）
    if(selectors.activeGroup() == null && projectSelectors.trails().length > 0) {
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:11px;color:var(--text-muted);font-style:italic;padding:10px 4px;letter-spacing:0.04em;text-align:center';
      hint.textContent = t('trail.emptyNoGroup');
      list.appendChild(hint);
      return;
    }

    // v1.21.0：主轨迹不再被剔除，而是保留在列表里（用 is-primary class 视觉标记）
    //          排序：主轨迹在最前，其他按原顺序
    const inGroup = projectSelectors.trails().filter(tr => trailGroup(tr) === selectors.activeGroup());
    const primary = inGroup.find(tr => tr.id === selectors.primaryTrailId());
    const others = primary
      ? [primary, ...inGroup.filter(tr => tr.id !== selectors.primaryTrailId())]
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
    projectSelectors.trails().forEach(t => {
      if(!isTrailActive(t)) return;
      t.waypoints.forEach(w => counts[w.tag] = (counts[w.tag]||0) + 1);
    });

    const tagOrder = ['camp','pass','supply','water','fork','warn','shelter','village','bridge','river','other','start','end'];

    tagOrder.forEach(tag => {
      if(!counts[tag]) return;
      const chip = document.createElement('div');
      chip.className = 'filter-chip' + (selectors.visibleTags().has(tag) ? ' on' : '');
      chip.dataset.waypointTag = tag;
      chip.innerHTML = `<span class="ic waypoint-filter-icon" aria-hidden="true" style="color:${tagColors[tag] || '#64748b'}">${waypointIconMarkup(tag)}</span><span class="filter-chip-label">${t('tag.'+tag)}</span><span class="cnt">${counts[tag]}</span>`;
      chip.addEventListener('click', () => {
        stateActions.setVisibleTag(tag, !selectors.visibleTags().has(tag));
        buildFilterGrid();
        drawWaypoints();
      });
      grid.appendChild(chip);
    });
  }
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
    if(interactionManager.current.kind === 'segment') {
      void requestSegmentExit('switch-day-preview').then(exited => {
        if(exited) showDaySegmentPreview(trail, dm);
      });
      return;
    }
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
    const trail = projectSelectors.trails().find(t => t.id === selectors.primaryTrailId());
    if(!trail) return;
    const trailHdr = document.createElement('div');
    trailHdr.className = 'days-summary';
    const totalDays = trail.day_meta && trail.day_meta.length ? trail.day_meta.length : (trail.days || 0);
    trailHdr.innerHTML = `
      <h3 style="color:${sanitizeHexColor(trail.color)}">★ ${escapeUiText(trail.name)}（主轨迹）</h3>
      <div class="days-summary-meta">
        <span>${totalDays || '-'} 天</span>
        <span>${trail.stats && trail.stats.distance_km != null ? trail.stats.distance_km : '-'} km</span>
        <span>↑ ${trail.stats && trail.stats.ascent_m != null ? trail.stats.ascent_m : '-'} m</span>
        <span>最高 ${trail.stats && trail.stats.max_elev != null ? trail.stats.max_elev : '-'} m</span>
      </div>
    `;
    tab.appendChild(trailHdr);

    const escapeFilters = appendEscapeTools(tab, trail);

    // v1.26.0：若无 day_meta，显示占位提示
    if(!trail.day_meta || trail.day_meta.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:12px;color:var(--text-muted);font-size:11px;line-height:1.6';
      empty.innerHTML = '尚未设置每日行程。<br>点工具栏 <b>📅 分段</b> 在主轨迹上选点标记每天。';
      tab.appendChild(empty);
      appendEscapeRoutesForDay(tab, trail, null, true);
      if(escapeFilters) applyEscapeFilters(tab, escapeFilters);
      return;
    }

    const unassignedRoutes = (trail.escape_routes || []).filter(route => HTM_CORE.escapeRouteDays(route).length === 0);
    if(unassignedRoutes.length) appendEscapeRoutesForDay(tab, trail, null);

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
        block.dataset.day = String(dm.d);
        const color = dayPalette[dIdx % dayPalette.length];
        const routeText = dm.seg || ((dayKm || '-') + 'km · ↑' + (Math.round(dayAsc) || '-') + ' · ↓' + (Math.round(dayDesc) || '-') + ' · ⛰' + (Math.round(dayMax) || '-'));
        const campName = dm.camp || '未设置扎营点';
        const dayEndPoint = range ? trail.track[range.iEnd] : null;
        const campElevNum = dayEndPoint && Number.isFinite(Number(dayEndPoint[2]))
          ? Number(dayEndPoint[2])
          : ((dm.camp_elev == null || dm.camp_elev === '') ? NaN : Number(dm.camp_elev));
        const campElevText = Number.isFinite(campElevNum) ? Math.round(campElevNum) + ' m' : '-';
        block.style.setProperty('--day-color', color);
        block.innerHTML = `
          <div class="day-hdr" data-toggle>
            <span class="day-tag">D${dm.d}</span>
            <span class="day-head-main">
              <span class="day-route">${escapeUiText(routeText)}</span>
              <span class="day-title">${dayKm.toFixed(1)} km · ↑${Math.round(dayAsc)} m · ↓${Math.round(dayDesc)} m</span>
            </span>
            <span class="day-meta">▾</span>
          </div>
          <div class="day-body open">
            <div class="day-seg day-preview-target" data-day-preview="${dm.d}" title="点击高亮当天轨迹">
              <span class="ic">📍</span><span>${escapeUiText(routeText)}</span>
            </div>
            <div class="day-stats day-preview-target" data-day-preview="${dm.d}" title="点击高亮当天轨迹">
              <span class="lab">距离</span><span class="val">${dayKm.toFixed(1)} km</span>
              <span class="lab">当日爬升</span><span class="val">${Math.round(dayAsc)} m</span>
              <span class="lab">当日下降</span><span class="val">${Math.round(dayDesc)} m</span>
              <span class="lab">最高海拔</span><span class="val">${Math.round(dayMax)} m</span>
              <span class="lab">最低海拔</span><span class="val">${Math.round(dayMin)} m</span>
            </div>
            <div class="day-camp"><span>🏕</span><span>扎营点</span><b>${escapeUiText(campName)}</b><em>${campElevText}</em></div>
            <div class="wp-list"></div>
            <div class="nearby-waypoint-slot"></div>
            <div class="day-escape-slot"></div>
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
        dayWps.forEach(wp => {
          if(!DAY_ITINERARY_WAYPOINT_TAGS.has(wp.tag)) return;
          const item = document.createElement('div');
          item.className = 'wp-item';
          item.dataset.waypointTag = wp.tag;
          item.innerHTML = `
            <div class="wp-icon" style="color:${tagColors[wp.tag] || '#64748b'}">${waypointIconMarkup(wp)}</div>
            <div style="flex:1">
              <div class="wp-name" style="color:${sanitizeHexColor(tagColors[wp.tag])}">${escapeUiText(wp.label)}</div>
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
        appendNearbyWaypointPicker(block.querySelector('.nearby-waypoint-slot'), trail, dm, range);
        appendEscapeRoutesForDay(block.querySelector('.day-escape-slot'), trail, dm.d);
      });
    if(escapeFilters) applyEscapeFilters(tab, escapeFilters);
  }

  function selectedNearbyWaypointRefs(trail, day) {
    const stored = trail.itinerary_waypoint_refs;
    if(!stored || typeof stored !== 'object') return new Set();
    return new Set(Array.isArray(stored[String(day)]) ? stored[String(day)] : []);
  }

  function appendNearbyWaypointPicker(container, trail, dm, range) {
    if(!container || !range) return;
    const sources = projectSelectors.trails().filter(candidate =>
      candidate.id !== trail.id && trailGroup(candidate) === selectors.activeGroup());
    const candidates = HTM_CORE.collectNearbyItineraryWaypoints(trail.track, range, sources, 200)
      .filter(candidate => DAY_ITINERARY_WAYPOINT_TAGS.has(candidate.waypoint.tag));
    if(!candidates.length) return;
    const selected = selectedNearbyWaypointRefs(trail, dm.d);
    const details = document.createElement('details');
    details.className = 'nearby-waypoint-picker';
    const summary = document.createElement('summary');
    const updateSummary = () => {
      const count = [...details.querySelectorAll('input[type="checkbox"]')].filter(input => input.checked).length;
      summary.textContent = `${getCurrentLang() === 'zh' ? '附近轨迹标注' : 'Nearby trail waypoints'} · ${count}/${candidates.length}`;
    };
    details.append(summary);
    const options = document.createElement('div');
    options.className = 'nearby-waypoint-options';
    candidates.forEach(candidate => {
      const wp = candidate.waypoint;
      const item = document.createElement('label');
      item.className = 'nearby-waypoint-option';
      item.dataset.waypointRef = candidate.ref;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selected.has(candidate.ref);
      const icon = document.createElement('span');
      icon.className = 'wp-icon';
      icon.style.color = tagColors[wp.tag] || '#64748b';
      icon.innerHTML = waypointIconMarkup(wp);
      const copy = document.createElement('span');
      copy.className = 'nearby-waypoint-copy';
      const title = document.createElement('b');
      title.textContent = wp.label || wp.name || t('tag.' + (wp.tag || 'other'));
      const meta = document.createElement('small');
      meta.textContent = `${candidate.sourceTrailName} · ${candidate.distanceM} m · ${t('tag.' + (wp.tag || 'other'))}`;
      copy.append(title, meta);
      item.append(checkbox, icon, copy);
      checkbox.addEventListener('change', () => {
        const refs = selectedNearbyWaypointRefs(trail, dm.d);
        if(checkbox.checked) refs.add(candidate.ref);
        else refs.delete(candidate.ref);
        recordProjectEdit('编辑行程标注', 'Edit itinerary waypoints', () => {
          projectActions.mutateTrail(trail.id, 'itinerary.waypoints', candidate => {
            candidate.itinerary_waypoint_refs = {
              ...(candidate.itinerary_waypoint_refs || {}),
              [String(dm.d)]:[...refs],
            };
          });
          item.classList.toggle('selected', checkbox.checked);
          markTrailRevision(trail);
          saveToStorage();
          updateSummary();
        });
      });
      item.classList.toggle('selected', checkbox.checked);
      options.append(item);
    });
    details.append(options);
    container.append(details);
    updateSummary();
  }

  function appendEscapeTools(container, trail) {
    const routes = trail.escape_routes || [];
    const tools = document.createElement('section');
    tools.className = 'itinerary-escape-tools';
    const addBtn = document.createElement('button');
    addBtn.className = 'itinerary-escape-add';
    addBtn.textContent = getCurrentLang() === 'zh' ? '＋ 规划下撤路线' : '+ Plan escape route';
    addBtn.dataset.commandId = STUDIO_COMMANDS.ESCAPE_TOGGLE;
    addBtn.addEventListener('click', () => dispatchStudioCommand(STUDIO_COMMANDS.ESCAPE_TOGGLE));
    if(!routes.length) {
      tools.append(addBtn);
      container.append(tools);
      return null;
    }
    const filters = document.createElement('div');
    filters.className = 'escape-filter-bar';
    const nameFilter = document.createElement('input');
    nameFilter.type = 'search';
    nameFilter.className = 'escape-filter-input';
    nameFilter.placeholder = getCurrentLang() === 'zh' ? '筛选下撤方案' : 'Filter escape routes';
    nameFilter.setAttribute('aria-label', nameFilter.placeholder);
    const directionFilter = document.createElement('select');
    const dayFilter = document.createElement('select');
    const referenceFilter = document.createElement('select');
    for(const select of [directionFilter, dayFilter, referenceFilter]) select.className = 'escape-filter-select';
    const addOption = (select, value, label) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.append(option);
    };
    addOption(directionFilter, 'all', getCurrentLang() === 'zh' ? '全部方向' : 'All directions');
    addOption(directionFilter, 'forward', getCurrentLang() === 'zh' ? '正向' : 'Forward');
    addOption(directionFilter, 'reverse', getCurrentLang() === 'zh' ? '反向' : 'Reverse');
    addOption(dayFilter, 'all', getCurrentLang() === 'zh' ? '全部 Day' : 'All days');
    [...new Set(routes.flatMap(route => HTM_CORE.escapeRouteDays(route)))]
      .sort((left, right) => left - right)
      .forEach(day => addOption(dayFilter, String(day), `D${day}`));
    if(routes.some(route => HTM_CORE.escapeRouteDays(route).length === 0)) {
      addOption(dayFilter, 'none', getCurrentLang() === 'zh' ? '未关联 Day' : 'No day');
    }
    addOption(referenceFilter, 'all', getCurrentLang() === 'zh' ? '全部依据轨迹' : 'All references');
    const references = new Map();
    routes.forEach(route => references.set(route._anchor?.trailId || trail.id, route._anchor?.trailName || trail.name));
    references.forEach((name, id) => addOption(referenceFilter, id, name));
    const count = document.createElement('span');
    count.className = 'escape-filter-count';
    filters.append(nameFilter, directionFilter, dayFilter, referenceFilter, count);
    tools.append(filters, addBtn);
    container.append(tools);
    for(const control of [nameFilter, directionFilter, dayFilter, referenceFilter]) {
      control.addEventListener(control === nameFilter ? 'input' : 'change', () => applyEscapeFilters(container, {nameFilter, directionFilter, dayFilter, referenceFilter, count}));
    }
    return {nameFilter, directionFilter, dayFilter, referenceFilter, count};
  }

  function applyEscapeFilters(container, filters) {
    const query = filters.nameFilter.value.trim().toLocaleLowerCase();
    const visibleRouteIds = new Set();
    container.querySelectorAll('.escape-item').forEach(item => {
      const days = (item.dataset.days || '').split(',').filter(Boolean);
      const dayMatches = filters.dayFilter.value === 'all'
        || (filters.dayFilter.value === 'none' ? days.length === 0 : days.includes(filters.dayFilter.value));
      const matches = (!query || (item.dataset.name || '').includes(query))
        && (filters.directionFilter.value === 'all' || item.dataset.direction === filters.directionFilter.value)
        && dayMatches
        && (filters.referenceFilter.value === 'all' || item.dataset.reference === filters.referenceFilter.value);
      item.hidden = !matches;
      if(matches) visibleRouteIds.add(item.dataset.id);
    });
    container.querySelectorAll('.day-escape-section').forEach(section => {
      section.hidden = !section.querySelector('.escape-item:not([hidden])');
    });
    filters.count.textContent = `${visibleRouteIds.size}/${new Set([...container.querySelectorAll('.escape-item')].map(item => item.dataset.id)).size}`;
  }

  function appendEscapeRoutesForDay(container, trail, day, includeAll = false) {
    if(!container) return;
    const routes = (trail.escape_routes || []).filter(route => {
      if(includeAll) return true;
      const days = HTM_CORE.escapeRouteDays(route);
      return day == null ? days.length === 0 : days.includes(Number(day));
    });
    if(!routes.length) return;
    const section = document.createElement('section');
    section.className = 'day-escape-section';
    const heading = document.createElement('h4');
    heading.className = 'day-escape-heading';
    heading.textContent = day == null
      ? (getCurrentLang() === 'zh' ? '未关联行程的下撤方案' : 'Unassigned escape routes')
      : `${getCurrentLang() === 'zh' ? '本日下撤方案' : 'Escape routes'} · ${routes.length}`;
    const routeList = document.createElement('div');
    routeList.className = 'escape-route-list';
    routes.forEach(r => {
        const item = document.createElement('div');
        item.className = 'escape-item';
        item.dataset.trail = trail.id;
        item.dataset.id = r.id;
        const direction = HTM_CORE.resolveEscapeRouteDirection(r);
        const referenceId = r._anchor?.trailId || trail.id;
        const referenceName = r._anchor?.trailName || trail.name;
        const routeDays = HTM_CORE.escapeRouteDays(r);
        item.dataset.name = String(r.name || '').toLocaleLowerCase();
        item.dataset.direction = direction;
        item.dataset.reference = referenceId;
        item.setAttribute('data-days', routeDays.join(','));
        const isOtherTrail = r._anchor && r._anchor.trailId !== trail.id;
        const crossTag = isOtherTrail
          ? `<span style="background:#1e3a5f;color:#60a5fa;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:4px">跨轨迹</span>`
          : '';
        const manualTag = r._manual
          ? `<span style="background:#1a2e1a;color:#4ade80;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:4px">手动</span>`
          : '';
        const dayTag = routeDays.length
          ? `<span class="escape-day-tag">${routeDays.map(value => `D${value}`).join(' · ')}</span>`
          : '';
        const directionTag = `<span class="escape-direction-tag ${direction}">${direction === 'reverse' ? (getCurrentLang() === 'zh' ? '反向' : 'Reverse') : (getCurrentLang() === 'zh' ? '正向' : 'Forward')}</span>`;
        const delBtn = r._manual
          ? `<button class="escape-del-btn" data-id="${escapeUiText(r.id)}" style="float:right;background:transparent;border:none;color:#6b7280;font-size:13px;cursor:pointer;padding:0 2px;line-height:1" title="删除">🗑</button>`
          : '';
        item.innerHTML = `
          <h4>${delBtn}⚡ ${escapeUiText(r.name)}${dayTag}${directionTag}${crossTag}${manualTag}</h4>
          <p>${escapeUiText(r.desc)}</p>
          <div class="meta">
            <span>📏 沿迹 ${r.distance_km} km</span>
            ${r.straight_km != null ? `<span>↗直线 ${r.straight_km} km</span>` : ''}
            <span>${r.drop_m > 0 ? '⬇' : r.drop_m < 0 ? '⬆' : '—'} ${Math.abs(r.drop_m)} m</span>
          </div>
        `;
        item.addEventListener('click', e => {
          if(e.target.classList.contains('escape-del-btn')) {
            const delId = e.target.dataset.id;
            const wasActive = selectors.activeEscape() === delId;
            if(recordProjectEdit('删除下撤路线', 'Delete escape route', () => escapeController.deleteRoute(trail.id, delId))) {
              if(wasActive) clearEscape();
              saveToStorage();
              buildDaysTab();
            }
            return;
          }
          if(selectors.activeEscape() === r.id) {
            clearEscape();
          } else {
            document.querySelectorAll('.escape-item').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.escape-item').forEach(el => {
              if(el.dataset.id === r.id && el.dataset.trail === trail.id) el.classList.add('active');
            });
            showEscape(trail.id, r.id);
          }
        });
        routeList.appendChild(item);
      });
    section.append(heading, routeList);
    container.appendChild(section);
  }
  function buildLegend() {
    const lg = document.getElementById('legend');
    if(selectors.mode() === 'day') {
      if(projectSelectors.trails().length === 1) {
        lg.innerHTML = `
          <h4>按天分色</h4>
          ${dayPalette.map((c,i)=>`<div class="lg-row"><div class="swatch" style="background:${c}"></div>D${i+1}</div>`).join('')}
        `;
      } else {
        lg.innerHTML = `<h4><span data-i18n="legend.title">多轨迹（主轨迹高亮）</span></h4>` + projectSelectors.trails().filter(t=>isTrailActive(t))
          .map(t=>{
            const isP = t.id === selectors.primaryTrailId();
            return `<div class="lg-row" style="opacity:${isP?1:0.6}"><div class="swatch" style="background:${sanitizeHexColor(t.color)};height:${isP?5:3}px"></div>${isP?'★ ':''}${escapeUiText(t.name)}</div>`;
          }).join('');
      }
    } else if(selectors.mode() === 'elev') {
      let legendMinElevation = Infinity;
      let legendMaxElevation = -Infinity;
      for(const trail of projectSelectors.trails()) {
        if(!isTrailActive(trail)) continue;
        for(const point of trail.track || []) {
          const elevation = Number(point[2]);
          if(!Number.isFinite(elevation)) continue;
          if(elevation < legendMinElevation) legendMinElevation = elevation;
          if(elevation > legendMaxElevation) legendMaxElevation = elevation;
        }
      }
      const minLabel = Number.isFinite(legendMinElevation) ? `${Math.round(legendMinElevation)}m` : '-';
      const maxLabel = Number.isFinite(legendMaxElevation) ? `${Math.round(legendMaxElevation)}m` : '-';
      lg.innerHTML = `
        <h4>海拔渐变</h4>
        <div class="lg-row"><div class="swatch elev-grad" style="width:140px"></div></div>
        <div class="lg-row" style="justify-content:space-between"><span>${minLabel}</span><span>${maxLabel}</span></div>
      `;
    }
  }
  /* ============ Wire up controls ============ */
  // tabs
  let lastNonDayMode = selectors.mode() === 'day' ? 'elev' : selectors.mode();
  const sidebarTabCommands = {
    groups:STUDIO_COMMANDS.WORKSPACE_GROUPS,
    trails:STUDIO_COMMANDS.WORKSPACE_TRAILS,
    days:STUDIO_COMMANDS.WORKSPACE_ITINERARY,
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
      if(selectors.mode() !== 'day') lastNonDayMode = selectors.mode();
      buildDaysTab();
      setMapMode('day');
    } else if(selectors.mode() === 'day') {
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

  function setMapMode(mode, opts = {}) {
    document.querySelectorAll('[data-mode]').forEach(x => {
      const active = x.dataset.mode === mode;
      x.classList.toggle('on', active);
      x.setAttribute('aria-pressed', String(active));
    });
    stateActions.setMode(mode);
    if(mode !== 'day') lastNonDayMode = mode;
    // 标注点模式下显示 tag 选择面板，并确保已渲染按钮
    const wpModePanel = document.getElementById('waypoint-mode-tags');
    if(wpModePanel) {
      wpModePanel.style.display = selectors.mode() === 'waypoint' ? 'block' : 'none';
      if(selectors.mode() === 'waypoint') {
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
    if(selectors.mode() !== 'waypoint') {
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
      const on = selectors.waypointModeTags().has(tag);
      btn.className = 'btn-mini waypoint-mode-tag' + (on ? ' on' : '');
      btn.innerHTML = `<span class="waypoint-filter-icon" aria-hidden="true" style="color:${color}">${waypointIconMarkup(tag)}</span><span>${t('tag.'+tag)}</span>`;
      btn.addEventListener('click', () => {
        stateActions.setWaypointTag(tag, !selectors.waypointModeTags().has(tag));
        buildWaypointModeTagGrid();
        if(selectors.mode() === 'waypoint') drawWaypoints();
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
      map.removeLayer(getCurrentBase());
      setCurrentBase(baseLayers[b.dataset.base].addTo(map));
    });
  });

  // show track checkbox
  const _showTrackEl = document.getElementById('showTrack');
  if(_showTrackEl) _showTrackEl.addEventListener('change', e => {
    stateActions.setDisplay('showTrack', e.target.checked);
    drawTracks();
  });
  const _showLabelEl = document.getElementById('showLabel');
  if(_showLabelEl) _showLabelEl.addEventListener('change', e => {
    stateActions.setDisplay('showLabel', e.target.checked);
    drawWaypoints();
  });
  const _showHighPointEl = document.getElementById('showHighPoint');
  if(_showHighPointEl) _showHighPointEl.addEventListener('change', e => {
    stateActions.setDisplay('showHighPoint', e.target.checked);
    drawWaypoints();
  });

  function syncDisplayControls() {
    const display = selectors.display();
    if(_showTrackEl) _showTrackEl.checked = display.showTrack;
    if(_showLabelEl) _showLabelEl.checked = display.showLabel;
    if(_showHighPointEl) _showHighPointEl.checked = display.showHighPoint;
  }

  // filter all/none
  document.getElementById('filterAll').addEventListener('click', () => {
    stateActions.replaceVisibleTags(['start','end','camp','pass','water','supply','fork','warn','shelter','village','bridge','river','other']);
    buildFilterGrid(); drawWaypoints();
  });
  document.getElementById('filterNone').addEventListener('click', () => {
    stateActions.replaceVisibleTags([]);
    buildFilterGrid(); drawWaypoints();
  });

  // click empty to clear escape
  map.on('click', e => {
    if(selectors.activeEscape()) {
      const target = e.originalEvent.target;
      if(!target.closest('.leaflet-marker-icon, .leaflet-interactive')) clearEscape();
    }
  });


  return Object.freeze({
    renderPrimaryCard, primaryMiniController, clampPrimaryMiniPosition, applyPrimaryMiniPosition,
    schedulePrimaryMiniPositionApply, savePrimaryMiniPosition, bindPrimaryMiniDrag, buildPrimaryMini,
    floatingPanelController, initFloatingPanelPositions, updateModeTagTitle, buildTrailThumbnail,
    renderGroupTabs, renderBatchToolbar, moveBatchToGroup, trailCardHeaderHtml,
    trailCardExpandedHtml, isDetailButtonTarget, handleTrailCardClick, editTrailSource,
    editTrailName, editTrailId, confirmDeleteTrail, handleTrailDetailClick,
    handleTrailGroupChange, renderTrailCard, buildTrailList, buildFilterGrid,
    dayPreviewController, dayPreviewState, clearDaySegmentPreview,
    handleDayPreviewInteractionEvent, showDaySegmentPreview, buildDaysTab,
    selectedNearbyWaypointRefs, appendNearbyWaypointPicker, appendEscapeTools,
    applyEscapeFilters, appendEscapeRoutesForDay, buildLegend, activateSidebarTab,
    setMapMode, enterInteractionRenderMode, buildWaypointModeTagGrid, syncDisplayControls,
  });
}
