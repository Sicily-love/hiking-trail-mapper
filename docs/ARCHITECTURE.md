# 架构与设计决策 · Architecture

给贡献者与技术好奇者。

## 概览

单文件 HTML，无构建流程，无外部依赖。所有资源（Leaflet、fflate、CSS、JS、i18n 字典、CHANGELOG）都塞在同一份 HTML 里。

## 为什么单文件

- **零部署摩擦**：GitHub Pages / 云盘 / 本地文件夹 / AirDrop 到手机 —— 任何能承载 HTML 的地方都能跑
- **file:// 协议兼容**：手机断网也能玩本地已存的地图和数据
- **fork 友好**：git clone 一份，改任何东西都在同一个文件里，diff 一目了然

## 为什么不用框架

- 单文件应用不适合引入 build tool（Webpack/Vite）
- Leaflet 本身够用，不需要 React/Vue 加持
- 手写原生 DOM + 事件监听 = 极小体积（整包 ~475KB，其中 Leaflet 占 ~140KB，fflate 占 ~32KB）

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
    ├── const APP_VERSION / CHANGELOG (双语)
    ├── i18n 字典 (zh / en)
    ├── state 对象（activeTrails / expandedTrails / primaryTrailId / activeGroup / batchMode / batchSelected 等）
    ├── DATA 对象（trails 数组 + calc_method）
    ├── KML 解析 (parseKML)
    ├── 计算引擎（haversine / accumulator_ascent / smooth_elev / enrich_waypoints）
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
- `state.batchMode` = boolean
- `state.batchSelected` = `Set<trailId>`（批量模式下选中的）
- `state.activeGroup` = string
- `state.primaryTrailId` = string
- 改状态后统一走 `rebuildAll()` / `buildTrailList()` / `saveToStorage()`

## 版本发布检查清单

改模板后必跑：

1. HTML 顶部注释 `APP_VERSION` + `BUILD_DATE`
2. `<title>` 版本号
3. `version-tag` DOM
4. JS 内 `const APP_VERSION`
5. `CHANGELOG` 数组追加 zh + en 条目
6. Node syntax check：`node --check <(extract-inline-js.py)`
7. Chrome headless dump-dom smoke test：`google-chrome --headless=new --dump-dom` 检查 DOM 完整
8. Safari file:// 手动跑一遍所有交互（勾选/展开/切组/批量/导出）

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
