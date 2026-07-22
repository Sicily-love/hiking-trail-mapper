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
  const studioTestMode = new URL(window.location.href).searchParams.has('studio-test');
  const commandRegistry = dependencies.commands;
  const studioDialogs = dependencies.dialogs;
  const STUDIO_COMMANDS = HTM_APP.STUDIO_COMMANDS;
  const L = window.L;
  const fflate = window.fflate;
  if(!L) throw new Error('Leaflet runtime is missing');
  if(!fflate) throw new Error('fflate runtime is missing');

  const initialProject = {title:'徒步路线地图', trails:[], calc_method:{}};

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
      trailCount:projectSelectors.trails().length,
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
  const appStateStore = HTM_APP.createAppStateStore(initialProject);
  const selectors = HTM_APP.createAppStateSelectors(() => appStateStore.snapshot());
  const stateActions = HTM_APP.createAppStateActions(appStateStore);
  const projectStore = HTM_APP.createProjectStore(initialProject);
  const projectActions = HTM_APP.createProjectActions(projectStore);
  const projectSelectors = HTM_APP.createProjectSelectors(() => projectStore.snapshot());
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
    const trail = projectSelectors.trails().find(item => String(item.id) === session.owner.trailId);
    if(!trail || String(selectors.primaryTrailId()) !== session.owner.trailId) return false;
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
  let workspaceController = null;
  let kmlProjectBuilder = null;

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
      fit(context) { recordRenderPhase(context); workspaceController?.executeFit(context); },
    },
  });
  const runtimeContext = HTM_APP.createRuntimeContext({
    projectActions,
    projectSelectors,
    stateActions,
    stateSelectors:selectors,
    commands:commandRegistry,
    interactions:interactionManager,
    renderer:renderScheduler,
    dialogs:studioDialogs,
  });
  if(studioTestMode) {
    window.__HTM_RENDER_SCHEDULER__ = renderScheduler;
    window.__HTM_RENDER_STATS__ = renderRuntimeStats;
  }

  function invalidateRender(mask) {
    renderScheduler.invalidate(mask);
  }

  /* v1.17.0：state 变更 helpers ─────────────────────────────────
     统一"读-改-写-刷新-持久化"的常见组合，消除各处重复的 if/set/delete +
     rebuildAll + saveToStorage 模式。所有涉及 state 变更的 UI 事件都应
     走这些 helper，减少漏调 saveToStorage 的隐蔽 bug。
     ─────────────────────────────────────────────────────────────── */

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
    stateActions.setTrailActive(trailId, !selectors.activeTrailIds().has(trailId));
    // v1.21.0：主轨迹兜底只在当前组内挑
    if(selectors.activeGroup() != null && !selectors.activeTrailIds().has(selectors.primaryTrailId())) {
      const inGroupActive = [...selectors.activeTrailIds()].filter(id => {
        const tr = projectSelectors.trails().find(t => t.id === id);
        return tr && trailGroup(tr) === selectors.activeGroup();
      });
      stateActions.setPrimaryTrail(inGroupActive[0] || null);
    }
  }

  /** 切换详情展开态 */
  function toggleTrailExpanded(trailId) { stateActions.toggleExpanded(trailId); }

  /** 切换批量选中态 */
  function toggleTrailBatch(trailId) { stateActions.toggleBatch(trailId); }


  /* v1.14.1：分组支持 ─────────────────────────────────────────────
     trail.group（字符串）标识轨迹所属分组，未设置时默认'默认'。
     只有 state.activeGroup 组内的轨迹参与地图渲染/统计/行程等一切功能。
     v1.20.0：允许 state.activeGroup = null（"无选中"状态），此时所有渲染归零。
     ─────────────────────────────────────────────────────────────── */
  const trailGroup = HTM_APP.trailGroupOf;
  function isTrailActive(trail) {
    return selectors.isTrailActive(trail);
  }
  function getGroups() {
    const seen = new Set();
    const groups = [];
    if(projectSelectors.trails().some(t => trailGroup(t) === '默认')) { groups.push('默认'); seen.add('默认'); }
    projectSelectors.trails().forEach(t => {
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
    stateActions.setActiveGroup(groupName);
    if(groupName == null) {
      // 无选中状态：不动 primaryByGroup 记忆值，只是 getter 返回 null
      rebuildAll({ fit: false });
    } else {
      // 校验/回填该组的记忆值
      const inGroup = projectSelectors.trails().filter(t => trailGroup(t) === groupName);
      const memorized = selectors.primaryForGroup(groupName);
      if(!memorized || !inGroup.find(t => t.id === memorized)) {
        // 记忆值失效或不存在 → 挑组内第一条
        stateActions.setGroupPrimary(groupName, inGroup[0] ? inGroup[0].id : null);
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
      stateActions.setPrimaryTrail(trailId);
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
        const isWpMode = selectors.mode() === 'waypoint';
        const iconText = waypointIconMarkup(wp);
        return HTM_APP.buildWaypointMarkerModel({trail, waypoint:wp, isPrimary, waypointMode:isWpMode, color, iconText});
  }

  function drawHighPoints() {
    leafletMarkerRenderer.renderHighPoints(markerRenderController.build().highPoints);
  }

  /* ============ Tooltip ============ */
  const tooltipEl = document.getElementById('tooltip');
  const formatCoordinate = HTM_APP.formatCoordinate;
  const formatTrackPointCoordinates = HTM_APP.formatTrackPointCoordinates;
  const trackPointInspector = HTM_APP.createTrackPointInspectionController({
    renderer:HTM_APP.createLeafletTrackPointInspectionRenderer({leaflet:L, map}),
    nearestIndex:(track, lat, lng) => nearestTrackIdx(track, lat, lng),
  });

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

  function inspectTrackPoint(event, trail) {
    return trackPointInspector.inspect(event, trail);
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
  // Sidebar, itinerary, filters, and map-mode DOM are owned by createSidebarRuntime.

  // KML/ZIP import DOM is owned by createImportRuntime.

  const importRuntime = HTM_APP.createImportRuntime({
    document, HTM_APP, fflate, runtimeContext, trailContentHash, applyChange,
    resetView:options => workspaceController?.resetView(options),
    selectors, projectActions, projectSelectors,
    buildEscapeRoutes:(...args) => kmlProjectBuilder.buildEscapeRoutes(...args),
    parseAndProcessKml:(...args) => kmlProjectBuilder.parseAndProcessKml(...args),
    escapeUiText, t, studioDialogs, getCurrentLang:() => currentLang,
  });
  const {
    addBtn, addModal, addCancel, addStatus, kmlDrop, kmlFile, kmlList,
    projectRestoreBtn, projectFile, PALETTE_LOCAL, fileArchiveAdapter,
    fileImportController, _closeAddModal, handleFileImportEvent, expandZipFiles,
    ensureUniqueTrailId, findDuplicateTrail, renderKmlImportRow,
    bindKmlImportRowEvents, importSingleKml, postImportFinalize, handleFiles,
  } = importRuntime;

  /* ============ Lightbox ============ */
  const lightboxEl = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCap = document.getElementById('lightbox-caption');
  const lightboxController = HTM_APP.createImageLightboxController({
    document, viewport:window, container:lightboxEl, image:lightboxImg, caption:lightboxCap,
  });
  const openLightbox = (src, caption) => lightboxController.open(src, caption);
  const closeLightbox = () => lightboxController.close();
  /* ============ 测距功能（主轨迹上选两点 → 爬升/下降/里程） ============ */
  const measureController = HTM_APP.createMeasureController();
  const measureState = measureController.state;
  const measureTrackCache = new WeakMap();
  const measureStatsCache = new WeakMap();

  function nearestTrackIdxOnPrimary(lat, lng) {
    const main = selectors.primaryTrail(projectSelectors.trails());
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
    const main = selectors.primaryTrail(projectSelectors.trails());
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
    const main = projectSelectors.trails().find(t => t.id === (measureState.trailId || selectors.primaryTrailId()));
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
    const main = selectors.primaryTrail(projectSelectors.trails());
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
        '· projectSelectors.trails() 数:', projectSelectors.trails().length);
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
    const main = projectSelectors.trails().find(t => t.id === (measureState.trailId || selectors.primaryTrailId()));
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
    if(selectors.activeGroup() == null) return [];
    return selectors.trailsInActiveGroup(projectSelectors.trails()).filter(trail => trail.track && trail.track.length);
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
    const selectedId = addEscapeState.referenceTrailId || selectors.primaryTrailId() || '';
    select.replaceChildren();
    escapeReferenceTrails().forEach(trail => {
      const option = document.createElement('option');
      option.value = trail.id;
      option.textContent = trail.name + (trail.id === selectors.primaryTrailId()
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
    const main = selectors.primaryTrail(projectSelectors.trails());
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
    if(!selectors.activeTrailIds().has(trailId)) {
      stateActions.setTrailActive(trailId, true);
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
    const main = selectors.primaryTrail(projectSelectors.trails());
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
    const main = selectors.primaryTrail(projectSelectors.trails());
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
    const main = selectors.primaryTrail(projectSelectors.trails());
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
    const main = selectors.primaryTrail(projectSelectors.trails());
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
    const restored = await storageController.load(selectors.activeGroup());
    if(!restored) return false;
    try {
      const restoredTrails = restored.trails;
      // 兼容旧数据：缺 descent_m 则现场补算
      restoredTrails.forEach(tr => {
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
        if(selectors.autoGenerateEscape() && (!tr.escape_routes || tr.escape_routes.length === 0) && tr.waypoints && tr.track && tr.track.length) {
          const fakePts = tr.track.map(p => ({ lat: p[0], lng: p[1], elev: p[2] || 0 }));
          const others = restoredTrails.filter(t => t.id !== tr.id);
          tr.escape_routes = buildEscapeRoutes(tr.waypoints, fakePts, others);
        }
      });
      projectActions.replaceTrails(restoredTrails, 'storage.restore');
      stateActions.restoreWorkspace({
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
      setMapMode(selectors.mode());
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
      afterRestore:() => syncDisplayControls(),
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
    if(!projectSelectors.trails().length) return;
    const confirmed = await studioDialogs.confirm({
      title:currentLang === 'zh' ? '清空项目' : 'Clear project',
      message:currentLang === 'zh'
        ? `确定清除全部 ${projectSelectors.trails().length} 条轨迹？可通过“编辑 → 撤销”恢复。`
        : `Clear all ${projectSelectors.trails().length} trails? You can restore them with Edit → Undo.`,
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
    if(!projectSelectors.trails().length) { showToast('没有轨迹可导出', 'error'); return; }
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

    const activeCount = projectSelectors.trails().filter(t => isTrailActive(t)).length;
    const items = [
      {
        icon: '📦',
        label: t('export.kmlZip'),
        desc: selectors.activeGroup()
          ? (currentLang === 'zh'
            ? `当前组「${selectors.activeGroup()}」叠加中 ${activeCount} 条 · 可跨设备一键导入`
            : `${activeCount} active trails in “${selectors.activeGroup()}” · ready for cross-device import`)
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
    if(selectors.activeGroup() != null && !selectors.primaryTrailId() && projectSelectors.trails().length) {
      const inGroup = selectors.trailsInActiveGroup(projectSelectors.trails());
      stateActions.setPrimaryTrail((inGroup[0] || projectSelectors.trails()[0]).id);
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
    if(opts.fit && projectSelectors.trails().length) {
      const allLatLngs = [];
      projectSelectors.trails().forEach(t => t.track.forEach(p => allLatLngs.push([p[0], p[1]])));
      if(allLatLngs.length) {
        fitWorkspaceBounds(L.latLngBounds(allLatLngs), {padding:[40,40]}, {source:'rebuild'});
      }
    }
  }


  const TAG_RULES_JS = HTM_APP.KML_WAYPOINT_RULES;
  kmlProjectBuilder = HTM_APP.createKmlProjectBuilder({
    readTrails:projectSelectors.trails,
    readAutoGenerateEscape:selectors.autoGenerateEscape,
  });
  const {
    extractKmlParseModelInput, parseKml, processTrack, buildEscapeRoutes,
    buildDayMeta, generateNextTrailId, parseAndProcessKml,
  } = kmlProjectBuilder;

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
    if(projectSelectors.trails().length === 0) {
      const ok = await loadFromStorage();
      if(ok) {
        showToast(`✓ 从浏览器恢复 ${projectSelectors.trails().length} 条轨迹`);
        restored = true;
      }
    }
    // 防御性兜底：保证 activeTrails 至少包含全部已加载轨迹
    if(projectSelectors.trails().length && selectors.activeTrailIds().size === 0) {
      stateActions.replaceActiveTrails(projectSelectors.trails().map(t => t.id));
    }
    // 每次打开工作台都进入一个有效轨迹组；缓存中的“无分组”仅保留在当前会话。
    if(projectSelectors.trails().length && (selectors.activeGroup() == null
        || !projectSelectors.trails().some(trail => trailGroup(trail) === selectors.activeGroup()))) {
      stateActions.setActiveGroup(trailGroup(projectSelectors.trails()[0]));
    }
    // 兜底主轨迹
    // v1.21.0：兜底选当前组内的第一条（而不是 projectSelectors.trails()[0]，可能不在当前组）
    if(selectors.activeGroup() != null && !selectors.primaryTrailId() && projectSelectors.trails().length) {
      const inGroup = selectors.trailsInActiveGroup(projectSelectors.trails());
      stateActions.setPrimaryTrail((inGroup[0] || projectSelectors.trails()[0]).id);
    }
    stateActions.setMode('elev');
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
    if(_wpPanel) _wpPanel.style.display = selectors.mode() === 'waypoint' ? 'block' : 'none';
    // v1.31.0：从 IndexedDB 恢复的场景，rebuildAll 里的 fit 可能被后续绑定/UI 覆盖，
    //         这里显式再做一次 resetView，保证视野贴到主轨迹上
    const resetPerformed = restored ? await schedulePostRestoreReset() : false;
    commandRegistry.notifyChanged();
    return {restored, resetPerformed};
  }
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

  // Sidebar collapse remains a UI concern; map fitting consumes it through callbacks.
  const _sidebar = document.getElementById("sidebar");
  const _sbClose = document.getElementById("sidebar-close");
  function toggleSidebar(open) {
    if(open === undefined) open = _sidebar.classList.contains("collapsed");
    _sidebar.classList.toggle("collapsed", !open);
    setTimeout(() => {
      map?.invalidateSize();
      refreshElevBar?.();
    }, 280);
    const mini = document.getElementById("primary-mini");
    if(!mini) return;
    if(_sidebar.classList.contains("collapsed")) {
      const hasPrimary = buildPrimaryMini?.() || false;
      mini.style.display = hasPrimary ? "block" : "none";
      if(hasPrimary) schedulePrimaryMiniPositionApply?.(mini);
    } else mini.style.display = "none";
  }
  if(_sbClose) _sbClose.addEventListener("click", () => toggleSidebar(false));

  workspaceController = HTM_APP.createWorkspaceController({
    trails:() => projectSelectors.trails(),
    selectors,
    stateActions,
    getMeasureState:() => measureState,
    trailRevision:runtimeTrailRevision,
    leaflet:L,
    map,
    requestFit:request => renderScheduler.requestFit(request),
    invalidateWorkspace:() => invalidateRender(
      HTM_APP.RENDER_DIRTY.TRACKS | HTM_APP.RENDER_DIRTY.MARKERS
      | HTM_APP.RENDER_DIRTY.SIDEBAR | HTM_APP.RENDER_DIRTY.LEGEND
      | HTM_APP.RENDER_DIRTY.CHART,
    ),
    persist:saveToStorage,
    renderStats:renderRuntimeStats,
    shouldCloseSidebar:() => HTM_APP.shouldCloseSidebarForFit(
      window.innerWidth,
      !_sidebar || _sidebar.classList.contains("collapsed"),
    ),
    closeSidebar:() => toggleSidebar(false),
    prefersReducedMotion,
  });
  const cachedTrailBounds = trail => workspaceController.cachedTrailBounds(trail);
  const resetView = options => workspaceController.resetView(options);
  const fitWorkspaceBounds = (bounds, options = {}, meta = {}) =>
    workspaceController.fitBounds(bounds, options, meta);

  const sidebarRuntime = HTM_APP.createSidebarRuntime({
    document, window, DAY_ITINERARY_WAYPOINT_TAGS, HTM_APP, HTM_CORE, L,
    STUDIO_COMMANDS, TAG_RULES_JS, applyChange, baseLayers,
    beginRuntimeInteraction, cancelRuntimeInteraction, clearEscape, commandRegistry,
    createFloatingPanelPositionController, createWorkbenchIcon,
    getCurrentLang:() => currentLang, dayPalette, deleteTrail, t,
    stateActions, selectors, projectActions, projectSelectors, dispatchStudioCommand, downloadTrailKML, drawTracks, drawWaypoints,
    escapeController, escapeUiText, fitWorkspaceBounds,
    getCurrentBase:() => currentBase,
    setCurrentBase:value => { currentBase = value; },
    getGroups, hideMeasureElevReadout, interactionManager, isTrailActive, map,
    markTrailRevision, measureMarker, measureState, recordProjectEdit, refreshElevBar,
    requestSegmentExit, reverseTrail, runtimeContext, sanitizeExternalHttpUrl,
    sanitizeHexColor, saveToStorage, setMeasureElevHint, showEscape, showToast,
    studioDialogs, switchGroup, tagColors, toggleSidebar, toggleTrailActive,
    toggleTrailBatch, toggleTrailExpanded, trailController, trailGroup,
    waypointIconMarkup, wpMarkers,
  });
  const {
    renderPrimaryCard, primaryMiniController, clampPrimaryMiniPosition,
    applyPrimaryMiniPosition, schedulePrimaryMiniPositionApply, savePrimaryMiniPosition,
    bindPrimaryMiniDrag, buildPrimaryMini, floatingPanelController,
    initFloatingPanelPositions, updateModeTagTitle, buildTrailThumbnail,
    renderGroupTabs, renderBatchToolbar, moveBatchToGroup, trailCardHeaderHtml,
    trailCardExpandedHtml, isDetailButtonTarget, handleTrailCardClick,
    editTrailSource, editTrailName, editTrailId, confirmDeleteTrail,
    handleTrailDetailClick, handleTrailGroupChange, renderTrailCard, buildTrailList,
    buildFilterGrid, dayPreviewController, dayPreviewState, clearDaySegmentPreview,
    handleDayPreviewInteractionEvent, showDaySegmentPreview, buildDaysTab,
    selectedNearbyWaypointRefs, appendNearbyWaypointPicker, appendEscapeTools,
    applyEscapeFilters, appendEscapeRoutesForDay, buildLegend, activateSidebarTab,
    setMapMode, enterInteractionRenderMode, buildWaypointModeTagGrid, syncDisplayControls,
  } = sidebarRuntime;

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
    const main = selectors.primaryTrail(projectSelectors.trails());
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
    const main = selectors.primaryTrail(projectSelectors.trails());
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
    const trail = selectors.primaryTrail(projectSelectors.trails());
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
    const ownerTrail = selectors.primaryTrail(projectSelectors.trails()) || trails[0];
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
    if(projectSelectors.trails().length < 2) {
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
        for(const trail of projectSelectors.trails()) {
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
    const trails = requested.trailIds.map(id => projectSelectors.trails().find(trail => trail.id === id)).filter(Boolean);
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
    if(!selectors.primaryTrailId()) {
      await studioDialogs.info({
        title:currentLang === 'zh' ? '无法反向' : 'Cannot reverse',
        message:t('reverse.noPrimary') || '无主轨迹',
      });
      return false;
    }
    reverseTrail(selectors.primaryTrailId());
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
    const hasTrails = () => projectSelectors.trails().length > 0;
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
      register(STUDIO_COMMANDS.TRAIL_STITCH, stitchTrailsCommand, {enabled:() => projectSelectors.trails().length >= 2}),
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
        checked:() => selectors.mode() === 'elev',
      }),
      register(STUDIO_COMMANDS.MODE_WAYPOINT, () => setMapMode('waypoint'), {
        checked:() => selectors.mode() === 'waypoint',
      }),
      register(STUDIO_COMMANDS.WORKSPACE_GROUPS, () => activateSidebarTab('groups')),
      register(STUDIO_COMMANDS.WORKSPACE_TRAILS, () => activateSidebarTab('trails')),
      register(STUDIO_COMMANDS.WORKSPACE_ITINERARY, () => activateSidebarTab('days')),
    ];
    commandRegistry.notifyChanged();
    return disposers;
  }

  const runtimeCommandDisposers = registerRuntimeCommands();

  const bootPromise = _boot();
  if(studioTestMode) window.__HTM_BOOT_READY__ = bootPromise;

  initFloatingPanelPositions();
  invalidateRender(
    HTM_APP.RENDER_DIRTY.TRACKS
    | HTM_APP.RENDER_DIRTY.MARKERS
    | HTM_APP.RENDER_DIRTY.SIDEBAR
    | HTM_APP.RENDER_DIRTY.DAYS
    | HTM_APP.RENDER_DIRTY.LEGEND
    | HTM_APP.RENDER_DIRTY.CHART,
  );


  if(studioTestMode) {
    window.__HTM_RUNTIME_INSPECTOR__ = HTM_APP.createReadonlyRuntimeInspector({
      "APP_VERSION":() => APP_VERSION, "DATA":() => projectSelectors.snapshot(), "HTM_APP":() => HTM_APP,
      "HTM_CORE":() => HTM_CORE, "L":() => L, "_doSave":() => _doSave,
      "_elevBarData":() => _elevBarData, "addEscapeCommit":() => addEscapeCommit, "addEscapeEnter":() => addEscapeEnter,
      "addEscapeState":() => addEscapeState, "addManualWaypointAt":() => addManualWaypointAt, "addMeasureEndpointMarker":() => addMeasureEndpointMarker,
      "addWaypointState":() => addWaypointState, "addWpMarker":() => addWpMarker, "applyChange":() => applyChange,
      "applyMeasureEndpointHit":() => applyMeasureEndpointHit, "applyPrimaryMiniPosition":() => applyPrimaryMiniPosition, "bindKmlImportRowEvents":() => bindKmlImportRowEvents,
      "bindMeasureEndpointDrag":() => bindMeasureEndpointDrag, "bindPrimaryMiniDrag":() => bindPrimaryMiniDrag, "buildDayMeta":() => buildDayMeta,
      "buildDayPreviewRenderModel":() => buildDayPreviewRenderModel, "buildDaysTab":() => buildDaysTab, "buildFilterGrid":() => buildFilterGrid,
      "renderPrimaryCard":() => renderPrimaryCard, "buildLegend":() => buildLegend, "buildMeasureSegmentRenderModel":() => buildMeasureSegmentRenderModel,
      "buildSegmentLayerModel":() => buildSegmentLayerModel, "buildTrackLatLngs":() => buildTrackLatLngs, "buildTrailList":() => buildTrailList,
      "clearDaySegmentPreview":() => clearDaySegmentPreview, "clearStorage":() => clearStorage, "computeCumulativeDistance":() => computeCumulativeDistance,
      "computeMeasureStats":() => computeMeasureStats, "computeTrailStats":() => computeTrailStats, "createPrimaryTrackDragSnapper":() => createPrimaryTrackDragSnapper,
      "dayPreviewController":() => dayPreviewController, "dayPreviewState":() => dayPreviewState, "deleteTrail":() => deleteTrail,
      "dispatchRuntimeInteraction":() => dispatchRuntimeInteraction, "stateActions":() => stateActions, "drawElevBar":() => drawElevBar,
      "drawTracks":() => drawTracks, "drawWaypoints":() => drawWaypoints, "elevCanvas":() => elevCanvas,
      "elevRatioColor":() => elevRatioColor, "elevationCanvasRenderer":() => elevationCanvasRenderer, "ensureUniqueTrailId":() => ensureUniqueTrailId,
      "enterAddWaypointMode":() => enterAddWaypointMode, "enterInteractionRenderMode":() => enterInteractionRenderMode, "escapeController":() => escapeController,
      "exitAddWaypointMode":() => exitAddWaypointMode, "expandZipFiles":() => expandZipFiles, "fflate":() => fflate,
      "fileExportController":() => fileExportController, "findDuplicateTrail":() => findDuplicateTrail, "fitWorkspaceBounds":() => fitWorkspaceBounds,
      "floatingPanelController":() => floatingPanelController, "generateNextTrailId":() => generateNextTrailId, "getMeasureStatsCache":() => getMeasureStatsCache,
      "handleFiles":() => handleFiles, "handleMeasureInteractionEvent":() => handleMeasureInteractionEvent, "handleTrailCardClick":() => handleTrailCardClick,
      "handleTrailDetailClick":() => handleTrailDetailClick, "handleTrailGroupChange":() => handleTrailGroupChange, "haversine":() => haversine,
      "hideMeasureElevReadout":() => hideMeasureElevReadout, "hideTooltip":() => hideTooltip, "importSingleKml":() => importSingleKml,
      "initFloatingPanelPositions":() => initFloatingPanelPositions, "interactionManager":() => interactionManager, "isDetailButtonTarget":() => isDetailButtonTarget,
      "isTrailActive":() => isTrailActive, "loadFromStorage":() => loadFromStorage, "map":() => map,
      "markTrailRevision":() => markTrailRevision, "measureCompute":() => measureCompute, "measureController":() => measureController,
      "measureEnter":() => measureEnter, "measureExit":() => measureExit, "measureMarker":() => measureMarker,
      "measurePointFromHit":() => measurePointFromHit, "measureReverse":() => measureReverse, "measureState":() => measureState,
      "moveBatchToGroup":() => moveBatchToGroup, "nearestTrackIdx":() => nearestTrackIdx, "nearestTrackIdxNearPrimary":() => nearestTrackIdxNearPrimary,
      "openDB":() => openDB, "parseAndProcessKml":() => parseAndProcessKml, "pointFromTrackIndex":() => pointFromTrackIndex,
      "postImportFinalize":() => postImportFinalize, "primaryMiniController":() => primaryMiniController, "projectArchiveController":() => projectArchiveController,
      "projectHistoryController":() => projectHistoryController, "queueMeasureLiveUpdate":() => queueMeasureLiveUpdate, "rebuildAll":() => rebuildAll,
      "redrawSegmentLayer":() => redrawSegmentLayer, "refreshElevBar":() => refreshElevBar, "renderBatchToolbar":() => renderBatchToolbar,
      "renderGroupTabs":() => renderGroupTabs, "renderKmlImportRow":() => renderKmlImportRow, "renderMeasureSegmentLine":() => renderMeasureSegmentLine,
      "renderRuntimeStats":() => renderRuntimeStats, "renderScheduler":() => renderScheduler, "runtimeCommandDisposers":() => runtimeCommandDisposers, "renderTrailCard":() => renderTrailCard, "resetMeasureElevReadout":() => resetMeasureElevReadout,
      "resetView":() => resetView, "restoreProjectFile":() => restoreProjectFile, "revalidateRuntimeInteractionOwner":() => revalidateRuntimeInteractionOwner,
      "saveToStorage":() => saveToStorage, "schedulePostRestoreReset":() => schedulePostRestoreReset, "schedulePrimaryMiniPositionApply":() => schedulePrimaryMiniPositionApply,
      "segmentApply":() => segmentApply, "segmentRestore":() => segmentRestore, "segmentController":() => segmentController,
      "segmentDeleteDay":() => segmentDeleteDay, "segmentEnter":() => segmentEnter, "segmentExit":() => segmentExit,
      "segmentInsertPoint":() => segmentInsertPoint, "requestSegmentExit":() => requestSegmentExit, "segmentState":() => segmentState,
      "setLang":() => setLang, "setMapMode":() => setMapMode, "setMeasureElevHint":() => setMeasureElevHint,
      "showDaySegmentPreview":() => showDaySegmentPreview, "showExportMenu":() => showExportMenu, "showMeasureElevReadout":() => showMeasureElevReadout,
      "showToast":() => showToast, "showTooltip":() => showTooltip, "state":() => selectors.snapshot(),
      "stitchState":() => stitchState, "stitchLayer":() => stitchLayer, "requestStitchExit":() => requestStitchExit,
      "switchGroup":() => switchGroup, "t":() => t,
      "toggleSidebar":() => toggleSidebar, "toggleTrailActive":() => toggleTrailActive, "toggleTrailBatch":() => toggleTrailBatch,
      "toggleTrailExpanded":() => toggleTrailExpanded, "trackLayer":() => trackLayer, "trailCardExpandedHtml":() => trailCardExpandedHtml,
      "trailCardHeaderHtml":() => trailCardHeaderHtml, "trailController":() => trailController, "updateElevBadges":() => updateElevBadges,
      "updateSegmentUI":() => updateSegmentUI, "waypointController":() => waypointController, "waypointIcon":() => waypointIcon,
      "waypointIconMarkup":() => waypointIconMarkup, "window":() => window, "wpMarkers":() => wpMarkers,
    });
  }

  return bootPromise;
}
