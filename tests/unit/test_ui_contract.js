/** Shared component and Workbench UI source contracts. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const css = fs.readFileSync(path.join(root, 'src/styles/components.css'), 'utf8');
const studioCss = fs.readFileSync(path.join(root, 'src/styles/studio.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src/ui/layout/workbench.ts'), 'utf8');
const primaryMini = fs.readFileSync(path.join(root, 'src/ui/primary-mini.ts'), 'utf8');
const { runtimeSource: runtime } = require('./runtime_source');
const visual = fs.readFileSync(path.join(root, 'tests/visual/capture_workbench.py'), 'utf8');
const html = fs.readFileSync(path.join(root, 'hiking-trail-mapper.html'), 'utf8');
let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
};

console.log('\n▸ Shared component UI contracts');
T('component palette includes neutral, forest, amber, rust, and blue roles', () => {
  ['--console-surface:', '--console-green:', '--console-amber:', '--console-rust:', '--console-blue:']
    .forEach(token => assert.ok(css.includes(token), token));
});
T('desktop toolbar is one grouped command surface with stable controls', () => {
  assert.ok(css.includes('.toolbar-brand {'));
  assert.ok(css.includes('width:54px;'));
  assert.ok(css.includes('left:52px;'));
  assert.strictEqual((html.match(/class="tb-btn"/g) || []).length, 13);
});
T('toolbar brand text is clipped within its own column', () => {
  assert.ok(css.includes('.toolbar-brand > span:last-child'));
  assert.ok(css.includes('text-overflow:ellipsis;'));
  assert.ok(css.includes('overflow:hidden;'));
});
T('command decoration is owned by the single Workbench UI module', () => {
  assert.ok(ui.includes('export const COMMAND_DEFINITIONS'));
  assert.ok(ui.includes('function decorateControl('));
  assert.ok(ui.includes("document.documentElement.dataset.ui = 'studio'"));
  assert.strictEqual(ui.includes('secondary-open'), false);
});
T('elevation analysis dock can collapse and persists its state', () => {
  assert.ok(ui.includes("elevationCollapsed: 'hiking_elevation_dock_collapsed'"));
  assert.ok(ui.includes("panel.classList.toggle('collapsed')"));
  assert.ok(ui.includes("button.id = 'elev-toggle'"));
  assert.ok(css.includes('#elev-bar.collapsed'));
});
T('waypoint select, escape filters, and segment dirty state have dedicated controls', () => {
  assert.ok(css.includes('.escape-filter-bar'));
  assert.ok(studioCss.includes('.waypoint-type-select'));
  assert.ok(css.includes('.waypoint-filter-icon'));
  assert.strictEqual(studioCss.includes('.waypoint-type-picker'), false);
  assert.ok(css.includes('.escape-direction-tag'));
  assert.ok(css.includes('.segment-dirty-indicator'));
  assert.ok(runtime.includes('addescape-day-select'));
  assert.ok(runtime.includes('DAY_ITINERARY_WAYPOINT_TAGS'));
  assert.ok(runtime.includes("const tag = document.createElement('select')"));
  assert.strictEqual(runtime.includes("tag.type = 'hidden'"), false);
  assert.ok(runtime.includes('requestSegmentExit'));
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
  assert.ok(primaryMini.includes("element.style.display = 'none';"));
  assert.ok(primaryMini.includes('element.replaceChildren();'));
});
T('visual fixtures cover real Day, measurement, and segmentation states', () => {
  assert.ok(visual.includes('workbench-trail-groups.png'));
  assert.ok(visual.includes('workbench-day-cards.png'));
  assert.ok(visual.includes('workbench-measure.png'));
  assert.ok(visual.includes('workbench-segment.png'));
  assert.ok(visual.includes('workbench-elevation-collapsed.png'));
  assert.ok(visual.includes('toolbarZoomOverlap'));
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
