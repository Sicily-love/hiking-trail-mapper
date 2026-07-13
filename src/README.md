# Outdoor Route Studio Source

## 中文

`src/` 是 Outdoor Route Studio 应用实现的唯一真源。根目录 `index.html` 只是加载 `src/main.ts` 的 Vite 小壳；不要把业务逻辑、DOM 或样式放回入口壳或生成 HTML。

启动链路：

```text
index.html -> main.ts -> bootstrap.ts -> Workbench DOM
           -> vendor + typed core/app -> 垂直 owner 组合 -> runtime.ts 兼容层
```

目录职责：

- `core/`：无 DOM 的距离、海拔、KML、存储、测距、分段和渲染模型；`core/performance/` 负责大轨迹分段、抽稀、diff 与 revision。
- `app/`：bootstrap、应用状态、`CommandRegistry`、`InteractionManager`、`RenderScheduler`、runtime composer 与约 340 行启动/命令模板。
- `features/`：单一功能 controller；11 个 feature runtime owner 分别拥有文件、存储、地图、标注、海拔、测距、分段、Day、下撤、轨迹变更和 localization 片段。
- `adapters/`：Leaflet 与 IndexedDB 副作用。
- `ui/`：Workbench DOM、桌面七项侧栏、移动五项底栏、海拔坞和 `DialogController`。
- `styles/` / `vendor/`：由 Vite 收集并在发布时内联的样式与浏览器依赖。

`runtime.ts` 已达到 400 行最终护栏，只保留启动和命令胶水。新增行为不得写回模板，应进入对应 owner 或 typed controller。垂直文件拆分已经完成，但 classic owner 仍需逐步强类型化。

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
           -> vendors + typed core/app -> vertical owner composition -> runtime.ts bridge
```

Directory ownership:

- `core/`: DOM-free distance, elevation, KML, storage, measurement, itinerary, and render models; `core/performance/` owns large-track segmentation, downsampling, diffs, and revisions.
- `app/`: bootstrap, app state, `CommandRegistry`, `InteractionManager`, `RenderScheduler`, the runtime composer, and the approximately 340-line boot/command template.
- `features/`: single-feature controllers; eleven feature runtime owners hold files, storage, map, waypoint, elevation, measure, segment, Day, escape, trail-mutation, and localization fragments.
- `adapters/`: Leaflet and IndexedDB effects.
- `ui/`: Workbench DOM, seven desktop side actions, five mobile bottom actions, elevation dock, and `DialogController`.
- `styles/` / `vendor/`: styles and browser dependencies collected by Vite and inlined for release.

`runtime.ts` now meets the final 400-line guardrail and contains only boot and command glue. New behavior must not return to the template; place it in the matching owner or a typed controller. The vertical file split is complete, while classic owners still need gradual typing.

After changes, run:

```bash
npm run test:unit
npm run typecheck
npm run build
```
