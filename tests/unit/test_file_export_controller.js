/** Typed file-export core, adapters, and controller contracts. */
const assert = require('assert');
const app = require('../../src/app/index.ts');
const core = require('../../src/core/index.ts');
const { read } = require('./runtime_source.js');

let passed = 0;
let failed = 0;
const T = async (name, fn) => {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
};

function trail(id = 'a', name = 'Main', group = 'A') {
  return {
    id, name, group, color:'#123456',
    track:[
      [30, 100, 1000, 0, 0, 1],
      [30.01, 100, 1120, 1, 120, 1],
      [30.02, 100, 1080, 2, 120, 2],
      [30.03, 100, 1250, 3, 290, 2],
    ],
    waypoints:[
      {lat:0, lng:0, elev:1000, km:0, tag:'start', label:'Origin'},
      {lat:30.01, lng:100, elev:1120, km:1, day:1, tag:'camp', label:'Camp'},
      {lat:30.03, lng:100, elev:1250, km:3, day:2, tag:'pass', label:'Pass'},
    ],
    stats:{distance_km:3, ascent_m:290, max_elev:1250},
    escape_routes:[{name:'Exit', distance_km:1.2, drop_m:300}],
  };
}

function createHarness(trails, overrides = {}) {
  const context = app.createRuntimeContext({
    project:{title:'Export', trails},
    state:app.createAppStateStore({trails}),
    commands:new app.CommandRegistry(),
    interactions:app.createStudioInteractionManager(),
    renderer:new app.RenderScheduler({raf:() => 1, caf:() => {}}),
    dialogs:{confirm:async () => true},
  });
  const effects = {downloads:[], saves:[], archives:[], charts:[], events:[]};
  const archive = overrides.archive || {
    available:true,
    unzip:() => ({}),
    decode:() => '',
    zipTextFiles:async files => {
      effects.archives.push(files);
      return new Uint8Array([1, 2, 3]);
    },
  };
  const files = overrides.files || {
    download:(content, filename, mimeType) => effects.downloads.push({content, filename, mimeType}),
    saveText:async (text, filename, mimeType, extension) => {
      effects.saves.push({text, filename, mimeType, extension});
      return 'download';
    },
  };
  const controller = app.createFileExportController(context, {
    archive,
    files,
    dayPalette:['#111111', '#222222'],
    renderDayChart:(points, color, label) => {
      effects.charts.push({points, color, label});
      return `data:image/png;base64,${label}`;
    },
    getLanguage:() => overrides.language || 'zh',
    now:() => new Date('2026-07-13T00:00:00.000Z'),
    schedule:callback => callback(),
    onEvent:event => effects.events.push(event),
  });
  return {context, controller, effects};
}

