#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const versionSource = await readFile(path.join(root, 'src/app/version.ts'), 'utf8');
const changelogSource = await readFile(
  path.join(root, 'src/features/localization/changelog.ts'),
  'utf8',
);
const check = process.argv.includes('--check');
const version = versionSource.match(/STUDIO_VERSION = '(v\d+\.\d+\.\d+)'/)?.[1];
if(!version) throw new Error('Version module is missing STUDIO_VERSION');

const changelogBlock = changelogSource.match(
  /export const CHANGELOG = (\[[\s\S]*?\n\]) satisfies readonly ChangelogEntry\[\];/,
)?.[1];
if(!changelogBlock) throw new Error('Localization changelog module is missing CHANGELOG');
const entryPattern = /\{\s*version:\s*'([^']+)',\s*date:\s*'([^']+)',\s*items:\s*\{\s*zh:\s*\[([\s\S]*?)\],\s*en:\s*\[([\s\S]*?)\],?\s*\},?\s*\},?/g;
const stringValues = block => [...block.matchAll(/'((?:\\.|[^'\\])*)'/g)]
  .map(match => match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
const entries = [...changelogBlock.matchAll(entryPattern)].map(match => ({
  version: match[1],
  date: match[2],
  zh: stringValues(match[3]),
  en: stringValues(match[4]),
}));
const changelog = [
  '# Changelog',
  '',
  '**🌐 中英双语条目 · Chinese and English entries preserved per version**',
  '',
  'All notable changes to Hiking Trail Mapper. Both Chinese and English entries preserved from in-app CHANGELOG.',
  '',
];
entries.forEach(entry => {
  changelog.push(`## ${entry.version} — ${entry.date}`, '', '**中文**', '');
  entry.zh.forEach(item => changelog.push(`- ${item}`));
  changelog.push('', '**English**', '');
  entry.en.forEach(item => changelog.push(`- ${item}`));
  changelog.push('');
});
if(!entries.length) throw new Error('Localization changelog module has no entries');

const stale = [];
async function syncFile(filePath, next) {
  const current = await readFile(filePath, 'utf8').catch(() => '');
  if(current === next) return;
  if(check) stale.push(path.relative(root, filePath));
  else await writeFile(filePath, next);
}

await syncFile(
  path.join(root, 'CHANGELOG.md'),
  `${changelog.join('\n').trim()}\n`,
);

for(const name of ['README.md', 'README.en.md']) {
  const filePath = path.join(root, name);
  const source = await readFile(filePath, 'utf8');
  const next = source
    .replace(/!\[version\]\(https:\/\/img\.shields\.io\/badge\/version-v[0-9.]+-blue\)/g,
      `![version](https://img.shields.io/badge/version-${version}-blue)`)
    .replace(/^(\s*[-*]?\s*(?:版本|Version)\s*[:：]\s*)v[0-9]+\.[0-9]+\.[0-9]+/gm, `$1${version}`);
  await syncFile(filePath, next);
}
if(stale.length) {
  throw new Error(`Release docs are stale: ${stale.join(', ')}; run npm run sync:docs`);
}
console.log(`Release docs ${check ? 'verified' : 'synchronized'} (${entries.length} changelog entries)`);
