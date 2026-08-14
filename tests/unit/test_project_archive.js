const assert = require('assert');
const app = require('../../src/app/index.ts');
const core = require('../../src/core/index.ts');
const { read } = require('./runtime_source.js');
const {createTestRuntimeContext} = require('./runtime_context_harness.js');

let passed = 0;
let failed = 0;
const T = async (name, fn) => {
  try { await fn(); console.log(`  PASS ${name}`); passed += 1; }
  catch(error) { console.log(`  FAIL ${name}\n    ${error.message}`); failed += 1; }
};

function trail(id = 'main', group = 'A') {
  return {
    id,
    name:`Trail ${id}`,
    group,
    color:'#2F674B',
    track:[[30, 100, 1000, 0, 0, 1], [30.01, 100.01, 1120, 1.4, 120, 1]],
    track_breaks:[1],
    day_meta:[{d:1, i_start:0, i_end:1, camp:'Camp', camp_elev:1120}],
    waypoints:[{name:'Camp', label:'Camp', tag:'camp', lat:30.01, lng:100.01, photo:'data:image/png;base64,AA=='}],
    escape_routes:[{id:'escape-1', name:'Exit', days:[1], track:[[30,100,1000],[30.1,100.1,800]]}],
    stats:{distance_km:1.4, ascent_m:120, descent_m:0, max_elev:1120, min_elev:1000},
  };
}

function stateInput(overrides = {}) {
  return {
    activeTrails:new Set(['main']),
    activeGroup:'A',
    primaryByGroup:{A:'main'},
    mode:'waypoint',
    modeVisibleTags:{day:new Set(['camp']), elev:new Set(['pass']), waypoint:new Set(['water'])},
    waypointModeTags:new Set(['camp', 'water']),
    showTrack:true,
    showLabel:false,
    showHighPoint:true,
    baseLayer:'sat',
    autoGenerateEscape:false,
    ...overrides,
  };
}

