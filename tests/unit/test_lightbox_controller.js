const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const source = ts.transpileModule(
  fs.readFileSync(path.join(root, 'src/ui/lightbox.ts'), 'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020}},
).outputText;
const moduleShim = {exports:{}};
new Function('module', 'exports', source)(moduleShim, moduleShim.exports);
const {createImageLightboxController} = moduleShim.exports;

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  PASS ${name}`);
};

function emitter(extra = {}) {
  const listeners = new Map();
  return {
    ...extra,
    addEventListener(type, listener) { (listeners.get(type) || listeners.set(type, []).get(type)).push(listener); },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) || []).filter(candidate => candidate !== listener));
    },
    emit(type, event = {}) {
      const value = {target:this, preventDefault() {}, stopPropagation() {}, ...event};
      for(const listener of listeners.get(type) || []) listener(value);
      return value;
    },
    listenerCount(type) { return (listeners.get(type) || []).length; },
  };
}

function fixture() {
  const timers = new Map();
  let timerId = 0;
  const container = emitter({style:{display:'none'}});
  const image = emitter({style:{}, src:''});
  const caption = {textContent:''};
  const viewport = emitter({
    visualViewport:{scale:1},
    scrolls:[],
    scrollTo(value) { this.scrolls.push(value); },
  });
  const document = {body:{style:{}}};
  const controller = createImageLightboxController({
    document, viewport, container, image, caption,
    schedule(callback) { const id = ++timerId; timers.set(id, callback); return id; },
    cancelSchedule(id) { timers.delete(id); },
  });
  return {controller, container, image, caption, viewport, document, timers};
}

console.log('\nImage Lightbox controller');

test('opens decoded content and resets its transform', () => {
  const {controller, container, image, caption} = fixture();
  controller.open('data%3Aimage%2Fpng%3Bbase64%2CAA%3D%3D', 'Camp%20photo');
  assert.strictEqual(controller.isOpen, true);
  assert.strictEqual(container.style.display, 'flex');
  assert.strictEqual(image.src, 'data:image/png;base64,AA==');
  assert.strictEqual(caption.textContent, 'Camp photo');
  assert.strictEqual(image.style.transform, 'translate(0px,0px) scale(1)');
});

test('double click and wheel update only the image transform', () => {
  const {controller, container, image} = fixture();
  controller.open('image', 'caption');
  image.emit('dblclick');
  assert.match(image.style.transform, /scale\(2\.5\)$/);
  container.emit('wheel', {deltaY:-100});
  assert.match(image.style.transform, /scale\(3\)$/);
  image.emit('dblclick');
  assert.match(image.style.transform, /scale\(1\)$/);
});

test('background click closes and recovers a zoomed visual viewport', () => {
  const {controller, container, image, viewport, document} = fixture();
  controller.open('image');
  container.emit('click', {target:image});
  assert.strictEqual(controller.isOpen, true);
  viewport.visualViewport.scale = 2;
  container.emit('click', {target:container});
  assert.strictEqual(controller.isOpen, false);
  assert.strictEqual(viewport.scrolls.length, 1);
  assert.strictEqual(document.body.style.zoom, '1');
});

test('destroy removes every owned global and element listener', () => {
  const {controller, container, image, viewport} = fixture();
  controller.destroy();
  for(const type of ['click','wheel','touchstart','touchmove','touchend']) assert.strictEqual(container.listenerCount(type), 0);
  assert.strictEqual(image.listenerCount('dblclick'), 0);
  assert.strictEqual(viewport.listenerCount('mousemove'), 0);
  assert.strictEqual(viewport.listenerCount('mouseup'), 0);
});

console.log(`\nResult: ${passed}/${passed} passed`);
