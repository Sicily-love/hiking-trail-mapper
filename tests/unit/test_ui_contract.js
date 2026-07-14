/** Field Console UI source contracts. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const css = fs.readFileSync(path.join(root, 'src/ui/workbench.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src/ui/workbench.ts'), 'utf8');
const { runtimeSource: runtime } = require('./runtime_source');
const visual = fs.readFileSync(path.join(root, 'tests/visual/capture_field_console.py'), 'utf8');
const html = fs.readFileSync(path.join(root, 'hiking-trail-mapper.html'), 'utf8');
let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
};

console.log('\n▸ Field Console UI contracts');
T('field-console palette includes neutral, forest, amber, rust, and blue roles', () => {
  ['--console-surface:', '--console-green:', '--console-amber:', '--console-rust:', '--console-blue:']
    .forEach(token => assert.ok(css.includes(token), token));
});
T('desktop toolbar is one grouped command surface with stable controls', () => {
  assert.ok(css.includes('.toolbar-brand {'));
  assert.ok(css.includes('.toolbar-secondary { padding-left:5px;'));
  assert.ok(css.includes('width:54px;'));
  assert.ok(css.includes('left:52px;'));
  assert.strictEqual((html.match(/class="tb-btn"/g) || []).length, 10);
});
T('toolbar brand text is clipped within its own column', () => {
  assert.ok(css.includes('.toolbar-brand > span:last-child'));
  assert.ok(css.includes('text-overflow:ellipsis;'));
  assert.ok(css.includes('overflow:hidden;'));
});
T('command decoration and mobile overflow are owned by TypeScript UI module', () => {
  assert.ok(ui.includes("more.id = 'toolbar-more'"));
  assert.ok(ui.includes("toolbar.classList.toggle('secondary-open')"));
  assert.ok(ui.includes("document.documentElement.dataset.ui = 'field-console'"));
});
T('elevation analysis dock can collapse and persists its state', () => {
  assert.ok(ui.includes("ELEVATION_COLLAPSED_KEY"));
  assert.ok(ui.includes("dock.classList.toggle('collapsed')"));
  assert.ok(css.includes('#elev-bar.collapsed'));
});
T('sidebar becomes a mobile bottom sheet', () => {
  assert.ok(css.includes("@media (max-width:760px)"));
  assert.ok(css.includes('height:min(72vh, 620px);'));
  assert.ok(css.includes('transform:translateY(calc(100% + 96px));'));
});
T('reset closes mobile sidebar before fitting trail bounds', () => {
  assert.ok(runtime.includes("function fitWorkspaceBounds"));
  assert.ok(runtime.includes("HTM_APP.shouldCloseSidebarForFit"));
  assert.ok(runtime.includes("toggleSidebar(false)"));
  assert.ok(runtime.includes("map.invalidateSize({pan:false})"));
  assert.ok(visual.includes('mobileResetClosesSidebar'));
});
T('Day itinerary uses a timeline instead of nested cards', () => {
  assert.ok(css.includes('.day-block::before'));
  assert.ok(css.includes('border-left:1px solid var(--console-line);'));
  assert.ok(css.includes('.day-hdr {'));
});
T('keyboard focus and reduced-motion states are explicit', () => {
  assert.ok(css.includes(':focus-visible'));
  assert.ok(css.includes('@media (prefers-reduced-motion:reduce)'));
});
T('empty primary mini card still cannot cover commands', () => {
  assert.ok(runtime.includes("mini.style.display = hasPrimary ? 'block' : 'none'"));
  assert.ok(runtime.includes("mini.style.display = 'none';\n      return false;"));
});
T('visual fixtures cover real Day, measurement, and segmentation states', () => {
  assert.ok(visual.includes('field-console-day-cards.png'));
  assert.ok(visual.includes('field-console-measure.png'));
  assert.ok(visual.includes('field-console-segment.png'));
  assert.ok(visual.includes('toolbarZoomOverlap'));
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
