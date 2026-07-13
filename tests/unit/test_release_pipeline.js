/** Unit test · Outdoor Route Studio Release 2.0 pipeline contracts. */
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const packageJson = JSON.parse(read('package.json'));
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

console.log('\n▸ Release 2.0 pipeline');

T('package scripts expose one build path and retire legacy generators', () => {
  const scripts = packageJson.scripts;
  assert.strictEqual(scripts.build, 'node scripts/build/build_release.mjs');
  assert.strictEqual(
    scripts['check:generated'],
    'node scripts/build/build_release.mjs --check --outDir .vite-build',
  );
  assert.strictEqual(scripts['release:prepare'], './scripts/release/prepare_release.sh');
  assert.strictEqual(scripts['version:bump'], 'node scripts/release/bump_version.mjs');
  ['sync:core', 'check:core-runtime', 'generate:html', 'prune:fallbacks']
    .forEach(name => assert.strictEqual(scripts[name], undefined, name));
});

T('retired template, IIFE sync, and fallback scripts are absent', () => {
  [
    'scripts/build/generate_release_html.mjs',
    'scripts/build/sync_core_bundle.mjs',
    'scripts/maintenance/prune_runtime_fallbacks.mjs',
    'src/template/app.html',
  ].forEach(name => assert.ok(!fs.existsSync(path.join(root, name)), name));
});

T('release sync and version bump use Vite plus the runtime owners', () => {
  const sync = read('scripts/release/sync_release.sh');
  const bump = read('scripts/release/bump_version.mjs');
  assert.ok(sync.includes('npm run build'));
  assert.ok(!sync.includes('generate_release_html'));
  assert.ok(!sync.includes('runtime.js'));
  assert.ok(bump.includes("src/app/runtime.ts"));
  assert.ok(bump.includes("src/features/localization/runtime.ts"));
  assert.ok(!bump.includes("src/template/app.html"));
  assert.ok(!bump.includes("src/app/runtime.js"));
});

T('maintenance tools cover the runtime template and vertical owners', () => {
  const cleanup = read('scripts/maintenance/clean_version_comments.py');
  assert.ok(cleanup.includes('"app" / "runtime.ts"'));
  assert.ok(cleanup.includes('"runtime" / "classic.ts"'));
  assert.ok(cleanup.includes('glob("*/runtime.ts")'));
  assert.ok(cleanup.includes('"orchestration" / "runtime.ts"'));
  assert.ok(!cleanup.includes('src/app/runtime.js'));
  assert.ok(!cleanup.includes('"runtime.js"'));
});