(async () => {
  console.log('\n▸ Typed file export');

  await T('builds safe standalone KML with correct color and zero coordinates', () => {
    const source = trail('a', 'A ]]> B');
    const kml = core.buildTrailKml(source);
    assert.match(kml, /ff563412/);
    assert.match(kml, /A \]\]\]\]><!\[CDATA\[> B/);
    assert.match(kml, /<Point><coordinates>0,0,1000<\/coordinates><\/Point>/);
    assert.match(kml, /100,30,1000/);
  });

  await T('builds deterministic group files without overwriting duplicate names', () => {
    const first = trail('a', 'Same');
    const second = trail('b', 'Same');
    const files = core.buildGroupExportFiles([first, second], 'A/B', '2026/7/13');
    assert.ok(files['轨迹/Same.kml']);
    assert.ok(files['轨迹/Same_2.kml']);
    assert.ok(files['_A_B_合并导入.kml']);
    assert.match(files['README.txt'], /共 2 条轨迹/);
    assert.strictEqual(Object.keys(files).length, 4);
  });

  await T('builds Day Markdown with charts, camps, passes, and escape routes', () => {
    const markdown = core.buildItineraryMarkdown(trail(), 'zh', {
      1:'data:image/png;base64,D1',
      2:'data:image/png;base64,D2',
    });
    assert.match(markdown, /\| D1 \|/);
    assert.match(markdown, /营地.*Camp/);
    assert.match(markdown, /垭口.*Pass/);
    assert.match(markdown, /data:image\/png;base64,D2/);
    assert.match(markdown, /## 下撤方案/);
    assert.match(markdown, /Exit.*1\.2km/);
    assert.doesNotMatch(markdown, /undefined|NaN/);
  });

  await T('archive adapter owns UTF-8, unzip, and asynchronous ZIP encoding', async () => {
    const calls = {unzipped:null, zipped:null};
    const codec = {
      unzipSync:bytes => { calls.unzipped = [...bytes]; return {'a.kml':bytes}; },
      strToU8:text => new TextEncoder().encode(text),
      zip:(files, options, callback) => {
        calls.zipped = {files, options};
        callback(null, new Uint8Array([9, 8]));
      },
    };
    const adapter = app.createFileArchiveAdapter(codec);
    assert.strictEqual(adapter.available, true);
    assert.deepStrictEqual(Object.keys(adapter.unzip(new Uint8Array([1]))), ['a.kml']);
    assert.strictEqual(adapter.decode(new TextEncoder().encode('路线')), '路线');
    assert.deepStrictEqual([...await adapter.zipTextFiles({'x.txt':'hello'})], [9, 8]);
    assert.strictEqual(new TextDecoder().decode(calls.zipped.files['x.txt']), 'hello');
    assert.deepStrictEqual(calls.zipped.options, {level:6});
  });

  await T('browser adapter owns Blob URLs and picker fallback', async () => {
    const effects = {clicks:0, revoked:[], blobs:[], writes:0};
    class FakeBlob {
      constructor(parts, options) { this.parts = parts; this.type = options.type; effects.blobs.push(this); }
    }
    const anchor = {href:'', download:'', click:() => { effects.clicks++; }};
    const environment = {
      document:{createElement:() => anchor},
      url:{
        createObjectURL:() => 'blob:test',
        revokeObjectURL:value => effects.revoked.push(value),
      },
      BlobCtor:FakeBlob,
      showSaveFilePicker:async () => ({
        createWritable:async () => ({
          write:async () => { effects.writes++; },
          close:async () => {},
        }),
      }),
    };
    const adapter = app.createBrowserFileAdapter(environment);
    adapter.download('kml', 'route.kml', core.KML_MIME);
    assert.strictEqual(effects.clicks, 1);
    assert.deepStrictEqual(effects.revoked, ['blob:test']);
    assert.strictEqual(await adapter.saveText('md', 'route.md', 'text/markdown;charset=utf-8', '.md'), 'picker');
    assert.strictEqual(effects.writes, 1);

    environment.showSaveFilePicker = async () => { throw new Error('cancelled'); };
    const fallback = app.createBrowserFileAdapter(environment);
    assert.strictEqual(await fallback.saveText('md', 'route.md', 'text/markdown', '.md'), 'download');
    assert.strictEqual(effects.clicks, 2);
  });

  await T('controller exports only active trails in the active group as one ZIP', async () => {
    const first = trail('a', 'Main', 'A');
    const hidden = trail('b', 'Hidden', 'A');
    const other = trail('c', 'Other', 'B');
    const {context, controller, effects} = createHarness([first, hidden, other]);
    context.state.dispatch({type:'active-trail.set', trailId:'b', active:false});
    const result = await controller.exportGroupKml();
    assert.deepStrictEqual(result, {status:'exported', filename:'A_轨迹_2026-07-13.zip'});
    assert.strictEqual(effects.archives.length, 1);
    assert.ok(effects.archives[0]['轨迹/Main.kml']);
    assert.ok(!effects.archives[0]['轨迹/Hidden.kml']);
    assert.ok(!effects.archives[0]['轨迹/Other.kml']);
    assert.strictEqual(effects.downloads[0].mimeType, 'application/zip');
  });

  await T('controller falls back to KML files and exports itinerary through the file adapter', async () => {
    const archive = {
      available:false, unzip:() => ({}), decode:() => '',
      zipTextFiles:async () => { throw new Error('unavailable'); },
    };
    const {controller, effects} = createHarness([trail()], {archive, language:'en'});
    assert.deepStrictEqual(await controller.exportGroupKml(), {status:'fallback', downloadCount:2});
    assert.deepStrictEqual(effects.downloads.map(item => item.filename), [
      '_A_合并导入.kml', 'Main.kml',
    ]);
    assert.deepStrictEqual(await controller.exportItineraryMarkdown(), {
      status:'exported', filename:'Main_itinerary.md',
    });
    assert.deepStrictEqual(effects.charts.map(item => item.label), ['D1', 'D2']);
    assert.match(effects.saves[0].text, /# Main Itinerary/);
  });

  await T('classic files owner keeps only DOM wrappers around typed adapters', () => {
    const source = read('src/features/files/runtime.ts');
    assert.match(source, /createFileArchiveAdapter/);
    assert.match(source, /createBrowserFileAdapter/);
    assert.match(source, /createFileExportController\(runtimeContext/);
    assert.match(source, /fileExportController\.downloadTrailKml/);
    assert.match(source, /fileExportController\.exportGroupKml/);
    assert.match(source, /fileExportController\.exportItineraryMarkdown/);
    assert.doesNotMatch(source, /new Blob|URL\.createObjectURL|URL\.revokeObjectURL/);
    assert.doesNotMatch(source, /fflate\.(?:zip|strToU8|unzipSync)/);
    assert.doesNotMatch(source, /function (?:_trailToKMLString|_buildMergedKML|buildDayElevChart)\(/);
    assert.doesNotMatch(source, /function haversine2d\(|let md =/);
  });

  console.log('\n══════════════════════════════════════════════════');
  console.log(`结果: ${passed}/${passed + failed} passed`);
  process.exit(failed === 0 ? 0 : 1);
})();
