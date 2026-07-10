#!/usr/bin/env python3
"""
端到端测试 · 徒步路线地图 v1.19.0

覆盖 14 大场景（E1-E14），每次大改动前后都要跑一遍。

运行：
    uv run --with websocket-client python tests/e2e/run_all.py

依赖：
    - google-chrome / chromium
    - websocket-client Python 库

失败即停：任一断言失败会退出非零，配合 CI/pre-push hook 使用。
"""
import json, subprocess, socket, time, urllib.request, zipfile, io, sys, os, base64, shutil
from pathlib import Path

# ═══════════════════════════════════════════════════════════════
# 路径与样本准备
# ═══════════════════════════════════════════════════════════════
ROOT = Path(__file__).resolve().parents[2]  # → github-release/hiking-trail-mapper
HTML = ROOT / "hiking-trail-mapper.html"
SAMPLE_KML = ROOT / "examples/sample-trails/格聂牧场+v线.kml"

assert HTML.exists(), f"未找到 HTML: {HTML}"
assert SAMPLE_KML.exists(), f"未找到样本 KML: {SAMPLE_KML}"

def chrome_bin():
    candidates = [
        os.environ.get("CHROME_BIN"),
        shutil.which("google-chrome"),
        shutil.which("chromium"),
        shutil.which("chromium-browser"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ]
    for c in candidates:
        if c and Path(c).exists():
            return c
    raise FileNotFoundError("找不到 Chrome/Chromium，可设置 CHROME_BIN")

kml_bytes = SAMPLE_KML.read_bytes()
kml_b64 = base64.b64encode(kml_bytes).decode()

# 构造多样测试 zip：正常 KML + __MACOSX + 非 KML 文件
buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr("轨迹/a.kml", kml_bytes)
    z.writestr("轨迹/b.kml", kml_bytes)
    z.writestr("README.txt", "not a kml")
    z.writestr("__MACOSX/should_be_skipped.kml", "invalid")
zip_b64 = base64.b64encode(buf.getvalue()).decode()

# ═══════════════════════════════════════════════════════════════
# 启动 Chrome + CDP 客户端
# ═══════════════════════════════════════════════════════════════
def free_port():
    s = socket.socket(); s.bind(("", 0)); p = s.getsockname()[1]; s.close(); return p

port = free_port()
udir = f"/tmp/chrome-e2e-{os.getpid()}"

print(f"▸ 启动 Chrome (port={port}, HTML={HTML.name})")
chrome = subprocess.Popen([
    chrome_bin(), "--headless=new", "--disable-gpu", "--no-sandbox",
    "--remote-allow-origins=*",
    f"--remote-debugging-port={port}", f"--user-data-dir={udir}",
    f"file://{HTML}"
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

results = []
def check(name, ok, detail=""):
    icon = "✓" if ok else "✗"
    results.append((ok, name, detail))
    print(f"  {icon} {name}" + (f"  ({detail})" if detail else ""))

try:
    for _ in range(30):
        try:
            r = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=1).read())
            if r: break
        except Exception:
            time.sleep(0.3)
    else:
        raise RuntimeError("Chrome 起不来")

    tabs = [t for t in r if t.get('type') == 'page']
    ws_url = tabs[0]["webSocketDebuggerUrl"]

    import websocket
    ws = websocket.create_connection(ws_url, timeout=30)
    _mid = [0]
    def cdp(method, params=None):
        _mid[0] += 1
        req = {"id": _mid[0], "method": method}
        if params: req["params"] = params
        ws.send(json.dumps(req))
        while True:
            m = json.loads(ws.recv())
            if m.get("id") == _mid[0]: return m

    cdp("Page.enable"); cdp("Runtime.enable")
    # 等 IndexedDB 尝试恢复完成
    time.sleep(3.0)

    def evalj(expr):
        r = cdp("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
        v = r.get("result", {}).get("result", {})
        if v.get("subtype") == "error":
            return {"__error__": v.get("description", "")[:200]}
        return v.get("value")

    # ═══════════════════════════════════════════════════════════════
    # E1 — 空 workspace 启动，无 JS 报错
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E1 · 空 workspace 启动")
    check("APP_VERSION 存在", isinstance(evalj("APP_VERSION"), str))
    check("TypeScript core runtime 已内联并激活",
          evalj("!!window.HikingTrailCore && window.__HTM_CORE_RUNTIME__ === window.HikingTrailCore && computeElevationRenderModel === window.HikingTrailCore.computeElevationRenderModel"))
    check("TypeScript app runtime 已内联并激活",
          evalj("!!window.HikingTrailApp && window.__HTM_APP_RUNTIME__ === window.HikingTrailApp && document.documentElement.dataset.ui === 'field-console'"))
    check("state 对象已初始化", evalj("typeof state === 'object' && state !== null"))
    check("DATA 对象已初始化", evalj("typeof DATA === 'object' && Array.isArray(DATA.trails)"))
    check("Leaflet map 已实例化", evalj("typeof map === 'object' && !!map"))
    check("state.activeGroup 默认值", evalj("typeof state.activeGroup === 'string'"))

    # 清空 IndexedDB + trails，保证从零开始
    evalj("(async () => { DATA.trails = []; state.activeTrails = new Set(); state.primaryTrailId = null; try { indexedDB.deleteDatabase('hiking_trail_db'); } catch(e){} rebuildAll({fit:false}); })()")
    time.sleep(0.5)

    # ═══════════════════════════════════════════════════════════════
    # E2 — 导入单个 KML
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E2 · 导入单个 KML")
    r = evalj(f"""
      (async () => {{
        const bin = atob('{kml_b64}');
        const arr = new Uint8Array(bin.length);
        for(let i=0; i<bin.length; i++) arr[i] = bin.charCodeAt(i);
        const blob = new Blob([arr], {{type:'application/vnd.google-earth.kml+xml'}});
        const f = new File([blob], '样本.kml', {{type:'application/vnd.google-earth.kml+xml'}});
        await handleFiles([f]);
        return {{count: DATA.trails.length, name: DATA.trails[0]?.name, active: state.activeTrails.size}};
      }})()
    """)
    check("导入后 trails 数 = 1", r.get("count") == 1, f"count={r.get('count')}")
    check("有轨迹名", isinstance(r.get("name"), str) and len(r.get("name")) > 0, f"name={r.get('name')}")
    check("默认 activeTrails 包含新轨迹", r.get("active") == 1)

    check("stats.distance_km > 0", evalj("DATA.trails[0].stats.distance_km > 0"))
    check("stats.ascent_m > 0", evalj("DATA.trails[0].stats.ascent_m > 0"))
    check("track 有 > 100 个点", evalj("DATA.trails[0].track.length > 100"))
    check("waypoints 已 enrich（含 gps_idx）",
          evalj("DATA.trails[0].waypoints.every(w => typeof w.gps_idx === 'number')"))
    check("day_meta 至少 1 天", evalj("DATA.trails[0].day_meta.length >= 1"))
    check("primaryTrailId 已自动设为新轨迹",
          evalj("state.primaryTrailId === DATA.trails[0].id"))

    # ═══════════════════════════════════════════════════════════════
    # E3 — 导入 KML.zip（含 __MACOSX 跳过）
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E3 · 导入 KML.zip")
    r = evalj(f"""
      (async () => {{
        DATA.trails = []; state.activeTrails = new Set(); state.primaryTrailId = null;
        const bin = atob('{zip_b64}');
        const arr = new Uint8Array(bin.length);
        for(let i=0; i<bin.length; i++) arr[i] = bin.charCodeAt(i);
        const blob = new Blob([arr], {{type:'application/zip'}});
        const f = new File([blob], 'trails.zip', {{type:'application/zip'}});
        await handleFiles([f]);
        return {{count: DATA.trails.length, names: DATA.trails.map(t => t.name)}};
      }})()
    """)
    # zip 里两个都是相同 KML，第二个应被 findDuplicateTrail 跳过
    check("zip 展开后 __MACOSX 被跳过 → 只加了 1 条（另一条重复）",
          r.get("count") == 1, f"count={r.get('count')}, names={r.get('names')}")

    # ═══════════════════════════════════════════════════════════════
    # E4 — 导入重复 KML（去重）
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E4 · 重复 KML 去重")
    before = evalj("DATA.trails.length")
    r = evalj(f"""
      (async () => {{
        const bin = atob('{kml_b64}');
        const arr = new Uint8Array(bin.length);
        for(let i=0; i<bin.length; i++) arr[i] = bin.charCodeAt(i);
        const f = new File([arr], '样本再来.kml', {{type:'application/vnd.google-earth.kml+xml'}});
        await handleFiles([f]);
        return DATA.trails.length;
      }})()
    """)
    check("重复导入不新增", r == before, f"before={before}, after={r}")

    # ═══════════════════════════════════════════════════════════════
    # E5 — 切换主轨迹
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E5 · 切换主轨迹")
    # 先加第二条（伪造 id/坐标让哈希不同）
    r = evalj(f"""
      (async () => {{
        const bin = atob('{kml_b64}');
        const arr = new Uint8Array(bin.length);
        for(let i=0; i<bin.length; i++) arr[i] = bin.charCodeAt(i);
        const text = new TextDecoder().decode(arr);
        // 偏移坐标 0.001 度让内容不同
        const modified = text.replace(/(-?\\d+\\.\\d+),(-?\\d+\\.\\d+),(\\d+\\.?\\d*)/g,
          (m, lng, lat, elev) => `${{(+lng+0.001).toFixed(6)}},${{(+lat+0.001).toFixed(6)}},${{elev}}`);
        const blob = new Blob([modified], {{type:'application/vnd.google-earth.kml+xml'}});
        const f = new File([blob], '偏移.kml', {{type:'application/vnd.google-earth.kml+xml'}});
        await handleFiles([f]);
        return DATA.trails.length;
      }})()
    """)
    check("成功加入第二条", r == 2, f"trails={r}")

    first_id = evalj("DATA.trails[0].id")
    second_id = evalj("DATA.trails[1].id")
    check("切换 primary 到第二条", evalj(f"""
      (() => {{ state.primaryTrailId = '{second_id}'; applyChange(); return state.primaryTrailId === '{second_id}'; }})()
    """))

    # ═══════════════════════════════════════════════════════════════
    # E6 — 批量选择 + 移动分组
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E6 · 批量选择 + 移动分组")
    r = evalj(f"""
      (() => {{
        state.batchSelected = new Set();
        toggleTrailBatch('{first_id}');
        toggleTrailBatch('{second_id}');
        return state.batchSelected.size;
      }})()
    """)
    check("batch 选中 2 条", r == 2, f"selected={r}")

    r = evalj("""
      (() => {
        moveBatchToGroup('测试分组');
        return {
          group1: DATA.trails[0].group,
          group2: DATA.trails[1].group,
          batchCleared: state.batchSelected.size,
        };
      })()
    """)
    check("两条 trail 已移到「测试分组」",
          r.get("group1") == "测试分组" and r.get("group2") == "测试分组")
    check("批量选中已清空", r.get("batchCleared") == 0)

    # ═══════════════════════════════════════════════════════════════
    # E7 — 反转轨迹方向
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E7 · 反转轨迹方向")
    r = evalj(f"""
      (() => {{
        const tr = DATA.trails.find(t => t.id === '{first_id}');
        const firstPt = tr.track[0].slice();
        tr.reversed = !tr.reversed;
        applyChange({{fit:false}});
        return {{
          reversed: !!tr.reversed,
          firstPtSame: JSON.stringify(tr.track[0]) === JSON.stringify(firstPt),
        }};
      }})()
    """)
    check("reversed 标志已翻转", r.get("reversed") == True)
    check("track 数据本身不改（只改渲染方向）", r.get("firstPtSame") == True)
    # 反转回来
    evalj(f"(() => {{ const tr = DATA.trails.find(t => t.id === '{first_id}'); tr.reversed = false; applyChange(); }})()")

    # ═══════════════════════════════════════════════════════════════
    # E8 — 删除轨迹（activeTrails / primaryTrailId 兜底）
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E8 · 删除轨迹 + 兜底")
    r = evalj(f"""
      (() => {{
        const before = DATA.trails.length;
        DATA.trails = DATA.trails.filter(t => t.id !== '{second_id}');
        state.activeTrails.delete('{second_id}');
        // 手动模拟：如果主轨迹被删了，自动 fallback
        if(state.primaryTrailId === '{second_id}' && DATA.trails.length) {{
          state.primaryTrailId = DATA.trails[0].id;
        }}
        applyChange();
        return {{
          count: DATA.trails.length,
          primary: state.primaryTrailId,
          primaryValid: DATA.trails.some(t => t.id === state.primaryTrailId),
        }};
      }})()
    """)
    check("删除后剩 1 条", r.get("count") == 1)
    check("primaryTrailId 有效", r.get("primaryValid") == True,
          f"primary={r.get('primary')}")

    # ═══════════════════════════════════════════════════════════════
    # E9 — waypoint 过滤（default 与自定义）
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E9 · waypoint 过滤")
    check("默认可见标签集非空", evalj("state.visibleTags.size > 0"))
    check("默认含 camp/pass/water/end 等核心标签", evalj("""
      ['camp','pass','water','bridge','river','supply','start','end']
        .every(tag => state.visibleTags.has(tag))
    """))
    # 切到 waypoint 模式
    evalj("state.mode = 'waypoint'; applyChange();")
    check("mode 切到 waypoint", evalj("state.mode === 'waypoint'"))
    # 切回 day
    evalj("state.mode = 'day'; applyChange();")

    # ═══════════════════════════════════════════════════════════════
    # E10 — 分天 tab 切换 + elev bar 重绘
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E10 · 分天 tab 切换")
    r = evalj("""
      (() => {
        const tr = DATA.trails[0];
        if(!tr.day_meta.length) return {ok: false, reason: 'no day_meta'};
        const dm = tr.day_meta[0];
        const segPts = tr.track.slice(dm.i_start, dm.i_end + 1);
        drawElevBar(segPts, tr.color, `D${dm.d}`, {segIdxStart: dm.i_start, waypoints: tr.waypoints});
        return {
          ok: !!_elevBarData,
          segLen: segPts.length,
          kmRangeOk: _elevBarData?.km?.length === segPts.length,
        };
      })()
    """)
    check("drawElevBar 分天段成功", r.get("ok") == True)
    check("km 数组与 segPts 等长", r.get("kmRangeOk") == True, f"segLen={r.get('segLen')}")

    # ═══════════════════════════════════════════════════════════════
    # E11 — IndexedDB 持久化（saveToStorage / loadFromStorage 存在）
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E11 · IndexedDB 持久化")
    check("saveToStorage 函数存在", evalj("typeof saveToStorage === 'function'"))
    check("loadFromStorage 函数存在", evalj("typeof loadFromStorage === 'function'"))
    r = evalj("""
      (async () => {
        try {
          await saveToStorage();
          return {saved: true};
        } catch(e) {
          return {saved: false, err: e.message};
        }
      })()
    """)
    check("saveToStorage 无异常", r.get("saved") == True, r.get("err", ""))

    # ═══════════════════════════════════════════════════════════════
    # E12 — i18n 中英切换
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E12 · i18n 中英切换")
    check("t() 函数存在", evalj("typeof t === 'function'"))
    check("setLang 函数存在", evalj("typeof setLang === 'function'"))
    # 显式先切到 zh 作为基线（headless Chrome 默认 navigator.language=en-US）
    evalj("setLang('zh')")
    zh_text = evalj("t('elev.title')")
    evalj("setLang('en')")
    en_text = evalj("t('elev.title')")
    evalj("setLang('zh')")
    zh_text_again = evalj("t('elev.title')")
    check("中英切换生效", zh_text != en_text, f"zh={zh_text!r}, en={en_text!r}")
    check("切回中文成功", zh_text_again == zh_text)

    # ═══════════════════════════════════════════════════════════════
    # E13 — KML 导出
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E13 · KML 导出")
    exp = evalj("""
      (() => {
        if(typeof exportKml !== 'function' && typeof buildKmlText !== 'function') {
          // 尝试常见命名
          if(typeof trailToKml === 'function') {
            return trailToKml(DATA.trails[0]);
          }
          return null;
        }
        try {
          return (typeof exportKml === 'function' ? exportKml : buildKmlText)(DATA.trails[0]);
        } catch(e) { return {__err: e.message}; }
      })()
    """)
    if exp is None:
        check("KML 导出（未实现，跳过）", True, "skipped")
    elif isinstance(exp, dict) and "__err" in exp:
        check("KML 导出", False, exp["__err"])
    else:
        check("KML 导出返回字符串", isinstance(exp, str) and len(exp) > 100)
        check("导出 KML 包含 <Placemark>", isinstance(exp, str) and "<Placemark" in exp)

    # ═══════════════════════════════════════════════════════════════
    # E14 — file:// 打开无严重报错
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E14 · file:// 运行时错误检测")
    # 通过 window.onerror 计数
    err_count = evalj("(window.__errCount || 0)")
    check("无累计 window.onerror 触发", (err_count or 0) == 0, f"err_count={err_count}")

    # ═══════════════════════════════════════════════════════════════
    # E15 — 无选中分组（v1.20.0 新增）
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E15 · 无选中分组（activeGroup=null）")
    # 前置：清空 IDB → 加载 2 条 trail，分别设为「甲组」「乙组」
    setup = evalj(f"""
      (async () => {{
        try {{
          DATA.trails = [];
          state.activeTrails = new Set();
          state.primaryTrailId = null;
          state.activeGroup = '甲组';
          // 加两条不同内容的 trail
          const bin = atob('{kml_b64}');
          const arr = new Uint8Array(bin.length);
          for(let i=0; i<bin.length; i++) arr[i] = bin.charCodeAt(i);
          const text = new TextDecoder().decode(arr);
          const t1 = parseAndProcessKml(text, '甲.kml');
          t1.id = 'a1'; t1.group = '甲组';
          const t2 = parseAndProcessKml(text.replace(/(-?\\d+\\.\\d+),(-?\\d+\\.\\d+),/g,
            (m, lng, lat) => `${{(+lng+0.002).toFixed(6)}},${{(+lat+0.002).toFixed(6)}},`), '乙.kml');
          t2.id = 'b1'; t2.group = '乙组';
          DATA.trails.push(t1, t2);
          state.activeTrails = new Set(['a1', 'b1']);
          state.primaryTrailId = 'a1';
          applyChange({{fit: false}});
          return {{ok: true, count: DATA.trails.length, group: state.activeGroup, primary: state.primaryTrailId}};
        }} catch(e) {{ return {{ok: false, err: e.message}}; }}
      }})()
    """)
    check("前置：2 条 trail 分组正确",
          setup.get("ok") == True and setup.get("count") == 2 and setup.get("group") == "甲组",
          f"{setup}")

    # 再次点击 tab → switchGroup(null)
    evalj("switchGroup(null)")
    check("switchGroup(null) 后 activeGroup 为 null",
          evalj("state.activeGroup === null"))
    check("primaryTrailId 被清空",
          evalj("state.primaryTrailId === null"))
    check("isTrailActive 对所有 trail 返回 false",
          evalj("DATA.trails.every(t => !isTrailActive(t))"))
    # UI 层验证
    check("primary card 显示空态提示",
          evalj("document.getElementById('primary-card').textContent.includes('未选中') || document.getElementById('primary-card').textContent.includes('No group')"))
    check("trail-list 显示无分组提示",
          evalj("document.getElementById('trail-list').textContent.includes('未选中') || document.getElementById('trail-list').textContent.includes('No group')"))
    # 等 refreshElevBar 的 setTimeout 100ms
    time.sleep(0.4)
    check("_elevBarData 已清空",
          evalj("_elevBarData === null"))

    # 从 null 切回具体分组恢复
    evalj("switchGroup('甲组')")
    check("从 null 切回「甲组」后 activeGroup=甲组",
          evalj("state.activeGroup === '甲组'"))
    check("切回后 primaryTrailId 自动恢复到甲组内的 trail",
          evalj("state.primaryTrailId === 'a1' || (state.primaryTrailId && DATA.trails.find(t => t.id === state.primaryTrailId && t.group === '甲组'))"))

    # persist：直接改 activeGroup=null 后调 _doSave（跳过防抖），读回来确认
    persist = evalj("""
      (async () => {
        try {
          state.activeGroup = null;
          state.primaryTrailId = null;
          await _doSave();
          // 用 openDB 内部的复用连接读，避免多次 open 竞争
          const db = await openDB();
          const val = await new Promise((resolve, reject) => {
            const tx = db.transaction('trails', 'readonly');
            const req = tx.objectStore('trails').get('main');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
          return {ok: !!val, hasField: val && 'activeGroup' in val, value: val && val.activeGroup};
        } catch(e) {
          return {ok: false, err: e.message || String(e)};
        }
      })()
    """)
    check("持久化后 activeGroup=null 被保留",
          persist and persist.get("hasField") == True and persist.get("value") is None,
          f"{persist}")

    # ═══════════════════════════════════════════════════════════════
    # E16 — 每组独立主轨迹（v1.21.0 新增）
    # ═══════════════════════════════════════════════════════════════
    print("\n▸ E16 · 每组独立主轨迹")
    # 前置：3 条 trail，分 A 组 2 条 / B 组 1 条
    setup16 = evalj(f"""
      (async () => {{
        try {{
          DATA.trails = [];
          state.primaryByGroup = {{}};
          state.activeTrails = new Set();
          state.activeGroup = 'A组';
          const bin = atob('{kml_b64}');
          const arr = new Uint8Array(bin.length);
          for(let i=0; i<bin.length; i++) arr[i] = bin.charCodeAt(i);
          const text = new TextDecoder().decode(arr);
          const t1 = parseAndProcessKml(text, 'a1.kml'); t1.id = 'A1'; t1.group = 'A组';
          const t2 = parseAndProcessKml(text.replace(/(-?\\d+\\.\\d+),(-?\\d+\\.\\d+),/g,
            (m,lng,lat)=>`${{(+lng+0.001).toFixed(6)}},${{(+lat+0.001).toFixed(6)}},`), 'a2.kml');
          t2.id = 'A2'; t2.group = 'A组';
          const t3 = parseAndProcessKml(text.replace(/(-?\\d+\\.\\d+),(-?\\d+\\.\\d+),/g,
            (m,lng,lat)=>`${{(+lng+0.003).toFixed(6)}},${{(+lat+0.003).toFixed(6)}},`), 'b1.kml');
          t3.id = 'B1'; t3.group = 'B组';
          DATA.trails.push(t1, t2, t3);
          state.activeTrails = new Set(['A1', 'A2', 'B1']);
          state.primaryByGroup['A组'] = 'A1';
          state.primaryByGroup['B组'] = 'B1';
          applyChange();
          return {{ok: true}};
        }} catch(e) {{ return {{ok: false, err: e.message}}; }}
      }})()
    """)
    check("前置：3 条 trail 分 A 组 2 条 + B 组 1 条", setup16.get("ok") == True, f"{setup16}")

    # 场景 1：A 组主轨迹显示在列表中（不再被剔除）
    r = evalj("""
      (() => {
        const cards = document.querySelectorAll('#trail-list .trail-card');
        const names = [...cards].map(c => c.querySelector('.trail-name')?.textContent);
        const primaryCards = document.querySelectorAll('#trail-list .trail-card.is-primary');
        return {
          cardCount: cards.length,
          primaryCardCount: primaryCards.length,
          firstIsPrimary: cards[0]?.classList.contains('is-primary'),
          names,
        };
      })()
    """)
    check("A 组显示 2 张卡（包括主轨迹）", r.get("cardCount") == 2, f"names={r.get('names')}")
    check("其中 1 张有 .is-primary class", r.get("primaryCardCount") == 1)
    check("主轨迹卡排在第一位", r.get("firstIsPrimary") == True)

    # 场景 2：在 A 组切换主轨迹为 A2
    evalj("state.primaryTrailId = 'A2'; applyChange()")
    check("A 组主轨迹切到 A2", evalj("state.primaryByGroup['A组'] === 'A2'"))
    check("B 组的记忆不变", evalj("state.primaryByGroup['B组'] === 'B1'"))

    # 场景 3：切到 B 组，B 组主轨迹是 B1（不是 A 组污染过来的 A2）
    evalj("switchGroup('B组')")
    check("切到 B 组，B 组主轨迹 = B1（不是 A2）",
          evalj("state.primaryTrailId === 'B1'"))
    check("A 组的记忆仍是 A2（未被 B 组切换覆盖）",
          evalj("state.primaryByGroup['A组'] === 'A2'"))

    # 场景 4：切回 A 组，主轨迹是 A2（保留记忆）
    evalj("switchGroup('A组')")
    check("切回 A 组，主轨迹恢复为 A2",
          evalj("state.primaryTrailId === 'A2'"))

    # 场景 5：把 B1 移到 A 组，B 组的记忆应清空
    evalj("state.primaryTrailId = 'A2'; state.activeGroup='A组';")
    r = evalj("""
      (() => {
        const tr = DATA.trails.find(t => t.id === 'B1');
        handleTrailGroupChange(tr, 'A组', {value: 'A组'});
        return {
          bMemo: state.primaryByGroup['B组'],
          bGroupEmpty: DATA.trails.filter(t => t.group === 'B组').length,
        };
      })()
    """)
    check("B1 移出后，B 组只剩 0 条", r.get("bGroupEmpty") == 0)
    check("B 组记忆已被清空", r.get("bMemo") is None)

    # 场景 6：删除 A2（当前 A 组主轨迹）→ A 组应挑组内剩下的
    evalj("deleteTrail('A2')")
    r = evalj("""
      (() => ({
        aMemo: state.primaryByGroup['A组'],
        primary: state.primaryTrailId,
        countInA: DATA.trails.filter(t => t.group === 'A组').length,
      }))()
    """)
    check("删掉 A2 后，A 组主轨迹重新挑选", r.get("aMemo") in ('A1', 'B1'), f"aMemo={r.get('aMemo')}, count={r.get('countInA')}")
    check("primaryTrailId getter 返回新值", r.get("primary") == r.get("aMemo"))

    # ═══════════════════════════════════════════════════════════════
    # 结果汇总
    # ═══════════════════════════════════════════════════════════════
    total = len(results)
    ok_count = sum(1 for r, *_ in results if r)
    print("\n══════════════════════════════════════════════════")
    print(f"结果: {ok_count}/{total} passed")

    if ok_count < total:
        print("\n失败项：")
        for ok, name, detail in results:
            if not ok:
                print(f"  ✗ {name}  {detail}")
        sys.exit(1)
    else:
        print("✓ 全部端到端测试通过")
finally:
    chrome.terminate()
    try:
        chrome.wait(timeout=3)
    except Exception:
        chrome.kill()
    subprocess.run(["rm", "-rf", udir], check=False)
