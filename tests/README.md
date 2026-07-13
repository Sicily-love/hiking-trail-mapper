# Test Layout

Outdoor Route Studio 的测试目录与分层。 / Test directories and layers for Outdoor Route Studio.

## 中文

- `unit/`：core、app、四个 manager、Workbench、入口和发布契约的确定性 Node 测试。
- `browser/`：小壳、生成单 HTML 和 classic-runtime 兼容路径的真实 Chrome 静态/功能检查。
- `e2e/`：导入、分组、测距、分段、存储、导出与 `file://` 用户流程。
- `visual/`：真实 KML、桌面七项侧栏、移动五项底栏、侧栏/bottom sheet、海拔坞和 dialog 的截图与几何断言。
- `run_full_check.sh`：本地与发布准备共用的完整入口。

常用命令：

```bash
npm run test:unit
node tests/unit/test_indexeddb_adapter.js
node tests/unit/test_interaction_manager.js
node tests/unit/test_interaction_runtime.js
node tests/unit/test_render_scheduler.js
node tests/unit/test_render_runtime.js
node tests/unit/test_performance_core.js
node tests/unit/test_command_dialog.js
./tests/run_full_check.sh
npm run test:visual:capture
```

入口测试必须区分：

- `index.html` 是只加载 `src/main.ts` 的 Vite 小壳；
- `hiking-trail-mapper.html` / `dist/index.html` 是从 `src/` 生成的自包含发布物；
- `runtime.ts` 是受 400 行和命名片段唯一性护栏保护的启动/命令模板。

新增测试文件后必须接入 npm 或完整检查流水线。

## English

- `unit/`: deterministic Node tests for core, app, all four managers, Workbench, entry, and release contracts.
- `browser/`: real-Chrome static/functional checks for the small shell, generated single HTML, and classic-runtime compatibility paths.
- `e2e/`: user workflows for import, groups, measurement, segmentation, persistence, export, and `file://`.
- `visual/`: real-KML screenshots and geometry assertions for seven desktop side actions, five mobile bottom actions, sidebar/bottom sheets, elevation dock, and dialogs.
- `run_full_check.sh`: shared full entrypoint for local and release preparation.

Common commands:

```bash
npm run test:unit
node tests/unit/test_interaction_manager.js
node tests/unit/test_interaction_runtime.js
node tests/unit/test_render_scheduler.js
node tests/unit/test_command_dialog.js
./tests/run_full_check.sh
npm run test:visual:capture
```

Entry tests must distinguish:

- `index.html` is the small Vite shell that only loads `src/main.ts`;
- `hiking-trail-mapper.html` / `dist/index.html` are self-contained releases generated from `src/`;
- `runtime.ts` is a boot/command template protected by a 400-line cap and unique-fragment checks.

Wire every new test file into npm or the full-check pipeline.
