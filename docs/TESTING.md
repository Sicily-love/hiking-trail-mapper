# 测试指南 · Testing Guide

本文档说明 hiking-trail-mapper 的测试体系、什么时候跑、失败如何定位。

## 一键测试

```bash
# 在仓库根跑（github-release/hiking-trail-mapper/）
./tests/run_full_check.sh
npm run test:visual:capture
```

`npm run test:visual:capture` 必须在真实系统环境运行，会载入示例 KML 并输出 1440、1024、390、320 四档截图和布局报告；它不会在 Codex seatbelt 沙箱中启动 Chrome。

预期输出（v1.19.0+）：

```
✓ Phase 1 · JS 语法检查
✓ Phase 2 · 单元测试 + 对齐（117 + 71 项）
✓ Phase 2b · TypeScript / Vite 构建
✓ Phase 2c · 发布元数据一致性（43/43）
✓ Phase 3 · 静态验收（54/54）
✓ Phase 4 · 功能测试（130/130）
✓ Phase 5 · 端到端测试（63/63）
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
python3 tests/browser/test_skill.py
```

## 六个阶段详解

### Phase 1 · JS 语法检查

用 `node --check` 校验 HTML 里内联脚本的语法。

- **失败信号**：语法错误
- **如何修**：看错误行号，多半是拆分/合并操作时漏了括号

### Phase 2 · 单元测试（Node 层）

十一个测试脚本：

| 脚本 | 覆盖 | 项数 |
|------|------|------|
| `tests/unit/test_math.js` | haversine / smoothElev / accumulatorAscent/Descent / elevRatioColor / computeCumulativeDistance / computeTrailStats / generateNextTrailId | 30 |
| `tests/unit/test_enrich.js` | enrichWaypoints / trailContentHash | 12 |
| `tests/unit/test_core_contract.js` | `src/core/*.ts` 导出契约、CommonJS 兼容桥、跨模块组合行为 | 4 |
| `tests/unit/test_kml_core.js` | KML 坐标、`gx:coord`、图片 URL、短标签、标题兜底、导入模型组装等规则 | 11 |
| `tests/unit/test_storage_core.js` | IndexedDB 快照形状、读/写/删除操作模型、activeTrails 序列化、legacy primaryTrailId 迁移、activeGroup=null 和 primaryByGroup 清理 | 12 |
| `tests/unit/test_measure_itinerary.js` | A/B 测距、轨迹抽稀、海拔布局/绘制命令、分段恢复/拖动、Day 预览、每日统计、营地归属 | 29 |
| `tests/unit/test_vite_entry.js` | 开发入口、生产 Vite 入口、静态产物与内联 TypeScript 运行时契约 | 5 |
| `tests/unit/test_app_architecture.js` | app state、交互 controller、复位视野计划、海拔坞与 Leaflet adapter | 6 |
| `tests/unit/test_ui_contract.js` | Field Console、命令台裁切、复位视野、海拔坞、Day 时间轴、bottom sheet、真实状态截图与无障碍契约 | 11 |
| `tests/unit/test_release_pipeline.js` | 核心运行时重现、版本 bump、发布准备和 GitHub Pages 工作流 | 8 |
| `tests/unit/verify_alignment.js` | 正式 HTML 内嵌 runtime 与 `src/core` 行为对齐、无重复 fallback | 23 |

**特别注意 verify_alignment**：
`src/core/*.ts` 是纯函数运行时真源，`src/app`、`src/features` 和 `src/adapters` 是浏览器应用层真源；`scripts/build/generate_release_html.mjs` 会生成两个内联 runtime。对齐测试直接执行正式 HTML 中的 core IIFE，不再依赖重复函数源码。

### Phase 2b · TypeScript / Vite 构建

如果已经安装 `node_modules`，完整检查会继续执行：

```bash
npm run typecheck
npm run build -- --outDir .vite-build --emptyOutDir
```

