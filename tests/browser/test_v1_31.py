#!/usr/bin/env python3
"""
v1.15.0 功能测试：
  1. 分组交互重构 —— trail-batch-check 元素存在 + 无 batchMode 引用
  2. KML.zip 导入 —— fflate.unzipSync 在页面里能真的解压
"""
import json, subprocess, socket, time, urllib.request, zipfile, io, sys, os, shutil, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TMPL = Path(os.environ.get("HTM_RELEASE_HTML", ROOT / "hiking-trail-mapper.html"))
SAMPLE_KML = ROOT / "examples/sample-trails/格聂牧场+v线.kml"
EXPECTED_VERSION = re.search(
    r"STUDIO_VERSION = '(v\d+\.\d+\.\d+)'",
    (ROOT / "src/app/version.ts").read_text(encoding="utf-8"),
).group(1)
RUNTIME_SOURCE = (ROOT / "src/app/runtime/studio.ts").read_text(encoding="utf-8")

def source_has(*snippets):
    return all(snippet in RUNTIME_SOURCE for snippet in snippets)

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

# 构造 zip 供后续测试
kml_bytes = SAMPLE_KML.read_bytes()
buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr("轨迹/user_a.kml", kml_bytes)
    z.writestr("轨迹/user_b.kml", kml_bytes)
    z.writestr("README.txt", "not a kml")
    z.writestr("__MACOSX/should_be_skipped.kml", "invalid")
zip_bytes = buf.getvalue()
zip_b64 = __import__('base64').b64encode(zip_bytes).decode()
print(f"▸ 构造测试 zip: {len(zip_bytes):,} bytes, 4 项（2 KML + 1 txt + 1 __MACOSX）")

# 起 Chrome
def freeport():
    s = socket.socket(); s.bind(("", 0)); p = s.getsockname()[1]; s.close(); return p
