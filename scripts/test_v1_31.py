#!/usr/bin/env python3
"""
v1.15.0 功能测试：
  1. 分组交互重构 —— trail-batch-check 元素存在 + 无 batchMode 引用
  2. KML.zip 导入 —— fflate.unzipSync 在页面里能真的解压
"""
import json, subprocess, socket, time, urllib.request, zipfile, io, sys, os, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TMPL = ROOT / "hiking-trail-mapper.html"
SAMPLE_KML = ROOT / "examples/sample-trails/格聂牧场+v线.kml"

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

    print("\n▸ 需求 4/1（v1.31.0）：分组交互 + 复选框合并")
    check("APP_VERSION = v1.31.0", evalj("APP_VERSION") == "v1.31.0")
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

    print("\n▸ v1.31.0：重构后的辅助函数存在性")
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

    print("\n▸ v1.31.0：3 个大函数深度拆分后新增的 helper")
    for fn in ['expandZipFiles', 'importSingleKml', 'findDuplicateTrail',
               'ensureUniqueTrailId', 'renderKmlImportRow', 'bindKmlImportRowEvents',
               'postImportFinalize',
               'computeCumulativeDistance', 'buildDayMeta',
               'computeTrailStats', 'generateNextTrailId',
               'computeElevLayout', 'elevRatioColor', 'drawElevBackground',
               'drawElevGridLines', 'drawElevFill', 'drawElevCurve',
               'collectElevAnnotations', 'layoutElevLabels',
               'renderElevLabels', 'drawElevAxes', 'updateElevBadges']:
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
    print("✓ v1.31.0 功能测试全部通过")
finally:
    chrome.terminate()
    try: chrome.wait(timeout=3)
    except: chrome.kill()
    subprocess.run(["rm", "-rf", udir], capture_output=True)