构建会输出两个静态 HTML 入口和 `release.json`。没有安装依赖时普通完整检查会提示跳过 TypeScript/Vite 阶段，但正式发布必须先 `npm ci`，并使用 `npm run release:prepare`。

### Phase 2c · 发布元数据一致性

执行 `python3 scripts/release/check_release_metadata.py`，覆盖：

- HTML 注释、`<title>`、`APP_VERSION`、`CHANGELOG` 顶部、右下角版本标签
- `README.md` / `README.en.md`
- `package.json` / `package-lock.json`
- `index.html` 与 `hiking-trail-mapper.html` 是否同步
- 内联核心运行时、Vite 生产入口、构建/版本脚本与 npm 命令
- GitHub Pages Actions 版本、权限和部署入口
- `vite.config.mts`、`tsconfig.json` 与 `.gitignore` 约束

这一步只检查发布元数据，不改变业务代码。

### Phase 3 · 静态验收（tests/browser/test_skill.py）

54 项，覆盖：
- 版本号一致性（HTML 头注释、`<title>`、`APP_VERSION`、`version-tag` 五处必须相同）
- 关键函数存在（`buildTrailList` / `applyChange` 等）
- state 字段完整（`state.activeTrails` 是 Set，`state.primaryTrailId` 存在）
- i18n 完整（zh/en 键值对齐）
- 库依赖（Leaflet / fflate 内联版本）
- DOM 快照（sidebar / map 元素齐全）

### Phase 4 · 功能测试（headless Chrome）

`tests/browser/test_v1_31.py` — 130 项。运行时行为验证：
- 拆分后 22 个辅助函数（v1.17.0 + v1.18.0）都是 `typeof === 'function'`
- 大函数瘦身达成：`handleFiles < 30 行`、`drawElevBar < 40 行` 等
- KML.zip 端到端：解压 → __MACOSX 跳过 → 加入 DATA.trails

### Phase 5 · 端到端测试（16 大场景）

`tests/e2e/run_all.py` — 62 项，覆盖：

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
| E15 | 无选中分组（activeGroup=null） |
| E16 | 每组独立主轨迹 |

### Phase 6 · sync 一致性

跑 `scripts/release/sync_release.sh`：
- 从 skill 模板 `user-skills/hiking-trail-mapper/assets/online_kml_template.html` 反推到 github-release 通用版
- CHANGELOG 提取
- README 徽章更新
- 静态验收再跑一次

## 失败定位

### 单元测试失败

```bash
node tests/unit/test_math.js         # 单独跑单元
node tests/unit/test_core_contract.js # 检查 TS 核心模块导出契约
node tests/unit/test_storage_core.js # 检查 IndexedDB 状态快照契约
node tests/unit/test_measure_itinerary.js # 检查测距/分段核心契约
node tests/unit/test_vite_entry.js # 检查 Vite 开发入口契约
node tests/unit/verify_alignment.js  # 检查 src/core 是否与 HTML 同步
```

### 发布元数据失败

```bash
python3 scripts/release/check_release_metadata.py
```

多半是版本号、README、package lock、`index.html` 同步或构建配置文件名有一处没有跟随更新。

### 端到端失败

```bash
uv run --with websocket-client python3 tests/e2e/run_all.py 2>&1 | tail -30
```

查看具体失败的 E 编号，对应到源码位置。

### 静态验收失败

```bash
python3 tests/browser/test_skill.py 2>&1 | grep "✗"
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

在 `tests/unit/` 新建 `test_XXX.js`，优先用 `require('../../src/core/index.ts')`；若需要兼容旧测试，也可用 `require('./trail_core')`：

```javascript
const assert = require('assert');
const { yourFn } = require('../../src/core/index.ts');

// ... 断言
```

把 `yourFn` 加到 `src/core` 对应模块与 `src/core/index.ts`，必要时再加到 `verify_alignment.js`。

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
