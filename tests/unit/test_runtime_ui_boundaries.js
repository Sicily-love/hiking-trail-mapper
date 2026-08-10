const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');

function load(relativePath) {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(root, relativePath), 'utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020}},
  ).outputText;
  const moduleShim = {exports:{}};
  new Function('module', 'exports', source)(moduleShim, moduleShim.exports);
  return moduleShim.exports;
}

function emitter(extra = {}) {
  const listeners = new Map();
  return {
    ...extra,
    addEventListener(type, listener) {
      const values = listeners.get(type) || [];
      values.push(listener);
      listeners.set(type, values);
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) || []).filter(value => value !== listener));
    },
    emit(type, event = {}) {
      for(const listener of listeners.get(type) || []) {
        listener({preventDefault() {}, target:this, ...event});
      }
    },
  };
}

function classList() {
  const values = new Set();
  return {
    add:value => values.add(value),
    remove:value => values.delete(value),
    toggle(value, force) {
      if(force === undefined ? !values.has(value) : force) values.add(value);
      else values.delete(value);
      return values.has(value);
    },
    contains:value => values.has(value),
  };
}

function element(extra = {}) {
  return emitter({
    id:'',
    textContent:'',
    title:'',
    href:'',
    innerHTML:'',
    dataset:{},
    style:{},
    classList:classList(),
    children:[],
    appendChild(child) { this.children.push(child); child.parentElement = this; },
    remove() { this.removed = true; },
    ...extra,
  });
}

let passed = 0;
const test = async (name, fn) => {
  await fn();
  passed += 1;
  console.log(`  PASS ${name}`);
};

