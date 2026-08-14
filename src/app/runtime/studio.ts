import * as HTM_CORE from '../../core/index.ts';
import * as HTM_APP from '../index.ts';
import { STUDIO_VERSION } from '../version.ts';
import { createWorkbenchIcon } from '../../ui/icons.ts';
import {
  escapeHtmlText,
  sanitizeExternalHttpUrl,
  sanitizeHexColor,
} from '../../ui/safe-content.ts';
import { createFloatingPanelPositionController } from '../../ui/floating-panel.ts';
import { createMeasurePanelController } from '../../ui/measure-panel.ts';
import { createSidebarCollapseController } from '../../ui/sidebar/collapse-controller.ts';
import { createToastController } from '../../ui/toast.ts';
import { createVersionBadgeController } from '../../ui/version-badge.ts';
import { createWorkspaceTitleController } from '../../ui/workspace-title.ts';
import { createExportMenuController } from '../../ui/export-menu.ts';
import { createStitchRuntime } from '../../features/stitch/runtime-owner.ts';
import { createElevationRuntime } from '../../features/elevation/runtime-owner.ts';
import { createLocalizationRuntime } from '../../features/localization/runtime-owner.ts';
import { createWaypointRuntime } from '../../features/waypoint/runtime-owner.ts';
import { createEscapeRuntime } from '../../features/escape/runtime-owner.ts';
import { createMeasureRuntime } from '../../features/measure/runtime-owner.ts';
import { createSegmentRuntime } from '../../features/segment/runtime-owner.ts';
import { createTrackSnapService } from '../../features/map/track-snap.ts';
import { createMapInteractionInput } from '../../features/map/interaction-input.ts';
import {
  createMapRuntime,
  DAY_ITINERARY_WAYPOINT_TAGS,
} from '../../features/map/runtime-owner.ts';
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
}

