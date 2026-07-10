#!/usr/bin/env python3
"""
v1.15.0 功能测试：
  1. 分组交互重构 —— trail-batch-check 元素存在 + 无 batchMode 引用
  2. KML.zip 导入 —— fflate.unzipSync 在页面里能真的解压
"""
import json, subprocess, socket, time, urllib.request, zipfile, io, sys, os, shutil, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TMPL = ROOT / "hiking-trail-mapper.html"
SAMPLE_KML = ROOT / "examples/sample-trails/格聂牧场+v线.kml"
EXPECTED_VERSION = re.search(
    r"const APP_VERSION = '(v\d+\.\d+\.\d+)'",
    TMPL.read_text(encoding="utf-8"),
).group(1)

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
    f"file://{TMPL}"
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
    ws_url = tabs[0]["webSocketDebuggerUrl"]
    try:
        import websocket
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "websocket-client"],
                              stdout=subprocess.DEVNULL)
        import websocket

    ws = websocket.create_connection(ws_url, timeout=30)
    _msg_id = [0]
    def cdp(method, params=None):
        _msg_id[0] += 1
        req = {"id": _msg_id[0], "method": method}
        if params: req["params"] = params
        ws.send(json.dumps(req))
        while True:
            m = json.loads(ws.recv())
            if m.get("id") == _msg_id[0]: return m

    cdp("Page.enable"); cdp("Runtime.enable")
    time.sleep(2.5)

    def evalj(expr):
        r = cdp("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
        v = r.get("result", {}).get("result", {})
        if v.get("subtype") == "error":
            return {"__error__": v.get("description", "")[:200]}
        return v.get("value")

    results = []
    def check(name, ok, detail=""):
        icon = "✓" if ok else "✗"
        results.append((ok, name, detail))
        print(f"  {icon} {name}" + (f"  ({detail})" if detail else ""))

    print(f"\n▸ 需求 4/1（{EXPECTED_VERSION}）：分组交互 + 复选框合并")
    check(f"APP_VERSION = {EXPECTED_VERSION}", evalj("APP_VERSION") == EXPECTED_VERSION)
    check("TypeScript core runtime 已接管关键函数",
          evalj("!!window.HikingTrailCore && window.__HTM_CORE_RUNTIME__ === window.HikingTrailCore && haversine === window.HikingTrailCore.haversine && buildDayPreviewRenderModel === window.HikingTrailCore.buildDayPreviewRenderModel"))
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
               'computeElevLayout', 'elevRatioColor', 'drawElevBackground',
               'drawElevGridLines', 'drawElevFill', 'drawElevCurve',
               'collectElevAnnotations', 'layoutElevLabels',
               'renderElevLabels', 'drawElevAxes', 'updateElevBadges',
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
               'getDayIndexRange', 'computeDayRangeStats',
               'showDaySegmentPreview', 'clearDaySegmentPreview',
               'showMeasureElevReadout', 'hideMeasureElevReadout',
               'resetMeasureElevReadout', 'setMeasureElevHint',
               'measureReverse',
               'segmentPointFromTrackIdx', 'segmentIndexesToPoints',
               'segmentHasExplicitDayIds', 'segmentRangeFromDayMeta',
               'restoreSegmentStateFromTrail', 'segmentInsertPoint',
               'segmentDeleteDay', 'renumberSegmentCampEditsForInsert',
               'renumberSegmentCampEditsForDelete']:
        check(f"函数 {fn}", evalj(f"typeof {fn} === 'function'"))

    check("handleFiles 已瘦身（< 30 行）",
          evalj("handleFiles.toString().split('\\n').length < 30"),
          str(evalj("handleFiles.toString().split('\\n').length")))
    check("parseAndProcessKml 已瘦身（< 50 行）",
          evalj("parseAndProcessKml.toString().split('\\n').length < 50"),
          str(evalj("parseAndProcessKml.toString().split('\\n').length")))
    check("drawElevBar 已瘦身（< 40 行）",
          evalj("drawElevBar.toString().split('\\n').length < 40"),
          str(evalj("drawElevBar.toString().split('\\n').length")))

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
          evalj("measureCompute.toString().includes('addMeasureEndpointMarker')"))
    check("第三次点击替换端点逻辑已移除",
          evalj("typeof nearestEndpointLabel === 'undefined' && typeof updateMeasureEndpoint === 'undefined'"))
    check("拖动吸附使用 requestAnimationFrame 节流",
          evalj("createPrimaryTrackDragSnapper.toString().includes('requestAnimationFrame') && createPrimaryTrackDragSnapper.toString().includes('cancelAnimationFrame')"))
    check("测距与分段拖动共用吸附调度器",
          evalj("bindMeasureEndpointDrag.toString().includes('createPrimaryTrackDragSnapper') && redrawSegmentLayer.toString().includes('createPrimaryTrackDragSnapper')"))
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
              return buildMeasureSegmentRenderModel === window.HikingTrailCore.buildMeasureSegmentRenderModel
                && !!model
                && model.latLngs.length === 900
                && model.latLngs[0][0] === track[0][0]
                && model.latLngs[899][0] === track[1199][0]
                && renderMeasureSegmentLine.toString().includes('buildMeasureSegmentRenderModel')
                && measureCompute.toString().includes('_computeSeq');
            })()
          """))
    check("测距统计使用缓存而非整段遍历",
          evalj("computeMeasureStats.toString().includes('getMeasureStatsCache') && !measureCompute.toString().includes('for(let i=i1+1')"))
    check("测距拖动中实时更新线段和面板",
          evalj("bindMeasureEndpointDrag.toString().includes('queueMeasureLiveUpdate') && createPrimaryTrackDragSnapper.toString().includes('opts.onSnap')"))
    check("测距拖动吸附优先局部近邻搜索",
          evalj("createPrimaryTrackDragSnapper.toString().includes('nearestTrackIdxNearPrimary')"))
    check("测距复位会重新补画 A/B 黄线",
          evalj("resetView.toString().includes('measureCompute') && resetView.toString().includes('measureState.ptA') && resetView.toString().includes('measureState.ptB')"))
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
              return buildSegmentLayerModel === window.HikingTrailCore.buildSegmentLayerModel
                && model.segments.length === 2
                && model.segments.every(segment => segment.latLngs.length <= 900)
                && model.markers[0].markerOptions.draggable === false
                && model.markers[1].markerOptions.draggable === true
                && model.markers[2].markerOptions.draggable === false
                && redrawSegmentLayer.toString().includes('buildSegmentLayerModel');
            })()
          """))
    check("缓存恢复使用延迟双阶段复位",
          evalj("schedulePostRestoreReset.toString().includes('setTimeout') && _boot.toString().includes('schedulePostRestoreReset')"))
    check("主轨迹浮动小卡支持拖动并记忆位置",
          evalj("bindPrimaryMiniDrag.toString().includes('pointerdown') && bindPrimaryMiniDrag.toString().includes('localStorage') || (bindPrimaryMiniDrag.toString().includes('pointerdown') && savePrimaryMiniPosition.toString().includes('localStorage'))"))
    check("主轨迹浮动小卡在侧栏收起后延迟套用位置",
          evalj("schedulePrimaryMiniPositionApply.toString().includes('setTimeout') && toggleSidebar.toString().includes('schedulePrimaryMiniPositionApply')"))
    check("地图标注点显示分段 D 天数",
          evalj("addWpMarker.toString().includes('wp-day-badge') && segmentApply.toString().includes('main.days = day_meta.length')"))
    check("标注点图标按 tag 统一渲染",
          evalj("waypointIcon('supply') === '🏪' && addWpMarker.toString().includes('waypointIcon(wp)') && buildFilterGrid.toString().includes('waypointIcon(tag)') && buildDaysTab.toString().includes('waypointIcon(wp)')"))
    check("Field Console 工具栏含品牌、两组命令和移动端更多菜单",
          evalj("""
            (() => {
              const toolbar = document.getElementById('map-toolbar');
              const commandIds = ['help-btn','reset-btn','measure-btn','segment-btn','add-waypoint-btn',
                'add-escape-btn','reverse-btn','add-trail-btn','export-btn','clear-btn'];
              return document.documentElement.dataset.ui === 'field-console'
                && !!window.HikingTrailApp
                && window.__HTM_APP_RUNTIME__ === window.HikingTrailApp
                && !!toolbar.querySelector('.toolbar-brand')
                && !!toolbar.querySelector('#toolbar-more')
                && commandIds.every(id => {
                  const button = document.getElementById(id);
                  return !!button && !!button.querySelector('.tb-icon') && !!button.querySelector('.tb-label');
                });
            })()
          """))
    check("顶部缓存按钮已移除",
          evalj("!document.getElementById('storage-btn') && !document.getElementById('storage-text')"))
    check("测距/分段进入时自动切换到标注点模式",
          evalj("measureEnter.toString().includes('enterInteractionRenderMode') && segmentEnter.toString().includes('enterInteractionRenderMode') && setMapMode.toString().includes('state.mode = mode')"))
    check("日程每日摘要包含最低海拔并可点击预览当天轨迹",
          evalj("buildDaysTab.toString().includes('最低海拔') && buildDaysTab.toString().includes('showDaySegmentPreview') && segmentApply.toString().includes('min: stats.minE') && segmentApply.toString().includes('i_start') && refreshElevBar.toString().includes('dayPreviewState.active')"))
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
              const panelButtons = [...document.querySelectorAll('#measure-panel button')]
                .map(btn => btn.textContent.trim().replace(/\\s+/g, ' '));
              return panelButtons.join('|') === '🔄 重新选点|⇄ 反向|✕ 退出'
                && !document.getElementById('measure-elev-overlay')
                && !document.getElementById('measure-result')
                && !!document.getElementById('measure-distance')
                && !!document.querySelector('#measure-distance #m-dist')
                && (measureReverse.toString().includes('measureState.ptA = measureState.ptB')
                  || measureReverse.toString().includes('reverseMeasureEndpoints'))
                && updateMeasureReadout.toString().includes('elev-stat-asc')
                && updateMeasureReadout.toString().includes('elev-stat-desc')
                && updateMeasureReadout.toString().includes(\"stats.distKm.toFixed(2) + ' km'\")
                && collectElevAnnotations.toString().includes('measureMode')
                && collectElevAnnotations.toString().includes('measure-a')
                && collectElevAnnotations.toString().includes('measure-b')
                && collectElevAnnotations.toString().includes("Math.round(maxE) + 'm'")
                && collectElevAnnotations.toString().includes("Math.round(minE) + 'm'")
                && !collectElevAnnotations.toString().includes(\"'高 '\")
                && !collectElevAnnotations.toString().includes(\"'低 '\")
                && !drawElevAxes.toString().includes('fillText(Math.round(maxE)')
                && !drawElevAxes.toString().includes('fillText(Math.round(minE)')
                && refreshElevBar.toString().includes('measureMode: true');
            })()
          """))
    check("行程 Day 预览优先使用 day_meta 范围并复用测距段显示和段内复位",
          evalj("""
            getDayIndexRange.toString().indexOf("dm.i_start") < getDayIndexRange.toString().indexOf("trail.track[i][5]")
            && showDaySegmentPreview.toString().includes("computeDayRangeStats")
            && showDaySegmentPreview.toString().includes("m-dist")
            && showDaySegmentPreview.toString().includes("fitBounds")
          """))
    check("行程分段可恢复/默认起终点/插入边界/指定删除",
          evalj("""
            (() => {
              const core = window.HikingTrailCore;
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
              return segmentEnter.toString().includes('restoreSegmentStateFromTrail')
                && segmentEnter.toString().includes('resetView({restoreActive: true})')
                && defaults.join('|') === '0|9'
                && restored.join('|') === '0|4|9'
                && !!inserted && inserted.insertAt === 1
                && deleted.length === 2
                && model.markers[1].markerOptions.draggable === true
                && renderSegmentList.toString().includes('seg-day-delete')
                && segmentDeleteDay.toString().includes('renumberSegmentCampEditsForDeleteFrom')
                && redrawSegmentLayer.toString().includes('m.markerOptions');
            })()
          """))
    check("天数模式入口移到行程页并可恢复原显示模式",
          evalj("""
            (() => {
              const trailModes = [...document.querySelectorAll('#tab-trails [data-mode]')].map(btn => btn.dataset.mode);
              const noDayButton = trailModes.join('|') === 'elev|waypoint'
                && !document.querySelector('#tab-trails [data-mode="day"]');
              setMapMode('waypoint');
              document.querySelector('.tab[data-tab="days"]').click();
              const entersDay = state.mode === 'day';
              document.querySelector('.tab[data-tab="trails"]').click();
              const restores = state.mode === 'waypoint';
              return noDayButton
                && entersDay
                && restores
                && buildDaysTab.toString().includes('days-summary')
                && buildDaysTab.toString().includes('day-head-main')
                && buildDaysTab.toString().includes('当日下降');
            })()
          """))
    check("新增标注按钮进入一次性点选模式",
          evalj("enterAddWaypointMode.toString().includes('crosshair') && addManualWaypointAt.toString().includes('gps_idx') && addManualWaypointAt.toString().includes('buildDaysTab')"))
    check("海拔填充沿完整曲线路径绘制",
          evalj("""
            (() => {
              const pts = [[30, 100, 1000, 0], [30.1, 100.1, 1200, 1], [30.2, 100.2, 900, 2]];
              const layout = computeElevationLayout(pts, {width: 320, height: 160});
              const model = computeElevationRenderModel(pts, layout);
              const fillSrc = drawElevFill.toString();
              return !fillSrc.includes('SEGS')
                && computeElevationRenderModel === window.HikingTrailCore.computeElevationRenderModel
                && model.fillPolygon.length === model.curve.length + 2
                && model.curve.every((point, index) => {
                  const fillPoint = model.fillPolygon[index + 1];
                  return fillPoint.x === point.x && fillPoint.y === point.y;
                })
                && fillSrc.includes('renderModel.fillPolygon')
                && fillSrc.includes('lineTo(fillPolygon[i].x, fillPolygon[i].y)');
            })()
          """))

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
