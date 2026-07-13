#!/usr/bin/env python3
"""
Skill 静态验收测试（无 CDP，不启交互式 Chrome）
==================================================
只做：
1. 版本一致性
2. 关键函数/变量存在（正则）
3. Node --check JS 语法
4. Chrome headless --dump-dom 一次性快照
5. 中英 i18n 词条数量对齐
"""
import re, subprocess, tempfile, os, sys, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TMPL = ROOT / "hiking-trail-mapper.html"
RELEASE = ROOT
HTML = TMPL.read_text(encoding='utf-8')
CHANGELOG_SOURCE = (ROOT / "src/features/localization/changelog.ts").read_text(encoding='utf-8')
TRANSLATIONS_SOURCE = (ROOT / "src/features/localization/translations.ts").read_text(encoding='utf-8')

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
    return None

# 从 HTML 读取"当前版本"作为期望值
VER_MATCH = re.search(r"const APP_VERSION\s*=\s*'([^']+)'", HTML)
EXPECTED_VER = VER_MATCH.group(1) if VER_MATCH else 'UNKNOWN'

results = []
def check(name, passed, detail=""):
    icon = "✓" if passed else "✗"
    results.append((passed, name, detail))
    print(f"  {icon} {name}" + (f"  ({detail})" if detail else ""))

print(f"▸ 测试目标: {TMPL}")
print(f"  大小: {len(HTML):,} bytes")
print(f"  期望版本: {EXPECTED_VER}\n")

print("▸ 版本一致性")
m1 = re.search(r"APP_VERSION:\s*(v[\d.]+)", HTML)
m2 = re.search(r"<title>\s*([^<]+?)\s*</title>", HTML)
m3 = re.search(r"const APP_VERSION\s*=\s*'([^']+)'", HTML)
m4 = re.search(r"export const CHANGELOG\s*=\s*\[\s*\{\s*version:\s*'([^']+)'", CHANGELOG_SOURCE)
versions = {'注释': m1 and m1.group(1), 'JS APP_VERSION': m3 and m3.group(1),
            'CHANGELOG首条': m4 and m4.group(1)}
for k, v in versions.items():
    check(f"版本 {k} = {v}", v == EXPECTED_VER)
title = m2.group(1).strip() if m2 else None
check(f"产品 title = {title}", title == "Outdoor Route Studio")

print("\n▸ 关键函数")
required_funcs = [
    'buildTrailList', 'buildPrimaryMini', 'drawElevBar', 'rebuildAll',
    'showExportMenu', 'exportGroupKML', 'exportItineraryMD',
    'saveToStorage', 'loadFromStorage', 'setLang', 'applyI18n',
    'haversine', 'reverseTrail',
]
for fn in required_funcs:
    found = bool(re.search(
        rf"\bfunction\s+{fn}\b|\b{fn}\s*=\s*(?:async\s+)?(?:function|\()|\b{fn}\s*=\s*HTM_(?:CORE|APP)\.",
        HTML,
    ))
    check(f"函数 {fn}", found)

print("\n▸ 关键状态字段")
required_state = ['batchMode', 'batchSelected', 'activeGroup', 'primaryTrailId',
                  'activeTrails', 'expandedTrails']
for f in required_state:
    check(f"state.{f}", f'state.{f}' in HTML or f"'{f}'" in HTML or f'"{f}"' in HTML)

print("\n▸ KML 解析约束")
check("gx:Track 处理", 'gx:Track' in HTML or 'gx\\:Track' in HTML)
check("LineString 处理", 'LineString' in HTML)
check("Point placemark", 'Point' in HTML)

print("\n▸ 计算约定")
check("accumulator ascent (thr=10)",
      re.search(r"(?:running_asc|accumulator|thr\s*[:=]\s*10)", HTML) is not None)
check("haversine 球面距离",
      HTML.count('haversine') >= 3)

