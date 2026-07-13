// @ts-nocheck
// Transitional classic fragments owned by storage.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment storage.info */
async function showStorageInfo() {
  let modal = document.getElementById('storage-modal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'storage-modal';
    modal.className = 'modal-mask';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:480px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3 data-i18n="storage.title" style="margin:0">${t('storage.title')}</h3>
          <button class="btn-mini" data-modal-close data-i18n="changelog.close">${t('changelog.close')}</button>
        </div>
        <div id="storage-info" style="font-size:12px;line-height:1.8;color:var(--text-base)"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('[data-modal-close]')?.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
  }
  const info = modal.querySelector('#storage-info');
  let html = '';
  try {
    if(navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      const usedMB = (est.usage / 1024 / 1024).toFixed(2);
      const quotaMB = (est.quota / 1024 / 1024).toFixed(0);
      const pct = ((est.usage / est.quota) * 100).toFixed(1);
      html += `<div style="margin-bottom:6px"><b>${t('storage.used')}:</b> ${usedMB} MB</div>`;
      html += `<div style="margin-bottom:6px"><b>${t('storage.total')}:</b> ${quotaMB} MB (${pct}%)</div>`;
      html += `<div style="background:var(--bg-2);border-radius:4px;overflow:hidden;height:8px;margin:8px 0"><div style="height:100%;background:linear-gradient(90deg,#10b981,#facc15,#ef4444);width:${pct}%"></div></div>`;
      html += `<div style="margin-top:10px;font-size:11px;color:var(--text-muted)">轨迹数: <b>${DATA.trails.length}</b></div>`;
    } else {
      html += `<div style="color:var(--text-muted)">浏览器不支持 storage.estimate API</div>`;
    }

    let persisted = false;
    if(navigator.storage && navigator.storage.persisted) {
      persisted = await navigator.storage.persisted();
    }

    if(persisted) {
      html += `<div style="margin-top:14px;color:#10b981;font-weight:600">${t('storage.persisted')}</div>`;
      html += `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">数据不会被浏览器自动清理</div>`;
    } else {
      html += `<button class="btn-mini" id="persist-btn" style="margin-top:14px;background:var(--accent);color:#000;padding:6px 14px">${t('storage.persist')}</button>`;
      html += `<div style="font-size:11px;color:var(--text-muted);margin-top:6px">默认浏览器在存储不足时可能清理本站数据。点击"持久化"请求保留</div>`;
    }

    html += `<div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border);font-size:11px;color:var(--text-muted);line-height:1.7">
      <b>关于浏览器存储配额：</b><br>
      • 配额由浏览器自动管理（一般为可用磁盘 60%）<br>
      • 无法手动设置容量上限<br>
      • 推荐：定期点击「📤 导出」备份重要轨迹<br>
      • 配额不够时可在浏览器"设置 → 隐私 → 站点设置"清理其他网站数据
    </div>`;
  } catch(e) {
    html = '<div style="color:#ef4444">' + e.message + '</div>';
  }
  info.innerHTML = html;

  const persistBtn = info.querySelector('#persist-btn');
  if(persistBtn) {
    persistBtn.addEventListener('click', async () => {
      try {
        const ok = await navigator.storage.persist();
        if(ok) {
          showToast(t('storage.persisted'));
          showStorageInfo();
        } else {
          await studioDialogs.info({
            title:currentLang === 'zh' ? '无法持久化存储' : 'Persistent storage unavailable',
            message:'请求被拒绝。某些浏览器需要先把站点加为书签或频繁访问后才能持久化。',
          });
        }
      } catch(e) {
        await studioDialogs.info({
          title:currentLang === 'zh' ? '存储请求失败' : 'Storage request failed',
          message:'Failed: ' + e.message,
          danger:true,
        });
      }
    });
  }

  modal.classList.add('open');
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
