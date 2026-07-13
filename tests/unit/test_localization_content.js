/** Unit tests for localization data and unified transition-modal models. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const app = require(path.join(root, 'src/app/index.ts'));
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const localizationRuntime = read('src/features/localization/runtime.ts');
const orchestrationRuntime = read('src/ui/orchestration/runtime.ts');
const storageRuntime = read('src/features/storage/runtime.ts');

let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try {
    fn();
    console.log(`  PASS ${name}`);
    passed += 1;
  } catch(error) {
    console.log(`  FAIL ${name}\n    ${error.stack || error.message}`);
    failed += 1;
  }
};

console.log('\n> Localization and content-dialog models');

T('translation catalogs stay aligned and provide deterministic fallback', () => {
  const zhKeys = Object.keys(app.TRANSLATIONS.zh).sort();
  const enKeys = Object.keys(app.TRANSLATIONS.en).sort();
  assert.deepStrictEqual(enKeys, zhKeys);
  assert.ok(zhKeys.length >= 100);
  assert.strictEqual(app.resolveLocalizationLanguage('en'), 'en');
  assert.strictEqual(app.resolveLocalizationLanguage('fr'), 'zh');
  assert.strictEqual(app.translateMessage('en', 'help.title'), app.TRANSLATIONS.en['help.title']);
  assert.strictEqual(app.translateMessage('en', 'missing.key'), 'missing.key');
});

T('changelog model preserves release order and selected language', () => {
  assert.ok(app.CHANGELOG.length >= 60);
  assert.strictEqual(app.CHANGELOG[0].version, `v${require('../../package.json').version}`);
  const model = app.buildChangelogDialogModel('en', 'Changelog', 'Close');
  assert.strictEqual(model.size, 'wide');
  assert.strictEqual(model.sections.length, app.CHANGELOG.length);
  assert.strictEqual(model.sections[0].heading, app.CHANGELOG[0].version);
  assert.deepStrictEqual(model.sections[0].items, app.CHANGELOG[0].items.en);
});

T('help content is structured, bilingual, and versioned without HTML payloads', () => {
  const zh = app.buildHelpDialogModel('zh', 'v9.8.7', '帮助', '关闭');
  const en = app.buildHelpDialogModel('en', 'v9.8.7', 'Help', 'Close');
  assert.strictEqual(zh.size, 'wide');
  assert.strictEqual(zh.sections.length, en.sections.length);
  assert.ok(zh.sections.some(section => section.ordered));
  assert.ok(zh.sections.at(-1).paragraphs[0].includes('v9.8.7'));
  assert.ok(en.sections.at(-1).paragraphs[0].includes('v9.8.7'));
  assert.strictEqual(/[<>]/.test(JSON.stringify({ zh, en })), false);
});

T('storage content represents quota, persistence, errors, and actions', () => {
  const pending = app.buildStorageDialogModel('zh', {
    trailCount: 12,
    estimateSupported: true,
    persistSupported: true,
    usedBytes: 5 * 1024 * 1024,
    quotaBytes: 20 * 1024 * 1024,
    persisted: false,
  });
  assert.strictEqual(pending.sections[0].progress.value, 25);
  assert.strictEqual(pending.sections[0].rows[2].value, '12');
  assert.deepStrictEqual(pending.actions.map(action => action.id), ['persist']);
  const persisted = app.buildStorageDialogModel('en', {
    trailCount: 1, estimateSupported: false, persistSupported: true, persisted: true,
  });
  assert.deepStrictEqual(persisted.actions, []);
  assert.ok(persisted.sections.some(section => section.tone === 'success'));
  const failed = app.buildStorageDialogModel('en', {
    trailCount: 0, estimateSupported: true, persistSupported: true, persisted: false, error: 'quota failed',
  });
  assert.strictEqual(failed.sections[0].tone, 'danger');
  assert.deepStrictEqual(failed.actions, []);
  const unsupported = app.buildStorageDialogModel('en', {
    trailCount: 0, estimateSupported: false, persistSupported: false, persisted: false,
  });
  assert.deepStrictEqual(unsupported.actions, []);
});

T('classic transition modals delegate to one dialog controller without HTML assembly', () => {
  assert.ok(localizationRuntime.includes('buildChangelogDialogModel'));
  assert.ok(orchestrationRuntime.includes('buildHelpDialogModel'));
  assert.ok(storageRuntime.includes('buildStorageDialogModel'));
  const transitionSources = [
    localizationRuntime.slice(localizationRuntime.indexOf('function showChangelog')),
    orchestrationRuntime.slice(
      orchestrationRuntime.indexOf('function showHelp'),
      orchestrationRuntime.indexOf('/* @runtime-fragment ui.lightbox'),
    ),
    storageRuntime.slice(
      storageRuntime.indexOf('async function showStorageInfo'),
      storageRuntime.indexOf('/* @runtime-fragment storage.persistence'),
    ),
  ];
  for(const source of transitionSources) {
    assert.strictEqual(source.includes("createElement('div')"), false);
    assert.strictEqual(source.includes('modal-mask'), false);
    assert.strictEqual(source.includes('innerHTML'), false);
  }
});

console.log(`\nResult: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
