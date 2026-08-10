const assert = require('assert');
const app = require('../../src/app/index.ts');
const core = require('../../src/core/index.ts');

function emitter(extra = {}) {
  const listeners = new Map();
  return {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
    emit(type) { listeners.get(type)?.({target:this}); },
    ...extra,
  };
}

function archiveFixture() {
  return core.createProjectArchive({
    project:{
      title:'Preview expedition',
      trails:[{
        id:'main', name:'Main', group:'A', track:[[30,100,1000], [30.01,100.01,1100]],
        day_meta:[{d:1, i_start:0, i_end:1}],
        waypoints:[{id:'camp', tag:'camp', photo:'data:image/png;base64,AA=='}],
        escape_routes:[{id:'exit', line:[[30,100], [30.01,100.01]]}],
      }],
    },
    state:{activeTrails:['main'], activeGroup:'A', primaryByGroup:{A:'main'}},
    appVersion:'v2.1.0', exportedAt:'2026-08-01T00:00:00.000Z',
  });
}

(async () => {
  console.log('\nProject restore UI');
  const source = archiveFixture();
  const text = core.serializeProjectArchive(source);
  const status = emitter({dataset:{}, style:{}, textContent:'', attributes:{}, ownerDocument:null,
    setAttribute(name, value) { this.attributes[name] = value; }});
  const button = emitter({disabled:false});
  const input = emitter({value:'selected', files:null});
  const events = [];
  let preview = null;
  const controller = app.bindProjectRestoreUi({
    button, input, status,
    dialogs:{
      content:async model => { preview = model; events.push('review'); return 'restore'; },
      info:async model => { events.push(`info:${model.title}`); },
    },
    archive:{
      parse:core.parseProjectArchive,
      restore:async archive => {
        events.push(`restore:${archive.project.title}`);
        return {status:'restored', trailCount:archive.project.trails.length};
      },
    },
    getLanguage:() => 'zh',
    beforeRestore:() => events.push('before'),
    afterRestore:() => events.push('after'),
    close:() => events.push('close'),
  });
  const restored = await controller.restoreFile({text:async () => text});
  assert.strictEqual(restored, true);
  assert.deepStrictEqual(events, ['review','before','restore:Preview expedition','after','close']);
  assert.strictEqual(status.dataset.restoreStage, 'complete');
  assert.match(status.textContent, /地图已复位/);
  assert.strictEqual(button.disabled, false);
  assert.strictEqual(input.value, '');
  assert.strictEqual(preview.danger, true);
  assert.strictEqual(preview.actions[0].id, 'restore');
  assert.ok(preview.sections.flatMap(section => section.rows || [])
    .some(row => row.label === '轨迹 / 轨迹点' && row.value === '1 / 2'));
  controller.destroy();
  console.log('  PASS preflight summary and staged restore flow');
  console.log('Result: 1/1 passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