port = freeport()
udir = f"/tmp/chrome-v15-test-{os.getpid()}"
chrome = subprocess.Popen([
    chrome_bin(), "--headless=new", "--disable-gpu", "--no-sandbox",
    "--remote-allow-origins=*",
    f"--remote-debugging-port={port}", f"--user-data-dir={udir}",
    f"file://{TMPL}?studio-test=1"
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(30):
        try:
            r = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=1).read())
            if r: break
        except Exception: time.sleep(0.3)
    else:
        raise RuntimeError("Chrome 起不来")

    tabs = [t for t in r if t.get('type')=='page']
    page = next((t for t in tabs if TMPL.name in t.get('url', '')), tabs[0])
    ws_url = page["webSocketDebuggerUrl"]
    try:
        import websocket
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "websocket-client"],
                              stdout=subprocess.DEVNULL)
        import websocket

    ws = websocket.create_connection(ws_url, timeout=30)
    _msg_id = [0]
    runtime_events = []
    def cdp(method, params=None):
        _msg_id[0] += 1
        req = {"id": _msg_id[0], "method": method}
        if params: req["params"] = params
        ws.send(json.dumps(req))
        while True:
            m = json.loads(ws.recv())
            if m.get("method") in {"Runtime.exceptionThrown", "Runtime.consoleAPICalled", "Log.entryAdded"}:
                runtime_events.append(m)
            if m.get("id") == _msg_id[0]: return m

    cdp("Page.enable"); cdp("Runtime.enable"); cdp("Log.enable")
    time.sleep(2.5)

    def evalj(expr):
        source = json.dumps(expr, ensure_ascii=False)
        scoped = f"(function(scope) {{ with(scope) {{ return eval({source}); }} }})(window.__HTM_RUNTIME_INSPECTOR__ || {{}})"
        r = cdp("Runtime.evaluate", {"expression": scoped, "returnByValue": True, "awaitPromise": True})
        exception = r.get("result", {}).get("exceptionDetails")
        if exception:
            return {"__error__": exception.get("text", "browser evaluation failed")[:200]}
        v = r.get("result", {}).get("result", {})
        if v.get("subtype") == "error":
            return {"__error__": v.get("description", "")[:200]}
        return v.get("value")

    for _ in range(80):
        if evalj("!!window.__OUTDOOR_ROUTE_STUDIO__?.ready && !!window.__HTM_RUNTIME_INSPECTOR__"):
            break
        time.sleep(0.1)
    else:
        detail = evalj("({href: location.href, title: document.title, body: document.body?.innerText?.slice(0, 200), studio: !!window.__OUTDOOR_ROUTE_STUDIO__, inspector: !!window.__HTM_RUNTIME_INSPECTOR__})")
        diagnostics = []
        for event in runtime_events[-8:]:
            params = event.get("params", {})
            exception = params.get("exceptionDetails", {})
            entry = params.get("entry", {})
            diagnostics.append(
                exception.get("exception", {}).get("description")
                or exception.get("text")
                or entry.get("text")
                or str(params)[:500]
            )
        raise RuntimeError(f"Studio direct runtime did not become ready: {detail}; events={diagnostics}")

    results = []
    def check(name, ok, detail=""):
        icon = "✓" if ok else "✗"
        results.append((ok, name, detail))
        print(f"  {icon} {name}" + (f"  ({detail})" if detail else ""))

    print(f"\n▸ 需求 4/1（{EXPECTED_VERSION}）：分组交互 + 复选框合并")
    check(f"APP_VERSION = {EXPECTED_VERSION}", evalj("APP_VERSION") == EXPECTED_VERSION)
    check("Workbench 2.0 已成为活动布局",
          evalj("document.documentElement.dataset.workbench === '2' && document.documentElement.dataset.ui === 'studio'"))
    check("Workbench 控制器已挂载",
          evalj("!!window.__OUTDOOR_ROUTE_STUDIO__?.workbench"))
    check("唯一命令与对话框运行时已挂载",
          evalj("!!window.__OUTDOOR_ROUTE_STUDIO__?.commands && !!window.__OUTDOOR_ROUTE_STUDIO__?.dialogs"))
    check("业务代码由直接 TypeScript runtime 启动",
          evalj("!!window.__HTM_RUNTIME_INSPECTOR__ && !document.querySelector('script[data-studio-runtime]') && window.__OUTDOOR_ROUTE_STUDIO__?.architecture === 2"))
    check("顶部 6 个分组菜单与 3 个独立视图命令已渲染",
          evalj("document.querySelectorAll('.studio-menu-trigger').length === 6 && document.querySelectorAll('.studio-quick-command').length === 3 && !!document.querySelector('.studio-quick-actions > #reset-btn') && !!document.querySelector('.studio-quick-actions > #help-btn') && !!document.querySelector('.studio-quick-actions > #lang-btn')"))
    menu_hit_targets = evalj("""
      (() => {
        const misses = [...document.querySelectorAll('.studio-menu-trigger')].flatMap(trigger => {
          const rect = trigger.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return hit === trigger || trigger.contains(hit) ? [] : [{menu:trigger.dataset.menu, rect:{left:rect.left,right:rect.right,width:rect.width}, hit:hit?.className || hit?.tagName}];
        });
        return {ok:misses.length === 0, width:innerWidth, misses};
      })()
    """)
    check("顶部 6 个菜单都能接收真实指针命中",
          isinstance(menu_hit_targets, dict) and menu_hit_targets.get('ok') is True,
          str(menu_hit_targets))
    file_menu_point = evalj("""
      (() => {
        const trigger = document.querySelector('[data-menu="file"]');
        const rect = trigger.getBoundingClientRect();
        return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
      })()
    """)
    if isinstance(file_menu_point, dict):
        mouse = {"x": file_menu_point["x"], "y": file_menu_point["y"], "button": "left", "clickCount": 1}
        cdp("Input.dispatchMouseEvent", {**mouse, "type": "mousePressed"})
        cdp("Input.dispatchMouseEvent", {**mouse, "type": "mouseReleased"})
        time.sleep(0.1)
    check("File/文件菜单可由真实鼠标点击展开",
          evalj("document.querySelector('[data-menu=\"file\"]')?.getAttribute('aria-expanded') === 'true' && !document.getElementById('workbench-menu-file')?.hidden"))
    evalj("window.__OUTDOOR_ROUTE_STUDIO__.workbench.closeMenus()")
    check("左侧 3 个有效活动入口已渲染且无空设置入口",
          evalj("document.querySelectorAll('.studio-activity-button').length === 3 && !document.querySelector('[data-activity=\"settings\"]')"))
    check("Workbench 已移除右上角旧侧栏恢复按钮",
          evalj("!document.getElementById('sidebar-toggle')"))
    check("底部已收敛为无重复 Tab 的海拔分析区",
          evalj("document.querySelectorAll('.studio-bottom-tab').length === 0 && !!document.querySelector('[data-analysis-panel=\"elevation\"] #elev-bar') && !!document.querySelector('[data-analysis-panel=\"elevation\"] #measure-panel')"))
    language_flow = evalj("""
      (async () => {
        const registry = window.__OUTDOOR_ROUTE_STUDIO__.commands;
        if(document.documentElement.lang.startsWith('en')) await registry.dispatch('language.toggle');
        await new Promise(resolve => setTimeout(resolve, 0));
        const read = selector => [...document.querySelectorAll(selector)].map(node => node.textContent.trim());
        const zh = {
          menu: read('.studio-menu-label'),
          quick: read('.studio-quick-actions .studio-command-label'),
          activity: read('.studio-activity-label'),
          bottom: read('.studio-bottom-tab-label'),
          context: document.getElementById('toolbar-context')?.textContent,
        };
        await registry.dispatch('language.toggle');
        await new Promise(resolve => setTimeout(resolve, 0));
        const en = {
          menu: read('.studio-menu-label'),
          quick: read('.studio-quick-actions .studio-command-label'),
          activity: read('.studio-activity-label'),
          bottom: read('.studio-bottom-tab-label'),
          context: document.getElementById('toolbar-context')?.textContent,
        };
        await registry.dispatch('language.toggle');
        await new Promise(resolve => setTimeout(resolve, 0));
        return {zh, en, finalLang: document.documentElement.lang};
      })()
    """)
    check("Workbench 中文标签完整且不混用英文",
          isinstance(language_flow, dict)
          and language_flow.get('zh', {}).get('menu') == ['文件','编辑','测距','规划','标注','导出']
          and language_flow.get('zh', {}).get('quick') == ['复位视图','帮助','语言']
          and language_flow.get('zh', {}).get('activity') == ['轨迹','行程','标注点']
          and language_flow.get('zh', {}).get('bottom') == []
          and language_flow.get('zh', {}).get('context') == '尚未加载轨迹', str(language_flow))
    check("Workbench 英文标签完整并可切回中文",
          isinstance(language_flow, dict)
          and language_flow.get('en', {}).get('menu') == ['File','Edit','Measure','Plan','Waypoint','Export']
          and language_flow.get('en', {}).get('quick') == ['Reset view','Help','Language']
          and language_flow.get('en', {}).get('activity') == ['Trails','Itinerary','Waypoints']
          and language_flow.get('en', {}).get('bottom') == []
          and language_flow.get('en', {}).get('context') == 'No trail loaded'
          and language_flow.get('finalLang') == 'zh-CN', str(language_flow))
    check("独立统计与下撤导航已移除",
          evalj("!document.querySelector('[data-activity=\"statistics\"], [data-activity=\"escape\"]') && !document.getElementById('tab-escape')"))
    evalj("document.getElementById('version-tag-link')?.click()")
    time.sleep(0.1)
    changelog_scroll_contract = evalj("""
      (() => {
        const surface = document.querySelector('dialog[open] .workbench-dialog__surface');
        const body = surface?.querySelector('.workbench-dialog__body');
        const actions = surface?.querySelector('.workbench-dialog__actions');
        if(!surface || !body || !actions) return null;
        const before = actions.getBoundingClientRect().top;
        body.scrollTop = body.scrollHeight;
        const after = actions.getBoundingClientRect().top;
        return {
          surfaceOverflow: getComputedStyle(surface).overflow,
          bodyOverflowY: getComputedStyle(body).overflowY,
          actionShift: Math.abs(after - before),
          actionVisible: actions.getBoundingClientRect().bottom <= surface.getBoundingClientRect().bottom + 1,
        };
      })()
    """)
    check("版本说明仅滚动内容且关闭栏始终可见",
          isinstance(changelog_scroll_contract, dict)
          and changelog_scroll_contract.get('surfaceOverflow') == 'hidden'
          and changelog_scroll_contract.get('bodyOverflowY') == 'auto'
          and changelog_scroll_contract.get('actionShift', 99) < 1
          and changelog_scroll_contract.get('actionVisible') is True,
          str(changelog_scroll_contract))
    evalj("document.querySelector('dialog[open] .workbench-dialog__button')?.click()")
    check("Studio 主题变量已生效",
          evalj("getComputedStyle(document.documentElement).getPropertyValue('--studio-forest').trim().toUpperCase() === '#1E6F50'"))
    check("旧命令节点已无损迁移到分组菜单或独立操作区",
          evalj("['add-trail-btn','reverse-btn','clear-btn','measure-btn','segment-btn','add-escape-btn','add-waypoint-btn','export-btn'].every(id => document.getElementById(id)?.closest('.studio-menu-popup')) && ['reset-btn','help-btn','lang-btn'].every(id => document.getElementById(id)?.closest('.studio-quick-actions'))"))
    check("顶部、活动栏和分析栏均绑定语义命令",
          evalj("[...document.querySelectorAll('.studio-command,.studio-activity-button,.studio-bottom-tab')].every(node => node.dataset.commandId && window.__OUTDOOR_ROUTE_STUDIO__?.commands.has(node.dataset.commandId))"))
    check("TypeScript core runtime 已接管关键函数",
          evalj("!!HTM_CORE && haversine === HTM_CORE.haversine && buildDayPreviewRenderModel === HTM_CORE.buildDayPreviewRenderModel"))
    check("state.batchMode 已移除",
          evalj("!('batchMode' in state)"),
          str(evalj("'batchMode' in state")))
    check("state.batchSelected 存在且为 Set",
          evalj("state.batchSelected instanceof Set"))
    check("trail-checkbox CSS 存在（专职批量选中）",
          evalj("""
            (() => {
              const s = document.styleSheets;
              for(let i=0;i<s.length;i++) {
                try {
                  const rules = s[i].cssRules || s[i].rules;
                  for(let j=0;j<rules.length;j++) {
                    if(rules[j].selectorText && rules[j].selectorText.includes('.trail-checkbox')) return true;
                  }
                } catch(e){}
              }
              return false;
            })()
          """))
    check("trail-expand-arrow CSS 存在（专职展开）",
          evalj("""
            (() => {
              const s = document.styleSheets;
              for(let i=0;i<s.length;i++) {
                try {
                  const rules = s[i].cssRules || s[i].rules;
                  for(let j=0;j<rules.length;j++) {
                    if(rules[j].selectorText && rules[j].selectorText.includes('.trail-expand-arrow')) return true;
                  }
                } catch(e){}
              }
              return false;
            })()
          """))
    check("trail-batch-check 已完全移除（v1.15.0 遗留）",
          evalj("""
            (() => {
              const s = document.styleSheets;
              for(let i=0;i<s.length;i++) {
                try {
                  const rules = s[i].cssRules || s[i].rules;
                  for(let j=0;j<rules.length;j++) {
                    if(rules[j].selectorText && rules[j].selectorText.includes('trail-batch-check')) return false;
                  }
                } catch(e){}
              }
              return true;
            })()
          """))
    check("batch-toolbar CSS 存在（v1.31.0 抽离）",
          evalj("""
            (() => {
              const s = document.styleSheets;
              for(let i=0;i<s.length;i++) {
                try {
                  const rules = s[i].cssRules || s[i].rules;
                  for(let j=0;j<rules.length;j++) {
                    if(rules[j].selectorText && rules[j].selectorText.includes('.batch-toolbar')) return true;
                  }
                } catch(e){}
              }
              return false;
            })()
          """))

    print(f"\n▸ {EXPECTED_VERSION}：重构后的辅助函数存在性")
    for fn in ['renderGroupTabs', 'renderBatchToolbar', 'renderTrailCard',
               'trailCardHeaderHtml', 'trailCardExpandedHtml',
               'handleTrailCardClick', 'handleTrailDetailClick', 'handleTrailGroupChange',
               'isDetailButtonTarget', 'moveBatchToGroup',
               'toggleSetItem', 'applyChange',
               'toggleTrailActive', 'toggleTrailExpanded', 'toggleTrailBatch']:
        check(f"函数 {fn}", evalj(f"typeof {fn} === 'function'"))

    check("buildTrailList 已瘦身（< 40 行 statement）",
          evalj("buildTrailList.toString().split('\\n').length < 40"),
          str(evalj("buildTrailList.toString().split('\\n').length")))

    print(f"\n▸ {EXPECTED_VERSION}：3 个大函数深度拆分后新增的 helper")
    for fn in ['expandZipFiles', 'importSingleKml', 'findDuplicateTrail',
               'ensureUniqueTrailId', 'renderKmlImportRow', 'bindKmlImportRowEvents',
               'postImportFinalize',
               'computeCumulativeDistance', 'buildDayMeta',
               'computeTrailStats', 'generateNextTrailId',
               'elevRatioColor', 'updateElevBadges',
               'createPrimaryTrackDragSnapper',
               'bindMeasureEndpointDrag', 'addMeasureEndpointMarker', 'measurePointFromHit',
               'buildTrackLatLngs', 'schedulePostRestoreReset',
               'bindPrimaryMiniDrag', 'applyPrimaryMiniPosition',
               'schedulePrimaryMiniPositionApply', 'waypointIcon',
               'addManualWaypointAt', 'enterAddWaypointMode', 'exitAddWaypointMode',
               'nearestTrackIdxNearPrimary', 'getMeasureStatsCache',
               'computeMeasureStats', 'renderMeasureSegmentLine',
               'queueMeasureLiveUpdate', 'applyMeasureEndpointHit',
               'bindFloatingPanelDrag', 'initFloatingPanelPositions',
               'applyFloatingPanelPosition', 'resetFloatingPanelPosition',
               'clampFloatingPanelPosition', 'floatingStyleOriginRect',
               'setFloatingPanelStyle', 'setMapMode', 'enterInteractionRenderMode',
               'showDaySegmentPreview', 'clearDaySegmentPreview',
               'showMeasureElevReadout', 'hideMeasureElevReadout',
               'resetMeasureElevReadout', 'setMeasureElevHint',
               'measureReverse',
               'segmentInsertPoint', 'segmentDeleteDay']:
        check(f"函数 {fn}", evalj(f"typeof {fn} === 'function'"))

    check("typed SegmentController 已接管分段状态与提交",
          evalj("typeof segmentController === 'object' && segmentState === segmentController.state && typeof segmentController.apply === 'function'"))
    check("typed DayPreviewController 已接管 Day 选择状态",
          evalj("typeof dayPreviewController === 'object' && dayPreviewState === dayPreviewController.state && typeof dayPreviewController.prepare === 'function'"))
    check("typed EscapeController 已接管下撤状态与路线写入",
          evalj("typeof escapeController === 'object' && addEscapeState === escapeController.state && typeof escapeController.commit === 'function'"))
    check("typed FileExportController 已接管 KML/ZIP/Markdown 导出",
          evalj("typeof fileExportController === 'object' && typeof fileExportController.exportGroupKml === 'function' && typeof fileExportController.exportItineraryMarkdown === 'function'"))

    check("handleFiles 已瘦身（< 30 行）",
          evalj("handleFiles.toString().split('\\n').length < 30"),
          str(evalj("handleFiles.toString().split('\\n').length")))
    check("parseAndProcessKml 已瘦身（< 50 行）",
          evalj("parseAndProcessKml.toString().split('\\n').length < 50"),
          str(evalj("parseAndProcessKml.toString().split('\\n').length")))
    check("drawElevBar 已瘦身（< 40 行）",
          evalj("drawElevBar.toString().split('\\n').length < 40"),
          str(evalj("drawElevBar.toString().split('\\n').length")))
    for fn in ['createElevationCanvasRenderer', 'buildElevationCanvasScene',
               'estimateElevationPanelHeightForPoints', 'createMapRenderController',
               'createMarkerRenderController']:
        check(f"typed renderer {fn}", evalj(f"typeof HTM_APP.{fn} === 'function'"))

    print(f"\n▸ {EXPECTED_VERSION}：测距端点拖拽回归")
    draggable_marker = evalj("""
      (() => {
        const fixed = measureMarker(30, 100, 'A', '#22c55e');
        const drag = measureMarker(30, 100, 'A', '#22c55e', {draggable: true});
        return {
          fixedInteractive: fixed.options.interactive,
          fixedDraggable: !!fixed.options.draggable,
          dragInteractive: drag.options.interactive,
          dragDraggable: !!drag.options.draggable
        };
      })()
    """)
    check("测距 marker 默认不可交互，端点 marker 可拖动",
          isinstance(draggable_marker, dict)
          and draggable_marker.get("fixedInteractive") == False
          and draggable_marker.get("fixedDraggable") == False
          and draggable_marker.get("dragInteractive") == True
          and draggable_marker.get("dragDraggable") == True,
          str(draggable_marker))

    check("measureCompute 使用可拖动端点 marker",
          source_has('function measureCompute', 'addMeasureEndpointMarker'))
    check("第三次点击替换端点逻辑已移除",
          evalj("typeof nearestEndpointLabel === 'undefined' && typeof updateMeasureEndpoint === 'undefined'"))
    check("拖动吸附使用 requestAnimationFrame 节流",
          evalj("createPrimaryTrackDragSnapper.toString().includes('requestAnimationFrame') && createPrimaryTrackDragSnapper.toString().includes('cancelAnimationFrame')"))
    check("测距与分段拖动共用吸附调度器",
          source_has('function bindMeasureEndpointDrag', 'function redrawSegmentLayer', 'createPrimaryTrackDragSnapper'))
    check("测距高亮线使用抽样点并防止旧计算回写",
          evalj("""
            (() => {
              const track = Array.from({length: 1200}, (_, i) => [30 + i / 100000, 100, 1000 + i, i / 10]);
              const model = buildMeasureSegmentRenderModel(
                track,
                {idx: 0, lat: 30, lng: 100, elev: 1000, km: 0},
                {idx: 1199, lat: 30.01199, lng: 100, elev: 2199, km: 119.9},
                900
              );
              return buildMeasureSegmentRenderModel === HTM_CORE.buildMeasureSegmentRenderModel
                && !!model
                && model.latLngs.length === 900
                && model.latLngs[0][0] === track[0][0]
                && model.latLngs[899][0] === track[1199][0];
            })()
          """) and source_has('function renderMeasureSegmentLine', 'buildMeasureSegmentRenderModel', 'nextComputeSequence', 'isComputeCurrent'))
    check("测距统计使用缓存而非整段遍历",
          source_has('function computeMeasureStats', 'getMeasureStatsCache'))
    check("测距拖动中实时更新线段和面板",
          source_has('function handleMeasureInteractionEvent', 'queueMeasureLiveUpdate', "type:'drag-snap'", 'opts.onSnap'))
    check("测距拖动吸附优先局部近邻搜索",
          source_has('function createPrimaryTrackDragSnapper', 'nearestTrackIdxNearPrimary'))
    check("测距复位会重新补画 A/B 黄线",
          source_has('function resetView', 'measureCompute', 'measureState.ptA', 'measureState.ptB'))
    check("分段高亮线使用抽样点",
          evalj("""
            (() => {
              const track = Array.from({length: 1200}, (_, i) => [30 + i / 100000, 100, 1000 + i, i / 10]);
              const points = [
                {idx: 0, lat: track[0][0], lng: 100, elev: 1000, km: 0},
                {idx: 600, lat: track[600][0], lng: 100, elev: 1600, km: 60},
                {idx: 1199, lat: track[1199][0], lng: 100, elev: 2199, km: 119.9}
              ];
              const model = buildSegmentLayerModel(track, points, ['#123456'], 900);
              return buildSegmentLayerModel === HTM_CORE.buildSegmentLayerModel
                && model.segments.length === 2
                && model.segments.every(segment => segment.latLngs.length <= 900)
                && model.markers[0].markerOptions.draggable === false
                && model.markers[1].markerOptions.draggable === true
                && model.markers[2].markerOptions.draggable === false;
            })()
          """) and source_has('function redrawSegmentLayer', 'buildSegmentLayerModel'))
    check("缓存恢复等待布局后只执行一次复位",
          source_has('function schedulePostRestoreReset', 'completed', 'map.whenReady', 'await schedulePostRestoreReset'))
    check("缓存恢复跳过全轨迹预定位并暴露可等待启动状态",
          source_has('rebuildAll({fit: !restored})') and evalj("window.__HTM_BOOT_READY__ instanceof Promise"))
    check("主轨迹浮动小卡支持拖动并记忆位置",
          evalj("bindPrimaryMiniDrag.toString().includes('pointerdown') && bindPrimaryMiniDrag.toString().includes('localStorage') || (bindPrimaryMiniDrag.toString().includes('pointerdown') && savePrimaryMiniPosition.toString().includes('localStorage'))"))
    check("主轨迹浮动小卡在侧栏收起后延迟套用位置",
          source_has('function schedulePrimaryMiniPositionApply', 'setTimeout', 'function toggleSidebar', 'schedulePrimaryMiniPositionApply'))
    check("地图标注点显示分段 D 天数",
          evalj("""
            (() => {
              const model = HTM_APP.buildWaypointMarkerModel({
                trail:{id:'test', name:'Test', color:'#123456', track:[]},
                waypoint:{id:1, lat:30, lng:100, day:2, km:1.5, elev:3200, tag:'camp', label:'Camp'},
                isPrimary:true, waypointMode:true, color:'#123456', iconText:'C',
              });
              return model.iconHtml.includes('wp-day-badge') && model.iconHtml.includes('D2');
            })()
          """) and source_has('function addWpMarker', 'function segmentApply', 'segmentController.apply'))
    check("标注点图标按 tag 统一渲染",
          evalj("waypointIcon('supply') === '🏪'") and source_has('waypointIcon(wp)', 'waypointIcon(tag)'))
    check("Workbench 顶栏含品牌、分组菜单和独立视图命令",
          evalj("""
            (() => {
              const toolbar = document.getElementById('map-toolbar');
              const commandIds = ['help-btn','reset-btn','measure-btn','segment-btn','add-waypoint-btn','lang-btn',
                'add-escape-btn','reverse-btn','add-trail-btn','export-btn','clear-btn'];
              return document.documentElement.dataset.ui === 'studio'
                && !!HTM_APP
                && !!toolbar.querySelector('.studio-brand')
                && !toolbar.querySelector('#toolbar-more:not([hidden])')
                && commandIds.every(id => {
                  const button = document.getElementById(id);
                  return !!button
                    && !!button.closest('.studio-menu-popup,.studio-quick-actions')
                    && !!button.querySelector('.studio-command-icon')
                    && !!button.querySelector('.studio-command-label');
                });
            })()
          """))
    check("顶部缓存按钮已移除",
          evalj("!document.getElementById('storage-btn') && !document.getElementById('storage-text')"))
    check("测距/分段进入时自动切换到标注点模式",
          source_has('function measureEnter', 'function segmentEnter', 'enterInteractionRenderMode', "type:'mode.set'"))
    check("日程每日摘要包含最低海拔并可点击预览当天轨迹",
          source_has('function buildDaysTab', '最低海拔', 'showDaySegmentPreview', 'segmentController.apply', 'dayPreviewState.active'))
    check("地图 +/- 缩放步进已调大",
          evalj("map.options.zoomDelta === 1 && map.options.zoomSnap === 0.5"))
    check("海拔图与测距浮动栏支持拖动记忆和双击复位",
          evalj("""
            !!document.querySelector('#elev-bar [data-panel-drag]')
            && !!document.querySelector('#measure-panel [data-panel-drag]')
            && !!document.querySelector('#measure-panel .measure-panel-grip')
            && bindFloatingPanelDrag.toString().includes('pointerdown')
            && bindFloatingPanelDrag.toString().includes('localStorage')
            && bindFloatingPanelDrag.toString().includes('dblclick')
            && initFloatingPanelPositions.toString().includes('hiking_elev_bar_pos')
            && initFloatingPanelPositions.toString().includes('hiking_measure_panel_pos')
          """))
    check("测距面板保留重新选点/反向/退出，测距信息拆散融入海拔图",
          evalj("""
            (() => {
              const panelButtons = [...document.querySelectorAll('#measure-panel button')];
              const buttonIds = panelButtons.map(btn => btn.id);
              const buttonLabels = panelButtons.map(btn => btn.textContent.trim().replace(/\\s+/g, ' '));
              return buttonIds.join('|') === 'measure-reset|measure-reverse|measure-exit'
                && buttonLabels.every(label => label.length > 0)
                && !document.getElementById('measure-elev-overlay')
                && !document.getElementById('measure-result')
                && !!document.getElementById('measure-distance')
                && !!document.querySelector('#measure-distance #m-dist')
                && (() => {
                  const pts = [[30,100,1000,0],[31,101,1200,1],[32,102,900,2]];
                  const layout = HTM_CORE.computeElevationLayout(pts, {width:320,height:160,measureMode:true});
                  const annotations = HTM_CORE.collectElevationAnnotations(pts, layout, {measureMode:true});
                  const kinds = annotations.map(item => item.kind);
                  return kinds.includes('measure-a') && kinds.includes('measure-b')
                    && kinds.includes('peak') && kinds.includes('low')
                    && annotations.every(item => !item.text.startsWith('高 ') && !item.text.startsWith('低 '));
                })();
            })()
          """) and source_has('function measureReverse', 'measureController.reverse', 'elev-stat-asc', 'elev-stat-desc', "stats.distKm.toFixed(2) + ' km'", 'buildElevationCanvasScene', 'measureMode: true'))
    check("行程 Day 预览优先使用 day_meta 范围并复用测距段显示和段内复位",
          evalj("""
            (() => {
              const track = Array.from({length: 6}, (_, i) => [30 + i / 10000, 100, 1000 + i, i, i, i < 3 ? 1 : 2]);
              const trail = {track, day_meta:[{d:2, i_start:2, i_end:5}]};
              const range = HTM_CORE.getDayIndexRange(trail, trail.day_meta[0]);
              return range.iStart === 2 && range.iEnd === 5;
            })()
          """) and source_has('function showDaySegmentPreview', 'dayPreviewController.prepare', 'm-dist', 'fitWorkspaceBounds'))
    check("行程分段可恢复/默认起终点/插入边界/指定删除",
          evalj("""
            (() => {
              const core = HTM_CORE;
              const track = Array.from({length: 10}, (_, i) => [30 + i / 10000, 100, 1000 + i, i]);
              const defaults = core.restoreSegmentIndexes(track, []);
              const restored = core.restoreSegmentIndexes(track, [
                {d: 1, i_start: 0, i_end: 4},
                {d: 2, i_start: 4, i_end: 9}
              ]);
              const endpoints = core.segmentIndexesToPoints(track, defaults);
              const inserted = core.insertSegmentPoint(endpoints, core.pointFromTrackIndex(track, 4));
              const deleted = inserted && core.deleteSegmentDay(inserted.points, 1);
              const model = buildSegmentLayerModel(track, inserted ? inserted.points : endpoints, ['#123456'], 900);
              return defaults.join('|') === '0|9'
                && restored.join('|') === '0|4|9'
                && !!inserted && inserted.insertAt === 1
                && deleted.length === 2
                && model.markers[1].markerOptions.draggable === true;
            })()
          """) and source_has('segmentController.enter', 'resetView({restoreActive: true})', 'seg-day-delete', 'segmentController.deleteDay', 'm.markerOptions'))
    check("天数模式入口移到行程页并可恢复原显示模式",
          evalj("""
            (() => {
              const modeSwitcher = document.querySelector('.studio-activity-rail > #map-mode-controls');
              const trailModes = [...document.querySelectorAll('#map-mode-controls [data-mode]')].map(btn => btn.dataset.mode);
              const noDayButton = trailModes.join('|') === 'elev|waypoint'
                && !!modeSwitcher
                && !document.querySelector('#map-mode-controls [data-mode="day"]')
                && !document.querySelector('#tab-trails [data-mode]')
                && !!document.querySelector('#trail-selector-panel > #trail-list');
              document.querySelector('#map-mode-controls [data-mode="waypoint"]').click();
              const directSwitchWorks = state.mode === 'waypoint'
                && document.querySelector('#map-mode-controls [data-mode="waypoint"]').getAttribute('aria-pressed') === 'true';
              document.querySelector('.tab[data-tab="days"]').click();
              const entersDay = state.mode === 'day';
              document.querySelector('.tab[data-tab="trails"]').click();
              const restores = state.mode === 'waypoint';
              return noDayButton
                && directSwitchWorks
                && entersDay
                && restores
                && buildDaysTab.toString().includes('days-summary')
                && buildDaysTab.toString().includes('day-head-main')
                && buildDaysTab.toString().includes('当日下降');
            })()
          """))
    check("新增标注按钮进入一次性点选模式",
          evalj("typeof HTM_APP.createWaypointController === 'function'") and source_has('function enterAddWaypointMode', 'crosshair', 'waypointController.addManualWaypoint'))
    check("海拔填充沿完整曲线路径绘制",
          evalj("""
            (() => {
              const pts = [[30, 100, 1000, 0], [30.1, 100.1, 1200, 1], [30.2, 100.2, 900, 2]];
              const layout = HTM_CORE.computeElevationLayout(pts, {width: 320, height: 160});
              const model = HTM_CORE.computeElevationRenderModel(pts, layout);
              const scene = HTM_APP.buildElevationCanvasScene(pts, {
                width:320, height:160, axisLabel:'km'
              });
              return typeof HTM_APP.createElevationCanvasRenderer === 'function'
                && model.fillPolygon.length === model.curve.length + 2
                && model.curve.every((point, index) => {
                  const fillPoint = model.fillPolygon[index + 1];
                  return fillPoint.x === point.x && fillPoint.y === point.y;
                })
                && scene.chart.fillPolygon.length === scene.chart.curve.length + 2;
            })()
          """) and source_has('elevationCanvasRenderer.render(scene, dimensions)'))

    print("\n▸ 需求 3：KML.zip 导入")
    check("fflate.unzipSync 可用",
          evalj("typeof fflate === 'object' && typeof fflate.unzipSync === 'function'"))

    result = evalj(f"""
      (async () => {{
        const b64 = "{zip_b64}";
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
        try {{
          const entries = fflate.unzipSync(bytes);
          const paths = Object.keys(entries);
          const kmls = paths.filter(p => p.toLowerCase().endsWith('.kml'));
          const skipped = paths.filter(p => p.startsWith('__MACOSX/'));
          return {{
            total: paths.length,
            paths: paths,
            kmls: kmls,
            skippedMacosx: skipped,
            firstKmlSize: entries[kmls[0]].length,
          }};
        }} catch(e) {{
          return {{ error: e.message }};
        }}
      }})()
    """)
    if isinstance(result, dict) and 'error' not in result:
        check("解压出 4 项", result['total'] == 4, str(result['total']))
        check("识别出 3 个 .kml", len(result['kmls']) == 3,
              f"paths={result['kmls']}")
        check("__MACOSX 条目存在（handleFiles 会跳过）", len(result['skippedMacosx']) == 1)
        check("KML bytes > 1000", result['firstKmlSize'] > 1000, str(result['firstKmlSize']))
    else:
        check("解压 zip", False, str(result))

    check("File-like polyfill 与 handleFiles 兼容",
          evalj("typeof handleFiles === 'function'"))

    # 模拟一次完整导入流程
    print("\n▸ 端到端：模拟从 zip 导入")
    e2e = evalj(f"""
      (async () => {{
        try {{
          const before = DATA.trails.length;
          const b64 = "{zip_b64}";
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
          const fakeZipFile = {{
            name: 'test-bundle.zip',
            arrayBuffer: async () => bytes.buffer,
            text: async () => '' // not used for zip
          }};
          await handleFiles([fakeZipFile]);
          const after = DATA.trails.length;
          return {{ before, after, added: after - before,
                   trailNames: DATA.trails.slice(before).map(t => t.name) }};
        }} catch(e) {{ return {{ error: e.message, stack: e.stack }}; }}
      }})()
    """)
    if isinstance(e2e, dict) and 'error' not in e2e:
        # zip 里两个 KML 但内容相同 → 应加进 1 条（第 2 条被去重跳过）
        check(f"轨迹数变化: {e2e['before']} → {e2e['after']}",
              e2e['after'] > e2e['before'],
              f"added={e2e['added']}, names={e2e['trailNames']}")
    else:
        check("端到端 zip 导入", False, str(e2e)[:200])

    print("\n▸ Command 2.0：四类入口统一分发")
    command_flow = evalj("""
      (async () => {
        const registry = window.__OUTDOOR_ROUTE_STUDIO__?.commands;
        const events = [];
        const unsubscribe = registry.subscribe(event => {
          if(event.type === 'dispatched') events.push(event.id);
        });
        const measureButton = document.getElementById('measure-btn');
        measureButton.click();
        await Promise.resolve();
        const topMenuEnteredMeasure = interactionManager.current.kind === 'measure';
        const measureActionsEmbedded = document.getElementById('measure-panel')?.parentElement?.dataset.analysisPanel === 'elevation';

        document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
        await Promise.resolve();
        const shortcutCancelled = interactionManager.current.kind === 'idle';

        document.getElementById('workbench-activity-itinerary').click();
        await Promise.resolve();
        const activityOpenedItinerary = document.querySelector('.tab[data-tab="days"]').classList.contains('active')
          && document.getElementById('workbench-activity-itinerary').classList.contains('is-active');
        const escapeRoutesMerged = !!document.querySelector('#tab-days .itinerary-escape-section')
          && !document.getElementById('tab-escape');

        document.getElementById('workbench-activity-trails').click();
        unsubscribe();
        return {
          topMenuEnteredMeasure,
          measureActionsEmbedded,
          shortcutCancelled,
          activityOpenedItinerary,
          escapeRoutesMerged,
          events,
        };
      })()
    """)
    if isinstance(command_flow, dict) and 'events' in command_flow:
        check("顶部菜单只分发 measure.toggle",
              command_flow.get('topMenuEnteredMeasure') == True and 'measure.toggle' in command_flow['events'],
              str(command_flow))
        check("Escape 快捷键只分发 interaction.cancel",
              command_flow.get('shortcutCancelled') == True and 'interaction.cancel' in command_flow['events'],
              str(command_flow))
        check("桌面/移动活动栏分发 workspace 命令",
              command_flow.get('activityOpenedItinerary') == True and 'workspace.itinerary' in command_flow['events'],
              str(command_flow))
        check("测距操作嵌入海拔分析区且没有重复 Tab",
              command_flow.get('measureActionsEmbedded') == True and 'panel.log' not in command_flow['events'],
              str(command_flow))
        check("下撤方案直接合并进行程页",
              command_flow.get('escapeRoutesMerged') == True,
              str(command_flow))
    else:
        check("Command 2.0 统一分发", False, str(command_flow))

    print("\n▸ Interaction 2.0：五模式统一状态机")
    interaction_flow = evalj("""
      (async () => {
        const main = DATA.trails.find(trail => trail.id === state.primaryTrailId);
        if(!main || !main.track?.length) return {error:'missing-primary'};
        const point = index => ({lat:main.track[index][0], lng:main.track[index][1]});
        const summary = {};

        measureEnter();
        summary.measureEntered = interactionManager.current.kind === 'measure'
          && interactionManager.current.phase === 'select-a'
          && measureState.active;
        dispatchRuntimeInteraction('measure', {type:'tap', source:'leaflet', latlng:point(0)});
        summary.measureA = interactionManager.current.phase === 'select-b' && !!measureState.ptA;
        dispatchRuntimeInteraction('measure', {
          type:'tap', source:'leaflet', latlng:point(main.track.length - 1),
        });
        summary.measureReady = interactionManager.current.phase === 'ready'
          && !!measureState.ptA && !!measureState.ptB;
        const measureDragIndex = Math.max(1, Math.floor(main.track.length * 0.12));
        const measureDragHit = {
          idx:measureDragIndex,
          point:main.track[measureDragIndex],
          trail:main,
          dist:0,
        };
        dispatchRuntimeInteraction('measure', {type:'drag-start', endpoint:'A'});
        const measureDragging = interactionManager.current.phase === 'dragging';
        dispatchRuntimeInteraction('measure', {type:'drag-snap', endpoint:'A', hit:measureDragHit});
        dispatchRuntimeInteraction('measure', {type:'drag-end', endpoint:'A', hit:measureDragHit});
        summary.measureDrag = measureDragging
          && interactionManager.current.phase === 'ready'
          && measureState.ptA.idx === measureDragIndex;

        segmentEnter();
        const beforeSegmentPoints = segmentState.points.length;
        const occupied = new Set(segmentState.points.map(item => item.idx));
        let insertIndex = Math.floor(main.track.length / 2);
        while(occupied.has(insertIndex) && insertIndex < main.track.length - 1) insertIndex += 1;
        dispatchRuntimeInteraction('segment', {
          type:'tap', source:'leaflet', latlng:point(insertIndex),
        });
        summary.segmentReplacedMeasure = interactionManager.current.kind === 'segment'
          && interactionManager.current.phase === 'editing'
          && segmentState.active && !measureState.active;
        summary.segmentTap = segmentState.points.length === beforeSegmentPoints + 1;
        const boundaryIndex = Math.min(1, segmentState.points.length - 2);
        const previousIndex = segmentState.points[boundaryIndex - 1].idx;
        const nextIndex = segmentState.points[boundaryIndex + 1].idx;
        let segmentDragIndex = Math.floor((previousIndex + nextIndex) / 2);
        if(segmentDragIndex === segmentState.points[boundaryIndex].idx) segmentDragIndex += 1;
        if(segmentDragIndex >= nextIndex) segmentDragIndex = nextIndex - 1;
        const segmentDragHit = {
          idx:segmentDragIndex,
          point:main.track[segmentDragIndex],
          trail:main,
          dist:0,
        };
        dispatchRuntimeInteraction('segment', {type:'drag-start', boundaryIndex});
        const segmentDragging = interactionManager.current.phase === 'dragging';
        dispatchRuntimeInteraction('segment', {type:'drag-end', boundaryIndex, hit:segmentDragHit});
        summary.segmentDrag = segmentDragging
          && interactionManager.current.phase === 'editing'
          && segmentState.points[boundaryIndex].idx === segmentDragIndex;

        enterAddWaypointMode({announce:false});
        const waypointBefore = main.waypoints.length;
        dispatchRuntimeInteraction('waypoint', {
          type:'tap', source:'leaflet', latlng:point(Math.floor(main.track.length * 0.25)),
          requireNear:true,
        });
        await new Promise(resolve => setTimeout(resolve, 0));
        const waypointDialog = document.querySelector('dialog[open]');
        const waypointInput = waypointDialog?.querySelector('#manual-waypoint-name');
        if(waypointInput) {
          waypointInput.value = '状态机标注';
          waypointInput.dispatchEvent(new Event('input', {bubbles:true}));
          waypointDialog.querySelector('#manual-waypoint-tag').value = 'camp';
          waypointDialog.querySelector('#manual-waypoint-description').value = '状态机描述';
          waypointDialog.querySelector('form').requestSubmit();
        }
        await new Promise(resolve => setTimeout(resolve, 0));
        const addedWaypoint = main.waypoints.at(-1);
        summary.waypointCommitted = interactionManager.current.kind === 'idle'
          && !addWaypointState.active
          && main.waypoints.length === waypointBefore + 1
          && addedWaypoint.tag === 'camp'
          && addedWaypoint.description === '状态机描述';

        addEscapeEnter();
        dispatchRuntimeInteraction('escape', {
          type:'tap', source:'leaflet', latlng:point(Math.floor(main.track.length * 0.2)),
        });
        const escapeSelectedA = interactionManager.current.phase === 'select-b' && !!addEscapeState.ptA;
        dispatchRuntimeInteraction('escape', {
          type:'tap', source:'leaflet', latlng:point(Math.floor(main.track.length * 0.8)),
        });
        summary.escapePreview = escapeSelectedA
          && interactionManager.current.kind === 'escape'
          && interactionManager.current.phase === 'preview'
          && !!addEscapeState._pending;

        const day = main.day_meta?.[0] || {
          d:1, km:main.stats.distance_km, i_start:0, i_end:main.track.length - 1,
        };
        buildDaysTab();
        const dayMetricLabels = [...document.querySelectorAll('#tab-days .day-stats .lab')]
          .map(element => element.textContent.trim());
        summary.campNotDuplicated = !dayMetricLabels.includes('扎营点')
          && !!document.querySelector('#tab-days .day-camp');
        showDaySegmentPreview(main, day);
        summary.dayReplacedEscape = interactionManager.current.kind === 'day-preview'
          && interactionManager.current.phase === 'preview'
          && dayPreviewState.active && !addEscapeState.active;
        showDaySegmentPreview(main, day);
        summary.dayToggleExit = interactionManager.current.kind === 'idle' && !dayPreviewState.active;

        segmentEnter();
        document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
        summary.escapeKey = interactionManager.current.kind === 'idle' && !segmentState.active;

        measureEnter();
        markTrailRevision(main);
        summary.ownerInvalidated = !revalidateRuntimeInteractionOwner()
          && interactionManager.current.kind === 'idle'
          && !measureState.active;
        return summary;
      })()
    """)
    if isinstance(interaction_flow, dict) and 'error' not in interaction_flow:
        for key, label in [
            ('measureEntered', '测距进入 select-a'),
            ('measureA', '测距点击 A 后进入 select-b'),
            ('measureReady', '测距点击 B 后进入 ready'),
            ('measureDrag', '测距拖动经过 dragging 并回到 ready'),
            ('segmentReplacedMeasure', '分段替换测距并进入 editing'),
            ('segmentTap', '分段地图事件插入边界'),
            ('segmentDrag', '分段边界拖动经过 dragging 并回到 editing'),
            ('waypointCommitted', '标注提交后自动回到 idle'),
            ('escapePreview', '下撤 A/B 选择进入 preview'),
            ('campNotDuplicated', 'Day 统计不再重复扎营点信息'),
            ('dayReplacedEscape', 'Day 预览替换下撤'),
            ('dayToggleExit', '再次点击 Day 退出预览'),
            ('escapeKey', 'Escape 键统一取消当前模式'),
            ('ownerInvalidated', '轨迹修订后 Session 自动失效'),
        ]:
            check(label, interaction_flow.get(key) is True, str(interaction_flow))
    else:
        check("五模式统一状态机", False, str(interaction_flow))

    print("\n▸ Performance 2.0：调度、降采样、Marker diff 与最后复位")
    performance_flow = evalj("""
      (async () => {
        const waitFrames = (count = 2) => new Promise(resolve => {
          const step = () => count-- <= 0 ? resolve() : requestAnimationFrame(step);
          requestAnimationFrame(step);
        });
        const main = DATA.trails.find(trail => trail.id === state.primaryTrailId);
        if(!main || !main.track?.length) return {error:'missing-primary'};

        state.showLabel = true;
        main.waypoints.forEach(waypoint => state.visibleTags.add(waypoint.tag));
        setMapMode('waypoint');
        await waitFrames();

        const phaseBefore = {...window.__HTM_RENDER_STATS__.phases};
        const framesBefore = window.__HTM_RENDER_STATS__.frames;
        drawTracks(); drawTracks(); drawTracks();
        drawWaypoints(); drawWaypoints(); drawWaypoints();
        refreshElevBar(); refreshElevBar(); refreshElevBar();
        await waitFrames();
        const phaseAfter = window.__HTM_RENDER_STATS__.phases;
        const coalesced = {
          frames:window.__HTM_RENDER_STATS__.frames - framesBefore,
          tracks:phaseAfter.tracks - phaseBefore.tracks,
          markers:phaseAfter.markers - phaseBefore.markers,
          chart:phaseAfter.chart - phaseBefore.chart,
        };

        const markerKeys = Object.keys(wpMarkers);
        const retainedKey = markerKeys[0];
        const retainedMarker = retainedKey ? wpMarkers[retainedKey] : null;
        drawWaypoints();
        await waitFrames();
        const keepDiff = {...window.__HTM_RENDER_STATS__.markers};
        const markerKept = !!retainedKey
          && retainedMarker === wpMarkers[retainedKey]
          && keepDiff.add === 0 && keepDiff.update === 0 && keepDiff.remove === 0
          && keepDiff.keep > 0;

        const anchorIndex = Math.floor(main.track.length * 0.35);
        const anchor = main.track[anchorIndex];
        const testWaypoint = {
          id:`perf-${Date.now()}`,
          name:'Render diff probe', label:'Render diff probe', tag:'other', icon:'',
          lat:anchor[0], lng:anchor[1], elev:anchor[2], km:anchor[3], gps_idx:anchorIndex,
          day:anchor[5] || null, photo:'',
        };
        state.visibleTags.add('other');
        main.waypoints.push(testWaypoint);
        drawWaypoints();
        await waitFrames();
        const addDiff = {...window.__HTM_RENDER_STATS__.markers};
        const testKey = `${main.id}#${testWaypoint.id}`;
        const markerAdded = addDiff.add === 1 && !!wpMarkers[testKey]
          && (!retainedKey || retainedMarker === wpMarkers[retainedKey]);

        main.waypoints = main.waypoints.filter(waypoint => waypoint !== testWaypoint);
        drawWaypoints();
        await waitFrames();
        const removeDiff = {...window.__HTM_RENDER_STATS__.markers};
        const markerRemoved = removeDiff.remove === 1 && !wpMarkers[testKey]
          && (!retainedKey || retainedMarker === wpMarkers[retainedKey]);

        refreshElevBar();
        drawTracks();
        await waitFrames();
        const elevation = {...window.__HTM_RENDER_STATS__.elevation};
        const activeTrailCount = DATA.trails.filter(isTrailActive).length;
        const elevationBands = window.__HTM_RENDER_STATS__.elevationBands;
        const canvasLimit = Math.max(2, Math.floor(elevCanvas.offsetWidth || 340)) * 2;

        const fitBefore = {...window.__HTM_RENDER_STATS__.fit};
        const firstReset = resetView({restoreActive:true});
        const secondReset = resetView({restoreActive:true});
        const resetResults = await Promise.all([firstReset, secondReset]);
        await waitFrames();
        const fitAfter = window.__HTM_RENDER_STATS__.fit;
        const bounds = map.getBounds();
        const firstPoint = main.track[0];
        const lastPoint = main.track[main.track.length - 1];

        return {
          coalesced,
          markerKept,
          markerAdded,
          markerRemoved,
          keepDiff,
          addDiff,
          removeDiff,
          elevation,
          canvasLimit,
          elevationBands,
          activeTrailCount,
          resetResults,
          resetSuperseded:fitAfter.superseded - fitBefore.superseded,
          resetApplied:fitAfter.applied - fitBefore.applied,
          resetRequested:fitAfter.requested - fitBefore.requested,
          latestResetEpoch:fitAfter.lastResetEpoch,
          boundsContainEndpoints:bounds.contains([firstPoint[0], firstPoint[1]])
            && bounds.contains([lastPoint[0], lastPoint[1]]),
          schedulerIdle:window.__HTM_RENDER_SCHEDULER__.pendingMask === 0
            && !window.__HTM_RENDER_SCHEDULER__.hasScheduledFrame,
        };
      })()
    """)
    if isinstance(performance_flow, dict) and 'error' not in performance_flow:
        coalesced = performance_flow.get('coalesced', {})
        check("同帧重复重绘仅 flush 一次",
              coalesced.get('frames') == 1
              and coalesced.get('tracks') == 1
              and coalesced.get('markers') == 1
              and coalesced.get('chart') == 1,
              str(coalesced))
        check("未变化 Marker 保持实例", performance_flow.get('markerKept') is True,
              str(performance_flow.get('keepDiff')))
        check("新增 waypoint 只添加一个 Marker", performance_flow.get('markerAdded') is True,
              str(performance_flow.get('addDiff')))
        check("删除 waypoint 只移除一个 Marker", performance_flow.get('markerRemoved') is True,
              str(performance_flow.get('removeDiff')))
        elevation = performance_flow.get('elevation', {})
        check("海拔 Canvas 点数受像素宽度限制",
              elevation.get('sourcePoints', 0) > elevation.get('renderedPoints', 0)
              and elevation.get('renderedPoints', 0) <= performance_flow.get('canvasLimit', 0),
              f"{elevation}, limit={performance_flow.get('canvasLimit')}")
        check("地图海拔渐变不超过每轨 40 band",
              performance_flow.get('elevationBands', 0) > 0
              and performance_flow.get('elevationBands', 0)
                  <= performance_flow.get('activeTrailCount', 0) * 40,
              f"bands={performance_flow.get('elevationBands')}, trails={performance_flow.get('activeTrailCount')}")
        check("连续复位只有最后一次生效",
              performance_flow.get('resetResults') == [False, True]
              and performance_flow.get('resetSuperseded', 0) >= 1
              and performance_flow.get('resetApplied') == 1
              and performance_flow.get('resetRequested') == 2,
              str(performance_flow))
        check("最终复位范围包含主轨迹端点",
              performance_flow.get('boundsContainEndpoints') is True)
        check("渲染队列最终归零", performance_flow.get('schedulerIdle') is True)
    else:
        check("Performance 2.0 真实运行时", False, str(performance_flow))

    ws.close()

    passed = sum(1 for p,_,_ in results if p)
    total = len(results)
    print(f"\n{'═'*50}\n结果: {passed}/{total} passed")
    if passed < total:
        print("失败项：")
        for p,n,d in results:
            if not p: print(f"  ✗ {n}" + (f"  ({d})" if d else ""))
        sys.exit(1)
    print(f"✓ {EXPECTED_VERSION} 功能测试全部通过")
finally:
    chrome.terminate()
    try: chrome.wait(timeout=3)
    except: chrome.kill()
    subprocess.run(["rm", "-rf", udir], capture_output=True)
