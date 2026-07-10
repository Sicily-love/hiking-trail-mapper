#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

./scripts/release/sync_release.sh
./tests/run_full_check.sh
npm run build

node - "$ROOT/dist" <<'NODE'
const fs = require('fs');
const path = require('path');
const dist = process.argv[2];
const index = fs.readFileSync(path.join(dist, 'index.html'));
const alias = fs.readFileSync(path.join(dist, 'hiking-trail-mapper.html'));
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'release.json'), 'utf8'));
if(!index.equals(alias)) throw new Error('dist HTML entrypoints do not match');
if(!/^v\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error('release.json has an invalid version');
console.log(`✓ dist verified: ${manifest.version}`);
NODE
