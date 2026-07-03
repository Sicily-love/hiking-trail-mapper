#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
#  hiking-trail-mapper · 完整测试流程
#  ─────────────────────────────────────────────────────────────
#  用法：./tests/run_full_check.sh
#
#  大改动前后必跑：
#    - 修改任何 300+ 行函数
#    - 新增/删除全局 state 字段
#    - 修改数据结构（Trail/Waypoint 字段）
#    - 修改 IO 层（parseKml/handleFiles/KML 导出）
#    - 版本号变更（vX.Y.0 及以上）
#
#  任一阶段失败即停，输出可复现指令。
# ══════════════════════════════════════════════════════════════════
set -e

cd "$(dirname "$0")/.."   # → hiking-trail-mapper
ROOT="$(pwd)"

ok()  { echo -e "\033[32m✓\033[0m $*"; }
skip(){ echo -e "\033[33m▸\033[0m $*"; }
fail(){ echo -e "\033[31m✗\033[0m $*"; exit 1; }

echo "═══════════════════════════════════════════════════════════════"
echo "  hiking-trail-mapper · 全量测试 · $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════════"

# ── Phase 1: 语法检查 ──────────────────────────────────────
skip "Phase 1 · JS 语法检查"
python3 -c "
import re
h=open('$ROOT/hiking-trail-mapper.html').read()
s=re.findall(r'<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)</script>', h)
open('/tmp/htm-inline.js','w').write(s[-1])
"
node --check /tmp/htm-inline.js || fail "JS 语法错误"
ok "  语法通过"

# ── Phase 2: 单元测试 ─────────────────────────────────────
skip "Phase 2 · 单元测试（Node）"
node "$ROOT/tests/unit/test_math.js"     || fail "test_math 失败"
node "$ROOT/tests/unit/test_enrich.js"   || fail "test_enrich 失败"
node "$ROOT/tests/unit/verify_alignment.js" || fail "trail_core 与 HTML 实现不一致"
ok "  单元 + 对齐测试全过"

# ── Phase 3: 静态验收 ─────────────────────────────────────
skip "Phase 3 · 静态验收（54 项）"
cd "$ROOT"
python3 "$ROOT/scripts/test_skill.py" > /tmp/test_skill.log 2>&1 || {
  cat /tmp/test_skill.log; fail "静态验收失败";
}
grep -q "54/54 passed" /tmp/test_skill.log || {
  cat /tmp/test_skill.log; fail "静态验收未全过";
}
ok "  54/54 通过"

# ── Phase 4: 功能测试（浏览器 + WebSocket） ─────────────────
skip "Phase 4 · 功能测试"
LATEST_FUNC=$(ls "$ROOT"/scripts/test_v1_*.py 2>/dev/null | sort -V | tail -1)
if [ -n "$LATEST_FUNC" ]; then
  uv run --with websocket-client python3 "$LATEST_FUNC" > /tmp/test_func.log 2>&1 || {
    cat /tmp/test_func.log; fail "功能测试失败";
  }
  # 提取结果行
  RESULT_LINE=$(grep -E "^结果: [0-9]+/[0-9]+ passed" /tmp/test_func.log | tail -1)
  ok "  $RESULT_LINE  ($LATEST_FUNC)"
else
  fail "  找不到 scripts/test_v1_*.py"
fi

# ── Phase 5: 端到端测试（14 大场景） ──────────────────────
skip "Phase 5 · 端到端测试"
cd "$ROOT"
uv run --with websocket-client python3 tests/e2e/run_all.py > /tmp/e2e.log 2>&1 || {
  cat /tmp/e2e.log; fail "端到端测试失败";
}
E2E_LINE=$(grep -E "^结果: [0-9]+/[0-9]+ passed" /tmp/e2e.log | tail -1)
ok "  $E2E_LINE"

# ── Phase 6: sync 检查（github-release 与 skill 模板一致） ────
skip "Phase 6 · sync 一致性检查"
cd "$ROOT"
"$ROOT/scripts/sync_release.sh" > /tmp/sync.log 2>&1 || {
  cat /tmp/sync.log; fail "sync 失败";
}
grep -q "54/54 passed" /tmp/sync.log || fail "sync 内静态验收未全过"
ok "  同步完成"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "  \033[32m✓ 全部 6 个阶段测试通过\033[0m"
echo "═══════════════════════════════════════════════════════════════"
