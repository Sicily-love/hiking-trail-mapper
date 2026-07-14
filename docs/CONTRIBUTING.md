# 贡献指南

**[中文](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md)**

感谢你改进 Outdoor Route Studio。提交应保持单一源码、统一交互和可重现发布。

## 开始之前

```bash
npm install
npm run test:unit
npm run typecheck
npm run build
```

本地开发使用 `npm run dev`。不要直接编辑 `hiking-trail-mapper.html` 或 `dist/`，它们由 `src/` 和根目录小壳生成。

## 代码放在哪里

| 变更 | 所有者 |
|------|--------|
| 距离、海拔、KML、分段、统计等纯逻辑 | `src/core/` |
| 应用状态、命令、交互与渲染调度 | `src/app/` |
| 单一业务流程 | `src/features/<feature>/` controller |
| Leaflet、IndexedDB、文件与浏览器副作用 | `src/adapters/` |
| Workbench、dialog、组件与文案 | `src/ui/`、`src/features/localization/` |
| 布局、组件和主题 | `src/styles/` |
| 必须共享 DOM/Leaflet 实例的成熟编排 | `src/app/runtime/studio.ts` |

启动链固定为：

```text
index.html -> src/main.ts -> bootstrap.ts
           -> Workbench DOM + vendor module imports
           -> startStudioRuntime({ document, commands, dialogs })
```

不得恢复 raw import、`executeClassicScript()`、runtime composer、功能 runtime owner 或 `window.HikingTrailCore/HikingTrailApp`。

## Direct Runtime 边界

`src/app/runtime/studio.ts` 当前承载需要共享 DOM、Leaflet map 和 layer 句柄的成熟编排，并暂时使用 `@ts-nocheck`。这不是新增无类型逻辑的入口。

迁出一组行为时：

1. 先为现有行为添加或保留回归测试。
2. 在 core/controller/adapter 中定义 typed 输入、输出和所有权。
3. 让 direct runtime 只做依赖装配和副作用提交。
4. 在同一提交删除被替代实现，不保留双路径或镜像状态。
5. 跑单元、真实 Chrome、E2E 和必要的截图回归。

测试 inspector 仅允许通过 `?studio-test=1` 创建，并应保持冻结、只读。产品代码不得依赖它。

## 状态、命令与交互

- 持久状态写入通过 typed `AppStateCommand` 进入 `AppStateStore`。
- DOM、Leaflet layer、AbortController、timer 和 RAF 句柄不进入 snapshot。
- 顶部菜单、桌面侧栏、移动底栏和快捷键分发同一 `CommandRegistry` ID。
- 测距、分段、标注、下撤和 Day 预览使用 `InteractionManager` 会话；取消后旧异步任务不得更新状态或 UI。
- 地图、marker、海拔和 fit 更新通过 `RenderScheduler`；连续复位只提交最后一个 epoch。
- 原生 `prompt` / `confirm` 不得回归，使用统一 `DialogController`。

## UI 与样式

- 保持 Workbench 的顶部菜单、活动栏、地图、侧栏和底部分析坞层级。
- 使用已有 Lucide 图标和设计 token，不使用 emoji 代替图标。
- 桌面和移动端共享命令语义，不复制 listener。
- 检查最长中英文文案、地图控件、侧栏、浮动 panel 和海拔坞不重叠。
- 布局变更应增加 UI contract 或 `tests/visual` 截图覆盖。

## TypeScript 与命名

- 新模块必须通过类型检查，不因 direct runtime 的 `@ts-nocheck` 放宽要求。
- 纯逻辑使用显式输入输出且不依赖 DOM。
- 变量和函数使用 `camelCase`，类型和类使用 `PascalCase`，常量使用 `SCREAMING_SNAKE_CASE`。
- controller 表示所有权，渲染数据使用 `*Model`，工厂使用 `create*`。
- 注释只解释不明显的约束、生命周期和兼容原因。

## 测试要求

先跑与风险匹配的最小测试，发布前跑完整链：

```bash
npm run test:unit
npm run typecheck
./tests/run_full_check.sh
npm run test:visual:capture
```

| 变更 | 最低新增覆盖 |
|------|--------------|
| `src/core` 纯逻辑 | 对应 Node 单元测试 |
| manager/controller | 单元测试和必要的浏览器回归 |
| bootstrap / 构建 | `test_vite_entry.js` + `test_release_pipeline.js` |
| Workbench 布局 | UI contract + 桌面/移动截图 |
| 导入、存储、导出 | 单元 + E2E |
| runtime 边界迁移 | 旧行为回归 + 生成单 HTML 的真实 Chrome |

## 构建与版本

```bash
npm run build
npm run version:bump -- patch --zh "中文更新项" --en "English change"
npm run release:prepare
```

版本真源是 `src/app/version.ts`。版本工具同步 package/lock、localization changelog、README、生成 HTML 和 `release.json`。普通修复使用 PATCH；兼容功能使用 MINOR；只有明确破坏性变化才使用 MAJOR。

提交前确认生成物可重现、文档中英文事实一致、相关测试通过，并在说明中列出未运行的检查。

贡献内容采用 [MIT License](../LICENSE)。
