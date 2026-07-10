<div align="center">

<p><a href="README.md">中文</a> | <a href="README.en.md">English</a></p>

<h1>🗺️ Hiking Trail Mapper</h1>

**单文件 KML 徒步轨迹地图 · 导入、测距、分段、导出**

</div>

<!-- [中文](README.md) | [English](README.en.md) -->

Hiking Trail Mapper 是一个单文件 KML 徒步轨迹查看与整理工具。它把地图、轨迹叠加、标注点、海拔图、分组、导入导出和本地持久化都放在一份 HTML 里：不需要构建、不需要服务器，下载后直接打开即可使用。

## 🚀 快速开始

直接打开：

```bash
open index.html
```

或克隆仓库后打开：

```bash
git clone https://github.com/Sicily-love/hiking-trail-mapper.git
open hiking-trail-mapper/index.html
```

导入轨迹：

- 点击右上角 `添加轨迹`，选择一个或多个 `.kml` 文件。
- 也可以选择 `.zip` / `.kml.zip`，程序会自动提取其中的 KML。
- 支持把文件直接拖入浏览器窗口。

## 🧭 适合做什么

| 场景 | 能力 |
|------|------|
| 多轨迹对比 | 多条路线叠加显示，当前主轨迹高亮，其余轨迹弱化 |
| 行程拆分 | 按天数着色，配合分段工具生成每日里程、爬升和营地信息 |
| 轨迹检查 | 测距工具在主轨迹上选择 A/B 点，计算沿线距离、爬升、下降和路段海拔图 |
| 标注管理 | 自动识别营地、垭口、水源、补给、桥、河流等 13 类标注点 |
| 跨设备迁移 | 导出当前分组为 KML ZIP，包含单条 KML 与合并导入文件 |
| 离线整理 | 除地图瓦片外没有运行时 CDN 依赖，数据保存在浏览器 IndexedDB |

完整交互说明见 [docs/FEATURES.md](docs/FEATURES.md)，架构说明见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## ✨ 核心功能

- **KML 导入**：支持 `LineString`、`gx:Track` 和 `Point` placemark；ZIP 内的 macOS 隐藏文件会自动跳过。
- **分组与主轨迹**：轨迹可按线路、方案或日期分组；每个分组独立记忆主轨迹。
- **地图与渲染**：内嵌 Leaflet，提供 Esri 卫星影像和地形阴影底图。
- **标注点**：自动分类、chip 筛选、双击改名、右键或长按添加；标注点会吸附到最近轨迹点，避免与海拔图错位。
- **海拔图**：Canvas 自绘，支持全轨和测距路段视图；点击曲线可反向定位到地图。
- **测距与分段**：测距用于临时分析路段，分段用于沉淀每日行程。
- **导出**：当前分组可导出 KML ZIP；主轨迹行程可导出 Markdown。
- **国际化**：内置中文和英文界面。

## 🔒 数据与隐私

所有轨迹、标注和分组状态都保存在当前浏览器的 IndexedDB 中，不会上传到任何服务器。清除浏览器数据、更换浏览器或更换设备都会导致本地数据不可见；跨设备迁移请使用 `导出 -> KML ZIP`。

## 🔁 GPX / GeoJSON

当前版本只直接解析 KML。如果源文件是 GPX，可以先转换：

```bash
ogr2ogr -f KML output.kml input.gpx
```

GeoJSON 也建议先转换为 KML 后再导入。

## 🧪 开发与测试

项目已经完成 Vite + TypeScript 工程化和浏览器层拆分，同时继续提供可直接打开的 [hiking-trail-mapper.html](hiking-trail-mapper.html) / [index.html](index.html)。两个根 HTML 都由 `src/template`、`src/ui`、`src/core` 和 `src/app` 自动生成，因此 `file://` 使用方式不变，也不再需要手工同步两份页面。

安装与开发：

```bash
npm ci
npm run dev
npm run test:unit
npm run typecheck
npm run build
./tests/run_full_check.sh
npm run test:visual:capture
```

`npm run build` 输出 `dist/index.html`、`dist/hiking-trail-mapper.html` 和 `dist/release.json`。`npm run release:prepare` 会依次同步发布物、运行真实 Chrome 完整测试、构建并检查 `dist/`。

`src/core/*.ts` 是距离、爬升、KML、存储、测距、分段、Day 预览与海拔图渲染模型的运行时真源；`src/app`、`src/features` 和 `src/adapters` 管理应用状态、交互 controller、Leaflet 与 IndexedDB 边界；`src/ui` 管理 Field Console 视觉和响应式行为。发布对齐测试直接比较内嵌 runtime 与 TypeScript 源码行为，不再保留重复核心函数。

## 🧱 当前工程结构

当前采用“模块化源码 + 单文件兼容发布”的结构：

1. `src/core/*.ts` 负责确定性计算、数据转换和渲染模型。
2. `src/app` 与 `src/features` 负责应用状态和测距、分段、Day、海拔交互 controller。
3. `src/adapters` 隔离 Leaflet 与 IndexedDB 副作用，`src/ui` 负责工作台 DOM 和视觉系统。
4. `scripts/build/generate_release_html.mjs` 将模板、CSS、两个 TS runtime 和浏览器适配脚本合成为根 HTML。
5. Vite 从生成的 `index.html` 构建 `dist/`；GitHub Actions 验证后部署 GitHub Pages。

