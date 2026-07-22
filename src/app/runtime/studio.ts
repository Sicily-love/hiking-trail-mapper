// @ts-nocheck
import * as HTM_CORE from '../../core/index.ts';
import * as HTM_APP from '../index.ts';
import { STUDIO_VERSION } from '../version.ts';
import { createWorkbenchIcon } from '../../ui/icons.ts';
import {
  escapeHtmlText,
  sanitizeExternalHttpUrl,
  sanitizeHexColor,
  sanitizeImageSource,
} from '../../ui/safe-content.ts';
import { createFloatingPanelPositionController } from '../../ui/floating-panel.ts';
import { createToastController } from '../../ui/toast.ts';

export interface StudioBootResult {
  restored: boolean;
  resetPerformed: boolean;
}

export interface StudioRuntimeDependencies {
  document: Document;
  commands: HTM_APP.CommandRegistry<void>;
  dialogs: HTM_APP.DialogController;
}

/** Starts the browser runtime directly inside the Vite module graph. */
export function startStudioRuntime(
  dependencies: StudioRuntimeDependencies,
): Promise<StudioBootResult> {
  const { document } = dependencies;
  const window = document.defaultView;
  if(!window) throw new Error('Studio runtime requires a document with a window');
  const commandRegistry = dependencies.commands;
  const studioDialogs = dependencies.dialogs;
  const STUDIO_COMMANDS = HTM_APP.STUDIO_COMMANDS;
  const L = window.L;
  const fflate = window.fflate;
  if(!L) throw new Error('Leaflet runtime is missing');
  if(!fflate) throw new Error('fflate runtime is missing');

  let DATA = {title:'徒步路线地图', trails:[], calc_method:{}};

  function dispatchStudioCommand(commandId) {
    try {
      const result = commandRegistry.dispatch(commandId);
      if(result && typeof result.then === 'function') {
        result.catch(error => console.error(`Command failed: ${commandId}`, error));
      }
      return result;
    } catch(error) {
      console.error(`Command failed: ${commandId}`, error);
      return undefined;
    }
  }
  const haversine = HTM_CORE.haversine;
  const smoothElev = HTM_CORE.smoothElev;
  const accumulatorAscent = HTM_CORE.accumulatorAscent;
  const accumulatorDescent = HTM_CORE.accumulatorDescent;
  const elevRatioColor = HTM_CORE.elevRatioColor;
  const trailContentHash = HTM_CORE.trailContentHash;
  const clampTrackIndex = HTM_CORE.clampTrackIndex;
  const pointFromTrackIndex = HTM_CORE.pointFromTrackIndex;
  const normalizeTrackIndexRange = HTM_CORE.normalizeTrackIndexRange;
  const buildTrackLatLngs = HTM_CORE.buildTrackLatLngs;
  const buildTrackLatLngSegments = HTM_CORE.buildTrackLatLngSegments;
  const splitTrackByBreaks = HTM_CORE.splitTrackByBreaks;
  const trackBreaksInRange = HTM_CORE.trackBreaksInRange;
  const buildMeasureSegmentRenderModel = HTM_CORE.buildMeasureSegmentRenderModel;
  const buildDayPreviewRenderModel = HTM_CORE.buildDayPreviewRenderModel;
  const applyMeasureEndpointState = HTM_CORE.applyMeasureEndpointState;
  const reverseMeasureEndpoints = HTM_CORE.reverseMeasureEndpoints;
  const moveSegmentBoundary = HTM_CORE.moveSegmentBoundary;
  const computeSegmentStatsForTrack = HTM_CORE.computeSegmentStats;
  const buildSegmentLayerModel = HTM_CORE.buildSegmentLayerModel;
  const storageTrailGroup = HTM_CORE.storageTrailGroup;
  const normalizePrimaryByGroup = HTM_CORE.normalizePrimaryByGroup;
  const normalizeActiveTrailIds = HTM_CORE.normalizeActiveTrailIds;
  const primaryTrailIdForGroup = HTM_CORE.primaryTrailIdForGroup;
  const ensurePrimaryForActiveGroup = HTM_CORE.ensurePrimaryForActiveGroup;
  const serializeStorageSnapshot = HTM_CORE.serializeStorageSnapshot;
  const normalizeIndexedDbStorageConfig = HTM_CORE.normalizeIndexedDbStorageConfig;
  const buildStorageReadOperation = HTM_CORE.buildStorageReadOperation;
  const buildStorageWriteOperation = HTM_CORE.buildStorageWriteOperation;
  const buildStorageDeleteOperation = HTM_CORE.buildStorageDeleteOperation;
  const restoreStorageSnapshot = HTM_CORE.restoreStorageSnapshot;
  const removeTrailFromPrimaryByGroup = HTM_CORE.removeTrailFromPrimaryByGroup;
  const parseCoordStr = HTM_CORE.parseKmlCoordinateText;
  const parseGxCoordText = HTM_CORE.parseGxCoordText;
  const kmlCoordsToTrackPoints = HTM_CORE.kmlCoordsToTrackPoints;
  const extractImageUrl = HTM_CORE.extractKmlImageUrl;
  const shortLabel = HTM_CORE.shortKmlLabel;
  const normalizeKmlTitle = HTM_CORE.normalizeKmlTitle;
  const buildKmlParseModel = HTM_CORE.buildKmlParseModel;
  const classifyWaypointTag = HTM_CORE.classifyWaypointTag;
  const enrichWaypoints = HTM_CORE.enrichWaypoints;
  const computeCumulativeDistance = HTM_CORE.computeCumulativeDistance;
  const computeTrailStats = HTM_CORE.computeTrailStats;
  const stitchTrails = HTM_CORE.stitchTrails;
  const computeSegmentedTrackMetrics = HTM_CORE.computeSegmentedTrackMetrics;


  const APP_VERSION = STUDIO_VERSION;
  /* ============ i18n ============ */
  let currentLang = (() => {
    try { return HTM_APP.resolveLocalizationLanguage(localStorage.getItem('hiking_lang') || (navigator.language && navigator.language.startsWith('en') ? 'en' : 'zh')); }
    catch(e) { return 'zh'; }
  })();
  function t(key) {
    return HTM_APP.translateMessage(currentLang, key);
  }
  function setLang(lang) {
    currentLang = HTM_APP.resolveLocalizationLanguage(lang);
    try { localStorage.setItem('hiking_lang', currentLang); } catch(e) {}
    if(typeof rebuildAll === 'function') rebuildAll({fit: false});
    applyI18n();  // 必须在 rebuildAll 之后再次调用，因为重建后 DOM 是新的中文默认
    // 海拔图、主轨迹小卡、模式标注点筛选标题用 JS 拼接，无 data-i18n，需手动刷新
    if(typeof refreshElevBar === 'function') refreshElevBar();
    if(typeof buildPrimaryMini === 'function') buildPrimaryMini();
    if(typeof renderPrimaryCard === 'function') renderPrimaryCard();
    if(typeof updateModeTagTitle === 'function') updateModeTagTitle();
  }
  function applyI18n() {
    document.documentElement.lang = currentLang === 'en' ? 'en' : 'zh-CN';
    document.title = t('app.title');
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
    window.dispatchEvent(new CustomEvent('studio:language-changed', {
      detail:{language:currentLang},
    }));
  }

  /* ============ Changelog ============ */

  function showChangelog() {
    return studioDialogs.content(HTM_APP.buildChangelogDialogModel(
      currentLang,
      t('changelog.title'),
      t('changelog.close'),
    ));
  }
  async function showStorageInfo() {
    const storageApi = navigator.storage;
    let snapshot = {
      trailCount:DATA.trails.length,
      estimateSupported:Boolean(storageApi && storageApi.estimate),
      persistSupported:Boolean(storageApi && storageApi.persist),
      persisted:false,
    };
    try {
      if(storageApi && storageApi.estimate) {
        const estimate = await storageApi.estimate();
        snapshot = {...snapshot, usedBytes:estimate.usage || 0, quotaBytes:estimate.quota || 0};
      }
      if(storageApi && storageApi.persisted) snapshot.persisted = await storageApi.persisted();
    } catch(error) {
      snapshot = {...snapshot, error:error instanceof Error ? error.message : String(error)};
    }

    const action = await studioDialogs.content(HTM_APP.buildStorageDialogModel(currentLang, snapshot));
    if(action !== 'persist' || !storageApi || !storageApi.persist) return;
    try {
      const persisted = await storageApi.persist();
      if(persisted) {
        showToast(t('storage.persisted'));
        return showStorageInfo();
      }
      await studioDialogs.info({
        title:currentLang === 'zh' ? '无法持久化存储' : 'Persistent storage unavailable',
        message:currentLang === 'zh'
          ? '请求被拒绝。部分浏览器需要先将站点加入书签或提高访问频率。'
          : 'The request was denied. Some browsers require bookmarking or repeated site use first.',
      });
    } catch(error) {
      await studioDialogs.info({
        title:currentLang === 'zh' ? '存储请求失败' : 'Storage request failed',
        message:error instanceof Error ? error.message : String(error),
        danger:true,
      });
    }
  }
  /* ============ State ============ */
  const appStateStore = HTM_APP.createAppStateStore(DATA);
  const state = appStateStore.snapshot();
  function dispatchState(command) { return appStateStore.dispatch(command); }
  appStateStore.subscribe(() => commandRegistry.notifyChanged());
  const interactionManager = HTM_APP.createStudioInteractionManager();
  const runtimeTrailRevisions = new WeakMap();

  function runtimeTrailRevision(trail) {
    return trail ? (runtimeTrailRevisions.get(trail) || 0) : 0;
  }

  function markTrailRevision(trail) {
    if(!trail) return 0;
    const revision = runtimeTrailRevision(trail) + 1;
    runtimeTrailRevisions.set(trail, revision);
    return revision;
  }

  function runtimeInteractionOwner(trail) {
    return trail ? {trailId: String(trail.id), revision: runtimeTrailRevision(trail)} : null;
  }

  function beginRuntimeInteraction(kind, phase, trail, options = {}) {
    if(kind !== 'segment' && interactionManager.current.kind === 'segment' && segmentController.isDirty()) {
      showToast(currentLang === 'zh' ? '请先应用或退出当前分段修改' : 'Apply or discard the current segment changes first', 'info');
      return null;
    }
    const owner = runtimeInteractionOwner(trail);
    if(!owner) return null;
    const session = interactionManager.activate(kind, {
      phase,
      owner,
      onEvent(event, session) {
        if(typeof options.onEvent === 'function') options.onEvent(event, session);
      },
      onCancel(reason, session) {
        try {
          if(typeof options.onCancel === 'function') {
            options.onCancel({fromManager:true, reason, session});
          }
        } finally {
          commandRegistry.notifyChanged();
        }
      },
    });
    commandRegistry.notifyChanged();
    return session;
  }

  function cancelRuntimeInteraction(kind, reason = 'cancelled') {
    if(interactionManager.current.kind !== kind) return false;
    return interactionManager.cancel(reason);
  }

  function isRuntimeInteractionCurrent(kind, trailId = null) {
    const current = interactionManager.current;
    return current.kind === kind
      && current.isCurrent()
      && runtimeInteractionOwnerIsCurrent(current)
      && (trailId == null || current.owner.trailId === String(trailId));
  }

  function setRuntimeInteractionPhase(kind, phase) {
    if(interactionManager.current.kind !== kind || !revalidateRuntimeInteractionOwner()) return false;
    return interactionManager.current.setPhase(phase);
  }

  function scheduleRuntimeInteractionFrame(kind, callback) {
    const current = interactionManager.current;
    if(current.kind !== kind || !revalidateRuntimeInteractionOwner()) return null;
    return current.frame(() => callback(current));
  }

  function runtimeInteractionOwnerIsCurrent(session = interactionManager.current) {
    if(!session || session.kind === 'idle') return true;
    const trail = DATA.trails.find(item => String(item.id) === session.owner.trailId);
    if(!trail || String(state.primaryTrailId) !== session.owner.trailId) return false;
    return HTM_APP.sameInteractionOwner(session.owner, runtimeInteractionOwner(trail));
  }

  function revalidateRuntimeInteractionOwner() {
    const current = interactionManager.current;
    if(current.kind === 'idle' || runtimeInteractionOwnerIsCurrent(current)) return true;
    interactionManager.cancel('owner-invalid', {sessionId: current.sessionId});
    return false;
  }

  function dispatchRuntimeInteraction(kind, event) {
    const current = interactionManager.current;
    if(current.kind !== kind || !revalidateRuntimeInteractionOwner()) return false;
    return current.dispatch(event);
  }

  const renderRuntimeStats = {
    frames: 0,
    lastTimestamp: null,
    lastMask: 0,
    phases: {tracks:0, markers:0, sidebar:0, days:0, legend:0, chart:0, fit:0},
    elevation: {sourcePoints:0, renderedPoints:0},
    elevationBands: 0,
    markers: {add:0, update:0, remove:0, keep:0},
    fit: {requested:0, applied:0, superseded:0, lastEpoch:0, lastResetEpoch:0},
  };
  let workspaceResetEpoch = 0;
  let pendingWorkspaceFit = null;
  const trailBoundsCache = new WeakMap();

  function recordRenderPhase(context) {
    if(renderRuntimeStats.lastTimestamp !== context.timestamp) {
      renderRuntimeStats.frames += 1;
      renderRuntimeStats.lastTimestamp = context.timestamp;
    }
    renderRuntimeStats.lastMask = context.frameMask;
    renderRuntimeStats.phases[context.phase] += 1;
  }

  const renderScheduler = new HTM_APP.RenderScheduler({
    handlers: {
      tracks(context) { recordRenderPhase(context); renderTracksNow(); },
      markers(context) { recordRenderPhase(context); renderWaypointsNow(); },
      sidebar(context) { recordRenderPhase(context); renderSidebarNow(); },
      days(context) { recordRenderPhase(context); renderDaysNow(); },
      legend(context) { recordRenderPhase(context); renderLegendNow(); },
      chart(context) { recordRenderPhase(context); renderElevationChartNow(); },
      fit(context) { recordRenderPhase(context); executeWorkspaceFit(context); },
    },
  });
  const runtimeContext = HTM_APP.createRuntimeContext({
    project:DATA,
    state:appStateStore,
    commands:commandRegistry,
    interactions:interactionManager,
    renderer:renderScheduler,
    dialogs:studioDialogs,
  });
  window.__HTM_RENDER_SCHEDULER__ = renderScheduler;
  window.__HTM_RENDER_STATS__ = renderRuntimeStats;

  function invalidateRender(mask) {
    renderScheduler.invalidate(mask);
  }

  /* v1.17.0：state 变更 helpers ─────────────────────────────────
     统一"读-改-写-刷新-持久化"的常见组合，消除各处重复的 if/set/delete +
     rebuildAll + saveToStorage 模式。所有涉及 state 变更的 UI 事件都应
     走这些 helper，减少漏调 saveToStorage 的隐蔽 bug。
     ─────────────────────────────────────────────────────────────── */

  /**
   * 切换 Set 中的元素（存在则删除，不存在则添加）
   * @param {Set} set - 目标 Set
   * @param {*} item - 元素
   * @returns {boolean} 切换后该元素是否存在于 Set
   */
  function toggleSetItem(set, item) {
    return HTM_APP.toggleSetItem(set, item);
  }

  /**
   * 应用一次状态变更后的完整刷新流程
   * @param {Object} opts - 传递给 rebuildAll 的选项，如 {fit: true}
   * @param {boolean} [opts.save=true] - 是否持久化到 IndexedDB
   * @param {boolean} [opts.fit=false] - 是否重置地图视野
   * @param {boolean} [opts.tracks=true] - 是否只重画 tracks/waypoints（跳过 rebuildAll）
   */
  function applyChange(opts = {}) {
    const { save = true, fit = false, tracksOnly = false } = opts;
    if(tracksOnly) {
      if(typeof drawTracks === 'function') drawTracks();
      if(typeof drawWaypoints === 'function') drawWaypoints();
    } else {
      if(typeof rebuildAll === 'function') rebuildAll({ fit });
    }
    if(save && typeof saveToStorage === 'function') saveToStorage();
    commandRegistry.notifyChanged();
  }

  /**
   * 切换轨迹叠加态；如果主轨迹被隐藏，自动降级主轨迹到还叠加着的第一条
   * @param {string} trailId
   */
  function toggleTrailActive(trailId) {
    dispatchState({type:'active-trail.set', trailId, active:!state.activeTrails.has(trailId)});
    // v1.21.0：主轨迹兜底只在当前组内挑
    if(state.activeGroup != null && !state.activeTrails.has(state.primaryTrailId)) {
      const inGroupActive = [...state.activeTrails].filter(id => {
        const tr = DATA.trails.find(t => t.id === id);
        return tr && trailGroup(tr) === state.activeGroup;
      });
      dispatchState({type:'primary-trail.set', trailId:inGroupActive[0] || null});
    }
  }

  /** 切换详情展开态 */
  function toggleTrailExpanded(trailId) { dispatchState({type:'expanded.toggle', trailId}); }

  /** 切换批量选中态 */
  function toggleTrailBatch(trailId) { dispatchState({type:'batch.toggle', trailId}); }


  /* v1.14.1：分组支持 ─────────────────────────────────────────────
     trail.group（字符串）标识轨迹所属分组，未设置时默认'默认'。
     只有 state.activeGroup 组内的轨迹参与地图渲染/统计/行程等一切功能。
     v1.20.0：允许 state.activeGroup = null（"无选中"状态），此时所有渲染归零。
     ─────────────────────────────────────────────────────────────── */
  function trailGroup(trail) { return trail.group || '默认'; }
  function isTrailActive(trail) {
    // v1.20.0：无选中分组时，所有轨迹都不显示
    if(state.activeGroup == null) return false;
    return trailGroup(trail) === state.activeGroup && state.activeTrails.has(trail.id);
  }
  function getGroups() {
    const seen = new Set();
    const groups = [];
    if(DATA.trails.some(t => trailGroup(t) === '默认')) { groups.push('默认'); seen.add('默认'); }
    DATA.trails.forEach(t => {
      const g = trailGroup(t);
      if(!seen.has(g)) { seen.add(g); groups.push(g); }
    });
    if(!groups.length) groups.push('默认');
    return groups;
  }
  /**
   * 切换到指定分组。v1.20.0 起支持传 null 表示"取消选中所有分组"。
   * v1.21.0：每个组的主轨迹独立记忆（state.primaryByGroup[groupName]）。
   *         切到目标组时优先读记忆值；若记忆值失效（trail 已删或已移出），
   *         自动挑组内第一条作为该组的新主轨迹。
   * @param {string|null} groupName 分组名，或 null 进入无选中状态
   */
  function switchGroup(groupName) {
    dispatchState({type:'group.set-active', group:groupName});
    if(groupName == null) {
      // 无选中状态：不动 primaryByGroup 记忆值，只是 getter 返回 null
      rebuildAll({ fit: false });
    } else {
      // 校验/回填该组的记忆值
      const inGroup = DATA.trails.filter(t => trailGroup(t) === groupName);
      const memorized = state.primaryByGroup[groupName];
      if(!memorized || !inGroup.find(t => t.id === memorized)) {
        // 记忆值失效或不存在 → 挑组内第一条
        dispatchState({type:'group.set-primary', group:groupName, trailId:inGroup[0] ? inGroup[0].id : null});
      }
      rebuildAll({ fit: false });
      // v1.22.0：切组时自动执行完整复位（比原来只是 fitBounds 更彻底：会重新算 primary + 重绘）
      if(inGroup.length > 0 && typeof resetView === 'function') resetView();
    }
    saveToStorage();
  }
  /* ============ Map ============ */
  const map = L.map('map', {
    center: [29.74, 99.65], zoom: 11,
    zoomControl: true, attributionControl: true,
    dragging: true, tap: false, touchZoom: true,  // v1.27.0：关闭 L.Tap 消除触屏 tap 延迟
    // +/- 保持快速步进；双指与滚轮结束时按四分之一级吸附。
    zoomSnap: 0.25,
    zoomDelta: 1,              // +/- 按钮和键盘每次变化 1 级（更快放大/缩小）
    wheelPxPerZoomLevel: 120,  // 滚轮每 120px 触发 1 级缩放，比默认 60 更平滑
    wheelDebounceTime: 40,     // 滚轮防抖（默认 40，保留）
    // v1.25.0：关闭双击缩放，消除 Leaflet 内部 200ms click 延迟
    doubleClickZoom: false,
  });
  const primaryPointerType = window.matchMedia?.('(pointer: coarse)').matches ? 'touch' : 'mouse';
  const interactionMarkerHitSize = HTM_CORE.interactionHitTargetSize(primaryPointerType);
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  // 把版本号塞进 Leaflet attribution prefix，与 Leaflet/Esri 同一行同一基线
  // 版本号独立浮层（独立背景框 + 与 Leaflet attribution 完全同款样式）
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank">Leaflet</a>');
  (function(){
    const tag = document.createElement('div');
    // 关键：套上 leaflet-control-attribution 类，自动继承同款 background/font-size/padding/line-height
    tag.className = 'leaflet-control-attribution';
    tag.id = 'version-tag-float';
    tag.innerHTML = `<a href="javascript:void(0)" id="version-tag-link" title="点击查看更新日志">${APP_VERSION}</a>`;
    // 仅覆盖定位相关；样式继承自 .leaflet-control-attribution
    tag.style.position = 'absolute';
    tag.style.zIndex = '600';
    tag.style.pointerEvents = 'auto';
    setTimeout(() => {
      const map_el = document.getElementById('map');
      if(!map_el) return;
      map_el.appendChild(tag);
      const reposition = () => {
        const attr = map_el.querySelector('.leaflet-control-attribution:not(#version-tag-float)');
        if(!attr) return;
        const mapRect = map_el.getBoundingClientRect();
        const attrRect = attr.getBoundingClientRect();
        const attrRightOffset = mapRect.right - attrRect.left;
        tag.style.right = (attrRightOffset + 6) + 'px';  // 与 attribution 间隔 6px
        tag.style.bottom = (mapRect.bottom - attrRect.bottom) + 'px';
      };
      reposition();
      setTimeout(reposition, 200);
      setTimeout(reposition, 600);
      const attr = map_el.querySelector('.leaflet-control-attribution:not(#version-tag-float)');
      if(attr) new MutationObserver(reposition).observe(attr, {childList:true, subtree:true, characterData:true});
      window.addEventListener('resize', reposition);
      document.getElementById('version-tag-link').addEventListener('click', e => {
        e.preventDefault(); showChangelog();
      });
    }, 100);
  })();
  // v1.14.1：撤销 v1.13.3 的 ctrl/meta+wheel 放行
  //   原因：trackpad pinch-zoom 被浏览器映射成 ctrl+wheel；放行后双指捏合在地图上触发的是
  //   浏览器整页缩放而不是地图缩放，反而把"地图缩放"功能搞坏了。
  //   用户要做浏览器整页缩放可以用 Cmd/Ctrl +/-/0 快捷键或菜单，不必从地图区域捕捉。
  const _toolbarEl = document.getElementById('map-toolbar');
  if(_toolbarEl) {
    L.DomEvent.disableClickPropagation(_toolbarEl);
    L.DomEvent.disableScrollPropagation(_toolbarEl);
    // 进一步：每个按钮再单独阻止 dblclick（双击放大 = map 的 doubleClickZoom）
    _toolbarEl.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('dblclick', e => { e.preventDefault(); e.stopPropagation(); });
    });
  }
  // 同时给 mini card 也加一层防护
  const _miniEl = document.getElementById('primary-mini');
  if(_miniEl) {
    L.DomEvent.disableClickPropagation(_miniEl);
    L.DomEvent.disableScrollPropagation(_miniEl);
  }

  const baseLayers = {
    sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {attribution:'© Esri', maxZoom:18}),
  };
  let currentBase = baseLayers.sat.addTo(map);

  /* ============ Layer groups ============ */
  const trackLayer = L.layerGroup().addTo(map);
  const wpLayer = L.layerGroup().addTo(map);
  const highPointLayer = L.layerGroup().addTo(map);
  const escapeLayer = L.layerGroup().addTo(map);
  const networkLayer = L.layerGroup().addTo(map);
  const stitchLayer = L.layerGroup().addTo(map);

  const stitchPalette = ['#1E6F50','#D96C4A','#5577B8','#8A6BBE','#C45D83','#B7791F','#2B7A78','#9B4A3C'];
  const stitchState = {
    active:false,
    parts:[],
    selectedPartId:null,
    dirty:false,
  };

  /* ============ Color helpers ============ */
  // 天数分色：柔和但有区分度，适合卫星图与米色面板上的连续天数阅读
  const dayPalette = ['#2F6B5F','#D96C4A','#E1A93B','#5577B8','#8A6BBE','#C45D83','#5E9F65','#C58B54'];

  /* ============ Draw Track ============ */
  const mapRenderController = HTM_APP.createMapRenderController(runtimeContext);
  const leafletTrackRenderer = HTM_APP.createLeafletTrackRenderer({
    leaflet:L,
    trackLayer,
    networkLayer,
    requestFrame:callback => requestAnimationFrame(callback),
    cancelFrame:handle => cancelAnimationFrame(handle),
    interactionBlocked:() => interactionManager.current.kind !== 'idle',
    onHover:(event, model) => {
      const track = model.trail.track;
      const i = nearestTrackIdx(track, event.latlng.lat, event.latlng.lng);
      showTooltip(event, track[i], track[Math.min(i + 1, track.length - 1)], model.trail);
    },
    onHoverEnd:() => hideTooltip(),
    onInspectPoint:(event, model) => inspectTrackPoint(event, model.trail),
    onSelectTrail:trailId => {
      dispatchState({type:'primary-trail.set', trailId});
      rebuildAll({fit:false});
      saveToStorage();
    },
  });

  function renderTracksNow() {
    const model = mapRenderController.buildTracks({
      dayPalette,
      elevationBandCount:40,
      escapeReferenceTrailId:addEscapeState.active ? addEscapeState.referenceTrailId : null,
    });
    leafletTrackRenderer.render(model);
    renderRuntimeStats.elevationBands = model.elevationBands;
  }

  function drawTracks() {
    invalidateRender(HTM_APP.RENDER_DIRTY.TRACKS);
  }

  // 用于鼠标悬停时找最近轨迹点
  function nearestTrackIdx(track, lat, lng) {
    let best = 0, bestD = Infinity;
    for(let i=0; i<track.length; i+=Math.max(1, Math.floor(track.length/200))) {
      const dx = track[i][0] - lat, dy = track[i][1] - lng;
      const d = dx*dx + dy*dy;
      if(d < bestD) { bestD = d; best = i; }
    }
    // 在最佳点附近精修
    const lo = Math.max(0, best - 20), hi = Math.min(track.length, best + 20);
    for(let i=lo; i<hi; i++) {
      const dx = track[i][0] - lat, dy = track[i][1] - lng;
      const d = dx*dx + dy*dy;
      if(d < bestD) { bestD = d; best = i; }
    }
    return best;
  }
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
  const waypointVectorIconNames = {
    fork:'git-fork',
    warn:'triangle-alert',
    other:'map-pin',
  };
  function waypointIconMarkup(wpOrTag, className = '') {
    const tag = typeof wpOrTag === 'string' ? wpOrTag : (wpOrTag && wpOrTag.tag);
    const vectorName = waypointVectorIconNames[tag];
    if(vectorName) {
      return createWorkbenchIcon(document, vectorName, {
        size:16,
        strokeWidth:2.2,
        className:`waypoint-symbol waypoint-symbol--${tag} ${className}`.trim(),
      }).outerHTML;
    }
    const symbol = document.createElement('span');
    symbol.className = `waypoint-symbol waypoint-symbol--emoji ${className}`.trim();
    symbol.textContent = waypointIcon(wpOrTag);
    return symbol.outerHTML;
  }
  const tagLabels = {
    start:'起终点', end:'起终点',
    fork:'分叉点', camp:'营地', pass:'垭口',
    water:'水源', supply:'补给', warn:'高强度',
    shelter:'庇护', village:'村落/牧民', bridge:'桥梁',
    river:'小溪', other:'其他'
  };
  const DAY_ITINERARY_WAYPOINT_TAGS = new Set([
    'pass','water','supply','bridge','river','village','shelter','warn','fork','start','end','highpoint',
  ]);

  const wpMarkers = {};
  const markerRenderController = HTM_APP.createMarkerRenderController(runtimeContext, {
    tagColors,
    iconForWaypoint:waypointIconMarkup,
  });

  const leafletMarkerRenderer = HTM_APP.createLeafletMarkerRenderer({
    leaflet:L,
    waypointLayer:wpLayer,
    highPointLayer,
    waypointRegistry:wpMarkers,
    onWaypointClick:(event, model) => pinWpCard(event, model.waypoint, model.trail),
  });

  function collectWaypointMarkerModels() {
    return markerRenderController.build().waypoints;
  }

  function renderWaypointsNow() {
    const scene = markerRenderController.build();
    renderRuntimeStats.markers = leafletMarkerRenderer.renderWaypoints(scene.waypoints);
    leafletMarkerRenderer.renderHighPoints(scene.highPoints);
  }

  function drawWaypoints() {
    invalidateRender(HTM_APP.RENDER_DIRTY.MARKERS);
  }
  function showHelp() {
    return studioDialogs.content(HTM_APP.buildHelpDialogModel(
      currentLang,
      APP_VERSION,
      t('help.title'),
      t('changelog.close'),
    ));
  }
  function addWpMarker(trail, wp, isPrimary) {
        const color = tagColors[wp.tag] || '#aaa';
        const isWpMode = state.mode === 'waypoint';
        const iconText = waypointIconMarkup(wp);
        return HTM_APP.buildWaypointMarkerModel({trail, waypoint:wp, isPrimary, waypointMode:isWpMode, color, iconText});
  }

  function drawHighPoints() {
    leafletMarkerRenderer.renderHighPoints(markerRenderController.build().highPoints);
  }

  /* ============ Tooltip ============ */
  const tooltipEl = document.getElementById('tooltip');

  /* ============ Waypoint Photo Hover ============ */
  const wpPhotoEl = document.getElementById('wp-photo-tip');
  const escapeUiText = escapeHtmlText;
  function pinWpCard(e, wp, trail) {
    // 点击标注点 → 固定显示卡片，卡片中图片可点击放大
    const photoSrc = sanitizeImageSource(wp.photo) || '';
    const iconMarkup = waypointIconMarkup(wp);
    const photoHtml = photoSrc ? `<img id="pin-card-img" src="${photoSrc}" loading="lazy" style="display:block;max-width:260px;max-height:200px;border-radius:4px;cursor:zoom-in" onerror="this.style.display='none'">` : '';
    const trailLine = trail ? `<div style="color:${sanitizeHexColor(trail.color, '#aaaaaa')};font-size:10px;font-weight:600;margin-bottom:3px">${t('popup.trailLabel')}: ${escapeUiText(trail.name)}</div>` : '';
    const description = wp.description || (wp.name && wp.name !== wp.label ? wp.name : '');
    const descLine = description ? `<div style="color:#cfd6e0;font-size:10px;margin-top:3px;line-height:1.4;max-width:260px">${escapeUiText(description)}</div>` : '';
    wpPhotoEl.innerHTML = `
      <button id="pin-card-close" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.4);border:none;color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;padding:0">×</button>
      ${trailLine}
      ${photoHtml}
      <div class="waypoint-card-title" style="color:#cfd6e0;font-size:11px;margin-top:${photoHtml ? '4px' : '0'};padding:0 2px">${iconMarkup}<b>${escapeUiText(wp.label)}</b><span>· ${wp.km}${t('header.km')} · ${wp.elev}m</span></div>
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
      openLightbox(photoSrc, `${wp.label} · ${wp.km}${t('header.km')} · ${wp.elev}m`);
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
      <div class="row"><span class="lab">纬度</span><span class="val coordinate">${formatCoordinate(a[0])}</span></div>
      <div class="row"><span class="lab">经度</span><span class="val coordinate">${formatCoordinate(a[1])}</span></div>
      <div class="row"><span class="lab">轨迹</span><span style="color:${sanitizeHexColor(trail.color)}">${escapeUiText(trail.name)}</span></div>
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

  let trackPointInspectMarker = null;
  function formatCoordinate(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(6) : '-';
  }
  function formatTrackPointCoordinates(point) {
    return `${formatCoordinate(point && point[0])}, ${formatCoordinate(point && point[1])}`;
  }
  function inspectTrackPoint(event, trail) {
    if(!trail || !trail.track || !trail.track.length || !event || !event.latlng) return;
    const index = nearestTrackIdx(trail.track, event.latlng.lat, event.latlng.lng);
    const point = trail.track[index];
    if(!point) return;
    if(trackPointInspectMarker) {
      clearTimeout(trackPointInspectMarker._autoRemove);
      trackPointInspectMarker.remove();
    }
    const content = `
      <b>${point[3] != null ? point[3] + ' km · ' : ''}${Math.round(point[2] || 0)} m</b><br>
      <span class="track-point-coordinate">${formatTrackPointCoordinates(point)}</span>
    `;
    trackPointInspectMarker = L.circleMarker([point[0], point[1]], {
      radius:7, color:'#fff', weight:2, fillColor:trail.color || '#F59E0B', fillOpacity:1,
      pane:'tooltipPane',
    }).addTo(map);
    trackPointInspectMarker
      .bindTooltip(content, {permanent:true, direction:'top', offset:[0,-8], className:'measure-tip track-point-inspect-tip'})
      .openTooltip();
    clearTimeout(trackPointInspectMarker._autoRemove);
    trackPointInspectMarker._autoRemove = setTimeout(() => {
      if(trackPointInspectMarker) {
        trackPointInspectMarker.remove();
        trackPointInspectMarker = null;
      }
    }, 8000);
  }
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
  /* ============ Build sidebar ============ */
  function renderPrimaryCard() {
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
      if(toolbarContext) toolbarContext.textContent = t(DATA.trails.length ? 'toolbar.noGroup' : 'toolbar.noTrail');
      return;
    }
    if(toolbarContext) toolbarContext.textContent = `${main.stats.distance_km} KM · ${main.name}`;
    const primarySourceUrl = sanitizeExternalHttpUrl(main.source);
    const sourceLink = primarySourceUrl
      ? `<a href="${escapeUiText(primarySourceUrl)}" target="_blank" rel="noopener noreferrer" class="pc-link" title="${escapeUiText(primarySourceUrl)}">${t('pc.source')}</a>` : '';
    card.innerHTML = `
      <div class="pc-eyebrow">${t('pc.eyebrow')}</div>
      <div class="pc-name" id="pc-name" title="${currentLang === 'zh' ? '点击重命名' : 'Click to rename'}" style="cursor:pointer">${escapeUiText(main.name)}</div>
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
        saveToStorage(); renderPrimaryCard();
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
      <div style="font-size:13px;font-weight:600;color:#1F2A1C;line-height:1.3;margin-bottom:6px;font-family:var(--serif)">${escapeUiText(main.name)}</div>
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

  /** 独立轨迹组页面中的分组选择列表。 */
  function renderGroupTabs() {
    const groups = getGroups();
    const bar = document.createElement('div');
    bar.className = 'group-tab-bar studio-group-list';
    groups.forEach(g => {
      const btn = document.createElement('button');
      const count = DATA.trails.filter(t => trailGroup(t) === g).length;
      btn.className = 'group-tab' + (g === state.activeGroup ? ' active' : '');
      btn.setAttribute('aria-pressed', String(g === state.activeGroup));
      const name = document.createElement('span');
      const meta = document.createElement('span');
      name.className = 'group-tab-name';
      meta.className = 'group-tab-meta';
      name.textContent = g;
      meta.textContent = currentLang === 'zh' ? `${count} 条轨迹` : `${count} trails`;
      btn.append(name, meta);
      btn.title = g === state.activeGroup
        ? (currentLang === 'zh' ? `再次点击取消选中「${g}」组` : `Select again to clear “${g}”`)
        : (currentLang === 'zh' ? `切换到「${g}」组` : `Switch to “${g}”`);
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
    const appendMoveOption = (value, label) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      moveSel.appendChild(option);
    };
    appendMoveOption('', '移到…');
    getGroups().filter(g => g !== state.activeGroup).forEach(g => appendMoveOption(g, g));
    appendMoveOption('__new__', '＋ 新建组…');
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
    const trailId = escapeUiText(tr.id);
    return `
      <div class="trail-card-hdr">
        <div class="trail-checkbox ${isBatchChecked ? 'checked' : ''}" data-action="batch-toggle" title="${isBatchChecked ? '已选（点击取消）' : '选中此轨迹'}">${isBatchChecked ? '☑' : '☐'}</div>
        <div class="trail-expand-arrow ${isExpanded ? 'expanded' : ''}" data-action="toggle-expand" title="${isExpanded ? '收起详情' : '展开详情'}">${isExpanded ? '▾' : '▸'}</div>
        <div class="trail-color-dot" style="background:${sanitizeHexColor(tr.color)}"></div>
        <div class="trail-name">${escapeUiText(tr.name)}</div>
        <button type="button" class="trail-rename-btn" data-tid="${trailId}" title="${currentLang === 'zh' ? '重命名轨迹' : 'Rename trail'}" aria-label="${currentLang === 'zh' ? '重命名轨迹' : 'Rename trail'}"></button>
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
    const isPrimary = (tr.id === state.primaryTrailId);
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
    return recordProjectEdit('编辑轨迹来源', 'Edit trail source', () => {
      tr.source = newUrl.trim();
      applyChange();
      return true;
    });
  }

  async function editTrailName(tr) {
    const newName = await studioDialogs.prompt({
      title:currentLang === 'zh' ? '重命名轨迹' : 'Rename trail',
      inputLabel:currentLang === 'zh' ? '轨迹名称' : 'Trail name',
      value:tr.name,
      required:true,
      maxLength:120,
      selectOnOpen:true,
      confirmLabel:currentLang === 'zh' ? '保存' : 'Save',
      cancelLabel:currentLang === 'zh' ? '取消' : 'Cancel',
    });
    if(!newName || !DATA.trails.includes(tr)) return false;
    return recordProjectEdit('重命名轨迹', 'Rename trail', () => trailController.renameTrail(tr.id, newName));
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
    return recordProjectEdit('编辑轨迹 ID', 'Edit trail ID', () => {
      const trimmed = newId.trim();
      const oldId = tr.id;
      tr.id = trimmed;
      dispatchState({type:'trail-id.rename', oldId, newId:trimmed});
      applyChange();
      return true;
    });
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
    recordProjectEdit('移动轨迹组', 'Move trail to group', () => {
      const oldGroup = trailGroup(tr);
      tr.group = newGroup;
      // v1.21.0：如果被移出的 trail 是原组的主轨迹，清掉原组的记忆
      if(oldGroup !== newGroup && state.primaryByGroup[oldGroup] === tr.id) {
        const remaining = DATA.trails.filter(t => trailGroup(t) === oldGroup && t.id !== tr.id);
        dispatchState({type:'group.set-primary', group:oldGroup, trailId:remaining[0] ? remaining[0].id : null});
      }
      applyChange();
      showToast(`已移至「${newGroup}」组`);
    });
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
      chip.dataset.waypointTag = tag;
      chip.innerHTML = `<span class="ic waypoint-filter-icon" aria-hidden="true" style="color:${tagColors[tag] || '#64748b'}">${waypointIconMarkup(tag)}</span><span class="filter-chip-label">${t('tag.'+tag)}</span><span class="cnt">${counts[tag]}</span>`;
      chip.addEventListener('click', () => {
        dispatchState({type:'visible-tag.set', tag, visible:!state.visibleTags.has(tag)});
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
    const trail = DATA.trails.find(t => t.id === state.primaryTrailId);
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
    const sources = DATA.trails.filter(candidate =>
      candidate.id !== trail.id && trailGroup(candidate) === state.activeGroup);
    const candidates = HTM_CORE.collectNearbyItineraryWaypoints(trail.track, range, sources, 200)
      .filter(candidate => DAY_ITINERARY_WAYPOINT_TAGS.has(candidate.waypoint.tag));
    if(!candidates.length) return;
    const selected = selectedNearbyWaypointRefs(trail, dm.d);
    const details = document.createElement('details');
    details.className = 'nearby-waypoint-picker';
    const summary = document.createElement('summary');
    const updateSummary = () => {
      const count = [...details.querySelectorAll('input[type="checkbox"]')].filter(input => input.checked).length;
      summary.textContent = `${currentLang === 'zh' ? '附近轨迹标注' : 'Nearby trail waypoints'} · ${count}/${candidates.length}`;
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
          trail.itinerary_waypoint_refs = {...(trail.itinerary_waypoint_refs || {}), [String(dm.d)]:[...refs]};
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
    addBtn.textContent = currentLang === 'zh' ? '＋ 规划下撤路线' : '+ Plan escape route';
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
    nameFilter.placeholder = currentLang === 'zh' ? '筛选下撤方案' : 'Filter escape routes';
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
    addOption(directionFilter, 'all', currentLang === 'zh' ? '全部方向' : 'All directions');
    addOption(directionFilter, 'forward', currentLang === 'zh' ? '正向' : 'Forward');
    addOption(directionFilter, 'reverse', currentLang === 'zh' ? '反向' : 'Reverse');
    addOption(dayFilter, 'all', currentLang === 'zh' ? '全部 Day' : 'All days');
    [...new Set(routes.flatMap(route => HTM_CORE.escapeRouteDays(route)))]
      .sort((left, right) => left - right)
      .forEach(day => addOption(dayFilter, String(day), `D${day}`));
    if(routes.some(route => HTM_CORE.escapeRouteDays(route).length === 0)) {
      addOption(dayFilter, 'none', currentLang === 'zh' ? '未关联 Day' : 'No day');
    }
    addOption(referenceFilter, 'all', currentLang === 'zh' ? '全部依据轨迹' : 'All references');
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
      ? (currentLang === 'zh' ? '未关联行程的下撤方案' : 'Unassigned escape routes')
      : `${currentLang === 'zh' ? '本日下撤方案' : 'Escape routes'} · ${routes.length}`;
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
        const directionTag = `<span class="escape-direction-tag ${direction}">${direction === 'reverse' ? (currentLang === 'zh' ? '反向' : 'Reverse') : (currentLang === 'zh' ? '正向' : 'Forward')}</span>`;
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
            const wasActive = state.activeEscape === delId;
            if(recordProjectEdit('删除下撤路线', 'Delete escape route', () => escapeController.deleteRoute(trail.id, delId))) {
              if(wasActive) clearEscape();
              saveToStorage();
              buildDaysTab();
            }
            return;
          }
          if(state.activeEscape === r.id) {
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
            return `<div class="lg-row" style="opacity:${isP?1:0.6}"><div class="swatch" style="background:${sanitizeHexColor(t.color)};height:${isP?5:3}px"></div>${isP?'★ ':''}${escapeUiText(t.name)}</div>`;
          }).join('');
      }
    } else if(state.mode === 'elev') {
      let legendMinElevation = Infinity;
      let legendMaxElevation = -Infinity;
      for(const trail of DATA.trails) {
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
  let lastNonDayMode = state.mode === 'day' ? 'elev' : state.mode;
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
      if(state.mode !== 'day') lastNonDayMode = state.mode;
      buildDaysTab();
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

  function setMapMode(mode, opts = {}) {
    document.querySelectorAll('[data-mode]').forEach(x => {
      const active = x.dataset.mode === mode;
      x.classList.toggle('on', active);
      x.setAttribute('aria-pressed', String(active));
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
      btn.className = 'btn-mini waypoint-mode-tag' + (on ? ' on' : '');
      btn.innerHTML = `<span class="waypoint-filter-icon" aria-hidden="true" style="color:${color}">${waypointIconMarkup(tag)}</span><span>${t('tag.'+tag)}</span>`;
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
  /* ============ 测距功能（主轨迹上选两点 → 爬升/下降/里程） ============ */
  const measureController = HTM_APP.createMeasureController();
  const measureState = measureController.state;
  const measureTrackCache = new WeakMap();
  const measureStatsCache = new WeakMap();

  function nearestTrackIdxOnPrimary(lat, lng) {
    const main = DATA.trails.find(t => t.id === state.primaryTrailId);
    if(!main || !main.track || !main.track.length) return null;
    const tk = main.track;
    const sig = `${tk[0][0]},${tk[0][1]}|${tk[tk.length-1][0]},${tk[tk.length-1][1]}`;
    // 缓存主轨迹 typed array + 经纬度网格；测距点击只查附近网格，避免每次全轨扫描。
    let cache = measureTrackCache.get(main);
    if(!cache || cache.length !== tk.length || cache.sig !== sig) {
      const cellSize = 0.0015; // 约 160m，经纬度网格只用于候选点粗筛
      const latCache = new Float64Array(tk.length);
      const lngCache = new Float64Array(tk.length);
      const grid = new Map();
      for(let i=0; i<tk.length; i++) {
        const la = tk[i][0], ln = tk[i][1];
        latCache[i] = la;
        lngCache[i] = ln;
        const key = `${Math.floor(la / cellSize)}:${Math.floor(ln / cellSize)}`;
        let bucket = grid.get(key);
        if(!bucket) { bucket = []; grid.set(key, bucket); }
        bucket.push(i);
      }
      cache = { length: tk.length, sig, cellSize, grid, latCache, lngCache };
      measureTrackCache.set(main, cache);
    }
    const lats = cache.latCache;
    const lngs = cache.lngCache;
    const cellSize = cache.cellSize;
    const cosL = Math.cos(lat * Math.PI / 180);
    let bestI = 0, bestPlanar = Infinity;

    const cLat = Math.floor(lat / cellSize);
    const cLng = Math.floor(lng / cellSize);
    const latRadius = 2;
    const lngRadius = Math.max(2, Math.ceil((0.002 / Math.max(cosL, 0.15)) / cellSize));
    let seenCandidate = false;
    for(let gy = cLat - latRadius; gy <= cLat + latRadius; gy++) {
      for(let gx = cLng - lngRadius; gx <= cLng + lngRadius; gx++) {
        const bucket = cache.grid.get(`${gy}:${gx}`);
        if(!bucket) continue;
        for(let k=0; k<bucket.length; k++) {
          const i = bucket[k];
          const dy = lats[i] - lat;
          const dx = (lngs[i] - lng) * cosL;
          const d2 = dx*dx + dy*dy;
          if(d2 < bestPlanar) { bestPlanar = d2; bestI = i; }
        }
        seenCandidate = true;
      }
    }

    if(!seenCandidate) return null;
    // 邻近网格可能仍有多点集中，候选内取最近；不再扫描整条主轨迹。
    const p = tk[bestI];
    const distM = haversine(lat, lng, p[0], p[1]);
    if(distM > 200) return null;
    return { idx: bestI, point: p, dist: distM, trail: main };
  }

  function nearestTrackIdxNearPrimary(lat, lng, centerIdx, windowSize = 700) {
    const main = DATA.trails.find(t => t.id === state.primaryTrailId);
    if(!main || !main.track || !main.track.length || centerIdx == null || !isFinite(centerIdx)) {
      return nearestTrackIdxOnPrimary(lat, lng);
    }
    const tk = main.track;
    const lo = Math.max(0, Math.floor(centerIdx) - windowSize);
    const hi = Math.min(tk.length - 1, Math.floor(centerIdx) + windowSize);
    const cosL = Math.cos(lat * Math.PI / 180);
    let bestI = -1, bestPlanar = Infinity;
    for(let i=lo; i<=hi; i++) {
      const dy = tk[i][0] - lat;
      const dx = (tk[i][1] - lng) * cosL;
      const d2 = dx*dx + dy*dy;
      if(d2 < bestPlanar) { bestPlanar = d2; bestI = i; }
    }
    if(bestI >= 0) {
      const p = tk[bestI];
      const distM = haversine(lat, lng, p[0], p[1]);
      if(distM <= 200) return { idx: bestI, point: p, dist: distM, trail: main };
    }
    return nearestTrackIdxOnPrimary(lat, lng);
  }

  function nearestTrackIdxOnTrail(trail, lat, lng, centerIdx = null, windowSize = 1000) {
    const track = trail?.track || [];
    if(!track.length) return null;
    let lo = 0;
    let hi = track.length - 1;
    if(Number.isFinite(centerIdx)) {
      lo = Math.max(0, Math.round(centerIdx) - windowSize);
      hi = Math.min(track.length - 1, Math.round(centerIdx) + windowSize);
    }
    const cosLat = Math.max(.15, Math.cos(lat * Math.PI / 180));
    let bestIndex = lo;
    let bestDistance = Infinity;
    for(let index = lo; index <= hi; index += 1) {
      const dy = track[index][0] - lat;
      const dx = (track[index][1] - lng) * cosLat;
      const distance = dx * dx + dy * dy;
      if(distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    const point = track[bestIndex];
    return {idx:bestIndex, point, dist:haversine(lat, lng, point[0], point[1]), trail};
  }

  function measurePointFromHit(hit) {
    const p = hit.point;
    return { idx: hit.idx, lat: p[0], lng: p[1], elev: p[2] || 0, km: p[3] || 0 };
  }


  function getMeasureStatsCache(main) {
    if(!main || !main.track || !main.track.length) return null;
    const tk = main.track;
    const sig = `${tk[0][0]},${tk[0][1]}|${tk[tk.length-1][0]},${tk[tk.length-1][1]}|${tk.length}`;
    let cache = measureStatsCache.get(main);
    if(cache && cache.sig === sig) return cache;

    const n = tk.length;
    const ascCum = new Float64Array(n);
    const descCum = new Float64Array(n);
    const distCum = new Float64Array(n);
    const elevs = new Array(n);
    for(let i=0; i<n; i++) {
      distCum[i] = Number.isFinite(tk[i][3]) ? tk[i][3] : (i ? distCum[i-1] : 0);
      ascCum[i] = Number.isFinite(tk[i][4]) ? tk[i][4] : 0;
      descCum[i] = main._descCum && Number.isFinite(main._descCum[i]) ? main._descCum[i] : 0;
      elevs[i] = Number.isFinite(tk[i][2]) ? tk[i][2] : 0;
    }
    if(!main._descCum || main._descCum.length !== n) {
      const d = accumulatorDescent(elevs, 10);
      for(let i=0; i<n; i++) descCum[i] = d[i] || 0;
    }
    if(!Number.isFinite(tk[n-1][4])) {
      const a = accumulatorAscent(elevs, 10);
      for(let i=0; i<n; i++) ascCum[i] = a[i] || 0;
    }

    const blockSize = 256;
    const blockCount = Math.ceil(n / blockSize);
    const maxBlocks = new Float64Array(blockCount);
    for(let b=0; b<blockCount; b++) {
      let maxE = -Infinity;
      const start = b * blockSize;
      const end = Math.min(n, start + blockSize);
      for(let i=start; i<end; i++) if(elevs[i] > maxE) maxE = elevs[i];
      maxBlocks[b] = maxE;
    }
    cache = { sig, distCum, ascCum, descCum, elevs, blockSize, maxBlocks };
    measureStatsCache.set(main, cache);
    return cache;
  }

  function measureRangeMaxElev(cache, i1, i2) {
    if(!cache) return 0;
    const { elevs, blockSize, maxBlocks } = cache;
    let maxE = -Infinity;
    let i = i1;
    while(i <= i2 && i % blockSize !== 0) {
      if(elevs[i] > maxE) maxE = elevs[i];
      i++;
    }
    while(i + blockSize - 1 <= i2) {
      const b = Math.floor(i / blockSize);
      if(maxBlocks[b] > maxE) maxE = maxBlocks[b];
      i += blockSize;
    }
    while(i <= i2) {
      if(elevs[i] > maxE) maxE = elevs[i];
      i++;
    }
    return maxE;
  }

  function measureRangeMinElev(cache, i1, i2) {
    if(!cache) return 0;
    const { elevs } = cache;
    let minE = Infinity;
    for(let i=i1; i<=i2; i++) {
      if(elevs[i] < minE) minE = elevs[i];
    }
    return minE;
  }

  function computeMeasureStatsFromCache(cache, startIdx, endIdx) {
    if(!cache || !cache.elevs || !cache.elevs.length) return null;
    const fakeTrack = { length: cache.elevs.length };
    const range = normalizeTrackIndexRange(fakeTrack, startIdx, endIdx);
    if(!range) return null;
    const { iStart, iEnd, reversed } = range;
    const distKm = Math.abs((cache.distCum[iEnd] || 0) - (cache.distCum[iStart] || 0));
    const forwardAsc = Math.max(0, (cache.ascCum[iEnd] || 0) - (cache.ascCum[iStart] || 0));
    const forwardDesc = Math.max(0, (cache.descCum[iEnd] || 0) - (cache.descCum[iStart] || 0));
    return {
      ...range,
      distKm,
      asc: Math.round(reversed ? forwardDesc : forwardAsc),
      desc: Math.round(reversed ? forwardAsc : forwardDesc),
      maxE: Math.round(measureRangeMaxElev(cache, iStart, iEnd)),
      minE: Math.round(measureRangeMinElev(cache, iStart, iEnd)),
    };
  }

  function computeMeasureStats(a, b) {
    const main = DATA.trails.find(t => t.id === (measureState.trailId || state.primaryTrailId));
    if(!main || !main.track || !a || !b) return null;
    const cache = getMeasureStatsCache(main);
    if(!cache) return null;
    return computeMeasureStatsFromCache(cache, a.idx, b.idx);
  }


  function createPrimaryTrackDragSnapper(marker, opts = {}) {
    let latestLatLng = null;
    let frameId = 0;
    let frameTask = null;
    const raf = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb) => setTimeout(cb, 16);
    const cancelRaf = typeof cancelAnimationFrame === 'function'
      ? cancelAnimationFrame
      : clearTimeout;

    function resolveLatLng(ll) {
      const centerIdx = typeof opts.getCenterIdx === 'function' ? opts.getCenterIdx() : null;
      if(opts.trail) {
        const searchCenter = opts.globalSearch ? null : centerIdx;
        return nearestTrackIdxOnTrail(opts.trail, ll.lat, ll.lng, searchCenter, opts.windowSize || 1000);
      }
      return centerIdx != null
        ? nearestTrackIdxNearPrimary(ll.lat, ll.lng, centerIdx, opts.windowSize || 700)
        : nearestTrackIdxOnPrimary(ll.lat, ll.lng);
    }

    function flush() {
      frameId = 0;
      frameTask = null;
      if(!latestLatLng) return;
      const ll = latestLatLng;
      latestLatLng = null;
      const hit = resolveLatLng(ll);
      if(hit) {
        if(opts.snapMarker !== false && marker && marker.setLatLng) {
          marker.setLatLng([hit.point[0], hit.point[1]]);
        }
        if(typeof opts.onSnap === 'function') opts.onSnap(hit, ll);
      }
    }

    return {
      schedule(ev) {
        latestLatLng = ev.target.getLatLng();
        if(frameId || frameTask) return;
        if(typeof opts.scheduleFrame === 'function') frameTask = opts.scheduleFrame(flush);
        else frameId = raf(flush);
      },
      cancel() {
        if(frameTask && typeof frameTask.cancel === 'function') frameTask.cancel();
        if(frameId) cancelRaf(frameId);
        frameTask = null;
        frameId = 0;
        latestLatLng = null;
      },
      resolve: resolveLatLng
    };
  }

  function handleMeasureTap(event, session) {
    if(measureState._justDragged) return;
    const latlng = event.latlng;
    const isFast = event.source === 'fast';
    if(!isFast && measureState._fastTapUntil > Date.now()) return;
    if(measureState.ptA && measureState.ptB) {
      showToast('已选 A/B 后请拖动端点调整，或点「重新选点」', 'info');
      return;
    }

    const isA = !measureState.ptA;
    const tempColor = isA ? '#22c55e' : '#ef4444';
    const tempLabel = isA ? 'A' : 'B';
    let tempMarker = null;
    if(isFast) {
      if(isA) measureState.layer.clearLayers();
      tempMarker = measureMarker(latlng.lat, latlng.lng, tempLabel, tempColor);
      tempMarker.addTo(measureState.layer);
    }

    const commitHit = hit => {
      if(!session.isCurrent()) return;
      if(!hit) {
        tempMarker?.remove();
        showToast('请点击主轨迹附近（200m 内）', 'error');
        return;
      }
      const pt = measurePointFromHit(hit);
      if(tempMarker?.setLatLng) tempMarker.setLatLng([hit.point[0], hit.point[1]]);
      if(!measureState.ptA) {
        measureController.updateEndpoint('A', pt);
        session.setPhase('select-b');
        if(!tempMarker) measureMarker(pt.lat, pt.lng, 'A', '#22c55e').addTo(measureState.layer);
        setMeasureElevHint('再点击终点。');
        return;
      }
      if(pt.idx === measureState.ptA.idx) {
        tempMarker?.remove();
        showToast('起点和终点不能是同一点', 'error');
        return;
      }
      measureController.updateEndpoint('B', pt);
      session.setPhase('ready');
      measureCompute();
    };

    if(isFast) session.frame(() => commitHit(nearestTrackIdxOnPrimary(latlng.lat, latlng.lng)));
    else commitHit(nearestTrackIdxOnPrimary(latlng.lat, latlng.lng));
  }

  function handleMeasureInteractionEvent(event, session) {
    if(event.type === 'tap') {
      handleMeasureTap(event, session);
      return;
    }
    if(event.type === 'drag-start') {
      measureController.beginDrag();
      session.setPhase('dragging');
      return;
    }
    if(event.type === 'drag-snap') {
      if(session.phase === 'dragging' && applyMeasureEndpointHit(event.endpoint, event.hit, true)) {
        queueMeasureLiveUpdate();
      }
      return;
    }
    if(event.type !== 'drag-end') return;
    session.setPhase('ready');
    session.delay(250, () => { measureController.endDrag(); });
    const hit = event.hit;
    if(!hit) {
      showToast('必须拖到主轨迹附近（200m 内）', 'error');
      measureCompute();
      return;
    }
    const other = event.endpoint === 'A' ? measureState.ptB : measureState.ptA;
    if(other && hit.idx === other.idx) {
      showToast('起点和终点不能是同一点', 'error');
      measureCompute();
      return;
    }
    applyMeasureEndpointHit(event.endpoint, hit, false);
    measureCompute();
  }

  function measureEnter() {
    const main = DATA.trails.find(t => t.id === state.primaryTrailId);
    if(!main || !main.track || !main.track.length) {
      showToast('请先设置主轨迹', 'error');
      return;
    }
    beginRuntimeInteraction('measure', 'select-a', main, {
      onEvent: handleMeasureInteractionEvent,
      onCancel: opts => measureExit(opts),
    });
    measureController.enter(main.id);
    enterInteractionRenderMode('测距');
    clearDaySegmentPreview({silent:true});
    // v1.28.0：诊断日志（默认关闭，PERF_DEBUG=true 打开）
    if(window.PERF_DEBUG === true) {
      console.log('[measure-perf] 主轨迹点数:', main.track.length,
        '· 主轨迹 waypoint 数:', (main.waypoints || []).length,
        '· DATA.trails 数:', DATA.trails.length);
    }
    if(!measureState.layer) measureState.layer = L.layerGroup().addTo(map);
    clearMeasureLayer();
    const measurePanel = document.getElementById('measure-panel');
    measurePanel.style.display = 'block';
    if(measurePanel._applyFloatingPosition) measurePanel._applyFloatingPosition();
    resetMeasureElevReadout('在主轨迹上点击起点，再点击终点。');
    // 改鼠标样式
    map.getContainer().style.cursor = 'crosshair';
    // v1.30.0：加 measure-active 类，让 CSS 关闭所有 SVG path 的命中测试（消除 O(n) 命中检测的浏览器层瓶颈）
    map.getContainer().classList.add('measure-active');
  }

  function measureExit(opts = {}) {
    if(!opts.fromManager && cancelRuntimeInteraction('measure', opts.reason || 'cancelled')) return;
    measureController.exit();
    clearMeasureLayer();
    document.getElementById('measure-panel').style.display = 'none';
    hideMeasureElevReadout();
    map.getContainer().style.cursor = '';
    // v1.30.0：移除 measure-active 类，恢复 SVG path 的命中检测
    map.getContainer().classList.remove('measure-active');
    // 恢复完整主轨迹海拔图
    if(typeof refreshElevBar === 'function') refreshElevBar();
    // v1.30.0：取消自动复位到主轨迹（用户不希望测距退出后视图跳走）
  }

  function measureReset() {
    measureController.reset();
    setRuntimeInteractionPhase('measure', 'select-a');
    clearMeasureLayer();
    resetMeasureElevReadout('在主轨迹上点击起点，再点击终点。');
    // v1.31.0：复位时把海拔图刷回全轨模式，否则下次 measureCompute 的 refreshElevBar 会与残留状态竞态，出现"选 B 慢"
    if(typeof refreshElevBar === 'function') {
      requestAnimationFrame(() => refreshElevBar());
    }
  }

  function measureReverse() {
    if(!measureState.ptA || !measureState.ptB) {
      showToast('请先选择 A/B 两点', 'info');
      return;
    }
    if(!measureController.reverse()) return;
    measureCompute();
  }

  function measureMarker(lat, lng, label, color, opts = {}) {
    // v1.27.0：用 divIcon 替代 circleMarker+tooltip，减少 DOM 层级和 layout 触发
    const draggable = !!opts.draggable;
    const icon = L.divIcon({
      className: 'measure-marker-icon',
      html: '<div style="width:20px;height:20px;background:'+color+';border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;font-family:sans-serif;'+(draggable?'cursor:move;':'')+'">'+label+'</div>',
      iconSize: [interactionMarkerHitSize, interactionMarkerHitSize],
      iconAnchor: [interactionMarkerHitSize / 2, interactionMarkerHitSize / 2],
    });
    return L.marker([lat, lng], { icon, interactive: draggable, keyboard: false, draggable, autoPan: draggable });
  }

  function clearMeasureLayer() {
    if(measureState._liveFrame) {
      try {
        if(typeof measureState._liveFrame.cancel === 'function') measureState._liveFrame.cancel();
        else cancelAnimationFrame(measureState._liveFrame);
      } catch(e) {}
      measureState._liveFrame = 0;
    }
    if(measureState.layer) measureState.layer.clearLayers();
    measureState.segmentLine = null;
  }

  function showMeasureElevReadout() {
    const dist = document.getElementById('measure-distance');
    const hint = document.getElementById('measure-hint');
    if(dist) dist.classList.add('active');
    if(hint) hint.classList.add('active');
  }

  function hideMeasureElevReadout() {
    const dist = document.getElementById('measure-distance');
    const hint = document.getElementById('measure-hint');
    if(dist) dist.classList.remove('active');
    if(hint) hint.classList.remove('active');
  }

  function setMeasureElevHint(html) {
    const hint = document.getElementById('measure-hint');
    if(hint) hint.innerHTML = html;
    if(hint) hint.classList.toggle('active', !!html);
  }

  function resetMeasureElevReadout(hintText) {
    const dist = document.getElementById('measure-distance');
    const distText = document.getElementById('m-dist');
    if(dist) dist.classList.remove('active');
    if(distText) distText.textContent = '-';
    setMeasureElevHint(hintText || '在主轨迹上点击起点，再点击终点。');
  }


  function renderMeasureSegmentLine(maxPoints = 900) {
    if(!measureState.layer || !measureState.ptA || !measureState.ptB) return;
    const main = DATA.trails.find(t => t.id === (measureState.trailId || state.primaryTrailId));
    if(!main || !main.track) return;
    const model = buildMeasureSegmentRenderModel(
      main.track,
      measureState.ptA,
      measureState.ptB,
      maxPoints,
      main.track_breaks,
    );
    if(!model) return;
    measureState.segmentLine = HTM_APP.upsertLeafletPolyline(
      L,
      measureState.layer,
      measureState.segmentLine,
      model,
    );
  }

  function updateMeasureReadout(loading = false) {
    const a = measureState.ptA, b = measureState.ptB;
    if(!a || !b) return;
    const dist_el = document.getElementById('m-dist');
    const ascEl = document.getElementById('elev-stat-asc');
    const descEl = document.getElementById('elev-stat-desc');
    showMeasureElevReadout();
    if(loading) {
      if(dist_el) dist_el.textContent = '⋯';
      if(ascEl) ascEl.textContent = '↑⋯';
      if(descEl) descEl.textContent = '↓⋯';
      return;
    }
    const stats = computeMeasureStats(a, b);
    if(!stats) return;
    if(dist_el) dist_el.textContent = stats.distKm.toFixed(2) + ' km';
    if(ascEl) ascEl.textContent = '↑' + stats.asc + 'm';
    if(descEl) descEl.textContent = '↓' + stats.desc + 'm';
  }

  function queueMeasureLiveUpdate() {
    if(measureState._liveFrame) return;
    const session = interactionManager.current.kind === 'measure' ? interactionManager.current : null;
    const task = session?.frame(() => {
      measureState._liveFrame = 0;
      renderMeasureSegmentLine(700);
      updateMeasureReadout(false);
    });
    measureState._liveFrame = task || 0;
  }


  function applyMeasureEndpointHit(label, hit, live = false) {
    if(!hit) return false;
    const pt = measurePointFromHit(hit);
    const changed = measureController.updateEndpoint(label, pt);
    if(!changed) return false;
    setMeasureElevHint('');
    return true;
  }

  function bindMeasureEndpointDrag(marker, label) {
    const snapper = createPrimaryTrackDragSnapper(marker, {
      scheduleFrame: callback => scheduleRuntimeInteractionFrame('measure', callback),
      getCenterIdx: () => {
        const pt = label === 'A' ? measureState.ptA : measureState.ptB;
        return pt ? pt.idx : null;
      },
      onSnap: hit => {
        dispatchRuntimeInteraction('measure', {type:'drag-snap', endpoint:label, hit});
      },
    });
    marker.on('dragstart', () => {
      dispatchRuntimeInteraction('measure', {type:'drag-start', endpoint:label});
    });
    marker.on('drag', ev => snapper.schedule(ev));
    marker.on('dragend', ev => {
      const ll = ev.target.getLatLng();
      const hit = snapper.resolve(ll);
      snapper.cancel();
      dispatchRuntimeInteraction('measure', {type:'drag-end', endpoint:label, hit});
    });
  }

  function addMeasureEndpointMarker(pt, label, color) {
    const marker = measureMarker(pt.lat, pt.lng, label, color, { draggable: true }).addTo(measureState.layer);
    bindMeasureEndpointDrag(marker, label);
    return marker;
  }
  /* ============ 手动添加下撤路线 ============ */

  function escapeReferenceTrails() {
    if(state.activeGroup == null) return [];
    return DATA.trails.filter(trail => trailGroup(trail) === state.activeGroup && trail.track && trail.track.length);
  }

  function ensureEscapeTrailSelector() {
    let select = document.getElementById('addescape-trail-select');
    if(select) return select;
    const panel = document.getElementById('addescape-panel');
    const hint = document.getElementById('addescape-hint');
    if(!panel || !hint) return null;
    const row = document.createElement('div');
    row.className = 'form-row escape-reference-row';
    const label = document.createElement('label');
    label.className = 'form-label';
    label.htmlFor = 'addescape-trail-select';
    label.textContent = currentLang === 'zh' ? '依据轨迹：' : 'Reference trail:';
    select = document.createElement('select');
    select.id = 'addescape-trail-select';
    select.className = 'form-input';
    row.append(label, select);
    panel.insertBefore(row, hint);
    return select;
  }

  function refreshEscapeTrailSelector() {
    const select = ensureEscapeTrailSelector();
    if(!select) return;
    const label = select.previousElementSibling;
    if(label) label.textContent = currentLang === 'zh' ? '依据轨迹：' : 'Reference trail:';
    const selectedId = addEscapeState.referenceTrailId || state.primaryTrailId || '';
    select.replaceChildren();
    escapeReferenceTrails().forEach(trail => {
      const option = document.createElement('option');
      option.value = trail.id;
      option.textContent = trail.name + (trail.id === state.primaryTrailId
        ? (currentLang === 'zh' ? '（主轨迹）' : ' (Primary)')
        : '');
      option.selected = trail.id === selectedId;
      select.append(option);
    });
    select.disabled = select.options.length < 2;
  }

  function resetEscapeSelectionHint() {
    const hint = document.getElementById('addescape-hint');
    if(!hint) return;
    hint.innerHTML = currentLang === 'zh'
      ? '在所选依据轨迹上点击 <b style="color:#22c55e">起点 A</b>，再点击 <b style="color:#ef4444">终点 B</b>。<br><span style="font-size:10px">A/B 只会吸附到当前选择的轨迹。</span>'
      : 'Click <b style="color:#22c55e">point A</b>, then <b style="color:#ef4444">point B</b> on the selected reference trail.<br><span style="font-size:10px">A/B snap only to that trail.</span>';
  }

  function refreshEscapeDaySelect(selectedDays = []) {
    const group = document.getElementById('addescape-day-select');
    if(!group) return [];
    const days = escapeController.availableDays();
    const requested = Array.isArray(selectedDays) ? selectedDays.map(Number) : [Number(selectedDays)];
    const nextDays = days.filter(day => requested.includes(day));
    if(!nextDays.length && days.length) nextDays.push(days[0]);
    group.replaceChildren();
    days.forEach(day => {
      const label = document.createElement('label');
      label.className = 'escape-day-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = String(day);
      input.checked = nextDays.includes(day);
      label.append(input, document.createTextNode(`D${day}`));
      group.append(label);
    });
    if(nextDays.length) escapeController.setDays(nextDays);
    const dayValue = document.getElementById('ae-day');
    if(dayValue) dayValue.textContent = nextDays.length ? nextDays.map(day => `D${day}`).join('、') : '-';
    return nextDays;
  }

  function handleEscapeInteractionEvent(event, session) {
    if(event.type !== 'tap') return;
    const hit = escapeController.nearestPoint(event.latlng.lat, event.latlng.lng);
    if(!hit) {
      showToast(currentLang === 'zh' ? '请点击所选依据轨迹附近（2km 内）' : 'Click within 2 km of the selected reference trail', 'error');
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
    refreshEscapeTrailSelector();
    const btn = document.getElementById('add-escape-btn');
    if(btn) btn.classList.add('on');
    if(!addEscapeState.layer) addEscapeState.layer = L.layerGroup().addTo(map);
    addEscapeState.layer.clearLayers();
    document.getElementById('addescape-panel').style.display = 'block';
    document.getElementById('addescape-result').style.display = 'none';
    document.getElementById('ae-day').textContent = '-';
    document.getElementById('addescape-day-select').replaceChildren();
    resetEscapeSelectionHint();
    map.getContainer().style.cursor = 'crosshair';
    drawTracks();
  }

  function addEscapeExit(opts = {}) {
    if(!opts.fromManager && cancelRuntimeInteraction('escape', opts.reason || 'cancelled')) return;
    escapeController.exit();
    const btn = document.getElementById('add-escape-btn');
    if(btn) btn.classList.remove('on');
    if(addEscapeState.layer) addEscapeState.layer.clearLayers();
    document.getElementById('addescape-panel').style.display = 'none';
    map.getContainer().style.cursor = '';
    drawTracks();
  }

  function addEscapeReset() {
    escapeController.reset();
    if(addEscapeState.layer) addEscapeState.layer.clearLayers();
    document.getElementById('addescape-result').style.display = 'none';
    document.getElementById('ae-day').textContent = '-';
    resetEscapeSelectionHint();
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
    refreshEscapeDaySelect(HTM_CORE.escapeRouteDays(route));
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
    const route = recordProjectEdit('添加下撤路线', 'Add escape route', () => escapeController.commit(nameInput));
    if(!route) {
      setRuntimeInteractionPhase('escape', 'preview');
      showToast('下撤状态已失效，请重新选择', 'error');
      return;
    }
    saveToStorage();
    buildDaysTab();
    showToast(`✓ 下撤路线「${route.name}」已保存`);
    addEscapeExit({reason:'committed'});
  }

  // 按钮绑定
  const escapeTrailSelect = ensureEscapeTrailSelector();
  if(escapeTrailSelect) escapeTrailSelect.addEventListener('change', event => {
    const trailId = event.target.value;
    if(!escapeController.setReferenceTrail(trailId)) {
      refreshEscapeTrailSelector();
      return;
    }
    if(!state.activeTrails.has(trailId)) {
      dispatchState({type:'active-trail.set', trailId, active:true});
    }
    drawTracks();
    if(addEscapeState.layer) addEscapeState.layer.clearLayers();
    document.getElementById('addescape-result').style.display = 'none';
    resetEscapeSelectionHint();
    setRuntimeInteractionPhase('escape', 'select-a');
  });
  document.getElementById('addescape-close').addEventListener('click', addEscapeExit);
  document.getElementById('addescape-exit').addEventListener('click', addEscapeExit);
  document.getElementById('addescape-reset').addEventListener('click', addEscapeReset);
  document.getElementById('addescape-commit').addEventListener('click', addEscapeCommit);
  document.getElementById('addescape-day-select').addEventListener('change', event => {
    if(!event.target.matches('input[type="checkbox"]')) return;
    const inputs = [...event.currentTarget.querySelectorAll('input[type="checkbox"]')];
    let days = inputs.filter(input => input.checked).map(input => Number(input.value));
    if(!days.length) {
      event.target.checked = true;
      days = [Number(event.target.value)];
    }
    if(escapeController.setDays(days)) {
      document.getElementById('ae-day').textContent = days.map(day => `D${day}`).join('、');
    }
  });
  function measureCompute() {
    if(!measureState.ptA || !measureState.ptB) return;
    const seq = measureController.nextComputeSequence();
    const a = measureState.ptA, b = measureState.ptB;

    // 视觉反馈立即执行：先落 A/B marker，再把长线段绘制放到下一帧，避免拖动松手时卡住点位刷新。
    clearMeasureLayer();
    addMeasureEndpointMarker(a, 'A', '#22c55e');
    addMeasureEndpointMarker(b, 'B', '#ef4444');

    // 立即先显示计算中的数值状态，端点海拔由海拔图标注呈现。
    updateMeasureReadout(true);
    setMeasureElevHint('');

    // ── 计算重活放到下一帧，不阻塞点击 ──
    scheduleRuntimeInteractionFrame('measure', () => {
      if(!measureController.isComputeCurrent(seq)) return;
      renderMeasureSegmentLine(1200);
      if(!measureController.isComputeCurrent(seq)) return;
      updateMeasureReadout(false);

      // v1.30.0：取消 AB 计算完成后的自动 fitBounds（用户不希望测距时视图跳转）

      // 海拔图重绘放到再下一帧，让上面的数字先渲染
      if(typeof refreshElevBar === 'function') {
        scheduleRuntimeInteractionFrame('measure', () => {
          if(measureController.isComputeCurrent(seq)) refreshElevBar();
        });
      }
    });
  }
  /* ============ 分段功能（在主轨迹上依次选点，标记每天行程） ============ */
  const segmentController = HTM_APP.createSegmentController(runtimeContext, {
    markRevision:markTrailRevision,
  });
  const segmentState = segmentController.state;

  function handleSegmentTap(event, session) {
    if(segmentState._justDragged) return;
    if(event.source !== 'fast' && segmentState._fastTapUntil > Date.now()) return;
    const latlng = event.latlng;
    const commitHit = hit => {
      if(!session.isCurrent()) return;
      if(!hit) {
        showToast('请点击主轨迹附近（200m 内）', 'error');
        return;
      }
      const p = hit.point;
      segmentInsertPoint({idx:hit.idx, lat:p[0], lng:p[1], elev:p[2] || 0, km:p[3] || 0});
    };
    if(event.source !== 'fast') {
      commitHit(nearestTrackIdxOnPrimary(latlng.lat, latlng.lng));
      return;
    }
    const tempMarker = L.circleMarker([latlng.lat, latlng.lng], {
      radius:6, color:'#fff', weight:2, fillColor:'#fbbf24', fillOpacity:0.7,
    }).addTo(segmentState.layer || (segmentState.layer = L.layerGroup().addTo(map)));
    session.frame(() => {
      const hit = nearestTrackIdxOnPrimary(latlng.lat, latlng.lng);
      tempMarker.remove();
      commitHit(hit);
    });
  }

  function handleSegmentInteractionEvent(event, session) {
    if(event.type === 'tap') {
      handleSegmentTap(event, session);
      return;
    }
    if(event.type === 'drag-start') {
      segmentController.beginDrag();
      session.setPhase('dragging');
      return;
    }
    if(event.type !== 'drag-end') return;
    session.setPhase('editing');
    session.delay(200, () => { segmentController.endDrag(); });
    const hit = event.hit;
    if(!hit) {
      showToast('必须拖到主轨迹附近（200m 内）', 'error');
      redrawSegmentLayer();
      return;
    }
    const p = hit.point;
    const nextPoint = {idx:hit.idx, lat:p[0], lng:p[1], elev:p[2] || 0, km:p[3] || 0};
    const move = segmentController.moveBoundary(event.boundaryIndex, nextPoint);
    if(!move.ok && move.reason === 'duplicate') {
      showToast('该位置已被占用，请选另一处', 'error');
      redrawSegmentLayer();
      return;
    }
    if(!move.ok) {
      const message = move.reason === 'before-previous'
        ? '分段点必须在上一边界之后'
        : move.reason === 'after-next'
          ? '分段点必须在下一边界之前'
          : '该分段点不能移动到此处';
      showToast(message, 'error');
      redrawSegmentLayer();
      return;
    }
    updateSegmentUI();
  }

  function segmentEnter() {
    const main = DATA.trails.find(t => t.id === state.primaryTrailId);
    if(!main || !main.track || !main.track.length) {
      showToast('请先设置主轨迹', 'error');
      return;
    }
    beginRuntimeInteraction('segment', 'editing', main, {
      onEvent: handleSegmentInteractionEvent,
      onCancel: opts => segmentExit(opts),
    });
    enterInteractionRenderMode('分段');

    if(!segmentController.enter(main.id)) return;
    if(!segmentState.layer) segmentState.layer = L.layerGroup().addTo(map);
    segmentState.layer.clearLayers();

    document.getElementById('segment-panel').style.display = 'flex';
    map.getContainer().style.cursor = 'crosshair';
    // v1.30.0：分段模式也开启 SVG path 命中测试跳过
    map.getContainer().classList.add('measure-active');
    if(typeof resetView === 'function') resetView({restoreActive: true});
    updateSegmentUI();
  }

  function segmentExit(opts = {}) {
    if(!opts.fromManager && cancelRuntimeInteraction('segment', opts.reason || 'cancelled')) return;
    segmentController.exit();
    if(segmentState.layer) segmentState.layer.clearLayers();
    document.getElementById('segment-panel').style.display = 'none';
    map.getContainer().style.cursor = '';
    // v1.30.0：恢复 SVG 命中检测
    map.getContainer().classList.remove('measure-active');
    updateSegmentDirtyIndicator();
  }

  let segmentExitPrompt = null;
  function requestSegmentExit(reason = 'cancelled') {
    if(!segmentState.active && interactionManager.current.kind !== 'segment') return Promise.resolve(true);
    const finish = () => {
      if(cancelRuntimeInteraction('segment', reason)) return true;
      segmentExit({fromManager:true, reason});
      return true;
    };
    if(!segmentController.isDirty()) return Promise.resolve(finish());
    if(segmentExitPrompt) return segmentExitPrompt;
    segmentExitPrompt = studioDialogs.confirm({
      title:currentLang === 'zh' ? '存在未应用修改' : 'Unapplied segment changes',
      message:currentLang === 'zh'
        ? '当前分段边界或营地信息尚未应用。确定放弃这些修改并退出吗？'
        : 'Segment boundaries or camp details have not been applied. Discard these changes and exit?',
      danger:true,
      confirmLabel:currentLang === 'zh' ? '放弃并退出' : 'Discard and exit',
      cancelLabel:currentLang === 'zh' ? '继续编辑' : 'Keep editing',
    }).then(confirmed => confirmed ? finish() : false).finally(() => { segmentExitPrompt = null; });
    return segmentExitPrompt;
  }

  function updateSegmentDirtyIndicator() {
    const indicator = document.getElementById('segment-dirty-indicator');
    if(!indicator) return;
    indicator.hidden = !segmentController.isDirty();
    indicator.textContent = currentLang === 'zh' ? '存在未应用修改' : 'Unapplied changes';
  }

  function segmentUndo() {
    segmentDeleteDay(segmentState.points.length - 1);
  }

  function segmentRestore() {
    if(segmentController.restore()) updateSegmentUI();
  }


  function segmentInsertPoint(pt) {
    const result = segmentController.insertPoint(pt);
    if(!result.ok) {
      if(result.reason === 'empty') return false;
      if(result.reason === 'duplicate') {
        showToast('该点已选中，请选另一个位置', 'error');
        return false;
      }
      showToast('请点击现有行程范围内的未占用位置', 'error');
      return false;
    }
    updateSegmentUI();
    return true;
  }

  function segmentDeleteDay(dayNo) {
    const result = segmentController.deleteDay(dayNo);
    if(!result.ok) {
      if(result.reason === 'min-days') {
        showToast('至少保留 1 天行程', 'info');
      }
      return false;
    }
    updateSegmentUI();
    return true;
  }


  function segmentStats(startIdx, endIdx) {
    const main = DATA.trails.find(t => t.id === state.primaryTrailId);
    if(!main || !main.track) return null;
    const stats = computeSegmentStatsForTrack(main.track, startIdx, endIdx);
    if(!stats) return null;
    return { km: stats.kmText, asc: stats.asc, desc: stats.desc, maxE: stats.maxE, max: stats.max, minE: stats.minE, min: stats.min };
  }

  function updateSegmentUI() {
    const pts = segmentState.points;
    const hint = document.getElementById('segment-hint');
    if(pts.length === 0) {
      hint.innerHTML = '自动使用主轨迹起点与终点作为 1 天行程；点击轨迹中间位置可插入新的分段边界。';
    } else if(pts.length === 1) {
      hint.innerHTML = '✓ 起点已选（<span style="color:#22c55e">▲</span> D1 起点）。再点击选择 <b style="color:#fbbf24">D1 终点</b>（也是 D2 起点）。';
    } else {
      hint.innerHTML = '✓ 已分 <b style="color:#60a5fa">' + (pts.length - 1) + '</b> 天。点击轨迹插入边界，拖动黄色分段点调整，或在列表中删除指定日期。';
    }
    renderSegmentList();
    redrawSegmentLayer();
    updateSegmentDirtyIndicator();
  }

  function renderSegmentList() {
    const list = document.getElementById('segment-list');
    const pts = segmentState.points;
    if(pts.length < 2) {
      list.innerHTML = '<div style="color:#64748b;text-align:center;padding:16px 0;font-size:11px">尚未选中任何一天…</div>';
      return;
    }
    const DAY_COLORS = dayPalette;
    let html = '';
    for(let d=1; d<pts.length; d++) {
      const stats = segmentStats(pts[d-1].idx, pts[d].idx);
      const color = DAY_COLORS[(d-1) % DAY_COLORS.length];
      const campData = segmentState.campEdits[d] || {};
      const campName = campData.name || '';
      const campElev = Math.round(pts[d].elev);
      const campCoordinates = formatTrackPointCoordinates([pts[d].lat, pts[d].lng]);
      html += '<div class="segment-day-card" style="--day-color:'+color+'">' +
        '<div class="segment-day-head">' +
          '<b class="segment-day-title">D'+d+'</b>' +
          '<span class="segment-day-stats">'+stats.km+'km · ↑'+stats.asc+' · ↓'+stats.desc+' · 高'+stats.maxE+' · 低'+stats.minE+'</span>' +
          '<button class="seg-day-delete" data-day="'+d+'" title="删除 D'+d+'">删除</button>' +
        '</div>' +
        '<div class="segment-field">' +
          '<label>营地名</label>' +
          '<input class="seg-camp-name" data-day="'+d+'" placeholder="选填，如「仲达牧场」" value="'+campName.replace(/"/g,'&quot;')+'">' +
        '</div>' +
        '<div class="segment-field">' +
          '<label>营地海拔</label>' +
          '<output class="seg-camp-elev" data-day="'+d+'">'+campElev+' m</output>' +
          '<span class="segment-point-coordinate">'+campCoordinates+'</span>' +
        '</div>' +
      '</div>';
    }
    list.innerHTML = html;
    // 绑定输入事件
    list.querySelectorAll('.seg-camp-name').forEach(inp => {
      inp.addEventListener('input', e => {
        const d = +e.target.dataset.day;
        segmentController.updateCamp(d, {name:e.target.value});
        updateSegmentDirtyIndicator();
      });
    });
    list.querySelectorAll('.seg-day-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        segmentDeleteDay(+e.currentTarget.dataset.day);
      });
    });
  }


  function redrawSegmentLayer() {
    if(!segmentState.layer) return;
    segmentState.layer.clearLayers();
    const main = DATA.trails.find(t => t.id === state.primaryTrailId);
    if(!main) return;
    const tk = main.track;
    const pts = segmentState.points;
    const DAY_COLORS = dayPalette;
    const model = buildSegmentLayerModel(tk, pts, DAY_COLORS, 900, main.track_breaks);
    // 为每天绘制不同颜色高亮线段
    model.segments.forEach(seg => {
      L.polyline(seg.latLngs, seg.lineStyle).addTo(segmentState.layer);
    });
    // 绘制分段点标记（可拖拽的 divIcon Marker）
    model.markers.forEach(m => {
      const icon = L.divIcon({
        className: 'segment-marker',
        html: '<div style="width:22px;height:22px;background:'+m.color+';border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-weight:700;color:#1a1a1a;font-size:10px;font-family:sans-serif;cursor:'+m.cursor+'">'+m.label+'</div>',
        iconSize: [Math.max(m.iconSize[0], interactionMarkerHitSize), Math.max(m.iconSize[1], interactionMarkerHitSize)],
        iconAnchor: [Math.max(m.iconSize[0], interactionMarkerHitSize) / 2, Math.max(m.iconSize[1], interactionMarkerHitSize) / 2],
      });
      const marker = L.marker([m.lat, m.lng], Object.assign({ icon }, m.markerOptions)).addTo(segmentState.layer);
      marker._segIdx = m.pointIndex;
      if(!m.isBoundary) return;
      const snapper = createPrimaryTrackDragSnapper(marker, {
        scheduleFrame: callback => scheduleRuntimeInteractionFrame('segment', callback),
      });
      marker.on('dragstart', () => {
        dispatchRuntimeInteraction('segment', {type:'drag-start', boundaryIndex:marker._segIdx});
      });
      // 拖动过程中：吸附到主轨迹上（同时约束在相邻分段点之间）
      marker.on('drag', ev => snapper.schedule(ev));
      // 拖动结束：确定 idx，检查冲突，重排（保持递增顺序）后重绘
      marker.on('dragend', ev => {
        const ll = ev.target.getLatLng();
        const hit = snapper.resolve(ll);
        snapper.cancel();
        dispatchRuntimeInteraction('segment', {type:'drag-end', boundaryIndex:marker._segIdx, hit});
      });
    });
  }

  async function segmentApply() {
    if(segmentState.points.length < 2) {
      showToast('至少需要 2 个分段点（1 天）', 'error');
      return false;
    }
    if(!setRuntimeInteractionPhase('segment', 'committing')) return;
    const before = projectHistoryController.capture();
    const result = segmentController.apply();
    if(!result) {
      setRuntimeInteractionPhase('segment', 'editing');
      showToast('分段状态已失效，请重新进入分段模式', 'error');
      return false;
    }
    // 在离开编辑态前完成 IndexedDB 事务，避免应用后立即关闭 HTML 丢失最新日程。
    const saved = await _doSave();
    showToast(saved
      ? '✓ 已应用并保存 ' + result.dayCount + ' 天分段'
      : '已应用分段，但浏览器缓存保存失败', saved ? 'info' : 'error');
    // 完整重绘（fit:false 保持当前视野，但同步地图标注、行程、主轨迹小卡等所有 UI）
    rebuildAll({fit:false});
    if(typeof refreshElevBar === 'function') refreshElevBar();
    projectHistoryController.commit(historyLabel('应用行程分段', 'Apply itinerary segments'), before);
    segmentExit({reason:'committed'});
    return saved;
  }

  const segmentCloseBtn = document.getElementById('segment-close');
  if(segmentCloseBtn) segmentCloseBtn.addEventListener('click', () => { void requestSegmentExit('close'); });
  const segmentExitBtn = document.getElementById('segment-exit');
  if(segmentExitBtn) segmentExitBtn.addEventListener('click', () => { void requestSegmentExit('exit'); });
  const segmentUndoBtn = document.getElementById('segment-undo');
  if(segmentUndoBtn) segmentUndoBtn.addEventListener('click', segmentUndo);
  const segmentRestoreBtn = document.getElementById('segment-restore');
  if(segmentRestoreBtn) segmentRestoreBtn.addEventListener('click', segmentRestore);
  const segmentApplyBtn = document.getElementById('segment-apply');
  if(segmentApplyBtn) segmentApplyBtn.addEventListener('click', segmentApply);
  const measureCloseBtn = document.getElementById('measure-close');
  if(measureCloseBtn) measureCloseBtn.addEventListener('click', measureExit);
  const measureExitBtn = document.getElementById('measure-exit');
  if(measureExitBtn) measureExitBtn.addEventListener('click', measureExit);
  const measureResetBtn = document.getElementById('measure-reset');
  if(measureResetBtn) measureResetBtn.addEventListener('click', measureReset);
  const measureReverseBtn = document.getElementById('measure-reverse');
  if(measureReverseBtn) measureReverseBtn.addEventListener('click', measureReverse);
  // v1.26.0：测距/分段模式改用原生 pointerdown/pointerup 快速触发（绕过 Leaflet click 内部延迟）
  // 判断"不是拖拽" = down 到 up 位置差 < 6px 且时间 < 400ms
  (function() {
    const container = map.getContainer();
    let pd = null; // {x, y, t, pointerType, pointerId}
    function isFastTap(x, y, t, pointerType, pointerId) {
      if(!pd) return false;
      if(pointerId != null && pd.pointerId != null && pointerId !== pd.pointerId) return false;
      return HTM_CORE.isPointerTap({
        startX:pd.x, startY:pd.y, endX:x, endY:y,
        elapsedMs:t - pd.t,
        pointerType:pointerType || pd.pointerType || 'mouse',
      });
    }
    function onDown(x, y, target, pointerType = 'mouse', pointerId = null) {
      // 只有测距/分段模式激活时才捕获
      if(!['measure', 'segment'].includes(interactionManager.current.kind)) { pd = null; return; }
      // 别拦截控件/UI 上的点击
      if(target && (target.closest('.leaflet-marker-icon') || target.closest('.leaflet-control') ||
                     target.closest('#segment-panel') || target.closest('#measure-panel') ||
                     target.closest('#map-toolbar') || target.closest('#sidebar'))) {
        pd = null; return;
      }
      pd = { x, y, pointerType, pointerId, t: (typeof performance !== 'undefined' ? performance.now() : Date.now()) };
    }
    function onUp(x, y, target, pointerType = 'mouse', pointerId = null) {
      if(!pd) return;
      const t = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if(!isFastTap(x, y, t, pointerType, pointerId)) { pd = null; return; }
      // 别拦截控件/marker 上的点击
      if(target && (target.closest('.leaflet-marker-icon') || target.closest('.leaflet-control'))) {
        pd = null; return;
      }
      // 转换 x,y → latlng（相对 container 的位置）
      const rect = container.getBoundingClientRect();
      const latlng = map.containerPointToLatLng([x - rect.left, y - rect.top]);
      // 派发到 measure/segment 处理逻辑，先阻止 Leaflet 的默认 click（避免重复）
      handleFastTap(latlng);
      pd = null;
    }
    function handleFastTap(latlng) {
      const kind = interactionManager.current.kind;
      if(kind !== 'measure' && kind !== 'segment') return;
      if(!dispatchRuntimeInteraction(kind, {type:'tap', source:'fast', latlng})) return;
      const until = Date.now() + 350;
      if(kind === 'measure') measureController.suppressFastTap(until);
      else segmentController.suppressFastTap(until);
    }
    // 优先使用 pointer 事件（覆盖鼠标 + 触屏 + 触控笔）
    if(window.PointerEvent) {
      container.addEventListener('pointerdown', e => {
        if(e.pointerType !== 'mouse' && e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
        onDown(e.clientX, e.clientY, e.target, e.pointerType, e.pointerId);
      }, {capture: true, passive: true});
      container.addEventListener('pointerup', e => {
        onUp(e.clientX, e.clientY, e.target, e.pointerType, e.pointerId);
      }, {capture: true, passive: true});
      container.addEventListener('pointercancel', () => { pd = null; }, {capture: true, passive: true});
    } else {
      container.addEventListener('mousedown', e => onDown(e.clientX, e.clientY, e.target, 'mouse'), {capture: true});
      container.addEventListener('mouseup', e => onUp(e.clientX, e.clientY, e.target, 'mouse'), {capture: true});
      container.addEventListener('touchstart', e => {
        if(e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY, e.target, 'touch', e.touches[0].identifier);
      }, {capture: true, passive: true});
      container.addEventListener('touchend', e => {
        if(e.changedTouches.length === 1) onUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY, e.target, 'touch', e.changedTouches[0].identifier);
      }, {capture: true, passive: true});
    }
  })();

  // 监听地图点击：测距模式下选点（fallback：如果 fast-tap 没触发，click 兜底）
  map.on('click', e => {
    const kind = interactionManager.current.kind;
    if(!['measure', 'segment', 'waypoint', 'escape'].includes(kind)) return;
    dispatchRuntimeInteraction(kind, {type:'tap', source:'leaflet', latlng:e.latlng});
  });

  /* ============ 底部海拔剖面图 ============ */
  const elevCanvas = document.getElementById('elev-canvas');
  const elevCtx = elevCanvas ? elevCanvas.getContext('2d') : null;
  const elevCrosshair = document.getElementById('elev-crosshair');
  const elevTip = document.getElementById('elev-tip');
  const elevLabel = document.getElementById('elev-label');

  // 当前绘制数据缓存
  let _elevBarData = null;
  const elevationCanvasRenderer = elevCtx ? HTM_APP.createElevationCanvasRenderer(elevCtx) : null;

  /** 更新顶部爬升/下降 badge */
  function updateElevBadges(badges) {
    const ascEl = document.getElementById('elev-stat-asc');
    const descEl = document.getElementById('elev-stat-desc');
    if(ascEl) ascEl.textContent = badges.ascentText;
    if(descEl) descEl.textContent = badges.descentText;
  }

  function drawElevBar(pts, color, label, opts) {
    if(!elevCanvas || !elevationCanvasRenderer || !pts || pts.length < 2) return;
    opts = opts || {};
    const dimensions = {
      width:elevCanvas.offsetWidth || 340,
      height:elevCanvas.offsetHeight || 140,
      dpr:window.devicePixelRatio || 1,
    };
    const scene = HTM_APP.buildElevationCanvasScene(pts, {
      ...opts, width:dimensions.width, height:dimensions.height,
      axisLabel:t('elev.km'), campLabel:t('elev.anno.camp'),
      measureText:elevationCanvasRenderer.measureText,
    });
    _elevBarData = {
      pts, minE:scene.layout.minE, maxE:scene.layout.maxE, color:color || '#3F5238',
      km:scene.layout.km, PL:scene.layout.PL, PR:scene.layout.PR, pw:scene.layout.pw,
    };
    if(elevLabel) elevLabel.textContent = label || t('elev.title');
    updateElevBadges(scene.chart.badges);
    renderRuntimeStats.elevation = {sourcePoints:scene.sourcePoints, renderedPoints:scene.renderedPoints};
    drawElevBar._overflowRequest = scene.overflow;
    elevationCanvasRenderer.render(scene, dimensions);
  }

  function renderElevationChartNow() {
    if(!elevCanvas) return;
    // v1.20.0：无选中分组时不绘制
    const main = state.activeGroup == null ? null : DATA.trails.find(t => t.id === state.primaryTrailId);
    if(!main || !main.track || !main.track.length) {
      if(elevationCanvasRenderer) elevationCanvasRenderer.clear({
        width:elevCanvas.offsetWidth || 340,
        height:elevCanvas.offsetHeight || 140,
        dpr:window.devicePixelRatio || 1,
      });
      _elevBarData = null;
      renderRuntimeStats.elevation = {sourcePoints:0, renderedPoints:0};
      return;
    }

    const bar = document.getElementById('elev-bar');

    function doDraw() {
      if(measureState.active && measureState.ptA && measureState.ptB) {
        const i1 = Math.min(measureState.ptA.idx, measureState.ptB.idx);
        const i2 = Math.max(measureState.ptA.idx, measureState.ptB.idx);
        const reversed = measureState.ptA.idx > measureState.ptB.idx;
        let segPts = main.track.slice(i1, i2 + 1);
        if(reversed) segPts = segPts.slice().reverse();
        drawElevBar(segPts, '#3F5238', t('elev.measure'), {
          kmFromZero: true,
          trackBreaks:trackBreaksInRange(main.track_breaks, i1, i2, reversed),
          waypoints: main.waypoints,
          segIdxStart: i1, segIdxEnd: i2, reversed,
          measureMode: true,
        });
      } else if(dayPreviewState.active && dayPreviewState.trailId === main.id && dayPreviewState.iStart != null && dayPreviewState.iEnd != null) {
        const i1 = Math.min(dayPreviewState.iStart, dayPreviewState.iEnd);
        const i2 = Math.max(dayPreviewState.iStart, dayPreviewState.iEnd);
        const segPts = main.track.slice(i1, i2 + 1);
        drawElevBar(segPts, '#fbbf24', `D${dayPreviewState.day} · ${t('elev.measure')}`, {
          kmFromZero: true,
          trackBreaks:trackBreaksInRange(main.track_breaks, i1, i2, false),
          waypoints: main.waypoints,
          segIdxStart: i1, segIdxEnd: i2, reversed: false,
          measureMode: true,
        });
      } else {
        drawElevBar(main.track, main.color, (main.name || t('mini.primary')) + ' · ' + t('elev.title'), {
          trackBreaks:main.track_breaks,
          waypoints: main.waypoints,
          segIdxStart: 0, segIdxEnd: main.track.length - 1, reversed: false,
        });
      }
    }

    function currentElevStackContext() {
      let segPts = main.track;
      const layoutOpts = { width: elevCanvas.offsetWidth || 340, height: 140, trackBreaks:main.track_breaks };
      const annoOpts = {
        waypoints: main.waypoints,
        segIdxStart: 0,
        segIdxEnd: main.track.length - 1,
        reversed: false,
        measureMode: false,
      };
      if(measureState.active && measureState.ptA && measureState.ptB) {
        const i1 = Math.min(measureState.ptA.idx, measureState.ptB.idx);
        const i2 = Math.max(measureState.ptA.idx, measureState.ptB.idx);
        const reversed = measureState.ptA.idx > measureState.ptB.idx;
        segPts = main.track.slice(i1, i2 + 1);
        if(reversed) segPts = segPts.slice().reverse();
        layoutOpts.kmFromZero = true;
        layoutOpts.measureMode = true;
        layoutOpts.trackBreaks = trackBreaksInRange(main.track_breaks, i1, i2, reversed);
        Object.assign(annoOpts, { segIdxStart: i1, segIdxEnd: i2, reversed, measureMode: true });
      } else if(dayPreviewState.active && dayPreviewState.trailId === main.id && dayPreviewState.iStart != null && dayPreviewState.iEnd != null) {
        const i1 = Math.min(dayPreviewState.iStart, dayPreviewState.iEnd);
        const i2 = Math.max(dayPreviewState.iStart, dayPreviewState.iEnd);
        segPts = main.track.slice(i1, i2 + 1);
        layoutOpts.kmFromZero = true;
        layoutOpts.measureMode = true;
        layoutOpts.trackBreaks = trackBreaksInRange(main.track_breaks, i1, i2, false);
        Object.assign(annoOpts, { segIdxStart: i1, segIdxEnd: i2, reversed: false, measureMode: true });
      }
      return { segPts, layoutOpts, annoOpts };
    }

    // 计算目标高度：基础画布需求 + 堆叠层数 × (字高 + 间隔)
    const stackContext = currentElevStackContext();
    const targetH = HTM_APP.estimateElevationPanelHeightForPoints(stackContext.segPts, {
      ...stackContext.layoutOpts,
      ...stackContext.annoOpts,
      width:elevCanvas.offsetWidth || 340,
      campLabel:t('elev.anno.camp'),
      measureText:elevationCanvasRenderer ? elevationCanvasRenderer.measureText : undefined,
    });

    if(bar) {
      const cur = bar.offsetHeight;
      if(Math.abs(cur - targetH) > 2) {
        bar.style.height = targetH + 'px';
        void bar.offsetHeight; // 强制同步 reflow
      }
    }
    doDraw();
  }

  function refreshElevBar() {
    invalidateRender(HTM_APP.RENDER_DIRTY.CHART);
  }

  // hover：在海拔图上移动鼠标显示十字准线和数值
  if(elevCanvas) {
    elevCanvas.style.pointerEvents = 'auto';

    // 共用：根据鼠标 X 找到对应 track 点
    function elevHitTest(e) {
      if(!_elevBarData) return null;
      const rect = elevCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const PL = _elevBarData.PL != null ? _elevBarData.PL : 44;
      const PR = _elevBarData.PR != null ? _elevBarData.PR : 16;
      const pw = rect.width - PL - PR;
      if(mx < PL || mx > PL + pw) return null;
      const ratio = (mx - PL) / pw;
      const km = _elevBarData.km || [];
      const pts = _elevBarData.pts;
      if(!km.length || !pts.length) return null;
      // X 是按 km 等距映射，不是按 idx —— 二分定位 idx
      const kmStart = km[0], kmEnd = km[km.length - 1];
      const targetKm = kmStart + (kmEnd - kmStart) * ratio;
      let lo = 0, hi = km.length - 1;
      while(lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if(km[mid] < targetKm) lo = mid; else hi = mid;
      }
      const idx = (Math.abs(km[lo] - targetKm) < Math.abs(km[hi] - targetKm)) ? lo : hi;
      return { idx, pt: pts[idx], mx };
    }

    elevCanvas.addEventListener('mousemove', e => {
      const hit = elevHitTest(e);
      if(!hit) { elevCrosshair.style.display = 'none'; elevTip.style.display = 'none'; return; }
      const { pt, mx } = hit;
      elevCrosshair.style.display = 'block';
      elevCrosshair.style.left = mx + 'px';
      elevTip.style.display = 'block';
      const rect = elevCanvas.getBoundingClientRect();
      elevTip.style.left = Math.max(4, Math.min(mx + 8, rect.width - 210)) + 'px';
      elevTip.innerHTML = `<b>${pt[3] !== undefined ? pt[3] + 'km' : ''}</b> · ${pt[2]}m · ↑<b>${pt[4]}m</b><span class="elev-tip-coordinate">${formatTrackPointCoordinates(pt)}</span>`;
    });

    elevCanvas.addEventListener('mouseleave', () => {
      elevCrosshair.style.display = 'none';
      elevTip.style.display = 'none';
    });

    // 点击：无论是否测距模式，海拔图内点击 → 地图定位
    let _elevClickMarker = null;
    elevCanvas.addEventListener('click', e => {
      const hit = elevHitTest(e);
      if(!hit) return;
      const { pt } = hit;
      if(!pt || pt[0] == null) return;

      // 移除旧标记
      if(_elevClickMarker) {
        clearTimeout(_elevClickMarker._autoRemove);
        _elevClickMarker.remove();
        _elevClickMarker = null;
      }

      const latlng = [pt[0], pt[1]];
      const color = (_elevBarData && _elevBarData.color) || '#fbbf24';
      _elevClickMarker = L.circleMarker(latlng, {
        radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1,
        pane: 'tooltipPane'
      }).addTo(map);
      const tipTxt = `<b>${pt[3] !== undefined ? pt[3] + 'km · ' : ''}${Math.round(pt[2])}m</b><br><span class="track-point-coordinate">${formatTrackPointCoordinates(pt)}</span>`;
      _elevClickMarker.bindTooltip(tipTxt, { permanent: true, direction: 'top', offset: [0,-8], className: 'measure-tip' }).openTooltip();
      map.panTo(latlng, { animate: true, duration: 0.4 });

      clearTimeout(_elevClickMarker._autoRemove);
      _elevClickMarker._autoRemove = setTimeout(() => {
        if(_elevClickMarker) { _elevClickMarker.remove(); _elevClickMarker = null; }
      }, 8000);
    });
  }

  // window resize 时重绘
  window.addEventListener('resize', () => { if(_elevBarData) refreshElevBar(); });
  /* ============ Persistence (IndexedDB) ============ */
  const DB_NAME = 'hiking_trail_db';
  const STORE_NAME = 'trails';
  const DATA_KEY = 'main';
  let sandboxWarningShown = false;

  function handleStorageControllerEvent(event) {
    if(event.type === 'storage.saved') {
      showToast(`✓ 已自动保存（${event.trailCount} 条轨迹）`);
    } else if(event.type === 'storage.quota-exceeded') {
      showToast(`❌ 存储已满（${event.trailCount} 条轨迹）。请删除部分后重试`, 'error', 5000);
    } else if(event.type === 'storage.unavailable') {
      console.warn('storage unavailable:', event.error);
      if(!sandboxWarningShown) {
        sandboxWarningShown = true;
        const detail = event.error && event.error.message ? `：${event.error.message}` : '';
        showToast(`ℹ 当前环境不支持自动保存${detail}`, 'info', 5000);
      }
    } else if(event.type === 'storage.failed') {
      console.warn(`${event.operation} failed:`, event.error);
    }
  }

  const storageController = HTM_APP.createStorageController(runtimeContext, {
    openDatabase:() => HTM_APP.openIndexedDbDatabase(window.indexedDB, DB_NAME, 1, [STORE_NAME]),
    execute:HTM_APP.executeIndexedDbOperation,
    storeName:STORE_NAME,
    dataKey:DATA_KEY,
    onEvent:handleStorageControllerEvent,
  });

  function openDB() { return storageController.open(); }
  function saveToStorage() { storageController.scheduleSave(); }
  async function _doSave() { return storageController.flush(); }

  async function loadFromStorage() {
    const restored = await storageController.load(state.activeGroup);
    if(!restored) return false;
    try {
      DATA.trails = restored.trails;
      // 兼容旧数据：缺 descent_m 则现场补算
      DATA.trails.forEach(tr => {
        const segmentedMetrics = tr.track?.length && tr.track_breaks?.length
          ? computeSegmentedTrackMetrics(tr.track, tr.track_breaks, 10)
          : null;
        if(tr.stats && (tr.stats.descent_m === undefined || tr.stats.descent_m === null) && tr.track && tr.track.length) {
          const elevs = tr.track.map(p => p[2] || 0);
          const arr = segmentedMetrics?.cumulativeDescentM || accumulatorDescent(elevs, 10);
          tr.stats.descent_m = Math.round(arr[arr.length-1] || 0);
        }
        // 兼容旧数据：补算 _descCum
        if(!tr._descCum && tr.track && tr.track.length) {
          tr._descCum = segmentedMetrics?.cumulativeDescentM || accumulatorDescent(tr.track.map(p => p[2] || 0), 10);
        }
        // 兼容旧数据：escape_routes 为空则从 waypoints + track 重新推算（v1.12.3：默认关闭，仅 state.autoGenerateEscape=true 时启用）
        if(state.autoGenerateEscape && (!tr.escape_routes || tr.escape_routes.length === 0) && tr.waypoints && tr.track && tr.track.length) {
          const fakePts = tr.track.map(p => ({ lat: p[0], lng: p[1], elev: p[2] || 0 }));
          const others = DATA.trails.filter(t => t.id !== tr.id);
          tr.escape_routes = buildEscapeRoutes(tr.waypoints, fakePts, others);
        }
      });
      dispatchState({
        type:'workspace.restore',
        activeTrails:restored.activeTrails,
        activeGroup:restored.activeGroup,
        primaryByGroup:restored.primaryByGroup,
      });
      return true;
    } catch(e) {
      console.warn('load failed:', e);
      return false;
    }
  }

  async function clearStorage() {
    return storageController.clear();
  }

  /* ── 下载单条轨迹为 KML 文件 ── */
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

  const projectRuntimeController = HTM_APP.createProjectRuntimeController(runtimeContext, {
    files:browserFileAdapter,
    appVersion:APP_VERSION,
    getLanguage:() => currentLang === 'en' ? 'en' : 'zh',
    commitArchive:() => applyChange({fit:false}),
    resetArchiveView:() => {
      setMapMode(state.mode);
      return resetView({restoreActive:false});
    },
    persistHistory:saveToStorage,
    renderHistory:() => rebuildAll({fit:false}),
    beforeHistoryApply:() => {
      if(interactionManager.current.kind !== 'idle') interactionManager.cancel('history-apply');
      clearEscape();
    },
    notifyCommands:() => {
      commandRegistry.notifyChanged(STUDIO_COMMANDS.EDIT_UNDO);
      commandRegistry.notifyChanged(STUDIO_COMMANDS.EDIT_REDO);
    },
    notify:(message, type = 'info') => showToast(message, type),
  });
  const projectArchiveController = projectRuntimeController.archive;
  const projectHistoryController = projectRuntimeController.history;
  const historyLabel = projectRuntimeController.label;
  const recordProjectEdit = projectRuntimeController.recordEdit;
  const projectRestoreUi = projectRestoreBtn && projectFile && addStatus
    ? HTM_APP.bindProjectRestoreUi({
      button:projectRestoreBtn,
      input:projectFile,
      status:addStatus,
      dialogs:studioDialogs,
      archive:projectArchiveController,
      getLanguage:() => currentLang === 'en' ? 'en' : 'zh',
      beforeRestore:() => {
        if(interactionManager.current.kind !== 'idle') interactionManager.cancel('project-restore');
      },
      afterRestore:() => {
        if(_showTrackEl) _showTrackEl.checked = state.showTrack;
        if(_showLabelEl) _showLabelEl.checked = state.showLabel;
        if(_showHighPointEl) _showHighPointEl.checked = state.showHighPoint;
      },
      close:_closeAddModal,
    })
    : null;
  const restoreProjectFile = file => projectRestoreUi?.restoreFile(file) ?? Promise.resolve(false);

  function downloadTrailKML(id) {
    return fileExportController.downloadTrailKml(id);
  }
  const trailController = HTM_APP.createTrailController(runtimeContext, {
    haversine,
    accumulatorAscent,
    accumulatorDescent,
    markRevision:markTrailRevision,
    persist:saveToStorage,
    render:rebuildAll,
    clearStorage,
    notify:message => showToast(message),
  });

  function deleteTrail(id) {
    return recordProjectEdit('删除轨迹', 'Delete trail', () => trailController.deleteTrail(id));
  }

  function reverseTrail(id) {
    return recordProjectEdit('反向轨迹', 'Reverse trail', () => trailController.reverseTrail(id));
  }

  async function clearAllTrails() {
    if(!DATA.trails.length) return;
    const confirmed = await studioDialogs.confirm({
      title:currentLang === 'zh' ? '清空项目' : 'Clear project',
      message:currentLang === 'zh'
        ? `确定清除全部 ${DATA.trails.length} 条轨迹？可通过“编辑 → 撤销”恢复。`
        : `Clear all ${DATA.trails.length} trails? You can restore them with Edit → Undo.`,
      danger:true,
      confirmLabel:currentLang === 'zh' ? '全部清除' : 'Clear all',
      cancelLabel:currentLang === 'zh' ? '取消' : 'Cancel',
    });
    if(!confirmed) return false;
    return recordProjectEdit('清空项目', 'Clear project', () => trailController.clearTrails());
  }
  /* ============ Toast ============ */
  const toastController = createToastController({document, viewport:window});

  function showToast(msg, type='info', duration=2400) {
    return toastController.show(msg, type === 'error' ? 'error' : 'info', duration);
  }
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
        label: t('export.kmlZip'),
        desc: state.activeGroup
          ? (currentLang === 'zh'
            ? `当前组「${state.activeGroup}」叠加中 ${activeCount} 条 · 可跨设备一键导入`
            : `${activeCount} active trails in “${state.activeGroup}” · ready for cross-device import`)
          : (currentLang === 'zh' ? '未选中任何分组 · 请先切换到一个分组' : 'No group selected · select a group first'),
        disabled: activeCount === 0,
        handler: () => { popup.remove(); exportGroupKML(); },
      },
      {
        icon: '📄',
        label: t('export.itineraryMarkdown'),
        desc: currentLang === 'zh'
          ? '按天数、爬升、扎营点和下撤方案生成行程表'
          : 'Build an itinerary from days, ascent, camps, and escape routes',
        handler: () => { popup.remove(); exportItineraryMD(); },
      },
      {
        icon: '▣',
        label: t('export.projectArchive'),
        desc: t('export.projectArchiveDesc'),
        handler: () => { popup.remove(); void projectArchiveController.exportProject(); },
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
      const icon = document.createElement('span');
      const copy = document.createElement('div');
      const label = document.createElement('div');
      const description = document.createElement('div');
      icon.style.cssText = 'font-size:16px;line-height:1';
      copy.style.cssText = 'flex:1;min-width:0';
      label.style.cssText = 'font-weight:600;line-height:1.3';
      description.style.cssText = 'font-size:10.5px;color:var(--text-muted, #888);margin-top:2px;line-height:1.35';
      icon.textContent = item.icon;
      label.textContent = item.label;
      description.textContent = item.desc;
      copy.append(label, description);
      el.append(icon, copy);
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
  function renderSidebarNow() {
    buildTrailList();
    renderPrimaryCard();
    buildFilterGrid();
  }

  function renderDaysNow() {
    buildDaysTab();
  }

  function renderLegendNow() {
    buildLegend();
    buildWaypointModeTagGrid();
    if(typeof applyI18n === 'function') applyI18n();
  }

  function rebuildAll(opts={}) {
    // 主轨迹兜底（v1.20.0：无选中分组时不做兜底，保留 null；否则先在当前分组挑，找不到再跨分组）
    if(state.activeGroup != null && !state.primaryTrailId && DATA.trails.length) {
      const inGroup = DATA.trails.filter(t => trailGroup(t) === state.activeGroup);
      dispatchState({type:'primary-trail.set', trailId:(inGroup[0] || DATA.trails[0]).id});
    }
    revalidateRuntimeInteractionOwner();
    if(typeof clearDaySegmentPreview === 'function') clearDaySegmentPreview({silent:true});
    invalidateRender(
      HTM_APP.RENDER_DIRTY.TRACKS
      | HTM_APP.RENDER_DIRTY.MARKERS
      | HTM_APP.RENDER_DIRTY.SIDEBAR
      | HTM_APP.RENDER_DIRTY.DAYS
      | HTM_APP.RENDER_DIRTY.LEGEND
      | HTM_APP.RENDER_DIRTY.CHART,
    );
    // 自动定位（仅 fit=true 时）
    if(opts.fit && DATA.trails.length) {
      const allLatLngs = [];
      DATA.trails.forEach(t => t.track.forEach(p => allLatLngs.push([p[0], p[1]])));
      if(allLatLngs.length) {
        fitWorkspaceBounds(L.latLngBounds(allLatLngs), {padding:[40,40]}, {source:'rebuild'});
      }
    }
  }


  function findNearestIdx(pts, lat, lng) {
    let bestI = 0, bestD = Infinity;
    for(let i=0; i<pts.length; i++) {
      const d = haversine(lat, lng, pts[i].lat, pts[i].lng);
      if(d < bestD) { bestD = d; bestI = i; }
    }
    return bestI;
  }

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
    const tag = classifyWaypointTag(name);
    return [tag, tagIcons[tag] || '📍', tagColors[tag] || '#aaa'];
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

  function processTrack(pts, trackBreaks = []) {
    const elevs = pts.map(p => p.elev);
    const smoothE = smoothElev(elevs, 7);
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

    const track = pts.map((p, i) => [
      +p.lat.toFixed(6), +p.lng.toFixed(6),
      Math.round(smoothE[i]), 0,
      0, dayOfIdx[i],
    ]);
    const metrics = computeSegmentedTrackMetrics(track, trackBreaks, 10);
    track.forEach((point, index) => {
      point[3] = +(metrics.cumulativeDistanceM[index] / 1000).toFixed(2);
      point[4] = Math.round(metrics.cumulativeAscentM[index]);
    });
    return track;
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
        day: Number(camp.day) || Number(pts[campIdx].day) || undefined,
        direction: i_from > i_to ? 'reverse' : 'forward',
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
        camp_elev: Math.round(track[i_e][2] || 0),
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
    const { title, trackPoints, waypoints, trackBreaks } = parseKml(xmlText);
    if(trackPoints.length === 0) return null;

    const track = processTrack(trackPoints, trackBreaks);
    const enrichedWps = enrichWaypoints(waypoints, trackPoints)
      .filter(w => w.name)
      .map(w => {
        const point = track[w.gps_idx] || [];
        return {
          ...w,
          km:Number.parseFloat(Number(point[3] || 0).toFixed(1)),
          day:Number(point[5]) || 1,
        };
      });
    const escapeRoutes = state.autoGenerateEscape
      ? buildEscapeRoutes(enrichedWps, trackPoints, DATA.trails)
      : [];

    const segmentedMetrics = computeSegmentedTrackMetrics(track, trackBreaks, 10);
    const cumD = segmentedMetrics.cumulativeDistanceM;
    const dayMeta = buildDayMeta(trackPoints, track, enrichedWps, cumD);
    return {
      id: generateNextTrailId(),
      name: title,
      source: '',
      color: '#f97316',
      days: dayMeta.length,
      stats: segmentedMetrics.stats,
      day_meta: dayMeta,
      track,
      track_breaks:trackBreaks,
      _descCum: segmentedMetrics.cumulativeDescentM,
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
  /* ============ Boot ============ */

  function schedulePostRestoreReset() {
    return new Promise(resolve => {
      let completed = false;
      const run = async () => {
        if(completed) return;
        completed = true;
        if(map && typeof map.invalidateSize === 'function') map.invalidateSize({pan:false});
        const resetPerformed = typeof resetView === 'function';
        if(resetPerformed) await resetView({restoreActive: true});
        resolve(resetPerformed);
      };
      const afterMapReady = () => requestAnimationFrame(() => {
        requestAnimationFrame(() => setTimeout(run, 120));
      });
      if(map && typeof map.whenReady === 'function') map.whenReady(afterMapReady);
      else afterMapReady();
      // Background tabs may throttle animation frames; this remains a one-shot fallback.
      setTimeout(run, 600);
    });
  }

  // 启动时如果没内嵌数据，尝试从 IndexedDB 恢复（async）
  async function _boot() {
    let restored = false;
    if(DATA.trails.length === 0 && !window.__exportedMap) {
      const ok = await loadFromStorage();
      if(ok) {
        showToast(`✓ 从浏览器恢复 ${DATA.trails.length} 条轨迹`);
        restored = true;
      }
    }
    // 防御性兜底：保证 activeTrails 至少包含全部已加载轨迹
    if(DATA.trails.length && (!state.activeTrails || state.activeTrails.size === 0)) {
      dispatchState({type:'active-trails.replace', trailIds:DATA.trails.map(t => t.id)});
    }
    // 每次打开工作台都进入一个有效轨迹组；缓存中的“无分组”仅保留在当前会话。
    if(DATA.trails.length && (state.activeGroup == null
        || !DATA.trails.some(trail => trailGroup(trail) === state.activeGroup))) {
      dispatchState({type:'group.set-active', group:trailGroup(DATA.trails[0])});
    }
    // 兜底主轨迹
    // v1.21.0：兜底选当前组内的第一条（而不是 DATA.trails[0]，可能不在当前组）
    if(state.activeGroup != null && !state.primaryTrailId && DATA.trails.length) {
      const inGroup = DATA.trails.filter(t => trailGroup(t) === state.activeGroup);
      dispatchState({type:'primary-trail.set', trailId:(inGroup[0] || DATA.trails[0]).id});
    }
    dispatchState({type:'mode.set', mode:'elev'});
    document.querySelectorAll('[data-mode]').forEach(control => {
      const active = control.dataset.mode === 'elev';
      control.classList.toggle('on', active);
      control.setAttribute('aria-pressed', String(active));
    });
    activateSidebarTab('trails');
    // 无论是否从 storage 恢复，都做一次 rebuildAll 以保证 UI/绘制/视野一致
    rebuildAll({fit: !restored});
    // 若处于标注点模式，确保面板显示
    const _wpPanel = document.getElementById('waypoint-mode-tags');
    if(_wpPanel) _wpPanel.style.display = state.mode === 'waypoint' ? 'block' : 'none';
    // v1.31.0：从 IndexedDB 恢复的场景，rebuildAll 里的 fit 可能被后续绑定/UI 覆盖，
    //         这里显式再做一次 resetView，保证视野贴到主轨迹上
    const resetPerformed = restored ? await schedulePostRestoreReset() : false;
    commandRegistry.notifyChanged();
    return {restored, resetPerformed};
  }
  window.__HTM_BOOT_READY__ = _boot();
  applyI18n();
  const appTitle = document.getElementById('app-title');
  if(appTitle) {
    appTitle.dataset.commandId = STUDIO_COMMANDS.APP_RENAME;
    appTitle.addEventListener('dblclick', () => dispatchStudioCommand(STUDIO_COMMANDS.APP_RENAME));
    try { const s = localStorage.getItem('hiking_title'); if(s) { appTitle.textContent = s; document.title = s; } } catch(e) {}
  }
  const langBtn = document.getElementById('lang-btn');
  if(langBtn) {
    langBtn.textContent = currentLang === 'zh' ? '🌐 EN' : '🌐 中';
  }
  const storageBtn = document.getElementById('storage-btn');
  if(storageBtn) storageBtn.addEventListener('click', showStorageInfo);

  /**
   * "复位"：把地图视野归一到当前组的主轨迹（或所有 active 轨迹的 bounds）。
   * v1.22.0 抽出，供复位按钮 / 导入 / 切换分组共用。
   * @param {Object} [opts]
   * @param {boolean} [opts.restoreActive=false] 是否把 activeTrails 补齐为所有 trail（复位按钮用）
   * @param {boolean} [opts.gesture=false] 是否按当前与目标缩放级差执行平滑复位
   */
  function cachedTrailBounds(trail) {
    const track = trail && trail.track;
    if(!track || !track.length) return null;
    const revision = runtimeTrailRevision(trail);
    const cached = trailBoundsCache.get(trail);
    if(cached && cached.track === track && cached.revision === revision) return cached.bounds;

    const bounds = L.latLngBounds([]);
    for(const point of track) {
      if(Number.isFinite(point[0]) && Number.isFinite(point[1])) bounds.extend([point[0], point[1]]);
    }
    if(!bounds.isValid()) return null;
    trailBoundsCache.set(trail, {track, revision, bounds});
    return bounds;
  }

  function resetView(opts = {}) {
    const resetEpoch = ++workspaceResetEpoch;
    renderRuntimeStats.fit.lastResetEpoch = resetEpoch;
    if(map && typeof map.stop === 'function') map.stop();
    let stateChanged = false;
    if(opts.restoreActive && (!state.activeTrails || state.activeTrails.size === 0)) {
      dispatchState({type:'active-trails.replace', trailIds:DATA.trails.map(t => t.id)});
      stateChanged = true;
    }
    // 兜底主轨迹（当前组内）
    if(state.activeGroup != null && !state.primaryTrailId && DATA.trails.length) {
      const inGroup = DATA.trails.filter(t => trailGroup(t) === state.activeGroup);
      dispatchState({type:'primary-trail.set', trailId:(inGroup[0] || DATA.trails[0]).id});
      stateChanged = true;
    }
    if(stateChanged) {
      invalidateRender(
        HTM_APP.RENDER_DIRTY.TRACKS
        | HTM_APP.RENDER_DIRTY.MARKERS
        | HTM_APP.RENDER_DIRTY.SIDEBAR
        | HTM_APP.RENDER_DIRTY.LEGEND
        | HTM_APP.RENDER_DIRTY.CHART,
      );
    }

    // v1.24.0：测距模式下，若已选中段（A+B），复位到该段
    if(typeof measureState !== 'undefined' && measureState.active && measureState.ptA && measureState.ptB) {
      const main = DATA.trails.find(t => t.id === state.primaryTrailId);
      if(main && main.track) {
        const i1 = Math.min(measureState.ptA.idx, measureState.ptB.idx);
        const i2 = Math.max(measureState.ptA.idx, measureState.ptB.idx);
        const segLL = buildTrackLatLngs(main.track, i1, i2, 1600);
        if(segLL.length >= 2) {
          const fitPromise = fitWorkspaceBounds(
            L.latLngBounds(segLL),
            {padding:[60,60]},
            {source:'reset-measure', resetEpoch, gesture:Boolean(opts.gesture)},
          );
          if(stateChanged) saveToStorage();
          return fitPromise;
        }
      }
    }

    // 计算 fit 目标：优先主轨迹，其次当前组所有 active 轨迹
    const main = state.activeGroup == null ? null : DATA.trails.find(t => t.id === state.primaryTrailId);
    if(main && main.track && main.track.length) {
      const bounds = cachedTrailBounds(main);
      if(!bounds) return Promise.resolve(false);
      const fitPromise = fitWorkspaceBounds(
        bounds,
        {padding:[40,40]},
        {source:'reset-primary', resetEpoch, gesture:Boolean(opts.gesture)},
      );
      if(stateChanged) saveToStorage();
      return fitPromise;
    } else {
      const bounds = L.latLngBounds([]);
      DATA.trails.forEach(t => {
        const trailBounds = isTrailActive(t) ? cachedTrailBounds(t) : null;
        if(trailBounds) bounds.extend(trailBounds);
      });
      if(bounds.isValid()) {
        const fitPromise = fitWorkspaceBounds(
          bounds,
          {padding:[40,40]},
          {source:'reset-active', resetEpoch, gesture:Boolean(opts.gesture)},
        );
        if(stateChanged) saveToStorage();
        return fitPromise;
      }
    }
    if(stateChanged) saveToStorage();
    return Promise.resolve(false);
  }

  function finishWorkspaceFit(epoch, applied) {
    if(!pendingWorkspaceFit || pendingWorkspaceFit.epoch !== epoch) return;
    const pending = pendingWorkspaceFit;
    pendingWorkspaceFit = null;
    if(applied) renderRuntimeStats.fit.applied += 1;
    pending.resolve(applied);
  }

  function executeWorkspaceFit(context) {
    const request = context.request;
    if(!request) return;
    const isCurrent = () => context.isCurrent()
      && (request.resetEpoch == null || request.resetEpoch === workspaceResetEpoch);
    if(!isCurrent()) {
      finishWorkspaceFit(context.epoch, false);
      return;
    }
    const applyFit = () => {
      if(request.closeOverlay) map.invalidateSize({pan:false, animate:false});
      const targetZoom = map.getBoundsZoom(request.bounds, false, L.point(80, 80));
      const transition = HTM_CORE.planResetTransition({
        gesture:request.gesture,
        currentZoom:map.getZoom(),
        targetZoom,
        reducedMotion:prefersReducedMotion,
      });
      const fitOptions = {...request.options, ...transition};
      map.fitBounds(request.bounds, fitOptions);
    };
    if(!request.closeOverlay) {
      applyFit();
      finishWorkspaceFit(context.epoch, true);
      return;
    }
    setTimeout(() => {
      if(!isCurrent()) {
        finishWorkspaceFit(context.epoch, false);
        return;
      }
      applyFit();
      finishWorkspaceFit(context.epoch, true);
    }, 120);
  }

  function fitWorkspaceBounds(bounds, options = {}, meta = {}) {
    if(!bounds || !map) return Promise.resolve(false);
    const sidebar = document.getElementById('sidebar');
    const sidebarCollapsed = !sidebar || sidebar.classList.contains('collapsed');
    const closeOverlay = HTM_APP.shouldCloseSidebarForFit(window.innerWidth, sidebarCollapsed);
    if(closeOverlay && typeof toggleSidebar === 'function') toggleSidebar(false);

    if(pendingWorkspaceFit) {
      renderRuntimeStats.fit.superseded += 1;
      pendingWorkspaceFit.resolve(false);
      pendingWorkspaceFit = null;
    }
    let resolveFit;
    const promise = new Promise(resolve => { resolveFit = resolve; });
    const epoch = renderScheduler.requestFit({
      bounds,
      options,
      closeOverlay,
      gesture:Boolean(meta.gesture),
      resetEpoch:meta.resetEpoch ?? null,
      source:meta.source || 'workspace',
    });
    if(epoch == null) {
      resolveFit(false);
      return promise;
    }
    pendingWorkspaceFit = {epoch, resolve:resolveFit};
    renderRuntimeStats.fit.requested += 1;
    renderRuntimeStats.fit.lastEpoch = epoch;
    return promise;
  }

  // Sidebar collapse
  const _sidebar = document.getElementById('sidebar');
  const _sbClose = document.getElementById('sidebar-close');
  function toggleSidebar(open) {
    if(open === undefined) open = _sidebar.classList.contains('collapsed');
    if(open) {
      _sidebar.classList.remove('collapsed');
    } else {
      _sidebar.classList.add('collapsed');
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

  function readWaypointPhoto(file) {
    return new Promise((resolve, reject) => {
      if(!file) { resolve(''); return; }
      const allowedTypes = new Set(['image/png','image/jpeg','image/gif','image/webp','image/avif']);
      if(!allowedTypes.has(file.type.toLowerCase())) {
        reject(new Error(currentLang === 'zh' ? '请选择 PNG、JPEG、GIF、WebP 或 AVIF 图片' : 'Choose a PNG, JPEG, GIF, WebP, or AVIF image'));
        return;
      }
      if(file.size > 5 * 1024 * 1024) {
        reject(new Error(currentLang === 'zh' ? '图片不能超过 5 MB' : 'Image must be 5 MB or smaller'));
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(typeof reader.result === 'string' ? reader.result : ''));
      reader.addEventListener('error', () => reject(new Error(currentLang === 'zh' ? '图片读取失败' : 'Could not read image')));
      reader.readAsDataURL(file);
    });
  }

  function openWaypointEditorDialog() {
    const isZh = currentLang === 'zh';
    return studioDialogs.openCustom({
      title:isZh ? '新增标注点' : 'Add waypoint',
      size:'wide',
      initialFocus:'#manual-waypoint-name',
      render:({form, body, actions, close, cancel}) => {
        const createField = (labelText, control) => {
          const label = document.createElement('label');
          label.className = 'workbench-dialog__field';
          const caption = document.createElement('span');
          caption.className = 'workbench-dialog__label';
          caption.textContent = labelText;
          label.append(caption, control);
          body.append(label);
        };

        const name = document.createElement('input');
        name.id = 'manual-waypoint-name';
        name.className = 'workbench-dialog__input';
        name.type = 'text';
        name.required = true;
        name.maxLength = 80;
        name.placeholder = isZh ? '例如：营地、水源、岔路口' : 'For example: camp, water, junction';
        createField(isZh ? '名称' : 'Name', name);

        const tag = document.createElement('select');
        tag.id = 'manual-waypoint-tag';
        tag.className = 'workbench-dialog__input workbench-dialog__select waypoint-type-select';
        ['other','camp','water','supply','pass','fork','warn','shelter','village','bridge','river','start','end'].forEach(value => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = t('tag.'+value) || value;
          tag.append(option);
        });
        tag.value = 'other';
        const tagControl = document.createElement('div');
        tagControl.className = 'waypoint-type-select-control';
        const tagPreview = document.createElement('span');
        tagPreview.className = 'waypoint-type-select-preview';
        tagPreview.setAttribute('aria-hidden', 'true');
        const updateTagPreview = () => {
          tagPreview.style.color = tagColors[tag.value] || '#64748b';
          tagPreview.innerHTML = waypointIconMarkup(tag.value);
        };
        tag.addEventListener('change', updateTagPreview);
        tagControl.append(tagPreview, tag);
        createField(isZh ? '图标与类型' : 'Icon and type', tagControl);
        updateTagPreview();

        const description = document.createElement('textarea');
        description.id = 'manual-waypoint-description';
        description.className = 'workbench-dialog__input workbench-dialog__textarea';
        description.maxLength = 500;
        description.placeholder = isZh ? '可选：路况、补给、注意事项等' : 'Optional: conditions, supplies, notes';
        createField(isZh ? '文字描述（可选）' : 'Description (optional)', description);

        const photo = document.createElement('input');
        photo.id = 'manual-waypoint-photo';
        photo.className = 'workbench-dialog__file';
        photo.type = 'file';
        photo.accept = 'image/*';
        const preview = document.createElement('img');
        preview.className = 'workbench-dialog__image-preview';
        preview.alt = isZh ? '图片预览' : 'Image preview';
        preview.hidden = true;
        const photoWrap = document.createElement('div');
        photoWrap.className = 'workbench-dialog__photo-field';
        photoWrap.append(photo, preview);
        createField(isZh ? '图片（可选，最大 5 MB）' : 'Image (optional, 5 MB max)', photoWrap);

        const error = document.createElement('p');
        error.className = 'workbench-dialog__error';
        error.setAttribute('role', 'alert');
        body.append(error);
        let photoData = '';
        let photoRead = Promise.resolve('');
        photo.addEventListener('change', () => {
          error.textContent = '';
          photoData = '';
          preview.hidden = true;
          photoRead = readWaypointPhoto(photo.files && photo.files[0]).then(data => {
            photoData = data;
            if(data) { preview.src = data; preview.hidden = false; }
            return data;
          }).catch(readError => {
            photo.value = '';
            error.textContent = readError.message;
            return '';
          });
        });

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'workbench-dialog__button';
        cancelButton.textContent = isZh ? '取消' : 'Cancel';
        cancelButton.addEventListener('click', cancel);
        const addButton = document.createElement('button');
        addButton.type = 'submit';
        addButton.className = 'workbench-dialog__button workbench-dialog__button--primary';
        addButton.textContent = isZh ? '添加标注点' : 'Add waypoint';
        actions.append(cancelButton, addButton);

        form.addEventListener('submit', event => {
          event.preventDefault();
          const cleanName = name.value.trim();
          if(!cleanName) {
            error.textContent = isZh ? '请输入标注点名称' : 'Enter a waypoint name';
            name.setAttribute('aria-invalid', 'true');
            name.focus();
            return;
          }
          addButton.disabled = true;
          void photoRead.then(() => close({
            name:cleanName,
            tag:tag.value,
            description:description.value.trim(),
            photo:photoData,
          }));
        });
        name.addEventListener('input', () => { error.textContent = ''; name.removeAttribute('aria-invalid'); });
      },
    });
  }

  async function addManualWaypointAt(latlng, opts = {}) {
    const { requireNear = false, isCurrent = null } = opts;
    const anchor = findWaypointAnchorOnPrimary(latlng, requireNear);
    if(!anchor) {
      showToast('请点击主轨迹附近（200m 内）', 'error');
      return false;
    }
    const main = anchor.trail;
    const input = await openWaypointEditorDialog();
    if(!input) return false;
    if(typeof isCurrent === 'function' && !isCurrent()) return false;
    return !!recordProjectEdit('添加标注点', 'Add waypoint', () => waypointController.addManualWaypoint({
      trailId:main.id,
      trackIndex:anchor.idx,
      point:anchor.point,
    }, input));
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
  function hasPrimaryTrail() {
    const trail = DATA.trails.find(item => item.id === state.primaryTrailId);
    return Boolean(trail && trail.track && trail.track.length);
  }

  async function toggleMeasureCommand() {
    if(interactionManager.current.kind === 'stitch' && !await requestStitchExit()) return false;
    if(interactionManager.current.kind === 'segment' && !await requestSegmentExit('switch-measure')) return false;
    if(interactionManager.current.kind === 'measure') measureExit();
    else measureEnter();
    return true;
  }

  async function toggleSegmentCommand() {
    if(interactionManager.current.kind === 'stitch' && !await requestStitchExit()) return false;
    if(interactionManager.current.kind === 'segment') return requestSegmentExit('toggle');
    else segmentEnter();
    return true;
  }

  async function toggleWaypointCommand() {
    if(interactionManager.current.kind === 'stitch' && !await requestStitchExit()) return false;
    if(interactionManager.current.kind === 'segment' && !await requestSegmentExit('switch-waypoint')) return false;
    if(interactionManager.current.kind === 'waypoint') exitAddWaypointMode();
    else enterAddWaypointMode();
    return true;
  }

  async function toggleEscapeCommand() {
    if(interactionManager.current.kind === 'stitch' && !await requestStitchExit()) return false;
    if(interactionManager.current.kind === 'segment' && !await requestSegmentExit('switch-escape')) return false;
    if(interactionManager.current.kind === 'escape') addEscapeExit();
    else addEscapeEnter();
    return true;
  }

  let stitchPartSequence = 0;

  function createStitchDraftPart(trail) {
    return {
      id:`stitch-part-${++stitchPartSequence}`,
      trail,
      startIndex:0,
      endIndex:Math.max(1, trail.track.length - 1),
      reversed:false,
    };
  }

  function stitchPartEndpointIndex(part, label) {
    if(label === 'A') return part.reversed ? part.endIndex : part.startIndex;
    return part.reversed ? part.startIndex : part.endIndex;
  }

  function stitchPartEndpoint(part, label) {
    return part.trail.track[stitchPartEndpointIndex(part, label)];
  }

  function stitchPartDistanceKm(part) {
    const start = part.trail.track[part.startIndex];
    const end = part.trail.track[part.endIndex];
    if(Number.isFinite(start?.[3]) && Number.isFinite(end?.[3])) {
      return Math.max(0, Number(end[3]) - Number(start[3]));
    }
    let distanceM = 0;
    const breakSet = new Set(part.trail.track_breaks || []);
    for(let index = part.startIndex + 1; index <= part.endIndex; index += 1) {
      if(!breakSet.has(index)) {
        const previous = part.trail.track[index - 1];
        const point = part.trail.track[index];
        distanceM += haversine(previous[0], previous[1], point[0], point[1]);
      }
    }
    return distanceM / 1000;
  }

  function stitchDraftJunctions() {
    const junctions = [];
    for(let index = 1; index < stitchState.parts.length; index += 1) {
      const previous = stitchState.parts[index - 1];
      const current = stitchState.parts[index];
      const from = stitchPartEndpoint(previous, 'B');
      const to = stitchPartEndpoint(current, 'A');
      if(!from || !to) continue;
      const distanceM = haversine(from[0], from[1], to[0], to[1]);
      junctions.push({index, distanceM, connected:distanceM <= 5, from, to});
    }
    return junctions;
  }

  function applyStitchEndpoint(part, label, hit) {
    if(!part || !hit || !Number.isInteger(hit.idx)) return false;
    const last = part.trail.track.length - 1;
    const index = Math.max(0, Math.min(last, hit.idx));
    if(label === 'A') {
      if(part.reversed) part.endIndex = Math.max(part.startIndex + 1, index);
      else part.startIndex = Math.min(part.endIndex - 1, index);
    } else if(part.reversed) part.startIndex = Math.min(part.endIndex - 1, index);
    else part.endIndex = Math.max(part.startIndex + 1, index);
    stitchState.dirty = true;
    return true;
  }

  function stitchEndpointKey(part, label) {
    return `${part.id}:${label}`;
  }

  function buildStitchEndpointOffsets(parts) {
    const entries = parts.flatMap((part, index) => ['A','B'].map(label => ({
      key:stitchEndpointKey(part, label),
      index,
      point:stitchPartEndpoint(part, label),
    }))).filter(entry => entry.point);
    const offsets = new Map(entries.map(entry => [entry.key, {x:0, y:0}]));
    const assigned = new Set();
    for(const entry of entries) {
      if(assigned.has(entry.key)) continue;
      const group = entries.filter(candidate => !assigned.has(candidate.key)
        && haversine(entry.point[0], entry.point[1], candidate.point[0], candidate.point[1]) <= 20);
      group.forEach(candidate => assigned.add(candidate.key));
      if(group.length < 2) continue;
      const radius = group.length === 2 ? 26 : 32;
      group.sort((left, right) => left.index - right.index || left.key.localeCompare(right.key));
      group.forEach((candidate, groupIndex) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * groupIndex / group.length);
        offsets.set(candidate.key, {
          x:Math.round(Math.cos(angle) * radius),
          y:Math.round(Math.sin(angle) * radius),
        });
      });
    }
    return offsets;
  }

  function stitchEndpointIcon(label, color, order, isSelected, offset = {x:0, y:0}) {
    return L.divIcon({
      className:'',
      html:`<div class="stitch-endpoint-marker${isSelected ? ' is-active' : ''}" style="--stitch-color:${color};--stitch-offset-x:${offset.x}px;--stitch-offset-y:${offset.y}px">${order}${label}</div>`,
      iconSize:[44,44],
      iconAnchor:[22,22],
    });
  }

  function applyStitchSelection(partId) {
    stitchState.selectedPartId = partId;
    document.querySelectorAll('.stitch-part-card').forEach(card => {
      card.classList.toggle('is-active', card.dataset.partId === partId);
    });
    stitchLayer.eachLayer(layer => {
      if(!layer._stitchPartId) return;
      const active = layer._stitchPartId === partId;
      if(layer._stitchRole === 'source' && layer.setStyle) {
        layer.setStyle({weight:active ? 3 : 2, opacity:active ? .42 : .1});
      } else if(layer._stitchRole === 'halo' && layer.setStyle) {
        layer.setStyle({weight:active ? 13 : 8, opacity:active ? .72 : 0});
        if(active && layer.bringToFront) layer.bringToFront();
      } else if(layer._stitchRole === 'selection' && layer.setStyle) {
        layer.setStyle({weight:active ? 8 : 3.5, opacity:active ? 1 : .3});
        if(active && layer.bringToFront) layer.bringToFront();
      } else if(layer._stitchRole === 'endpoint') {
        if(layer.setOpacity) layer.setOpacity(active ? 1 : .78);
        if(layer.setZIndexOffset) layer.setZIndexOffset(active ? 3000 : 700 + (layer._stitchOrder || 0));
        layer._icon?.querySelector('.stitch-endpoint-marker')?.classList.toggle('is-active', active);
      }
    });
  }

  function renderStitchMap() {
    stitchLayer.clearLayers();
    if(!stitchState.active) return;
    const endpointPaneName = 'stitch-endpoints';
    const endpointPane = map.getPane(endpointPaneName) || map.createPane(endpointPaneName);
    endpointPane.style.zIndex = '760';
    const junctions = stitchDraftJunctions();
    const endpointOffsets = buildStitchEndpointOffsets(stitchState.parts);
    const renderParts = stitchState.parts
      .map((part, index) => ({part, index}))
      .sort((left, right) => Number(left.part.id === stitchState.selectedPartId) - Number(right.part.id === stitchState.selectedPartId));
    renderParts.forEach(({part, index}) => {
      const color = stitchPalette[index % stitchPalette.length];
      const isSelected = part.id === stitchState.selectedPartId;
      const sourcePaths = splitTrackByBreaks(part.trail.track, part.trail.track_breaks)
        .map(segment => segment.map(point => [point[0], point[1]]));
      const sourceLine = L.polyline(sourcePaths, {
        color, weight:isSelected ? 3 : 2, opacity:isSelected ? .42 : .1,
        dashArray:'4,7', interactive:false,
      }).addTo(stitchLayer);
      sourceLine._stitchPartId = part.id;
      sourceLine._stitchRole = 'source';

      const selectedPaths = buildTrackLatLngSegments(
        part.trail.track,
        part.startIndex,
        part.endIndex,
        part.trail.track_breaks,
        1400,
      );
      const haloLine = L.polyline(selectedPaths, {
        color:'#FFFFFF', weight:isSelected ? 13 : 8, opacity:isSelected ? .72 : 0,
        lineCap:'round', lineJoin:'round', interactive:false,
      }).addTo(stitchLayer);
      haloLine._stitchPartId = part.id;
      haloLine._stitchRole = 'halo';
      const selectedLine = L.polyline(selectedPaths, {
        color, weight:isSelected ? 8 : 3.5, opacity:isSelected ? 1 : .3,
        lineCap:'round', lineJoin:'round', interactive:true,
      }).addTo(stitchLayer);
      selectedLine._stitchPartId = part.id;
      selectedLine._stitchRole = 'selection';
      selectedLine.bindTooltip(`${index + 1}. ${escapeUiText(part.trail.name)}`, {sticky:true});
      selectedLine.on('click', event => {
        if(event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
        stitchState.selectedPartId = part.id;
        renderStitchWorkbench();
      });
      if(L.polylineDecorator && L.Symbol?.arrowHead) {
        L.polylineDecorator(selectedLine, {
          patterns:[{
            offset:'12%', repeat:'24%',
            symbol:L.Symbol.arrowHead({pixelSize:7, polygon:false, pathOptions:{color, weight:2, opacity:.9}}),
          }],
        }).addTo(stitchLayer);
      }

      for(const label of ['A','B']) {
        const point = stitchPartEndpoint(part, label);
        if(!point) continue;
        const snapGuide = L.polyline([], {
          color, weight:2, opacity:0, dashArray:'3,6', interactive:false,
        }).addTo(stitchLayer);
        snapGuide._stitchPartId = part.id;
        snapGuide._stitchRole = 'snap-guide';
        const snapTarget = L.circleMarker([point[0], point[1]], {
          radius:9, color:'#FFFFFF', weight:3, opacity:0,
          fillColor:color, fillOpacity:0, interactive:false,
        }).addTo(stitchLayer);
        snapTarget._stitchPartId = part.id;
        snapTarget._stitchRole = 'snap-target';
        const marker = L.marker([point[0], point[1]], {
          draggable:true, autoPan:true,
          pane:endpointPaneName,
          icon:stitchEndpointIcon(label, color, index + 1, isSelected, endpointOffsets.get(stitchEndpointKey(part, label))),
          zIndexOffset:isSelected ? 3000 : 700 + index,
        }).addTo(stitchLayer);
        marker._stitchPartId = part.id;
        marker._stitchRole = 'endpoint';
        marker._stitchEndpoint = label;
        marker._stitchOrder = index;
        marker.setOpacity(isSelected ? 1 : .78);
        marker.bindTooltip(`${index + 1}${label} · ${escapeUiText(part.trail.name)}`, {direction:'top', offset:[0,-16]});
        const snapper = createPrimaryTrackDragSnapper(marker, {
          trail:part.trail,
          getCenterIdx:() => stitchPartEndpointIndex(part, label),
          globalSearch:true,
          snapMarker:false,
          scheduleFrame:callback => scheduleRuntimeInteractionFrame('stitch', callback),
          onSnap:(hit, pointer) => {
            snapTarget.setLatLng([hit.point[0], hit.point[1]]);
            snapTarget.setStyle({opacity:1, fillOpacity:.24});
            snapGuide.setLatLngs([[pointer.lat, pointer.lng], [hit.point[0], hit.point[1]]]);
            snapGuide.setStyle({opacity:.78});
          },
        });
        marker.on('dragstart', () => {
          applyStitchSelection(part.id);
          marker._icon?.querySelector('.stitch-endpoint-marker')?.classList.add('is-dragging');
          dispatchRuntimeInteraction('stitch', {type:'drag-start', partId:part.id, endpoint:label});
        });
        marker.on('drag', event => snapper.schedule(event));
        marker.on('dragend', event => {
          const hit = snapper.resolve(event.target.getLatLng());
          snapper.cancel();
          marker._icon?.querySelector('.stitch-endpoint-marker')?.classList.remove('is-dragging');
          dispatchRuntimeInteraction('stitch', {type:'drag-end', partId:part.id, endpoint:label, hit});
        });
        marker.on('click', event => {
          if(event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
          stitchState.selectedPartId = part.id;
          renderStitchWorkbench();
        });
      }
    });

    junctions.forEach(junction => {
      if(junction.connected) return;
      L.polyline(
        [[junction.from[0], junction.from[1]], [junction.to[0], junction.to[1]]],
        {color:'#A66A17', weight:2, opacity:.7, dashArray:'3,8', interactive:true},
      ).bindTooltip(
        currentLang === 'zh'
          ? `断点 ${Math.round(junction.distanceM)} m（不计入里程）`
          : `Gap ${Math.round(junction.distanceM)} m (excluded)`,
        {sticky:true},
      ).addTo(stitchLayer);
    });
  }

  function stitchActionButton(label, title, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stitch-part-action';
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.addEventListener('click', event => {
      event.stopPropagation();
      action();
    });
    return button;
  }

  function moveStitchPart(partId, direction) {
    const index = stitchState.parts.findIndex(part => part.id === partId);
    const target = index + direction;
    if(index < 0 || target < 0 || target >= stitchState.parts.length) return;
    const [part] = stitchState.parts.splice(index, 1);
    stitchState.parts.splice(target, 0, part);
    stitchState.dirty = true;
    renderStitchWorkbench();
  }

  function renderStitchPanel() {
    const panel = document.getElementById('stitch-panel');
    const list = document.getElementById('stitch-parts');
    const summary = document.getElementById('stitch-summary');
    if(!panel || !list || !summary) return;
    panel.classList.toggle('is-open', stitchState.active);
    if(!stitchState.active) return;
    list.replaceChildren();
    const junctions = stitchDraftJunctions();
    const gapByIndex = new Map(junctions.filter(item => !item.connected).map(item => [item.index, item]));
    stitchState.parts.forEach((part, index) => {
      const color = stitchPalette[index % stitchPalette.length];
      const card = document.createElement('article');
      card.className = 'stitch-part-card';
      card.classList.toggle('is-active', part.id === stitchState.selectedPartId);
      card.style.setProperty('--stitch-color', color);
      card.draggable = true;
      card.dataset.partId = part.id;
      const order = document.createElement('span');
      order.className = 'stitch-part-order';
      order.textContent = String(index + 1);
      const copy = document.createElement('div');
      copy.className = 'stitch-part-copy';
      const title = document.createElement('strong');
      title.textContent = `${currentLang === 'zh' ? '片段' : 'Part'} ${index + 1} · ${part.trail.name}`;
      const meta = document.createElement('small');
      meta.textContent = `${part.reversed ? 'B → A' : 'A → B'} · ${stitchPartDistanceKm(part).toFixed(2)} km · ${part.startIndex}–${part.endIndex}`;
      copy.append(title, meta);
      if(part.id === stitchState.selectedPartId) {
        const editing = document.createElement('span');
        editing.className = 'stitch-part-editing';
        editing.textContent = currentLang === 'zh' ? '正在调整' : 'Editing';
        copy.append(editing);
      }
      const actions = document.createElement('div');
      actions.className = 'stitch-part-actions';
      actions.append(
        stitchActionButton('↑', currentLang === 'zh' ? '上移' : 'Move up', () => moveStitchPart(part.id, -1)),
        stitchActionButton('↓', currentLang === 'zh' ? '下移' : 'Move down', () => moveStitchPart(part.id, 1)),
        stitchActionButton('⇄', currentLang === 'zh' ? '反向' : 'Reverse', () => {
          part.reversed = !part.reversed;
          stitchState.dirty = true;
          renderStitchWorkbench();
        }),
        stitchActionButton('↔', currentLang === 'zh' ? '恢复完整轨迹' : 'Use full trail', () => {
          part.startIndex = 0;
          part.endIndex = part.trail.track.length - 1;
          stitchState.dirty = true;
          renderStitchWorkbench();
        }),
        stitchActionButton('⧉', currentLang === 'zh' ? '复制片段' : 'Duplicate part', () => {
          const copyPart = {...part, id:`stitch-part-${++stitchPartSequence}`};
          stitchState.parts.splice(index + 1, 0, copyPart);
          stitchState.selectedPartId = copyPart.id;
          stitchState.dirty = true;
          renderStitchWorkbench();
        }),
        stitchActionButton('×', currentLang === 'zh' ? '删除片段' : 'Delete part', () => {
          stitchState.parts.splice(index, 1);
          stitchState.selectedPartId = stitchState.parts[Math.min(index, stitchState.parts.length - 1)]?.id || null;
          stitchState.dirty = true;
          renderStitchWorkbench();
        }),
      );
      card.append(order, copy, actions);
      const gap = gapByIndex.get(index);
      if(gap) {
        const gapLabel = document.createElement('span');
        gapLabel.className = 'stitch-part-gap';
        gapLabel.textContent = currentLang === 'zh'
          ? `前一段后有 ${Math.round(gap.distanceM)} m 断点，不连接且不计入统计`
          : `${Math.round(gap.distanceM)} m gap before this part; excluded from stats`;
        card.append(gapLabel);
      }
      card.addEventListener('click', () => {
        stitchState.selectedPartId = part.id;
        renderStitchWorkbench();
      });
      card.addEventListener('dragstart', event => event.dataTransfer?.setData('text/plain', part.id));
      card.addEventListener('dragover', event => event.preventDefault());
      card.addEventListener('drop', event => {
        event.preventDefault();
        const sourceId = event.dataTransfer?.getData('text/plain');
        const sourceIndex = stitchState.parts.findIndex(item => item.id === sourceId);
        const targetIndex = stitchState.parts.findIndex(item => item.id === part.id);
        if(sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
        const [moved] = stitchState.parts.splice(sourceIndex, 1);
        stitchState.parts.splice(targetIndex, 0, moved);
        stitchState.dirty = true;
        renderStitchWorkbench();
      });
      list.append(card);
    });
    const totalKm = stitchState.parts.reduce((sum, part) => sum + stitchPartDistanceKm(part), 0);
    const gaps = junctions.filter(item => !item.connected).length;
    summary.innerHTML = '';
    for(const [value, gap] of [
      [`${stitchState.parts.length} ${currentLang === 'zh' ? '个片段' : 'parts'}`, false],
      [`${totalKm.toFixed(2)} km`, false],
      [`${gaps} ${currentLang === 'zh' ? '个断点' : 'gaps'}`, gaps > 0],
    ]) {
      const chip = document.createElement('span');
      chip.className = `stitch-summary-chip${gap ? ' is-gap' : ''}`;
      chip.textContent = value;
      summary.append(chip);
    }
  }

  function renderStitchWorkbench() {
    renderStitchPanel();
    renderStitchMap();
  }

  function cleanupStitchWorkbench() {
    stitchState.active = false;
    stitchState.parts = [];
    stitchState.selectedPartId = null;
    stitchState.dirty = false;
    stitchLayer.clearLayers();
    document.getElementById('stitch-panel')?.classList.remove('is-open');
    document.documentElement.classList.remove('stitch-editing');
    commandRegistry.notifyChanged();
  }

  async function requestStitchExit(force = false) {
    if(!stitchState.active) return true;
    if(!force && stitchState.dirty) {
      const confirmed = await studioDialogs.confirm({
        title:currentLang === 'zh' ? '退出轨迹拼接？' : 'Exit trail composer?',
        message:currentLang === 'zh' ? '当前片段范围、方向或顺序尚未生成新轨迹。' : 'The current ranges, directions, and order have not been created.',
        confirmLabel:currentLang === 'zh' ? '放弃并退出' : 'Discard and exit',
        cancelLabel:currentLang === 'zh' ? '继续编辑' : 'Keep editing',
        danger:true,
      });
      if(!confirmed) return false;
    }
    if(interactionManager.current.kind === 'stitch') interactionManager.cancel('stitch-exit');
    else cleanupStitchWorkbench();
    return true;
  }

  function handleStitchInteraction(event, session) {
    const part = stitchState.parts.find(item => item.id === event.partId);
    if(!part) return;
    if(event.type === 'drag-start') {
      session.setPhase('dragging');
      return;
    }
    if(event.type === 'drag-end') {
      applyStitchEndpoint(part, event.endpoint, event.hit);
      session.setPhase('editing');
      renderStitchWorkbench();
    }
  }

  async function enterStitchWorkbench(trails) {
    const ownerTrail = DATA.trails.find(trail => trail.id === state.primaryTrailId) || trails[0];
    if(interactionManager.current.kind !== 'idle') interactionManager.cancel('switch-stitch');
    stitchState.parts = trails.map(createStitchDraftPart);
    stitchState.selectedPartId = stitchState.parts[0]?.id || null;
    stitchState.dirty = false;
    const session = beginRuntimeInteraction('stitch', 'editing', ownerTrail, {
      onEvent:handleStitchInteraction,
      onCancel:cleanupStitchWorkbench,
    });
    if(!session) return false;
    stitchState.active = true;
    document.documentElement.classList.add('stitch-editing');
    const nameInput = document.getElementById('stitch-name');
    if(nameInput) nameInput.value = currentLang === 'zh' ? '拼接轨迹' : 'Stitched trail';
    const error = document.getElementById('stitch-error');
    if(error) error.textContent = '';
    renderStitchWorkbench();
    const latLngs = trails.flatMap(trail => trail.track.map(point => [point[0], point[1]]));
    if(latLngs.length) {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      map.invalidateSize({pan:false, animate:false});
      const fitOptions = window.innerWidth <= 760
        ? {paddingTopLeft:[36,36], paddingBottomRight:[36,Math.min(360, Math.round(window.innerHeight * .42))]}
        : {paddingTopLeft:[50,50], paddingBottomRight:[430,50]};
      await fitWorkspaceBounds(L.latLngBounds(latLngs), fitOptions, {source:'stitch-workbench'});
    }
    return true;
  }

  async function commitStitchWorkbench() {
    const error = document.getElementById('stitch-error');
    const name = document.getElementById('stitch-name')?.value.trim();
    if(stitchState.parts.length < 2) {
      if(error) error.textContent = currentLang === 'zh' ? '至少保留两个轨迹片段。' : 'Keep at least two trail parts.';
      return false;
    }
    if(!name) {
      if(error) error.textContent = currentLang === 'zh' ? '请输入新轨迹名称。' : 'Enter a name for the new trail.';
      return false;
    }
    if(!setRuntimeInteractionPhase('stitch', 'committing')) return false;
    const trail = stitchTrails(stitchState.parts.map(part => ({
      trail:part.trail,
      startIndex:part.startIndex,
      endIndex:part.endIndex,
      reversed:part.reversed,
    })), {
      id:generateNextTrailId(),
      name,
      seamToleranceM:5,
    });
    const gapCount = trail.track_breaks.length;
    interactionManager.cancel('stitch-committed');
    const result = recordProjectEdit('生成拼接轨迹', 'Create stitched trail', () => fileImportController.addTrail(trail));
    if(result.status !== 'added') {
      showToast(currentLang === 'zh' ? '生成结果与已有轨迹重复' : 'The stitched result duplicates an existing trail', 'info');
      return false;
    }
    fileImportController.finalizeImport(1);
    showToast(currentLang === 'zh'
      ? `已生成「${trail.name}」· ${trail.stats.distance_km.toFixed(1)} km · ${gapCount} 个断点`
      : `Created “${trail.name}” · ${trail.stats.distance_km.toFixed(1)} km · ${gapCount} gaps`);
    return true;
  }

  async function stitchTrailsCommand() {
    if(stitchState.active) return true;
    if(interactionManager.current.kind === 'segment' && !await requestSegmentExit('switch-stitch')) return false;
    if(DATA.trails.length < 2) {
      await studioDialogs.info({
        title:currentLang === 'zh' ? '无法拼接轨迹' : 'Cannot stitch trails',
        message:currentLang === 'zh' ? '至少需要两条已有轨迹。' : 'At least two existing trails are required.',
      });
      return false;
    }
    const requested = await studioDialogs.openCustom({
      title:currentLang === 'zh' ? '选择拼接来源' : 'Choose source trails',
      message:currentLang === 'zh'
        ? '从 0 开始选择两条或更多路线，下一步将在地图中调整每段范围、方向和顺序。'
        : 'Start with no selection, choose two or more trails, then edit ranges, directions, and order on the map.',
      size:'wide',
      render(context) {
        const list = document.createElement('div');
        list.className = 'stitch-trail-list stitch-source-list';
        for(const trail of DATA.trails) {
          const row = document.createElement('label');
          row.className = 'stitch-trail-row stitch-source-row';
          row.dataset.trailId = trail.id;
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'stitch-trail-check';
          checkbox.checked = false;
          const copy = document.createElement('span');
          copy.className = 'stitch-trail-copy';
          const title = document.createElement('strong');
          title.textContent = trail.name || trail.id;
          const meta = document.createElement('small');
          meta.textContent = `${trailGroup(trail)} · ${Number(trail.stats?.distance_km || 0).toFixed(1)} km`;
          copy.append(title, meta);
          row.append(checkbox, copy);
          list.append(row);
        }
        const error = document.createElement('p');
        error.className = 'workbench-dialog__error';
        error.setAttribute('role', 'alert');
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'workbench-dialog__button workbench-dialog__button--secondary';
        cancel.textContent = currentLang === 'zh' ? '取消' : 'Cancel';
        cancel.addEventListener('click', context.cancel);
        const next = document.createElement('button');
        next.type = 'submit';
        next.className = 'workbench-dialog__button workbench-dialog__button--primary';
        next.textContent = currentLang === 'zh' ? '进入地图编辑' : 'Edit on map';
        context.form.addEventListener('submit', event => {
          event.preventDefault();
          const trailIds = [...list.querySelectorAll('.stitch-trail-check:checked')]
            .map(input => input.closest('.stitch-trail-row')?.dataset.trailId)
            .filter(Boolean);
          if(trailIds.length < 2) {
            error.textContent = currentLang === 'zh' ? '请至少选择两条轨迹。' : 'Select at least two trails.';
            return;
          }
          context.close({trailIds});
        });
        context.body.append(list, error);
        context.actions.append(cancel, next);
      },
    });
    if(!requested) return false;
    const trails = requested.trailIds.map(id => DATA.trails.find(trail => trail.id === id)).filter(Boolean);
    return trails.length >= 2 && enterStitchWorkbench(trails);
  }

  const stitchPanel = document.getElementById('stitch-panel');
  if(stitchPanel) {
    L.DomEvent.disableClickPropagation(stitchPanel);
    L.DomEvent.disableScrollPropagation(stitchPanel);
  }
  document.getElementById('stitch-close')?.addEventListener('click', () => void requestStitchExit());
  document.getElementById('stitch-cancel')?.addEventListener('click', () => void requestStitchExit());
  document.getElementById('stitch-commit')?.addEventListener('click', () => void commitStitchWorkbench());

  async function reversePrimaryTrailCommand() {
    if(!state.primaryTrailId) {
      await studioDialogs.info({
        title:currentLang === 'zh' ? '无法反向' : 'Cannot reverse',
        message:t('reverse.noPrimary') || '无主轨迹',
      });
      return false;
    }
    reverseTrail(state.primaryTrailId);
    return true;
  }

  async function renameApplicationCommand() {
    const title = document.getElementById('app-title');
    if(!title) return false;
    const value = await studioDialogs.prompt({
      title:currentLang === 'zh' ? '修改标题' : 'Rename workspace',
      inputLabel:currentLang === 'zh' ? '标题' : 'Title',
      value:title.textContent || '',
      required:true,
      selectOnOpen:true,
      confirmLabel:currentLang === 'zh' ? '保存' : 'Save',
      cancelLabel:currentLang === 'zh' ? '取消' : 'Cancel',
    });
    const next = value && value.trim();
    if(!next) return false;
    title.textContent = next;
    document.title = next;
    try { localStorage.setItem('hiking_title', next); } catch(e) {}
    return true;
  }

  function cancelActiveCommand() {
    if(lightboxEl && lightboxEl.style.display === 'flex') {
      closeLightbox();
      return true;
    }
    const openModal = document.querySelector('.modal-mask.open');
    if(openModal) {
      openModal.classList.remove('open');
      return true;
    }
    const exportPopup = document.getElementById('export-menu-popup');
    if(exportPopup) {
      exportPopup.remove();
      return true;
    }
    if(interactionManager.current.kind === 'segment') {
      void requestSegmentExit('escape-key');
      return true;
    }
    if(interactionManager.current.kind === 'stitch') {
      void requestStitchExit();
      return true;
    }
    if(interactionManager.current.kind !== 'idle') {
      interactionManager.cancel('escape-key');
      return true;
    }
    return false;
  }

  function registerRuntimeCommands() {
    const register = (id, execute, options = {}) => commandRegistry.register({id, execute, ...options});
    const hasTrails = () => DATA.trails.length > 0;
    const disposers = [
      register(STUDIO_COMMANDS.FILE_IMPORT, () => addModal.classList.add('open')),
      register(STUDIO_COMMANDS.FILE_EXPORT, exportOffline, {enabled:hasTrails}),
      register(STUDIO_COMMANDS.PROJECT_CLEAR, clearAllTrails, {enabled:hasTrails}),
      register(STUDIO_COMMANDS.EDIT_UNDO, () => projectHistoryController.undo(), {
        enabled:() => projectHistoryController.canUndo,
      }),
      register(STUDIO_COMMANDS.EDIT_REDO, () => projectHistoryController.redo(), {
        enabled:() => projectHistoryController.canRedo,
      }),
      register(STUDIO_COMMANDS.TRAIL_REVERSE, reversePrimaryTrailCommand, {enabled:hasPrimaryTrail}),
      register(STUDIO_COMMANDS.TRAIL_STITCH, stitchTrailsCommand, {enabled:() => DATA.trails.length >= 2}),
      register(STUDIO_COMMANDS.MEASURE_TOGGLE, toggleMeasureCommand, {
        enabled:hasPrimaryTrail,
        checked:() => interactionManager.current.kind === 'measure',
      }),
      register(STUDIO_COMMANDS.SEGMENT_TOGGLE, toggleSegmentCommand, {
        enabled:hasPrimaryTrail,
        checked:() => interactionManager.current.kind === 'segment',
      }),
      register(STUDIO_COMMANDS.WAYPOINT_TOGGLE, toggleWaypointCommand, {
        enabled:hasPrimaryTrail,
        checked:() => interactionManager.current.kind === 'waypoint',
      }),
      register(STUDIO_COMMANDS.ESCAPE_TOGGLE, toggleEscapeCommand, {
        enabled:hasPrimaryTrail,
        checked:() => interactionManager.current.kind === 'escape',
      }),
      register(STUDIO_COMMANDS.MAP_RESET, () => resetView({restoreActive:true, gesture:true}), {enabled:hasTrails}),
      register(STUDIO_COMMANDS.HELP_OPEN, showHelp),
      register(STUDIO_COMMANDS.LANGUAGE_TOGGLE, () => {
        setLang(currentLang === 'zh' ? 'en' : 'zh');
        const button = document.getElementById('lang-btn');
        if(button) button.textContent = currentLang === 'zh' ? '🌐 EN' : '🌐 中';
      }),
      register(STUDIO_COMMANDS.APP_RENAME, renameApplicationCommand),
      register(STUDIO_COMMANDS.INTERACTION_CANCEL, cancelActiveCommand),
      register(STUDIO_COMMANDS.MODE_ELEVATION, () => setMapMode('elev'), {
        checked:() => state.mode === 'elev',
      }),
      register(STUDIO_COMMANDS.MODE_WAYPOINT, () => setMapMode('waypoint'), {
        checked:() => state.mode === 'waypoint',
      }),
      register(STUDIO_COMMANDS.WORKSPACE_GROUPS, () => activateSidebarTab('groups')),
      register(STUDIO_COMMANDS.WORKSPACE_TRAILS, () => activateSidebarTab('trails')),
      register(STUDIO_COMMANDS.WORKSPACE_ITINERARY, () => activateSidebarTab('days')),
      register(STUDIO_COMMANDS.WORKSPACE_WAYPOINTS, () => {
        activateSidebarTab('trails');
        setMapMode('waypoint');
      }),
    ];
    window.__HTM_RUNTIME_COMMAND_DISPOSERS__ = disposers;
    commandRegistry.notifyChanged();
  }

  registerRuntimeCommands();

  initFloatingPanelPositions();
  invalidateRender(
    HTM_APP.RENDER_DIRTY.TRACKS
    | HTM_APP.RENDER_DIRTY.MARKERS
    | HTM_APP.RENDER_DIRTY.SIDEBAR
    | HTM_APP.RENDER_DIRTY.DAYS
    | HTM_APP.RENDER_DIRTY.LEGEND
    | HTM_APP.RENDER_DIRTY.CHART,
  );


  if(new URL(window.location.href).searchParams.has('studio-test')) {
    const runtimeInspector = {};
    Object.defineProperties(runtimeInspector, {
      "APP_VERSION": {enumerable:true, get:() => APP_VERSION},
      "DATA": {enumerable:true, get:() => DATA},
      "DATA_KEY": {enumerable:true, get:() => DATA_KEY},
      "DB_NAME": {enumerable:true, get:() => DB_NAME},
      "HTM_APP": {enumerable:true, get:() => HTM_APP},
      "HTM_CORE": {enumerable:true, get:() => HTM_CORE},
      "L": {enumerable:true, get:() => L},
      "PALETTE_LOCAL": {enumerable:true, get:() => PALETTE_LOCAL},
      "PRIMARY_MINI_POS_KEY": {enumerable:true, get:() => PRIMARY_MINI_POS_KEY},
      "STORE_NAME": {enumerable:true, get:() => STORE_NAME},
      "STUDIO_COMMANDS": {enumerable:true, get:() => STUDIO_COMMANDS},
      "TAG_RULES_JS": {enumerable:true, get:() => TAG_RULES_JS},
      "_boot": {enumerable:true, get:() => _boot},
      "_closeAddModal": {enumerable:true, get:() => _closeAddModal},
      "_doSave": {enumerable:true, get:() => _doSave},
      "_elevBarData": {enumerable:true, get:() => _elevBarData},
      "_miniEl": {enumerable:true, get:() => _miniEl},
      "_sbClose": {enumerable:true, get:() => _sbClose},
      "_sbToggle": {enumerable:true, get:() => _sbToggle},
      "_showHighPointEl": {enumerable:true, get:() => _showHighPointEl},
      "_showLabelEl": {enumerable:true, get:() => _showLabelEl},
      "_showTrackEl": {enumerable:true, get:() => _showTrackEl},
      "_sidebar": {enumerable:true, get:() => _sidebar},
      "_toolbarEl": {enumerable:true, get:() => _toolbarEl},
      "accumulatorAscent": {enumerable:true, get:() => accumulatorAscent},
      "accumulatorDescent": {enumerable:true, get:() => accumulatorDescent},
      "activateSidebarTab": {enumerable:true, get:() => activateSidebarTab},
      "addBtn": {enumerable:true, get:() => addBtn},
      "addCancel": {enumerable:true, get:() => addCancel},
      "addEscapeCommit": {enumerable:true, get:() => addEscapeCommit},
      "addEscapeCompute": {enumerable:true, get:() => addEscapeCompute},
      "addEscapeEnter": {enumerable:true, get:() => addEscapeEnter},
      "addEscapeExit": {enumerable:true, get:() => addEscapeExit},
      "addEscapeReset": {enumerable:true, get:() => addEscapeReset},
      "addEscapeState": {enumerable:true, get:() => addEscapeState},
      "addManualWaypointAt": {enumerable:true, get:() => addManualWaypointAt},
      "addMeasureEndpointMarker": {enumerable:true, get:() => addMeasureEndpointMarker},
      "addModal": {enumerable:true, get:() => addModal},
      "addStatus": {enumerable:true, get:() => addStatus},
      "addWaypointState": {enumerable:true, get:() => addWaypointState},
      "addWpMarker": {enumerable:true, get:() => addWpMarker},
      "appStateStore": {enumerable:true, get:() => appStateStore},
      "appTitle": {enumerable:true, get:() => appTitle},
      "applyChange": {enumerable:true, get:() => applyChange},
      "applyI18n": {enumerable:true, get:() => applyI18n},
      "applyMeasureEndpointHit": {enumerable:true, get:() => applyMeasureEndpointHit},
      "applyMeasureEndpointState": {enumerable:true, get:() => applyMeasureEndpointState},
      "applyPrimaryMiniPosition": {enumerable:true, get:() => applyPrimaryMiniPosition},
      "baseLayers": {enumerable:true, get:() => baseLayers},
      "beginRuntimeInteraction": {enumerable:true, get:() => beginRuntimeInteraction},
      "bindKmlImportRowEvents": {enumerable:true, get:() => bindKmlImportRowEvents},
      "bindMeasureEndpointDrag": {enumerable:true, get:() => bindMeasureEndpointDrag},
      "bindPrimaryMiniDrag": {enumerable:true, get:() => bindPrimaryMiniDrag},
      "browserFileAdapter": {enumerable:true, get:() => browserFileAdapter},
      "buildDayMeta": {enumerable:true, get:() => buildDayMeta},
      "buildDayPreviewRenderModel": {enumerable:true, get:() => buildDayPreviewRenderModel},
      "buildDaysTab": {enumerable:true, get:() => buildDaysTab},
      "buildEscapeRoutes": {enumerable:true, get:() => buildEscapeRoutes},
      "buildFilterGrid": {enumerable:true, get:() => buildFilterGrid},
      "renderPrimaryCard": {enumerable:true, get:() => renderPrimaryCard},
      "buildKmlParseModel": {enumerable:true, get:() => buildKmlParseModel},
      "buildLegend": {enumerable:true, get:() => buildLegend},
      "buildMeasureSegmentRenderModel": {enumerable:true, get:() => buildMeasureSegmentRenderModel},
      "buildPrimaryMini": {enumerable:true, get:() => buildPrimaryMini},
      "buildSegmentLayerModel": {enumerable:true, get:() => buildSegmentLayerModel},
      "buildStorageDeleteOperation": {enumerable:true, get:() => buildStorageDeleteOperation},
      "buildStorageReadOperation": {enumerable:true, get:() => buildStorageReadOperation},
      "buildStorageWriteOperation": {enumerable:true, get:() => buildStorageWriteOperation},
      "buildTrackLatLngs": {enumerable:true, get:() => buildTrackLatLngs},
      "buildTrailList": {enumerable:true, get:() => buildTrailList},
      "buildTrailThumbnail": {enumerable:true, get:() => buildTrailThumbnail},
      "buildWaypointModeTagGrid": {enumerable:true, get:() => buildWaypointModeTagGrid},
      "cancelActiveCommand": {enumerable:true, get:() => cancelActiveCommand},
      "cancelRuntimeInteraction": {enumerable:true, get:() => cancelRuntimeInteraction},
      "clampPrimaryMiniPosition": {enumerable:true, get:() => clampPrimaryMiniPosition},
      "clampTrackIndex": {enumerable:true, get:() => clampTrackIndex},
      "classifyTag": {enumerable:true, get:() => classifyTag},
      "clearAllTrails": {enumerable:true, get:() => clearAllTrails},
      "clearDaySegmentPreview": {enumerable:true, get:() => clearDaySegmentPreview},
      "clearEscape": {enumerable:true, get:() => clearEscape},
      "clearMeasureLayer": {enumerable:true, get:() => clearMeasureLayer},
      "clearStorage": {enumerable:true, get:() => clearStorage},
      "closeLightbox": {enumerable:true, get:() => closeLightbox},
      "collectWaypointMarkerModels": {enumerable:true, get:() => collectWaypointMarkerModels},
      "commandRegistry": {enumerable:true, get:() => commandRegistry},
      "computeCumulativeDistance": {enumerable:true, get:() => computeCumulativeDistance},
      "computeMeasureStats": {enumerable:true, get:() => computeMeasureStats},
      "computeMeasureStatsFromCache": {enumerable:true, get:() => computeMeasureStatsFromCache},
      "computeSegmentStatsForTrack": {enumerable:true, get:() => computeSegmentStatsForTrack},
      "computeTrailStats": {enumerable:true, get:() => computeTrailStats},
      "confirmDeleteTrail": {enumerable:true, get:() => confirmDeleteTrail},
      "createPrimaryTrackDragSnapper": {enumerable:true, get:() => createPrimaryTrackDragSnapper},
      "currentBase": {enumerable:true, get:() => currentBase},
      "currentLang": {enumerable:true, get:() => currentLang},
      "dayPalette": {enumerable:true, get:() => dayPalette},
      "dayPreviewController": {enumerable:true, get:() => dayPreviewController},
      "dayPreviewState": {enumerable:true, get:() => dayPreviewState},
      "deleteTrail": {enumerable:true, get:() => deleteTrail},
      "dispatchRuntimeInteraction": {enumerable:true, get:() => dispatchRuntimeInteraction},
      "dispatchState": {enumerable:true, get:() => dispatchState},
      "dispatchStudioCommand": {enumerable:true, get:() => dispatchStudioCommand},
      "dispatchTransientWaypointTap": {enumerable:true, get:() => dispatchTransientWaypointTap},
      "downloadTrailKML": {enumerable:true, get:() => downloadTrailKML},
      "drawElevBar": {enumerable:true, get:() => drawElevBar},
      "drawHighPoints": {enumerable:true, get:() => drawHighPoints},
      "drawTracks": {enumerable:true, get:() => drawTracks},
      "drawWaypoints": {enumerable:true, get:() => drawWaypoints},
      "editTrailId": {enumerable:true, get:() => editTrailId},
      "editTrailSource": {enumerable:true, get:() => editTrailSource},
      "elevCanvas": {enumerable:true, get:() => elevCanvas},
      "elevCrosshair": {enumerable:true, get:() => elevCrosshair},
      "elevCtx": {enumerable:true, get:() => elevCtx},
      "elevLabel": {enumerable:true, get:() => elevLabel},
      "elevRatioColor": {enumerable:true, get:() => elevRatioColor},
      "elevTip": {enumerable:true, get:() => elevTip},
      "elevationCanvasRenderer": {enumerable:true, get:() => elevationCanvasRenderer},
      "enrichWaypoints": {enumerable:true, get:() => enrichWaypoints},
      "ensurePrimaryForActiveGroup": {enumerable:true, get:() => ensurePrimaryForActiveGroup},
      "ensureUniqueTrailId": {enumerable:true, get:() => ensureUniqueTrailId},
      "enterAddWaypointMode": {enumerable:true, get:() => enterAddWaypointMode},
      "enterInteractionRenderMode": {enumerable:true, get:() => enterInteractionRenderMode},
      "escapeController": {enumerable:true, get:() => escapeController},
      "escapeLayer": {enumerable:true, get:() => escapeLayer},
      "executeWorkspaceFit": {enumerable:true, get:() => executeWorkspaceFit},
      "exitAddWaypointMode": {enumerable:true, get:() => exitAddWaypointMode},
      "expandZipFiles": {enumerable:true, get:() => expandZipFiles},
      "exportGroupKML": {enumerable:true, get:() => exportGroupKML},
      "exportItineraryMD": {enumerable:true, get:() => exportItineraryMD},
      "exportOffline": {enumerable:true, get:() => exportOffline},
      "extractImageUrl": {enumerable:true, get:() => extractImageUrl},
      "extractKmlParseModelInput": {enumerable:true, get:() => extractKmlParseModelInput},
      "fflate": {enumerable:true, get:() => fflate},
      "fileArchiveAdapter": {enumerable:true, get:() => fileArchiveAdapter},
      "fileExportController": {enumerable:true, get:() => fileExportController},
      "fileImportController": {enumerable:true, get:() => fileImportController},
      "findDuplicateTrail": {enumerable:true, get:() => findDuplicateTrail},
      "findNearestIdx": {enumerable:true, get:() => findNearestIdx},
      "findWaypointAnchorOnPrimary": {enumerable:true, get:() => findWaypointAnchorOnPrimary},
      "finishWorkspaceFit": {enumerable:true, get:() => finishWorkspaceFit},
      "fitWorkspaceBounds": {enumerable:true, get:() => fitWorkspaceBounds},
      "floatingPanelController": {enumerable:true, get:() => floatingPanelController},
      "generateNextTrailId": {enumerable:true, get:() => generateNextTrailId},
      "getGroups": {enumerable:true, get:() => getGroups},
      "getMeasureStatsCache": {enumerable:true, get:() => getMeasureStatsCache},
      "handleDayPreviewInteractionEvent": {enumerable:true, get:() => handleDayPreviewInteractionEvent},
      "handleEscapeInteractionEvent": {enumerable:true, get:() => handleEscapeInteractionEvent},
      "handleFileExportEvent": {enumerable:true, get:() => handleFileExportEvent},
      "handleFileImportEvent": {enumerable:true, get:() => handleFileImportEvent},
      "handleFiles": {enumerable:true, get:() => handleFiles},
      "handleMeasureInteractionEvent": {enumerable:true, get:() => handleMeasureInteractionEvent},
      "handleMeasureTap": {enumerable:true, get:() => handleMeasureTap},
      "handleSegmentInteractionEvent": {enumerable:true, get:() => handleSegmentInteractionEvent},
      "handleSegmentTap": {enumerable:true, get:() => handleSegmentTap},
      "handleStorageControllerEvent": {enumerable:true, get:() => handleStorageControllerEvent},
      "handleTrailCardClick": {enumerable:true, get:() => handleTrailCardClick},
      "handleTrailDetailClick": {enumerable:true, get:() => handleTrailDetailClick},
      "handleTrailGroupChange": {enumerable:true, get:() => handleTrailGroupChange},
      "handleWaypointInteractionEvent": {enumerable:true, get:() => handleWaypointInteractionEvent},
      "hasPrimaryTrail": {enumerable:true, get:() => hasPrimaryTrail},
      "haversine": {enumerable:true, get:() => haversine},
      "hideMeasureElevReadout": {enumerable:true, get:() => hideMeasureElevReadout},
      "hideTooltip": {enumerable:true, get:() => hideTooltip},
      "hideWpPhoto": {enumerable:true, get:() => hideWpPhoto},
      "highPointLayer": {enumerable:true, get:() => highPointLayer},
      "importSingleKml": {enumerable:true, get:() => importSingleKml},
      "initFloatingPanelPositions": {enumerable:true, get:() => initFloatingPanelPositions},
      "interactionManager": {enumerable:true, get:() => interactionManager},
      "invalidateRender": {enumerable:true, get:() => invalidateRender},
      "isDetailButtonTarget": {enumerable:true, get:() => isDetailButtonTarget},
      "isRuntimeInteractionCurrent": {enumerable:true, get:() => isRuntimeInteractionCurrent},
      "isTrailActive": {enumerable:true, get:() => isTrailActive},
      "kmlCoordsToTrackPoints": {enumerable:true, get:() => kmlCoordsToTrackPoints},
      "kmlDrop": {enumerable:true, get:() => kmlDrop},
      "kmlFile": {enumerable:true, get:() => kmlFile},
      "kmlList": {enumerable:true, get:() => kmlList},
      "langBtn": {enumerable:true, get:() => langBtn},
      "lastNonDayMode": {enumerable:true, get:() => lastNonDayMode},
      "lbApply": {enumerable:true, get:() => lbApply},
      "lbMouseDown": {enumerable:true, get:() => lbMouseDown},
      "lbReset": {enumerable:true, get:() => lbReset},
      "lbState": {enumerable:true, get:() => lbState},
      "lbTouchCenter": {enumerable:true, get:() => lbTouchCenter},
      "lbTouchDist": {enumerable:true, get:() => lbTouchDist},
      "leafletMarkerRenderer": {enumerable:true, get:() => leafletMarkerRenderer},
      "leafletTrackRenderer": {enumerable:true, get:() => leafletTrackRenderer},
      "lightboxCap": {enumerable:true, get:() => lightboxCap},
      "lightboxEl": {enumerable:true, get:() => lightboxEl},
      "lightboxImg": {enumerable:true, get:() => lightboxImg},
      "loadFromStorage": {enumerable:true, get:() => loadFromStorage},
      "map": {enumerable:true, get:() => map},
      "mapRenderController": {enumerable:true, get:() => mapRenderController},
      "markTrailRevision": {enumerable:true, get:() => markTrailRevision},
      "markerRenderController": {enumerable:true, get:() => markerRenderController},
      "measureCloseBtn": {enumerable:true, get:() => measureCloseBtn},
      "measureCompute": {enumerable:true, get:() => measureCompute},
      "measureController": {enumerable:true, get:() => measureController},
      "measureEnter": {enumerable:true, get:() => measureEnter},
      "measureExit": {enumerable:true, get:() => measureExit},
      "measureExitBtn": {enumerable:true, get:() => measureExitBtn},
      "measureMarker": {enumerable:true, get:() => measureMarker},
      "measurePointFromHit": {enumerable:true, get:() => measurePointFromHit},
      "measureRangeMaxElev": {enumerable:true, get:() => measureRangeMaxElev},
      "measureRangeMinElev": {enumerable:true, get:() => measureRangeMinElev},
      "measureReset": {enumerable:true, get:() => measureReset},
      "measureResetBtn": {enumerable:true, get:() => measureResetBtn},
      "measureReverse": {enumerable:true, get:() => measureReverse},
      "measureReverseBtn": {enumerable:true, get:() => measureReverseBtn},
      "measureState": {enumerable:true, get:() => measureState},
      "measureStatsCache": {enumerable:true, get:() => measureStatsCache},
      "measureTrackCache": {enumerable:true, get:() => measureTrackCache},
      "moveBatchToGroup": {enumerable:true, get:() => moveBatchToGroup},
      "moveSegmentBoundary": {enumerable:true, get:() => moveSegmentBoundary},
      "nearestTrackIdx": {enumerable:true, get:() => nearestTrackIdx},
      "nearestTrackIdxNearPrimary": {enumerable:true, get:() => nearestTrackIdxNearPrimary},
      "nearestTrackIdxOnPrimary": {enumerable:true, get:() => nearestTrackIdxOnPrimary},
      "networkLayer": {enumerable:true, get:() => networkLayer},
      "nextWaypointId": {enumerable:true, get:() => nextWaypointId},
      "normalizeActiveTrailIds": {enumerable:true, get:() => normalizeActiveTrailIds},
      "normalizeIndexedDbStorageConfig": {enumerable:true, get:() => normalizeIndexedDbStorageConfig},
      "normalizeKmlTitle": {enumerable:true, get:() => normalizeKmlTitle},
      "normalizePrimaryByGroup": {enumerable:true, get:() => normalizePrimaryByGroup},
      "normalizeTrackIndexRange": {enumerable:true, get:() => normalizeTrackIndexRange},
      "openDB": {enumerable:true, get:() => openDB},
      "openLightbox": {enumerable:true, get:() => openLightbox},
      "parseAndProcessKml": {enumerable:true, get:() => parseAndProcessKml},
      "parseCoordStr": {enumerable:true, get:() => parseCoordStr},
      "parseGxCoordText": {enumerable:true, get:() => parseGxCoordText},
      "parseKml": {enumerable:true, get:() => parseKml},
      "pendingWorkspaceFit": {enumerable:true, get:() => pendingWorkspaceFit},
      "pinWpCard": {enumerable:true, get:() => pinWpCard},
      "pointFromTrackIndex": {enumerable:true, get:() => pointFromTrackIndex},
      "postImportFinalize": {enumerable:true, get:() => postImportFinalize},
      "primaryTrailIdForGroup": {enumerable:true, get:() => primaryTrailIdForGroup},
      "processTrack": {enumerable:true, get:() => processTrack},
      "projectArchiveController": {enumerable:true, get:() => projectArchiveController},
      "projectHistoryController": {enumerable:true, get:() => projectHistoryController},
      "queueMeasureLiveUpdate": {enumerable:true, get:() => queueMeasureLiveUpdate},
      "rebuildAll": {enumerable:true, get:() => rebuildAll},
      "recordRenderPhase": {enumerable:true, get:() => recordRenderPhase},
      "redrawSegmentLayer": {enumerable:true, get:() => redrawSegmentLayer},
      "refreshElevBar": {enumerable:true, get:() => refreshElevBar},
      "registerRuntimeCommands": {enumerable:true, get:() => registerRuntimeCommands},
      "removeTrailFromPrimaryByGroup": {enumerable:true, get:() => removeTrailFromPrimaryByGroup},
      "renameApplicationCommand": {enumerable:true, get:() => renameApplicationCommand},
      "renderBatchToolbar": {enumerable:true, get:() => renderBatchToolbar},
      "renderDaysNow": {enumerable:true, get:() => renderDaysNow},
      "renderElevationChartNow": {enumerable:true, get:() => renderElevationChartNow},
      "renderGroupTabs": {enumerable:true, get:() => renderGroupTabs},
      "renderKmlImportRow": {enumerable:true, get:() => renderKmlImportRow},
      "renderLegendNow": {enumerable:true, get:() => renderLegendNow},
      "renderMeasureSegmentLine": {enumerable:true, get:() => renderMeasureSegmentLine},
      "renderRuntimeStats": {enumerable:true, get:() => renderRuntimeStats},
      "renderScheduler": {enumerable:true, get:() => renderScheduler},
      "renderSegmentList": {enumerable:true, get:() => renderSegmentList},
      "renderSidebarNow": {enumerable:true, get:() => renderSidebarNow},
      "renderTracksNow": {enumerable:true, get:() => renderTracksNow},
      "renderTrailCard": {enumerable:true, get:() => renderTrailCard},
      "renderWaypointsNow": {enumerable:true, get:() => renderWaypointsNow},
      "resetMeasureElevReadout": {enumerable:true, get:() => resetMeasureElevReadout},
      "resetView": {enumerable:true, get:() => resetView},
      "restoreProjectFile": {enumerable:true, get:() => restoreProjectFile},
      "restoreStorageSnapshot": {enumerable:true, get:() => restoreStorageSnapshot},
      "revalidateRuntimeInteractionOwner": {enumerable:true, get:() => revalidateRuntimeInteractionOwner},
      "reverseMeasureEndpoints": {enumerable:true, get:() => reverseMeasureEndpoints},
      "reversePrimaryTrailCommand": {enumerable:true, get:() => reversePrimaryTrailCommand},
      "reverseTrail": {enumerable:true, get:() => reverseTrail},
      "runtimeContext": {enumerable:true, get:() => runtimeContext},
      "runtimeInteractionOwner": {enumerable:true, get:() => runtimeInteractionOwner},
      "runtimeInteractionOwnerIsCurrent": {enumerable:true, get:() => runtimeInteractionOwnerIsCurrent},
      "runtimeTrailRevision": {enumerable:true, get:() => runtimeTrailRevision},
      "runtimeTrailRevisions": {enumerable:true, get:() => runtimeTrailRevisions},
      "sandboxWarningShown": {enumerable:true, get:() => sandboxWarningShown},
      "savePrimaryMiniPosition": {enumerable:true, get:() => savePrimaryMiniPosition},
      "saveToStorage": {enumerable:true, get:() => saveToStorage},
      "schedulePostRestoreReset": {enumerable:true, get:() => schedulePostRestoreReset},
      "schedulePrimaryMiniPositionApply": {enumerable:true, get:() => schedulePrimaryMiniPositionApply},
      "scheduleRuntimeInteractionFrame": {enumerable:true, get:() => scheduleRuntimeInteractionFrame},
      "segmentApply": {enumerable:true, get:() => segmentApply},
      "segmentApplyBtn": {enumerable:true, get:() => segmentApplyBtn},
      "segmentRestore": {enumerable:true, get:() => segmentRestore},
      "segmentRestoreBtn": {enumerable:true, get:() => segmentRestoreBtn},
      "segmentCloseBtn": {enumerable:true, get:() => segmentCloseBtn},
      "segmentController": {enumerable:true, get:() => segmentController},
      "segmentDeleteDay": {enumerable:true, get:() => segmentDeleteDay},
      "segmentEnter": {enumerable:true, get:() => segmentEnter},
      "segmentExit": {enumerable:true, get:() => segmentExit},
      "segmentExitBtn": {enumerable:true, get:() => segmentExitBtn},
      "segmentInsertPoint": {enumerable:true, get:() => segmentInsertPoint},
      "requestSegmentExit": {enumerable:true, get:() => requestSegmentExit},
      "segmentState": {enumerable:true, get:() => segmentState},
      "segmentStats": {enumerable:true, get:() => segmentStats},
      "segmentUndo": {enumerable:true, get:() => segmentUndo},
      "segmentUndoBtn": {enumerable:true, get:() => segmentUndoBtn},
      "serializeStorageSnapshot": {enumerable:true, get:() => serializeStorageSnapshot},
      "setLang": {enumerable:true, get:() => setLang},
      "setMapMode": {enumerable:true, get:() => setMapMode},
      "setMeasureElevHint": {enumerable:true, get:() => setMeasureElevHint},
      "setRuntimeInteractionPhase": {enumerable:true, get:() => setRuntimeInteractionPhase},
      "shortLabel": {enumerable:true, get:() => shortLabel},
      "showChangelog": {enumerable:true, get:() => showChangelog},
      "showDaySegmentPreview": {enumerable:true, get:() => showDaySegmentPreview},
      "showEscape": {enumerable:true, get:() => showEscape},
      "showExportMenu": {enumerable:true, get:() => showExportMenu},
      "showHelp": {enumerable:true, get:() => showHelp},
      "showMeasureElevReadout": {enumerable:true, get:() => showMeasureElevReadout},
      "showStorageInfo": {enumerable:true, get:() => showStorageInfo},
      "showToast": {enumerable:true, get:() => showToast},
      "showTooltip": {enumerable:true, get:() => showTooltip},
      "sidebarTabCommands": {enumerable:true, get:() => sidebarTabCommands},
      "smoothElev": {enumerable:true, get:() => smoothElev},
      "state": {enumerable:true, get:() => state},
      "stitchState": {enumerable:true, get:() => stitchState},
      "stitchLayer": {enumerable:true, get:() => stitchLayer},
      "renderStitchWorkbench": {enumerable:true, get:() => renderStitchWorkbench},
      "commitStitchWorkbench": {enumerable:true, get:() => commitStitchWorkbench},
      "requestStitchExit": {enumerable:true, get:() => requestStitchExit},
      "storageBtn": {enumerable:true, get:() => storageBtn},
      "storageController": {enumerable:true, get:() => storageController},
      "storageTrailGroup": {enumerable:true, get:() => storageTrailGroup},
      "studioDialogs": {enumerable:true, get:() => studioDialogs},
      "switchGroup": {enumerable:true, get:() => switchGroup},
      "t": {enumerable:true, get:() => t},
      "tagColors": {enumerable:true, get:() => tagColors},
      "tagIcons": {enumerable:true, get:() => tagIcons},
      "tagLabels": {enumerable:true, get:() => tagLabels},
      "toggleEscapeCommand": {enumerable:true, get:() => toggleEscapeCommand},
      "toggleMeasureCommand": {enumerable:true, get:() => toggleMeasureCommand},
      "toggleSegmentCommand": {enumerable:true, get:() => toggleSegmentCommand},
      "toggleSetItem": {enumerable:true, get:() => toggleSetItem},
      "toggleSidebar": {enumerable:true, get:() => toggleSidebar},
      "toggleTrailActive": {enumerable:true, get:() => toggleTrailActive},
      "toggleTrailBatch": {enumerable:true, get:() => toggleTrailBatch},
      "toggleTrailExpanded": {enumerable:true, get:() => toggleTrailExpanded},
      "toggleWaypointCommand": {enumerable:true, get:() => toggleWaypointCommand},
      "tooltipEl": {enumerable:true, get:() => tooltipEl},
      "trackLayer": {enumerable:true, get:() => trackLayer},
      "trailCardExpandedHtml": {enumerable:true, get:() => trailCardExpandedHtml},
      "trailCardHeaderHtml": {enumerable:true, get:() => trailCardHeaderHtml},
      "trailContentHash": {enumerable:true, get:() => trailContentHash},
      "trailController": {enumerable:true, get:() => trailController},
      "trailGroup": {enumerable:true, get:() => trailGroup},
      "updateElevBadges": {enumerable:true, get:() => updateElevBadges},
      "updateMeasureReadout": {enumerable:true, get:() => updateMeasureReadout},
      "updateModeTagTitle": {enumerable:true, get:() => updateModeTagTitle},
      "updateSegmentUI": {enumerable:true, get:() => updateSegmentUI},
      "waypointController": {enumerable:true, get:() => waypointController},
      "waypointIcon": {enumerable:true, get:() => waypointIcon},
      "waypointIconMarkup": {enumerable:true, get:() => waypointIconMarkup},
      "window": {enumerable:true, get:() => window},
      "workspaceResetEpoch": {enumerable:true, get:() => workspaceResetEpoch},
      "wpLayer": {enumerable:true, get:() => wpLayer},
      "wpMarkers": {enumerable:true, get:() => wpMarkers},
      "wpPhotoEl": {enumerable:true, get:() => wpPhotoEl},
    });
    window.__HTM_RUNTIME_INSPECTOR__ = Object.freeze(runtimeInspector);
  }

  return window.__HTM_BOOT_READY__;
}
