const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const source = ts.transpileModule(
  fs.readFileSync(path.join(root, 'src/ui/primary-mini.ts'), 'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020}},
).outputText;
const moduleShim = {exports:{}};
new Function('module', 'exports', source)(moduleShim, moduleShim.exports);
const {createPrimaryMiniController} = moduleShim.exports;

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  PASS ${name}`); };

function fixture(trail = {name:'A very long trail', stats:{distance_km:12.4, ascent_m:820, descent_m:760}}) {
  const values = new Map();
  const listeners = new Map();
  const element = {
    style:{}, title:'', innerHTML:'',
    classList:{add() {}, remove() {}},
    replaceChildren() { this.innerHTML = ''; },
    addEventListener(type, listener) { (listeners.get(type) || listeners.set(type, []).get(type)).push(listener); },
    removeEventListener(type, listener) { listeners.set(type, (listeners.get(type) || []).filter(item => item !== listener)); },
    getBoundingClientRect:() => ({left:10, top:20, width:240, height:92}),
    setPointerCapture() {}, releasePointerCapture() {},
  };
  const mapElement = {getBoundingClientRect:() => ({left:0, top:0, width:500, height:300})};
  const controller = createPrimaryMiniController({
    element, mapElement, getTrail:() => trail,
    translate:key => key,
    escapeText:value => String(value).replaceAll('<','&lt;'),
    dragHint:() => 'Drag to move',
    openSidebar() {},
    storage:{getItem:key => values.get(key) ?? null, setItem:(key, value) => values.set(key, value)},
    requestFrame:callback => { callback(); return 1; },
    schedule:() => 1,
  });
  return {controller, element, values, listeners};
}

console.log('\nPrimary mini controller');

test('renders a class-based compact summary without inline style', () => {
  const {controller, element} = fixture();
  assert.strictEqual(controller.render(), true);
  assert.match(element.innerHTML, /primary-mini__eyebrow/);
  assert.match(element.innerHTML, /primary-mini__name/);
  assert.match(element.innerHTML, /primary-mini__stats/);
  assert.match(element.innerHTML, /12\.4<small> km<\/small>/);
  assert.match(element.innerHTML, /820<small> m<\/small><\/b><span>↑ mini\.ascent/);
  assert.match(element.innerHTML, /760<small> m<\/small><\/b><span>↓ mini\.descent/);
  assert.doesNotMatch(element.innerHTML, /mini\.peak/);
  assert.doesNotMatch(element.innerHTML, /style=/);
  assert.match(element.title, /Drag to move/);
});

test('hides itself when no primary trail exists', () => {
  const {controller, element} = fixture(null);
  assert.strictEqual(controller.render(), false);
  assert.strictEqual(element.style.display, 'none');
});

test('clamps and restores stored positions inside map bounds', () => {
  const {controller, element, values} = fixture();
  values.set(controller.storageKey, JSON.stringify({left:900, top:-20}));
  controller.applyPosition();
  assert.strictEqual(element.style.left, '252px');
  assert.strictEqual(element.style.top, '8px');
  assert.strictEqual(element.style.right, 'auto');
});

test('destroy removes owned pointer listeners', () => {
  const {controller, listeners} = fixture();
  controller.destroy();
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel']) {
    assert.strictEqual((listeners.get(type) || []).length, 0);
  }
});

console.log(`\nResult: ${passed}/${passed} passed`);
