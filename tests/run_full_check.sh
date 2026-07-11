#!/usr/bin/env bash
# Outdoor Route Studio · Release 2.0 full verification
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
TMP_CHECK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/htm-full-check.XXXXXX")"
trap 'rm -rf "$TMP_CHECK_DIR"' EXIT

ok()  { echo -e "\033[32m✓\033[0m $*"; }
skip(){ echo -e "\033[33m▸\033[0m $*"; }
fail(){ echo -e "\033[31m✗\033[0m $*"; exit 1; }

run_python_with_websocket() {
  local script="$1"
  if command -v uv >/dev/null 2>&1; then
    uv run --with websocket-client python3 "$script"
    return
  fi
  python3 -c "import websocket" >/dev/null 2>&1 || {
    python3 -m pip install --quiet websocket-client || fail "无法安装 websocket-client"
  }
  python3 "$script"
}

echo "═══════════════════════════════════════════════════════════════"
echo "  Outdoor Route Studio · 全量测试 · $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════════"

# Phase 1: typecheck and build the tracked release in read-only check mode.
skip "Phase 1 · TypeScript + Vite 临时发布"
[ -x "$ROOT/node_modules/.bin/tsc" ] || fail "缺少 TypeScript；请先安装依赖"
[ -x "$ROOT/node_modules/.bin/vite" ] || fail "缺少 Vite；请先安装依赖"
npm run typecheck > "$TMP_CHECK_DIR/typecheck.log" 2>&1 || {
  cat "$TMP_CHECK_DIR/typecheck.log"; fail "TypeScript 类型检查失败"
}
npm run check:generated > "$TMP_CHECK_DIR/vite-build.log" 2>&1 || {
  cat "$TMP_CHECK_DIR/vite-build.log"; fail "Vite 发布构建或只读对齐检查失败"
}
export HTM_RELEASE_HTML="$ROOT/.vite-build/index.html"
[ -f "$HTM_RELEASE_HTML" ] || fail "临时发布 HTML 不存在"

node - "$HTM_RELEASE_HTML" "$TMP_CHECK_DIR/inline-release.mjs" <<'NODE'
const fs = require('fs');
const [input, output] = process.argv.slice(2);
const html = fs.readFileSync(input, 'utf8');
const scripts = [...html.matchAll(/<script type="module" data-studio-bundle>([\s\S]*?)<\/script>/g)];
if(scripts.length !== 1) throw new Error(`expected one inline module, found ${scripts.length}`);
fs.writeFileSync(output, scripts[0][1]);
NODE
node --check "$TMP_CHECK_DIR/inline-release.mjs" || fail "发布物 JavaScript 语法错误"
ok "  TypeScript + Vite 单文件发布通过"

# Phase 2: all Node unit and source/artifact contract tests.
skip "Phase 2 · 单元测试（Node）"
npm run test:unit > "$TMP_CHECK_DIR/unit.log" 2>&1 || {
  cat "$TMP_CHECK_DIR/unit.log"; fail "单元测试失败"
}
ok "  单元测试全过"

# Phase 3: source metadata and release metadata alignment.
skip "Phase 3 · 发布元数据一致性"
python3 "$ROOT/scripts/release/check_release_metadata.py" > "$TMP_CHECK_DIR/metadata.log" 2>&1 || {
  cat "$TMP_CHECK_DIR/metadata.log"; fail "发布元数据不一致"
}
ok "  发布元数据一致"

# Phase 4: static browser acceptance checks.
skip "Phase 4 · 静态验收"
HTM_SKIP_STATIC_CHROME=1 python3 "$ROOT/tests/browser/test_skill.py" > "$TMP_CHECK_DIR/test_skill.log" 2>&1 || {
  cat "$TMP_CHECK_DIR/test_skill.log"; fail "静态验收失败"
}
STATIC_LINE=$(grep -E "^结果: [0-9]+/[0-9]+ passed" "$TMP_CHECK_DIR/test_skill.log" | tail -1 || true)
[ -n "$STATIC_LINE" ] || {
  cat "$TMP_CHECK_DIR/test_skill.log"; fail "静态验收缺少结果汇总"
}
ok "  $STATIC_LINE"

# Phase 5: browser functional suite against the exact temporary artifact.
skip "Phase 5 · 功能测试"
LATEST_FUNC=$(find "$ROOT/tests/browser" -maxdepth 1 -name 'test_v1_*.py' -print | sort -V | tail -1)
if [ -n "$LATEST_FUNC" ]; then
  run_python_with_websocket "$LATEST_FUNC" > "$TMP_CHECK_DIR/test_func.log" 2>&1 || {
    cat "$TMP_CHECK_DIR/test_func.log"; fail "功能测试失败"
  }
  RESULT_LINE=$(grep -E "^结果: [0-9]+/[0-9]+ passed" "$TMP_CHECK_DIR/test_func.log" | tail -1 || true)
  [ -n "$RESULT_LINE" ] || {
    cat "$TMP_CHECK_DIR/test_func.log"; fail "功能测试缺少结果汇总"
  }
  ok "  $RESULT_LINE  ($LATEST_FUNC)"
else
  fail "找不到 tests/browser/test_v1_*.py"
fi

# Phase 6: end-to-end suite against the same temporary artifact.
skip "Phase 6 · 端到端测试"
run_python_with_websocket tests/e2e/run_all.py > "$TMP_CHECK_DIR/e2e.log" 2>&1 || {
  cat "$TMP_CHECK_DIR/e2e.log"; fail "端到端测试失败"
}
E2E_LINE=$(grep -E "^结果: [0-9]+/[0-9]+ passed" "$TMP_CHECK_DIR/e2e.log" | tail -1 || true)
[ -n "$E2E_LINE" ] || {
  cat "$TMP_CHECK_DIR/e2e.log"; fail "端到端测试缺少结果汇总"
}
ok "  $E2E_LINE"

# Final manifest validation stays read-only and verifies the browser-tested bytes.
node - "$ROOT" <<'NODE'
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const outDir = path.join(root, '.vite-build');
const index = fs.readFileSync(path.join(outDir, 'index.html'));
const alias = fs.readFileSync(path.join(outDir, 'hiking-trail-mapper.html'));
const tracked = fs.readFileSync(path.join(root, 'hiking-trail-mapper.html'));
const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'release.json'), 'utf8'));
if(!index.equals(alias) || !index.equals(tracked)) throw new Error('release HTML payloads differ');
if(manifest.bytes !== index.byteLength) throw new Error('release.json byte count differs');
if(manifest.sha256 !== crypto.createHash('sha256').update(index).digest('hex')) {
  throw new Error('release.json digest differs');
}
NODE
ok "  临时发布、受跟踪发布物与 release.json 完全一致"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "  \033[32m✓ 全部 6 个阶段测试通过\033[0m"
echo "═══════════════════════════════════════════════════════════════"
