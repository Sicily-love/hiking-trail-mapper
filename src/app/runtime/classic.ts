// @ts-nocheck
// Transitional classic fragments owned by application state and render orchestration.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment app.state */
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

/* @runtime-fragment app.render */
function renderSidebarNow() {
  buildTrailList();
  buildHeaderStats();
  buildFilterGrid();
}

function renderDaysNow() {
  buildDaysTab();
  buildEscapeTab();
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
