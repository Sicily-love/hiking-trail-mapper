# Outdoor Route Studio 测试指南

**[中文](TESTING.md) · [English](TESTING.en.md)**

测试体系同时保护模块化源码、过渡 runtime、真实浏览器行为和 Vite 单文件发布物。

## 常用命令

```bash
npm run test:unit
npm run typecheck
npm run build
./tests/run_full_check.sh
npm run test:visual:capture
```

- `npm run test:unit`：快速 Node 契约测试。
- `npm run typecheck`：TypeScript 边界。
- `npm run build`：从小壳和 `src/` 生成自包含发布物。
- `./tests/run_full_check.sh`：发布前完整检查。
- `npm run test:visual:capture`：真实 KML、桌面/移动断点和交互状态截图。

视觉与真实 Chrome 检查需要本机可启动浏览器；受限沙箱可能无法运行这部分。正式发布不能因为浏览器环境缺失而把它们视为通过。

## 测试原则

1. `src/` 是行为真源，测试不把生成 HTML 当作可编辑实现。
2. `index.html` 与 `hiking-trail-mapper.html` 的职责不同，不能再断言两者内容相同。
3. `runtime.ts` 仍是过渡兼容层；测试应保护其迁移边界，不能假设它已经删除。
4. 纯函数使用 Node 单元测试；DOM/Canvas/Leaflet 行为使用浏览器测试；完整用户流程使用 E2E。
5. 每次从 `runtime.ts` 迁出行为，应先保留旧行为测试，再切 owner，最后删除旧路径。

## 完整检查

`tests/run_full_check.sh` 是本地和发布准备的统一入口，按以下层次验证：

### Phase 1：TypeScript 与 Vite 临时发布

```bash
npm run typecheck
npm run check:generated
```

`check:generated` 以只读模式构建 `.vite-build/`，并检查受跟踪的 `hiking-trail-mapper.html` 是否可由当前源码重现。完整脚本还会从临时单 HTML 提取唯一内联 module，并用 `node --check` 验证语法。

构建契约：

- Vite 入口是根目录小壳 `index.html`。
- `index.html` 只含 `#app`、产品元信息和 `/src/main.ts`。
- `src/main.ts` 导入样式并调用 `bootstrapOutdoorRouteStudio()`。
- bootstrap 先挂载 Workbench，再加载 vendor、typed modules 和 `runtime.ts` 兼容层。
- 临时 `.vite-build/index.html` 不引用外部 JavaScript/CSS asset。
- `.vite-build/hiking-trail-mapper.html` 是内容相同的兼容别名。
- `.vite-build/release.json` 记录产品、版本、日期、hash 和入口。

不要恢复“`index.html` 必须等于 `hiking-trail-mapper.html`”的旧测试。正确断言是：前者保持小壳，后者可由当前 `src/` 与构建配置重现。

### Phase 2：Node 单元与契约

| 测试 | 主要覆盖 |
|------|----------|
| `test_math.js` / `test_enrich.js` | 距离、海拔、统计、标注吸附与内容 hash |
| `test_core_contract.js` / `test_kml_core.js` | `src/core` 出口、KML 坐标、`gx:Track`、waypoint 和 import model |
| `test_storage_core.js` / `test_indexeddb_adapter.js` | IndexedDB snapshot、事务提交、Set 序列化、每组主轨迹和 legacy 恢复 |
| `test_measure_itinerary.js` | A/B 测距、分段、Day 范围、海拔布局和 render model |
| `test_performance_core.js` | 海拔分段、Canvas min/max 抽稀、waypoint diff 与 track revision |
| `test_app_architecture.js` | app state、feature controller、adapter 与 Workbench fit 计划 |
| `test_interaction_manager.js` | 会话互斥、owner/session guard、AbortController、timer/RAF 清理 |
| `test_interaction_runtime.js` | 五种地图模式接入统一交互状态机的 runtime 契约 |
| `test_render_scheduler.js` | dirty mask 合并、固定 flush 顺序、下一帧重入和 fit epoch |
| `test_render_runtime.js` | 七阶段调度接线、海拔降采样、marker diff 和最后一次复位保护 |
| `test_command_dialog.js` | 命令注册/状态/dispatch 与原生 dialog 安全、焦点、Escape |
| `test_ui_contract.js` | Workbench 响应式布局、七侧栏/五底栏、侧栏、海拔坞和无障碍 |
| `test_vite_entry.js` | 小壳、`main.ts`、`bootstrap.ts`、过渡 runtime 与单文件构建 |
| `test_release_pipeline.js` | 构建重现、release metadata、版本工具和 GitHub Pages workflow |
| `verify_alignment.js` | 生成发布物使用 `src/core` 行为且没有恢复重复 core fallback |

`tests/unit/trail_core.js` 只是旧 CommonJS 测试的导入桥，不是第二份实现。

### Phase 3：发布元数据

`python3 scripts/release/check_release_metadata.py` 应检查：

- `package.json` / lockfile、`APP_VERSION`、CHANGELOG 和 README 版本一致；
- 产品名为 Outdoor Route Studio；
- 小壳 title、runtime 发布元数据和生成 HTML 注释一致；
- `release.json` 与单 HTML hash/字节数一致；
- Vite、TypeScript、npm scripts 与 Pages workflow 路径正确。

该步骤只验证，不应改写业务源码。

### Phase 4：静态浏览器契约

`tests/browser/test_skill.py` 读取小壳和生成发布物，至少验证：

