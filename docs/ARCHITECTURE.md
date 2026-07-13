# Outdoor Route Studio 架构

**[中文](ARCHITECTURE.md) · [English](ARCHITECTURE.en.md)**

本文描述 Milestone 6 之后的源码所有权、启动链路、Workbench 契约、运行时管理器和单文件发布方式。

## 当前状态

Outdoor Route Studio 采用“模块化 TypeScript 源码 + 自包含单 HTML 发布物”：

- `src/` 是应用实现的唯一真源。
- 根目录 `index.html` 是稳定、极小的 Vite 入口壳，只声明页面元信息、`#app` 和 `src/main.ts`。
- `src/app/bootstrap.ts` 是浏览器启动编排入口。
- `src/app/runtime.ts` 是约 340 行的启动/命令兼容模板；所有业务片段由 13 个垂直 owner 单独维护，再由 bootstrap 按原顺序组合一次。
- Vite 构建模块图，发布脚本再内联 CSS/JavaScript，得到可由 GitHub Pages 托管、也可通过 `file://` 打开的单文件。

“`src` 是唯一源码”不等于仓库根目录只能有 `src`。入口壳、构建配置和脚本是工程元数据；业务逻辑、DOM 结构、样式和运行时行为都必须从 `src/` 产生。

## 源码所有权

```text
src/
├── main.ts                         导入样式并调用 bootstrap
├── app/
│   ├── bootstrap.ts                启动顺序与兼容桥
│   ├── state.ts                    应用状态模型
│   ├── state-store.ts              typed 状态 command/event 与唯一写入边界
│   ├── command.ts                  CommandRegistry
│   ├── interactions/               InteractionManager
│   ├── rendering/                  RenderScheduler
│   ├── runtime/context.ts          typed RuntimeContext 服务边界
│   ├── runtime/compose.ts          runtime 片段完整性与单次组合
│   ├── runtime/classic.ts          应用状态与 render 编排片段
│   ├── runtime.ts                  约 340 行启动与命令胶水
│   └── index.ts                    typed app 公共出口
├── core/                           无 DOM 的计算、解析、存储与渲染模型
│   └── performance/               大轨迹分段、抽稀、diff 与 revision
├── features/
│   ├── files/                      typed import/export controller + 导入/导出菜单 DOM
│   ├── storage/                    typed controller + 恢复兼容/UI 适配器
│   ├── map/runtime.ts              track / Leaflet 渲染
│   ├── waypoint/                   typed controller + Leaflet marker 适配器
│   ├── elevation/runtime.ts        elevation Canvas 副作用
│   ├── localization/runtime.ts     i18n、版本日志与语言 DOM
│   ├── measure/                    typed 会话 controller + Leaflet 路段渲染适配器
│   ├── segment/                    typed 编辑/提交 controller + Leaflet/DOM 适配器
│   ├── itinerary/                  typed Day 预览 controller + 行程 DOM/Leaflet 适配器
│   ├── escape/                     typed 路线 controller + 下撤侧栏/Leaflet 适配器
│   └── trails/                     typed controller + classic UI 适配器
├── adapters/                       Leaflet、IndexedDB、ZIP 与浏览器文件副作用边界
├── ui/
│   ├── layout/app-shell.ts         Workbench DOM 壳与挂载函数
│   ├── workbench.ts                响应式 Workbench chrome
│   ├── workbench.css               工作区视觉和布局
│   ├── dialog/                     DialogController
│   └── orchestration/runtime.ts    帮助与图片模态兼容编排
├── styles/                         全局/vendor 样式入口
└── vendor/                         由构建内联的浏览器依赖
```

所有权规则：

| 变化 | 应修改的位置 |
|------|--------------|
| 距离、爬升、KML、分段、海拔布局 | `src/core` |
| 应用状态、命令、交互会话、刷新调度 | `src/app` |
| 单一功能的交互状态 | `src/features` |
| Leaflet / IndexedDB 调用 | `src/adapters` |
| DOM 壳、响应式布局、对话框、CSS | `src/ui` / `src/styles` |
| 旧浏览器编排迁移 | 从 `src/app/runtime.ts` 移入上述 owner |

不要在 `hiking-trail-mapper.html` 或 `dist/` 修复行为；它们是生成物。

## 启动链路