print("\n▸ i18n 词条对齐")
# TRANSLATIONS = { zh: { 'key.a':'..', ... }, en: { 'key.a':'..', ... } }
i18n_m = re.search(r"export const TRANSLATIONS[^=]*=\s*\{\s*zh:\s*\{([\s\S]*?)\n\s*\},\s*en:\s*\{([\s\S]*?)\n\s*\}\s*\};", TRANSLATIONS_SOURCE)
if i18n_m:
    zh_block, en_block = i18n_m.group(1), i18n_m.group(2)
    # 词条格式：'key.subkey': '...' 或 'key.subkey': "..."
    zh_count = len(re.findall(r"^\s*'[a-zA-Z][^']*'\s*:", zh_block, re.MULTILINE))
    en_count = len(re.findall(r"^\s*'[a-zA-Z][^']*'\s*:", en_block, re.MULTILINE))
    print(f"    zh 词条数: {zh_count} | en 词条数: {en_count}")
    check("i18n zh 词条 >= 100", zh_count >= 100, str(zh_count))
    check("i18n en 词条数量与 zh 对齐（±2）", abs(zh_count - en_count) <= 2,
          f"差 {abs(zh_count-en_count)}")
else:
    check("i18n 结构 (zh/en block)", False, "找不到 TRANSLATIONS 数据模块")

print("\n▸ 内嵌库")
check("Leaflet 内嵌", '@license Leaflet' in HTML or 'Leaflet 1.9' in HTML or 'L.map = function' in HTML)
check("fflate 内嵌", 'fflate' in HTML and HTML.count('fflate') >= 5)
check("polylineDecorator", 'PolylineDecorator' in HTML)

print("\n▸ Node --check JS 语法")
scripts = re.findall(r'<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)</script>', HTML)
tmp = tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8')
tmp.write(scripts[-1])
tmp.close()
try:
    r = subprocess.run(['node', '--check', tmp.name], capture_output=True, timeout=15)
    check(f"JS 语法（{len(scripts[-1]):,} chars）",
          r.returncode == 0, r.stderr.decode()[:200] if r.returncode else "ok")
finally:
    os.unlink(tmp.name)

