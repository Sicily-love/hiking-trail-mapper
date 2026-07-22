# Outdoor Route Studio 架构

**[中文](ARCHITECTURE.md) · [English](ARCHITECTURE.en.md)**

## 当前基线

`v2.0.0` 只有一套应用源码：`src/`。根目录 `index.html` 是 Vite 小壳，`hiking-trail-mapper.html` 与 `dist/` 均由构建生成。生产启动链不再使用 raw import、`executeClassicScript()`、runtime composer 或 classic globals。

```text
index.html
  -> src/main.ts
  -> bootstrapOutdoorRouteStudio()
  -> mountWorkbenchShell()
  -> startStudioRuntime({ document, commands, dialogs })
  -> upgradeWorkbenchLayout()
```

第三方 Leaflet、PolylineDecorator 和 fflate 作为 Vite 模块图中的 side-effect import 加载。`src/app/runtime/studio.ts` 是普通 TypeScript 模块，不是字符串模板或第二套实现。

## 目录所有权

```text
src/
├── app/
│   ├── bootstrap.ts              启动与依赖装配
│   ├── version.ts                唯一版本真源
│   ├── state-store.ts            应用状态写入边界
│   ├── actions.ts                语义化 typed 状态动作
│   ├── selectors.ts              只读状态选择器
│   ├── project-store.ts          项目与轨迹数据写入边界
│   ├── project-actions.ts        语义化项目修改
│   ├── project-selectors.ts      只读项目查询
│   ├── command.ts                统一命令
│   ├── interaction-manager.ts    地图交互会话
│   ├── render-scheduler.ts       合帧与最后一次 fit
│   ├── runtime-context.ts        typed 服务上下文
│   └── runtime/studio.ts         启动胶水与共享地图编排（约 3950 行）
├── core/                         无 DOM 的领域算法与 render model
├── features/                     垂直功能 controller 与数据
├── adapters/                     Leaflet、IndexedDB、文件与浏览器副作用
├── ui/                           Workbench、dialog、sidebar/import owner 与 UI 组件
├── styles/                       布局、组件和主题
└── vendor/                       进入 Vite 模块图的浏览器依赖
```

## 边界规则

### Core

`core/` 只接收普通数据并返回确定性结果。距离、海拔、KML、测距、分段、统计、触摸策略、复位动画计划、抽稀、marker diff、revision 和版本化项目归档不依赖 DOM、Leaflet 或存储句柄。`projectArchive.ts` 持有 schema 迁移链、输入预算和数据校验。

### App

`AppStateStore` 是工作区偏好状态的写入边界；`ProjectStore` 是项目、轨迹及其持久业务数据的写入边界。两者都产生带 revision 的 typed 事件。功能层通过 `AppStateActions` / `ProjectActions` 执行语义写入，通过 `AppStateSelectors` / `ProjectSelectors` 读取数据，不直接接触 raw store 或可写 project context。`CommandRegistry` 让顶部菜单、桌面侧栏、移动底栏和快捷键分发同一语义命令；`ProjectHistoryController` 以紧凑版本化快照实现有界撤销/重做，同时限制记录数与总字节，并在失败编辑后回滚。

`InteractionManager` 统一测距、分段、标注、下撤和 Day 预览的 `select -> preview -> dragging -> commit` 生命周期，并负责取消旧会话、timer、RAF 与异步回调。

`RenderScheduler` 合并地图、轨迹、marker、海拔、侧栏、分析面板和 fit 请求。连续复位只允许最后一个 epoch 提交。

### Features 与 Adapters

trail、storage、file import/export、project archive/history runtime、waypoint、measure、segment、itinerary、escape 和 localization 各自持有 typed controller 或数据模块。项目归档与历史通知由 `features/project/runtime.ts` 编排；项目恢复的 input、状态文字和确认交互由 `ui/import/project-restore.ts` 持有。浏览器能力由 adapter 隔离：

- Leaflet adapter 接收 track/marker render model，并差异更新图层；
- elevation renderer 接收 Canvas context、尺寸和降采样 model；
- IndexedDB adapter 负责事务与 snapshot；
- file/browser adapter 负责 ZIP、Blob、ObjectURL、保存选择器和导出画布。

Lightbox 的缩放/拖动/触摸生命周期与侧栏收起后的主轨迹浮卡由 `ui/` controller 持有；轨迹点临时检查由 `features/map/inspection-controller.ts` 产生 render model，再交给 Leaflet adapter 创建和销毁 Marker。`studio.ts` 不再持有这些 listener、timer 或位置状态。

### Direct Runtime

`src/app/runtime/studio.ts` 已从约 6200 行压到约 3940 行。KML 项目构建、地图复位/fit、侧栏/行程 DOM 和导入 DOM 分别由 `features/files/kml-project-builder.ts`、`features/map/workspace-controller.ts`、`ui/sidebar/runtime-owner.ts` 与 `ui/import/runtime-owner.ts` 持有。主 runtime 仅装配 store、actions、selectors 和浏览器副作用，不直接读写 raw 项目或应用状态；`RuntimeContext` 也只向 feature 暴露 action/selector。生产环境不发布业务全局，仅 `?studio-test=1` 创建冻结的测试 inspector。

真实浏览器测试在 URL 带 `?studio-test=1` 时获得冻结的只读 inspector，用于访问模块局部状态。正常发布不创建该 inspector，也不暴露 `HikingTrailCore`、`HikingTrailApp`、命令或 dialog classic globals。

## UI 架构

Workbench 由顶部菜单、左侧功能栏、地图工作区、响应式侧栏和底部分析坞组成。桌面与移动入口共享命令 ID；浮动 panel 和 dialog 使用统一组件、主题、焦点与 Escape 规则。Lucide 图标、Forest Green / Stone / White / Orange 色板和响应式几何由 `src/styles/` 维护。

## 发布链

```text
src + index.html
  -> Vite build
  -> JavaScript/CSS 内联
  -> dist/index.html
  -> dist/hiking-trail-mapper.html
  -> 根目录离线 HTML + release.json
```

`src/app/version.ts`、localization changelog、package/lock、README 和生成物由版本脚本同步。最终 HTML 无外部 JavaScript/CSS 依赖，并同时支持静态服务器、GitHub Pages 与 `file://`。

## 后续演进

Architecture 2.0 已删除双路径与 classic bridge。后续优化是小步缩小 `studio.ts` 的浏览器编排面积：先定义 typed render model 或 controller API，再迁移调用者，并在同一提交删除原实现。不要再次引入 composer、字符串执行或镜像状态。
