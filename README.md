# Hiking Trail Mapper

[中文](README.md) | [English](README.en.md)

一个单文件 HTML 应用，用于查看和管理 KML 徒步轨迹。所有依赖（Leaflet、polylineDecorator、fflate）均内嵌，无需构建、无需服务器、支持 `file://` 协议直接打开。

- 版本：v1.31.0
- 大小：约 475 KB
- 协议：[MIT](LICENSE)

## 功能

- **导入**：多选 KML 文件；支持 KML 压缩包（`.zip` / `.kml.zip`）批量导入；合并 `gx:Track` 与 `LineString`；识别 `Point` placemark 为标注点。
- **叠加**：多条轨迹在同一底图上叠加，主轨迹突出显示。
- **底图**：Esri 卫星影像 与 Esri 地形阴影两套底图切换。
- **着色模式**：按天数分色、按海拔梯度、按标注点对比。
- **标注点**：13 类自动分类；侧栏 chip 筛选；双击改名；桌面右键或手机长按（600 ms）添加；投影到最近轨迹点以避免视觉偏离。
- **海拔图**：Canvas 自绘；标注营地与最高点，带引线；点击曲线反向定位到地图。
- **分组**：轨迹可归入不同组；Tab 切换活动组；勾选任意轨迹后出现批量迁移工具栏。
- **持久化**：IndexedDB 存储，300 ms debounce 写入；刷新与重开自动恢复。
- **导出**：KML ZIP 打包（含合并版）；行程 Markdown。
- **国际化**：中文 / 英文切换。

完整功能与交互说明见 [docs/FEATURES.md](docs/FEATURES.md)。

## 安装与使用

不需要安装。下载 [`hiking-trail-mapper.html`](hiking-trail-mapper.html) 或克隆本仓库后双击打开 `index.html`。

```
git clone https://github.com/Sicily-love/hiking-trail-mapper.git
open hiking-trail-mapper/index.html
```

导入轨迹：

- 点击右上角 `添加轨迹`，选择 KML 或 KML 压缩包；
- 或将文件直接拖入浏览器窗口。

## GPX / GeoJSON 转 KML

本工具目前只解析 KML。若源数据是 GPX：

```
ogr2ogr -f KML output.kml input.gpx
```

或使用在线工具（如 gpx2kml.com）。

## 目录结构

```
hiking-trail-mapper/
├── hiking-trail-mapper.html      单文件应用（= index.html）
├── index.html                    GitHub Pages 入口
├── CHANGELOG.md                  版本历史
├── LICENSE
├── docs/
│   ├── FEATURES.md               功能与交互
│   ├── ARCHITECTURE.md           架构与关键设计
│   └── screenshots/
├── examples/
│   └── sample-trails/            示例 KML
├── tools/
│   └── generate_route_images.py  行程图片生成脚本（可选）
└── references/
    └── tag-rules.md              标注点分类规则
```

## 部署到 GitHub Pages

Settings → Pages → Source 选择 `Deploy from branch → main / (root)`。因为是单文件应用，`index.html` 即完整站点。

## 数据

所有数据保存在浏览器 IndexedDB 中，不上传任何服务器。清除浏览器数据或更换设备后数据会丢失，跨设备迁移请使用 `导出 → KML ZIP`。

## 技术栈

| 组件 | 版本 | 用途 |
|------|------|------|
| Leaflet | 1.9.4 | 地图引擎 |
| leaflet-polylineDecorator | — | 轨迹方向箭头 |
| fflate | 0.8.2 | ZIP 编解码 |
| IndexedDB | 浏览器原生 | 持久化 |
| Canvas 2D | 浏览器原生 | 海拔图渲染 |

除底图瓦片外，运行时无任何 CDN 依赖。

## 兼容性

Chrome、Safari、iOS Safari、Android Chrome 均已测试。`file://` 协议直接双击打开可用；离线状态下已加载的瓦片可继续浏览。

## 贡献

Issue 与 Pull Request 欢迎，尤其是：

- 不同地区的 KML 样本；
- 截图（`docs/screenshots/`）；
- 其他底图源适配（天地图、Mapbox、高德等）；
- GPX / GeoJSON 直接解析；
- 离线瓦片缓存（`leaflet-offline`）；
- 其他语言的 i18n。

修改代码前请阅读 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## License

[MIT](LICENSE)
