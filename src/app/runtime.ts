// @ts-nocheck
// Transitional classic-runtime bridge. Vite includes this source once and
// bootstrap.ts executes it after the Workbench DOM and typed modules exist.
let DATA = {"title": "徒步路线地图", "trails": [], "calc_method": {}}; window.DATA = DATA;

/* src/core is the runtime source of truth; browser orchestration binds directly to it. */
const HTM_CORE = window.HikingTrailCore;
if(!HTM_CORE) throw new Error('HikingTrailCore runtime is missing');
const HTM_APP = window.HikingTrailApp;
if(!HTM_APP) throw new Error('HikingTrailApp runtime is missing');
const STUDIO_COMMANDS = HTM_APP.STUDIO_COMMANDS;
const commandRegistry = window.__HTM_COMMAND_REGISTRY__;
const studioDialogs = window.__HTM_DIALOG_CONTROLLER__;
if(!commandRegistry) throw new Error('Studio CommandRegistry runtime is missing');
if(!studioDialogs) throw new Error('Studio DialogController runtime is missing');

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
window.__HTM_DISPATCH_COMMAND__ = dispatchStudioCommand;
HTM_APP.initializeWorkbenchChrome(document, window.localStorage);
haversine = HTM_CORE.haversine;
smoothElev = HTM_CORE.smoothElev;
accumulatorAscent = HTM_CORE.accumulatorAscent;
accumulatorDescent = HTM_CORE.accumulatorDescent;
elevRatioColor = HTM_CORE.elevRatioColor;
trailContentHash = HTM_CORE.trailContentHash;
clampTrackIndex = HTM_CORE.clampTrackIndex;
pointFromTrackIndex = HTM_CORE.pointFromTrackIndex;
normalizeTrackIndexRange = HTM_CORE.normalizeTrackIndexRange;
buildTrackLatLngs = HTM_CORE.buildTrackLatLngs;
buildMeasureSegmentRenderModel = HTM_CORE.buildMeasureSegmentRenderModel;
buildDayPreviewRenderModel = HTM_CORE.buildDayPreviewRenderModel;
applyMeasureEndpointState = HTM_CORE.applyMeasureEndpointState;
reverseMeasureEndpoints = HTM_CORE.reverseMeasureEndpoints;
moveSegmentBoundary = HTM_CORE.moveSegmentBoundary;
computeSegmentStatsForTrack = HTM_CORE.computeSegmentStats;
buildSegmentLayerModel = HTM_CORE.buildSegmentLayerModel;
computeElevationLayout = HTM_CORE.computeElevationLayout;
computeElevationRenderModel = HTM_CORE.computeElevationRenderModel;
estimateElevationLabelStackDepth = HTM_CORE.estimateElevationLabelStackDepth;
computeElevationPanelHeight = HTM_CORE.computeElevationPanelHeight;
layoutElevationAnnotations = HTM_CORE.layoutElevationAnnotations;
buildElevationAnnotationRenderModel = HTM_CORE.buildElevationAnnotationRenderModel;
storageTrailGroup = HTM_CORE.storageTrailGroup;
normalizePrimaryByGroup = HTM_CORE.normalizePrimaryByGroup;
normalizeActiveTrailIds = HTM_CORE.normalizeActiveTrailIds;
primaryTrailIdForGroup = HTM_CORE.primaryTrailIdForGroup;
ensurePrimaryForActiveGroup = HTM_CORE.ensurePrimaryForActiveGroup;
serializeStorageSnapshot = HTM_CORE.serializeStorageSnapshot;
normalizeIndexedDbStorageConfig = HTM_CORE.normalizeIndexedDbStorageConfig;
buildStorageReadOperation = HTM_CORE.buildStorageReadOperation;
buildStorageWriteOperation = HTM_CORE.buildStorageWriteOperation;
buildStorageDeleteOperation = HTM_CORE.buildStorageDeleteOperation;
restoreStorageSnapshot = HTM_CORE.restoreStorageSnapshot;
removeTrailFromPrimaryByGroup = HTM_CORE.removeTrailFromPrimaryByGroup;
parseCoordStr = HTM_CORE.parseKmlCoordinateText;
parseGxCoordText = HTM_CORE.parseGxCoordText;
kmlCoordsToTrackPoints = HTM_CORE.kmlCoordsToTrackPoints;
extractImageUrl = HTM_CORE.extractKmlImageUrl;
shortLabel = HTM_CORE.shortKmlLabel;
normalizeKmlTitle = HTM_CORE.normalizeKmlTitle;
buildKmlParseModel = HTM_CORE.buildKmlParseModel;
enrichWaypoints = HTM_CORE.enrichWaypoints;
computeCumulativeDistance = HTM_CORE.computeCumulativeDistance;
computeTrailStats = HTM_CORE.computeTrailStats;
buildElevationPolylineSegments = HTM_CORE.buildElevationPolylineSegments;
downsampleMinMaxIndices = HTM_CORE.downsampleMinMaxIndices;
planKeyedWaypointDiff = HTM_CORE.planKeyedWaypointDiff;


