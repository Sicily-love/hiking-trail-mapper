/**
 * Unit test · storage snapshot core contracts
 * Run: node tests/unit/test_storage_core.js
 */
const assert = require('assert');
const core = require('../../src/core/index.ts');

let passed = 0;
let failed = 0;
const T = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch(e) {
    console.log(`  ✗ ${name}\n    ${e.message}`);
    failed++;
  }
};

const trails = [
  { id: 'a1', group: 'A', name: 'A-1' },
  { id: 'a2', group: 'A', name: 'A-2' },
  { id: 'b1', group: 'B', name: 'B-1' },
];

console.log('\n▸ storage snapshot core');

T('storageTrailGroup defaults blank or missing groups', () => {
  assert.strictEqual(core.storageTrailGroup({ id: 'x', group: '' }), '默认');
  assert.strictEqual(core.storageTrailGroup({ id: 'x' }), '默认');
  assert.strictEqual(core.storageTrailGroup({ id: 'x', group: 'B' }), 'B');
});

T('normalizeActiveTrailIds defaults to all trail ids only when field is missing', () => {
  assert.deepStrictEqual([...core.normalizeActiveTrailIds(null, trails)], ['a1', 'a2', 'b1']);
  assert.deepStrictEqual([...core.normalizeActiveTrailIds([], trails)], []);
  assert.deepStrictEqual([...core.normalizeActiveTrailIds(new Set(['a2', 'ghost']), trails)], ['a2']);
});

T('normalizePrimaryByGroup keeps string ids and null sentinels', () => {
  assert.deepStrictEqual(core.normalizePrimaryByGroup({ A: 'a1', B: null, C: '', D: undefined }), {
    A: 'a1',
    B: null,
  });
});

T('serializeStorageSnapshot writes the same minimal IndexedDB shape as HTML', () => {
  const snapshot = core.serializeStorageSnapshot(trails, {
    primaryTrailId: 'a2',
    primaryByGroup: { A: 'a2', B: 'b1' },
    activeTrails: new Set(['a1', 'b1']),
    activeGroup: 'A',
  });
  assert.strictEqual(snapshot.primaryTrailId, 'a2');
  assert.deepStrictEqual(snapshot.primaryByGroup, { A: 'a2', B: 'b1' });
  assert.deepStrictEqual(snapshot.activeTrails, ['a1', 'b1']);
  assert.strictEqual(snapshot.activeGroup, 'A');
  assert.strictEqual(snapshot.trails, trails);
});

T('normalizeIndexedDbStorageConfig supplies stable defaults and overrides', () => {
  assert.deepStrictEqual(core.normalizeIndexedDbStorageConfig(), {
    storeName: 'trails',
    dataKey: 'main',
  });
  assert.deepStrictEqual(core.normalizeIndexedDbStorageConfig({ storeName: 'custom', dataKey: 'entry' }), {
    storeName: 'custom',
    dataKey: 'entry',
  });
  assert.deepStrictEqual(core.normalizeIndexedDbStorageConfig({ storeName: '', dataKey: '' }), {
    storeName: 'trails',
    dataKey: 'main',
  });
});

T('buildStorageReadOperation and buildStorageDeleteOperation describe IndexedDB requests', () => {
  assert.deepStrictEqual(core.buildStorageReadOperation({ storeName: 's', dataKey: 'k' }), {
    kind: 'read',
    mode: 'readonly',
    storeName: 's',
    key: 'k',
  });
  assert.deepStrictEqual(core.buildStorageDeleteOperation({ storeName: 's', dataKey: 'k' }), {
    kind: 'delete',
    mode: 'readwrite',
    storeName: 's',
    key: 'k',
  });
});

T('buildStorageWriteOperation wraps serialized snapshot for IndexedDB put', () => {
  const op = core.buildStorageWriteOperation(trails, {
    primaryTrailId: 'a1',
    primaryByGroup: { A: 'a1' },
    activeTrails: new Set(['a1']),
    activeGroup: 'A',
  }, { storeName: 's', dataKey: 'k' });
  assert.strictEqual(op.kind, 'write');
  assert.strictEqual(op.mode, 'readwrite');
  assert.strictEqual(op.storeName, 's');
  assert.strictEqual(op.key, 'k');
  assert.deepStrictEqual(op.value.activeTrails, ['a1']);
  assert.deepStrictEqual(op.value.primaryByGroup, { A: 'a1' });
});

T('restoreStorageSnapshot restores new primaryByGroup format', () => {
  const restored = core.restoreStorageSnapshot({
    trails,
    primaryByGroup: { A: 'a2', B: 'b1' },
    activeTrails: ['a1'],
    activeGroup: 'A',
  });
  assert.strictEqual(restored.ok, true);
  assert.deepStrictEqual([...restored.activeTrails], ['a1']);
  assert.strictEqual(restored.activeGroup, 'A');
  assert.strictEqual(restored.primaryTrailId, 'a2');
});

T('restoreStorageSnapshot preserves activeGroup=null as no active primary', () => {
  const restored = core.restoreStorageSnapshot({
    trails,
    primaryByGroup: { A: 'a1' },
    activeTrails: ['a1'],
    activeGroup: null,
  });
  assert.strictEqual(restored.ok, true);
  assert.strictEqual(restored.activeGroup, null);
  assert.strictEqual(restored.primaryTrailId, null);
});

T('restoreStorageSnapshot migrates legacy primaryTrailId into active group', () => {
  const restored = core.restoreStorageSnapshot({
    trails,
    primaryTrailId: 'b1',
    activeTrails: ['b1'],
  }, { currentActiveGroup: 'B' });
  assert.strictEqual(restored.activeGroup, 'B');
  assert.deepStrictEqual(restored.primaryByGroup, { B: 'b1' });
  assert.strictEqual(restored.primaryTrailId, 'b1');
});

T('ensurePrimaryForActiveGroup fills the first trail in that group', () => {
  assert.deepStrictEqual(core.ensurePrimaryForActiveGroup(trails, 'A', {}), { A: 'a1' });
  assert.deepStrictEqual(core.ensurePrimaryForActiveGroup(trails, 'A', { A: 'ghost', B: 'b1' }), { A: 'a1', B: 'b1' });
  assert.deepStrictEqual(core.ensurePrimaryForActiveGroup(trails, 'A', { A: 'b1' }), { A: 'a1' });
  assert.deepStrictEqual(core.ensurePrimaryForActiveGroup(trails, null, {}), {});
});

T('removeTrailFromPrimaryByGroup replaces or removes stale group primary', () => {
  assert.deepStrictEqual(core.removeTrailFromPrimaryByGroup(
    trails.filter(t => t.id !== 'a1'),
    { A: 'a1', B: 'b1' },
    'a1',
  ), { A: 'a2', B: 'b1' });
  assert.deepStrictEqual(core.removeTrailFromPrimaryByGroup(
    trails.filter(t => t.group !== 'B'),
    { B: 'b1' },
    'b1',
  ), {});
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed + failed} passed`);
process.exit(failed === 0 ? 0 : 1);
