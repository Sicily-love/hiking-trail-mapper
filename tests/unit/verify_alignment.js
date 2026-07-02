#!/usr/bin/env node
/**
 * trail_core.js 与 HTML 内实现的一致性校准
 * 
 * 用法：node tests/unit/verify_alignment.js
 *
 * 原理：从 HTML 里 grep 出目标函数源码 → new Function 执行 → 与 trail_core.js 输出对比
 */
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '../../hiking-trail-mapper.html');
const CORE = require('./trail_core');

const html = fs.readFileSync(HTML_PATH, 'utf8');

// 从 HTML 提取指定顶层函数的源码（简单版：找 "function NAME(" 到下一个 "^function " 之前）
function extractFn(name) {
  const pat = new RegExp(`\\nfunction ${name}\\s*\\([\\s\\S]*?\\n\\}\\n`, 'm');
  const m = html.match(pat);
  if(!m) throw new Error(`未找到 function ${name} 的源码`);
  return m[0].trim();
}

// 组合运行环境：把依赖函数一起 eval
function makeRunner(names) {
  const src = names.map(extractFn).join('\n\n') + `\n\nreturn { ${names.join(', ')} };`;
  return new Function(src)();
}

const { haversine, smoothElev, accumulatorAscent, accumulatorDescent, elevRatioColor } =
  makeRunner(['haversine', 'smoothElev', 'accumulatorAscent', 'accumulatorDescent', 'elevRatioColor']);

let ok = 0, bad = 0;
function eq(name, a, b) {
  const strA = JSON.stringify(a);
  const strB = JSON.stringify(b);
  if(strA === strB) { console.log(`  ✓ ${name}`); ok++; }
  else { console.log(`  ✗ ${name}\n    HTML:  ${strA}\n    core:  ${strB}`); bad++; }
}

console.log('\n▸ HTML vs trail_core.js — 数值对齐校准');

// haversine
eq('haversine 北京→上海',
  haversine(39.9042, 116.4074, 31.2304, 121.4737),
  CORE.haversine(39.9042, 116.4074, 31.2304, 121.4737));

// smoothElev
eq('smoothElev 默认 win=7',
  smoothElev([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]),
  CORE.smoothElev([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]));
eq('smoothElev win=3',
  smoothElev([1000, 1200, 800, 1100, 900, 1300, 1000], 3),
  CORE.smoothElev([1000, 1200, 800, 1100, 900, 1300, 1000], 3));

// accumulatorAscent
eq('accumulatorAscent thr=10 混合序列',
  accumulatorAscent([1000, 1200, 800, 1500, 1100, 1400, 1300, 1600], 10),
  CORE.accumulatorAscent([1000, 1200, 800, 1500, 1100, 1400, 1300, 1600], 10));
eq('accumulatorAscent thr=5 噪声',
  accumulatorAscent([100, 105, 100, 108, 102, 110], 5),
  CORE.accumulatorAscent([100, 105, 100, 108, 102, 110], 5));

// accumulatorDescent
eq('accumulatorDescent thr=10',
  accumulatorDescent([1500, 1200, 800, 1000, 700, 900, 500], 10),
  CORE.accumulatorDescent([1500, 1200, 800, 1000, 700, 900, 500], 10));

// elevRatioColor
[0, 0.1, 0.35, 0.5, 0.65, 0.8, 1.0].forEach(r => {
  eq(`elevRatioColor(${r})`,
    elevRatioColor(r),
    CORE.elevRatioColor(r));
});

console.log('\n══════════════════════════════════════════════════');
console.log(`结果: ${ok}/${ok+bad} 对齐`);
process.exit(bad === 0 ? 0 : 1);
