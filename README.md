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

本项目没有前端构建流程，主要代码在 [hiking-trail-mapper.html](hiking-trail-mapper.html)，[index.html](index.html) 是同内容的 GitHub Pages 入口。

常用检查：

```bash
node tests/unit/test_math.js
node tests/unit/test_enrich.js
node tests/unit/verify_alignment.js
./tests/run_full_check.sh
```

`tests/unit/trail_core.js` 是 HTML 内纯计算函数的 Node 镜像；修改距离、爬升、海拔颜色、waypoint snap 等计算逻辑时，需要同步镜像并跑对齐测试。

## 🔖 版本策略

版本：v1.31.5

单文件大小约 544 KB。

版本号只表示对外发布节奏，不把每一项小改动都当成大版本：

- `PATCH`：bug 修复、文档更新、测试脚本、兼容性修补和小型交互优化。
- `MINOR`：新增用户可见功能、导入导出能力、数据模型字段或主要交互流程。
- `MAJOR`：不兼容的数据迁移、导出格式变化或需要用户手动处理的破坏性调整。

没有破坏性变化或大型功能时，每次用户可见修复、文档优化和小交互调整都优先走 `PATCH` 小版本；多个纯内部实现细节可以合并到同一个 patch 条目。只有在功能面、数据结构或兼容性边界明显变化时，才提升 `MINOR` 或 `MAJOR`。

## 📁 目录结构

```text
hiking-trail-mapper/
├── hiking-trail-mapper.html      单文件应用
├── index.html                    GitHub Pages 入口
├── CHANGELOG.md                  发布历史
├── docs/                         功能、架构、测试说明
├── examples/sample-trails/        示例 KML
├── references/tag-rules.md        标注点分类规则
├── scripts/                       静态验收、功能测试、同步脚本
├── tests/                         单元测试与端到端测试
└── tools/                         可选辅助工具
```

## 🌐 部署

GitHub Pages 选择 `Deploy from branch -> main / (root)` 即可。因为应用是静态单文件，根目录的 `index.html` 就是完整站点。

## 📄 License

[MIT](LICENSE)
