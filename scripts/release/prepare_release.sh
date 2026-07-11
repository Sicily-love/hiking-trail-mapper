#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

./scripts/release/sync_release.sh
./tests/run_full_check.sh
npm run build

node - "$ROOT/dist" <<'NODE'
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dist = process.argv[2];
const index = fs.readFileSync(path.join(dist, 'index.html'));
const alias = fs.readFileSync(path.join(dist, 'hiking-trail-mapper.html'));
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'release.json'), 'utf8'));
if(!index.equals(alias)) throw new Error('dist HTML entrypoints do not match');
if(!/^v\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error('release.json has an invalid version');
if(manifest.product !== 'Outdoor Route Studio') throw new Error('release.json has an invalid product');
if(manifest.sourceEntry !== 'index.html') throw new Error('release.json has an invalid source entry');
if(JSON.stringify(manifest.entrypoints) !== JSON.stringify(['index.html', 'hiking-trail-mapper.html'])) {
  throw new Error('release.json has invalid entrypoints');
}
if(manifest.bytes !== index.byteLength) throw new Error('release.json byte count does not match index.html');
if(manifest.sha256 !== crypto.createHash('sha256').update(index).digest('hex')) {
  throw new Error('release.json digest does not match index.html');
}
const html = index.toString('utf8');
if(!html.includes('<script type="module" data-studio-bundle>')) throw new Error('release JavaScript is not inline');
if(!html.includes('<style data-studio-bundle>')) throw new Error('release CSS is not inline');
if(/<script type="module"[^>]+src=/.test(html) || /<link rel="stylesheet"[^>]+href=/.test(html)) {
  throw new Error('release HTML references external build assets');
}
console.log(`✓ dist verified: ${manifest.version}`);
NODE
