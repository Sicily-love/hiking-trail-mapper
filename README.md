<div align="center">

<p><a href="README.md">中文</a> | <a href="README.en.md">English</a></p>

<h1>Outdoor Route Studio</h1>

**单文件 KML 户外路线工作台 · 导入、对比、测距、分段与导出**

</div>

Outdoor Route Studio 是一个地图优先的 KML 路线查看与整理工具。应用实现只维护在 `src/`：根目录 `index.html` 是加载 `src/main.ts` 的 Vite 小壳，Vite 再把完整模块图生成并内联为可离线打开的单 HTML 发布物。

## 快速开始

直接使用仓库中的生成发布物：

```bash
open hiking-trail-mapper.html
```

`hiking-trail-mapper.html` 可通过 `file://` 直接打开；除在线地图瓦片外，应用代码、样式、Leaflet 和压缩库都已内联。根目录 `index.html` 是源码入口壳，应通过 Vite 使用，不是离线发布文件。

本地开发：

```bash
git clone https://github.com/Sicily-love/hiking-trail-mapper.git
cd hiking-trail-mapper
npm ci
npm run dev
```

导入路线：

- 选择“添加轨迹”，导入一个或多个 `.kml` 文件。
- 也可导入 `.zip` / `.kml.zip`，应用会提取其中的 KML 并跳过 macOS 元数据文件。
- 支持把文件直接拖入工作区。

## 核心能力

| 场景 | 能力 |
|------|------|
| 多路线对比 | 叠加多条路线，突出当前分组的主轨迹并弱化辅助轨迹 |
| 每日行程规划 | 按天分段，生成每日距离、爬升、下降、海拔和营地信息 |
| 路段检查 | 在主轨迹上选择 A/B 点，计算沿迹距离、爬升、下降并查看路段海拔 |
| 标注管理 | 在主轨迹选点，选择图标与类型、填写描述并添加可选图片，也可筛选和改名 |
| 下撤方案 | 切换同组依据轨迹并选择 A/B 路段，方案归档到主轨迹行程中 |
| 轨迹拼接 | 从零多选来源轨迹，在地图中裁剪、反向和排序多个片段；断点不产生虚构里程或高差 |
| 安全编辑 | “编辑”菜单提供全局撤销/重做，覆盖轨迹、分段、标注、下撤和拼接等持久修改 |
| 数据迁移 | 将当前分组导出为 KML ZIP、将行程导出为 Markdown，或用版本化项目文件完整迁移轨迹与工作区 |

完整交互说明见 [功能说明](docs/FEATURES.md)，实现边界见 [架构说明](docs/ARCHITECTURE.md)。

## Workbench

Workbench 使用同一组命令语义适配不同屏幕：

- 桌面端和移动端均保留轨迹、行程、标注点、设置四个明确入口。
- 路线库与主轨迹摘要位于轨迹页，保存的下撤方案直接归入行程页。
- 底部区域专注海拔分析；测距操作临时嵌入海拔区，分段使用独立编辑面板。
- 命令状态、键盘/指针交互、渲染刷新和模态对话框分别由专门的管理器协调，避免 DOM 事件各自维护一套状态。

## 数据与隐私

轨迹、标注和分组状态保存在当前浏览器的 IndexedDB 中，不会上传到应用服务器。清除浏览器数据、更换浏览器或设备前，请使用“导出 → 完整项目备份”生成 `.ors-project.json`；恢复时应用会验证格式与 `schemaVersion`，自动迁移旧 schema，并在替换失败时回到恢复前快照。KML ZIP 更适合与其他地图软件交换路线，不包含全部工作区状态。

## 工程结构

当前入口链路是：

```text
index.html
  -> src/main.ts
  -> bootstrapOutdoorRouteStudio()
  -> mountAppShell()
  -> vendor side-effect modules
  -> startStudioRuntime({ document, commands, dialogs })
  -> typed core / feature controllers / adapters
```

- `index.html` 只保留元信息、`#app` 和 `/src/main.ts`，不承载业务实现。
- `src/app/bootstrap.ts` 挂载 Workbench DOM，通过 Vite 模块图加载 vendor，并显式启动 Studio runtime；业务代码不再通过字符串脚本执行。
- `src/core` 负责无 DOM 的计算、解析、版本化项目归档、数据转换和渲染模型。
- `src/app` 与 `src/features` 负责状态和交互编排；工作区状态和项目数据分别由 `AppStateStore`、`ProjectStore` 持有，写入走 typed action、读取走 selector；`src/adapters` 隔离 Leaflet、IndexedDB、ZIP、Blob 与浏览器文件保存；`src/ui` 负责 Workbench、侧栏/导入 owner 与对话框。
- `InteractionManager` 保证测距、分段、标注、下撤、轨迹拼接和 Day 预览等交互互斥。
- `RenderScheduler` 通过 dirty mask 合并轨迹、标注、侧栏、行程、图例、海拔图和 fit 刷新；海拔图按像素 min/max 降采样，轨迹按最多 40 个色带绘制，Marker 使用稳定 key 差异更新，连续复位只有最后一次生效。
- `CommandRegistry` 统一顶部菜单、桌面/移动活动栏、底部分析栏、撤销/重做和快捷键；`DialogController` 已替换全部原生 `alert/prompt/confirm`，统一焦点恢复和危险确认。