(async () => {
  console.log('\nProject archive');

  await T('round trips complete trail and workspace data through the current schema', () => {
    const archive = core.createProjectArchive({
      project:{title:'Weekend Route', trails:[trail()], calc_method:{threshold:10}},
      state:stateInput(),
      appVersion:'v2.1.0',
      exportedAt:'2026-07-21T12:00:00.000Z',
    });
    const parsed = core.parseProjectArchive(core.serializeProjectArchive(archive));
    assert.strictEqual(parsed.ok, true);
    assert.strictEqual(parsed.migratedFrom, null);
    assert.strictEqual(parsed.archive.format, core.PROJECT_ARCHIVE_FORMAT);
    assert.strictEqual(parsed.archive.schemaVersion, 2);
    assert.strictEqual(parsed.archive.project.trails[0].waypoints[0].photo, 'data:image/png;base64,AA==');
    assert.deepStrictEqual(parsed.archive.project.trails[0].escape_routes[0].days, [1]);
    assert.deepStrictEqual(parsed.archive.project.trails[0].track_breaks, [1]);
    assert.strictEqual(parsed.archive.workspace.mode, 'waypoint');
    assert.strictEqual(parsed.archive.workspace.showLabel, false);
    assert.deepStrictEqual(parsed.archive.workspace.waypointModeTags, ['camp', 'water']);
  });

  await T('preserves an intentional empty active-trail selection', () => {
    const archive = core.createProjectArchive({
      project:{title:'Hidden', trails:[trail()]},
      state:stateInput({activeTrails:new Set()}),
      appVersion:'v2.1.0',
    });
    assert.deepStrictEqual(archive.workspace.activeTrails, []);
  });

  await T('preserves an intentional no-active-group workspace', () => {
    const archive = core.createProjectArchive({
      project:{title:'No group', trails:[trail()]},
      state:stateInput({activeGroup:null}),
      appVersion:'v2.1.0',
    });
    assert.strictEqual(archive.workspace.activeGroup, null);
    assert.deepStrictEqual(archive.workspace.primaryByGroup, {A:'main'});
  });

  await T('rejects wrong formats, future schemas, duplicate ids, and invalid coordinates', () => {
    assert.strictEqual(core.parseProjectArchive('{}').code, 'invalid-format');
    const base = core.createProjectArchive({
      project:{title:'Route', trails:[trail()]}, state:stateInput(), appVersion:'v2.1.0',
    });
    assert.strictEqual(core.parseProjectArchive(JSON.stringify({...base, schemaVersion:3})).code, 'unsupported-schema');
    const duplicate = JSON.parse(JSON.stringify(base));
    duplicate.project.trails.push(duplicate.project.trails[0]);
    assert.strictEqual(core.parseProjectArchive(JSON.stringify(duplicate)).code, 'duplicate-trail-id');
    const coordinate = JSON.parse(JSON.stringify(base));
    coordinate.project.trails[0].track[0][0] = 100;
    assert.strictEqual(core.parseProjectArchive(JSON.stringify(coordinate)).code, 'invalid-trail');
  });

  await T('enforces size limits and strips prototype-pollution keys', () => {
    assert.strictEqual(core.parseProjectArchive('123456', {maxBytes:3}).code, 'too-large');
    const raw = JSON.parse(JSON.stringify(core.createProjectArchive({
      project:{title:'Safe', trails:[trail()]}, state:stateInput(), appVersion:'v2.1.0',
    })));
    Object.defineProperty(raw.project.trails[0], '__proto__', {
      value:{polluted:true}, enumerable:true, configurable:true,
    });
    const parsed = core.parseProjectArchive(JSON.stringify(raw));
    assert.strictEqual(parsed.ok, true);
    assert.strictEqual({}.polluted, undefined);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(parsed.archive.project.trails[0], '__proto__'), false);
  });

  await T('accepts dense multi-track projects while retaining configurable node protection', () => {
    assert.ok(core.PROJECT_ARCHIVE_DEFAULT_LIMITS.maxNodes >= 8_000_000);
    assert.ok(Math.floor(core.PROJECT_ARCHIVE_DEFAULT_LIMITS.maxNodes / 7) > 1_000_000);
    const dense = trail('dense', 'A');
    dense.track = Array.from({length:30_000}, (_, index) => [
      30 + (index % 500) / 100_000,
      100 + (index % 700) / 100_000,
      1000 + index % 800,
      index / 100,
      index,
      1 + Math.floor(index / 6000),
    ]);
    const archive = core.createProjectArchive({
      project:{title:'Dense project', trails:[dense]},
      state:stateInput(), appVersion:'v2.2.8',
    });
    const text = core.serializeProjectArchive(archive);
    assert.strictEqual(core.parseProjectArchive(text).ok, true);
    const limited = core.parseProjectArchive(text, {maxNodes:100_000});
    assert.strictEqual(limited.ok, false);
    assert.strictEqual(limited.code, 'unsafe-value');
    assert.match(limited.message, /too many values/);
  });

  await T('migrates schema 1 archives without losing nested route data', () => {
    const legacy = JSON.parse(JSON.stringify(core.createProjectArchive({
      project:{title:'Legacy', trails:[trail()]}, state:stateInput(), appVersion:'v2.1.0',
    })));
    legacy.schemaVersion = 1;
    delete legacy.project.calc_method;
    const parsed = core.parseProjectArchive(JSON.stringify(legacy));
    assert.strictEqual(parsed.ok, true);
    assert.strictEqual(parsed.migratedFrom, 1);
    assert.strictEqual(parsed.archive.schemaVersion, 2);
    assert.deepStrictEqual(parsed.archive.project.calc_method, {});
    assert.strictEqual(parsed.archive.project.trails[0].waypoints[0].photo, 'data:image/png;base64,AA==');
    assert.deepStrictEqual(parsed.archive.project.trails[0].escape_routes[0].days, [1]);
  });

  await T('rebuilds missing derived trail, Day, waypoint, and escape fields immutably', () => {
    const incomplete = {
      id:'legacy', name:'Incomplete legacy trail', group:'A', color:'#2F674B',
      track:[
        [30, 100, 1000, 88, 999, 1],
        [30.01, 100, 1120, 88, 999, 1],
        [30.02, 100, 1080, 88, 999, 2],
        [30.03, 100, 1250, 88, 999, 2],
      ],
      day_meta:[
        {d:1, i_start:0, i_end:1, km:'missing', asc:'missing', camp:'Ridge camp'},
        {d:2, i_start:1, i_end:3, desc:'missing', seg:'Second day'},
      ],
      waypoints:[
        {id:'camp', name:'Ridge camp', tag:'camp', lat:30.0101, lng:100},
        {id:'water', label:'Water', tag:'water', gps_idx:2},
      ],
      escape_routes:[{
        id:'legacy-escape', name:'Legacy escape', desc:'', days:[2],
        _anchor:{trailId:'legacy', trailName:'Incomplete legacy trail'},
        line:[[30.02, 100], [30.03, 100]],
      }],
      stats:{distance_km:-1, ascent_m:-1},
    };
    const project = {title:'Compatibility', trails:[incomplete], calc_method:{threshold:10}};
    const before = JSON.stringify(project);
    const rebuilt = core.rebuildProjectDerivedData(project);
    const restored = rebuilt.trails[0];

    assert.strictEqual(JSON.stringify(project), before);
    assert.notStrictEqual(restored, incomplete);
    assert.strictEqual(restored.track[0][3], 0);
    assert.ok(restored.track.at(-1)[3] > 3);
    assert.ok(restored.stats.distance_km > 3);
    assert.strictEqual(restored.stats.ascent_m, 290);
    assert.strictEqual(restored.stats.descent_m, 40);
    assert.strictEqual(restored.days, 2);
    assert.deepStrictEqual(restored.day_meta.map(meta => [meta.d, meta.i_start, meta.i_end]), [
      [1, 0, 1], [2, 1, 3],
    ]);
    assert.ok(restored.day_meta.every(meta =>
      ['km','asc','desc','max','min','camp_elev'].every(key => Number.isFinite(meta[key]))));
    assert.strictEqual(restored.day_meta[0].camp, 'Ridge camp');
    assert.strictEqual(restored.day_meta[1].seg, 'Second day');
    assert.strictEqual(restored.waypoints[0].gps_idx, 1);
    assert.strictEqual(restored.waypoints[0].km, +restored.track[1][3].toFixed(1));
    assert.strictEqual(restored.waypoints[0].day, 1);
    assert.strictEqual(restored.waypoints[1].lat, restored.track[2][0]);
    assert.strictEqual(restored.waypoints[1].day, 2);
    assert.ok(Number.isFinite(restored.escape_routes[0].distance_km));
    assert.ok(restored.escape_routes[0].distance_km > 0);
    assert.strictEqual(restored.escape_routes[0].drop_m, -170);
    assert.strictEqual(restored.escape_routes[0].direction, 'forward');
  });

  await T('controller exports and atomically restores project plus workspace', async () => {
    const original = trail('old', 'Old');
    const store = app.createAppStateStore({trails:[original]});
    const context = createTestRuntimeContext(
      app,
      {title:'Old project', trails:[original], calc_method:{}},
      store,
    );
    const effects = {saves:[], commits:0, resets:0, events:[]};
    const controller = app.createProjectArchiveController(context, {
      files:{
        download() {},
        saveText:async (text, filename, mimeType, extension) => {
          effects.saves.push({text, filename, mimeType, extension});
          return 'download';
        },
      },
      appVersion:'v2.1.0',
      now:() => new Date('2026-07-21T12:00:00.000Z'),
      commit:() => { effects.commits += 1; },
      resetView:() => { effects.resets += 1; },
      onEvent:event => effects.events.push(event),
    });
    const exported = await controller.exportProject();
    assert.strictEqual(exported.status, 'exported');
    assert.match(exported.filename, /Old project_2026-07-21\.ors-project\.json$/);
    assert.strictEqual(effects.saves[0].extension, '.ors-project.json');

    const incoming = core.createProjectArchive({
      project:{title:'Restored', trails:[trail('main', 'A')], calc_method:{threshold:10}},
      state:stateInput(),
      appVersion:'v2.1.0',
    });
    incoming.project.trails[0].track.forEach(point => { point[3] = 99; point[4] = 99; });
    incoming.project.trails[0].stats.distance_km = -1;
    delete incoming.project.trails[0].waypoints[0].gps_idx;
    delete incoming.project.trails[0].waypoints[0].km;
    delete incoming.project.trails[0].escape_routes[0].distance_km;
    delete incoming.project.trails[0].escape_routes[0].drop_m;
    const oldArray = context.projectSelectors.trails();
    const result = await controller.restore(incoming);
    assert.strictEqual(result.trailCount, 1);
    assert.strictEqual(context.projectSelectors.trails(), oldArray);
    assert.strictEqual(context.projectSelectors.trails()[0].id, 'main');
    assert.strictEqual(context.projectSelectors.title(), 'Restored');
    assert.strictEqual(context.projectSelectors.trails()[0].stats.distance_km, 0);
    assert.strictEqual(context.projectSelectors.trails()[0].track[0][3], 0);
    assert.strictEqual(context.projectSelectors.trails()[0].waypoints[0].gps_idx, 1);
    assert.ok(Number.isFinite(context.projectSelectors.trails()[0].waypoints[0].km));
    assert.ok(Number.isFinite(context.projectSelectors.trails()[0].escape_routes[0].distance_km));
    assert.ok(Number.isFinite(context.projectSelectors.trails()[0].escape_routes[0].drop_m));
    assert.strictEqual(store.snapshot().activeGroup, 'A');
    assert.strictEqual(store.snapshot().mode, 'waypoint');
    assert.strictEqual(effects.commits, 1);
    assert.strictEqual(effects.resets, 1);
    assert.strictEqual(controller.canRecover, true);
    assert.strictEqual((await controller.recoverLast()).status, 'restored');
    assert.strictEqual(context.projectSelectors.title(), 'Old project');
    assert.strictEqual(effects.commits, 2);
  });

  await T('restore failure rolls back to its automatic recovery point', async () => {
    const original = trail('old', 'Old');
    const store = app.createAppStateStore({trails:[original]});
    const context = createTestRuntimeContext(
      app,
      {title:'Safe', trails:[original], calc_method:{}},
      store,
    );
    let commits = 0;
    const controller = app.createProjectArchiveController(context, {
      files:{download() {}, saveText:async () => 'download'},
      appVersion:'v2.2.0',
      commit:() => {
        commits += 1;
        if(commits === 1) throw new Error('storage failed');
      },
      resetView:() => {},
    });
    const incoming = core.createProjectArchive({
      project:{title:'Broken restore', trails:[trail('new', 'New')]},
      state:stateInput(), appVersion:'v2.2.0',
    });
    const result = await controller.restore(incoming);
    assert.strictEqual(result.status, 'failed');
    assert.strictEqual(result.rolledBack, true);
    assert.strictEqual(context.projectSelectors.title(), 'Safe');
    assert.strictEqual(context.projectSelectors.trails()[0].id, 'old');
  });

  await T('runtime delegates archive data and writes to the typed controller', () => {
    const source = read('src/app/runtime/studio.ts');
    const sidebar = read('src/ui/sidebar/runtime-owner.ts');
    const projectRuntime = read('src/features/project/runtime.ts');
    const projectRestoreUi = read('src/ui/import/project-restore.ts');
    assert.match(source, /createProjectRuntimeController\(\s*runtimeContext as unknown as HTM_APP\.RuntimeContext/);
    assert.match(projectRuntime, /createProjectArchiveController\(context/);
    assert.match(projectRestoreUi, /archive\.parse/);
    assert.match(projectRestoreUi, /archive\.restore/);
    assert.match(source, /projectArchiveController\.exportProject/);
    assert.match(sidebar, /legendMinElevation/);
    assert.doesNotMatch(sidebar, /<span>\$\{minE\}m<\/span>/);
    assert.doesNotMatch(source, /JSON\.parse\([^\n]*projectFile/);
  });

  console.log(`\nResult: ${passed}/${passed + failed} passed`);
  process.exit(failed === 0 ? 0 : 1);
})();