```text
index.html
  └── <script type="module" src="/src/main.ts">
        ├── styles/leaflet.css
        ├── ui/workbench.css
        └── bootstrapOutdoorRouteStudio(document)
              ├── mountAppShell(#app)
              ├── 执行 Leaflet / decorator / fflate vendor
              ├── 暴露 HikingTrailCore 与 HikingTrailApp
              ├── 校验并组合垂直 runtime owner
              ├── 执行唯一的兼容脚本
              └── 暴露 __OUTDOOR_ROUTE_STUDIO__.ready
```

`bootstrap.ts` 通过 raw import 读取 runtime 模板和 13 个垂直 owner。`composeClassicRuntime()` 要求每个命名片段恰好有一个 slot、一个实现且没有闲置片段，再生成唯一 classic script。这样既保持旧代码依赖的全局作用域与执行顺序，也禁止 fallback 和双路径悄悄回来。

垂直拆分已把 `runtime.ts` 从 8,089 行降到约 340 行。迁出的实现不再出现在模板中；`test_runtime_composition.js` 固定 400 行护栏并验证片段的缺失、重复和闲置错误。`RuntimeContext` 已聚合六类稳定服务，trail、storage、file import/export、waypoint、measure、segment、Day preview 和 escape 已接入 typed controller。文件导出 core 生成 KML、合并包和行程 Markdown，file adapter 隔离 fflate、Blob/ObjectURL、保存选择器和导出 Canvas；classic 文件 owner 从 994 行降到约 705 行，只保留导入与菜单 DOM。其余 owner 后续应沿用该模式逐个迁移，不能复制回模板。

这个桥是迁移机制，不是长期模块边界。typed 代码不能依赖脚本碰巧创建的隐式全局；迁出一段行为时，应给它明确输入、输出、生命周期和测试。

## Workbench 契约

Workbench 是地图优先的操作界面，同一命令语义按视口改变摆放方式：

- 桌面：七项主操作位于侧栏/侧轨，路线库和上下文保持可扫描。
- 移动：五项主操作位于底栏，低频操作进入 More 或 bottom sheet。
- 侧栏承载主轨迹摘要、路线、行程和下撤视图。
- 海拔分析坞独立于路线侧栏，可展开、折叠并记忆状态。
- 响应式变化只改变命令 placement，不复制命令实现或业务状态。

七侧栏/五底栏是布局契约，不是两套功能。命令 ID、enabled/checked 状态和 dispatch 路径应由 `CommandRegistry` 共享；视觉测试同时覆盖桌面与移动断点。

## 五个管理器

### AppStateStore

`src/app/state-store.ts` 是应用级可变状态的唯一写入边界。classic owner 只能读取稳定的 `snapshot()` 视图；轨迹显示、主轨迹、分组、批量选择、地图模式、标注筛选、下撤选择和缓存恢复都必须分发可判别联合类型 `AppStateCommand`。每次提交产生带递增 revision 的 `AppStateChangedEvent`，命令状态订阅该事件更新。

测距、分段、标注新增、下撤新增和 Day 预览的瞬时交互数据仍由各 feature controller 持有；Leaflet layer 等副作用对象不会进入应用状态。测试会拒绝 classic owner 重新直接赋值 `state` 或修改其中的 Set。

### InteractionManager

`src/app/interactions/` 维护互斥交互会话。当前交互词表为：

```text
idle | measure | segment | waypoint | escape | day-preview
```

每个激活会话带有 `sessionId`、phase、owner 和独立 `AbortController`。启动新会话会原子取消前一个会话；事件只能被当前 kind/session/owner 消费一次。会话创建的 animation frame 和 delay 在取消、替换或 phase 变化时一起清理，从而阻止过期回调修改新状态。

测距、分段、标注、下撤和 Day 预览已经全部接入该生命周期。地图点击只经过一个 active-kind 分发器；测距与分段拖动也作为 Session 事件处理。轨迹被替换、删除或修订后 owner 校验会取消旧会话，Escape 键通过同一取消路径清理当前模式。

### RenderScheduler

`src/app/rendering/` 用 dirty mask 合并一帧内的刷新请求，固定 flush 顺序为：

```text
tracks -> markers -> sidebar -> days -> legend -> chart -> fit
```

多次 invalidate 只安排一个 animation frame。flush 期间新增的 dirty 位进入下一帧；`fit` 使用 epoch 和“最后一次请求胜出”语义，避免较旧的异步视野调整覆盖新交互。