(async () => {
  console.log('\nRuntime UI ownership boundaries');

  await test('localization owner keeps language state and DOM synchronization together', () => {
    const {createLocalizationRuntime} = load('src/features/localization/runtime-owner.ts');
    const label = element({dataset:{i18n:'menu.file'}});
    const titled = element({dataset:{i18nTitle:'menu.help'}});
    const button = element();
    const events = [];
    const values = new Map([['hiking_lang', 'en']]);
    const defaultView = {
      CustomEvent:class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
      dispatchEvent:event => events.push(event),
    };
    const document = {
      documentElement:{lang:''},
      title:'',
      defaultView,
      querySelectorAll:selector => selector === '[data-i18n]' ? [label] : [titled],
      getElementById:id => id === 'lang-btn' ? button : null,
    };
    let rebuilds = 0;
    let refreshes = 0;
    const runtime = createLocalizationRuntime({
      document,
      storage:{getItem:key => values.get(key) || null, setItem:(key, value) => values.set(key, value)},
      browserLanguage:'zh-CN',
      resolveLanguage:value => value === 'en' ? 'en' : 'zh',
      translate:(language, key) => `${language}:${key}`,
      rebuild:() => { rebuilds += 1; },
      refresh:() => { refreshes += 1; },
    });
    runtime.apply();
    assert.strictEqual(runtime.language(), 'en');
    assert.strictEqual(document.documentElement.lang, 'en');
    assert.strictEqual(label.textContent, 'en:menu.file');
    assert.strictEqual(button.textContent, '🌐 中');
    runtime.toggle();
    assert.strictEqual(runtime.language(), 'zh');
    assert.strictEqual(values.get('hiking_lang'), 'zh');
    assert.strictEqual(rebuilds, 1);
    assert.strictEqual(refreshes, 1);
    assert.strictEqual(events.at(-1).detail.language, 'zh');
  });

  await test('measure panel owner presents interaction state without runtime DOM writes', () => {
    const {createMeasurePanelController} = load('src/ui/measure-panel.ts');
    const ids = new Map([
      ['measure-panel', element({_applyFloatingPosition() { this.positioned = true; }})],
      ['measure-distance', element()],
      ['measure-hint', element()],
      ['m-dist', element()],
      ['elev-stat-asc', element()],
      ['elev-stat-desc', element()],
    ]);
    const mapContainer = element();
    const controller = createMeasurePanelController({
      document:{getElementById:id => ids.get(id) || null},
      mapContainer,
    });
    controller.enter();
    assert.strictEqual(ids.get('measure-panel').style.display, 'block');
    assert.strictEqual(ids.get('measure-panel').positioned, true);
    assert.strictEqual(mapContainer.classList.contains('measure-active'), true);
    controller.update({distKm:12.345, asc:800, desc:650});
    assert.strictEqual(ids.get('m-dist').textContent, '12.35 km');
    assert.strictEqual(ids.get('elev-stat-asc').textContent, '↑800m');
    controller.exit();
    assert.strictEqual(ids.get('measure-panel').style.display, 'none');
    assert.strictEqual(mapContainer.classList.contains('measure-active'), false);
  });

  await test('sidebar owner controls collapse, compact primary card, and layout refresh', () => {
    const {createSidebarCollapseController} = load('src/ui/sidebar/collapse-controller.ts');
    const sidebar = element();
    const close = element();
    const mini = element();
    const callbacks = [];
    let layoutChanges = 0;
    let positions = 0;
    const controller = createSidebarCollapseController({
      document:{getElementById:id => ({sidebar, 'sidebar-close':close, 'primary-mini':mini})[id] || null},
      schedule:callback => { callbacks.push(callback); return callbacks.length; },
      cancelScheduled() {},
      onLayoutChanged:() => { layoutChanges += 1; },
      renderCollapsedPrimary:() => true,
      positionCollapsedPrimary:() => { positions += 1; },
    });
    close.emit('click');
    assert.strictEqual(controller.isCollapsed(), true);
    assert.strictEqual(mini.style.display, 'block');
    assert.strictEqual(positions, 1);
    callbacks.at(-1)();
    assert.strictEqual(layoutChanges, 1);
    controller.toggle(true);
    assert.strictEqual(controller.isCollapsed(), false);
    assert.strictEqual(mini.style.display, 'none');
    controller.destroy();
  });

  await test('workspace title owner restores, renames, and persists one title', async () => {
    const {createWorkspaceTitleController} = load('src/ui/workspace-title.ts');
    const heading = element({textContent:'Default'});
    const values = new Map([['hiking_title', 'Stored workspace']]);
    let dispatched = 0;
    const document = {
      title:'Default',
      getElementById:id => id === 'app-title' ? heading : null,
    };
    const controller = createWorkspaceTitleController({
      document,
      dialogs:{prompt:async () => 'Renamed workspace'},
      language:() => 'en',
      dispatchCommand:() => { dispatched += 1; },
      commandId:'app.rename',
      storage:{getItem:key => values.get(key) || null, setItem:(key, value) => values.set(key, value)},
    });
    assert.strictEqual(controller.title(), 'Stored workspace');
    assert.strictEqual(document.title, 'Stored workspace');
    heading.emit('dblclick');
    assert.strictEqual(dispatched, 1);
    assert.strictEqual(await controller.rename(), true);
    assert.strictEqual(document.title, 'Renamed workspace');
    assert.strictEqual(values.get('hiking_title'), 'Renamed workspace');
  });

  await test('map overlays own tooltip and waypoint-card DOM outside the main runtime', () => {
    const runtime = fs.readFileSync(path.join(root, 'src/app/runtime/studio.ts'), 'utf8');
    const owner = fs.readFileSync(path.join(root, 'src/ui/map-overlays.ts'), 'utf8');
    assert.ok(runtime.includes("createMapOverlayController"));
    assert.ok(runtime.includes('mapOverlayController.showTooltip(rows'));
    assert.ok(runtime.includes('mapOverlayController.showWaypointCard({'));
    assert.ok(!runtime.includes("const tooltipEl = document.getElementById('tooltip')"));
    assert.ok(!runtime.includes("const wpPhotoEl = document.getElementById('wp-photo-tip')"));
    assert.ok(!runtime.includes('wpPhotoEl.innerHTML'));
    assert.ok(owner.includes("tooltip.replaceChildren(...fragments)"));
    assert.ok(owner.includes("waypointCard.replaceChildren()"));
    assert.ok(owner.includes('sanitizeImageSource(model.photo)'));
  });

  console.log(`\nResult: ${passed}/${passed} passed`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
