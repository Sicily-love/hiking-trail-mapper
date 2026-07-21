const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const source = ts.transpileModule(
  fs.readFileSync(path.join(root, 'src/ui/floating-panel.ts'), 'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020}},
).outputText;
const moduleShim = {exports:{}};
new Function('module', 'exports', source)(moduleShim, moduleShim.exports);
const {createFloatingPanelPositionController} = moduleShim.exports;

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  PASS ${name}`);
};

function fixture() {
  const values = new Map();
  const listeners = {};
  const style = {};
  const handle = {
    addEventListener(type, listener) { (listeners[type] ||= []).push(listener); },
    setPointerCapture() {},
    releasePointerCapture() {},
  };
  const element = {
    style,
    offsetParent:null,
    offsetWidth:100,
    offsetHeight:50,
    getBoundingClientRect:() => ({left:0, top:0, width:100, height:50, right:100, bottom:50}),
    querySelector:() => handle,
    closest:() => null,
    classList:{add() {}, remove() {}},
  };
  const map = {getBoundingClientRect:() => ({left:50, top:20, width:500, height:300, right:550, bottom:320})};
  const storage = {
    getItem:key => values.get(key) ?? null,
    setItem:(key, value) => values.set(key, value),
    removeItem:key => values.delete(key),
  };
  const controller = createFloatingPanelPositionController({
    document:{getElementById:id => id === 'map' ? map : null},
    viewport:{innerWidth:1000, innerHeight:700},
    storage,
  });
  return {controller, element, handle, listeners, style, values};
}

console.log('\nFloating panel position controller');

test('stored positions clamp inside the selected map boundary', () => {
  const {controller, element, style, values} = fixture();
  values.set('panel', JSON.stringify({left:999, top:-20}));
  controller.apply(element, {storageKey:'panel', mode:'map'});
  assert.strictEqual(style.left, '442px');
  assert.strictEqual(style.top, '28px');
  assert.strictEqual(style.right, 'auto');
  assert.strictEqual(style.transform, 'none');
});

test('reset removes persistence and restores the configured CSS defaults', () => {
  const {controller, element, style, values} = fixture();
  values.set('panel', '{}');
  controller.reset(element, {
    storageKey:'panel', mode:'viewport',
    defaultStyle:{left:'14px', bottom:'28px'},
  });
  assert.strictEqual(values.has('panel'), false);
  assert.strictEqual(style.left, '14px');
  assert.strictEqual(style.bottom, '28px');
  assert.strictEqual(style.top, '');
});

test('binding is idempotent and exposes apply/reset hooks to the panel', () => {
  const {controller, element, listeners} = fixture();
  const options = {storageKey:'panel', mode:'viewport', handleSelector:'[data-panel-drag]'};
  controller.bind(element, options);
  controller.bind(element, options);
  assert.strictEqual(listeners.pointerdown.length, 1);
  assert.strictEqual(listeners.pointermove.length, 1);
  assert.strictEqual(listeners.dblclick.length, 1);
  assert.strictEqual(typeof element._applyFloatingPosition, 'function');
  assert.strictEqual(typeof element._resetFloatingPosition, 'function');
});

console.log(`\nResult: ${passed}/${passed} passed`);
