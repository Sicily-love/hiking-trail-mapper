// @ts-nocheck
// Transitional classic fragments owned by storage.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment storage.info */
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



/* @runtime-fragment storage.persistence */
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
      if(tr.stats && (tr.stats.descent_m === undefined || tr.stats.descent_m === null) && tr.track && tr.track.length) {
        const elevs = tr.track.map(p => p[2] || 0);
        const arr = accumulatorDescent(elevs, 10);
        tr.stats.descent_m = Math.round(arr[arr.length-1] || 0);
      }
      // 兼容旧数据：补算 _descCum
      if(!tr._descCum && tr.track && tr.track.length) {
        tr._descCum = accumulatorDescent(tr.track.map(p => p[2] || 0), 10);
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
