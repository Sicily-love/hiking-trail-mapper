const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const source = ts.transpileModule(
  fs.readFileSync(path.join(root, 'src/ui/layout/map-safe-area.ts'), 'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020}},
).outputText;
const moduleShim = {exports:{}};
new Function('module', 'exports', source)(moduleShim, moduleShim.exports);
const {calculateMapSafePadding, createMapSafeAreaController} = moduleShim.exports;

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  PASS ${name}`);
};
const rect = (left, top, right, bottom) => ({
  left, top, right, bottom, width:right - left, height:bottom - top,
});

console.log('\nMap safe area');

test('reserves asymmetric room for edge overlays', () => {
  const result = calculateMapSafePadding(
    rect(0, 0, 1000, 700),
    [rect(0, 0, 280, 700), rect(0, 560, 1000, 700)],
    40,
  );
  assert.deepStrictEqual(result.paddingTopLeft, [320, 40]);
  assert.deepStrictEqual(result.paddingBottomRight, [40, 180]);
});

test('uses the short axis for a corner card and ignores central overlays', () => {
  const result = calculateMapSafePadding(
    rect(0, 0, 1000, 700),
    [rect(770, 12, 988, 100), rect(400, 260, 600, 440)],
    32,
  );
  assert.deepStrictEqual(result.paddingTopLeft, [32, 132]);
  assert.deepStrictEqual(result.paddingBottomRight, [32, 32]);
});

test('runtime controller excludes hidden and collapsed panels', () => {
  const mapRect = rect(50, 20, 850, 620);
  const visible = {
    hidden:false,
    classList:{contains:() => false},
    getBoundingClientRect:() => rect(50, 20, 270, 620),
  };
  const collapsed = {
    hidden:false,
    classList:{contains:value => value === 'collapsed'},
    getBoundingClientRect:() => rect(50, 20, 350, 620),
  };
  const document = {
    defaultView:{getComputedStyle:() => ({display:'block', visibility:'visible', opacity:'1'})},
    querySelectorAll:() => [visible, collapsed],
  };
  const controller = createMapSafeAreaController({
    document,
    mapElement:{getBoundingClientRect:() => mapRect},
    occluderSelectors:['.panel'],
  });
  assert.deepStrictEqual(controller.resolve(24), {
    paddingTopLeft:[244, 24],
    paddingBottomRight:[24, 24],
  });
});

console.log(`\nResult: ${passed}/${passed} passed`);
