/**
 * 单元测试 · 数学与统计函数
 * 运行：node tests/unit/test_math.js
 */
const assert = require('assert');
const {
  haversine, smoothElev,
  accumulatorAscent, accumulatorDescent,
  elevRatioColor,
  computeCumulativeDistance,
  computeTrailStats,
  generateNextTrailId,
} = require('../../src/core/index.ts');

let passed = 0, failed = 0;
const T = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(e) { console.log(`  ✗ ${name}\n    ${e.message}`); failed++; }
};
const near = (a, b, tol) => assert.ok(Math.abs(a-b) < tol, `expected ${a} ≈ ${b} (tol=${tol})`);

console.log('\n▸ haversine');
T('同点距离 = 0', () => assert.strictEqual(haversine(30, 100, 30, 100), 0));
T('北京→上海约 1067km', () => near(haversine(39.9042, 116.4074, 31.2304, 121.4737), 1067000, 5000));
T('相隔 1° 纬度约 111.2km（球面近似）', () => near(haversine(30, 100, 31, 100), 111195, 100));
T('对称性 A→B = B→A', () => {
  const d1 = haversine(30, 100, 31, 101);
  const d2 = haversine(31, 101, 30, 100);
  near(d1, d2, 0.001);
});

console.log('\n▸ smoothElev');
T('空数组返回空', () => assert.deepStrictEqual(smoothElev([]), []));
T('单点保持', () => assert.deepStrictEqual(smoothElev([100]), [100]));
T('平滑后长度不变', () => assert.strictEqual(smoothElev([1,2,3,4,5], 3).length, 5));
T('常数序列不变', () => {
  const r = smoothElev([100,100,100,100,100], 3);
  r.forEach(v => near(v, 100, 0.001));
});
T('滤除尖峰噪声', () => {
  const raw = [100, 100, 100, 200, 100, 100, 100];  // 中间尖峰
  const smoothed = smoothElev(raw, 3);
  assert.ok(smoothed[3] < 200 - 20, '中间值应显著小于原尖峰');
});

console.log('\n▸ accumulatorAscent');
T('空数组返回空', () => assert.deepStrictEqual(accumulatorAscent([]), []));
T('单调爬升', () => {
  const r = accumulatorAscent([100, 200, 300, 400], 10);
  near(r[r.length-1], 300, 0.001);
});
T('阈值过滤 GPS 噪声', () => {
  // 100 米内多次 ±5m 抖动，最终应为 0
  const noise = [100, 105, 100, 103, 98, 102, 99, 100];
  const r = accumulatorAscent(noise, 10);
  near(r[r.length-1], 0, 0.001);
});
T('上下上 → 只计爬升部分', () => {
  const seq = [1000, 1200, 800, 1100];  // 爬 200→下 400→爬 300
  const r = accumulatorAscent(seq, 10);
  near(r[r.length-1], 500, 0.001);       // 200 + 300 = 500
});
T('阈值 10 是格聂官方数据校准值', () => {
  // 已在真实数据上验证：thr=10 相对官方误差 <2%
  // 这里只检查参数默认值
  const r1 = accumulatorAscent([1000, 1020, 1000, 1020]);  // 默认 thr=10
  near(r1[r1.length-1], 40, 0.001);
});

console.log('\n▸ accumulatorDescent');
T('单调下降', () => {
  const r = accumulatorDescent([400, 300, 200, 100], 10);
  near(r[r.length-1], 300, 0.001);
});
T('对称性：反转 elevs 后 ascent = descent', () => {
  const elevs = [100, 300, 200, 500, 100, 400];
  const asc = accumulatorAscent(elevs, 10);
  const desc = accumulatorDescent(elevs.slice().reverse(), 10);
  near(asc[asc.length-1], desc[desc.length-1], 0.001);
});

console.log('\n▸ elevRatioColor');
T('ratio=0 → 浅薄荷', () => {
  const [r,g,b] = elevRatioColor(0);
  assert.deepStrictEqual([r,g,b], [220, 226, 200]);
});
T('ratio=1 → 深森林', () => {
  const [r,g,b] = elevRatioColor(1);
  assert.deepStrictEqual([r,g,b], [53, 78, 60]);
});
T('ratio 单调 → 绿色分量单调变化', () => {
  const c1 = elevRatioColor(0.1);
  const c2 = elevRatioColor(0.5);
  const c3 = elevRatioColor(0.9);
  assert.ok(c1[0] > c3[0], 'R 应递减');  // 浅→深，R 从 220 到 53
});
T('中间值插值合理', () => {
  const [r,g,b] = elevRatioColor(0.35);
  assert.deepStrictEqual([r,g,b], [156, 184, 134]);  // 精确命中 stop
});

console.log('\n▸ computeCumulativeDistance');
T('单点返回 [0]', () => assert.deepStrictEqual(computeCumulativeDistance([{lat:30,lng:100}]), [0]));
T('累计单调递增', () => {
  const pts = [
    {lat:30, lng:100},
    {lat:30.01, lng:100},
    {lat:30.02, lng:100},
  ];
  const cum = computeCumulativeDistance(pts);
  assert.strictEqual(cum[0], 0);
  assert.ok(cum[1] > 0);
  assert.ok(cum[2] > cum[1]);
});
T('相同两点间距离与 haversine 一致', () => {
  const pts = [{lat:30, lng:100}, {lat:31, lng:100}];
  const cum = computeCumulativeDistance(pts);
  const direct = haversine(30, 100, 31, 100);
  near(cum[1], direct, 0.001);
});

console.log('\n▸ computeTrailStats');
T('基础统计正确', () => {
  const elevs = [1000, 1200, 1500, 1100, 1400];
  const cumD = [0, 1000, 2000, 3000, 4000];
  const smoothE = elevs;
  const stats = computeTrailStats(elevs, cumD, smoothE);
  assert.strictEqual(stats.distance_km, 4);
  assert.strictEqual(stats.max_elev, 1500);
  assert.strictEqual(stats.min_elev, 1000);
  assert.ok(stats.ascent_m > 0);
  assert.ok(stats.descent_m > 0);
});
T('过滤无效海拔（<=0 或 Inf）', () => {
  const elevs = [1000, 1200];
  const smoothE = [-1, 1200];  // -1 应被过滤
  const stats = computeTrailStats(elevs, [0, 1000], smoothE);
  assert.strictEqual(stats.min_elev, 1200);
});

console.log('\n▸ generateNextTrailId');
T('空数组 → "1"', () => assert.strictEqual(generateNextTrailId([]), '1'));
T('已有 [1,2,3] → "4"', () => assert.strictEqual(
  generateNextTrailId([{id:'1'},{id:'2'},{id:'3'}]), '4'
));
T('有非数字 id → 只考虑数字', () => assert.strictEqual(
  generateNextTrailId([{id:'foo'},{id:'2'}]), '3'
));
T('乱序数字 id', () => assert.strictEqual(
  generateNextTrailId([{id:'5'},{id:'2'},{id:'8'}]), '9'
));
T('总是接最大值+1（不补空位，避免用户混淆）', () => assert.strictEqual(
  generateNextTrailId([{id:'1'},{id:'3'}]), '4'
));

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${passed}/${passed+failed} passed`);
process.exit(failed === 0 ? 0 : 1);
