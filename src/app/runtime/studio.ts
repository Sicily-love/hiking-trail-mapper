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
import { createMeasurePanelController } from '../../ui/measure-panel.ts';
import { createSidebarCollapseController } from '../../ui/sidebar/collapse-controller.ts';
import { createToastController } from '../../ui/toast.ts';
import { createVersionBadgeController } from '../../ui/version-badge.ts';
import { createWorkspaceTitleController } from '../../ui/workspace-title.ts';
import { createStitchRuntime } from '../../features/stitch/runtime-owner.ts';
import { createElevationRuntime } from '../../features/elevation/runtime-owner.ts';
import { createLocalizationRuntime } from '../../features/localization/runtime-owner.ts';
import { createRuntimeInteractionOwner } from './interaction-owner.ts';
import type {RuntimeTrail, StudioBrowserWindow} from './types.ts';

export interface StudioBootResult {
  restored: boolean;
  resetPerformed: boolean;
}

export interface StudioRuntimeDependencies {
  document: Document;
  commands: HTM_APP.CommandRegistry<void>;
  dialogs: HTM_APP.DialogController;
  [name: string]: any;
}

/** Starts the browser runtime directly inside the Vite module graph. */
export function startStudioRuntime(
  dependencies: StudioRuntimeDependencies,
): Promise<StudioBootResult> {
  const document:any = dependencies.document;
  const defaultView = document.defaultView as StudioBrowserWindow | null;
  if(!defaultView) throw new Error('Studio runtime requires a document with a window');
  const window:StudioBrowserWindow = defaultView;
  const studioTestMode = new URL(window.location.href).searchParams.has('studio-test');
  const commandRegistry:any = dependencies.commands;
  const studioDialogs:any = dependencies.dialogs;
  const STUDIO_COMMANDS = HTM_APP.STUDIO_COMMANDS;
  const L = window.L;
  const fflate = window.fflate;
  if(!L) throw new Error('Leaflet runtime is missing');
  if(!fflate) throw new Error('fflate runtime is missing');

  const initialProject:HTM_APP.ProjectState<RuntimeTrail> = {
    title:'徒步路线地图', trails:[], calc_method:{},
  };

  function dispatchStudioCommand(commandId: any) {
    try {
      const result = commandRegistry.dispatch(commandId);
      if(result && typeof result.then === 'function') {
        result.catch((error: any) => console.error(`Command failed: ${commandId}`, error));
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
  let syncWorkspaceTitle = () => {};
  const localizationRuntime = createLocalizationRuntime({
    document,
    storage:(() => {
      try { return window.localStorage; } catch { return null; }
    })(),
    browserLanguage:window.navigator.language,
    resolveLanguage:HTM_APP.resolveLocalizationLanguage,
    translate:HTM_APP.translateMessage,
    rebuild:() => rebuildAll({fit:false}),
    refresh:() => {
      refreshElevBar();
      buildPrimaryMini();
      renderPrimaryCard();
      updateModeTagTitle();
      syncWorkspaceTitle();
    },
  });
  const getCurrentLang = localizationRuntime.language;
  const t = localizationRuntime.translate;
  const setLang = localizationRuntime.setLanguage;
  const applyI18n = localizationRuntime.apply;

  /* ============ Changelog ============ */

  function showChangelog() {
    return studioDialogs.content(HTM_APP.buildChangelogDialogModel(
      getCurrentLang(),
      t('changelog.title'),
      t('changelog.close'),
    ));
  }
  async function showStorageInfo() {
    const storageApi = navigator.storage;
    let snapshot:any = {
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

    const action = await studioDialogs.content(HTM_APP.buildStorageDialogModel(getCurrentLang(), snapshot));
    if(action !== 'persist' || !storageApi || !storageApi.persist) return;
    try {
      const persisted = await storageApi.persist();
      if(persisted) {
        showToast(t('storage.persisted'));
        return showStorageInfo();
      }
      await studioDialogs.info({
        title:getCurrentLang() === 'zh' ? '无法持久化存储' : 'Persistent storage unavailable',
        message:getCurrentLang() === 'zh'
          ? '请求被拒绝。部分浏览器需要先将站点加入书签或提高访问频率。'
          : 'The request was denied. Some browsers require bookmarking or repeated site use first.',
      });
    } catch(error) {
      await studioDialogs.info({
        title:getCurrentLang() === 'zh' ? '存储请求失败' : 'Storage request failed',
        message:error instanceof Error ? error.message : String(error),
        danger:true,
      });
    }
  }
  /* ============ State ============ */
  const appStateStore:any = HTM_APP.createAppStateStore(initialProject);
  const selectors:any = HTM_APP.createAppStateSelectors(() => appStateStore.snapshot());
  const stateActions:any = HTM_APP.createAppStateActions(appStateStore);
  const projectStore:any = HTM_APP.createProjectStore(initialProject);
  const projectActions:any = HTM_APP.createProjectActions(projectStore);
  const projectSelectors:any = HTM_APP.createProjectSelectors(() => projectStore.snapshot());
  appStateStore.subscribe(() => commandRegistry.notifyChanged());
  const interactionManager = HTM_APP.createStudioInteractionManager();
  const interactionRuntime = createRuntimeInteractionOwner({
    manager:interactionManager,
    findTrail:(trailId: string) => projectSelectors.trailById(trailId),
    primaryTrailId:() => selectors.primaryTrailId(),
    sameOwner:HTM_APP.sameInteractionOwner,
    notifyBlocked:() => showToast(
      getCurrentLang() === 'zh'
        ? '请先应用或退出当前分段修改'
        : 'Apply or discard the current segment changes first',
      'info',
    ),
    notifyCommands:() => commandRegistry.notifyChanged(),
  });
  const runtimeTrailRevision = interactionRuntime.trailRevision;
  const markTrailRevision = interactionRuntime.markTrailRevision;
  const runtimeInteractionOwner = interactionRuntime.interactionOwner;
  const beginRuntimeInteraction = interactionRuntime.begin;
  const cancelRuntimeInteraction = interactionRuntime.cancel;
  const isRuntimeInteractionCurrent = interactionRuntime.isCurrent;
  const setRuntimeInteractionPhase = interactionRuntime.setPhase;
  const scheduleRuntimeInteractionFrame = interactionRuntime.scheduleFrame;
  const runtimeInteractionOwnerIsCurrent = interactionRuntime.ownerIsCurrent;
  const revalidateRuntimeInteractionOwner = interactionRuntime.revalidate;
  const dispatchRuntimeInteraction = interactionRuntime.dispatch;

  const renderRuntimeStats:any = {
    frames: 0,
    lastTimestamp: null,
    lastMask: 0,
    phases: {tracks:0, markers:0, sidebar:0, days:0, legend:0, chart:0, fit:0},
    elevation: {sourcePoints:0, renderedPoints:0},
    elevationBands: 0,
    markers: {add:0, update:0, remove:0, keep:0},
    fit: {requested:0, applied:0, superseded:0, lastEpoch:0, lastResetEpoch:0},
  };
  let workspaceController:any = null;
  let kmlProjectBuilder:any = null;

  function recordRenderPhase(context: any) {
    if(renderRuntimeStats.lastTimestamp !== context.timestamp) {
      renderRuntimeStats.frames += 1;
      renderRuntimeStats.lastTimestamp = context.timestamp;
    }
    renderRuntimeStats.lastMask = context.frameMask;
    renderRuntimeStats.phases[context.phase] += 1;
  }

  const renderScheduler = new HTM_APP.RenderScheduler({
    handlers: {
      tracks(context: any) { recordRenderPhase(context); renderTracksNow(); },
      markers(context: any) { recordRenderPhase(context); renderWaypointsNow(); },
      sidebar(context: any) { recordRenderPhase(context); renderSidebarNow(); },
      days(context: any) { recordRenderPhase(context); renderDaysNow(); },
      legend(context: any) { recordRenderPhase(context); renderLegendNow(); },
      chart(context: any) { recordRenderPhase(context); renderElevationChartNow(); },
      fit(context: any) { recordRenderPhase(context); workspaceController?.executeFit(context); },
    },
  });
  const runtimeContext:any = HTM_APP.createRuntimeContext({
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

  function invalidateRender(mask: any) {
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
  function applyChange(opts: any = {}) {
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
  function toggleTrailActive(trailId: any) {
    stateActions.setTrailActive(trailId, !selectors.activeTrailIds().has(trailId));
    // v1.21.0：主轨迹兜底只在当前组内挑
    if(selectors.activeGroup() != null && !selectors.activeTrailIds().has(selectors.primaryTrailId())) {
      const inGroupActive = [...selectors.activeTrailIds()].filter((id: any) => {
        const tr = projectSelectors.trails().find((t: any) => t.id === id);
        return tr && trailGroup(tr) === selectors.activeGroup();
      });
      stateActions.setPrimaryTrail(inGroupActive[0] || null);
    }
  }

  /** 切换详情展开态 */
  function toggleTrailExpanded(trailId: any) { stateActions.toggleExpanded(trailId); }

  /** 切换批量选中态 */
  function toggleTrailBatch(trailId: any) { stateActions.toggleBatch(trailId); }


  /* v1.14.1：分组支持 ─────────────────────────────────────────────
     trail.group（字符串）标识轨迹所属分组，未设置时默认'默认'。
     只有 state.activeGroup 组内的轨迹参与地图渲染/统计/行程等一切功能。
     v1.20.0：允许 state.activeGroup = null（"无选中"状态），此时所有渲染归零。
     ─────────────────────────────────────────────────────────────── */
  const trailGroup = HTM_APP.trailGroupOf;
  function isTrailActive(trail: any) {
    return selectors.isTrailActive(trail);
  }
  function getGroups() {
    const seen = new Set();
    const groups = [];
    if(projectSelectors.trails().some((t: any) => trailGroup(t) === '默认')) { groups.push('默认'); seen.add('默认'); }
    projectSelectors.trails().forEach((t: any) => {
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
  function switchGroup(groupName: any) {
    stateActions.setActiveGroup(groupName);
    if(groupName == null) {
      // 无选中状态：不动 primaryByGroup 记忆值，只是 getter 返回 null
      rebuildAll({ fit: false });
    } else {
      // 校验/回填该组的记忆值
      const inGroup = projectSelectors.trails().filter((t: any) => trailGroup(t) === groupName);
      const memorized = selectors.primaryForGroup(groupName);
      if(!memorized || !inGroup.find((t: any) => t.id === memorized)) {
        // 记忆值失效或不存在 → 挑组内第一条
        stateActions.setGroupPrimary(groupName, inGroup[0] ? inGroup[0].id : null);
      }
      rebuildAll({ fit: false });
      // v1.22.0：切组时自动执行完整复位（比原来只是 fitBounds 更彻底：会重新算 primary + 重绘）
      if(inGroup.length > 0 && typeof resetView === 'function') resetView({});
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
  const measurePanelController = createMeasurePanelController({
    document,
    mapContainer:map.getContainer(),
  });
  // 把版本号塞进 Leaflet attribution prefix，与 Leaflet/Esri 同一行同一基线
  // 版本号独立浮层（独立背景框 + 与 Leaflet attribution 完全同款样式）
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank">Leaflet</a>');
  createVersionBadgeController({
    document,
    mapContainer:map.getContainer(),
    version:APP_VERSION,
    title:'点击查看更新日志',
    onActivate:() => { void showChangelog(); },
  });
  // v1.14.1：撤销 v1.13.3 的 ctrl/meta+wheel 放行
  //   原因：trackpad pinch-zoom 被浏览器映射成 ctrl+wheel；放行后双指捏合在地图上触发的是
  //   浏览器整页缩放而不是地图缩放，反而把"地图缩放"功能搞坏了。
  //   用户要做浏览器整页缩放可以用 Cmd/Ctrl +/-/0 快捷键或菜单，不必从地图区域捕捉。
  const _toolbarEl = document.getElementById('map-toolbar');
  if(_toolbarEl) {
    L.DomEvent.disableClickPropagation(_toolbarEl);
    L.DomEvent.disableScrollPropagation(_toolbarEl);
    // 进一步：每个按钮再单独阻止 dblclick（双击放大 = map 的 doubleClickZoom）
    _toolbarEl.querySelectorAll('button').forEach((btn: any) => {
      btn.addEventListener('dblclick', (e: any) => { e.preventDefault(); e.stopPropagation(); });
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

  /* ============ Color helpers ============ */
  // 天数分色：柔和但有区分度，适合卫星图与米色面板上的连续天数阅读
  const dayPalette = ['#2F6B5F','#D96C4A','#E1A93B','#5577B8','#8A6BBE','#C45D83','#5E9F65','#C58B54'];

  /* ============ Draw Track ============ */
  const mapRenderController = HTM_APP.createMapRenderController(runtimeContext);
  const leafletTrackRenderer = HTM_APP.createLeafletTrackRenderer({
    leaflet:L,
    trackLayer,
    networkLayer,
    requestFrame:(callback: any) => requestAnimationFrame(callback),
    cancelFrame:(handle: any) => cancelAnimationFrame(handle),
    interactionBlocked:() => interactionManager.current.kind !== 'idle',
    onHover:(event: any, model: any) => {
      const track = model.trail.track;
      const i = nearestTrackIdx(track, event.latlng.lat, event.latlng.lng);
      showTooltip(event, track[i], track[Math.min(i + 1, track.length - 1)], model.trail, false);
    },
    onHoverEnd:() => hideTooltip(),
    onInspectPoint:(event: any, model: any) => inspectTrackPoint(event, model.trail),
    onSelectTrail:(trailId: any) => {
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
  function nearestTrackIdx(track: any, lat: any, lng: any) {
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
  const tagColors:Record<string, string> = {
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
  const tagIcons:Record<string, string> = {
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
  function waypointIcon(wpOrTag: any) {
    const tag = typeof wpOrTag === 'string' ? wpOrTag : (wpOrTag && wpOrTag.tag);
    return tagIcons[tag] || (wpOrTag && wpOrTag.icon) || '📍';
  }
  const waypointVectorIconNames:Record<string, string> = {
    fork:'git-fork',
    warn:'triangle-alert',
    other:'map-pin',
  };
  function waypointIconMarkup(wpOrTag: any, className: any = '') {
    const tag = typeof wpOrTag === 'string' ? wpOrTag : (wpOrTag && wpOrTag.tag);
    const vectorName = waypointVectorIconNames[tag];
    if(vectorName) {
      return createWorkbenchIcon(document, vectorName as any, {
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
    onWaypointClick:(event: any, model: any) => pinWpCard(event, model.waypoint, model.trail),
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
      getCurrentLang(),
      APP_VERSION,
      t('help.title'),
      t('changelog.close'),
    ));
  }
  function addWpMarker(trail: any, wp: any, isPrimary: any) {
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
    nearestIndex:(track: any, lat: any, lng: any) => nearestTrackIdx(track, lat, lng),
  });

  /* ============ Waypoint Photo Hover ============ */
  const wpPhotoEl = document.getElementById('wp-photo-tip');
  const escapeUiText = escapeHtmlText;
  function pinWpCard(e: any, wp: any, trail: any) {
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
    if(closeBtn) closeBtn.addEventListener('click', (ev: any) => { ev.stopPropagation(); hideWpPhoto(); });
    // 图片点击放大
    const imgEl = document.getElementById('pin-card-img');
    if(imgEl) imgEl.addEventListener('click', (ev: any) => {
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

  function showTooltip(e: any, a: any, b: any, trail: any, heat: any) {
    // a[4] = 累计爬升，通过 trail 反查累计下降
    let descVal = '-';
    if(trail && trail._descCum && a[3] !== undefined) {
      // 找最近索引的累计下降
      const idx = trail.track ? trail.track.findIndex((p: any) => p[3] >= a[3]) : -1;
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

  function inspectTrackPoint(event: any, trail: any) {
    return trackPointInspector.inspect(event, trail);
  }
  /* ============ Escape ============ */
  const escapeController:any = HTM_APP.createEscapeController(runtimeContext, {
    markRevision:markTrailRevision,
  });
  const addEscapeState:any = escapeController.state;

  function showEscape(trailId: any, escapeId: any) {
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
    document.querySelectorAll('.escape-item').forEach((el: any) => el.classList.remove('active'));
  }
  /* ============ Build sidebar ============ */
  // Sidebar, itinerary, filters, and map-mode DOM are owned by createSidebarRuntime.

  // KML/ZIP import DOM is owned by createImportRuntime.

  const importRuntime = HTM_APP.createImportRuntime({
    document, HTM_APP, fflate, runtimeContext, trailContentHash, applyChange,
    resetView:(options: any) => workspaceController?.resetView(options),
    selectors, projectActions, projectSelectors,
    buildEscapeRoutes:(...args: any[]) => kmlProjectBuilder.buildEscapeRoutes(...args),
    parseAndProcessKml:(...args: any[]) => kmlProjectBuilder.parseAndProcessKml(...args),
    escapeUiText, t, studioDialogs, getCurrentLang,
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
  const openLightbox = (src: any, caption: any) => lightboxController.open(src, caption);
  const closeLightbox = () => lightboxController.close();
  /* ============ 测距功能（主轨迹上选两点 → 爬升/下降/里程） ============ */
  const measureController:any = HTM_APP.createMeasureController();
  const measureState:any = measureController.state;
  const measureTrackCache = new WeakMap();
  const measureStatsCache = new WeakMap();

  function nearestTrackIdxOnPrimary(lat: any, lng: any) {
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

  function nearestTrackIdxNearPrimary(lat: any, lng: any, centerIdx: any, windowSize: any = 700) {
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

  function nearestTrackIdxOnTrail(trail: any, lat: any, lng: any, centerIdx: any = null, windowSize: any = 1000) {
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

  function measurePointFromHit(hit: any) {
    const p = hit.point;
    return { idx: hit.idx, lat: p[0], lng: p[1], elev: p[2] || 0, km: p[3] || 0 };
  }


  function getMeasureStatsCache(main: any) {
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

  function measureRangeMaxElev(cache: any, i1: any, i2: any) {
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

  function measureRangeMinElev(cache: any, i1: any, i2: any) {
    if(!cache) return 0;
    const { elevs } = cache;
    let minE = Infinity;
    for(let i=i1; i<=i2; i++) {
      if(elevs[i] < minE) minE = elevs[i];
    }
    return minE;
  }

  function computeMeasureStatsFromCache(cache: any, startIdx: any, endIdx: any) {
    if(!cache || !cache.elevs || !cache.elevs.length) return null;
    const fakeTrack:any = { length: cache.elevs.length };
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

  function computeMeasureStats(a: any, b: any) {
    const main = projectSelectors.trails().find((t: any) => t.id === (measureState.trailId || selectors.primaryTrailId()));
    if(!main || !main.track || !a || !b) return null;
    const cache = getMeasureStatsCache(main);
    if(!cache) return null;
    return computeMeasureStatsFromCache(cache, a.idx, b.idx);
  }


  function createPrimaryTrackDragSnapper(marker: any, opts: any = {}) {
    let latestLatLng:any = null;
    let frameId = 0;
    let frameTask:any = null;
    const raf = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb: any) => setTimeout(cb, 16);
    const cancelRaf = typeof cancelAnimationFrame === 'function'
      ? cancelAnimationFrame
      : clearTimeout;

    function resolveLatLng(ll: any) {
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
      schedule(ev: any) {
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

  function handleMeasureTap(event: any, session: any) {
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

    const commitHit = (hit: any) => {
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

  function handleMeasureInteractionEvent(event: any, session: any) {
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
      onCancel: (opts: any) => measureExit(opts),
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
    measurePanelController.enter();
    resetMeasureElevReadout('在主轨迹上点击起点，再点击终点。');
  }

  function measureExit(opts: any = {}) {
    if(!opts.fromManager && cancelRuntimeInteraction('measure', opts.reason || 'cancelled')) return;
    measureController.exit();
    clearMeasureLayer();
    measurePanelController.exit();
    hideMeasureElevReadout();
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

  function measureMarker(lat: any, lng: any, label: any, color: any, opts: any = {}) {
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
    measurePanelController.showReadout();
  }

  function hideMeasureElevReadout() {
    measurePanelController.hideReadout();
  }

  function setMeasureElevHint(html: any) {
    measurePanelController.setHint(html);
  }

  function resetMeasureElevReadout(hintText: any) {
    measurePanelController.reset(hintText || '在主轨迹上点击起点，再点击终点。');
  }


  function renderMeasureSegmentLine(maxPoints: any = 900) {
    if(!measureState.layer || !measureState.ptA || !measureState.ptB) return;
    const main = projectSelectors.trails().find((t: any) => t.id === (measureState.trailId || selectors.primaryTrailId()));
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

  function updateMeasureReadout(loading: any = false) {
    const a = measureState.ptA, b = measureState.ptB;
    if(!a || !b) return;
    if(loading) {
      measurePanelController.update(null, true);
      return;
    }
    const stats = computeMeasureStats(a, b);
    measurePanelController.update(stats);
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


  function applyMeasureEndpointHit(label: any, hit: any, live: any = false) {
    if(!hit) return false;
    const pt = measurePointFromHit(hit);
    const changed = measureController.updateEndpoint(label, pt);
    if(!changed) return false;
    setMeasureElevHint('');
    return true;
  }

  function bindMeasureEndpointDrag(marker: any, label: any) {
    const snapper = createPrimaryTrackDragSnapper(marker, {
      scheduleFrame: (callback: any) => scheduleRuntimeInteractionFrame('measure', callback),
      getCenterIdx: () => {
        const pt = label === 'A' ? measureState.ptA : measureState.ptB;
        return pt ? pt.idx : null;
      },
      onSnap: (hit: any) => {
        dispatchRuntimeInteraction('measure', {type:'drag-snap', endpoint:label, hit});
      },
    });
    marker.on('dragstart', () => {
      dispatchRuntimeInteraction('measure', {type:'drag-start', endpoint:label});
    });
    marker.on('drag', (ev: any) => snapper.schedule(ev));
    marker.on('dragend', (ev: any) => {
      const ll = ev.target.getLatLng();
      const hit = snapper.resolve(ll);
      snapper.cancel();
      dispatchRuntimeInteraction('measure', {type:'drag-end', endpoint:label, hit});
    });
  }

  function addMeasureEndpointMarker(pt: any, label: any, color: any) {
    const marker = measureMarker(pt.lat, pt.lng, label, color, { draggable: true }).addTo(measureState.layer);
    bindMeasureEndpointDrag(marker, label);
    return marker;
  }
  /* ============ 手动添加下撤路线 ============ */

  function escapeReferenceTrails() {
    if(selectors.activeGroup() == null) return [];
    return selectors.trailsInActiveGroup(projectSelectors.trails()).filter((trail: any) => trail.track && trail.track.length);
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
    label.textContent = getCurrentLang() === 'zh' ? '依据轨迹：' : 'Reference trail:';
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
    if(label) label.textContent = getCurrentLang() === 'zh' ? '依据轨迹：' : 'Reference trail:';
    const selectedId = addEscapeState.referenceTrailId || selectors.primaryTrailId() || '';
    select.replaceChildren();
    escapeReferenceTrails().forEach((trail: any) => {
      const option = document.createElement('option');
      option.value = trail.id;
      option.textContent = trail.name + (trail.id === selectors.primaryTrailId()
        ? (getCurrentLang() === 'zh' ? '（主轨迹）' : ' (Primary)')
        : '');
      option.selected = trail.id === selectedId;
      select.append(option);
    });
    select.disabled = select.options.length < 2;
  }

  function resetEscapeSelectionHint() {
    const hint = document.getElementById('addescape-hint');
    if(!hint) return;
    hint.innerHTML = getCurrentLang() === 'zh'
      ? '在所选依据轨迹上点击 <b style="color:#22c55e">起点 A</b>，再点击 <b style="color:#ef4444">终点 B</b>。<br><span style="font-size:10px">A/B 只会吸附到当前选择的轨迹。</span>'
      : 'Click <b style="color:#22c55e">point A</b>, then <b style="color:#ef4444">point B</b> on the selected reference trail.<br><span style="font-size:10px">A/B snap only to that trail.</span>';
  }

  function refreshEscapeDaySelect(selectedDays: any = []) {
    const group = document.getElementById('addescape-day-select');
    if(!group) return [];
    const days = escapeController.availableDays();
    const requested = Array.isArray(selectedDays) ? selectedDays.map(Number) : [Number(selectedDays)];
    const nextDays = days.filter((day: any) => requested.includes(day));
    if(!nextDays.length && days.length) nextDays.push(days[0]);
    group.replaceChildren();
    days.forEach((day: any) => {
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
    if(dayValue) dayValue.textContent = nextDays.length ? nextDays.map((day: any) => `D${day}`).join('、') : '-';
    return nextDays;
  }

  function handleEscapeInteractionEvent(event: any, session: any) {
    if(event.type !== 'tap') return;
    const hit = escapeController.nearestPoint(event.latlng.lat, event.latlng.lng);
    if(!hit) {
      showToast(getCurrentLang() === 'zh' ? '请点击所选依据轨迹附近（2km 内）' : 'Click within 2 km of the selected reference trail', 'error');
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
      onCancel: (opts: any) => addEscapeExit(opts),
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

  function addEscapeExit(opts: any = {}) {
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
  if(escapeTrailSelect) escapeTrailSelect.addEventListener('change', (event: any) => {
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
  document.getElementById('addescape-day-select').addEventListener('change', (event: any) => {
    if(!event.target.matches('input[type="checkbox"]')) return;
    const inputs = [...event.currentTarget.querySelectorAll('input[type="checkbox"]')];
    let days = inputs.filter((input: any) => input.checked).map((input: any) => Number(input.value));
    if(!days.length) {
      event.target.checked = true;
      days = [Number(event.target.value)];
    }
    if(escapeController.setDays(days)) {
      document.getElementById('ae-day').textContent = days.map((day: any) => `D${day}`).join('、');
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
  const segmentController:any = HTM_APP.createSegmentController(runtimeContext, {
    markRevision:markTrailRevision,
  });
  interactionRuntime.setSegmentDirtyReader(() => segmentController.isDirty());
  const segmentState:any = segmentController.state;

  function handleSegmentTap(event: any, session: any) {
    if(segmentState._justDragged) return;
    if(event.source !== 'fast' && segmentState._fastTapUntil > Date.now()) return;
    const latlng = event.latlng;
    const commitHit = (hit: any) => {
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

  function handleSegmentInteractionEvent(event: any, session: any) {
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
      onCancel: (opts: any) => segmentExit(opts),
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

  function segmentExit(opts: any = {}) {
    if(!opts.fromManager && cancelRuntimeInteraction('segment', opts.reason || 'cancelled')) return;
    segmentController.exit();
    if(segmentState.layer) segmentState.layer.clearLayers();
    document.getElementById('segment-panel').style.display = 'none';
    map.getContainer().style.cursor = '';
    // v1.30.0：恢复 SVG 命中检测
    map.getContainer().classList.remove('measure-active');
    updateSegmentDirtyIndicator();
  }

  let segmentExitPrompt:any = null;
  function requestSegmentExit(reason: any = 'cancelled') {
    if(!segmentState.active && interactionManager.current.kind !== 'segment') return Promise.resolve(true);
    const finish = () => {
      if(cancelRuntimeInteraction('segment', reason)) return true;
      segmentExit({fromManager:true, reason});
      return true;
    };
    if(!segmentController.isDirty()) return Promise.resolve(finish());
    if(segmentExitPrompt) return segmentExitPrompt;
    segmentExitPrompt = studioDialogs.confirm({
      title:getCurrentLang() === 'zh' ? '存在未应用修改' : 'Unapplied segment changes',
      message:getCurrentLang() === 'zh'
        ? '当前分段边界或营地信息尚未应用。确定放弃这些修改并退出吗？'
        : 'Segment boundaries or camp details have not been applied. Discard these changes and exit?',
      danger:true,
      confirmLabel:getCurrentLang() === 'zh' ? '放弃并退出' : 'Discard and exit',
      cancelLabel:getCurrentLang() === 'zh' ? '继续编辑' : 'Keep editing',
    }).then((confirmed: any) => confirmed ? finish() : false).finally(() => { segmentExitPrompt = null; });
    return segmentExitPrompt;
  }

  function updateSegmentDirtyIndicator() {
    const indicator = document.getElementById('segment-dirty-indicator');
    if(!indicator) return;
    indicator.hidden = !segmentController.isDirty();
    indicator.textContent = getCurrentLang() === 'zh' ? '存在未应用修改' : 'Unapplied changes';
  }

  function segmentUndo() {
    segmentDeleteDay(segmentState.points.length - 1);
  }

  function segmentRestore() {
    if(segmentController.restore()) updateSegmentUI();
  }


  function segmentInsertPoint(pt: any) {
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

  function segmentDeleteDay(dayNo: any) {
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


  function segmentStats(startIdx: any, endIdx: any) {
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
      if(!stats) continue;
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
    list.querySelectorAll('.seg-camp-name').forEach((inp: any) => {
      inp.addEventListener('input', (e: any) => {
        const d = +e.target.dataset.day;
        segmentController.updateCamp(d, {name:e.target.value});
        updateSegmentDirtyIndicator();
      });
    });
    list.querySelectorAll('.seg-day-delete').forEach((btn: any) => {
      btn.addEventListener('click', (e: any) => {
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
    model.segments.forEach((seg: any) => {
      L.polyline(seg.latLngs, seg.lineStyle).addTo(segmentState.layer);
    });
    // 绘制分段点标记（可拖拽的 divIcon Marker）
    model.markers.forEach((m: any) => {
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
        scheduleFrame: (callback: any) => scheduleRuntimeInteractionFrame('segment', callback),
      });
      marker.on('dragstart', () => {
        dispatchRuntimeInteraction('segment', {type:'drag-start', boundaryIndex:marker._segIdx});
      });
      // 拖动过程中：吸附到主轨迹上（同时约束在相邻分段点之间）
      marker.on('drag', (ev: any) => snapper.schedule(ev));
      // 拖动结束：确定 idx，检查冲突，重排（保持递增顺序）后重绘
      marker.on('dragend', (ev: any) => {
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
    let pd:any = null; // {x, y, t, pointerType, pointerId}
    function isFastTap(x: any, y: any, t: any, pointerType: any, pointerId: any) {
      if(!pd) return false;
      if(pointerId != null && pd.pointerId != null && pointerId !== pd.pointerId) return false;
      return HTM_CORE.isPointerTap({
        startX:pd.x, startY:pd.y, endX:x, endY:y,
        elapsedMs:t - pd.t,
        pointerType:pointerType || pd.pointerType || 'mouse',
      });
    }
    function onDown(x: any, y: any, target: any, pointerType: any = 'mouse', pointerId: any = null) {
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
    function onUp(x: any, y: any, target: any, pointerType: any = 'mouse', pointerId: any = null) {
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
    function handleFastTap(latlng: any) {
      const kind = interactionManager.current.kind;
      if(kind !== 'measure' && kind !== 'segment') return;
      if(!dispatchRuntimeInteraction(kind, {type:'tap', source:'fast', latlng})) return;
      const until = Date.now() + 350;
      if(kind === 'measure') measureController.suppressFastTap(until);
      else segmentController.suppressFastTap(until);
    }
    // 优先使用 pointer 事件（覆盖鼠标 + 触屏 + 触控笔）
    if(window.PointerEvent) {
      container.addEventListener('pointerdown', (e: any) => {
        if(e.pointerType !== 'mouse' && e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
        onDown(e.clientX, e.clientY, e.target, e.pointerType, e.pointerId);
      }, {capture: true, passive: true});
      container.addEventListener('pointerup', (e: any) => {
        onUp(e.clientX, e.clientY, e.target, e.pointerType, e.pointerId);
      }, {capture: true, passive: true});
      container.addEventListener('pointercancel', () => { pd = null; }, {capture: true, passive: true});
    } else {
      container.addEventListener('mousedown', (e: any) => onDown(e.clientX, e.clientY, e.target, 'mouse'), {capture: true});
      container.addEventListener('mouseup', (e: any) => onUp(e.clientX, e.clientY, e.target, 'mouse'), {capture: true});
      container.addEventListener('touchstart', (e: any) => {
        if(e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY, e.target, 'touch', e.touches[0].identifier);
      }, {capture: true, passive: true});
      container.addEventListener('touchend', (e: any) => {
        if(e.changedTouches.length === 1) onUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY, e.target, 'touch', e.changedTouches[0].identifier);
      }, {capture: true, passive: true});
    }
  })();

  // 监听地图点击：测距模式下选点（fallback：如果 fast-tap 没触发，click 兜底）
  map.on('click', (e: any) => {
    const kind = interactionManager.current.kind;
    if(kind === 'idle') return;
    if(!['measure', 'segment', 'waypoint', 'escape'].includes(kind)) return;
    dispatchRuntimeInteraction(kind, {type:'tap', source:'leaflet', latlng:e.latlng});
  });

  /* ============ Typed elevation Canvas owner ============ */
  let elevationRuntime:any = null;
  let elevCanvas:any = null;
  let elevationCanvasRenderer:any = null;
  function drawElevBar(points:any, color:any, label:any, options:any) {
    return elevationRuntime?.draw(points, color, label, options);
  }
  function renderElevationChartNow() { elevationRuntime?.renderNow(); }
  function refreshElevBar() { elevationRuntime?.refresh(); }
  function updateElevBadges(badges:any) { elevationRuntime?.updateBadges(badges); }

  /* ============ Persistence (IndexedDB) ============ */
  const DB_NAME = 'hiking_trail_db';
  const STORE_NAME = 'trails';
  const DATA_KEY = 'main';
  let sandboxWarningShown = false;

  function handleStorageControllerEvent(event: any) {
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
      restoredTrails.forEach((tr: any) => {
        const segmentedMetrics = tr.track?.length && tr.track_breaks?.length
          ? computeSegmentedTrackMetrics(tr.track, tr.track_breaks, 10)
          : null;
        if(tr.stats && (tr.stats.descent_m === undefined || tr.stats.descent_m === null) && tr.track && tr.track.length) {
          const elevs = tr.track.map((p: any) => p[2] || 0);
          const arr = segmentedMetrics?.cumulativeDescentM || accumulatorDescent(elevs, 10);
          tr.stats.descent_m = Math.round(arr[arr.length-1] || 0);
        }
        // 兼容旧数据：补算 _descCum
        if(!tr._descCum && tr.track && tr.track.length) {
          tr._descCum = segmentedMetrics?.cumulativeDescentM || accumulatorDescent(tr.track.map((p: any) => p[2] || 0), 10);
        }
        // 兼容旧数据：escape_routes 为空则从 waypoints + track 重新推算（v1.12.3：默认关闭，仅 state.autoGenerateEscape=true 时启用）
        if(selectors.autoGenerateEscape() && (!tr.escape_routes || tr.escape_routes.length === 0) && tr.waypoints && tr.track && tr.track.length) {
          const fakePts = tr.track.map((p: any) => ({ lat: p[0], lng: p[1], elev: p[2] || 0 }));
          const others = restoredTrails.filter((t: any) => t.id !== tr.id);
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
    showSaveFilePicker:typeof window.showSaveFilePicker === 'function'
      ? (options: any) => window.showSaveFilePicker!(options)
      : undefined,
  });

  function handleFileExportEvent(event: any) {
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

  const fileExportController:any = HTM_APP.createFileExportController(runtimeContext, {
    archive:fileArchiveAdapter,
    files:browserFileAdapter,
    dayPalette,
    renderDayChart:(points: any, color: any, label: any) =>
      HTM_APP.renderDayElevationChart(document, points, color, label),
    getLanguage:() => getCurrentLang() === 'en' ? 'en' : 'zh',
    schedule:(callback: any, delayMs: any) => setTimeout(callback, delayMs),
    onEvent:handleFileExportEvent,
  });

  const projectRuntimeController:any = HTM_APP.createProjectRuntimeController(runtimeContext, {
    files:browserFileAdapter,
    appVersion:APP_VERSION,
    getLanguage:() => getCurrentLang() === 'en' ? 'en' : 'zh',
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
    notify:(message: any, type: any = 'info') => showToast(message, type),
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
      getLanguage:() => getCurrentLang() === 'en' ? 'en' : 'zh',
      beforeRestore:() => {
        if(interactionManager.current.kind !== 'idle') interactionManager.cancel('project-restore');
      },
      afterRestore:() => syncDisplayControls(),
      close:_closeAddModal,
    })
    : null;
  const restoreProjectFile = (file: any) => projectRestoreUi?.restoreFile(file) ?? Promise.resolve(false);

  function downloadTrailKML(id: any) {
    return fileExportController.downloadTrailKml(id);
  }
  const trailController = HTM_APP.createTrailController(runtimeContext, {
    haversine,
    accumulatorAscent,
    accumulatorDescent,
    markRevision:markTrailRevision,
    persist:saveToStorage,
    render:rebuildAll,
    clearStorage:async () => { await clearStorage(); },
    notify:(message: any) => showToast(message),
  });

  function deleteTrail(id: any) {
    return recordProjectEdit('删除轨迹', 'Delete trail', () => trailController.deleteTrail(id));
  }

  function reverseTrail(id: any) {
    return recordProjectEdit('反向轨迹', 'Reverse trail', () => trailController.reverseTrail(id));
  }

  async function clearAllTrails() {
    if(!projectSelectors.trails().length) return;
    const confirmed = await studioDialogs.confirm({
      title:getCurrentLang() === 'zh' ? '清空项目' : 'Clear project',
      message:getCurrentLang() === 'zh'
        ? `确定清除全部 ${projectSelectors.trails().length} 条轨迹？可通过“编辑 → 撤销”恢复。`
        : `Clear all ${projectSelectors.trails().length} trails? You can restore them with Edit → Undo.`,
      danger:true,
      confirmLabel:getCurrentLang() === 'zh' ? '全部清除' : 'Clear all',
      cancelLabel:getCurrentLang() === 'zh' ? '取消' : 'Cancel',
    });
    if(!confirmed) return false;
    return recordProjectEdit('清空项目', 'Clear project', () => trailController.clearTrails());
  }
  /* ============ Toast ============ */
  const toastController = createToastController({document, viewport:window});

  function showToast(msg: any, type: any='info', duration: any=2400) {
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

    const activeCount = projectSelectors.trails().filter((t: any) => isTrailActive(t)).length;
    const items = [
      {
        icon: '📦',
        label: t('export.kmlZip'),
        desc: selectors.activeGroup()
          ? (getCurrentLang() === 'zh'
            ? `当前组「${selectors.activeGroup()}」叠加中 ${activeCount} 条 · 可跨设备一键导入`
            : `${activeCount} active trails in “${selectors.activeGroup()}” · ready for cross-device import`)
          : (getCurrentLang() === 'zh' ? '未选中任何分组 · 请先切换到一个分组' : 'No group selected · select a group first'),
        disabled: activeCount === 0,
        handler: () => { popup.remove(); exportGroupKML(); },
      },
      {
        icon: '📄',
        label: t('export.itineraryMarkdown'),
        desc: getCurrentLang() === 'zh'
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

    items.forEach((item: any) => {
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
    const closeOnOutside = (e: any) => {
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

  function rebuildAll(opts: any={}) {
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
      const allLatLngs:any[] = [];
      projectSelectors.trails().forEach((t: any) => t.track.forEach((p: any) => allLatLngs.push([p[0], p[1]])));
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
    return new Promise((resolve: any) => {
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
      stateActions.replaceActiveTrails(projectSelectors.trails().map((t: any) => t.id));
    }
    // 每次打开工作台都进入一个有效轨迹组；缓存中的“无分组”仅保留在当前会话。
    if(projectSelectors.trails().length && (selectors.activeGroup() == null
        || !projectSelectors.trails().some((trail: any) => trailGroup(trail) === selectors.activeGroup()))) {
      stateActions.setActiveGroup(trailGroup(projectSelectors.trails()[0]));
    }
    // 兜底主轨迹
    // v1.21.0：兜底选当前组内的第一条（而不是 projectSelectors.trails()[0]，可能不在当前组）
    if(selectors.activeGroup() != null && !selectors.primaryTrailId() && projectSelectors.trails().length) {
      const inGroup = selectors.trailsInActiveGroup(projectSelectors.trails());
      stateActions.setPrimaryTrail((inGroup[0] || projectSelectors.trails()[0]).id);
    }
    stateActions.setMode('elev');
    updateModeTagTitle();
    document.querySelectorAll('[data-mode]').forEach((control: any) => {
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
  const workspaceTitleController = createWorkspaceTitleController({
    document,
    dialogs:studioDialogs,
    language:getCurrentLang,
    dispatchCommand:() => dispatchStudioCommand(STUDIO_COMMANDS.APP_RENAME),
    commandId:STUDIO_COMMANDS.APP_RENAME,
    storage:(() => {
      try { return window.localStorage; } catch { return null; }
    })(),
  });
  syncWorkspaceTitle = workspaceTitleController.syncDocumentTitle;
  const storageBtn = document.getElementById('storage-btn');
  if(storageBtn) storageBtn.addEventListener('click', showStorageInfo);

  let renderCollapsedPrimary = () => false;
  let positionCollapsedPrimary = () => {};
  const sidebarCollapseController = createSidebarCollapseController({
    document,
    onLayoutChanged:() => {
      map?.invalidateSize();
      refreshElevBar?.();
    },
    renderCollapsedPrimary:() => renderCollapsedPrimary(),
    positionCollapsedPrimary:() => positionCollapsedPrimary(),
  });
  const toggleSidebar = (open?: boolean) => sidebarCollapseController.toggle(open);
  const mapSafeAreaController = HTM_APP.createMapSafeAreaController({
    document,
    mapElement:map.getContainer(),
  });

  workspaceController = HTM_APP.createWorkspaceController({
    trails:() => projectSelectors.trails(),
    selectors,
    stateActions,
    getMeasureState:() => measureState,
    trailRevision:runtimeTrailRevision,
    leaflet:L,
    map,
    requestFit:(request: any) => renderScheduler.requestFit(request),
    invalidateWorkspace:() => invalidateRender(
      HTM_APP.RENDER_DIRTY.TRACKS | HTM_APP.RENDER_DIRTY.MARKERS
      | HTM_APP.RENDER_DIRTY.SIDEBAR | HTM_APP.RENDER_DIRTY.LEGEND
      | HTM_APP.RENDER_DIRTY.CHART,
    ),
    persist:saveToStorage,
    renderStats:renderRuntimeStats,
    shouldCloseSidebar:() => HTM_APP.shouldCloseSidebarForFit(
      window.innerWidth,
      sidebarCollapseController.isCollapsed(),
      window.innerHeight,
      window.matchMedia?.('(pointer:coarse)').matches ?? false,
    ),
    closeSidebar:sidebarCollapseController.close,
    resolveFitPadding:(basePadding: number) => mapSafeAreaController.resolve(basePadding),
    prefersReducedMotion,
  });
  const cachedTrailBounds = (trail: any) => workspaceController.cachedTrailBounds(trail);
  const resetView = (options: any) => workspaceController.resetView(options);
  const fitWorkspaceBounds = (bounds: any, options: any = {}, meta: any = {}) =>
    workspaceController.fitBounds(bounds, options, meta);

  const sidebarRuntime = HTM_APP.createSidebarRuntime({
    document, window, DAY_ITINERARY_WAYPOINT_TAGS, HTM_APP, HTM_CORE, L,
    STUDIO_COMMANDS, TAG_RULES_JS, applyChange, baseLayers,
    beginRuntimeInteraction, cancelRuntimeInteraction, clearEscape, commandRegistry,
    createFloatingPanelPositionController, createWorkbenchIcon,
    getCurrentLang, dayPalette, deleteTrail, t,
    stateActions, selectors, projectActions, projectSelectors, dispatchStudioCommand, downloadTrailKML, drawTracks, drawWaypoints,
    escapeController, escapeUiText, fitWorkspaceBounds,
    getCurrentBase:() => currentBase,
    setCurrentBase:(value: any) => { currentBase = value; },
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
  renderCollapsedPrimary = buildPrimaryMini;
  positionCollapsedPrimary = schedulePrimaryMiniPositionApply;

  elevationRuntime = createElevationRuntime({
    document, window, leaflet:L, map, app:HTM_APP, core:HTM_CORE,
    selectors, projectSelectors, measureState, dayPreviewState, trackBreaksInRange, t,
    invalidateChart:() => invalidateRender(HTM_APP.RENDER_DIRTY.CHART),
    renderRuntimeStats, formatTrackPointCoordinates,
  });
  elevCanvas = elevationRuntime.canvas;
  elevationCanvasRenderer = elevationRuntime.renderer;

  const waypointController:any = HTM_APP.createWaypointController(runtimeContext, {
    iconForTag:waypointIcon,
    markRevision:markTrailRevision,
    renderWaypoints:drawWaypoints,
    renderFilters:buildFilterGrid,
    renderDays:buildDaysTab,
    persist:saveToStorage,
    notify:(message: any) => showToast(message),
  });
  const addWaypointState = waypointController.state;

  function nextWaypointId(trail: any) {
    return waypointController.nextId(trail);
  }

  function findWaypointAnchorOnPrimary(latlng: any, requireNear: any = false) {
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

  function readWaypointPhoto(file: any) {
    return new Promise((resolve: any, reject: any) => {
      if(!file) { resolve(''); return; }
      const allowedTypes = new Set(['image/png','image/jpeg','image/gif','image/webp','image/avif']);
      if(!allowedTypes.has(file.type.toLowerCase())) {
        reject(new Error(getCurrentLang() === 'zh' ? '请选择 PNG、JPEG、GIF、WebP 或 AVIF 图片' : 'Choose a PNG, JPEG, GIF, WebP, or AVIF image'));
        return;
      }
      if(file.size > 5 * 1024 * 1024) {
        reject(new Error(getCurrentLang() === 'zh' ? '图片不能超过 5 MB' : 'Image must be 5 MB or smaller'));
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(typeof reader.result === 'string' ? reader.result : ''));
      reader.addEventListener('error', () => reject(new Error(getCurrentLang() === 'zh' ? '图片读取失败' : 'Could not read image')));
      reader.readAsDataURL(file);
    });
  }

  function openWaypointEditorDialog() {
    const isZh = getCurrentLang() === 'zh';
    return studioDialogs.openCustom({
      title:isZh ? '新增标注点' : 'Add waypoint',
      size:'wide',
      initialFocus:'#manual-waypoint-name',
      render:({form, body, actions, close, cancel}: any) => {
        const createField = (labelText: any, control: any) => {
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
        ['other','camp','water','supply','pass','fork','warn','shelter','village','bridge','river','start','end'].forEach((value: any) => {
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
          tagPreview.style.color = (tagColors as Record<string, string>)[tag.value] || '#64748b';
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
          photoRead = readWaypointPhoto(photo.files && photo.files[0]).then((data: any) => {
            photoData = data;
            if(data) { preview.src = data; preview.hidden = false; }
            return data;
          }).catch((readError: any) => {
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

        form.addEventListener('submit', (event: any) => {
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

  async function addManualWaypointAt(latlng: any, opts: any = {}) {
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

  function handleWaypointInteractionEvent(event: any, session: any) {
    if(event.type !== 'tap') return;
    if(!session.setPhase('committing')) return;
    void addManualWaypointAt(event.latlng, {
      requireNear:event.requireNear !== false,
      isCurrent:() => session.isCurrent() && runtimeInteractionOwnerIsCurrent(session),
    }).then((added: any) => {
      if(!session.isCurrent()) return;
      if(added) {
        session.cancel('committed');
        return;
      }
      if(event.transient) session.cancel('cancelled');
      else session.setPhase('select');
    }).catch((error: any) => {
      console.error('Failed to add waypoint', error);
      if(session.isCurrent()) session.setPhase('select');
    });
  }

  function exitAddWaypointMode(opts: any = {}) {
    if(!opts.fromManager && cancelRuntimeInteraction('waypoint', opts.reason || 'cancelled')) return;
    waypointController.exit();
    const btn = document.getElementById('add-waypoint-btn');
    if(btn) btn.classList.remove('on');
    map.getContainer().style.cursor = '';
  }

  function enterAddWaypointMode(opts: any = {}) {
    const main = selectors.primaryTrail(projectSelectors.trails());
    if(!main || !main.track || !main.track.length) {
      showToast('请先设置主轨迹', 'error');
      return null;
    }
    const session = beginRuntimeInteraction('waypoint', 'select', main, {
      onEvent: handleWaypointInteractionEvent,
      onCancel: (cancelOpts: any) => exitAddWaypointMode(cancelOpts),
    });
    if(!waypointController.enter(main.id)) return null;
    const btn = document.getElementById('add-waypoint-btn');
    if(btn) btn.classList.add('on');
    map.getContainer().style.cursor = 'crosshair';
    if(opts.announce !== false) showToast('在主轨迹附近点击一次，添加手动标注点');
    return session;
  }

  function dispatchTransientWaypointTap(latlng: any, source: any) {
    const session = enterAddWaypointMode({announce:false});
    if(!session) return false;
    return dispatchRuntimeInteraction('waypoint', {
      type:'tap', source, latlng, requireNear:false, transient:true,
    });
  }

  // 右键/长按地图添加标注点
  if(map) {
    // 桌面端：右键 contextmenu
    map.on('contextmenu', (e: any) => {
      dispatchTransientWaypointTap(e.latlng, 'contextmenu');
    });
    // 移动端：长按 600ms
    let longPressTimer:any = null;
    map.getContainer().addEventListener('touchstart', (e: any) => {
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

  const stitchRuntime = createStitchRuntime({
    document, window, leaflet:L, map, haversine, splitTrackByBreaks,
    buildTrackLatLngSegments, escapeUiText, createPrimaryTrackDragSnapper,
    scheduleRuntimeInteractionFrame, dispatchRuntimeInteraction, commandRegistry,
    studioDialogs, interactionManager, selectors, projectSelectors,
    beginRuntimeInteraction, setRuntimeInteractionPhase, fitWorkspaceBounds,
    stitchTrails, generateNextTrailId, recordProjectEdit, fileImportController,
    showToast, requestSegmentExit, trailGroup, getCurrentLang,
  });
  const stitchState = stitchRuntime.state;
  const stitchLayer = stitchRuntime.layer;
  const renderStitchWorkbench = stitchRuntime.render;
  const requestStitchExit = stitchRuntime.requestExit;
  const stitchTrailsCommand = stitchRuntime.command;

  async function reversePrimaryTrailCommand() {
    if(!selectors.primaryTrailId()) {
      await studioDialogs.info({
        title:getCurrentLang() === 'zh' ? '无法反向' : 'Cannot reverse',
        message:t('reverse.noPrimary') || '无主轨迹',
      });
      return false;
    }
    reverseTrail(selectors.primaryTrailId());
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
    const register = (id: any, execute: any, options: any = {}) => commandRegistry.register({id, execute, ...options});
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
        setLang(getCurrentLang() === 'zh' ? 'en' : 'zh');
      }),
      register(STUDIO_COMMANDS.APP_RENAME, workspaceTitleController.rename),
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
  if(studioTestMode) window.__HTM_BOOT_READY__ = bootPromise as Promise<StudioBootResult>;

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
    const readonlyProjectView = HTM_APP.createReadonlyRuntimeView(projectSelectors.snapshot());
    const readonlyStateView = HTM_APP.createReadonlyRuntimeView(selectors.snapshot());
    const testDriver = Object.freeze({
      replaceProject:(project: any) => projectActions.replaceProject(project, 'test.fixture'),
      replaceTrails:(trails: any) => projectActions.replaceTrails(trails, 'test.fixture'),
      addTrail:(trail: any) => projectActions.addTrail(trail, 'test.fixture'),
      removeTrail:(trailId: any) => projectActions.removeTrail(trailId, 'test.fixture'),
      mutateTrail:(trailId: any, mutation: any) => projectActions.mutateTrail(trailId, 'test.fixture', mutation),
      mutateTrails:(mutation: any) => projectActions.mutateTrails('test.fixture', mutation),
      advanceTrailRevision:(trailId: any) => {
        const trail = projectSelectors.trailById(String(trailId));
        return trail ? markTrailRevision(trail) : null;
      },
    });
    window.__HTM_RUNTIME_INSPECTOR__ = HTM_APP.createReadonlyRuntimeInspector({
      "APP_VERSION":() => APP_VERSION, "DATA":() => readonlyProjectView, "HTM_APP":() => HTM_APP,
      "HTM_CORE":() => HTM_CORE, "L":() => L, "_doSave":() => _doSave,
      "_elevBarData":() => elevationRuntime?.data || null, "addEscapeCommit":() => addEscapeCommit, "addEscapeEnter":() => addEscapeEnter,
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
      "showToast":() => showToast, "showTooltip":() => showTooltip, "state":() => readonlyStateView, "testDriver":() => testDriver,
      "stitchState":() => stitchState, "stitchLayer":() => stitchLayer, "requestStitchExit":() => requestStitchExit,
      "switchGroup":() => switchGroup, "t":() => t,
      "toggleSidebar":() => toggleSidebar, "toggleTrailActive":() => toggleTrailActive, "toggleTrailBatch":() => toggleTrailBatch,
      "toggleTrailExpanded":() => toggleTrailExpanded, "trackLayer":() => trackLayer, "trailCardExpandedHtml":() => trailCardExpandedHtml,
      "trailCardHeaderHtml":() => trailCardHeaderHtml, "trailController":() => trailController, "updateElevBadges":() => updateElevBadges,
      "updateSegmentUI":() => updateSegmentUI, "waypointController":() => waypointController, "waypointIcon":() => waypointIcon,
      "waypointIconMarkup":() => waypointIconMarkup, "window":() => window, "wpMarkers":() => wpMarkers,
    });
  }

  return bootPromise as Promise<StudioBootResult>;
}