这种结构让直接打开 HTML、GitHub Pages 和工程化开发同时成立，也避免为了框架而重写稳定的 Leaflet 交互层。

## 🧩 里程碑进度

| 里程碑 | 当前状态 | 已完成 | 后续重点 |
|--------|----------|--------|----------|
| Milestone 1：测试护栏增强 | ✅ 完成 | 单元、核心契约、UI/发布契约、HTML↔`src/core` 对齐、静态、真实 Chrome 功能和 E2E 测试均纳入六阶段完整验证 | 按新增行为持续补测试 |
| Milestone 2：工程骨架 | ✅ 完成 | Vite、TypeScript、`src/`、`dev.html`、类型检查和构建命令可用，根目录 HTML 仍可直接打开 | 常规维护 |
| Milestone 3：核心功能模块化 | ✅ 完成 | 核心函数、应用状态、features 和 adapters 均进入 `src`；45 个 HTML fallback 已删除，内嵌 runtime 直接接受行为对齐测试 | 按新功能继续拆小 controller |
| Milestone 4：UI 系统化 | ✅ 完成 | Field Console 统一桌面命令台、路线库、海拔分析坞、Day 时间轴、移动端操作栏和 bottom sheet | 使用真实数据持续做视觉回归 |
| Milestone 5：发布链路收口 | ✅ 完成 | 根 HTML 自动生成、Vite 正式构建、双入口、`release.json`、版本 bump、完整发布检查和 GitHub Pages Actions 均已固定 | 观察首次远端 Actions 运行结果 |

后续维护优先级：

1. 核心 fallback 已全部删除；后续纯计算继续只修改 `src/core`，不再恢复 HTML 同名实现。
2. 真实轨迹截图回归已覆盖 Day 卡片、A/B 测距、两日分段、桌面与移动工作台。
3. 剩余较长的浏览器 runtime 后续按导入、导出和地图交互继续拆成 controller。

## 🧭 GPX / GeoJSON 扩展评估

这两种格式适合独立功能版本实现，不与本轮工程化和 UI 修复混在同一个补丁：

- **GPX**：可将 `trk/trkseg/trkpt`、`rte/rtept` 和 `wpt` 归一到现有轨迹/标注模型；海拔和时间字段较明确，主要风险是多段轨迹拼接规则。
- **GeoJSON**：可支持 `FeatureCollection` 下的 `LineString`、`MultiLineString` 和 `Point`；第三维坐标可作为海拔，但 waypoint 类型、名称和照片属性没有统一字段，需要可配置映射。
- **推荐边界**：新增 `src/core/gpx.ts`、`src/core/geojson.ts`，统一输出当前 KML 使用的 import model；UI 只负责文件类型分派，存储、测距和分段不感知源格式。
- **测试要求**：每种格式至少覆盖单线、多段、无海拔、带时间、混合 waypoint 和非法文件，并验证导入后与 KML 轨迹行为一致。

## 🔖 版本策略

版本：v1.32.1

单文件大小约 630 KB（包含 Leaflet、fflate 和自动生成的 TypeScript core/app 运行时）。

版本号只表示对外发布节奏，不把每一项小改动都当成大版本：

- `PATCH`：bug 修复、文档更新、测试脚本、兼容性修补和小型交互优化。
- `MINOR`：新增用户可见功能、导入导出能力、数据模型字段或主要交互流程。
- `MAJOR`：不兼容的数据迁移、导出格式变化或需要用户手动处理的破坏性调整。

没有破坏性变化或大型功能时，每次用户可见修复、文档优化和小交互调整都优先走 `PATCH` 小版本；多个纯内部实现细节可以合并到同一个 patch 条目。只有在功能面、数据结构或兼容性边界明显变化时，才提升 `MINOR` 或 `MAJOR`。

## 📁 目录结构

```text
hiking-trail-mapper/
├── hiking-trail-mapper.html      自动生成的单文件应用
├── index.html                    自动生成的 GitHub Pages 入口
├── dev.html                      Vite 开发入口
├── src/                          模板、UI、core、app、features 与 adapters 源码
├── public/                       Vite 静态资源占位
├── scripts/
│   ├── build/                    HTML 生成、core 同步和 Vite 正式构建
│   ├── release/                  版本、元数据、文档同步和发布准备
│   └── maintenance/              一次性维护与源码清理工具
├── .github/workflows/pages.yml   验证与 GitHub Pages 部署
├── dist/                         Vite 正式构建产物（生成，不提交）
├── package.json                  工程化脚本与可选构建依赖
├── tsconfig.json                 TypeScript 配置
├── vite.config.mts                Vite 配置
├── CHANGELOG.md                  发布历史
├── docs/                         功能、架构、测试说明
├── examples/sample-trails/        示例 KML
├── references/tag-rules.md        标注点分类规则
├── tests/
│   ├── unit/                     core、app、UI、发布与 runtime 对齐测试
│   ├── browser/                  真实 Chrome 静态与功能测试
│   ├── e2e/                      端到端用户流程
│   └── visual/                   真实 KML 多状态截图回归
└── tools/                         可选辅助工具
```

## 🌐 部署

仓库已提供 `.github/workflows/pages.yml`。在 GitHub Pages 的 Source 中选择 **GitHub Actions**；推送 `main` 后，工作流会运行完整验证、构建 `dist/` 并部署。根目录 `index.html` 仍可用于直接打开或传统 branch/root 部署。

## 📄 License

[MIT](LICENSE)
