#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT="${1:-/tmp/outdoor-route-studio}"
cd "$ROOT"

if command -v uv >/dev/null 2>&1; then
  exec uv run --with websocket-client python tests/visual/capture_workbench.py "$OUTPUT"
fi

python3 -c "import websocket" >/dev/null 2>&1 || {
  echo "websocket-client is required: python3 -m pip install websocket-client" >&2
  exit 1
}
exec python3 tests/visual/capture_workbench.py "$OUTPUT"
