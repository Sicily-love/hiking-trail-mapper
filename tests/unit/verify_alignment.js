/** Release 2.0 source metadata and generated artifact alignment. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const sourceHtml = read('index.html');
const releaseHtml = read('hiking-trail-mapper.html');
const runtime = read('src/app/runtime.ts');
const localizationRuntime = read('src/features/localization/runtime.ts');
const packageJson = JSON.parse(read('package.json'));

let passed = 0;
let failed = 0;
function T(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch(error) {
    console.log(`  ✗ ${name}\n    ${error.message}`);
    failed++;
  }
}

console.log('\n▸ Vite source ↔ single-file release alignment');

T('package, runtime, and release versions match', () => {
  const expected = `v${packageJson.version}`;
  const runtimeVersion = runtime.match(/const APP_VERSION = '(v\d+\.\d+\.\d+)'/)?.[1];
  const releaseVersion = releaseHtml.match(/APP_VERSION:\s*(v\d+\.\d+\.\d+)/)?.[1];
  assert.strictEqual(runtimeVersion, expected);
  assert.strictEqual(releaseVersion, expected);
});

T('release date comes from the localization changelog owner', () => {
  const runtimeDate = localizationRuntime.match(
    /const CHANGELOG = \[\s*\{\s*version:\s*'v\d+\.\d+\.\d+',\s*date:\s*'(\d{4}-\d{2}-\d{2})'/,
  )?.[1];
  const releaseDate = releaseHtml.match(/BUILD_DATE:\s*(\d{4}-\d{2}-\d{2})/)?.[1];
  assert.ok(runtimeDate);
  assert.strictEqual(releaseDate, runtimeDate);
});

T('source shell and generated release have separate roles', () => {
  assert.notStrictEqual(sourceHtml, releaseHtml);
  assert.ok(sourceHtml.includes('<script type="module" src="/src/main.ts"></script>'));
  assert.ok(!sourceHtml.includes('data-studio-bundle'));
  assert.ok(!releaseHtml.includes('src="/src/main.ts"'));
  assert.ok(releaseHtml.includes('<script type="module" data-studio-bundle>'));
  assert.ok(releaseHtml.includes('<style data-studio-bundle>'));
});

T('generated release no longer carries split IIFE markers', () => {
  [
    'data-generated-core-runtime',
    'data-generated-app-runtime',
    'CORE_RUNTIME_START',
    'APP_MODULE_RUNTIME_START',
  ].forEach(marker => assert.ok(!releaseHtml.includes(marker), marker));
});

T('generated release has no local JavaScript or CSS dependencies', () => {
  assert.ok(!/<script type="module"[^>]+src=/.test(releaseHtml));
  assert.ok(!/<link rel="stylesheet"[^>]+href=/.test(releaseHtml));
  assert.strictEqual((releaseHtml.match(/id="app"/g) || []).length, 1);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} release-alignment checks`);
process.exit(failed === 0 ? 0 : 1);
