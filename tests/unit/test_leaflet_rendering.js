/** Declarative map models and Leaflet instance ownership contracts. */
const assert = require('assert');
const app = require('../../src/app/index.ts');

let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.stack || error.message}`); failed++; }
};

function createLayer() {
  return {
    added:[], removed:[], clears:0,
    clearLayers() { this.clears++; this.added = []; },
    removeLayer(layer) { this.removed.push(layer); this.added = this.added.filter(item => item !== layer); },
  };
}

function createLeafletHarness() {
  let nextId = 0;
  const created = {polylines:[], markers:[], icons:[]};
  const evented = kind => ({
    id:++nextId, kind, events:{},
    on(names, listener) { for(const name of names.split(' ')) this.events[name] = listener; return this; },
    bindTooltip(content, options) { this.tooltip = {content, options}; return this; },
    bindPopup(content, options) { this.popup = {content, options}; return this; },
    addTo(layer) { layer.added.push(this); return this; },
  });
  return {
    created,
    api:{
      polyline(latLngs, style) {
        const line = Object.assign(evented('polyline'), {latLngs, style});
        created.polylines.push(line);
        return line;
      },
      divIcon(options) { const icon = {options}; created.icons.push(icon); return icon; },
      marker(position, options) {
        const marker = Object.assign(evented('marker'), {position, options});
        created.markers.push(marker);
        return marker;
      },
    },
  };
}

console.log('\n▸ Map and Marker Leaflet boundaries');

T('track model preserves z-order and bounds elevation polylines to 40 groups', () => {
  const points = Array.from({length:1000}, (_, index) => [30 + index / 10000, 100, 1000 + (index % 80), index / 10, 0, 1]);
  const secondary = {id:'b', name:'B', color:'#888', track:points, active:true};
  const primary = {id:'a', name:'A', color:'#080', track:points, active:true};
  const model = app.buildTrackRenderModel({
    trails:[primary, secondary], primaryTrailId:'a', mode:'elev', showTrack:true,
    activeEscape:null, dayPalette:['#123456'], elevationBandCount:40,
  });
  assert.strictEqual(model.polylines[0].trail.id, 'b');
  assert.ok(model.polylines.find(line => line.key === 'a:bloom-outer'));
  assert.ok(model.elevationBands > 0 && model.elevationBands <= 80);
  assert.ok(model.polylines.every(line => line.latLngs.length > 0));
});

T('track adapter exclusively creates layers and throttles hover callbacks', () => {
  const leaflet = createLeafletHarness();
  const trackLayer = createLayer();
  const networkLayer = createLayer();
  let queued = null;
  let hovered = 0;
  let selected = null;
  const renderer = app.createLeafletTrackRenderer({
    leaflet:leaflet.api, trackLayer, networkLayer,
    requestFrame:callback => { queued = callback; return 7; },
    cancelFrame:() => { queued = null; }, interactionBlocked:() => false,
    onHover:() => { hovered++; }, onHoverEnd:() => {}, onSelectTrail:id => { selected = id; },
  });
  const trail = {id:'a', name:'A', track:[[30,100,1000],[31,101,1100]]};
  renderer.render({polylines:[{
    key:'a:one', trail, latLngs:[[30,100],[31,101]], lineStyle:{color:'#000'},
    hoverable:true, selectable:true, tooltip:'A',
  }], elevationBands:0, minElevation:1000, maxElevation:1100});
  assert.strictEqual(trackLayer.clears, 1);
  assert.strictEqual(networkLayer.clears, 1);
  assert.strictEqual(trackLayer.added.length, 1);
  const line = trackLayer.added[0];
  line.events.mousemove({latlng:{lat:30,lng:100}});
  line.events.mousemove({latlng:{lat:31,lng:101}});
  assert.strictEqual(hovered, 0);
  queued();
  assert.strictEqual(hovered, 1);
  line.events.click();
  assert.strictEqual(selected, 'a');
});

T('Marker adapter keeps stable instances and replaces only changed keys', () => {
  const leaflet = createLeafletHarness();
  const waypointLayer = createLayer();
  const highPointLayer = createLayer();
  const registry = {};
  const renderer = app.createLeafletMarkerRenderer({
    leaflet:leaflet.api, waypointLayer, highPointLayer, waypointRegistry:registry,
    onWaypointClick:() => {},
  });
  const trail = {id:'a', name:'A', color:'#080', track:[[30,100,1000,0]], waypoints:[]};
  const waypoint = {id:1, lat:30, lng:100, tag:'camp', km:0, elev:1000, label:'Camp'};
  const first = app.buildWaypointMarkerModel({
    trail, waypoint, isPrimary:true, waypointMode:false, color:'#22c55e', iconText:'C',
  });
  assert.deepStrictEqual(renderer.renderWaypoints([first]), {add:1, update:0, remove:0, keep:0});
  const stable = registry['a#1'];
  assert.deepStrictEqual(renderer.renderWaypoints([first]), {add:0, update:0, remove:0, keep:1});
  assert.strictEqual(registry['a#1'], stable);
  const changed = {...first, signature:'changed'};
  assert.deepStrictEqual(renderer.renderWaypoints([changed]), {add:0, update:1, remove:0, keep:0});
  assert.notStrictEqual(registry['a#1'], stable);
  assert.deepStrictEqual(renderer.renderWaypoints([]), {add:0, update:0, remove:1, keep:0});
  assert.strictEqual(registry['a#1'], undefined);
});

T('high-point models stay declarative and render in their dedicated layer', () => {
  const leaflet = createLeafletHarness();
  const waypointLayer = createLayer();
  const highPointLayer = createLayer();
  const renderer = app.createLeafletMarkerRenderer({
    leaflet:leaflet.api, waypointLayer, highPointLayer, waypointRegistry:{}, onWaypointClick:() => {},
  });
  const model = app.buildHighPointMarkerModel({
    id:'a', name:'A', color:'#080', track:[[30,100,1000,0],[31,101,1200,5]],
  }, true);
  assert.ok(model);
  assert.deepStrictEqual(model.position, [31,101]);
  renderer.renderHighPoints([model]);
  assert.strictEqual(highPointLayer.clears, 1);
  assert.strictEqual(highPointLayer.added.length, 1);
  assert.ok(highPointLayer.added[0].popup.content.includes('1200'));
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
