# 测试指南 · Testing Guide

本文档说明 hiking-trail-mapper 的测试体系、什么时候跑、失败如何定位。

## 一键测试

```bash
# 在仓库根跑（github-release/hiking-trail-mapper/）
./tests/run_full_check.sh
```

预期输出（v1.19.0+）：

```
✓ Phase 1 · JS 语法检查
✓ Phase 2 · 单元测试 + 对齐（42 + 13 项）
✓ Phase 3 · 静态验收（54/54）
✓ Phase 4 · 功能测试（55/55）
✓ Phase 5 · 端到端测试（39/39）
✓ Phase 6 · sync 一致性检查
✓ 全部 6 个阶段测试通过
```

## 何时跑

### 必跑（大改动定义）

任何以下情形，改动后必须跑一次 `run_full_check.sh`：

- **重构 300+ 行函数** —— 例如 `drawElevBar` / `handleFiles` / `parseAndProcessKml`
- **新增或删除 state 字段** —— 例如 `state.activeTrails` / `state.primaryTrailId` 等
- **修改数据结构** —— 例如 Trail / Waypoint / DayMeta 的字段增删
- **修改 IO 层** —— `parseKml` / `handleFiles` / KML 导出
- **升级次版本号或主版本号** —— `vX.Y.0` 或 `vX.0.0`

### 建议跑（小改动）

- 修改 CSS 类名
- 修改 i18n 翻译
- 修改渲染函数内部实现（保持输入输出接口不变）

至少跑 Phase 1（语法） + Phase 3（静态）：

```bash
node --check /tmp/htm-inline.js
python3 scripts/test_skill.py
```

## 六个阶段详解

### Phase 1 · JS 语法检查

用 `node --check` 校验 HTML 里内联脚本的语法。

- **失败信号**：语法错误
- **如何修**：看错误行号，多半是拆分/合并操作时漏了括号

### Phase 2 · 单元测试（Node 层）

三个测试脚本：

| 脚本 | 覆盖 | 项数 |
|------|------|------|
| `tests/unit/test_math.js` | haversine / smoothElev / accumulatorAscent/Descent / elevRatioColor / computeCumulativeDistance / computeTrailStats / generateNextTrailId | 30 |
| `tests/unit/test_enrich.js` | enrichWaypoints / trailContentHash | 12 |
| `tests/unit/verify_alignment.js` | `trail_core.js` 与 HTML 内实现对齐 | 13 |

**特别注意 verify_alignment**：
`tests/unit/trail_core.js` 是 HTML 里纯函数的**镜像副本**（供 Node 端复用与测试）。
如果修改了 HTML 里的 haversine / accumulatorAscent 等，**必须同步 `trail_core.js`**，否则对齐测试会失败。

### Phase 3 · 静态验收（scripts/test_skill.py）

54 项，覆盖：
- 版本号一致性（HTML 头注释、`<title>`、`APP_VERSION`、`version-tag` 五处必须相同）
- 关键函数存在（`buildTrailList` / `applyChange` 等）
- state 字段完整（`state.activeTrails` 是 Set，`state.primaryTrailId` 存在）
- i18n 完整（zh/en 键值对齐）
- 库依赖（Leaflet / fflate 内联版本）
- DOM 快照（sidebar / map 元素齐全）

### Phase 4 · 功能测试（headless Chrome）

`scripts/test_v1_18.py` — 55 项。运行时行为验证：
- 拆分后 22 个辅助函数（v1.17.0 + v1.18.0）都是 `typeof === 'function'`
- 大函数瘦身达成：`handleFiles < 30 行`、`drawElevBar < 40 行` 等
- KML.zip 端到端：解压 → __MACOSX 跳过 → 加入 DATA.trails

### Phase 5 · 端到端测试（14 大场景）

`tests/e2e/run_all.py` — 39 项，覆盖：

| ID | 场景 |
|----|------|
| E1 | 空 workspace 启动 |
| E2 | 导入单个 KML |
| E3 | 导入 KML.zip（含 __MACOSX 跳过） |
| E4 | 导入重复 KML（去重） |
| E5 | 切换主轨迹 |
| E6 | 批量选择 + 移动分组 |
| E7 | 反转轨迹方向 |
| E8 | 删除轨迹（activeTrails / primaryTrailId 兜底） |
| E9 | waypoint 过滤（default 与自定义） |
| E10 | 分天 tab 切换 + elev bar 重绘 |
| E11 | IndexedDB 持久化 |
| E12 | i18n 中英切换 |
| E13 | KML 导出 |
| E14 | file:// 运行时错误检测 |

### Phase 6 · sync 一致性

跑 `scripts/sync_release.sh`：
- 从 skill 模板 `user-skills/hiking-trail-mapper/assets/online_kml_template.html` 反推到 github-release 通用版
- CHANGELOG 提取
- README 徽章更新
- 静态验收再跑一次

## 失败定位

### 单元测试失败

```bash
node tests/unit/test_math.js         # 单独跑单元
node tests/unit/verify_alignment.js  # 检查是否 trail_core.js 未同步
```

### 端到端失败

```bash
uv run --with websocket-client python3 tests/e2e/run_all.py 2>&1 | tail -30
```

查看具体失败的 E 编号，对应到源码位置。

### 静态验收失败

```bash
python3 scripts/test_skill.py 2>&1 | grep "✗"
```

多半是版本号有一处没更新，或者某个新增字段没登记到快照。

## 修改测试脚本

**测试是可信基线**——只有当你**故意改变行为**时才改测试期望值。

失败时的判断顺序：

1. 我是不是**引入了 bug**？ → 修实现
2. 我是不是**故意改了行为**？ → 更新测试期望值 + CHANGELOG 说明
3. 测试用例**本身有问题**？ → 极少见，但要写清楚为什么

## 添加新测试

### 加一个单元测试

在 `tests/unit/` 新建 `test_XXX.js`，用 `require('./trail_core')`：

```javascript
const assert = require('assert');
const { yourFn } = require('./trail_core');

// ... 断言
```

把 `yourFn` 也加到 `tests/unit/trail_core.js` 和 `verify_alignment.js`。

### 加一个 E2E 场景

在 `tests/e2e/run_all.py` 追加一段：

```python
print("\n▸ E15 · 你的场景")
r = evalj("""
  (async () => {
    // ... 触发行为
    return { ok: ..., someField: ... };
  })()
""")
check("断言 1", r.get("ok") == True)
```
