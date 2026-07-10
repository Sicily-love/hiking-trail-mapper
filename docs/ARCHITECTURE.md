# 架构与设计决策 · Architecture

**🌐 [中文](ARCHITECTURE.md) · [English](ARCHITECTURE.en.md)**

给贡献者与技术好奇者。

## 概览

发布物仍是可直接打开的单文件 HTML，但根 HTML 已经是生成物。`src/core` 承载无 DOM 计算与渲染模型，`src/app` 和 `src/features` 承载状态与交互 controller，`src/adapters` 隔离 Leaflet/IndexedDB，`src/ui` 管理 Field Console。`scripts/build/generate_release_html.mjs` 将这些源码合成为内联 `HikingTrailCore`、`HikingTrailApp` 和浏览器 runtime。

## 工程化源码树

```text
src/
├── template/app.html  单文件发布壳，不包含生成 CSS/runtime
├── ui/
│   ├── workbench.css  Field Console 视觉与响应式
│   └── workbench.ts   命令台、侧栏、海拔坞 DOM controller
├── app/
│   ├── state.ts       应用状态与分组主轨迹描述符
│   ├── index.ts       App runtime 统一导出
│   └── runtime.js     浏览器事件和 Canvas/Leaflet 编排
├── features/          测距、分段、Day 与海拔交互 controller
├── adapters/          Leaflet 与 IndexedDB 副作用边界
├── core/
│   ├── types.ts       基础类型
│   ├── geo.ts         haversine / 累计里程 / 最近点
│   ├── elevation.ts   平滑、爬升下降、海拔配色、统计
│   ├── elevationProfile.ts 海拔图布局、绘制数据、标注布局/命令与面板高度模型
│   ├── kml.ts         KML 坐标、图片 URL、标签和导入模型组装
│   ├── trail.ts       trail id、waypoint snap、内容哈希
│   ├── measure.ts     A/B 区间、抽稀线段、测距统计
│   ├── itinerary.ts   分段点、边界拖动、每日统计、营地编辑归属
│   ├── render.ts      测距、分段和 Day 预览的 Leaflet 渲染模型
│   └── index.ts       核心模块统一导出
├── main.ts            Vite 开发入口，暴露两个 TypeScript runtime
└── ../dev.html        Vite 开发壳，iframe 加载当前发布 HTML
```

`src` 是唯一源码入口。根目录 `index.html` 和 `hiking-trail-mapper.html` 由生成器写入，不直接编辑。45 个同名核心 fallback 已删除；对齐测试在 Node 中执行正式 HTML 内嵌 IIFE，并与 `src/core` 的同一组输入输出比较。`tests/unit/trail_core.js` 只是 CommonJS 测试桥。

## 为什么单文件

- **零部署摩擦**：GitHub Pages / 云盘 / 本地文件夹 / AirDrop 到手机 —— 任何能承载 HTML 的地方都能跑
- **file:// 协议兼容**：手机断网也能玩本地已存的地图和数据
- **fork 友好**：源码按职责拆分，发布时仍只交付一个文件

## 为什么发布物仍保持单文件

- 发布物继续保持 `file://` 与 GitHub Pages 简单部署
- Vite / TypeScript 核心已经进入正式运行时，构建后仍内联为单文件
- Leaflet 本身够用，不需要 React/Vue 加持
- 原生 DOM + 事件监听保持低运行时开销，正式单文件约 630KB（包含 Leaflet、fflate 和两个 TS runtime）

## 关键文件（在同一份 HTML 里）

```
hiking-trail-mapper.html
├── <head>
│   ├── Leaflet CSS (embedded)
│   ├── App CSS
│   └── fflate 0.8.2 UMD (embedded, ~32KB)
│       └── ⚠ 必须 inline，不能 CDN — file:// 下同步 CDN <script> 会阻塞整页
├── <body>
│   ├── #map           ← Leaflet 主容器
│   ├── #sidebar       ← 轨迹列表 / 分组 Tab / 批量工具栏
│   ├── #elev-bar      ← 底部海拔图 Canvas
│   └── 各种 modal / toast / popup
└── <script>
    ├── Leaflet 1.9.4 UMD (embedded, ~140KB)
    ├── leaflet-polylineDecorator (embedded)
    ├── HikingTrailCore IIFE（由 src/core 自动生成）
    ├── const APP_VERSION / CHANGELOG (双语)
    ├── i18n 字典 (zh / en)
    ├── state 对象（activeTrails / expandedTrails / primaryTrailId / activeGroup / batchMode / batchSelected 等）
    ├── DATA 对象（trails 数组 + calc_method）
    ├── KML 解析 (parseKML)
    ├── 核心运行时绑定（测距 / 分段 / KML / 存储 / 海拔模型）
    ├── 渲染层（buildTrailList / buildPrimaryCard / drawElevBar / 各种 draw*）
    ├── 交互层（右键菜单 / 长按 / 双击改名 / 分组切换 / 批量选择）
    ├── 持久化层（loadFromStorage / saveToStorage / IndexedDB 封装）
    ├── 导出层（exportGroupKML / exportItineraryMD / showExportMenu）
    └── i18n 层（setLang / applyI18n / t / refreshAll）
```

