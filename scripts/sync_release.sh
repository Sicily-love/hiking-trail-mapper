#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# sync_release.sh — 同步 release 单文件入口与派生文件
#
# 用法：
#   ./sync_release.sh                     # 使用当前仓库 hiking-trail-mapper.html
#   ./sync_release.sh path/to/foo.html    # 指定源 HTML
#
# 功能：
#   1. 通用化：顶部注释「格聂牧场徒步路线地图」→「徒步路线地图 (Hiking Trail Mapper)」
#   2. 同步 → {hiking-trail-mapper.html, index.html}
#   3. 从 HTML 中重新提取 CHANGELOG 数组，覆盖 CHANGELOG.md
#   4. 更新 README.md 里的 version badge / 版本行
#   5. Node 语法检查 + 一致性检查
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── 定位仓库根 ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RELEASE_DIR="$REPO_ROOT"
DEFAULT_HTML="$REPO_ROOT/hiking-trail-mapper.html"

# ── 颜色 ──────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
else
  GREEN=''; YELLOW=''; RED=''; CYAN=''; NC=''
fi

log()  { echo -e "${CYAN}▸${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*" >&2; }

# ── 1. 选源 HTML ──────────────────────────────────────────────
if [[ $# -ge 1 ]]; then
  SRC_HTML="$1"
  [[ -f "$SRC_HTML" ]] || { err "文件不存在: $SRC_HTML"; exit 1; }
else
  SRC_HTML="$DEFAULT_HTML"
  [[ -f "$SRC_HTML" ]] || { err "未找到 HTML: $SRC_HTML"; exit 1; }
fi

log "源文件: ${SRC_HTML#$REPO_ROOT/}"

# ── 2. 从 HTML 提取版本号 ──────────────────────────────────────
APP_VERSION=$(grep -oE "const APP_VERSION = '[^']+'" "$SRC_HTML" | head -1 | sed -E "s/.*'([^']+)'.*/\1/")
BUILD_DATE=$(grep -oE "BUILD_DATE:\s*[0-9-]+" "$SRC_HTML" | head -1 | awk '{print $2}')
[[ -n "$APP_VERSION" ]] || { err "无法从 HTML 提取 APP_VERSION"; exit 1; }
ok "版本: $APP_VERSION  ($BUILD_DATE)"

# ── 3. 一致性预检 ─────────────────────────────────────────────
log "版本号一致性检查..."
fail_count=0
check_version() {
  local k="$1"
  local v="$2"
  if [[ "$v" == "$APP_VERSION" ]]; then
    ok "  $k = $v"
  else
    err "  $k = '$v' (期望 $APP_VERSION)"
    fail_count=$((fail_count+1))
  fi
}
check_version "顶部注释" "$(grep -oE "APP_VERSION: v[0-9.]+" "$SRC_HTML" | head -1 | awk '{print $2}')"
check_version "<title>" "$(grep -oE "在线版 v[0-9.]+" "$SRC_HTML" | head -1 | awk '{print $2}')"
check_version "JS APP_VERSION" "$APP_VERSION"
check_version "CHANGELOG 顶部" "$(grep -oE "version: '[^']+'" "$SRC_HTML" | head -1 | sed -E "s/.*'([^']+)'.*/\1/")"
[[ $fail_count -eq 0 ]] || { err "版本号不一致，先在源 HTML 修好再来同步"; exit 1; }

# ── 4. 通用化并拷贝到 release ────────────────────────────────
log "通用化 + 拷贝..."
mkdir -p "$RELEASE_DIR"

TMP_HTML="$(mktemp -t hikingmap_release_XXXXXX.html)"
python3 - "$SRC_HTML" "$TMP_HTML" <<'PY'
import sys, re
src, dst = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()
# 把顶部注释里的项目名通用化（只改注释，不动 <title> 或 UI）
html = html.replace(
    '格聂牧场徒步路线地图 · 在线版',
    '徒步路线地图 (Hiking Trail Mapper) · 在线版'
)
open(dst, 'w', encoding='utf-8').write(html)
PY

mv "$TMP_HTML" "$RELEASE_DIR/hiking-trail-mapper.html"
cp "$RELEASE_DIR/hiking-trail-mapper.html" "$RELEASE_DIR/index.html"
ok "  → release/hiking-trail-mapper.html + index.html"

# ── 5. 重新提取 CHANGELOG ─────────────────────────────────────
log "重新生成 CHANGELOG.md..."
python3 - "$RELEASE_DIR/hiking-trail-mapper.html" "$RELEASE_DIR/CHANGELOG.md" <<'PY'
import sys, re
src, dst = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()

m = re.search(r'const CHANGELOG = (\[[\s\S]*?\n\]);', html)
if not m:
    print("NO CHANGELOG match", file=sys.stderr); sys.exit(1)
raw = m.group(1)

pattern = re.compile(
    r"\{\s*"
    r"version:\s*'([^']+)',\s*"
    r"date:\s*'([^']+)',\s*"
    r"items:\s*\{\s*"
    r"zh:\s*\[([\s\S]*?)\],\s*"
    r"en:\s*\[([\s\S]*?)\],?\s*"
    r"\},?\s*"
    r"\},?",
    re.MULTILINE
)
entries = []
for ver, date, zh_block, en_block in pattern.findall(raw):
    zh = re.findall(r"'((?:\\.|[^'\\])*)'", zh_block)
    en = re.findall(r"'((?:\\.|[^'\\])*)'", en_block)
    unesc = lambda s: s.replace("\\'", "'").replace("\\|", "|")
    entries.append((ver, date, [unesc(s) for s in zh], [unesc(s) for s in en]))

lines = ["# Changelog", "",
         "**🌐 中英双语条目 · Chinese and English entries preserved per version**", "",
         "All notable changes to Hiking Trail Mapper. Both Chinese and English entries preserved from in-app CHANGELOG.", ""]
for ver, date, zh, en in entries:
    lines.append(f"## {ver} — {date}"); lines.append("")
    lines.append("**中文**"); lines.append("")
    for it in zh: lines.append(f"- {it}")
    lines.append("")
    lines.append("**English**"); lines.append("")
    for it in en: lines.append(f"- {it}")
    lines.append("")
open(dst, 'w', encoding='utf-8').write("\n".join(lines))
print(f"  Parsed {len(entries)} version entries")
PY

# ── 6. 更新 README.md / README.en.md 里的 version badge（如果有）──────
log "更新 README 版本徽章（如存在）..."
python3 - "$RELEASE_DIR" "$APP_VERSION" <<'PY'
import sys, re, os
release_dir, ver = sys.argv[1], sys.argv[2]
for name in ('README.md', 'README.en.md'):
    p = os.path.join(release_dir, name)
    if not os.path.exists(p): continue
    txt = open(p, encoding='utf-8').read()
    new_txt, badge_n = re.subn(
        r'!\[version\]\(https://img\.shields\.io/badge/version-v[0-9.]+-blue\)',
        f'![version](https://img.shields.io/badge/version-{ver}-blue)',
        txt
    )
    # 同时更新 "版本：vX.Y.Z" / "Version: vX.Y.Z" 类的纯文本行
    new_txt, line_n = re.subn(
        r'(?m)^(\s*[-*]?\s*(?:版本|Version)\s*[:：]\s*)v[0-9]+\.[0-9]+\.[0-9]+',
        rf'\1{ver}',
        new_txt
    )
    if badge_n + line_n > 0:
        open(p, 'w', encoding='utf-8').write(new_txt)
        print(f"  {name}: badge={badge_n} · 文本={line_n} → {ver}")
    else:
        print(f"  {name}: 无版本占位，跳过")
PY
ok "  README 已同步"

# ── 7. Node 语法检查 ──────────────────────────────────────────
log "JS 语法检查..."
TMP_BASE=$(mktemp -t "hikingmap_XXXXXX")
TMP_JS="${TMP_BASE}.js"
mv "$TMP_BASE" "$TMP_JS"
trap "rm -f $TMP_JS" EXIT

python3 - "$RELEASE_DIR/hiking-trail-mapper.html" "$TMP_JS" <<'PY'
import sys, re
html = open(sys.argv[1], encoding='utf-8').read()
scripts = re.findall(r'<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)</script>', html)
open(sys.argv[2], 'w', encoding='utf-8').write(scripts[-1])
PY

if node --check "$TMP_JS" 2>&1; then
  ok "  语法通过"
else
  err "  语法错误！检查源 HTML 后重跑"
  exit 1
fi

# ── 7.5 完整 skill 验收测试 ─────────────────────────────────
if [[ -f "$REPO_ROOT/scripts/test_skill.py" ]]; then
  log "跑 skill 完整验收测试..."
  if python3 "$REPO_ROOT/scripts/test_skill.py" > /tmp/skill_test_$$.log 2>&1; then
    result_line=$(tail -3 /tmp/skill_test_$$.log | head -1)
    ok "  $result_line"
    rm -f /tmp/skill_test_$$.log
  else
    err "  skill 验收失败！详情："
    tail -20 /tmp/skill_test_$$.log
    rm -f /tmp/skill_test_$$.log
    exit 1
  fi
fi

# ── 8. 总结 ──────────────────────────────────────────────────
echo ""
ok "同步完成 · $APP_VERSION"
echo ""
echo "  📁 $RELEASE_DIR"
echo "     ├── hiking-trail-mapper.html   ($(du -h "$RELEASE_DIR/hiking-trail-mapper.html" | cut -f1))"
echo "     ├── index.html                 ($(du -h "$RELEASE_DIR/index.html" | cut -f1))"
echo "     ├── CHANGELOG.md               ($(wc -l < "$RELEASE_DIR/CHANGELOG.md") lines)"
echo "     └── README.md                  (badge = $APP_VERSION)"
echo ""
echo "下一步："
echo "  cd $RELEASE_DIR"
echo "  git add . && git commit -m 'Release $APP_VERSION' && git push"
