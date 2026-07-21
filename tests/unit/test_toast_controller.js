const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const source = ts.transpileModule(
  fs.readFileSync(path.join(root, 'src/ui/toast.ts'), 'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020}},
).outputText;
const moduleShim = {exports:{}};
new Function('module', 'exports', source)(moduleShim, moduleShim.exports);
const {createToastController} = moduleShim.exports;

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  PASS ${name}`);
};

function fixture() {
  let toast = null;
  let timeout = null;
  const attributes = {};
  const properties = {};
  const classes = new Set();
  const document = {
    body:{appendChild(node) { toast = node; }},
    getElementById:id => id === 'toast' ? toast : null,
    createElement:() => ({
      id:'', textContent:'', dataset:{}, attributes,
      style:{setProperty:(name, value) => { properties[name] = value; }},
      classList:{add:name => classes.add(name), remove:name => classes.delete(name)},
      setAttribute:(name, value) => { attributes[name] = value; },
    }),
    querySelector:selector => selector === '.studio-map-stage'
      ? {getBoundingClientRect:() => ({left:300, top:50, width:900, height:650})}
      : {getBoundingClientRect:() => ({left:300, top:700, width:900, height:200})},
  };
  const controller = createToastController({
    document,
    viewport:{innerWidth:1200, innerHeight:900},
    requestFrame:callback => { callback(0); return 1; },
    setTimer:callback => { timeout = callback; return 1; },
    clearTimer:() => { timeout = null; },
  });
  return {controller, attributes, properties, classes, getToast:() => toast, runTimer:() => timeout?.()};
}

console.log('\nToast controller');

test('info feedback uses status semantics and clears the analysis dock', () => {
  const state = fixture();
  const toast = state.controller.show('Saved', 'info', 5000);
  assert.strictEqual(toast.textContent, 'Saved');
  assert.strictEqual(state.attributes.role, 'status');
  assert.strictEqual(state.attributes['aria-live'], 'polite');
  assert.strictEqual(state.properties['--toast-left'], '750px');
  assert.strictEqual(state.properties['--toast-bottom'], '212px');
  assert.ok(state.classes.has('is-visible'));
});

test('error feedback is assertive and the timer hides it', () => {
  const state = fixture();
  state.controller.show('Failed', 'error', 1000);
  assert.strictEqual(state.attributes.role, 'alert');
  assert.strictEqual(state.attributes['aria-live'], 'assertive');
  assert.strictEqual(state.getToast().dataset.tone, 'error');
  state.runTimer();
  assert.strictEqual(state.classes.has('is-visible'), false);
});

test('dispose is idempotent and rejects later messages', () => {
  const state = fixture();
  state.controller.show('Saved');
  state.controller.dispose();
  state.controller.dispose();
  assert.throws(() => state.controller.show('Late'), /disposed/);
});

console.log(`\nResult: ${passed}/${passed} passed`);
