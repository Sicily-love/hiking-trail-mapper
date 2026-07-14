#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const outDirIndex = args.indexOf('--outDir');
const outDirArg = outDirIndex >= 0 ? args[outDirIndex + 1] : 'dist';
const check = args.includes('--check');
if(!outDirArg || outDirArg.startsWith('--')) throw new Error('Missing value after --outDir');
const outDir = path.resolve(root, outDirArg);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function inlineViteAssets(html) {
  const stylesheetPattern = /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g;
  for(const match of [...html.matchAll(stylesheetPattern)]) {
    const assetPath = path.resolve(outDir, match[1].replace(/^\.\//, ''));
    const css = await readFile(assetPath, 'utf8');
    html = html.replace(match[0], () => `<style data-studio-bundle>\n${css}\n</style>`);
  }

  const modulePattern = /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g;
  for(const match of [...html.matchAll(modulePattern)]) {
    const assetPath = path.resolve(outDir, match[1].replace(/^\.\//, ''));
    const js = (await readFile(assetPath, 'utf8')).replace(/<\/script/gi, '<\\/script');
    html = html.replace(match[0], () => `<script type="module" data-studio-bundle>\n${js}\n</script>`);
  }
  return html;
}

const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const versionSource = await readFile(path.join(root, 'src/app/version.ts'), 'utf8');
const changelogSource = await readFile(path.join(root, 'src/features/localization/changelog.ts'), 'utf8');
const version = `v${packageJson.version}`;
const sourceVersion = versionSource.match(/STUDIO_VERSION = '(v\d+\.\d+\.\d+)'/)?.[1];
const buildDate = changelogSource.match(/version:\s*'v\d+\.\d+\.\d+',\s*\n\s*date:\s*'(\d{4}-\d{2}-\d{2})'/)?.[1];
if(sourceVersion !== version || !buildDate) throw new Error('Source release metadata does not match package.json');

await build({
  root,
  configFile: path.join(root, 'vite.config.mts'),
  build: { outDir, emptyOutDir: true },
});

const indexPath = path.join(outDir, 'index.html');
let html = await readFile(indexPath, 'utf8');
html = await inlineViteAssets(html);
html = html.replace('<!doctype html>', `<!doctype html>\n<!-- Outdoor Route Studio · APP_VERSION: ${version} · BUILD_DATE: ${buildDate} -->`);
if(/<script type="module"[^>]+src=/.test(html) || /<link rel="stylesheet"[^>]+href=/.test(html)) {
  throw new Error('Release HTML still references external JavaScript or CSS assets');
}

await writeFile(indexPath, html);
await rm(path.join(outDir, 'assets'), { recursive: true, force: true });
const aliasPath = path.join(outDir, 'hiking-trail-mapper.html');
await copyFile(indexPath, aliasPath);

const bytes = (await stat(indexPath)).size;
const digest = sha256(html);
await writeFile(path.join(outDir, 'release.json'), `${JSON.stringify({
  product: 'Outdoor Route Studio',
  version,
  buildDate,
  sha256: digest,
  bytes,
  sourceEntry: 'index.html',
  entrypoints: ['index.html', 'hiking-trail-mapper.html'],
}, null, 2)}\n`);

const rootRelease = path.join(root, 'hiking-trail-mapper.html');
if(check) {
  const current = await readFile(rootRelease, 'utf8').catch(() => '');
  if(current !== html) throw new Error('Root release artifact is stale; run npm run sync:release');
} else {
  await mkdir(path.dirname(rootRelease), { recursive: true });
  await writeFile(rootRelease, html);
}

console.log(`Single-file release ready: ${path.relative(root, indexPath)} (${version}, ${bytes} bytes, ${digest.slice(0, 16)})`);
