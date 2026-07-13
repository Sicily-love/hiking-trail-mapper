/** Unit tests for the Workbench command registry and dialog source contracts. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const { CommandRegistry, STUDIO_COMMANDS } = require(path.join(root, 'src/app/command.ts'));
const bootstrapSource = fs.readFileSync(path.join(root, 'src/app/bootstrap.ts'), 'utf8');
const { runtimeSource } = require('./runtime_source');
const workbenchSource = fs.readFileSync(path.join(root, 'src/ui/layout/workbench.ts'), 'utf8');
const dialogSource = fs.readFileSync(
  path.join(root, 'src/ui/dialog/controller.ts'),
  'utf8',
);
const dialogIndex = fs.readFileSync(
  path.join(root, 'src/ui/dialog/index.ts'),
  'utf8',
);

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('registers, dispatches, returns results, and disposes commands', () => {
  const registry = new CommandRegistry();
  const dispose = registry.register({
    id: 'trail.rename',
    execute: context => `${context.name}-updated`,
  });

  assert.strictEqual(registry.has('trail.rename'), true);
  assert.deepStrictEqual(registry.ids(), ['trail.rename']);
  assert.strictEqual(registry.dispatch('trail.rename', { name: 'ridge' }), 'ridge-updated');
  dispose();
  dispose();
  assert.strictEqual(registry.has('trail.rename'), false);
});

test('evaluates dynamic enabled and checked state before dispatch', () => {
  const registry = new CommandRegistry();
  let executions = 0;
  registry.register({
    id: 'trail.toggle',
    enabled: context => context.editable,
    checked: context => context.visible,
    execute: () => { executions += 1; },
  });

  const disabled = { editable: false, visible: true };
  assert.deepStrictEqual(registry.getState('trail.toggle', disabled), {
    enabled: false,
    checked: true,
  });
  assert.strictEqual(registry.enabled('trail.toggle', disabled), false);
  assert.strictEqual(registry.checked('trail.toggle', disabled), true);
  assert.strictEqual(registry.dispatch('trail.toggle', disabled), undefined);
  assert.strictEqual(executions, 0);

  registry.dispatch('trail.toggle', { editable: true, visible: false });
  assert.strictEqual(executions, 1);
  assert.deepStrictEqual(registry.getState('missing', disabled), {
    enabled: false,
    checked: false,
  });
});

test('publishes lifecycle events and supports unsubscribe', () => {
  const registry = new CommandRegistry();
  const events = [];
  const unsubscribe = registry.subscribe(event => events.push(event));
  const dispose = registry.register({ id: 'map.fit', execute: () => 'done' });

  registry.notifyChanged('map.fit');
  registry.notify();
  registry.dispatch('map.fit');
  dispose();
  assert.deepStrictEqual(events, [
    { type: 'registered', id: 'map.fit' },
    { type: 'changed', id: 'map.fit' },
    { type: 'changed', id: undefined },
    { type: 'dispatched', id: 'map.fit' },
    { type: 'unregistered', id: 'map.fit' },
  ]);

  unsubscribe();
  registry.notifyChanged();
  assert.strictEqual(events.length, 5);
});

test('rejects duplicate and unknown command ids', () => {
  const registry = new CommandRegistry();
  registry.register({ id: 'map.reset', execute: () => undefined });
  assert.throws(
    () => registry.register({ id: 'map.reset', execute: () => undefined }),
    /already registered/,
  );
  assert.throws(() => registry.dispatch('map.missing'), /Unknown command/);
  assert.throws(
    () => registry.register({ id: '  ', execute: () => undefined }),
    /non-empty/,
  );
});

test('Studio command ids are unique semantic identifiers', () => {
  const ids = Object.values(STUDIO_COMMANDS);
  assert.strictEqual(new Set(ids).size, ids.length);
  ids.forEach(id => assert.match(id, /^[a-z]+(?:\.[a-z]+)+$/));
  assert.strictEqual(ids.some(id => id.endsWith('-btn')), false);
});

test('notifies subscribers after asynchronous dispatch settles', async () => {
  const registry = new CommandRegistry();
  registry.register({
    id: 'trail.save',
    execute: async context => {
      await Promise.resolve();
      return context.value;
    },
  });
  const events = [];
  registry.subscribe(event => events.push(event.type));

  const pending = registry.dispatch('trail.save', { value: 42 });
  assert.deepStrictEqual(events, []);
  assert.strictEqual(await pending, 42);
  assert.deepStrictEqual(events, ['dispatched']);
});

test('publishes one dispatch event when a command throws', () => {
  const registry = new CommandRegistry();
  registry.register({
    id: 'trail.fail',
    execute: () => { throw new Error('save failed'); },
  });
  const events = [];
  registry.subscribe(event => events.push(event.type));

  assert.throws(() => registry.dispatch('trail.fail'), /save failed/);
  assert.deepStrictEqual(events, ['dispatched']);
});

test('dialog controller exposes one native modal API surface', () => {
  assert.ok(dialogSource.includes('export class DialogController'));
  assert.ok(dialogSource.includes('info(options:'));
  assert.ok(dialogSource.includes('confirm(options:'));
  assert.ok(dialogSource.includes('prompt(options:'));
  assert.ok(dialogSource.includes('openCustom<TResult>'));
  assert.ok(dialogSource.includes("createElement('dialog')"));
  assert.ok(dialogSource.includes('.showModal()'));
  assert.ok(dialogSource.includes("createButton(normalized.okLabel ?? 'OK', 'primary', true, true)"));
  assert.ok(dialogIndex.includes('createDialogController'));
});

test('dialog strings use textContent and never HTML injection sinks', () => {
  assert.ok(dialogSource.includes('.textContent ='));
  assert.strictEqual(dialogSource.includes('innerHTML'), false);
  assert.strictEqual(dialogSource.includes('insertAdjacentHTML'), false);
  assert.strictEqual(/window\.(alert|confirm|prompt)\s*\(/.test(dialogSource), false);
});

test('dialog contract restores focus and handles Escape and danger state', () => {
  assert.ok(dialogSource.includes('previousFocus'));
  assert.ok(dialogSource.includes('queueMicrotask(restoreFocus)'));
  assert.ok(dialogSource.includes("addEventListener('cancel'"));
  assert.ok(dialogSource.includes("event.key !== 'Escape'"));
  assert.ok(dialogSource.includes("dialog.dataset.variant = options.danger ? 'danger' : 'default'"));
  assert.ok(dialogSource.includes("workbench-dialog--danger"));
  assert.ok(dialogSource.includes("normalized.danger ? 'danger' : 'primary'"));
});

test('bootstrap creates one command and dialog runtime before classic execution', () => {
  const commandIndex = bootstrapSource.indexOf('new app.CommandRegistry<void>()');
  const dialogIndex = bootstrapSource.indexOf('app.createDialogController(document)');
  const runtimeIndex = bootstrapSource.indexOf("executeClassicScript(document, runtimeSource, 'runtime.js')");
  const workbenchIndex = bootstrapSource.indexOf('resolveWorkbenchStorage(document),\n    commands,');
  assert.ok(commandIndex >= 0 && commandIndex < runtimeIndex);
  assert.ok(dialogIndex >= 0 && dialogIndex < runtimeIndex);
  assert.ok(workbenchIndex > runtimeIndex);
  assert.ok(bootstrapSource.includes('window.__HTM_COMMAND_REGISTRY__ = commands'));
  assert.ok(bootstrapSource.includes('window.__HTM_DIALOG_CONTROLLER__ = dialogs'));
});

test('Workbench command surfaces only dispatch semantic commands', () => {
  assert.ok(workbenchSource.includes('command.dataset.commandId = commandDefinition.commandId'));
  assert.ok(workbenchSource.includes('dispatchCommand(commandDefinition.commandId)'));
  assert.ok(workbenchSource.includes('dispatchCommand(definition.commandId)'));
  assert.ok(workbenchSource.includes('commandRegistry.subscribe(event =>'));
  assert.strictEqual(workbenchSource.includes('?.click()'), false);
});

test('runtime registers primary commands without native dialogs or onclick handlers', () => {
  [
    'FILE_IMPORT', 'FILE_EXPORT', 'PROJECT_CLEAR', 'TRAIL_REVERSE',
    'MEASURE_TOGGLE', 'SEGMENT_TOGGLE', 'WAYPOINT_TOGGLE', 'ESCAPE_TOGGLE',
    'MAP_RESET', 'HELP_OPEN', 'LANGUAGE_TOGGLE', 'INTERACTION_CANCEL',
  ].forEach(name => assert.ok(runtimeSource.includes(`register(STUDIO_COMMANDS.${name}`), name));
  assert.strictEqual(/(^|[^.\w])(alert|confirm|prompt)\s*\(/m.test(runtimeSource), false);
  assert.strictEqual(runtimeSource.includes('onclick='), false);
  assert.strictEqual(/\.onclick\s*=/.test(runtimeSource), false);
  assert.strictEqual(runtimeSource.includes("document.getElementById('export-btn').addEventListener"), false);
  assert.strictEqual(runtimeSource.includes("document.getElementById('clear-btn').addEventListener"), false);
});

(async () => {
  let passed = 0;
  let failed = 0;
  console.log('\n> Command registry and dialog contracts');
  for(const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  PASS ${name}`);
      passed += 1;
    } catch(error) {
      console.log(`  FAIL ${name}\n    ${error.stack || error.message}`);
      failed += 1;
    }
  }

  console.log(`\nResult: ${passed}/${passed + failed} passed`);
  process.exitCode = failed === 0 ? 0 : 1;
})();
