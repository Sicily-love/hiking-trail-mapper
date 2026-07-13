// @ts-nocheck
// Transitional classic fragments owned by trail mutations.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment trails.mutations */
function deleteTrail(id) {
  DATA.trails = DATA.trails.filter(t => t.id !== id);
  dispatchState({type:'trail.remove', trailId:id});
  // 如果当前组没有主轨迹了，也不强制兜底（rebuildAll 会处理）
  saveToStorage();
  rebuildAll();
}

// 反向一条轨迹：翻转 track + 重算里程/爬升/下降/天数 + 翻转 waypoints
function reverseTrail(id) {
  const trail = DATA.trails.find(t => t.id === id);
  if(!trail || !trail.track || !trail.track.length) return;

  // 1. 翻转 track 点顺序
  trail.track.reverse();

  // 2. 重算累计里程（cumD），爬升（cumA），下降（cumDesc），天数
  const elevs = trail.track.map(p => p[2]);
  const cumA = accumulatorAscent(elevs, 10);
  const cumDesc = accumulatorDescent(elevs, 10);
  let cumD = 0;
  for(let i=0; i<trail.track.length; i++) {
    if(i > 0) {
      cumD += haversine(trail.track[i-1][0], trail.track[i-1][1], trail.track[i][0], trail.track[i][1]);
    }
    trail.track[i][3] = +(cumD/1000).toFixed(2);  // km
    trail.track[i][4] = Math.round(cumA[i]);        // cum ascent
    // 天数反向：D1→Dn, D2→Dn-1...
  }

  // 3. 反向天数标签（把 D1..Dn 翻转为 Dn..D1）
  const nDays = trail.days || 1;
  if(nDays > 1) {
    trail.track.forEach(p => { if(p[5]) p[5] = nDays - p[5] + 1; });
  }

  // 4. 更新 stats（爬升/下降交换，因为反向后原下降变爬升）
  const totalAsc = Math.round(cumA[cumA.length-1] || 0);
  const totalDesc = Math.round(cumDesc[cumDesc.length-1] || 0);
  trail.stats.ascent_m = totalAsc;
  trail.stats.descent_m = totalDesc;
  // 距离不变（标量），最高最低也不变

  // 5. 更新 _descCum
  trail._descCum = cumDesc;

  // 6. 翻转 waypoints 的 km / elev / gps_idx（gps_idx 重新 snap 到新顺序）
  if(trail.waypoints && trail.waypoints.length) {
    const totalKm = trail.stats.distance_km;
    trail.waypoints.forEach(wp => {
      // km 映射：原始 km → totalKm - km（镜像）
      if(wp.km !== undefined) wp.km = +(totalKm - wp.km).toFixed(1);
      // lat/lng 不变，重新 snap 到新顺序，更新 gps_idx + km + elev
      if(wp.lat && wp.lng) {
        let bestI = 0, bestD = Infinity;
        for(let i=0; i<trail.track.length; i++) {
          const d = haversine(wp.lat, wp.lng, trail.track[i][0], trail.track[i][1]);
          if(d < bestD) { bestD = d; bestI = i; }
        }
        wp.gps_idx = bestI;
        wp.km = +(trail.track[bestI][3]).toFixed(1);
        wp.elev = Math.round(trail.track[bestI][2]);
      } else if(wp.gps_idx != null) {
        // 没 lat/lng 但有 gps_idx：直接镜像 idx
        wp.gps_idx = (trail.track.length - 1) - wp.gps_idx;
      }
    });
    // 按 km 重新排序
    trail.waypoints.sort((a,b) => (a.km||0) - (b.km||0));
  }

  // 7. 缓存失效
  delete trail._descCum;
  trail._descCum = cumDesc;
  markTrailRevision(trail);

  saveToStorage();
  rebuildAll({fit: false});
  showToast(`⇄ 「${trail.name}」已反向`);
}

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
  DATA.trails = [];
  dispatchState({type:'workspace.clear'});
  await clearStorage();
  rebuildAll();
  commandRegistry.notifyChanged();
  return true;
}
