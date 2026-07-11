/** Workbench UI 2.0 static and dependency-free DOM contracts. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const iconPath = path.join(root, 'src/ui/icons.ts');
const workbenchPath = path.join(root, 'src/ui/layout/workbench.ts');
const cssPath = path.join(root, 'src/styles/studio.css');
const mainPath = path.join(root, 'src/main.ts');
const bootstrapPath = path.join(root, 'src/app/bootstrap.ts');
const legacyWorkbenchPath = path.join(root, 'src/ui/workbench.ts');
const iconSource = fs.readFileSync(iconPath, 'utf8');
const workbenchSource = fs.readFileSync(workbenchPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const mainSource = fs.readFileSync(mainPath, 'utf8');
const bootstrapSource = fs.readFileSync(bootstrapPath, 'utf8');
const legacyWorkbenchSource = fs.readFileSync(legacyWorkbenchPath, 'utf8');

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

test('top menu has the seven required groups and moves every legacy command', () => {
  const expectedLabels = ['File', 'Edit', 'Measure', 'Plan', 'Waypoint', 'View', 'Export'];
  const expectedCommands = [
    'add-trail-btn', 'reverse-btn', 'clear-btn', 'measure-btn', 'segment-btn',
    'add-escape-btn', 'add-waypoint-btn', 'reset-btn', 'help-btn', 'lang-btn', 'export-btn',
  ];
  if(workbenchModule) {
    assert.deepStrictEqual(workbenchModule.MENU_DEFINITIONS.map(item => item.label), expectedLabels);
    const commandIds = workbenchModule.MENU_DEFINITIONS.flatMap(item => item.commandIds);
    assert.deepStrictEqual([...commandIds].sort(), [...expectedCommands].sort());
    assert.strictEqual(new Set(commandIds).size, commandIds.length);
  } else {
    expectedLabels.forEach(label => assert.ok(workbenchSource.includes(`label: '${label}'`), label));
    expectedCommands.forEach(id => assert.ok(workbenchSource.includes(`'${id}'`), id));
  }
});

test('activity rail exposes all seven required destinations', () => {
  const expected = ['Project', 'Trails', 'Itinerary', 'Waypoints', 'Escape', 'Statistics', 'Settings'];
  if(workbenchModule) {
    assert.deepStrictEqual(workbenchModule.ACTIVITY_DEFINITIONS.map(item => item.label), expected);
  } else {
    expected.forEach(label => assert.ok(workbenchSource.includes(`label: '${label}'`), label));
  }
  assert.ok(workbenchSource.includes('aria-controls'));
  assert.ok(workbenchSource.includes("button.setAttribute('aria-current', 'page')"));
});

test('bottom dock exposes five tabs backed by existing panel IDs', () => {
  const expectedLabels = ['Elevation', 'Statistics', 'Measure', 'Segment', 'Log'];
  const expectedNodes = ['elev-bar', 'header-stats', 'measure-panel', 'segment-panel', null];
  if(workbenchModule) {
    assert.deepStrictEqual(workbenchModule.BOTTOM_TAB_DEFINITIONS.map(item => item.label), expectedLabels);
    assert.deepStrictEqual(workbenchModule.BOTTOM_TAB_DEFINITIONS.map(item => item.nodeId), expectedNodes);
  } else {
    expectedLabels.forEach(label => assert.ok(workbenchSource.includes(`label: '${label}'`), label));
    expectedNodes.filter(Boolean).forEach(id => assert.ok(workbenchSource.includes(`nodeId: '${id}'`), id));
  }
  assert.ok(workbenchSource.includes('pane.hidden = !active'));
  assert.ok(workbenchSource.includes("tab.setAttribute('aria-selected', String(active))"));
});

test('layout moves existing ID nodes without cloning or HTML string copies', () => {
  assert.ok(workbenchSource.includes('pane.appendChild(existingPanel)'));
  assert.ok(workbenchSource.includes('mapStage.append(map, dock.root)'));
  assert.ok(workbenchSource.includes('workspace.append(activityRail.root, sidebarElement, mapStage)'));
  assert.ok(workbenchSource.includes('main.replaceChildren(header, workspace)'));
  assert.strictEqual(workbenchSource.includes('cloneNode'), false);
  assert.strictEqual(workbenchSource.includes('innerHTML'), false);
  assert.strictEqual(workbenchSource.includes('insertAdjacentHTML'), false);
});

test('activity and panel surfaces dispatch commands while runtime visibility stays synchronized', () => {
  assert.ok(workbenchSource.includes('button.dataset.commandId = definition.commandId'));
  assert.ok(workbenchSource.includes('tab.dataset.commandId = definition.commandId'));
  assert.ok(workbenchSource.includes('dispatchCommand(definition.commandId)'));
  assert.strictEqual(workbenchSource.includes('?.click()'), false);
  assert.ok(workbenchSource.includes("attributeFilter: ['style']"));
  assert.ok(workbenchSource.includes("setBottomTab('elevation')"));
  assert.ok(workbenchSource.includes("if(kind === 'command') control.removeAttribute('style')"));
  assert.ok(css.includes('> #elev-bar.collapsed .elev-canvas'));
  assert.ok(css.includes('display:block !important;'));
});

test('menus support keyboard navigation, Escape, and outside-click close', () => {
  ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'Escape', 'Tab']
    .forEach(key => assert.ok(workbenchSource.includes(`'${key}'`), key));
  assert.ok(workbenchSource.includes("document.addEventListener('click', onDocumentClick, true)"));
  assert.ok(workbenchSource.includes("document.addEventListener('keydown', onDocumentKeydown)"));
  assert.ok(workbenchSource.includes("trigger.setAttribute('aria-haspopup', 'menu')"));
  assert.ok(workbenchSource.includes("trigger.setAttribute('aria-expanded', 'false')"));
});

test('upgrade is idempotent and persists activity and bottom-tab state', () => {
  assert.ok(workbenchSource.includes('const controllers = new WeakMap<Document, WorkbenchLayoutController>()'));
  assert.ok(workbenchSource.includes("main?.dataset.workbenchLayout === '2'"));
  assert.ok(workbenchSource.includes("activity: 'hiking_workbench2_activity'"));
  assert.ok(workbenchSource.includes("bottomTab: 'hiking_workbench2_bottom_tab'"));
  assert.ok(workbenchSource.includes('writeStorage(storage, WORKBENCH_STORAGE_KEYS.activity'));
  assert.ok(workbenchSource.includes('writeStorage(storage, WORKBENCH_STORAGE_KEYS.bottomTab'));
});

test('bootstrap activates Workbench 2.0 after the legacy runtime is bound', () => {
  const runtimeIndex = bootstrapSource.indexOf("executeClassicScript(document, runtimeSource, 'runtime.js')");
  const workbenchIndex = bootstrapSource.indexOf(
    'resolveWorkbenchStorage(document),\n    commands,',
  );
  assert.ok(runtimeIndex >= 0);
  assert.ok(workbenchIndex > runtimeIndex);
  assert.ok(bootstrapSource.includes("throw new Error('Outdoor Route Studio could not mount the Workbench layout')"));
  assert.ok(bootstrapSource.includes('{ version: 2, ready, commands, dialogs, workbench }'));
});

test('Studio stylesheet loads after the legacy component stylesheet', () => {
  const legacyIndex = mainSource.indexOf("import './ui/workbench.css'");
  const studioIndex = mainSource.indexOf("import './styles/studio.css'");
  assert.ok(legacyIndex >= 0);
  assert.ok(studioIndex > legacyIndex);
});

test('legacy chrome cannot downgrade an active Studio workbench', () => {
  assert.ok(legacyWorkbenchSource.includes("document.documentElement.dataset.workbench === '2'"));
  assert.ok(legacyWorkbenchSource.includes("document.documentElement.dataset.ui = 'studio'"));
});

test('Studio palette includes required semantic colors', () => {
  ['#1E6F50', '#F59E0B', '#DC2626', '#FAFAF8']
    .forEach(color => assert.ok(css.includes(color), color));
  assert.ok(css.includes('--studio-forest:'));
  assert.ok(css.includes('--studio-orange:'));
  assert.ok(css.includes('--studio-danger:'));
  assert.ok(css.includes('--studio-canvas:'));
});

test('Studio CSS owns all four responsive contracts', () => {
  [1440, 1024, 390, 320]
    .forEach(width => assert.ok(css.includes(`@media (max-width: ${width}px)`), `${width}px`));
  assert.ok(css.includes('grid-template-columns:repeat(7,minmax(0,1fr));'));
  assert.ok(css.includes(".studio-bottom-pane:not([hidden]) > #measure-panel"));
  assert.ok(css.includes(".studio-bottom-pane:not([hidden]) > #segment-panel"));
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
