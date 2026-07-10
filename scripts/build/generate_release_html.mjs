#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const modulePath = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(modulePath), '../..');

async function createIifeBundle(root, entry, name, fileName) {
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: 'esbuild',
      lib: {
        entry: path.join(root, entry),
        name,
        formats: ['iife'],
        fileName: () => fileName,
      },
    },
  });
  const outputs = Array.isArray(result) ? result.flatMap(item => item.output) : result.output;
  const chunk = outputs.find(item => item.type === 'chunk');
  if(!chunk?.code) throw new Error(`Vite did not produce ${name}`);
  return chunk.code.trim();
}

function digest(code) {
  return createHash('sha256').update(code).digest('hex').slice(0, 16);
}

function replaceBlock(html, start, end, block) {
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
  if(!pattern.test(html)) throw new Error(`Template is missing ${start}`);
  return html.replace(pattern, `${start}\n${block}\n${end}`);
}

export async function renderReleaseHtml({ root = defaultRoot } = {}) {
  const [template, css, browserRuntime, coreBundle, appBundle] = await Promise.all([
    readFile(path.join(root, 'src/template/app.html'), 'utf8'),
    readFile(path.join(root, 'src/ui/workbench.css'), 'utf8'),
    readFile(path.join(root, 'src/app/runtime.js'), 'utf8'),
    createIifeBundle(root, 'src/core/index.ts', 'HikingTrailCore', 'hiking-trail-core.js'),
    createIifeBundle(root, 'src/app/index.ts', 'HikingTrailApp', 'hiking-trail-app.js'),
  ]);

  let html = template.replace('/* APP_STYLE_CONTENT */', css.trim());
  if(html === template) throw new Error('Template is missing APP_STYLE_CONTENT');
  html = replaceBlock(
    html,
    '<!-- CORE_RUNTIME_START -->',
    '<!-- CORE_RUNTIME_END -->',
    `<script data-generated-core-runtime data-core-sha="${digest(coreBundle)}">\n${coreBundle}\n</script>`,
  );
  html = replaceBlock(
    html,
    '<!-- APP_MODULE_RUNTIME_START -->',
    '<!-- APP_MODULE_RUNTIME_END -->',
    `<script data-generated-app-runtime data-app-sha="${digest(appBundle)}">\n${appBundle}\n</script>`,
  );
  const runtimeScript = `<script>\n${browserRuntime.trim().replace(/<\/script/gi, '<\\/script')}\n</script>`;
  html = replaceBlock(html, '<!-- APP_RUNTIME_START -->', '<!-- APP_RUNTIME_END -->', runtimeScript);
  return { html: `${html.trim()}\n`, coreDigest: digest(coreBundle), appDigest: digest(appBundle) };
}

export async function generateReleaseHtml({ root = defaultRoot, check = false } = {}) {
  const rendered = await renderReleaseHtml({ root });
  let changed = false;
  for(const name of ['hiking-trail-mapper.html', 'index.html']) {
    const filePath = path.join(root, name);
    const current = await readFile(filePath, 'utf8').catch(() => '');
    if(current === rendered.html) continue;
    changed = true;
    if(!check) await writeFile(filePath, rendered.html);
  }
  if(check && changed) throw new Error('Generated release HTML is stale; run npm run sync:release');
  if(!check) console.log(`Release HTML generated (core ${rendered.coreDigest}, app ${rendered.appDigest})`);
  return { ...rendered, changed };
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === modulePath;
if(direct) await generateReleaseHtml({ check: process.argv.includes('--check') });
