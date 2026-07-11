#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const bump = argv.find(arg => !arg.startsWith('--')) || 'patch';

function valuesFor(flag) {
  const values = [];
  argv.forEach((arg, index) => {
    if(arg === flag && argv[index + 1] && !argv[index + 1].startsWith('--')) values.push(argv[index + 1]);
  });
  return values;
}

function escapeJsString(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function nextVersion(current, requested) {
  if(/^\d+\.\d+\.\d+$/.test(requested)) return requested;
  const [major, minor, patch] = current.split('.').map(Number);
  if(requested === 'major') return `${major + 1}.0.0`;
  if(requested === 'minor') return `${major}.${minor + 1}.0`;
  if(requested === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error('Version must be patch, minor, major, or X.Y.Z');
}

function shanghaiDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const runtimePath = path.join(root, 'src/app/runtime.ts');
let runtime = await readFile(runtimePath, 'utf8');
const current = runtime.match(/const APP_VERSION = 'v(\d+\.\d+\.\d+)'/)?.[1];
if(!current) throw new Error('Cannot find current APP_VERSION');
const next = nextVersion(current, bump);
const nextTag = `v${next}`;
const date = shanghaiDate();
const zhItems = valuesFor('--zh');
const enItems = valuesFor('--en');

if(dryRun) {
  console.log(`${current} -> ${next} (${date})`);
  process.exit(0);
}
if(!zhItems.length || !enItems.length) {
  throw new Error('Provide at least one --zh and one --en changelog item');
}

const changelogEntry = `  {\n    version: '${nextTag}',\n    date: '${date}',\n    items: {\n      zh: [${zhItems.map(item => `'${escapeJsString(item)}'`).join(', ')}],\n      en: [${enItems.map(item => `'${escapeJsString(item)}'`).join(', ')}],\n    },\n  },\n`;

runtime = runtime
  .replace(/const APP_VERSION = 'v\d+\.\d+\.\d+';/, `const APP_VERSION = '${nextTag}';`)
  .replace('const CHANGELOG = [\n', `const CHANGELOG = [\n${changelogEntry}`)
  .replace(/(<a href="javascript:void\(0\)" id="version-tag-link"[^>]*>)v\d+\.\d+\.\d+(<\/a>)/, `$1${nextTag}$2`);
await writeFile(runtimePath, runtime);

for(const name of ['package.json', 'package-lock.json']) {
  const filePath = path.join(root, name);
  const data = JSON.parse(await readFile(filePath, 'utf8'));
  data.version = next;
  if(name === 'package-lock.json' && data.packages?.['']) data.packages[''].version = next;
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

const sync = spawnSync('./scripts/release/sync_release.sh', [], { cwd: root, stdio: 'inherit' });
if(sync.status !== 0) process.exit(sync.status || 1);
const metadata = spawnSync('python3', ['scripts/release/check_release_metadata.py'], { cwd: root, stdio: 'inherit' });
if(metadata.status !== 0) process.exit(metadata.status || 1);
console.log(`Version bumped: v${current} -> ${nextTag}`);
