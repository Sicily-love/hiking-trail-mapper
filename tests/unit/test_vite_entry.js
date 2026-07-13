/** Unit test · Vite source and single-file release entry contracts. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch(error) {
    console.log(`  ✗ ${name}\n    ${error.message}`);
    failed++;
  }
};

console.log('\n▸ Vite source and release entries');

T('index.html is a minimal shell with one TypeScript entry', () => {
  const html = read('index.html');
  const moduleSources = [...html.matchAll(/<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)]
    .map(match => match[1]);
  assert.deepStrictEqual(moduleSources, ['/src/main.ts']);
  assert.strictEqual((html.match(/id="app"/g) || []).length, 1);
  assert.ok(!html.includes('hiking-trail-mapper.html'));
  assert.ok(!html.includes('data-studio-bundle'));
});

T('main.ts owns the one bootstrap path and ordered stylesheet imports', () => {
  const main = read('src/main.ts');
  assert.ok(main.includes("import './styles/leaflet.css'"));
  assert.ok(main.includes("import './ui/workbench.css'"));
  assert.ok(main.includes("import './styles/studio.css'"));
  assert.ok(main.indexOf("import './ui/workbench.css'") < main.indexOf("import './styles/studio.css'"));
  assert.ok(main.includes("import { bootstrapOutdoorRouteStudio } from './app/bootstrap.ts'"));
  assert.strictEqual((main.match(/bootstrapOutdoorRouteStudio\(/g) || []).length, 1);
});

T('bootstrap mounts the shell and activates source modules once', () => {
  const bootstrap = read('src/app/bootstrap.ts');
  assert.ok(bootstrap.includes("import * as core from '../core/index.ts'"));
  assert.ok(bootstrap.includes("import * as app from './index.ts'"));
  assert.ok(bootstrap.includes("import runtimeTemplate from './runtime.ts?raw'"));
  assert.ok(bootstrap.includes("import { composeClassicRuntime } from './runtime/compose.ts'"));
  assert.ok(bootstrap.includes("import fileRuntimeSource from '../features/files/runtime.ts?raw'"));
  assert.ok(bootstrap.includes("import appClassicRuntimeSource from './runtime/classic.ts?raw'"));
  assert.ok(bootstrap.includes("import measureRuntimeSource from '../features/measure/runtime.ts?raw'"));
  assert.ok(bootstrap.includes('const runtimeSource = composeClassicRuntime(runtimeTemplate'));
  assert.ok(bootstrap.includes('mountAppShell(root)'));
  assert.ok(bootstrap.includes('window.HikingTrailCore = core'));
  assert.ok(bootstrap.includes('window.HikingTrailApp = app'));
  assert.ok(bootstrap.includes('window.__HTM_COMMAND_REGISTRY__ = commands'));
  assert.ok(bootstrap.includes('window.__HTM_DIALOG_CONTROLLER__ = dialogs'));
  assert.ok(bootstrap.includes("executeClassicScript(document, runtimeSource, 'runtime.js')"));
  assert.ok(bootstrap.includes('resolveWorkbenchStorage(document),\n    commands,'));
  assert.ok(
    bootstrap.indexOf("executeClassicScript(document, runtimeSource, 'runtime.js')")
      < bootstrap.indexOf('resolveWorkbenchStorage(document),\n    commands,'),
  );
});

T('Vite has one production HTML input with relative assets', () => {
  const config = read('vite.config.mts');
  assert.ok(config.includes("base: './'"));
  assert.ok(config.includes("input: 'index.html'"));
  assert.ok(!config.includes("dev: 'dev.html'"));
  assert.ok(config.includes("outDir: 'dist'"));
});

T('package dev command opens the sole Vite HTML', () => {
  const scripts = JSON.parse(read('package.json')).scripts;
  assert.ok(scripts.dev.includes('--open /'));
  assert.ok(!scripts.dev.includes('dev.html'));
});

T('release builder consumes Vite output and runtime.ts', () => {
  const script = read('scripts/build/build_release.mjs');
  assert.ok(script.includes("path.join(root, 'src/app/runtime.ts')"));
  assert.ok(script.includes('inlineViteAssets'));
  assert.ok(script.includes('data-studio-bundle'));
  assert.ok(script.includes("sourceEntry: 'index.html'"));
  assert.ok(script.includes("release.json"));
});

T('tracked release is one self-contained HTML payload', () => {
  const source = read('index.html');
  const release = read('hiking-trail-mapper.html');
  assert.notStrictEqual(release, source);
  assert.strictEqual((release.match(/<script type="module" data-studio-bundle>/g) || []).length, 1);
  assert.strictEqual((release.match(/<style data-studio-bundle>/g) || []).length, 1);
  assert.ok(!/<script type="module"[^>]+src=/.test(release));
  assert.ok(!/<link rel="stylesheet"[^>]+href=/.test(release));
  assert.ok(release.includes('Outdoor Route Studio · APP_VERSION:'));
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