## 数据模型

```typescript
type Trail = {
  id: string;                    // 唯一 ID
  name: string;                  // 显示名（可双击改）
  color: string;                 // 主色
  group?: string;                // v1.14.0+ 分组，默认 "默认"
  tracks: TrackPoint[];          // GPS 序列 [lat, lon, alt, km, timestamp?]
  waypoints: Waypoint[];         // 标注点
  totalKm: number;
  totalAsc: number;              // 使用 accumulator thr=10
  maxElev: number;
  // ...
};

type Waypoint = {
  lat: number;
  lng: number;
  name: string;
  tag: string;                   // 13 类之一
  gps_idx: number;               // 投影到 tracks 数组的最近 idx（用于海拔图对齐）
  manual?: boolean;              // 用户手动添加标记
};
```

## 关键算法

### 累计爬升（accumulator, thr=10m）

朴素累加会因为 GPS 噪声（±3~5m）虚增几倍。改用带阈值的累加器：

```
running_asc = 0
peak = alt[0]
total_asc = 0
for i in 1..n:
  d = alt[i] - alt[i-1]
  if d > 0:
    running_asc += d
    if alt[i] > peak: peak = alt[i]
  else:
    if running_asc > 10:  # 阈值
      total_asc += peak - trough
    running_asc = 0
    peak = alt[i]
```

实测对比 2bulu 官方 2502m → 我们算 2459m（误差 1.7%）。朴素方法给 3811m（误差 52%）。

### snap-to-track（标注点视觉对齐）

手动添加的标注点或来自 KML 的 Placemark 可能不在轨迹线上。处理：

```
for each waypoint:
  min_dist = infinity
  best_idx = 0
  for i in 0..track.length:
    d = haversine(waypoint, track[i])
    if d < min_dist:
      min_dist = d; best_idx = i
  waypoint.gps_idx = best_idx
  waypoint.lat, lng = track[best_idx][0], track[best_idx][1]  # 视觉上贴到轨迹
```

海拔图上用 `gps_idx` 定位对应 X 坐标。

### 海拔图高度自适应（扫描线预测）

之前用「双 pass」（画一遍 → 检查溢出 → 重画），会因 H 变化反推 pY 反推标签位置而**震荡**。

改用**扫描线预测**：先按 X 排序所有标签，扫描一遍找出最大水平重叠数（stackDepth），一次算出 H：

```
H = max(140, min(340, 110 + (stackDepth + 1) * (lh + 2) + 16))
```

`stackDepth + 1` 是预留一层，避免边界情况。

## file:// 协议兼容坑

单文件 HTML 直接双击打开时是 `file://` 协议，很多现代浏览器 API 会限制：

| API | file:// 限制 | 应对 |
|-----|-------------|------|
| `fetch(location.href)` | Safari 拒绝加载自身 | 用 `document.documentElement.outerHTML` |
| CDN 同步 `<script>` | headless Chrome 阻塞整页渲染 | 全部 inline |
| Service Worker | 不可用 | 不用 |
| IndexedDB | ✅ 可用 | 直接用 |
| Web Crypto | 部分可用 | 不用 |

## 状态管理约定

- 每个状态只有**一个真源**（不搞 getter 反射多个 Set）
- `state.activeTrails` = `Set<trailId>`（勾选叠加的）
- `state.expandedTrails` = `Set<trailId>`（展开详情的）
- `state.batchSelected` = `Set<trailId>`（批量选中的；v1.15.0 起替代 batchMode 布尔，size>0 即视为进入批量模式）
- `state.activeGroup` = string
- `state.primaryTrailId` = string
- `state.visibleTags` = `Set<string>`（当前显示的标签类型）
- `state.mode` = `'day' | 'waypoint'`（分天视图 vs 标注点视图）
- 改状态后**必须**统一走 `applyChange()`（v1.17.0 起），不再散落调用 `rebuildAll + saveToStorage`

## v1.17.0+ 函数拆分架构

三个大函数（合计 703 行）拆成编排层 + 22 个语义辅助（v1.17.0-v1.18.0）：

### buildTrailList（v1.17.0）
```
buildTrailList (25 行编排)
├── renderGroupTabs()
├── renderBatchToolbar(others)
├── renderTrailCard(tr)
│   ├── trailCardHeaderHtml(tr, ...)
│   ├── trailCardExpandedHtml(tr)
│   ├── handleTrailCardClick(tr, e)
│   │   └── isDetailButtonTarget(el)
│   ├── handleTrailDetailClick(tr, e)
│   └── handleTrailGroupChange(tr, newGroup, sel)
└── moveBatchToGroup(target)
```

### handleFiles（v1.18.0）
```
handleFiles (17 行编排)
├── expandZipFiles(files)          → 展开 .zip → File-like 数组
├── for each file:
│   └── importSingleKml(f)
│       ├── parseAndProcessKml(text, name)
│       ├── findDuplicateTrail(trail) → 去重
│       ├── ensureUniqueTrailId(trail)
│       ├── renderKmlImportRow(label, trail)
│       └── bindKmlImportRowEvents(row, trail)
└── postImportFinalize(addedCount)
```

