#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = await readFile(path.join(root, 'hiking-trail-mapper.html'), 'utf8');
const version = html.match(/const APP_VERSION = '(v\d+\.\d+\.\d+)'/)?.[1];
if(!version) throw new Error('Generated HTML is missing APP_VERSION');

const changelogBlock = html.match(/const CHANGELOG = (\[[\s\S]*?\n\]);/)?.[1];
if(!changelogBlock) throw new Error('Generated HTML is missing CHANGELOG');
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
await writeFile(path.join(root, 'CHANGELOG.md'), `${changelog.join('\n').trim()}\n`);

for(const name of ['README.md', 'README.en.md']) {
  const filePath = path.join(root, name);
  const source = await readFile(filePath, 'utf8');
  const next = source
    .replace(/!\[version\]\(https:\/\/img\.shields\.io\/badge\/version-v[0-9.]+-blue\)/g,
      `![version](https://img.shields.io/badge/version-${version}-blue)`)
    .replace(/^(\s*[-*]?\s*(?:版本|Version)\s*[:：]\s*)v[0-9]+\.[0-9]+\.[0-9]+/gm, `$1${version}`);
  if(next !== source) await writeFile(filePath, next);
}
console.log(`Release docs synchronized (${entries.length} changelog entries)`);
