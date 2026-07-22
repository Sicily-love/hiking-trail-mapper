# Outdoor Route Studio Source

## 中文

`src/` 是 Outdoor Route Studio 应用实现的唯一真源。根目录 `index.html` 只是加载 `src/main.ts` 的 Vite 小壳；不要把业务逻辑、DOM 或样式放回入口壳或生成 HTML。

启动链路：

```text
index.html -> main.ts -> bootstrap.ts -> Workbench DOM
           -> vendor + typed core/app -> startStudioRuntime()
```

目录职责：

- `core/`：无 DOM 的距离、海拔、KML、存储、版本化项目归档、测距、分段和渲染模型；`core/performance/` 负责大轨迹分段、抽稀、diff、revision、触摸命中与复位计划。
- `app/`：bootstrap、版本、应用状态、`CommandRegistry`、`InteractionManager`、`RenderScheduler`、typed `RuntimeContext`，以及直接启动的 `runtime/studio.ts` 浏览器编排边界。
- `features/`：单一功能 controller 与数据模块；轨迹、IndexedDB、文件导入/导出、完整项目归档、撤销/重做、项目恢复 UI、手动标注点、测距、行程分段、Day 预览、下撤路线和 localization 都由模块持有。
- `adapters/`：Leaflet、IndexedDB、ZIP、Blob、Canvas 导出图与浏览器文件保存副作用。
- `ui/`：唯一的 Workbench 布局、可读的应用 Shell、图标、`DialogController`、浮动面板位置控制、Toast 反馈和不可信内容清洗；不再保留旧 UI 初始化器。
- `styles/` / `vendor/`：共享组件样式、Workbench 主题和由 Vite 内联的浏览器依赖。

`runtime/studio.ts` 是普通 TypeScript 模块，由 bootstrap 直接调用；工程中没有 raw import、字符串执行、runtime composer 或 classic globals。它暂时集中成熟的 DOM/Leaflet 编排，新行为应优先进入 typed controller、adapter 或 UI module。只读 runtime inspector 仅在 `?studio-test=1` 下启用，正常发布不会暴露它。

修改后运行：

```bash
npm run test:unit
npm run typecheck
npm run build
```

## English

`src/` is the only source of truth for Outdoor Route Studio application implementation. Root `index.html` is only a small Vite shell that loads `src/main.ts`; do not move business logic, DOM, or styles back into the entry shell or generated HTML.

Boot chain:

```text
index.html -> main.ts -> bootstrap.ts -> Workbench DOM
           -> vendors + typed core/app -> startStudioRuntime()
```

Directory ownership:

- `core/`: DOM-free distance, elevation, KML, storage, versioned project archives, measurement, itinerary, and render models; `core/performance/` owns large-track segmentation, downsampling, diffs, revisions, touch targets, and reset planning.
- `app/`: bootstrap, version ownership, app state, `CommandRegistry`, `InteractionManager`, `RenderScheduler`, typed `RuntimeContext`, and the directly started `runtime/studio.ts` browser-orchestration boundary.
- `features/`: single-feature controllers and data modules for trails, IndexedDB, file import/export, complete project archives, Undo/Redo, restore UI, manual waypoints, measurement, itinerary segmentation, Day preview, escape routes, and localization.
- `adapters/`: Leaflet, IndexedDB, ZIP, Blob, export Canvas, and browser file-save effects.
- `ui/`: the single Workbench layout owner, readable application shell, icons, `DialogController`, floating-panel positioning, toast feedback, and untrusted-content sanitization; no legacy UI initializer remains.
- `styles/` / `vendor/`: shared component styles, the Workbench theme, and browser dependencies inlined by Vite.

`runtime/studio.ts` is a normal TypeScript module called directly by bootstrap. The project has no raw imports, string execution, runtime composer, or classic globals. It temporarily centralizes mature DOM/Leaflet orchestration; new behavior should start in a typed controller, adapter, or UI module. Its read-only inspector exists only under `?studio-test=1` and is absent from normal releases.

After changes, run:

```bash
npm run test:unit
npm run typecheck
npm run build
```