当前 runtime 已把轨迹、标注、侧栏、行程、图例、海拔图和视野调整全部交给同一个 scheduler。海拔轨迹最多合并为 40 个颜色 band；Canvas 海拔曲线按像素宽度做 min/max 降采样，但命中测试和标注仍使用完整轨迹。普通 waypoint marker 使用稳定 key 做 add/update/remove/keep 差异更新，未变化的 Leaflet marker 不重建。复位请求同时受 fit epoch 和 reset epoch 保护，连续复位只有最后一次可以提交视野。

### CommandRegistry

`src/app/command.ts` 是不依赖 DOM 的命令注册与分发层，提供：

- 唯一命令 ID 和显式注册/释放；
- 动态 `enabled` / `checked` 状态；
- 同步与异步 dispatch；
- registered、changed、dispatched、unregistered 生命周期通知。

bootstrap 只创建一个 registry。顶部菜单、桌面活动栏、移动端响应式活动栏、底部分析 Tab、旧侧栏兼容标签和 Escape 快捷键都只分发稳定语义命令，不再代理旧按钮或复制业务 listener。runtime 负责注册实际 handler，Workbench 订阅 dispatched/changed 事件同步 disabled、checked、活动项和操作日志。

### DialogController

`src/ui/dialog/` 统一 `info`、`confirm`、`prompt` 和 custom dialog：

- 使用原生 `<dialog>` 与 `showModal()`；
- 用户字符串写入 `textContent`，不使用 HTML 注入 sink；
- 统一 Escape、cancel、危险操作样式和默认按钮；
- 关闭后恢复此前焦点，destroy 时清理挂起状态。

runtime 中的原生 `alert`、`confirm`、`prompt` 已全部迁移到该 controller；输入、危险确认和手动标注点提交均为异步对话框。帮助、更新记录、存储信息和导入面板仍是过渡期自建模态，后续按功能拆分时继续迁移。

## 管理器采用状态

五个 manager/store 的 typed API 和单元契约已经建立。`AppStateStore` 接管应用级写入，`InteractionManager` 已接管五种互斥地图交互，`RenderScheduler` 已接管 runtime 的七类刷新与 fit，`CommandRegistry` 已接管四类 Workbench 入口，`DialogController` 已接管全部原生浏览器对话框。因此兼容层尚未删除，但状态写入、主交互、渲染、命令和原生对话框生命周期已经统一。

每次迁移应遵循：

1. 先给旧行为补契约或回归测试。
2. 将状态和纯计算移入 `src/core` / `src/features`。
3. 将互斥生命周期、刷新、命令或对话框接入对应 manager。
4. 从 `runtime.ts` 删除被替代代码。
5. 构建单文件并跑真实浏览器流程。

## 状态与数据流

```text
文件/用户事件
  -> CommandRegistry / InteractionManager
  -> AppStateStore.dispatch(command) 或 feature controller
  -> core 纯函数 / render model
  -> RenderScheduler.invalidate(mask)
  -> adapters + DOM/Canvas renderer
  -> IndexedDB（需要持久化时）
```

主要状态约定：

- `activeTrails: Set<trailId>`：当前显示的路线。
- `expandedTrails: Set<trailId>`：已展开的路线卡。
- `batchSelected: Set<trailId>`：批量选择。
- `activeGroup: string | null`：当前分组。
- `primaryByGroup: Record<group, trailId>`：每组主轨迹。
- `primaryTrailId`：当前组主轨迹的派生 getter/setter。
- `modeVisibleTags`：各地图模式独立的标注可见集合。

`Set` 写入 IndexedDB 快照前必须转换为数组，恢复时再转换回来。新状态应只有一个 owner，不再通过多个镜像字段保持“同步”。

过渡 runtime 仍提供 `applyChange()` 兼容入口。新代码应尽量发出精确 dirty mask；随着迁移推进，`applyChange` 只负责适配旧调用，不应继续膨胀。

## 核心数据模型

```typescript
type TrackTuple = [
  lat: number,
  lng: number,
  elev?: number,
  km?: number,
  ascent_m?: number,
  dayId?: number | null,
];

type EnrichedWaypoint = {
  lat: number;
  lng: number;
  name: string;
  tag?: string;
  gps_idx: number;
  label: string;
  elev: number;
};

type DayMeta = {
  d: number;
  km: number;
  asc: number;
  desc: number;
  max: number;
  min: number;
  camp: string;
  i_start: number;
  i_end: number;
};
```