T('read-only check builds .vite-build without changing tracked HTML', () => {
  const sourceBefore = read('index.html');
  const releaseBefore = read('hiking-trail-mapper.html');
  const result = spawnSync(process.execPath, [
    'scripts/build/build_release.mjs',
    '--check',
    '--outDir',
    '.vite-build',
  ], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.strictEqual(read('index.html'), sourceBefore);
  assert.strictEqual(read('hiking-trail-mapper.html'), releaseBefore);
});

T('temporary release contains one self-contained HTML payload', () => {
  const index = fs.readFileSync(path.join(root, '.vite-build/index.html'));
  const alias = fs.readFileSync(path.join(root, '.vite-build/hiking-trail-mapper.html'));
  const html = index.toString('utf8');
  assert.ok(index.equals(alias));
  assert.strictEqual((html.match(/<script type="module" data-studio-bundle>/g) || []).length, 1);
  assert.strictEqual((html.match(/<style data-studio-bundle>/g) || []).length, 1);
  assert.ok(!/<script type="module"[^>]+src=/.test(html));
  assert.ok(!/<link rel="stylesheet"[^>]+href=/.test(html));
  assert.ok(!fs.existsSync(path.join(root, '.vite-build/assets')));
});

T('release.json can verify its own HTML payload', () => {
  const index = fs.readFileSync(path.join(root, '.vite-build/index.html'));
  const manifest = JSON.parse(read('.vite-build/release.json'));
  assert.strictEqual(manifest.product, 'Outdoor Route Studio');
  assert.strictEqual(manifest.version, `v${packageJson.version}`);
  assert.match(manifest.buildDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.strictEqual(manifest.sourceEntry, 'index.html');
  assert.deepStrictEqual(manifest.entrypoints, ['index.html', 'hiking-trail-mapper.html']);
  assert.strictEqual(manifest.bytes, index.byteLength);
  assert.strictEqual(manifest.sha256, crypto.createHash('sha256').update(index).digest('hex'));
});

T('full check builds before exporting the release path to browser suites', () => {
  const script = read('tests/run_full_check.sh');
  const buildPosition = script.indexOf('npm run check:generated');
  const exportPosition = script.indexOf('export HTM_RELEASE_HTML=');
  const browserPosition = script.indexOf('run_python_with_websocket "$LATEST_FUNC"');
  const e2ePosition = script.indexOf('run_python_with_websocket tests/e2e/run_all.py');
  [buildPosition, exportPosition, browserPosition, e2ePosition]
    .forEach(position => assert.ok(position >= 0));
  assert.ok(buildPosition < exportPosition);
  assert.ok(exportPosition < browserPosition);
  assert.ok(exportPosition < e2ePosition);
  assert.ok(script.includes('command -v uv'));
  assert.ok(script.includes('python3 -m pip install --quiet websocket-client'));
  assert.ok(!script.includes('scripts/release/sync_release.sh'));
});

T('release preparation syncs, verifies, builds, and validates dist', () => {
  const script = read('scripts/release/prepare_release.sh');
  const positions = [
    script.indexOf('./scripts/release/sync_release.sh'),
    script.indexOf('./tests/run_full_check.sh'),
    script.indexOf('npm run build'),
    script.indexOf('dist verified'),
  ];
  positions.forEach(position => assert.ok(position >= 0));
  assert.deepStrictEqual(positions.slice().sort((a, b) => a - b), positions);
  assert.ok(script.includes("createHash('sha256')"));
  assert.ok(script.includes('manifest.bytes !== index.byteLength'));
});

T('version bump supports semantic levels, bilingual changelog, and dry run', () => {
  const script = read('scripts/release/bump_version.mjs');
  assert.ok(script.includes("requested === 'patch'"));
  assert.ok(script.includes("requested === 'minor'"));
  assert.ok(script.includes("requested === 'major'"));
  assert.ok(script.includes("valuesFor('--zh')"));
  assert.ok(script.includes("valuesFor('--en')"));
  const result = spawnSync(process.execPath, [
    'scripts/release/bump_version.mjs',
    'patch',
    '--dry-run',
  ], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /\d+\.\d+\.\d+ -> \d+\.\d+\.\d+/);
});

T('GitHub workflow verifies PRs and deploys dist from main', () => {
  const workflow = read('.github/workflows/pages.yml');
  assert.ok(workflow.includes('pull_request:'));
  assert.ok(workflow.includes('actions/checkout@v6'));
  assert.ok(workflow.includes('actions/setup-node@v6'));
  assert.ok(workflow.includes('actions/configure-pages@v5'));
  assert.ok(workflow.includes('actions/upload-pages-artifact@v4'));
  assert.ok(workflow.includes('actions/deploy-pages@v4'));
  assert.ok(workflow.includes('path: dist'));
  assert.ok(workflow.includes('pages: write'));
  assert.ok(workflow.includes('id-token: write'));
});

T('generated directories stay ignored while the tracked release remains visible', () => {
  const gitignore = read('.gitignore');
  assert.ok(gitignore.includes('dist/'));
  assert.ok(gitignore.includes('.vite-build/'));
  assert.ok(!gitignore.includes('hiking-trail-mapper.html'));
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
