/**
 * Unit test · Vite development entry contract
 * Run: node tests/unit/test_vite_entry.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch(e) {
    console.log(`  ✗ ${name}\n    ${e.message}`);
    failed++;
  }
};

const root = path.resolve(__dirname, '../..');

console.log('\n▸ Vite development and release entries');

T('dev.html wraps the current release HTML and loads src/main.ts', () => {
  const html = fs.readFileSync(path.join(root, 'dev.html'), 'utf8');
  assert.ok(html.includes('src="/hiking-trail-mapper.html"'));
  assert.ok(html.includes('src="/src/main.ts"'));
});

T('src/main.ts exposes core and app runtimes for development inspection', () => {
  const main = fs.readFileSync(path.join(root, 'src/main.ts'), 'utf8');
  assert.ok(main.includes('window.HikingTrailCore = core'));
  assert.ok(main.includes("import * as core from './core/index.ts'"));
  assert.ok(main.includes('window.HikingTrailApp = app'));
  assert.ok(main.includes("import * as app from './app/index.ts'"));
});

T('vite.config.mts builds the production HTML with relative assets', () => {
  const config = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
  assert.ok(config.includes("base: './'"));
  assert.ok(config.includes("input: 'index.html'"));
  assert.ok(!config.includes("dev: 'dev.html'"));
  assert.ok(config.includes("outDir: 'dist'"));
});

T('release build creates both static entrypoints and a manifest', () => {
  const script = fs.readFileSync(path.join(root, 'scripts/build/build_release.mjs'), 'utf8');
  assert.ok(script.includes("hiking-trail-mapper.html"));
  assert.ok(script.includes("release.json"));
  assert.ok(script.includes("entrypoints: ['index.html', 'hiking-trail-mapper.html']"));
});

T('release HTML embeds and activates the generated TypeScript core runtime', () => {
  const html = fs.readFileSync(path.join(root, 'hiking-trail-mapper.html'), 'utf8');
  assert.ok(html.includes('data-generated-core-runtime'));
  assert.ok(html.includes('var HikingTrailCore='));
  assert.ok(html.includes('const HTM_CORE = window.HikingTrailCore'));
  assert.ok(html.includes('haversine = HTM_CORE.haversine'));
  assert.ok(html.includes('buildDayPreviewRenderModel = HTM_CORE.buildDayPreviewRenderModel'));
  assert.ok(html.includes('data-generated-app-runtime'));
  assert.ok(html.includes('window.__HTM_APP_RUNTIME__ = HTM_APP'));
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