/** Starts the browser runtime directly inside the Vite module graph. */
export function startStudioRuntime(
  dependencies: StudioRuntimeDependencies,
): Promise<StudioBootResult> {
  const document = dependencies.document;
  const defaultView = document.defaultView as StudioBrowserWindow | null;
  if(!defaultView) throw new Error('Studio runtime requires a document with a window');
  const window:StudioBrowserWindow = defaultView;
  const studioTestMode = new URL(window.location.href).searchParams.has('studio-test');
  const commandRegistry = dependencies.commands;
  const studioDialogs = dependencies.dialogs;
  const STUDIO_COMMANDS = HTM_APP.STUDIO_COMMANDS;
  const L = window.L;
  const fflate = window.fflate;
  if(!L) throw new Error('Leaflet runtime is missing');
  if(!fflate) throw new Error('fflate runtime is missing');

  const initialProject:HTM_APP.ProjectState<RuntimeTrail> = {
    title:'徒步路线地图', trails:[], calc_method:{},
  };

  function dispatchStudioCommand(commandId: string) {
    try {
      const result = commandRegistry.dispatch(commandId);
      if(result && typeof (result as PromiseLike<unknown>).then === 'function') {
        Promise.resolve(result).catch(error => console.error(`Command failed: ${commandId}`, error));
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
  const appStateStore = HTM_APP.createAppStateStore(initialProject);
  const selectors = HTM_APP.createAppStateSelectors<RuntimeTrail>(() => appStateStore.snapshot());
  const stateActions = HTM_APP.createAppStateActions(appStateStore);
  const projectStore = HTM_APP.createProjectStore(initialProject);
  const projectActions = HTM_APP.createProjectActions(projectStore);
  const projectSelectors = HTM_APP.createProjectSelectors<RuntimeTrail>(() => projectStore.snapshot());
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
  const runtimeContext:HTM_APP.RuntimeContext<RuntimeTrail, unknown> = HTM_APP.createRuntimeContext({
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
    const primaryTrailId = selectors.primaryTrailId();
    if(selectors.activeGroup() != null && primaryTrailId != null
        && !selectors.activeTrailIds().has(primaryTrailId)) {
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
  let escapeReferenceTrailId = (): string | null => null;

  const mapRuntime = createMapRuntime({
    document,
    viewport:window,
    leaflet:L,
    map,
    context:runtimeContext,
    trackLayer,
    networkLayer,
    waypointLayer:wpLayer,
    highPointLayer,
    interactionBlocked:() => interactionManager.current.kind !== 'idle',
    escapeReferenceTrailId:() => escapeReferenceTrailId(),
    invalidateTracks:() => invalidateRender(HTM_APP.RENDER_DIRTY.TRACKS),
    invalidateMarkers:() => invalidateRender(HTM_APP.RENDER_DIRTY.MARKERS),
    selectTrail:trailId => {
      stateActions.setPrimaryTrail(trailId);
      rebuildAll({fit:false});
      saveToStorage();
    },
    language:() => getCurrentLang() === 'en' ? 'en' : 'zh',
    translate:t,
    openImage:(source, caption) => openLightbox(source, caption),
    recordElevationBands:count => { renderRuntimeStats.elevationBands = count; },
    recordMarkerDiff:diff => { renderRuntimeStats.markers = diff; },
  });
  const dayPalette = mapRuntime.dayPalette;
  const tagColors = mapRuntime.tagColors;
  const tagLabels = mapRuntime.tagLabels;
  const wpMarkers = mapRuntime.waypointRegistry;
  const drawTracks = mapRuntime.drawTracks;
  const drawWaypoints = mapRuntime.drawWaypoints;
  const drawHighPoints = mapRuntime.drawHighPoints;
  const collectWaypointMarkerModels = mapRuntime.collectWaypointMarkerModels;
  const nearestTrackIdx = mapRuntime.nearestTrackIndex;
  const waypointIcon = mapRuntime.waypointIcon;
  const waypointIconMarkup = mapRuntime.waypointIconMarkup;
  const addWpMarker = mapRuntime.buildWaypointMarker;
  const inspectTrackPoint = mapRuntime.inspectTrackPoint;
  const showTooltip = mapRuntime.showTooltip;
  const hideTooltip = mapRuntime.hideTooltip;

  function renderTracksNow() { mapRuntime.renderTracks(); }
  function renderWaypointsNow() { mapRuntime.renderWaypoints(); }

  function showHelp() {
    return studioDialogs.content(HTM_APP.buildHelpDialogModel(
      getCurrentLang(),
      APP_VERSION,
      t('help.title'),
      t('changelog.close'),
    ));
  }
  const formatTrackPointCoordinates = HTM_APP.formatTrackPointCoordinates;
  const escapeUiText = escapeHtmlText;
  /* ============ Escape ============ */
  const escapeRuntime = createEscapeRuntime({
    document, leaflet:L, map, displayLayer:escapeLayer, context:runtimeContext,
    markRevision:trail => markTrailRevision(trail as RuntimeTrail), language:getCurrentLang, drawTracks,
    notify:showToast,
    beginInteraction:(kind, phase, trail, options) =>
      beginRuntimeInteraction(kind, phase, trail as RuntimeTrail, options),
    cancelInteraction:cancelRuntimeInteraction, setInteractionPhase:setRuntimeInteractionPhase,
    recordEdit:(labelZh, labelEn, mutation) => recordProjectEdit(labelZh, labelEn, mutation),
    persist:saveToStorage, renderDays:() => buildDaysTab(),
  });
  const escapeController = escapeRuntime.controller;
  const addEscapeState = escapeRuntime.state;
  escapeReferenceTrailId = () => addEscapeState.active ? addEscapeState.referenceTrailId : null;
  const showEscape = escapeRuntime.showRoute;
  const clearEscape = escapeRuntime.clearRoute;
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
  if(!lightboxEl || !lightboxImg || !lightboxCap) throw new Error('Lightbox shell is incomplete');
  const lightboxController = HTM_APP.createImageLightboxController({
    document, viewport:window, container:lightboxEl,
    image:lightboxImg as HTMLImageElement, caption:lightboxCap,
  });
  const openLightbox = (src: any, caption: any) => lightboxController.open(src, caption);
  const closeLightbox = () => lightboxController.close();
  /* ============ Shared trail snapping + typed measurement owner ============ */
  const trackSnap = createTrackSnapService<RuntimeTrail>({
    primaryTrail:() => selectors.primaryTrail(projectSelectors.trails()),
    distance:haversine,
    requestFrame:callback => window.requestAnimationFrame(callback),
    cancelFrame:handle => window.cancelAnimationFrame(handle),
  });
  const nearestTrackIdxOnPrimary = trackSnap.nearestPrimary;
  const nearestTrackIdxNearPrimary = trackSnap.nearestPrimaryNear;
  const createPrimaryTrackDragSnapper = trackSnap.createDragSnapper;
  const measureRuntime = createMeasureRuntime({
    document, window, leaflet:L, map, context:runtimeContext, panel:measurePanelController,
    trackSnap, interactionMarkerHitSize, language:getCurrentLang, notify:showToast,
    beginInteraction:beginRuntimeInteraction, cancelInteraction:cancelRuntimeInteraction,
    setInteractionPhase:setRuntimeInteractionPhase,
    scheduleInteractionFrame:scheduleRuntimeInteractionFrame,
    dispatchInteraction:dispatchRuntimeInteraction,
    enterRenderMode:label => enterInteractionRenderMode(label),
    clearDayPreview:() => clearDaySegmentPreview({silent:true}),
    refreshElevation:() => refreshElevBar(),
  });
  const measureController = measureRuntime.controller;
  const measureState = measureRuntime.state;
  const measureEnter = measureRuntime.enter;
  const measureExit = measureRuntime.exit;
  const measureReset = measureRuntime.reset;
  const measureReverse = measureRuntime.reverse;
  const measureCompute = measureRuntime.compute;
  const measureMarker = measureRuntime.marker;
  const measurePointFromHit = measureRuntime.pointFromHit;
  const computeMeasureStats = measureRuntime.computeStats;
  const getMeasureStatsCache = measureRuntime.getStatsCache;
  const addMeasureEndpointMarker = measureRuntime.addEndpointMarker;
  const bindMeasureEndpointDrag = measureRuntime.bindEndpointDrag;
  const applyMeasureEndpointHit = measureRuntime.applyEndpointHit;
  const queueMeasureLiveUpdate = measureRuntime.queueLiveUpdate;
  const renderMeasureSegmentLine = measureRuntime.renderSegmentLine;
  const showMeasureElevReadout = measureRuntime.showReadout;
  const hideMeasureElevReadout = measureRuntime.hideReadout;
  const setMeasureElevHint = measureRuntime.setHint;
  const resetMeasureElevReadout = measureRuntime.resetReadout;
  const handleMeasureInteractionEvent = measureRuntime.handleInteractionEvent;
  const addEscapeEnter = escapeRuntime.enter;
  const addEscapeExit = escapeRuntime.exit;
  const addEscapeReset = escapeRuntime.reset;
  const addEscapeCommit = escapeRuntime.commit;
  /* ============ Typed itinerary segmentation owner ============ */
  const segmentRuntime = createSegmentRuntime({
    document, leaflet:L, map, dialogs:studioDialogs, context:runtimeContext, trackSnap,
    dayPalette, interactionMarkerHitSize, language:getCurrentLang,
    formatCoordinates:formatTrackPointCoordinates,
    markRevision:trail => markTrailRevision(trail as unknown as RuntimeTrail),
    notify:showToast, beginInteraction:beginRuntimeInteraction,
    cancelInteraction:cancelRuntimeInteraction, setInteractionPhase:setRuntimeInteractionPhase,
    scheduleInteractionFrame:scheduleRuntimeInteractionFrame,
    dispatchInteraction:dispatchRuntimeInteraction,
    currentInteractionKind:() => interactionManager.current.kind,
    enterRenderMode:label => enterInteractionRenderMode(label),
    resetView:() => resetView({restoreActive:true}),
    persistNow:() => _doSave(),
    rebuild:() => rebuildAll({fit:false}),
    refreshElevation:() => refreshElevBar(),
    captureHistory:() => projectHistoryController.capture(),
    commitHistory:(labelZh, labelEn, before) =>
      projectHistoryController.commit(historyLabel(labelZh, labelEn), before),
  });
  const segmentController = segmentRuntime.controller;
  interactionRuntime.setSegmentDirtyReader(() => segmentController.isDirty());
  const segmentState = segmentRuntime.state;
  const segmentEnter = segmentRuntime.enter;
  const segmentExit = segmentRuntime.exit;
  const requestSegmentExit = segmentRuntime.requestExit;
  const segmentRestore = segmentRuntime.restore;
  const segmentInsertPoint = segmentRuntime.insertPoint;
  const segmentDeleteDay = segmentRuntime.deleteDay;
  const segmentApply = segmentRuntime.apply;
  const updateSegmentUI = segmentRuntime.update;
  const redrawSegmentLayer = segmentRuntime.redraw;

  const mapInteractionInput = createMapInteractionInput({
    window,
    map,
    currentKind:() => interactionManager.current.kind,
    dispatch:dispatchRuntimeInteraction,
    suppressFastTap:(kind, until) => {
      if(kind === 'measure') measureController.suppressFastTap(until);
      else segmentController.suppressFastTap(until);
    },
    isPointerTap:HTM_CORE.isPointerTap,
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
      projectActions.replaceTrails(restoredTrails as RuntimeTrail[], 'storage.restore');
      stateActions.restoreWorkspace({
        activeTrails:restored.activeTrails,
        activeGroup:restored.activeGroup,
        primaryByGroup:restored.primaryByGroup as Record<string, string>,
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
      showToast(`ZIP 不可用，改为下载 ${event.downloadCount} 个 KML 文件（首个为合并版）…`, 'info', 4000);
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

  const projectRuntimeController:any = HTM_APP.createProjectRuntimeController(
    runtimeContext as unknown as HTM_APP.RuntimeContext<import('../../core/project-archive.ts').ProjectArchiveTrail>, {
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
    markRevision:trail => markTrailRevision(trail as unknown as RuntimeTrail),
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
  const exportMenuController = createExportMenuController(document);

  function showToast(msg: any, type: any='info', duration: any=2400) {
    return toastController.show(msg, type === 'error' ? 'error' : 'info', duration);
  }
  /* ============ Export Offline ============ */
  async function exportOffline() {
    if(!projectSelectors.trails().length) { showToast('没有轨迹可导出', 'error'); return; }
    // v1.14.1：点击式选择菜单（附着在导出按钮下方），不用 confirm 阻塞对话框
    showExportMenu();
  }

  function showExportMenu() {
    const btn = document.getElementById('export-btn');
    if(!btn) { exportGroupKML(); return; }
    const activeCount = projectSelectors.trails().filter((t: any) => isTrailActive(t)).length;
    exportMenuController.toggle(btn, [
      {
        id:'group-kml', icon:'folder-tree',
        label: t('export.kmlZip'),
        description: selectors.activeGroup()
          ? (getCurrentLang() === 'zh'
            ? `当前组「${selectors.activeGroup()}」叠加中 ${activeCount} 条 · 可跨设备一键导入`
            : `${activeCount} active trails in “${selectors.activeGroup()}” · ready for cross-device import`)
          : (getCurrentLang() === 'zh' ? '未选中任何分组 · 请先切换到一个分组' : 'No group selected · select a group first'),
        disabled: activeCount === 0,
        run:exportGroupKML,
      },
      {
        id:'itinerary', icon:'file',
        label: t('export.itineraryMarkdown'),
        description: getCurrentLang() === 'zh'
          ? '按天数、爬升、扎营点和下撤方案生成行程表'
          : 'Build an itinerary from days, ascent, camps, and escape routes',
        run:exportItineraryMD,
      },
      {
        id:'project', icon:'save',
        label: t('export.projectArchive'),
        description: t('export.projectArchiveDesc'),
        run:() => projectArchiveController.exportProject(),
      },
    ]);
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
      const bounds = L.latLngBounds([]);
      for(const trail of projectSelectors.trails()) {
        const trailBounds = workspaceController?.cachedTrailBounds(trail);
        if(trailBounds) bounds.extend(trailBounds);
      }
      if(bounds.isValid()) fitWorkspaceBounds(bounds, {padding:[40,40]}, {source:'rebuild'});
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

  const waypointRuntime = createWaypointRuntime({
    document, leaflet:L, map, dialogs:studioDialogs,
    context:runtimeContext as unknown as HTM_APP.RuntimeContext<HTM_APP.WaypointTrail>,
    selectors, projectSelectors, language:getCurrentLang, translate:t, tagColors,
    iconForTag:waypointIcon, iconMarkup:waypointIconMarkup,
    nearestPrimary:nearestTrackIdxOnPrimary, distance:haversine,
    markRevision:trail => markTrailRevision(trail as unknown as RuntimeTrail), renderWaypoints:drawWaypoints,
    renderFilters:buildFilterGrid, renderDays:buildDaysTab, persist:saveToStorage,
    notify:showToast, recordEdit:recordProjectEdit,
    beginInteraction:beginRuntimeInteraction, cancelInteraction:cancelRuntimeInteraction,
    dispatchInteraction:dispatchRuntimeInteraction, ownerIsCurrent:runtimeInteractionOwnerIsCurrent,
  });
  const waypointController = waypointRuntime.controller;
  const addWaypointState = waypointRuntime.state;
  const nextWaypointId = waypointRuntime.nextId;
  const addManualWaypointAt = waypointRuntime.addManualWaypointAt;
  const enterAddWaypointMode = waypointRuntime.enter;
  const exitAddWaypointMode = waypointRuntime.exit;
  const dispatchTransientWaypointTap = waypointRuntime.dispatchTransientTap;

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
    if(exportMenuController.close()) return true;
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
