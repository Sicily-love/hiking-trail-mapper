#!/usr/bin/env node
import { copyFile, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { generateReleaseHtml } from './generate_release_html.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const outDirIndex = args.indexOf('--outDir');
const outDirArg = outDirIndex >= 0 ? args[outDirIndex + 1] : 'dist';
if(!outDirArg || outDirArg.startsWith('--')) {
  throw new Error('Missing value after --outDir');
}
const outDir = path.resolve(root, outDirArg);

await generateReleaseHtml({ root });

await build({
  root,
  configFile: path.join(root, 'vite.config.mts'),
  build: {
    outDir,
    emptyOutDir: true,
  },
});

await rm(path.join(outDir, '.gitkeep'), { force: true });

const indexPath = path.join(outDir, 'index.html');
const aliasPath = path.join(outDir, 'hiking-trail-mapper.html');
const html = await readFile(indexPath, 'utf8');
const version = html.match(/const APP_VERSION = '(v\d+\.\d+\.\d+)'/)?.[1];
const buildDate = html.match(/BUILD_DATE:\s*(\d{4}-\d{2}-\d{2})/)?.[1];
if(!version || !buildDate) {
  throw new Error('Built HTML is missing APP_VERSION or BUILD_DATE');
}

await copyFile(indexPath, aliasPath);
await writeFile(path.join(outDir, 'release.json'), `${JSON.stringify({
  version,
  buildDate,
  entrypoints: ['index.html', 'hiking-trail-mapper.html'],
}, null, 2)}\n`);

const outputSize = (await stat(indexPath)).size;
console.log(`Release build ready: ${path.relative(root, outDir)} (${version}, ${outputSize} bytes)`);
