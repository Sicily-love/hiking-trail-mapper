/**
 * 单元测试 · 标注 snap 与去重
 * 运行：node tests/unit/test_enrich.js
 */
const assert = require('assert');
const { enrichWaypoints, trailContentHash, haversine } = require('./trail_core');

let passed = 0, failed = 0;
const T = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(e) { console.log(`  ✗ ${name}\n    ${e.message}`); failed++; }
};

console.log('\n▸ enrichWaypoints — snap 到最近 GPS 点');
T('单点轨迹 → gps_idx=0', () => {
  const wps = [{ lat: 30, lng: 100, name: 'a' }];
  const pts = [{ lat: 30, lng: 100, elev: 1000 }];
  const r = enrichWaypoints(wps, pts);
  assert.strictEqual(r[0].gps_idx, 0);
  assert.strictEqual(r[0].elev, 1000);
});

T('多点：应挑最近的一个', () => {
  const pts = [
    { lat: 30.0, lng: 100.0, elev: 1000 },
    { lat: 30.5, lng: 100.0, elev: 1500 },
    { lat: 31.0, lng: 100.0, elev: 2000 },
  ];
  const wps = [{ lat: 30.9, lng: 100.0, name: 'p' }];  // 应贴到 idx=2
  const r = enrichWaypoints(wps, pts);
  assert.strictEqual(r[0].gps_idx, 2);
  assert.strictEqual(r[0].elev, 2000);
});

T('保留原有字段（tag/desc）', () => {
  const pts = [{ lat: 30, lng: 100, elev: 1000 }];
  const wps = [{ lat: 30, lng: 100, name: 'camp1', tag: 'camp', desc: '扎营点' }];
  const r = enrichWaypoints(wps, pts);
  assert.strictEqual(r[0].tag, 'camp');
  assert.strictEqual(r[0].desc, '扎营点');
});

T('label 默认取自 name', () => {
  const r = enrichWaypoints(
    [{ lat: 30, lng: 100, name: '拉库垭口 4680m' }],
    [{ lat: 30, lng: 100, elev: 4680 }]
  );
  assert.strictEqual(r[0].label, '拉库垭口 4680m');
});

T('空 waypoints → 空数组', () => {
  const r = enrichWaypoints([], [{ lat: 30, lng: 100, elev: 1000 }]);
  assert.deepStrictEqual(r, []);
});

T('多个标注 → 各自 snap', () => {
  const pts = [
    { lat: 30.0, lng: 100.0, elev: 1000 },
    { lat: 30.5, lng: 100.0, elev: 1500 },
    { lat: 31.0, lng: 100.0, elev: 2000 },
  ];
  const wps = [
    { lat: 30.01, lng: 100.0, name: 'a' },
    { lat: 30.51, lng: 100.0, name: 'b' },
    { lat: 30.99, lng: 100.0, name: 'c' },
  ];
  const r = enrichWaypoints(wps, pts);
  assert.strictEqual(r[0].gps_idx, 0);
  assert.strictEqual(r[1].gps_idx, 1);
  assert.strictEqual(r[2].gps_idx, 2);
});

console.log('\n▸ trailContentHash — 去重哈希');
T('空 trail → 稳定值', () => {
  assert.strictEqual(trailContentHash({ track: [] }), '0');
  assert.strictEqual(trailContentHash(null), '0');
});

T('相同轨迹 → 相同哈希', () => {
  const t = { track: [[30, 100, 1000], [30.1, 100.1, 1100], [30.2, 100.2, 1200]] };
  const h1 = trailContentHash(t);
  const h2 = trailContentHash(t);
  assert.strictEqual(h1, h2);
});

T('相同点数但坐标不同 → 不同哈希', () => {
  const t1 = { track: [[30, 100, 1000], [30.1, 100.1, 1100]] };
  const t2 = { track: [[30, 100, 1000], [30.5, 100.5, 1100]] };  // 中点差异大
  assert.notStrictEqual(trailContentHash(t1), trailContentHash(t2));
});

T('点数不同 → 不同哈希', () => {
  const t1 = { track: [[30, 100, 1000], [30.1, 100, 1100]] };
  const t2 = { track: [[30, 100, 1000], [30.1, 100, 1100], [30.2, 100, 1200]] };
  assert.notStrictEqual(trailContentHash(t1), trailContentHash(t2));
});

T('相同起终点、不同中点 → 不同哈希（防御性）', () => {
  const t1 = { track: [[30,100,1000],[30.5,100.5,1500],[31,101,2000]] };
  const t2 = { track: [[30,100,1000],[30.3,100.3,1300],[31,101,2000]] };
  assert.notStrictEqual(trailContentHash(t1), trailContentHash(t2));
});

T('小数精度容忍：5 位小数外差异不影响', () => {
  // toFixed(5) 会把 1e-6 级别的差异抹平
  const t1 = { track: [[30.000001, 100, 1000], [30.5, 100.5, 1500], [31, 101, 2000]] };
  const t2 = { track: [[30.000002, 100, 1000], [30.5, 100.5, 1500], [31, 101, 2000]] };
  assert.strictEqual(trailContentHash(t1), trailContentHash(t2));
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed+failed} passed`);
process.exit(failed === 0 ? 0 : 1);
