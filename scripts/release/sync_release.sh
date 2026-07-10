#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"
node scripts/build/generate_release_html.mjs
node scripts/release/sync_release_docs.mjs
node --check src/app/runtime.js
python3 scripts/release/check_release_metadata.py

VERSION=$(node -p "require('./package.json').version")
SIZE=$(du -h hiking-trail-mapper.html | cut -f1)
echo "✓ 同步完成 · v${VERSION} · ${SIZE}"