- `#app`、地图、路线侧栏、海拔坞、工具面板和 dialog 所需 DOM；
- 中英文 i18n key 对齐；
- Leaflet / fflate 已进入生成单文件；
- 没有外部脚本/样式依赖；
- 生成物包含 Outdoor Route Studio 启动标记和兼容 runtime。

### Phase 5：真实 Chrome 功能

`tests/browser/test_v1_31.py` 在真实浏览器中检查启动、导入、DOM 更新和核心交互。Milestone 6 相关断言应等待 `window.__OUTDOOR_ROUTE_STUDIO__.ready`，避免把启动中的中间状态当作失败。

重点覆盖：

- 从 IndexedDB 恢复后只执行一次有效 fit；
- 测距、分段、标注、下撤、Day 预览互斥；
- 取消/替换交互后旧回调不生效；
- 侧栏/底栏命令派发同一行为；
- dialog 的取消、确认、Escape 和焦点恢复；
- 生成 HTML 在 `file://` 下无运行时错误。

### Phase 6：端到端流程

`tests/e2e/run_all.py` 覆盖空工作区、KML/ZIP 导入、去重、分组与主轨迹、批量移动、反向、删除、waypoint 筛选、Day/测距/分段、IndexedDB、i18n、导出和 `file://`。

E2E 以用户结果为准，不直接依赖 manager 私有字段。manager 内部细节由 Phase 2 测试保护。

六个阶段结束后，脚本还会做只读发布一致性检查：

- `.vite-build/index.html`、兼容别名和受跟踪发布物字节一致；
- `release.json` 的 hash 与字节数匹配临时发布物；
- 根目录 `hiking-trail-mapper.html` 没有手工漂移；
- Pages 上传 `dist/`，不是根目录小壳；
- 文档、CHANGELOG 和发布 metadata 没有版本漂移。

## 四个管理器的最低测试集

### InteractionManager

- 激活新 kind 会取消并 abort 前一个会话。
- owner、sessionId 或 kind 不匹配的事件被拒绝。
- 同一个事件对象最多消费一次。
- phase 改变会清理旧 phase 的 RAF/delay。
- cancel/dispose 幂等，旧 session 不能恢复为 current。

### RenderScheduler

- dirty flag 是互不重叠的 bit，顺序固定。
- 同一帧多次 invalidate 只调度一次 RAF。
- flush 中产生的新 invalidation 留到下一帧。
- fit 保留最后请求，旧 epoch guard 失效。
- runtime 的七类刷新只由一个 scheduler 调度，旧 redraw 入口只发 dirty flag。
- Canvas 降采样保留全量命中数据，普通 marker 保留未变化实例。
- 连续 reset 的 Promise 依次得到 `false` / `true`，最终 bounds 属于最后一次请求。
- handler 抛错不阻止其他 phase 清理，错误按约定汇总。

### CommandRegistry

- 重复或空命令 ID 被拒绝。
- disabled 命令不执行，checked 状态按 context 计算。
- 同步、异步和抛错 dispatch 都只发一次生命周期事件。
- dispose / unsubscribe 幂等。

### DialogController

- 所有用户文本走 `textContent`，不出现 `innerHTML` 注入。
- confirm/prompt 的默认、取消和危险状态正确。
- Escape 与 native cancel 一致。
- 关闭后恢复焦点，destroy 后拒绝新请求并清理挂起 dialog。

## Workbench 响应式测试

至少覆盖宽桌面、窄桌面、390px 和 320px：

- 桌面主操作是七项侧栏/侧轨，移动主操作是五项底栏。
- 切换断点不会复制 command handler 或触发两次 dispatch。
- More/bottom sheet 不遮挡地图关键控件。
- 路线侧栏、海拔坞和工具面板不会互相覆盖。
- 文本不会溢出按钮，最长中英文 label 都可见或按设计截断。
- 键盘焦点顺序、`aria-expanded` 和 reduced-motion 行为正确。

视觉回归应使用真实示例 KML，至少捕获空状态、路线列表、Day、A/B 测距、两日分段、dialog 和移动侧栏。

## 失败定位

```bash
# manager 与入口
node tests/unit/test_interaction_manager.js
node tests/unit/test_render_scheduler.js
node tests/unit/test_command_dialog.js
node tests/unit/test_vite_entry.js

# core 与生成物
node tests/unit/test_measure_itinerary.js
node tests/unit/test_storage_core.js
node tests/unit/verify_alignment.js

# 发布与浏览器
python3 scripts/release/check_release_metadata.py
python3 tests/browser/test_skill.py
uv run --with websocket-client python3 tests/e2e/run_all.py
```

判断顺序：

1. 实现是否引入回归；优先修实现。
2. 行为是否被有意改变；更新实现、测试和中英文文档。
3. 生成物是否陈旧；重新构建，不手工编辑 HTML。
4. 是否只是浏览器环境不可用；明确记录未运行项，不能伪报通过。

## 添加测试

- 纯计算：在相关 `src/core` 模块旁补 Node 单元测试。
- manager：使用注入的 scheduler/RAF/document fake，断言公开契约，不依赖真实时间。
- DOM 与兼容 runtime：放入 `tests/browser`。
- 多步骤用户流程：放入 `tests/e2e`。
- 布局、遮挡和断点：放入 `tests/visual`。

新增测试文件后，把它接入 `npm run test:unit` 或完整检查入口；只创建文件而不接入流水线不算完成。
