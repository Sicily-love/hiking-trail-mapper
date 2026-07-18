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

function createRenderContext(trails) {
  return app.createRuntimeContext({
    project:{title:'Render', trails},
    state:app.createAppStateStore({trails}),
    commands:new app.CommandRegistry(),
    interactions:app.createStudioInteractionManager(),
    renderer:new app.RenderScheduler({raf:() => 1, caf:() => {}}),
    dialogs:{confirm:async () => true},
  });
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

T('map controller owns active-group selection without classic globals', () => {
  const a = {id:'a', group:'A', name:'A', track:[[30,100,1000],[31,101,1100]]};
  const b = {id:'b', group:'B', name:'B', track:[[32,102,1200],[33,103,1300]]};
  const controller = app.createMapRenderController(createRenderContext([a, b]));
  const model = controller.buildTracks({dayPalette:['#123456'], elevationBandCount:40});
  assert.ok(model.polylines.length > 0);
  assert.ok(model.polylines.every(line => line.trail.id === 'a'));
});

T('map model keeps disconnected track parts as separate Leaflet paths', () => {
  const trail = {
    id:'a', name:'A', color:'#080', active:true,
    track:[[0,0,100],[0,.001,120],[1,1,4000],[1,1.001,4020]],
    track_breaks:[2],
  };
  const model = app.buildTrackRenderModel({
    trails:[trail], primaryTrailId:'a', mode:'waypoint', showTrack:true,
    activeEscape:null, dayPalette:['#123456'], elevationBandCount:40,
  });
  const bloom = model.polylines.find(line => line.key === 'a:bloom-outer');
  assert.strictEqual(bloom.latLngs.length, 2);
  assert.deepStrictEqual(bloom.latLngs.map(path => path.length), [2,2]);
});

T('escape reference trail renders last with a visible halo while alternatives dim', () => {
  const points = [[30,100,1000],[31,101,1100]];
  const model = app.buildTrackRenderModel({
    trails:[
      {id:'a', name:'Main', color:'#080', track:points, active:true},
      {id:'b', name:'Escape base', color:'#888', track:points, active:true},
    ],
    primaryTrailId:'a', mode:'waypoint', showTrack:true, activeEscape:null,
    escapeReferenceTrailId:'b', dayPalette:['#123456'], elevationBandCount:40,
  });
  const halo = model.polylines.find(line => line.key === 'b:escape-reference-halo');
  const reference = model.polylines.find(line => line.key === 'b:waypoint-reference');
  const dimmedMain = model.polylines.find(line => line.key.startsWith('a:elev:'));
  assert.ok(halo);
  assert.strictEqual(halo.lineStyle.color, '#F59E0B');
  assert.strictEqual(reference.lineStyle.opacity, 1);
  assert.strictEqual(model.polylines.at(-1).trail.id, 'b');
  assert.ok(Number(dimmedMain.lineStyle.opacity) < 0.3);
});

T('track adapter exclusively creates layers and throttles hover callbacks', () => {
  const leaflet = createLeafletHarness();
  const trackLayer = createLayer();
  const networkLayer = createLayer();
  let queued = null;
  let hovered = 0;
  let inspected = 0;
  let selected = null;
  const renderer = app.createLeafletTrackRenderer({
    leaflet:leaflet.api, trackLayer, networkLayer,
    requestFrame:callback => { queued = callback; return 7; },
    cancelFrame:() => { queued = null; }, interactionBlocked:() => false,
    onHover:() => { hovered++; }, onHoverEnd:() => {},
    onInspectPoint:() => { inspected++; }, onSelectTrail:id => { selected = id; },
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
  assert.strictEqual(inspected, 0);

  renderer.render({polylines:[{
    key:'a:inspect', trail, latLngs:[[30,100],[31,101]], lineStyle:{color:'#000'}, hoverable:true,
  }], elevationBands:0, minElevation:1000, maxElevation:1100});
  trackLayer.added[0].events.click({latlng:{lat:30,lng:100}});
  assert.strictEqual(inspected, 1);
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
  assert.deepStrictEqual(first.iconSize, [24, 24]);
  assert.deepStrictEqual(first.iconAnchor, [12, 12]);
  assert.ok(first.iconHtml.includes('wp-marker-shell'));
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

T('Marker controller owns mode, group, tag, and primary visibility', () => {
  const waypoint = id => ({id, lat:30, lng:100, tag:'camp', km:1, elev:1000, label:`Camp ${id}`});
  const a = {id:'a', group:'A', name:'A', track:[[30,100,1000],[31,101,1200]], waypoints:[waypoint(1)]};
  const b = {id:'b', group:'B', name:'B', track:[[32,102,900],[33,103,1100]], waypoints:[waypoint(2)]};
  const context = createRenderContext([a, b]);
  const controller = app.createMarkerRenderController(context, {
    tagColors:{camp:'#080'}, iconForWaypoint:() => 'C',
  });
  assert.deepStrictEqual(controller.build().waypoints.map(model => model.trail.id), ['a']);
  context.state.dispatch({type:'mode.set', mode:'waypoint'});
  assert.deepStrictEqual(controller.build().waypoints.map(model => model.trail.id), ['a', 'b']);
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
