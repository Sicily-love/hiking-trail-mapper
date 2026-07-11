/** Unit tests for the Workbench command registry and dialog source contracts. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const { CommandRegistry } = require(path.join(root, 'src/app/command.ts'));
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
