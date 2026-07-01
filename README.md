# 🏔 Hiking Trail Mapper

> **单文件 · 纯前端 · 离线可用** —— 把 KML 轨迹变成一张会讲故事的徒步地图。

<div align="center">

![version](https://img.shields.io/badge/version-v1.14.1-blue)
![size](https://img.shields.io/badge/size-~475KB-brightgreen)
![deps](https://img.shields.io/badge/dependencies-0%20external-brightgreen)
![license](https://img.shields.io/badge/license-MIT-orange)
![i18n](https://img.shields.io/badge/i18n-中/English-lightgrey)

**[📥 立即下载](hiking-trail-mapper.html) · [📸 截图](docs/screenshots/) · [📖 详细功能](docs/FEATURES.md) · [📝 更新日志](CHANGELOG.md)**

</div>

---

## 这是什么

一个 **单文件 HTML**（~475KB，Leaflet + fflate 全内嵌），拖入 KML 就能得到一张交互式徒步地图。**打开即用、离线可用、手机也能用**。

无需服务器、无需构建、无需 npm，甚至无需联网（第一次加载底图后底图会被浏览器缓存）。

## 特性总览

| 分类 | 功能 |
|------|------|
| **导入** | 多选 KML 文件一次导入；自动合并 `gx:Track` + `LineString`；识别 Point placemark 为标注点 |
| **地图** | Esri 卫星 / 地形 双底图切换；多轨迹叠加（主轨迹粗亮 / 其他半透明）|
| **着色模式** | 天数 / 海拔梯度 / 标注点对比 三选一 |
| **标注点** | 13 类 tag 自动分类；chip 筛选；双击改名；桌面右键 / 手机长按 600ms 新增；`snap-to-track` 视觉对齐 |
| **海拔图** | 营地/最高点标注 + 引线；点击反向定位到地图；扫描线预测算法自适应高度 |
| **分组 v1.14.0+** | 多组管理，Tab 切换；**批量分组 v1.14.1**：一次选中多条移入组 |
| **持久化** | IndexedDB（300ms debounce）；刷新不丢，重开自动恢复 |
| **导出** | KML ZIP 打包 · 行程 Markdown · 点击式菜单 v1.14.1 |
| **国际化** | 中/英双语，一键切换 |
| **兼容** | Chrome / Safari / iOS Safari / Android Chrome，`file://` 协议直接双击打开 |

## 快速开始

### 方式一：直接使用（推荐）

1. [下载 `hiking-trail-mapper.html`](hiking-trail-mapper.html)（或 clone 本仓库后打开 `index.html`）
2. 双击在浏览器打开
3. 点右上角 `➕ 添加轨迹`，选一个或多个 KML 文件
4. 玩起来

### 方式二：从 GPX/GeoJSON 转 KML

浏览器打开 [gpx2kml.com](https://gpx2kml.com) 或用 GDAL：

```bash
ogr2ogr -f KML output.kml input.gpx
```

### 方式三：手机端离线使用

1. 用 AirDrop / 微信文件助手 / 邮件 把 `hiking-trail-mapper.html` + 你的 KML 一起传到手机
2. iOS：文件 App → 打开 → Safari 打开；Android：任意浏览器打开
3. 首次加载底图需要网络；之后离线状态下依然可以浏览已加载区域

## 界面一览

```
┌─────────────────────────────────────────────────────┐
│  徒步路线地图              [卫星 ▼] [模式 ▼] [🌐 EN] │
├──────────────┬──────────────────────────────────────┤
│  组标签栏     │                                      │
│  [默认] [北线] │            Leaflet 地图              │
│               │                                      │
│  ⭐ 主轨迹    │      （多条轨迹叠加）                │
│  ─────────    │                                      │
│  ☐ 批量分组  │                                      │
│               │                                      │
│  ▢ 轨迹 A    │                                      │
│  ▢ 轨迹 B    │                                      │
│  ▢ 轨迹 C    │                                      │
│               ├──────────────────────────────────────┤
│  📤 导出      │  海拔图（点击反向定位到地图）        │
└──────────────┴──────────────────────────────────────┘
```

## 使用示例

`examples/sample-trails/` 目录下有一组「格聂牧场+V」四天路线的 KML 样本（4 位用户在同一区域上传的变体），可以直接一次拖入体验多轨迹叠加、分组、批量迁移、导出等功能。

## 目录结构

```
hiking-trail-mapper/
├── hiking-trail-mapper.html    ← 主入口（=index.html）
├── index.html                  ← 同上，方便部署到 GitHub Pages
├── README.md                   ← 本文件
├── LICENSE                     ← MIT
├── CHANGELOG.md                ← 完整更新日志（31 个版本）
├── docs/
│   ├── FEATURES.md             ← 详细功能与交互文档
│   ├── ARCHITECTURE.md         ← 技术架构 & 关键设计决策
│   └── screenshots/            ← 截图（等你贡献 PR）
├── examples/
│   ├── README.md
│   └── sample-trails/          ← 示例 KML
├── tools/
│   ├── generate_route_images.py  ← 行程图片生成（PIL，1080×1440）
│   ├── requirements.txt
│   └── README.md
└── references/
    └── tag-rules.md            ← 13 类标注点分类规则
```

## 部署到 GitHub Pages

1. 把这个仓库 push 到 GitHub
2. Settings → Pages → Source 选 `Deploy from branch` → `main` / `/ (root)`
3. 保存，几秒后即可访问 `https://<username>.github.io/hiking-trail-mapper/`

因为是单文件应用，`index.html` 就是全部。

## 技术栈

- **Leaflet 1.9.4** —— 地图引擎（内嵌）
- **leaflet-polylineDecorator** —— 轨迹方向箭头（内嵌）
- **fflate 0.8.2** —— ZIP 打包（内嵌，非 CDN，file:// 协议兼容）
- **IndexedDB** —— 客户端持久化
- **Canvas 2D** —— 海拔图自绘

**零第三方 CDN 依赖**，除底图外整个应用完全自包含。

## 常见问题

**Q: KML 里没有海拔怎么办？**
海拔为 0 或缺失时海拔图会退化为一条直线。请用支持 GPS + 气压计的设备（如两步路 / 六只脚 / Garmin）导出。

**Q: 累计爬升为什么和某某软件不一样？**
本工具使用「阈值累加器算法」（thr=10m）过滤 GPS 噪声。实测误差 < 2%（对比 2bulu 官方数据）。不同 App 阈值策略不同，结果会有 5%~50% 差异，我们的偏保守稳健。

**Q: 底图能换吗？**
默认卫星（Esri World Imagery）+ 地形（World_Shaded_Relief），可在源码里换成 OpenStreetMap / 天地图 / Mapbox / 高德。搜关键字 `L.tileLayer`。

**Q: 数据存哪里？会不会泄露？**
所有数据在你自己的浏览器 IndexedDB 里，**从不上传任何服务器**。清缓存或换设备就没了。想跨设备用 → 用 `📤 导出 → KML ZIP` 打包传输。

**Q: 手机 Safari 打开卡死？**
v1.14.0 版本因为使用了 modal + CDN 加载导致 Safari file:// 下卡死，v1.14.1 已修复（fflate 全内嵌 + 无 modal，改用悬浮菜单）。请务必使用 v1.14.1+。

## 贡献

欢迎提 Issue / PR。特别欢迎：
- 更多测试数据（不同地区的 KML 样本）
- 截图（`docs/screenshots/`）
- 底图源适配（比如天地图 API key 支持）
- GPX 直接导入（目前需要先转 KML）
- 离线底图缓存（leaflet-offline）
- i18n 补充（日/韩/法/西）

## License

[MIT](LICENSE) —— 请自由 fork、修改、商用；如果你做出了有意思的分支，希望能告诉我。

## Credits

- 设计参考：Gaia GPS、Fatmap、六只脚、两步路
- 灵感来源：野外队友们「你的轨迹能不能一键发我看」的痛点
- 特别感谢：Leaflet 团队多年维护、fflate 作者的极简哲学

---

<div align="center">

**Made with ❤️ for people who walk in the mountains.**

If this helped your trip, [drop a star](https://github.com/yourusername/hiking-trail-mapper) — it's the only way I know you found it useful.

</div>
