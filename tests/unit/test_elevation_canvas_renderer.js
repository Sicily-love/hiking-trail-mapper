/** Typed elevation scene and Canvas renderer contracts. */
const assert = require('assert');
const app = require('../../src/app/index.ts');

let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.stack || error.message}`); failed++; }
};

function createCanvasContext() {
  const calls = [];
  const context = {
    canvas:{width:0, height:0},
    calls,
    setTransform(...args) { calls.push(['setTransform', ...args]); },
    scale(...args) { calls.push(['scale', ...args]); },
    clearRect(...args) { calls.push(['clearRect', ...args]); },
    fillRect(...args) { calls.push(['fillRect', ...args]); },
    beginPath() { calls.push(['beginPath']); },
    moveTo(...args) { calls.push(['moveTo', ...args]); },
    lineTo(...args) { calls.push(['lineTo', ...args]); },
    closePath() { calls.push(['closePath']); },
    fill() { calls.push(['fill']); },
    stroke() { calls.push(['stroke']); },
    arc(...args) { calls.push(['arc', ...args]); },
    fillText(...args) { calls.push(['fillText', ...args]); },
    setLineDash(value) { calls.push(['setLineDash', value]); },
    measureText(text) { return {width:text.length * 6}; },
    createLinearGradient(...args) {
      const stops = [];
      calls.push(['gradient', ...args, stops]);
      return {addColorStop(offset, color) { stops.push([offset, color]); }};
    },
  };
  return context;
}

console.log('\n▸ Typed elevation Canvas renderer');

T('scene builder downsamples drawing while preserving full layout and annotations', () => {
  const points = Array.from({length:2000}, (_, index) => [
    30 + index / 100000, 100, 1000 + Math.sin(index / 10) * 300, index / 10, index, 1,
  ]);
  const scene = app.buildElevationCanvasScene(points, {
    width:320, height:160, axisLabel:'km', measureMode:true, kmFromZero:true,
    measureText:text => text.length * 6,
  });
  assert.strictEqual(scene.sourcePoints, 2000);
  assert.ok(scene.renderedPoints <= scene.layout.pw * 2);
  assert.strictEqual(scene.layout.alts.length, 2000);
  assert.ok(scene.annotations.commands.some(command => command.text?.value.startsWith('A ')));
  assert.ok(scene.annotations.commands.some(command => command.text?.value.startsWith('B ')));
  assert.strictEqual(scene.chart.fillPolygon.length, scene.chart.curve.length + 2);
});

T('renderer owns DPR setup and every Canvas drawing instruction', () => {
  const context = createCanvasContext();
  const renderer = app.createElevationCanvasRenderer(context, () => 0.5);
  const points = [[30,100,1000,0,0,1],[31,101,1200,2,200,1],[32,102,900,4,200,1]];
  const scene = app.buildElevationCanvasScene(points, {
    width:300, height:150, axisLabel:'distance', measureText:renderer.measureText,
  });
  renderer.render(scene, {width:300, height:150, dpr:2});
  assert.deepStrictEqual([context.canvas.width, context.canvas.height], [600,300]);
  assert.ok(context.calls.some(call => call[0] === 'scale' && call[1] === 2));
  assert.ok(context.calls.some(call => call[0] === 'fill'));
  assert.ok(context.calls.some(call => call[0] === 'stroke'));
  assert.ok(context.calls.some(call => call[0] === 'arc'));
  assert.ok(context.calls.some(call => call[0] === 'fillText' && call[1] === 'distance'));
});

T('disconnected tracks render separate elevation paths and skip gap ascent', () => {
  const points = [
    [0,0,100,0,0,1], [0,.001,120,.1,20,1],
    [1,1,4000,.1,20,1], [1,1.001,4020,.2,40,1],
  ];
  const scene = app.buildElevationCanvasScene(points, {
    width:300, height:150, axisLabel:'distance', trackBreaks:[2],
  });
  assert.strictEqual(scene.chart.curveSegments.length, 2);
  assert.strictEqual(scene.chart.fillPolygons.length, 2);
  assert.ok(scene.chart.badges.ascent < 100);
});

T('clear resets the backing store using supplied dimensions', () => {
  const context = createCanvasContext();
  const renderer = app.createElevationCanvasRenderer(context);
  renderer.clear({width:240, height:120, dpr:1.5});
  assert.deepStrictEqual([context.canvas.width, context.canvas.height], [360,180]);
  assert.ok(context.calls.some(call => call[0] === 'clearRect' && call[3] === 240 && call[4] === 120));
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
