# Outdoor Route Studio Source

## 中文

`src/` 是 Outdoor Route Studio 应用实现的唯一真源。根目录 `index.html` 只是加载 `src/main.ts` 的 Vite 小壳；不要把业务逻辑、DOM 或样式放回入口壳或生成 HTML。

启动链路：

```text
index.html -> main.ts -> bootstrap.ts -> Workbench DOM
           -> vendor + typed core/app -> runtime.ts 兼容层
```

目录职责：

- `core/`：无 DOM 的距离、海拔、KML、存储、测距、分段和渲染模型；`core/performance/` 负责大轨迹分段、抽稀、diff 与 revision。
- `app/`：bootstrap、应用状态、`CommandRegistry`、`InteractionManager`、`RenderScheduler` 与过渡 `runtime.ts`。
- `features/`：单一功能 controller 和交互状态。
- `adapters/`：Leaflet 与 IndexedDB 副作用。
- `ui/`：Workbench DOM、桌面七项侧栏、移动五项底栏、海拔坞和 `DialogController`。
- `styles/` / `vendor/`：由 Vite 收集并在发布时内联的样式与浏览器依赖。

`runtime.ts` 仍是正在使用的 classic-runtime 兼容层。新增行为应进入 typed owner；迁移时先补测试、接入对应 manager，再删除旧分支。不要把“管理器已建立”写成“runtime 已完全删除”。

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
           -> vendors + typed core/app -> runtime.ts bridge
```

Directory ownership:

- `core/`: DOM-free distance, elevation, KML, storage, measurement, itinerary, and render models; `core/performance/` owns large-track segmentation, downsampling, diffs, and revisions.
- `app/`: bootstrap, app state, `CommandRegistry`, `InteractionManager`, `RenderScheduler`, and transitional `runtime.ts`.
- `features/`: single-feature controllers and interaction state.
- `adapters/`: Leaflet and IndexedDB effects.
- `ui/`: Workbench DOM, seven desktop side actions, five mobile bottom actions, elevation dock, and `DialogController`.
- `styles/` / `vendor/`: styles and browser dependencies collected by Vite and inlined for release.

`runtime.ts` is still a live classic-runtime compatibility layer. New behavior belongs in typed owners. During migration, add tests, connect the relevant manager, then delete the old branch. Do not turn “managers are established” into “runtime has been fully removed.”

After changes, run:

```bash
npm run test:unit
npm run typecheck
npm run build
```
