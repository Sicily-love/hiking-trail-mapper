// @ts-nocheck
// Transitional classic fragments owned by trail mutations.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment trails.mutations */
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

function deleteTrail(id) { return trailController.deleteTrail(id); }

function reverseTrail(id) { return trailController.reverseTrail(id); }

async function clearAllTrails() {
  if(!DATA.trails.length) return;
  const confirmed = await studioDialogs.confirm({
    title:currentLang === 'zh' ? '清空项目' : 'Clear project',
    message:currentLang === 'zh'
      ? `确定清除全部 ${DATA.trails.length} 条轨迹？此操作不可撤销。`
      : `Clear all ${DATA.trails.length} trails? This cannot be undone.`,
    danger:true,
    confirmLabel:currentLang === 'zh' ? '全部清除' : 'Clear all',
    cancelLabel:currentLang === 'zh' ? '取消' : 'Cancel',
  });
  if(!confirmed) return false;
  return trailController.clearTrails();
}