print("\n▸ 发布物 DOM 基础结构")
chrome_proc = None
udir = f"/tmp/chrome-dump-{os.getpid()}"
try:
    codex_sandbox = os.environ.get("CODEX_SANDBOX") == "seatbelt"
    static_only = os.environ.get("HTM_SKIP_STATIC_CHROME") == "1"
    if codex_sandbox or static_only:
        # 不在 Codex seatbelt 沙箱内启动 /Applications/Google Chrome.app。
        # Chrome 会在 HIServices::_RegisterApplication / TransformProcessType
        # 阶段被 macOS 拦截并 SIGABRT，导致系统弹崩溃通知；真实浏览器验收
        # 统一由 ./tests/run_full_check.sh 在批准的外部执行环境中完成。
        reason = "沙箱环境" if codex_sandbox else "全量测试的静态阶段"
        print(f"    {reason}不重复启动 Chrome；真实浏览器验收由功能与 E2E 阶段完成")
        check(f"DOM 长度 > 100k", len(HTML) > 100_000, f"source {len(HTML):,} chars")
        check("DOM 含 leaflet-container", 'leaflet-container' in HTML)
        check("DOM 含 sidebar", 'sidebar' in HTML.lower())
        check("DOM 含 elev-bar", 'elev-bar' in HTML or 'elevbar' in HTML.lower())
        check(f"DOM 含 version tag {EXPECTED_VER}", EXPECTED_VER in HTML)
        check("DOM 无 JS 错误标记", 'Uncaught' not in HTML and 'SyntaxError' not in HTML)
    else:
        chrome = chrome_bin()
        if not chrome:
            raise FileNotFoundError("找不到 Chrome/Chromium，可设置 CHROME_BIN")
        chrome_env = os.environ.copy()
        chrome_env.pop("__CFBundleIdentifier", None)
        chrome_proc = subprocess.Popen([
            chrome, '--headless=new', '--disable-gpu', '--no-sandbox',
            '--disable-crash-reporter', '--disable-dev-shm-usage',
            '--virtual-time-budget=5000',
            f'--user-data-dir={udir}',
            '--dump-dom', f'file://{TMPL}'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=chrome_env)
        out = b''
        err = b''
        try:
            out, err = chrome_proc.communicate(timeout=12)
        except subprocess.TimeoutExpired as e:
            out = e.output or b''
            err = getattr(e, "stderr", None) or b''
            chrome_proc.kill()
            chrome_proc.communicate()
        dom = out.decode(errors='replace')
        err_text = err.decode(errors='replace')
        rc = chrome_proc.returncode
        check(f"DOM 长度 > 100k", len(dom) > 100_000,
              f"{len(dom):,} chars; rc={rc}; stderr={err_text[:120]}")
        check("DOM 含 leaflet-container", 'leaflet-container' in dom)
        check("DOM 含 sidebar", 'sidebar' in dom.lower())
        check("DOM 含 elev-bar", 'elev-bar' in dom or 'elevbar' in dom.lower())
        check(f"DOM 含 version tag {EXPECTED_VER}", EXPECTED_VER in dom)
        check("DOM 无 JS 错误标记", 'Uncaught' not in dom and 'SyntaxError' not in dom)
except Exception as e:
    check("Chrome dump-dom", False, str(e)[:100])
finally:
    if chrome_proc:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            chrome_proc.kill()
    subprocess.run(['rm', '-rf', udir], capture_output=True)

print("\n▸ GitHub release 目录双语完整性")
if RELEASE.exists():
    bilingual_pairs = [
        'README.md',
        'docs/FEATURES.md',
        'docs/ARCHITECTURE.md',
        'docs/screenshots/README.md',
        'examples/README.md',
        'tools/README.md',
    ]
    for zh in bilingual_pairs:
        en = zh.replace('.md', '.en.md')
        zh_ok = (RELEASE / zh).exists()
        en_ok = (RELEASE / en).exists()
        check(f"双语对齐 {zh}", zh_ok and en_ok,
              "" if (zh_ok and en_ok) else f"zh={'✓' if zh_ok else '✗'} en={'✓' if en_ok else '✗'}")

    # HTML 双入口
    check("release/index.html 存在", (RELEASE / "index.html").exists())
    check("release/hiking-trail-mapper.html 存在", (RELEASE / "hiking-trail-mapper.html").exists())
    check("release/LICENSE 存在", (RELEASE / "LICENSE").exists())
    check("release/CHANGELOG.md 存在", (RELEASE / "CHANGELOG.md").exists())

    # README 语言切换头（允许多种格式）
    for f in ['README.md', 'README.en.md']:
        p = RELEASE / f
        if p.exists():
            txt = p.read_text(encoding='utf-8')
            has_zh = '[中文]' in txt or re.search(r'<a\s+href="README\.md">中文</a>', txt) is not None
            has_en = '[English]' in txt or re.search(r'<a\s+href="README\.en\.md">English</a>', txt) is not None
            check(f"{f} 有语言切换头",
                  has_zh and has_en,
                  f"zh={has_zh} en={has_en}")

    # README 版本 badge 一致（若存在）
    for f in ['README.md', 'README.en.md']:
        p = RELEASE / f
        if not p.exists(): continue
        txt = p.read_text(encoding='utf-8')
        if 'img.shields.io/badge/version' in txt:
            check(f"{f} version badge = {EXPECTED_VER}",
                  f'badge/version-{EXPECTED_VER}-blue' in txt)
        else:
            # 新版 README 用「版本：vX.Y.Z」文本行代替 badge
            m = re.search(r'(?m)^\s*[-*]?\s*(?:版本|Version)\s*[:：]\s*(v[0-9]+\.[0-9]+\.[0-9]+)', txt)
            if m:
                check(f"{f} 版本行 = {EXPECTED_VER}", m.group(1) == EXPECTED_VER)
            else:
                check(f"{f} 至少存在一处版本号声明", False, "既无 badge 也无版本行")
else:
    check("release 目录存在", False, str(RELEASE))

print(f"\n{'═'*60}")
passed = sum(1 for p, _, _ in results if p)
total = len(results)
print(f"结果: {passed}/{total} passed")
if passed < total:
    print("\n失败项：")
    for p, n, d in results:
        if not p: print(f"  ✗ {n}" + (f"  ({d})" if d else ""))
    sys.exit(1)
print("\n✓ Skill 模板通过全部静态验收")