`v2.0.0` 删除了 classic 启动桥；当前进一步把 `studio.ts` 从约 6200 行压到约 3940 行。KML 项目构建、复位/fit、侧栏/行程和导入界面已有独立 owner，主 runtime 与 typed feature 只通过 project/state actions 和 selectors 交换数据。仅真实浏览器测试通过 `?studio-test=1` 启用 inspector，正常发布不暴露业务 globals。

## 开发与测试

```bash
npm run test:unit
npm run typecheck
npm run build
./tests/run_full_check.sh
npm run test:visual:capture
```

完整测试默认包含真实 Chrome 功能、端到端和视觉布局回归；`test:visual:capture` 可单独生成截图，便于人工检查具体界面状态。

`npm run build` 以小壳 `index.html` 为 Vite 入口，将 JavaScript 和 CSS 内联到 `dist/index.html`，并生成兼容别名 `dist/hiking-trail-mapper.html` 与 `dist/release.json`。两个 HTML 名称指向同一份自包含发布内容，不是两套源码。

`npm run release:prepare` 用于正式发布：同步生成物、运行完整验证、构建单文件并检查发布元数据。详细命令与分层见 [测试指南](docs/TESTING.md) 和 [贡献指南](docs/CONTRIBUTING.md)。

## 里程碑

| 里程碑 | 状态 | 结果 |
|--------|------|------|
| Milestone 1：测试护栏 | 完成 | 单元、静态、真实 Chrome、E2E、视觉和发布检查形成完整验证链 |
| Milestone 2：工程骨架 | 完成 | Vite、TypeScript、`src/` 和类型检查进入日常开发 |
| Milestone 3：核心模块化 | 完成 | 核心计算、KML、存储、测距、分段和海拔模型以 TypeScript 为真源 |
| Milestone 4：UI 系统化 | 完成 | Workbench 统一桌面、移动、侧栏、底栏、海拔坞和 bottom sheet |
| Milestone 5：发布链路 | 完成 | Vite 单文件构建、发布元数据、完整检查和 GitHub Pages 部署固定 |
| Milestone 6：Architecture & UX 2.0 | 完成 | 删除 classic bridge/composer，直接模块启动、统一 manager、Workbench 和单 HTML 发布链收口 |

Milestone 6 已完成 Architecture 2.0 基线：生产启动链中不存在 runtime 字符串注入、fragment composer 或双执行路径。后续迭代以 typed feature、性能与新格式支持为主，不再调整整体启动架构。

## GPX / GeoJSON

当前只直接解析 KML。GPX 可先转换：

```bash
ogr2ogr -f KML output.kml input.gpx
```

未来如原生支持 GPX / GeoJSON，应在 `src/core` 中归一为现有导入模型，让存储、测距、分段和渲染不感知源格式。

## 版本策略

版本：v2.2.5

- `PATCH`：修复、文档、测试、兼容性和小型交互优化。
- `MINOR`：新增用户可见能力、数据字段或主要工作流。
- `MAJOR`：不兼容的数据迁移或导出格式变化。

使用 `npm run version:bump` 统一更新发布元数据，不手工散改版本戳。

## 目录

```text
hiking-trail-mapper/
├── index.html                    Vite 小壳源码入口
├── hiking-trail-mapper.html      自动生成的离线单文件发布物
├── src/
│   ├── main.ts                   浏览器模块入口
│   ├── app/                      bootstrap、状态、命令、交互与渲染协调
│   ├── core/                     无 DOM 的计算与数据模型
│   ├── features/                 功能 controller
│   ├── adapters/                 Leaflet / IndexedDB 边界
│   ├── ui/                       Workbench、布局与对话框
│   ├── styles/                   全局与 vendor 样式入口
│   └── vendor/                   构建时内联的浏览器依赖
├── scripts/                      build、release 与 maintenance 工具
├── tests/                        unit、browser、e2e 与 visual
├── docs/                         中英文功能、架构、测试和贡献说明
├── dist/                         Vite 生成的 Pages 发布目录
└── .github/workflows/pages.yml   验证并部署 GitHub Pages
```

## 部署

`.github/workflows/pages.yml` 在 pull request 上验证，在 `main` 推送时运行 `npm run release:prepare`、上传 `dist/` 并部署 GitHub Pages。Pages 入口是构建后的自包含 `dist/index.html`；根目录小壳不直接作为部署产物。

## License

[MIT](LICENSE)
