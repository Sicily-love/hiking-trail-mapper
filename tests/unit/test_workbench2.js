/** Workbench UI 2.0 static and dependency-free DOM contracts. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const iconPath = path.join(root, 'src/ui/icons.ts');
const workbenchPath = path.join(root, 'src/ui/layout/workbench.ts');
const cssPath = path.join(root, 'src/styles/studio.css');
const componentCssPath = path.join(root, 'src/styles/components.css');
const floatingPanelPath = path.join(root, 'src/ui/floating-panel.ts');
const toastPath = path.join(root, 'src/ui/toast.ts');
const mainPath = path.join(root, 'src/main.ts');
const bootstrapPath = path.join(root, 'src/app/bootstrap.ts');
const shellPath = path.join(root, 'src/ui/layout/app-shell.ts');
const runtimePath = path.join(root, 'src/app/runtime/studio.ts');
const iconSource = fs.readFileSync(iconPath, 'utf8');
const workbenchSource = fs.readFileSync(workbenchPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const componentCss = fs.readFileSync(componentCssPath, 'utf8');
const floatingPanelSource = fs.readFileSync(floatingPanelPath, 'utf8');
const toastSource = fs.readFileSync(toastPath, 'utf8');
const mainSource = fs.readFileSync(mainPath, 'utf8');
const bootstrapSource = fs.readFileSync(bootstrapPath, 'utf8');
const shellSource = fs.readFileSync(shellPath, 'utf8');
const runtimeSource = fs.readFileSync(runtimePath, 'utf8');

let iconModule = null;
let workbenchModule = null;
try {
  iconModule = require(iconPath);
  workbenchModule = require(workbenchPath);
} catch {
  // Older Node versions fall back to the source contracts below.
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS ${name}`);
  } catch(error) {
    failed += 1;
    console.log(`  FAIL ${name}\n    ${error.stack || error.message}`);
  }
}

console.log('\nWorkbench UI 2.0 contracts');

test('Lucide uses named tree-shakeable imports and one icon helper', () => {
  assert.ok(iconSource.includes("} from 'lucide';"));
  assert.strictEqual(iconSource.includes('import * as'), false);
  assert.strictEqual(/\bicons\s+as\s+/.test(iconSource), false);
  assert.ok(iconSource.includes('export function createWorkbenchIcon('));
  assert.ok(iconSource.includes("'git-fork': GitFork"));
  assert.ok(iconSource.includes("'triangle-alert': TriangleAlert"));
  assert.ok(iconSource.includes('document.createElementNS('));
  assert.strictEqual(iconSource.includes('createIcons('), false);
});

test('icon helper renders against a supplied pure DOM document', () => {
  if(!iconModule) {
    assert.ok(iconSource.includes("svg.setAttribute('data-lucide', name)"));
    assert.ok(iconSource.includes('svg.appendChild(child)'));
    return;
  }

  class ElementStub {
    constructor(namespace, tagName) {
      this.namespaceURI = namespace;
      this.tagName = tagName;
      this.attributes = {};
      this.children = [];
      this.textContent = '';
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    appendChild(child) { this.children.push(child); return child; }
  }

  const documentStub = {
    createElementNS(namespace, tagName) {
      return new ElementStub(namespace, tagName);
    },
  };
  const icon = iconModule.createWorkbenchIcon(documentStub, 'route', {
    label: 'Trails',
    size: 20,
    strokeWidth: 1.5,
  });
  assert.strictEqual(icon.tagName, 'svg');
  assert.strictEqual(icon.attributes.width, '20');
  assert.strictEqual(icon.attributes['stroke-width'], '1.5');
  assert.strictEqual(icon.attributes['aria-label'], 'Trails');
  assert.ok(icon.children.length > 1);
});

test('top toolbar keeps only multi-command menus and flattens direct commands', () => {
  const expectedLabels = ['Edit', 'Plan'];
  const expectedZhLabels = ['编辑', '规划'];
  const expectedMenuCommands = [
    'undo-btn', 'redo-btn', 'reverse-btn', 'stitch-btn', 'clear-btn',
    'segment-btn', 'add-escape-btn',
  ];
  const expectedDirect = [
    'add-trail-btn', 'measure-btn', 'add-waypoint-btn', 'export-btn',
    'reset-btn', 'help-btn', 'lang-btn',
  ];
  const expectedLayout = [
    'command:add-trail-btn', 'menu:edit', 'command:measure-btn', 'menu:plan',
    'command:add-waypoint-btn', 'command:export-btn', 'command:reset-btn',
    'command:help-btn', 'command:lang-btn',
  ];
  if(workbenchModule) {
    assert.deepStrictEqual(workbenchModule.MENU_DEFINITIONS.map(item => item.label), expectedLabels);
    assert.deepStrictEqual(workbenchModule.MENU_DEFINITIONS.map(item => item.labelZh), expectedZhLabels);
    const commandIds = workbenchModule.MENU_DEFINITIONS.flatMap(item => item.commandIds);
    assert.deepStrictEqual([...commandIds].sort(), [...expectedMenuCommands].sort());
    assert.ok(workbenchModule.MENU_DEFINITIONS.every(item => item.commandIds.length > 1));
    assert.deepStrictEqual([...workbenchModule.DIRECT_COMMAND_IDS], expectedDirect);
    assert.deepStrictEqual(
      workbenchModule.TOOLBAR_LAYOUT.map(item => `${item.kind}:${item.kind === 'menu' ? item.key : item.id}`),
      expectedLayout,
    );
    assert.strictEqual(new Set(commandIds).size, commandIds.length);
  } else {
    expectedLabels.forEach(label => assert.ok(workbenchSource.includes(`label: '${label}'`), label));
    expectedZhLabels.forEach(label => assert.ok(workbenchSource.includes(`labelZh: '${label}'`), label));
    [...expectedMenuCommands, ...expectedDirect]
      .forEach(id => assert.ok(workbenchSource.includes(`'${id}'`), id));
  }
  assert.strictEqual(workbenchSource.includes('studio-quick-actions'), false);
  assert.ok(workbenchSource.includes('toolbar.replaceChildren(brandView.brand, menuList)'));
});

test('activity rail exposes trail groups as its first dedicated destination', () => {
  const expected = ['Trail Groups', 'Trails', 'Itinerary', 'Waypoints'];
  if(workbenchModule) {
    assert.deepStrictEqual(workbenchModule.ACTIVITY_DEFINITIONS.map(item => item.label), expected);
  } else {
    expected.forEach(label => assert.ok(workbenchSource.includes(`label: '${label}'`), label));
  }
  assert.ok(workbenchSource.includes('aria-controls'));
  assert.ok(workbenchSource.includes("button.setAttribute('aria-current', 'page')"));
  assert.strictEqual(shellSource.includes('sidebar-toggle'), false);
  assert.strictEqual(shellSource.includes('tab-escape'), false);
});

test('map modes and trail groups own dedicated far-left rail destinations', () => {
  const expectedModes = ['elev', 'waypoint'];
  if(workbenchModule) {
    assert.deepStrictEqual(workbenchModule.MAP_MODE_DEFINITIONS.map(item => item.mode), expectedModes);
  } else {
    expectedModes.forEach(mode => assert.ok(workbenchSource.includes(`mode: '${mode}'`), mode));
  }
  assert.ok(shellSource.indexOf('id="map-mode-controls"') < shellSource.indexOf('id="map"'));
  assert.ok(shellSource.includes('id="tab-groups"'));
  assert.ok(shellSource.includes('id="trail-group-panel"'));
  assert.ok(shellSource.includes('id="trail-group-list"'));
  assert.ok(shellSource.indexOf('id="tab-groups"') < shellSource.indexOf('id="tab-trails"'));
  assert.ok(shellSource.includes('id="trail-selector-panel"'));
  assert.ok(shellSource.includes('id="trail-list"'));
  assert.ok(runtimeSource.includes("document.getElementById('trail-group-list')"));
  assert.ok(runtimeSource.includes('groupPanel.hidden = false'));
  assert.ok(runtimeSource.includes('groups:STUDIO_COMMANDS.WORKSPACE_GROUPS'));
  assert.ok(runtimeSource.includes("register(STUDIO_COMMANDS.WORKSPACE_GROUPS"));
  assert.strictEqual(runtimeSource.includes('list.appendChild(tabs)'), false);
  assert.ok(workbenchSource.includes('root.appendChild(modeSwitcher)'));
  assert.ok(workbenchSource.includes("modeSwitcher.className = 'studio-mode-switcher'"));
  assert.ok(css.includes('.studio-mode-button.on'));
  assert.ok(css.includes('.studio-trail-selector #trail-list'));
});

test('bottom dock is a fixed elevation surface without duplicate navigation tabs', () => {
  if(workbenchModule) assert.strictEqual(workbenchModule.BOTTOM_TAB_DEFINITIONS, undefined);
  assert.ok(workbenchSource.includes('function buildAnalysisDock('));
  assert.ok(workbenchSource.includes("pane.dataset.analysisPanel = 'elevation'"));
  assert.ok(workbenchSource.includes("elevationPanel.classList.add('studio-docked-panel')"));
  assert.ok(workbenchSource.includes("measurePanel.classList.add('studio-elevation-measure-actions')"));
  assert.ok(workbenchSource.includes('root.append(content)'));
  assert.strictEqual(workbenchSource.includes('PANEL_LOG'), false);
  assert.strictEqual(workbenchSource.includes('studio-bottom-tab'), false);
});

test('measurement actions remain available inside expanded and collapsed elevation docks', () => {
  assert.ok(shellSource.includes('id="measure-reset"'));
  assert.ok(shellSource.includes('id="measure-reverse"'));
  assert.ok(shellSource.includes('id="measure-exit"'));
  assert.ok(css.includes('#measure-panel.studio-elevation-measure-actions[style*="display: block"]'));
  assert.ok(css.includes('#elev-bar.collapsed ~ #measure-panel.studio-elevation-measure-actions'));
  assert.ok(runtimeSource.includes("mode: 'measure-dock'"));
  assert.ok(runtimeSource.includes('createFloatingPanelPositionController'));
  assert.ok(floatingPanelSource.includes("element.closest('.studio-bottom-pane')"));
  assert.ok(floatingPanelSource.includes("handle.addEventListener('pointerdown'"));
  assert.ok(floatingPanelSource.includes("handle.addEventListener('dblclick'"));
  assert.ok(css.includes('#measure-panel .measure-panel-grip'));
  assert.ok(css.includes('cursor:grabbing'));
});

test('trail stitching selects from zero then edits ordered parts on the map', () => {
  assert.ok(workbenchSource.includes("'stitch-btn'"));
  assert.ok(workbenchSource.includes('STUDIO_COMMANDS.TRAIL_STITCH'));
  assert.ok(shellSource.includes('id="stitch-btn"'));
  assert.ok(runtimeSource.includes('async function stitchTrailsCommand()'));
  assert.ok(runtimeSource.includes('studioDialogs.openCustom'));
  assert.ok(runtimeSource.includes('stitchTrails(stitchState.parts.map'));
  assert.ok(runtimeSource.includes('fileImportController.addTrail(trail)'));
  assert.ok(css.includes('.stitch-trail-row'));
  assert.ok(shellSource.includes('id="stitch-panel"'));
  assert.ok(shellSource.includes('id="stitch-parts"'));
  assert.ok(runtimeSource.includes('checkbox.checked = false'));
  assert.ok(runtimeSource.includes("beginRuntimeInteraction('stitch', 'editing'"));
  assert.ok(runtimeSource.includes('createPrimaryTrackDragSnapper(marker'));
  assert.ok(runtimeSource.includes('globalSearch:true'));
  assert.ok(runtimeSource.includes('snapMarker:false'));
  assert.ok(runtimeSource.includes('applyStitchSelection(part.id)'));
  assert.ok(runtimeSource.includes("layer._stitchRole === 'selection'"));
  assert.ok(runtimeSource.includes('buildStitchEndpointOffsets(stitchState.parts)'));
  assert.ok(runtimeSource.includes("const endpointPaneName = 'stitch-endpoints'"));
  assert.ok(runtimeSource.includes("endpointPane.style.zIndex = '760'"));
  assert.ok(runtimeSource.includes('pane:endpointPaneName'));
  assert.ok(runtimeSource.includes("<= 20"));
  assert.ok(runtimeSource.includes('paddingBottomRight:[430,50]'));
  assert.ok(runtimeSource.includes('await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'));
  assert.ok(runtimeSource.includes("await fitWorkspaceBounds(L.latLngBounds(latLngs), fitOptions, {source:'stitch-workbench'})"));
  assert.ok(runtimeSource.includes('track_breaks'));
  assert.ok(css.includes('.stitch-part-card'));
  assert.ok(css.includes('.stitch-endpoint-marker.is-active'));
  assert.ok(css.includes('.stitch-part-editing'));
  assert.ok(workbenchSource.includes("'stitch-close': { icon: 'x'"));
});

test('layout moves existing ID nodes without cloning or HTML string copies', () => {
  assert.ok(workbenchSource.includes('pane.appendChild(elevationPanel)'));
  assert.ok(workbenchSource.includes('pane.appendChild(measurePanel)'));
  assert.ok(workbenchSource.includes('mapStage.append(map, analysisDock)'));
  assert.ok(workbenchSource.includes('mapStage.appendChild(segmentPanel)'));
  assert.ok(workbenchSource.includes('mapStage.appendChild(stitchPanel)'));
  assert.ok(workbenchSource.includes('workspace.append(activityRail.root, sidebarElement, mapStage)'));
  assert.ok(workbenchSource.includes('main.replaceChildren(header, workspace)'));
  assert.strictEqual(workbenchSource.includes('cloneNode'), false);
  assert.strictEqual(workbenchSource.includes('innerHTML'), false);
  assert.strictEqual(workbenchSource.includes('insertAdjacentHTML'), false);
});

test('every trail card exposes one typed rename action', () => {
  assert.ok(runtimeSource.includes('class="trail-rename-btn"'));
  assert.ok(runtimeSource.includes("createWorkbenchIcon(document, 'pencil'"));
  assert.ok(runtimeSource.includes('async function editTrailName(tr)'));
  assert.ok(runtimeSource.includes('trailController.renameTrail(tr.id, newName)'));
  assert.ok(componentCss.includes('.trail-rename-btn'));
  assert.ok(css.includes('grid-template-columns:68px 310px minmax(0,1fr)'));
  assert.ok(css.includes('#sidebar :is(.pc-name,.trail-name,.trail-toggle)'));
  assert.ok(css.includes('text-overflow:ellipsis'));
});

test('activity surfaces dispatch commands without mirrored bottom mode commands', () => {
  assert.ok(workbenchSource.includes('button.dataset.commandId = definition.commandId'));
  assert.ok(workbenchSource.includes('dispatchCommand(definition.commandId)'));
  assert.strictEqual(workbenchSource.includes('?.click()'), false);
  assert.strictEqual(workbenchSource.includes('setBottomTab('), false);
  assert.ok(workbenchSource.includes("if(kind === 'command') control.removeAttribute('style')"));
  assert.ok(css.includes('> #elev-bar.collapsed .elev-canvas'));
  assert.ok(css.includes(".studio-map-stage:has(> .studio-bottom-dock #elev-bar.collapsed)"));
  assert.ok(css.includes('display:none !important;'));
});

test('menus support keyboard navigation, Escape, and outside-click close', () => {
  ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'Escape', 'Tab']
    .forEach(key => assert.ok(workbenchSource.includes(`'${key}'`), key));
  assert.ok(workbenchSource.includes("document.addEventListener('click', onDocumentClick, true)"));
  assert.ok(workbenchSource.includes("document.addEventListener('keydown', onDocumentKeydown)"));
  assert.ok(workbenchSource.includes("trigger.setAttribute('aria-haspopup', 'menu')"));
  assert.ok(workbenchSource.includes("trigger.setAttribute('aria-expanded', 'false')"));
  assert.ok(css.includes("#map-toolbar.studio-menubar"));
  assert.ok(css.includes('pointer-events:auto;'));
});

test('Workbench owns bilingual labels and responds to one language event', () => {
  assert.ok(workbenchSource.includes("export type WorkbenchLanguage = 'zh' | 'en'"));
  assert.ok(workbenchSource.includes("addEventListener('studio:language-changed'"));
  assert.ok(workbenchSource.includes('setLanguage(nextLanguage)'));
  assert.strictEqual(workbenchSource.includes("context.textContent = language === 'zh'"), false);
  assert.ok(workbenchSource.includes('delete control.dataset.i18n'));
  assert.ok(workbenchSource.includes('labelNode.dataset.i18n = i18nKey'));
});

test('upgrade is idempotent and persists only meaningful activity state', () => {
  assert.ok(workbenchSource.includes('const controllers = new WeakMap<Document, WorkbenchLayoutController>()'));
  assert.ok(workbenchSource.includes("main?.dataset.workbenchLayout === '2'"));
  assert.ok(workbenchSource.includes("activity: 'hiking_workbench2_activity'"));
  assert.ok(workbenchSource.includes('writeStorage(storage, WORKBENCH_STORAGE_KEYS.activity'));
  assert.ok(workbenchSource.includes("syncActivitySelection('trails', false)"));
  assert.strictEqual(workbenchSource.includes('const initialActivity = readStorage'), false);
  assert.strictEqual(workbenchSource.includes('hiking_workbench2_bottom_tab'), false);
});

test('bootstrap activates Workbench 2.0 after the direct runtime starts', () => {
  const runtimeIndex = bootstrapSource.indexOf('startStudioRuntime({ document, commands, dialogs })');
  const workbenchIndex = bootstrapSource.indexOf(
    'resolveWorkbenchStorage(document),\n    commands,',
  );
  assert.ok(runtimeIndex >= 0);
  assert.ok(workbenchIndex > runtimeIndex);
  assert.ok(bootstrapSource.includes("throw new Error('Outdoor Route Studio could not mount the Workbench layout')"));
  assert.ok(bootstrapSource.includes('version: STUDIO_VERSION'));
  assert.ok(bootstrapSource.includes('architecture: 2'));
});

test('Studio stylesheet loads after the shared component stylesheet', () => {
  const legacyIndex = mainSource.indexOf("import './styles/components.css'");
  const studioIndex = mainSource.indexOf("import './styles/studio.css'");
  assert.ok(legacyIndex >= 0);
  assert.ok(studioIndex > legacyIndex);
});

test('Workbench is the only chrome owner', () => {
  assert.strictEqual(fs.existsSync(path.join(root, 'src/ui/workbench.ts')), false);
  assert.ok(workbenchSource.includes('function prepareSidebarHeading('));
  assert.ok(workbenchSource.includes('function prepareElevationToggle('));
});

test('Studio palette includes required semantic colors', () => {
  ['#1E6F50', '#F59E0B', '#DC2626', '#FAFAF8']
    .forEach(color => assert.ok(css.includes(color), color));
  assert.ok(css.includes('--studio-forest:'));
  assert.ok(css.includes('--studio-orange:'));
  assert.ok(css.includes('--studio-danger:'));
  assert.ok(css.includes('--studio-canvas:'));
});

test('toast feedback is semantic, high contrast, and avoids the bottom dock', () => {
  assert.ok(runtimeSource.includes('createToastController'));
  assert.ok(runtimeSource.includes('return toastController.show('));
  assert.ok(toastSource.includes("toast.setAttribute('aria-atomic', 'true')"));
  assert.ok(toastSource.includes("toast.setAttribute('role', tone === 'error' ? 'alert' : 'status')"));
  assert.ok(toastSource.includes("options.document.querySelector('.studio-bottom-dock')"));
  assert.ok(toastSource.includes("toast.style.setProperty('--toast-bottom'"));
  assert.ok(toastSource.includes("toast.classList.add('is-visible')"));
  assert.ok(css.includes("#toast[data-tone='error']"));
  assert.ok(css.includes('background:#F8FBF9;'));
  assert.ok(css.includes('color:#17211B;'));
  assert.strictEqual(runtimeSource.includes('background:rgba(20,24,32,0.96)'), false);
});

test('Studio CSS owns all four responsive contracts', () => {
  [1440, 1024, 390, 320]
    .forEach(width => assert.ok(css.includes(`@media (max-width: ${width}px)`), `${width}px`));
  assert.ok(css.includes('grid-template-columns:repeat(6,minmax(0,1fr));'));
  assert.ok(css.includes("#measure-panel.studio-elevation-measure-actions"));
  assert.strictEqual(css.includes(".studio-bottom-pane:not([hidden]) > #segment-panel"), false);
  assert.ok(css.includes("html[data-workbench='2'] [hidden]"));
});

test('new UI sources contain no Emoji glyphs or negative letter spacing', () => {
  const emoji = /\p{Extended_Pictographic}/u;
  assert.strictEqual(emoji.test(iconSource), false);
  assert.strictEqual(emoji.test(workbenchSource), false);
  assert.strictEqual(emoji.test(css), false);
  assert.strictEqual(/letter-spacing\s*:\s*-/.test(css), false);
});

console.log(`\nResult: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