`gps_idx` 把标注点、地图和海拔图绑定到同一轨迹索引；`i_start` / `i_end` 是 Day 与测距渲染的稳定范围。

## 关键算法边界

- **累计爬升/下降**：先平滑海拔，再使用阈值 accumulator，避免 GPS 噪声把每个微小上升都计入。
- **snap-to-track**：为标注点寻找最近轨迹索引并保存 `gps_idx`，地图位置和海拔位置由同一索引派生。
- **路段抽稀**：测距、分段和 Day 预览由 `src/core/render.ts` 产生受上限约束的 Leaflet model。
- **海拔布局**：`src/core/elevationProfile.ts` 计算坐标、路径、标注避让、绘制命令和自适应高度；Canvas 只消费模型。
- **存储恢复**：`src/core/storage.ts` 规范化 snapshot，并兼容旧 `primaryTrailId` 到 `primaryByGroup` 的迁移。

## 构建与发布

```text
index.html + src module graph
  -> Vite
  -> dist/index.html + temporary assets
  -> scripts/build/build_release.mjs
       ├── inline CSS and module JS
       ├── remove dist/assets
       ├── write dist/index.html
       ├── copy identical dist/hiking-trail-mapper.html alias
       ├── write dist/release.json
       └── refresh/check root hiking-trail-mapper.html
  -> GitHub Pages uploads dist/
```

“单 HTML”指最终应用不引用外部 JavaScript 或 CSS。兼容别名与 `index.html` 内容相同，不构成第二份源码。地图瓦片仍来自网络。

根目录文件职责不同：

| 文件 | 职责 | 可直接 `file://` |
|------|------|-------------------|
| `index.html` | 小型 Vite 源码入口壳 | 否 |
| `hiking-trail-mapper.html` | 自动生成的自包含发布物 | 是 |
| `dist/index.html` | GitHub Pages 主入口 | 是 |
| `dist/hiking-trail-mapper.html` | 兼容下载别名 | 是 |

## 渐进拆分 runtime.ts

`runtime.ts` 当前仍包含大量成熟但 classic 的浏览器编排。后续按行为垂直拆分，不做一次性重写：

`RenderScheduler` 对核心 redraw、`rebuildAll` 和 workspace fit 的替换、Workbench 主入口命令化以及原生浏览器对话框迁移已经完成。剩余步骤是：

1. 将动态轨迹卡、筛选器和辅助面板操作按需迁入带 payload 的命令。
2. 用 `DialogController` 继续替换帮助、更新记录、存储信息和导入面板等自建模态。
3. 将导入、导出、i18n、Leaflet/Canvas 与 IndexedDB 编排拆成小 controller/adapter。
4. 只有当发布物和真实浏览器测试不再依赖 classic globals 时，才删除兼容执行路径。

## 性能与可靠性约束

- 不在 map pan/zoom 时无条件重绘海拔图。
- 一帧内的重复刷新必须合并，fit 只执行最新请求。
- 海拔 Canvas 的绘制点数不超过像素宽度的两倍，首尾点与各桶极值必须保留；命中数据不得降采样。
- 海拔渐变轨迹最多创建 40 个颜色图层组；waypoint marker 必须按稳定 key 差异更新。
- 连续复位时，旧 fit epoch、旧 reset epoch 和移动端延迟 fit 都不得覆盖最后一次请求。
- 交互取消后，不允许 timer、RAF 或异步结果继续写状态。
- 不序列化原始 `Set`，不把 DOM/Leaflet 对象放入持久化 snapshot。
- 纯计算保持 DOM-free，并为边界输入添加单元测试。
- Workbench 的七侧栏/五底栏必须共享命令，不因响应式布局重复副作用。

## 已知限制

- 当前只原生导入 KML，不原生解析 GPX、GeoJSON 或 FIT。
- 单文件发布物不提供离线地图瓦片缓存。
- `runtime.ts` 仍需渐进拆分；主 Workbench 命令与原生对话框已统一，动态数据操作、自建模态和其余浏览器编排尚未全部模块化。
- `file://` 使用生成发布物，不使用根目录 Vite 小壳。
