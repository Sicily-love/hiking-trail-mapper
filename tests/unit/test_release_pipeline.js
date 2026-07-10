/**
 * Unit test · Milestone 5 release pipeline contracts
 * Run: node tests/unit/test_release_pipeline.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
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

console.log('\n▸ Milestone 5 release pipeline');

T('package scripts expose build, release preparation, and version bump', () => {
  const scripts = JSON.parse(read('package.json')).scripts;
  assert.strictEqual(scripts.build, 'node scripts/build/build_release.mjs');
  assert.strictEqual(scripts['release:prepare'], './scripts/release/prepare_release.sh');
  assert.strictEqual(scripts['version:bump'], 'node scripts/release/bump_version.mjs');
});

T('release preparation orders sync, full verification, build, and dist validation', () => {
  const script = read('scripts/release/prepare_release.sh');
  const positions = [
    script.indexOf('./scripts/release/sync_release.sh'),
    script.indexOf('./tests/run_full_check.sh'),
    script.indexOf('npm run build'),
    script.indexOf('dist verified'),
  ];
  positions.forEach(position => assert.ok(position >= 0));
  assert.deepStrictEqual(positions.slice().sort((a, b) => a - b), positions);
});

T('embedded core runtime can be reproduced from TypeScript source', () => {
  const result = spawnSync(process.execPath, ['scripts/build/sync_core_bundle.mjs', '--check'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
});

T('root HTML is generated from canonical split sources', () => {
  const generator = read('scripts/build/generate_release_html.mjs');
  assert.ok(generator.includes("src/template/app.html"));
  assert.ok(generator.includes("src/ui/workbench.css"));
  assert.ok(generator.includes("src/app/runtime.js"));
  assert.ok(generator.includes("src/app/index.ts"));
  const result = spawnSync(process.execPath, ['scripts/build/generate_release_html.mjs', '--check'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
});

T('full checks run with uv when available and plain Python otherwise', () => {
  const script = read('tests/run_full_check.sh');
  assert.ok(script.includes('run_python_with_websocket'));
  assert.ok(script.includes('command -v uv'));
  assert.ok(script.includes('python3 -m pip install --quiet websocket-client'));
});

T('version bump supports semantic levels, bilingual changelog, and dry run', () => {
  const script = read('scripts/release/bump_version.mjs');
  assert.ok(script.includes("requested === 'patch'"));
  assert.ok(script.includes("requested === 'minor'"));
  assert.ok(script.includes("requested === 'major'"));
  assert.ok(script.includes("valuesFor('--zh')"));
  assert.ok(script.includes("valuesFor('--en')"));
  const result = spawnSync(process.execPath, ['scripts/release/bump_version.mjs', 'patch', '--dry-run'], {
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

T('generated output remains ignored while source release files stay tracked', () => {
  const gitignore = read('.gitignore');
  assert.ok(gitignore.includes('dist/'));
  assert.ok(gitignore.includes('.vite-build/'));
  assert.ok(!gitignore.includes('hiking-trail-mapper.html'));
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