const APP_VERSION = 'v1.32.2';
/* @runtime-slice localization.runtime */
/* @runtime-slice storage.info */
/* @runtime-slice app.state */
/* @runtime-slice map.bootstrap */

/* @runtime-slice map.tracks */
/* @runtime-slice waypoint.models */
/* @runtime-slice ui.help */
/* @runtime-slice waypoint.markers */
/* @runtime-slice escape.display */
/* @runtime-slice ui.sidebar */
/* @runtime-slice itinerary.day-preview */
/* @runtime-slice escape.sidebar */
/* @runtime-slice ui.legend */
/* @runtime-slice ui.controls */

/* @runtime-slice files.import */
/* @runtime-slice ui.lightbox */
/* @runtime-slice measure.runtime */
/* @runtime-slice escape.interaction */
/* @runtime-slice measure.compute */
/* @runtime-slice segment.runtime */
/* @runtime-slice measure.controls */
/* @runtime-slice map.input */

/* @runtime-slice elevation.canvas */
/* @runtime-slice storage.persistence */
/* @runtime-slice files.download */
/* @runtime-slice trails.mutations */
/* @runtime-slice ui.toast */
/* @runtime-slice files.export */
/* @runtime-slice app.render */

/* @runtime-slice files.kml */
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
  // 兜底主轨迹
  // v1.21.0：兜底选当前组内的第一条（而不是 DATA.trails[0]，可能不在当前组）
  if(state.activeGroup != null && !state.primaryTrailId && DATA.trails.length) {
    const inGroup = DATA.trails.filter(t => trailGroup(t) === state.activeGroup);
    dispatchState({type:'primary-trail.set', trailId:(inGroup[0] || DATA.trails[0]).id});
  }
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
 */
/* @runtime-slice map.fit */
/* @runtime-slice ui.sidebar-toggle */
/* @runtime-slice waypoint.interaction */
function hasPrimaryTrail() {
  const trail = DATA.trails.find(item => item.id === state.primaryTrailId);
  return Boolean(trail && trail.track && trail.track.length);
}

function toggleMeasureCommand() {
  if(interactionManager.current.kind === 'measure') measureExit();
  else measureEnter();
}

function toggleSegmentCommand() {
  if(interactionManager.current.kind === 'segment') segmentExit();
  else segmentEnter();
}

function toggleWaypointCommand() {
  if(interactionManager.current.kind === 'waypoint') exitAddWaypointMode();
  else enterAddWaypointMode();
}

function toggleEscapeCommand() {
  if(interactionManager.current.kind === 'escape') addEscapeExit();
  else addEscapeEnter();
}

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
    register(STUDIO_COMMANDS.TRAIL_REVERSE, reversePrimaryTrailCommand, {enabled:hasPrimaryTrail}),
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
    register(STUDIO_COMMANDS.MAP_RESET, () => resetView({restoreActive:true}), {enabled:hasTrails}),
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
    register(STUDIO_COMMANDS.WORKSPACE_PROJECT, () => activateSidebarTab('trails')),
    register(STUDIO_COMMANDS.WORKSPACE_TRAILS, () => activateSidebarTab('trails')),
    register(STUDIO_COMMANDS.WORKSPACE_ITINERARY, () => activateSidebarTab('days')),
    register(STUDIO_COMMANDS.WORKSPACE_WAYPOINTS, () => {
      activateSidebarTab('trails');
      setMapMode('waypoint');
    }),
    register(STUDIO_COMMANDS.WORKSPACE_ESCAPE, () => activateSidebarTab('escape')),
    register(STUDIO_COMMANDS.WORKSPACE_STATISTICS, () => undefined),
    register(STUDIO_COMMANDS.WORKSPACE_SETTINGS, () => undefined),
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