### parseAndProcessKml（v1.18.0）
```
parseAndProcessKml (36 行编排)
├── parseKml(xmlText)                    → 原始 IO
├── processTrack(trackPoints)
├── enrichWaypoints(waypoints, trackPoints)
├── computeCumulativeDistance(pts)
├── buildDayMeta(pts, track, wps, cumD)
├── computeTrailStats(elevs, cumD, smoothE)
└── generateNextTrailId(DATA.trails)
```

### drawElevBar（v1.18.0）
```
drawElevBar (24 行编排)
├── computeElevLayout(pts, opts)        → 坐标系 + km 数组
├── updateElevBadges(alts)              → 顶部 ↑↓ 徽章
├── drawElevBackground(layout)          → 米色卡纸 + 噪点
├── drawElevGridLines(layout)           → 25/50/75% 虚线
├── drawElevFill(pts, layout)           → 分段海拔色填充
│   └── elevRatioColor(ratio)
├── drawElevCurve(pts, layout)          → 曲线 + 底线
├── collectElevAnnotations(pts, layout, opts) → 峰/谷/营地
├── layoutElevLabels(annos, layout, pts)      → 避让 + 引线布局
├── renderElevLabels(annos, layout)     → 绘制文字 + 黑点
└── drawElevAxes(layout)                → Y 轴 + X 轴刻度
```

## v1.19.0 工程化基建

**JSDoc 类型注解**：所有关键函数带 `@param` + `@returns`。`@typedef` 集中定义在文件顶部：

- `TrackPoint / TrackTuple` — GPS 原始点与紧凑元组
- `Waypoint / DayMeta / TrailStats / EscapeRoute` — 数据模型
- `Trail` — 完整轨迹对象
- `ElevLayout / ElevAnnotation` — 海拔图内部结构
- `ImportedFile` — handleFiles 的 File-like

**tests/ 完整目录**：

```
tests/
├── run_full_check.sh    # 一键 6 阶段
├── unit/
│   ├── trail_core.js    # CommonJS 兼容桥 → src/core/index.ts
│   ├── test_math.js     # 30 个数学函数断言
│   ├── test_enrich.js   # 12 个 snap/hash 断言
│   ├── test_core_contract.js     # 4 个 TS 核心导出契约
│   ├── test_kml_core.js          # 11 个 KML 导入模型/底层断言
│   ├── test_storage_core.js      # 12 个 IndexedDB 快照/读写操作/恢复契约断言
│   ├── test_measure_itinerary.js # 27 个测距/海拔布局绘制标注面板高度/分段/Day 预览/渲染模型断言
│   ├── test_vite_entry.js        # 3 个 Vite 开发入口断言
│   └── verify_alignment.js       # 67 项 HTML↔src/core 对齐校准
└── e2e/
    └── run_all.py       # 16 场景 · 62 断言（headless Chrome）
```

## 状态变更统一入口 applyChange

```javascript
applyChange({ save: true, fit: false, tracksOnly: false })
```

- `save`：是否触发 IndexedDB 保存（默认 true）
- `fit`：是否 fitBounds 到主轨迹
- `tracksOnly`：只重绘轨迹（跳过 UI 面板重建）

所有 state 变更后调此函数，替代 v1.16.0 前散落的 `rebuildAll + saveToStorage` 模式。

## 版本发布检查清单

发布前推荐使用固定流程：

```bash
npm run version:bump -- patch --zh "中文更新项" --en "English change"
npm run release:prepare
```

`release:prepare` 会依次执行：

1. 生成并校验内联 `HikingTrailCore`
2. 同步 `hiking-trail-mapper.html` / `index.html` / CHANGELOG / README
3. 运行六阶段完整验证
4. Vite 构建 `dist/`
5. 校验两个静态入口和 `release.json`

## 常见性能陷阱

- **重复 rebuildAll**：切组、批量选择、改名等 UI 操作要精准调用最小子树重建（`buildTrailList()` 而不是 `rebuildAll()`）
- **Set 序列化**：`JSON.stringify(new Set())` → `"{}"`。所有 Set 字段在存/读时用 `Array.from()` / `new Set(arr)` 转换
- **海拔图重绘**：地图 pan/zoom 时不需要重绘海拔图；只有 primaryTrail 或数据变化时才需要

## 想加新功能？

推荐流程：
1. 在 CHANGELOG 顶部占坑一个 `vX.Y.Z-dev` 条目
2. 在 `state` 对象里加字段
3. 找到最相关的 `build*` 函数改 UI
4. 需要持久化的字段加到 `_doSave` 的 minimal 对象
5. 加/改 i18n 词条（zh + en 都要）
6. 语法检查 + dump-dom smoke test
7. Safari file:// 手动 QA

## 已知限制

- 只支持 KML 导入（不支持 GPX、GeoJSON、FIT）
- 单文件 HTML 无法做地图瓦片离线缓存（需要 Service Worker）
- 中国大陆访问 Esri 底图有时会慢；国外用户没问题
- iOS 15 以前的 Safari 不完全支持 IndexedDB `getAll`（自行 fallback）
