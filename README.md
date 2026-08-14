<div align="center">

# Outdoor Route Studio

**面向徒步路线的离线优先 KML 工作台**

[English](README.en.md) · [在线使用](https://sicily-love.github.io/hiking-trail-mapper/) · [功能说明](docs/FEATURES.md)

![version](https://img.shields.io/badge/version-v3.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)
![license](https://img.shields.io/badge/license-MIT-green)

</div>

Outdoor Route Studio 用于查看、比较和规划徒步轨迹。它可以叠加多条 KML 路线，规划每日行程，测量局部路段，管理标注与下撤方案，并导出路线或完整项目备份。

项目只维护一套 TypeScript 源码。发布时由 Vite 同时生成 GitHub Pages 站点和可直接离线打开的单 HTML 文件。

## Workbench 3.0

v3 采用地图优先的工作台布局：顶部应用栏集中常用命令，左侧活动栏切换海拔、标注、轨迹组、轨迹与行程，路线资料库保持固定宽度，海拔分析独立位于底部。手机端保留地图主视图，将活动栏移到底部，并把路线资料库转换为可关闭的底部面板。

这次升级只重做界面结构与响应式体验。v2.3 的项目备份、KML 数据、IndexedDB 缓存、路线计算和 Leaflet 渲染保持兼容。

## 使用方式

### 在线版

打开 [GitHub Pages](https://sicily-love.github.io/hiking-trail-mapper/)。Android 和桌面 Chrome 可以将其安装为 PWA，安装后断网仍能启动应用。

### 单文件版

下载并打开 [`hiking-trail-mapper.html`](hiking-trail-mapper.html)。应用代码、样式和运行库均已内联，不需要安装 Node.js，也不需要本地服务器。

### 导入轨迹

选择“添加轨迹”，或把文件拖入地图：

- `.kml`：可一次导入多个文件。
- `.zip` / `.kml.zip`：自动提取其中的 KML。
- `.ors-project.json`：恢复完整项目备份。

当前不直接解析 GPX 或 GeoJSON，需要先转换为 KML。

## 主要功能

| 功能 | 说明 |
|---|---|
| 轨迹组 | 按项目或路线方案组织多条轨迹，设置主轨迹并控制叠加显示 |
| 测距 | 在主轨迹上选择和拖动 A/B 点，查看沿迹距离、爬升、下降和海拔剖面 |
| 行程规划 | 拖动分段边界，生成每日距离、爬升、下降、最高/最低海拔和营地信息 |
| 标注点 | 在主轨迹附近添加类型、名称、描述和可选图片 |
| 下撤方案 | 从主轨迹或同组其他轨迹选择局部路段，并关联一个或多个 Day |
| 轨迹拼接 | 裁剪、反向、排序并拼接多个轨迹片段；断点不计算虚构里程或高差 |
| 撤销与重做 | 覆盖轨迹、分段、标注、下撤和拼接等持久修改 |
| 导出 | 导出单轨 KML、分组 ZIP、行程 Markdown 或完整项目备份 |

详细操作见 [功能说明](docs/FEATURES.md)。

## 离线与数据

| 项目 | 离线情况 |
|---|---|
| 应用界面与路线工具 | PWA 安装后或单 HTML 可离线使用 |
| 已导入轨迹、行程和设置 | 保存在当前浏览器 IndexedDB 中 |
| 卫星底图 | 需要网络；未加载过的区域离线时不会显示 |
| 完整项目迁移 | 使用“导出 → 完整项目备份”生成 `.ors-project.json` |

应用不会把轨迹上传到项目服务器。清理浏览器数据、换浏览器或换设备前，应先导出完整项目备份。KML/ZIP 适合与其他地图软件交换路线，但不包含全部工作区状态。

## 本地开发

需要 Node.js 24 或当前 GitHub Actions 使用的兼容版本。

```bash
git clone https://github.com/Sicily-love/hiking-trail-mapper.git
cd hiking-trail-mapper
npm ci
npm run dev
```

常用命令：

```bash
npm run typecheck          # TypeScript 严格检查
npm run test:unit          # 全部 Node 单元测试
npm run build              # 生成 dist/ 和单文件发布物
npm run test:full          # 完整发布验证
npm run test:visual:capture
```

`npm run test:full` 会运行构建、单元测试、静态检查、真实 Chrome 功能测试、21.6 万点性能测试、PWA 离线重开、端到端测试和响应式截图回归。

## 代码结构

```text
src/
├── app/          启动、状态、命令、交互和渲染调度
├── core/         不依赖 DOM 的计算、解析和数据模型
├── features/     测距、分段、标注、行程、下撤等功能 owner
├── adapters/     Leaflet、IndexedDB、文件和浏览器边界
├── ui/           Workbench 布局、侧栏、面板和对话框
├── styles/       组件、布局和主题
└── vendor/       构建时内联的第三方浏览器库
```

入口链路为 `index.html → src/main.ts → bootstrap → studio runtime → typed feature/controller`。`src/app/runtime/studio.ts` 只负责跨功能装配；业务写入通过 typed actions，读取通过 selectors。生产环境不存在 classic bridge、字符串脚本执行或第二套 HTML 业务实现。

进一步阅读：

- [架构说明](docs/ARCHITECTURE.md)
- [测试说明](docs/TESTING.md)
- [贡献指南](docs/CONTRIBUTING.md)
- [示例轨迹](examples/README.md)

## 发布

- 当前版本：v3.0.0
- v2.3.5：冻结的兼容基线；v2.3 系列此后只接受必要修复。
- v3.x：Workbench UI 与后续功能开发主线。
- `PATCH`：修复、兼容性、文档和小型交互优化。
- `MINOR`：新增用户可见功能或数据格式。
- `MAJOR`：不兼容的数据或导出格式变化。

`npm run version:bump` 统一更新版本和中英文 CHANGELOG。`.github/workflows/pages.yml` 是唯一 Pages 发布链；仓库 Pages Source 使用 **GitHub Actions**。

## License

[MIT](LICENSE)
