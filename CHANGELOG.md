# Changelog

**🌐 中英双语条目 · Chinese and English entries preserved per version**

All notable changes to Hiking Trail Mapper. Both Chinese and English entries preserved from in-app CHANGELOG.

## v1.31.0 — 2026-07-02

**中文**

- 🐛 修复"选完 AB → 复位 → 再选 B 慢"：measureReset 现在同步刷新海拔图回全轨模式，避免下次 measureCompute 的 refreshElevBar 与残留状态竞态
- ⚡ 海拔图 predictStackDepth 用 for-loop 找 min/max/peakIdx/valleyIdx，替换 alts.map + Math.min(...spread) + indexOf，大轨迹上省几十 ms 且避免栈溢出
- ✨ 从浏览器缓存恢复数据后自动执行一次复位（resetView），保证视野贴到主轨迹上
- 🛠 sync_release.sh 默认以 template 为准（不再从 hiking_trail_assets/current 特化版拉，避免误覆盖新版本）

**English**

- 🐛 Fix "select AB → reset → re-select B slow": measureReset now syncs elevation bar back to full-trail mode, avoiding race with next measureCompute\
- ,
        
- ,
        
- ,
        

## v1.30.0 — 2026-07-02

**中文**

- 🎯 定位到轨迹上点击慢的真正真凶：不是 JS handler，而是浏览器渲染层的 SVG path 命中测试 —— 长轨迹的 SVG path 有几千段，每一次 mousemove/mousedown 都要 O(n) 段命中检测
- ⚡ 测距/分段模式下给 map container 加 .measure-active 类，CSS 强制所有 SVG path 变为 pointer-events: none，浏览器完全跳过命中测试
- ✂ 取消测距完成后的自动 fitBounds 复位（用户不希望测距时视图跳转）
- ✂ 取消退出测距时的自动 resetView 复位

**English**

- 🎯 Pinpointed the real cause of on-trail click slowness: not JS handlers, but browser-level SVG path hit-testing — long trails have thousands of SVG path segments, each mousemove/mousedown triggers O(n) hit tests
- ⚡ Measure/segment modes add .measure-active class to map container, CSS forces all SVG paths to pointer-events: none, browser completely skips hit-testing
- ✂ Removed auto-fitBounds after measure A+B computed (user doesn\
- ,
        

## v1.29.0 — 2026-07-02

**中文**

- ⚡ 修复轨迹上点击/悬停卡顿真凶：polyline.on("mousemove") 每秒触发几十次，每次都做 O(n) nearestTrackIdx + showTooltip 渲染，长轨迹上会积压主线程数百 ms 到几秒
- ⚡ mousemove 用 requestAnimationFrame 节流，每帧最多处理一次；测距/分段模式下完全禁用轨迹 hover tooltip
- 📊 用户反馈：鼠标在轨迹上时慢、在轨迹旁快 —— 精准定位到这个瓶颈

**English**

- ⚡ Fixed the real cause of trail hover/click lag: polyline.on("mousemove") fires dozens of times per second, each doing O(n) nearestTrackIdx + showTooltip render, backlogs main thread by hundreds of ms to seconds on long trails
- ⚡ Throttle mousemove via requestAnimationFrame (once per frame max); disable trail hover tooltip entirely in measure/segment modes
- 📊 User feedback: mouse on trail = slow, mouse near trail = fast — precisely pointed to this bottleneck

## v1.28.0 — 2026-07-02

**中文**

- ⚡ 测距/分段：点击瞬间立刻画临时 marker（<16ms 视觉反馈），nearestTrackIdx 搜索+吸附延迟到下一帧，感知延迟由几百 ms 降为「点即出」
- 🔍 加入性能诊断日志：控制台运行 `window.PERF_DEBUG = true` 即可看到每步耗时（nearestTrackIdx、marker addTo、hint、measureCompute…）帮助定位剩余瓶颈

**English**

- ⚡ Measure/segment: click immediately draws a temporary marker (<16ms visual feedback), nearestTrackIdx search + snap deferred to next frame; perceived latency drops from hundreds of ms to "click = marker"
- 🔍 Perf diagnostic logs: run `window.PERF_DEBUG = true` in console to see per-step timings (nearestTrackIdx, marker addTo, hint, measureCompute…) for pinpointing remaining bottlenecks

## v1.27.0 — 2026-07-02

**中文**

- ⚡ 测距点击生成 A/B 大幅提速：measureMarker 从 circleMarker+permanent tooltip 改为轻量 divIcon marker，减少 DOM 层级和 layout 触发
- ⚡ 主轨迹 lat/lng 缓存为 Float64Array，加速 nearestTrackIdxOnPrimary 的 O(n) 搜索（对大轨迹提速 3-5 倍）
- ⚡ 放宽 fast-tap 阈值：位移 6→10 px、时间 400→800 ms，覆盖 trackpad 慢速点击
- ⚡ 关闭 Leaflet 的 L.Tap 处理（tap: false），消除触屏 tap 延迟
- ✨ 测距选中 A+B 后自动 fitBounds 到测距段（padding 60px），无需手动点复位
- ✨ 退出测距模式（✕ 退出按钮或再次点 📏）后自动复位到主轨迹全景
- ✨ 分段应用后同步刷新侧栏「行程」tab：不仅写入导出用的 day_meta 和 track dayId，行程 tab 立刻显示每天卡片
- ✨ 分段应用时自动给主轨迹 waypoints 打上 day 字段，行程 tab 精确按每天分组显示 waypoints
- ✨ 行程 tab 每日展开区固定显示关键类型（营地/垭口/水源/补给/桥/河/村庄/避难/警告/岔路/起终点），不受 filter 影响
- 🐛 修复 buildDaysTab 在 day_meta 为 undefined 时崩溃

**English**

- ⚡ Measure click A/B generation greatly sped up: measureMarker from circleMarker+permanent tooltip to lightweight divIcon marker, reducing DOM layers and layout triggers
- ⚡ Primary trail lat/lng cached as Float64Array, accelerates nearestTrackIdxOnPrimary O(n) search (3-5x speedup for large trails)
- ⚡ Relaxed fast-tap thresholds: movement 6→10 px, time 400→800 ms, covers trackpad slow clicks
- ⚡ Disabled Leaflet\
- ,
        
- ,
        
- ,
        
- ,
        
- ,
        
- ,
        

## v1.26.0 — 2026-07-02

**中文**

- ⚡ 测距/分段选点极速响应：改用原生 pointerdown/pointerup（<400ms & <6px 位移视为 tap），绕过 Leaflet click 内部延迟；click 事件保留为兼容 fallback
- ✨ 分段应用后同步刷新侧栏「行程」tab：不仅写入导出用的 day_meta 和 track dayId，行程 tab 立刻显示每天卡片（D1/D2/…、里程、爬升、最高、营地）
- ✨ 分段生成 seg 描述字段（起点海拔 → 顶 → 终点海拔（km）），行程 tab 顶部一行即可看清一天全貌
- 🐛 修复 buildDaysTab 在 day_meta 为 undefined 时崩溃：改为显示"尚未设置每日行程"占位
- 🐛 修复 buildDaysTab 里 dm.seg 为空时显示 undefined：改为 fallback 到 km/asc/desc/max 组合

**English**

- ⚡ Measure/segment click response near-instant: uses native pointerdown/pointerup (<400ms & <6px movement = tap), bypasses Leaflet click internal delay; click event kept as fallback
- ✨ Applying segments now also refreshes sidebar "Itinerary" tab: not only writes day_meta and track dayId for export, but the tab immediately shows daily cards (D1/D2/…, distance, ascent, max, camp)
- ✨ Segment generates seg description field (start elev → peak → end elev (km)), itinerary tab shows the day\
- ,
        
- ,
        

## v1.25.0 — 2026-07-01

**中文**

- ⚡ 测距选点响应大幅提速：doubleClickZoom 关闭 → 消除 Leaflet 内部 ~200ms click 延迟
- ⚡ 测距计算异步化：点击立即绘制高亮段+marker，dist/asc/desc/max 挪到下一帧计算，海拔图再下一帧
- ⚡ 优化数组遍历：避免 slice + spread（大数组慢/爆栈），用 for 循环 + 预分配 typed array
- 🎨 测距结果面板移除"方向"字段（永远 A→B，无需显示）
- 🎨 测距结果面板移除「⇄ 交换 A/B」按钮（方向不重要，简化 UI）
- 🎨 「⛰ 段内最高」从跨列独占一行改为与其他 5 项等宽两列布局，更紧凑

**English**

- ⚡ Measure click response greatly sped up: doubleClickZoom disabled → removes Leaflet\
- ,
        
- ,
        
- ,
        
- ,
        
- ,
        

## v1.24.0 — 2026-07-01

**中文**

- ✨ 分段模式：分段点可以直接拖拽调整每天边界（吸附到主轨迹 + 保持天数顺序 + 相邻点冲突检测）
- ✨ 分段面板：营地名和营地海拔拆成两栏，各有独立标签，输入更清晰
- ✨ 测距模式：结果面板新增「⛰ 段内最高海拔」
- ✨ 测距模式下点击 🎯 复位 → 以选中段（A→B）为中心 fitBounds，方便快速对齐视野

**English**

- ✨ Segment mode: drag segment markers directly to adjust day boundaries (snaps to primary trail + preserves order + neighbor conflict check)
- ✨ Segment panel: camp name and camp elevation split into two separate rows with labels for clarity
- ✨ Measure mode: result panel now shows "⛰ Max elevation in segment"
- ✨ In measure mode, clicking 🎯 Reset fits the map to the selected segment (A→B), for quick visual alignment

## v1.23.0 — 2026-07-01

**中文**

- ✨ 新增 📅 分段模式：在主轨迹上依次点选每天的起止点，自动计算每天里程/爬升/下降/最高海拔，支持手填营地名和海拔
- ✨ 分段应用后自动写入 main.day_meta 和 track dayId，导出行程 MD 会用手工分段的数据
- ✨ 分段模式再次进入时自动从已有 day_meta 恢复分段点
- 🎨 标注点图标更新：补给 🛒 → 🏪（小卖部）、河流 ≋ → 🏞（山水），"观景"分类移除，未识别标签统一归入"其他 📍"
- 🐛 分段模式下点击主轨迹不再切换主轨迹

**English**

- ✨ New 📅 Segment mode: sequentially click points on the primary trail to mark each day; auto-computes daily distance/ascent/descent/max elevation, with manual camp name + elevation input
- ✨ Applying segments writes to main.day_meta and track dayId, exported itinerary MD uses the manual segmentation
- ✨ Re-entering segment mode restores segment points from existing day_meta
- 🎨 Waypoint icon updates: Supply 🛒 → 🏪 (mini-mart), River ≋ → 🏞 (landscape); "View" category removed, unrecognized tags fall back to "Other 📍"
- 🐛 Clicking primary trail in segment mode no longer switches primary

## v1.22.0 — 2026-07-01

**中文**

- ✨ 地图缩放粒度更细：zoomSnap=0.25（对齐到 0.25 级）+ zoomDelta=0.5（按钮/键盘每次 0.5 级）+ wheelPxPerZoomLevel=120（滚轮更平滑）
- ✨ 导入 KML/ZIP 完成后自动执行完整复位（fitBounds 到主轨迹），无需手动点复位按钮
- ✨ 切换分组时自动执行完整复位，视野立即对齐到新组主轨迹
- ♻️ 抽出 resetView() 函数供复位按钮 / 导入 / 切换分组共用，行为一致（含主轨迹兜底 + 全量重绘 + fitBounds）

**English**

- ✨ Finer-grained map zoom: zoomSnap=0.25 (snap to 0.25 level) + zoomDelta=0.5 (button/keyboard step) + wheelPxPerZoomLevel=120 (smoother wheel)
- ✨ After importing KML/ZIP, auto-execute full reset (fitBounds to primary trail), no manual reset button click needed
- ✨ Auto-reset on group switch, view immediately aligns to the new group\
- ,
        

## v1.21.0 — 2026-07-01

**中文**

- ✨ 主轨迹保留在轨迹列表中不再被剔除，用金色左边框和 ★ 徽章标识（之前主轨迹会"消失"到顶部卡片里，用户找不到）
- ✨ 主轨迹卡片"设为主轨迹"按钮替换为 "★ 主轨迹" 只读标识（避免让用户点自己设自己）
- ✨ 每个分组独立记忆主轨迹：state.primaryByGroup[groupName]。A 组切主轨迹不会污染 B 组，切回来还能记住
- 🔧 state.primaryTrailId 现在是 getter/setter，桥接到 primaryByGroup[activeGroup]。所有旧代码无感升级
- 🔧 场景全覆盖：分组切换 / 拖动分组 / 批量移动 / 删除轨迹 / IndexedDB 恢复都会正确清理其他组的记忆值
- 🔧 兼容旧数据：老 IndexedDB 里的单值 primaryTrailId 会自动迁移到 primaryByGroup 里
- 🧪 E2E 新增 E16 场景（13 项断言）验证跨分组独立主轨迹的完整生命周期；总 62/62 全过

**English**

- ✨ Primary trail no longer removed from the trail list, marked with gold left border and ★ badge instead (previously the primary trail "disappeared" into the top card and users couldn\
- ,
        
- ,
        
- ,
        
- ,
        
-  memory values
- 🔧 Backward compatible: legacy single-value primaryTrailId in old IndexedDB auto-migrates into primaryByGroup
- 🧪 New E16 scenario (13 assertions) verifies full cross-group independent primary lifecycle; total 62/62 pass

## v1.20.0 — 2026-07-01

**中文**

- ✨ 支持"无选中分组"状态：再次点击已激活的分组 tab 可取消选中，此时主轨迹、叠加轨迹、海拔剖面全部隐藏，只保留分组 tab bar 和轨迹卡片列表
- ✨ 分组切换回具体组时，primaryTrailId 自动挑选该组内第一条轨迹
- ✨ 空态文案精准区分"无轨迹"和"未选中分组"两种情况（i18n 新增 pc.emptyGroup / trail.emptyNoGroup 键）
- 🔧 activeGroup=null 状态持久化到 IndexedDB（用 in 运算符判定字段存在性，兼容旧数据）
- 🔧 rebuildAll 兜底优化：activeGroup=null 时保持 primaryTrailId=null；有 activeGroup 但主轨迹丢失时先在组内挑，找不到再跨组回退
- 🧪 大改动测试流程首次实战：E15 新场景（9 项断言）覆盖 activeGroup=null 全链路 UI + 持久化，与既有 39 项一起 49/49 全过

**English**

- ✨ Support "no group selected" state: click the active group tab again to deselect. Primary trail, overlay tracks, elevation profile all hidden; only group tab bar and trail card list remain
- ✨ When switching back to a specific group, primaryTrailId auto-selects the first trail in that group
- ✨ Empty-state text precisely distinguishes "no trails" from "no group selected" (new i18n keys pc.emptyGroup / trail.emptyNoGroup)
- 🔧 activeGroup=null state persists to IndexedDB (uses `in` operator for field-existence check, backward compatible)
- 🔧 rebuildAll fallback improved: keep primaryTrailId=null when activeGroup=null; when activeGroup exists but primary is lost, first pick within group, then fall back cross-group
- 🧪 First-time real-world use of the big-change testing workflow: new E15 scenario (9 assertions) covering full activeGroup=null UI + persistence chain, 49/49 total pass with the existing 39

## v1.19.0 — 2026-07-01

**中文**

- 📝 JSDoc 类型注解全覆盖：新增 10 个 @typedef（TrackPoint / TrackTuple / Waypoint / DayMeta / TrailStats / EscapeRoute / Trail / ElevLayout / ElevAnnotation / ImportedFile），15+ 顶层函数带 @param / @returns（haversine / accumulatorAscent / smoothElev / parseKml / enrichWaypoints / parseAndProcessKml / drawElevBar / handleFiles / applyChange / trailContentHash 等）
- 🧪 单元测试首次落地（tests/unit/）：抽出 trail_core.js 纯函数镜像 + test_math.js（30 断言）+ test_enrich.js（12 断言）+ verify_alignment.js（13 项 HTML↔trail_core 对齐校准）
- 🧪 端到端测试首次落地（tests/e2e/run_all.py）：14 大场景 39 项断言，覆盖启动、KML/ZIP 导入、去重、切主轨迹、批量分组、反转、删除、waypoint 过滤、分天切换、IndexedDB、i18n、导出、file:// 错误检测
- 🛠 一键测试流程 tests/run_full_check.sh：6 阶段流水线（语法→单元→静态→功能→e2e→sync），大改动必跑，失败即停
- 📚 文档三件套：docs/TESTING.md（测试指南）+ docs/CONTRIBUTING.md（贡献指引，含类型注解风格/命名/大改动流程）+ ARCHITECTURE.md 补齐 v1.17-1.19 拆分架构与 applyChange 约定，全部 zh + en 双语
- 🎯 无功能变化，纯工程化基建；6/6 阶段测试全过（Phase1 语法 · Phase2 单元 55/55 · Phase3 静态 54/54 · Phase4 功能 55/55 · Phase5 e2e 39/39 · Phase6 sync）

**English**

- 📝 Full JSDoc type coverage: 10 new @typedefs (TrackPoint / TrackTuple / Waypoint / DayMeta / TrailStats / EscapeRoute / Trail / ElevLayout / ElevAnnotation / ImportedFile), 15+ top-level functions with @param / @returns (haversine / accumulatorAscent / smoothElev / parseKml / enrichWaypoints / parseAndProcessKml / drawElevBar / handleFiles / applyChange / trailContentHash etc.)
- 🧪 Unit tests first-time landing (tests/unit/): extracted trail_core.js pure-function mirror + test_math.js (30 assertions) + test_enrich.js (12) + verify_alignment.js (13 HTML↔trail_core alignment checks)
- 🧪 End-to-end tests first-time landing (tests/e2e/run_all.py): 14 scenarios × 39 assertions covering startup, KML/ZIP import, dedup, switch primary trail, batch grouping, reverse, delete, waypoint filter, day switch, IndexedDB, i18n, export, file:// error detection
- 🛠 One-command test flow tests/run_full_check.sh: 6-phase pipeline (syntax→unit→static→functional→e2e→sync), required for big changes, fail-fast
- 📚 Documentation triple: docs/TESTING.md (testing guide) + docs/CONTRIBUTING.md (contribution guide with type annotation style / naming / big-change workflow) + ARCHITECTURE.md updated with v1.17-1.19 split architecture and applyChange convention, all zh + en bilingual
- 🎯 No behavior change, pure engineering infrastructure; all 6 phases pass (Phase1 syntax · Phase2 unit 55/55 · Phase3 static 54/54 · Phase4 functional 55/55 · Phase5 e2e 39/39 · Phase6 sync)

## v1.18.0 — 2026-07-01

**中文**

- ♻️ handleFiles 大瘦身：166 行 → 17 行，拆出 6 个辅助函数（expandZipFiles / importSingleKml / findDuplicateTrail / ensureUniqueTrailId / renderKmlImportRow / bindKmlImportRowEvents / postImportFinalize）
- ♻️ parseAndProcessKml 拆分：174 行 → 36 行，抽出 computeCumulativeDistance / buildDayMeta / computeTrailStats / generateNextTrailId 四个纯函数
- ♻️ drawElevBar 深度重构：363 行 → 24 行，Canvas 绘制逻辑拆成 9 个语义子函数（computeElevLayout / drawElevBackground / drawElevGridLines / drawElevFill / drawElevCurve / collectElevAnnotations / layoutElevLabels / renderElevLabels / drawElevAxes / updateElevBadges）；elevRatioColor 提升为独立顶层函数便于测试
- 🎯 v1.17.0-v1.18.0 累计：3 个 300+ 行大函数合计 703 行 → 77 行（编排层），共抽出 30 个语义清晰的辅助函数
- 🎯 无功能变化，纯代码质量重构；54 项静态验收 + 30 项功能测试全通过

**English**

- ♻️ handleFiles slimmed down: 166 lines → 17 lines, extracted 6 helpers (expandZipFiles / importSingleKml / findDuplicateTrail / ensureUniqueTrailId / renderKmlImportRow / bindKmlImportRowEvents / postImportFinalize)
- ♻️ parseAndProcessKml split: 174 lines → 36 lines, extracted 4 pure functions (computeCumulativeDistance / buildDayMeta / computeTrailStats / generateNextTrailId)
- ♻️ drawElevBar deep refactor: 363 lines → 24 lines, Canvas rendering split into 9 semantic sub-functions (computeElevLayout / drawElevBackground / drawElevGridLines / drawElevFill / drawElevCurve / collectElevAnnotations / layoutElevLabels / renderElevLabels / drawElevAxes / updateElevBadges); elevRatioColor promoted to top-level for testability
- 🎯 v1.17.0-v1.18.0 combined: three 300+ line functions totaling 703 lines → 77 lines (orchestration layer), 30 semantically-named helpers extracted total
- 🎯 No behavior changes, pure code-quality refactor; 54 static checks + 30 functional tests all pass

## v1.17.0 — 2026-07-01

**中文**

- ♻️ buildTrailList 大瘦身：从 372 行 → 25 行（编排层），逻辑拆分为 15 个语义清晰的辅助函数（renderGroupTabs / renderBatchToolbar / renderTrailCard / trailCardHeaderHtml / trailCardExpandedHtml / handleTrailCardClick / handleTrailDetailClick / handleTrailGroupChange / moveBatchToGroup / isDetailButtonTarget 等）
- ♻️ 引入 state 变更 helpers：toggleSetItem / applyChange / toggleTrailActive / toggleTrailExpanded / toggleTrailBatch，统一"读-改-刷新-持久化"流程，消除 20+ 处重复的 rebuildAll+saveToStorage 模式
- 📝 waypointModeTags 字段加详细注释：澄清它与 modeVisibleTags 的关系（两套独立 Set，各自服务不同场景），避免后续重构再次踩 v1.13.4 的 bug
- 🎯 无功能变化，纯代码质量重构；54 项静态验收 + 14 项功能测试全通过

**English**

- ♻️ buildTrailList slimmed down: 372 lines → 25 lines (orchestration only), logic split into 15 semantically-named helpers (renderGroupTabs / renderBatchToolbar / renderTrailCard / trailCardHeaderHtml / trailCardExpandedHtml / handleTrailCardClick / handleTrailDetailClick / handleTrailGroupChange / moveBatchToGroup / isDetailButtonTarget etc.)
- ♻️ Introduced state mutation helpers: toggleSetItem / applyChange / toggleTrailActive / toggleTrailExpanded / toggleTrailBatch — unified the "read-mutate-refresh-persist" flow and eliminated 20+ occurrences of duplicated rebuildAll+saveToStorage patterns
- 📝 waypointModeTags now has a detailed comment explaining its relationship with modeVisibleTags (two independent Sets serving different scenarios), preventing future refactors from repeating the v1.13.4 regression
- 🎯 No behavior changes, pure code-quality refactor; 54 static checks + 14 functional tests all pass

## v1.16.0 — 2026-07-01

**中文**

- ✨ 复选框合并：v1.15.0 的批量勾选框（trail-batch-check）合并回原有的 trail-checkbox（专职批量选中）；展开/收起改用独立的 ▸/▾ 箭头。三个动作三个入口，各司其职
- ♻️ 代码清理：清理 15 处历史版本注释（v1.10–v1.13 stamp），保留最近 3 版；批量工具栏与分组 tab 的内联样式抽离为 CSS 类（.batch-toolbar / .group-tab-bar），buildTrailList 少 7 行且噪音大幅减少
- 📝 README 重写：去除装饰性 emoji / shields 徽章 / 居中 block / 鸡汤结尾，改为 Leaflet / fflate 风格的正式项目 README（中英双语同步）

**English**

- ✨ Checkbox unified: the v1.15.0 batch checkbox (trail-batch-check) is merged back into trail-checkbox (batch-select only); expand/collapse now uses a dedicated ▸/▾ arrow. Three actions, three entry points
- ♻️ Code cleanup: removed 15 stale version stamps (v1.10–v1.13), kept the last 3 versions; batch toolbar and group tab inline styles extracted to CSS classes (.batch-toolbar / .group-tab-bar), buildTrailList is 7 lines shorter with much less noise
- 📝 README rewrite: removed decorative emoji / shields badges / centered blocks / sentimental sign-off; adopted the plain, official style of Leaflet / fflate READMEs (both zh and en)

## v1.15.0 — 2026-07-01

**中文**

- ✨ 分组交互重构：去掉「☐ 批量分组」入口/退出按钮；每张轨迹卡片左侧常驻小勾选框，勾选任意条目即自动出现「已选 X · 全选 · 反选 · 移到… · 清除」浮条，操作完自动隐藏
- ✨ KML.zip 导入：文件选择器与拖拽支持 .zip / .kml.zip 压缩包，自动展开包内所有 .kml 递归处理（跳过 __MACOSX 与隐藏文件），与「打包 KML ZIP」导出格式对应
- 🔧 移除 state.batchMode，改为由 batchSelected.size 单一驱动 UI 出现/隐藏，减少一处状态双源

**English**

- ✨ Grouping UX rebuild: removed the "☐ Batch group" enter/exit toggle. Each trail card now has a persistent mini-checkbox on the left; selecting any trail auto-reveals the "N selected · Select all · Invert · Move to… · Clear" bar, which auto-hides when selection is cleared
- ✨ KML.zip import: file picker and drag-drop now accept .zip / .kml.zip archives, auto-extract all inner .kml files (skips __MACOSX and hidden files). Matches the "Pack KML ZIP" export format
- 🔧 Removed state.batchMode; UI visibility now driven solely by batchSelected.size, eliminating one dual-source state

## v1.14.1 — 2026-07-01

**中文**

- ✨ 批量分组：sidebar 顶部新增「☐ 批量分组」入口，进入后点击卡片切换选中态，支持全选/反选，一次性把选中的轨迹移到其他组或新建组
- ✨ 导出改为点击式菜单：📤 导出按钮点击后在其下方悬浮出选项卡（打包 KML ZIP / 行程 Markdown），无需 confirm 阻塞对话框

**English**

- ✨ Batch group: sidebar top now has a "☐ Batch group" toggle; click cards to select, supports select-all/invert, then move all selected trails to another group (or new group) in one action
- ✨ Export menu: click 📤 Export to open a floating menu (Pack KML ZIP / Itinerary Markdown) below the button, replacing the blocking confirm dialog

## v1.14.0 — 2026-07-01

**中文**

- ✨ 轨迹分组：trail 增加 group 字段，sidebar 顶部 Tab bar 切换分组；只有当前组的轨迹参与地图渲染/海拔图/行程统计/图例等一切前端功能
- ✨ 移至组：展开轨迹详情后可通过下拉菜单将轨迹移入已有组或新建组
- ✨ 批量导出 KML ZIP：📤 导出打包当前组叠加中的轨迹为 ZIP（每条独立 KML + 合并版 + README），支持在其他设备一键拖拽导入
- 🔧 activeGroup 与 trails 一起持久化到 IndexedDB

**English**

- ✨ Trail grouping: trails now have a group field; tab bar at top of sidebar switches active group
- ✨ Move to group: expand trail details to reassign via dropdown
- ✨ Batch KML ZIP export: 📤 Export packs all active-group overlaid trails into a ZIP with per-trail KMLs, merged KML, and README
- 🔧 activeGroup persisted to IndexedDB alongside trails

## v1.13.3 — 2026-06-12

**中文**

- 🐛 浏览器整体放大后无法缩小：leaflet 的 wheel 拦截了 ctrl/meta+wheel 缩放手势 → 在 capture 阶段 stopImmediatePropagation 让浏览器接管
- 🐛 海拔图点击反向定位：hit-test 用的 PL/PR 与绘制不一致（38/8 vs 44/16），且按 idx 等距映射但绘制按 km，定位偏离 → 改用与 drawElevBar 相同的 PL/PR + 二分按 km 找 idx
- 🎨 海拔图标注布局重写为「右上为主 + 引线」：右上→左上→右下→左下→外推；从 label 边到对应黑点画一条 0.6px 半透明引线，对应关系一目了然，不再有"高度对不上"的视觉错位
- 📦 elev-bar 高度公式：baseH 100→110，stackDepth+1 预留一层，max 320→340
- 🎨 measure-tip（点击海拔图后地图上的浮标）改为深底浅字（#1d2630/#f4e8c8）+ 苔绿描边 + 6px 加粗，从浅色地图背景中跳出来
- 🎨 版本号浮层套上 leaflet-control-attribution 类，与 Leaflet \| © Esri 完全相同的 background/font-size/padding/line-height

**English**

- 🐛 Browser pinch zoom stuck after zoom-in: leaflet swallowed ctrl/meta+wheel; capture-phase stopImmediatePropagation now lets browser zoom
- 🐛 Elev chart click-locate offset: hit-test PL/PR differed from draw (38/8 vs 44/16) and used idx-linear mapping while draw uses km — fixed both
- 🎨 Elev label layout: top-right priority + leader lines from label edge to anchor dot, eliminating the "height mismatch" illusion
- 📦 elev-bar height: baseH 100→110, +1 reserved stack layer, max 320→340
- 🎨 measure-tip styled dark-on-cream with 6px padding, pops out of the map
- 🎨 Version tag inherits leaflet-control-attribution style fully

## v1.13.2 — 2026-06-12

**中文**

- 🎨 版本号浮层套上 leaflet-control-attribution 类，自动继承相同 background/font-size/padding/line-height，与 Leaflet \| © Esri 同款样式 + 同高度
- 🎯 海拔图标注紧贴对应点：之前是垂直方位（上方）+ 互相往上推，远离了 anchor。改成水平贴点（label 中线 = 点 Y），右伸→左伸→微上下偏移→更大偏移。最后效果：营地名"挂在"点旁边，绝对紧挨

**English**

- 🎨 Version tag now uses leaflet-control-attribution class — same style & height as Leaflet \| © Esri
- 🎯 Elev labels hug their anchor: horizontal-first layout (label center = point Y), right→left→tiny up/down→larger offsets. Camp names now sit right next to their points

## v1.13.1 — 2026-06-12

**中文**

- 🎯 海拔图标注布局重写：不再"先固定右上 + 互相上推"造成的位置偏移；改为按优先级（最高>营地>最低）逐个放置，每个标注尝试 4 方位 × 多层候选（右上→左上→右下→左下），紧贴 anchor 点最近的有效位置；反向后 wp.gps_idx 重映射后位置同样紧贴
- 🎨 版本号改为独立浮层（独立背景框）：不再合并到 Leaflet attribution prefix；用绝对定位 + getBoundingClientRect 实时计算位置，紧贴 attribution 左侧 8px

**English**

- 🎯 Elev label layout rewritten: priority-based placement with 4-direction × multi-layer candidates, hugging the anchor point closely; reverse-correct
- 🎨 Version tag now an independent floating box, not in attribution prefix; positioned via getBoundingClientRect, 8px to the left of attribution

## v1.13.0 — 2026-06-12

**中文**

- 🎯 海拔图高度自适应彻底修复：用「扫描线预测算法」算出 X 方向标签最大重叠数（即堆叠层数），与画布高度完全解耦，一次设定不再抖动；反向后 wp.gps_idx 已重映射，预测同步正确
- 🎯 高度公式：H = max(140, min(320, 100 + stackDepth × (字高+2) + 20))；标签水平不重叠时停在 140，越多营地堆叠越精确加高
- 🎨 版本号与 Leaflet attribution 间距再加大：&nbsp;×4 + |&nbsp;×2
- 📦 发布 v1.13.0 — 阶段性稳定版本

**English**

- 🎯 Elev chart height fully fixed: scan-line algorithm predicts max horizontal label overlap (stack depth), decoupled from canvas height. No more oscillation. Reverse-correct.
- 🎯 Formula: H = max(140, min(320, 100 + stackDepth × (lh+2) + 20))
- 🎨 More spacing between version tag and Leaflet attribution
- 📦 Released v1.13.0 — stable milestone

## v1.12.6 — 2026-06-12

**中文**

- 🐛 i18n 漏覆盖修复：海拔图营地默认名、主轨迹卡所有字段（距离/天数/累计爬升/累计下降/最高点/最低点/⬇KML/🔗来源/✎链接/★主轨迹眉头）现在都走 i18n
- 🎨 主轨迹小卡 m峰 → m（去掉「峰」）
- 🐛 海拔图高度仍不准 → 改用「两遍同步策略」：第 1 遍设 140 试画，记录顶部 overflow；第 2 遍按 overflow + 6px margin 加高重绘。无 RAF、无抖动、反向后也对
- ✏️ 显示模式说明改用更精准的措辞：天数=主轨迹分色 / 海拔=已叠加蓝→红主轨迹凸显 / 标注点=主轨迹按海拔渐变其他仅显示所选标注
- 🗑 移除主轨迹卡（侧栏未缩放状态）的 ⇄ 反向按钮（功能 toolbar 已有）
- 🐛 +添加 按钮位置错乱：删除旧的 #add-trail-btn 绝对定位样式（top:244px right:14px），完全交给 .tb-btn 接管
- 🐛 toolbar 快速连点触发地图双击放大：用 L.DomEvent.disableClickPropagation 阻止冒泡 + 每个按钮单独阻止 dblclick
- 🎨 版本号与 Leaflet attribution 之间增加 &nbsp;&nbsp; 间距

**English**

- 🐛 i18n gaps fixed: elev camp default name, all primary card fields, mini "m peak" → "m"
- 🐛 Elev chart height inaccurate → 2-pass sync strategy (no RAF, no jitter, reversed-correct)
- ✏️ Mode descriptions reworded
- 🗑 Removed reverse button from sidebar primary card (toolbar has it)
- 🐛 + Add button mis-positioned: removed legacy #add-trail-btn absolute style
- 🐛 Fast-clicking toolbar zoomed map: L.DomEvent.disableClickPropagation + per-button dblclick stop
- 🎨 Spacing added between version tag and Leaflet attribution

## v1.12.5 — 2026-06-12

**中文**

- 🐛 切换语言后海拔图标题、X 轴、主轨迹小卡内容用 JS 拼接，applyI18n 触发不到。setLang 末尾手动刷新这些组件
- 🐛 海拔图高度反复抖动：用预估算法（标注数 + 字号 + 堆叠行数）一次性算出目标高度，禁用旧的"溢出 → 加高 → 缩回"循环
- 🐛 dpr scale 累积：每次 drawElevBar 先 setTransform(1,0,0,1,0,0) 再 scale，避免反复缩放后坐标错位
- 🎨 显示模式说明更新：体现"叠加才显示"和"标注点模式下未叠加轨迹也显示标注点"的新行为
- 🎨 主轨迹小卡 top:42→54px，避开顶部 toolbar
- 🎨 功能按钮全部移到顶部水平 toolbar：帮助 / 复位 / 测距 / ⇌ 反向 / + 添加 / 📤 导出 / 🗑 清空 / 💾 存储
- ✨ 新增反向按钮：⇌ 反向（顶部 toolbar）
- 🎨 版本号合并到 Leaflet attribution prefix：v1.12.5 | Leaflet | © Esri 同一基线，样式完全一致

**English**

- 🐛 setLang now manually refreshes elev chart title/X-axis label/primary mini card (these use JS templates without data-i18n)
- 🐛 Elev chart height oscillation fixed: pre-compute target height from annotation count, no more grow/shrink loop
- 🐛 dpr scale accumulation fixed via setTransform reset
- 🎨 Mode descriptions updated to reflect new overlay/waypoint behavior
- 🎨 Mini card top moved 42→54px, avoiding new toolbar
- 🎨 All map buttons collapsed into a horizontal top toolbar: Help / Reset / Measure / Reverse / Add / Export / Clear / Storage
- ✨ Added Reverse button (top toolbar)
- 🎨 Version tag merged into Leaflet attribution prefix — same baseline & style as © Esri

## v1.12.4 — 2026-06-12

**中文**

- 🐛 反向轨迹后海拔图营地标错位置：reverseTrail 现在同时重置 wp.gps_idx（之前漏了，导致海拔图按旧索引定位）
- 🎨 侧栏收起后，主轨迹信息以小卡（240px）形式浮在右上角；点击小卡展开侧栏
- 🎨 删除「标注点」tab：标注点类型筛选移到「轨迹」tab 底部
- ✨ 每个显示模式独立的标注点筛选：state.modeVisibleTags = { day, elev, waypoint }；state.visibleTags 改为 getter 反射当前模式
- 🎨 轨迹缩略图回退到无地图底版本（去掉等高线和渐变底）；最低海拔点标记 + 数字标在最低点附近（蓝灰色），最高海拔标在山顶处（红棕）
- 🎨 ID 与轨迹信息合并到同一行（距离/爬升/下降/天数 + ID 右对齐）
- 🎨 版本号挪到右下 Leaflet/Esri attribution 左侧（同一基线）
- 🎨 标注点模式下未叠加的轨迹也显示其标注点：drawWaypoints/drawHighPoints 跳过 activeTrails 检查（限 waypoint 模式）

**English**

- 🐛 Reversed trail elev chart camp positions: reverseTrail now also resets wp.gps_idx
- 🎨 Sidebar collapsed → primary trail info floats as 240px card at top-right
- 🎨 Removed "Waypoints" tab: tag filter moved to bottom of "Trails" tab
- ✨ Per-mode visibleTags: state.modeVisibleTags = { day, elev, waypoint }
- 🎨 Trail thumbnail reverted (no map-base contours); low-elevation marker + label near valley point
- 🎨 ID and trail meta now share a single row
- 🎨 Version tag relocated to left of Leaflet/Esri attribution
- 🎨 In waypoint mode, inactive trails still show their waypoints

## v1.12.3 — 2026-06-12

**中文**

- 🐛 修复：未展开的卡片（默认状态）没绑 click 事件，导致勾选/卡片整体点击都失效
- 🎨 左下角多轨迹图例 #legend 移除（仍保留隐藏锚点供 buildLegend 调用）
- 🎨 海拔图 #elev-bar 从右下移到左下：bottom:28px / left:14px
- 🎨 版本号挪到右上 top:8px / right:8px，与 Leaflet attribution（右下）和 zoom 控件互不重叠
- ⚙️ 默认关闭「行程 / 下撤路线」自动生成：state.autoGenerateEscape = false（接口保留：手动改为 true 即恢复 buildEscapeRoutes 自动推算）

**English**

- 🐛 Fix: collapsed (default) cards had no click handler — checkbox & card click were both dead
- 🎨 Removed #legend from bottom-left (kept hidden anchor for buildLegend)
- 🎨 Moved #elev-bar to bottom-left (was bottom-right next to sidebar)
- 🎨 Version tag relocated to top-right; no overlap with Leaflet attribution or zoom controls
- ⚙️ Disabled auto-generation of escape routes by default: state.autoGenerateEscape=false (set true to restore)

## v1.12.2 — 2026-06-12

**中文**

- 🎨 重新定义勾选框语义：勾选 = 展开详情（缩略图/数据/操作行），不再控制地图叠加
- 🎨 卡片其他区域点击 = 切换地图叠加；状态徽标改为「叠加中●」/「点击叠加」
- 🐛 勾选框可点击：加 cursor:pointer + 独立 click 拦截，不会触发卡片整体的叠加切换
- 🎨 海拔图标注：黑点放大到 2.5px + 白描边，文字统一固定在小点右上方（gap 仅 3px）
- ✨ 文字重叠时自动加高海拔图框：检测顶部溢出 → 把容器扩高 N px → 重绘；无溢出时缩回 140 默认

**English**

- 🎨 Checkbox now toggles detail expansion only (not map overlay)
- 🎨 Card body click toggles overlay; badge: "叠加中●" or "点击叠加"
- 🐛 Checkbox clickable with cursor:pointer + dedicated click handler
- 🎨 Elevation chart: dots enlarged to 2.5px + white halo; labels pinned to top-right
- ✨ Auto-grow elev card: detects top overflow → expands container → redraws; shrinks back when free

## v1.12.1 — 2026-06-12

**中文**

- 🎨 备选轨迹卡片新增勾选框：左上角小方块，未叠加=空框，已叠加=苔绿底+白勾「✓」
- 🎨 海拔图标注去掉所有图标（⛰⛺💧），只留黑色小点（1.6px）+ 文字，文字探测起跳从 4px 缩到 1px，紧贴小点
- 🎨 海拔图绿色调全面落地：填充用 4 段绿色渐变（浅薄荷→草绿→苔绿→深森林），每段再做纵向不透明度 0.62→0.18 衰减，呈现地形剖面感
- 🎨 海拔曲线主线改为单色深森林绿（去掉 Bloom 外发光），整体更克制
- 🎨 海拔图卡片底色加深为图2 杂志风：#F2EBD3→#E8DEC0 纵向渐变 + 棕色噪点纹理

**English**

- 🎨 Trail cards now have a checkbox in the top-left
- 🎨 Elevation chart annotations: dropped all icons, kept only the black dot + text (gap reduced from 4 to 1px)
- 🎨 Green palette: 4-stop gradient (mint→grass→moss→forest) with vertical alpha falloff (0.62→0.18)
- 🎨 Curve drawn as single forest-green stroke (no Bloom)
- 🎨 Elev card background updated to match concept B paper feel

## v1.12.0 — 2026-06-12

**中文**

- 🎨 备选轨迹缩略图加地图底：浅米色 + 3 条等高线柔和弧线，山顶用三角点标注
- 🎨 已选为合并叠加的轨迹卡片极简化：只显示色点 + 名称 + 「显示中」徽标，不再显示缩略图与详细数据
- 🎨 海拔图标注全面优化：山顶 ⛰ 三角、营地 ⛺ 圆+外圈、最低点 💧 圆点；点和文字尺寸都缩小
- ✨ 海拔图字号自适应：≤5 个标注用 9.5px，6-9 个用 8.5px，>9 个用 7.5px
- ✨ 海拔图标注智能避让海拔曲线：把曲线离散成像素采样数组，标签上下/左右探测无碰撞位置
- 🌐 海拔图全部改中文：标题「海拔剖面」、X 轴「里程」、营地/最高/最低中文
- 🐛 测距点击响应优化：nearestTrackIdxOnPrimary 改为平面距离粗筛 + 单次 haversine 校验，7000 点延迟从 ~30ms 降到 ~3ms
- 🐛 海拔图避让算法用二分搜索替代 O(N) 循环，标注绘制速度提升 ~5 倍
- 🐛 测距 elev bar 重绘 requestAnimationFrame 推迟到下一帧，让点击立即响应

**English**

- 🎨 Trail thumbnails now have a map-like base (cream + soft contour curves) with peak triangle marker
- 🎨 Active (overlaid) trail cards collapse to minimal: just dot + name + "showing" badge
- 🎨 Elevation chart markers redesigned: peak ⛰ triangle, camp ⛺ ring, low 💧 dot — smaller dots and text
- ✨ Adaptive font size: 9.5px for ≤5 labels, 8.5px for 6-9, 7.5px for >9
- ✨ Smart label-vs-curve avoidance: discretize curve to pixel array, probe label positions
- 🌐 Elevation chart fully in Chinese: title 海拔剖面, X-axis 里程
- 🐛 Click-to-measure latency: planar distance coarse filter + single haversine check (~30ms → ~3ms)
- 🐛 Curve hit-testing uses binary indexing for ~5x speedup
- 🐛 Elev bar redraw deferred to requestAnimationFrame so click feels instant

## v1.11.0 — 2026-06-12

**中文**

- 🎨 移除整体顶部 header，主轨迹信息整合到右侧 sidebar 顶部的 primary card
- 🎨 主轨迹卡片：奶油色卡纸 + 大衬线路线名 + 6 项关键指标（距离/天数/爬升/下降/最高/最低）+ 反向/KML/链接操作行
- ✨ 备选轨迹列表新增缩略图：左半轨迹平面投影（起绿点/终砖红点）+ 右半海拔迷你图 + Min/Max 标签
- ✨ 反向按钮只在主轨迹（primary card）上显示，备选轨迹移除该入口
- 🎨 海拔图标注按图2风格重绘：去除虚线引导线，标签紧贴点旁（左/右自适应），不再画半透明背景框
- 🐛 修复 minE 标签与 X 轴 km 刻度重叠的 bug：底部 padding 从 26px 加到 34px，minE 标签上移到 X 轴上方
- 🐛 修复一处 annotation 块语法错误（少一个 `})` 导致旧版本下半段渲染异常）
- 🌐 语言切换按钮整合到 sidebar 的 tabs 行末尾

**English**

- 🎨 Removed top header; primary trail info moved to a dedicated card at the top of the sidebar
- 🎨 Primary card: cream paper + serif name + 6 stats (distance/days/ascent/descent/peak/low) + reverse/KML/link actions
- ✨ Trail list cards now show thumbnails: left half is GPS shape (green start, red end), right half is mini elevation chart
- ✨ Reverse action only on primary trail; removed from non-primary cards
- 🎨 Elevation chart annotations redesigned per concept B: no leader lines, labels sit beside dots, no background pill
- 🐛 Fixed minE label colliding with X-axis km ticks (bottom padding 26→34, minE moved above the axis line)
- 🐛 Fixed a missing `})` block that broke later annotation rendering
- 🌐 Language switch moved into the sidebar tabs row

## v1.10.0 — 2026-06-12

**中文**

- 🎨 整体配色改为图2杂志风：米黄底 + 苔绿/砖红双主色 + Source Serif 4 衬线
- 🎨 顶部 header 改成杂志样式：路线名称大衬线 + 数据指标按图2两行排布（数字大 / 标签小斜体大写）
- 🎨 轨迹列表：不再显示主轨迹（信息已在顶部 header），只显示备选轨迹
- 🎨 天数模式轨迹色板改为杂志风 7 色（苔绿/砖红/赭石/沙金/灰蓝/紫黛/暮粉），并加 Bloom 外发光
- ✨ 海拔图新增营地标注：图标=圆点 + 双圈，文字=营地名 + "CAMP xxxxm"
- ✨ 海拔图标注智能避让：相邻标注横向重叠时自动错位 13px，避免文字打架
- ✨ 标注引导线：从轨迹点用虚线连到文字框，文字带半透明米色背景框便于阅读
- 🐛 多个 UI 元素的硬编码深色被替换为 CSS 变量，整体浅色风格统一

**English**

- 🎨 Editorial magazine palette throughout: cream + moss-green / brick-red + Source Serif 4
- 🎨 Header redesigned: route name in serif + stats in editorial 2-line format
- 🎨 Trail list no longer shows the primary trail (it lives in the top header now)
- 🎨 Day-mode palette redesigned (7 magazine-tone colors) + Bloom glow
- ✨ Camp annotations on elevation chart with dot+ring marker
- ✨ Smart label collision avoidance (auto stacks 13px when overlap)
- ✨ Dashed leader lines from track point to label, with cream background pill
- 🐛 Hard-coded dark colors replaced by CSS variables for consistency

## v1.9.0 — 2026-06-12

**中文**

- ✨ 视觉重设计：参考三张概念稿融合落地（地图保持原样不变）
- 🎨 主轨迹 Bloom 外发光：白光 + 嫩绿辉光双层叠加，海拔渐变色更醒目（A 风格）
- 🎨 海拔图杂志卡纸化：米色 #F5F1E8 底 + Source Serif 4 衬线 + 微纸纹噪点（B 风格）
- 🎨 轨迹卡片杂志化：米黄渐变背景、左侧色带、衬线大标题、italic small caps 副信息
- ✨ 海拔图横轴显示多个里程刻度（每 80px 自适应一个），从 0 km 到终点
- ✨ 测距模式海拔图：里程从 0 开始计数，按 A→B 实际方向取海拔序列
- 🐛 测距交换 A/B 修复：交换后爬升/下降数据按 A→B 实际方向重算（之前是固定值不变）

**English**

- ✨ Visual redesign: applied concept blend (map basemap unchanged)
- 🎨 Primary trail Bloom: white outer + mint inner glow with elevation gradient
- 🎨 Elevation chart magazine card: cream #F5F1E8 base + Source Serif 4 + paper grain
- 🎨 Trail cards editorial style: cream gradient, left color rail, serif title, italic small caps
- ✨ Multiple km ticks on the elevation X-axis (one per ~80px)
- ✨ Measure-mode elevation chart starts at 0 km along A→B direction
- 🐛 Measure swap A/B now correctly re-computes ascent/descent for the new direction

## v1.8.0 — 2026-06-10

**中文**

- ✨ 手动添加下撤路线：在下撤方案面板点击「＋ 手动添加」，地图上点选 A/B 两点
- ✨ 自动吸附到最近轨迹（2km 范围内），跨轨迹选点时优先 A 所在轨迹
- ✨ 路线预览：A/B 标记 + 红色虚线高亮 + 自动 flyToBounds
- ✨ 路线名称可编辑后保存，持久化到 IndexedDB
- ✨ 手动路线显示「手动」绿色标签，支持单独删除（🗑）

**English**

- ✨ Manual escape route: click "＋ Add manual" in escape panel, then pick A/B on map
- ✨ Auto-snaps to nearest trail (within 2km); uses A\
- ,
        
- ,
        
- ,
        

## v1.7.0 — 2026-06-09

**中文**

- ✨ 海拔图颜色渐变：按海拔高度从蓝→青→绿→黄→红五色渐变，直观识别高海拔段
- 🐛 海拔图现在随主轨迹切换而实时更新（修复「设为主轨迹」按钮未触发刷新的问题）
- 🐛 修复 lightbox 放大图片后双击触发浏览器元素选中（浅灰蓝色高亮）的问题
- ✨ 测距模式连续测量：已有 A+B 后，再次点击自动替换距离当前点击最近的端点，实现拖动调整
- ✨ 下撤路线跨轨迹分析：导入多条轨迹后，自动检测 500m 内的轨迹交叉/接驳点作为额外下撤目标
- ✨ 跨轨迹下撤在面板显示「跨轨迹」标签，描述文字注明接驳轨迹名与接驳距离
- 🛠 新增轨迹后自动对全部轨迹重建下撤方案（确保彼此参考关系完整）

**English**

- ✨ Elevation chart gradient coloring: blue→cyan→green→yellow→red by altitude
- 🐛 Elevation chart now updates immediately when primary trail changes (fix missing refresh in "set primary" button)
- 🐛 Fix lightbox double-click causing browser element selection (blue-grey highlight)
- ✨ Measure mode: with A+B set, next click replaces the nearest endpoint for continuous adjustment
- ✨ Cross-trail escape routes: after importing multiple trails, auto-detect ≤500m intersection points as additional escape targets
- ✨ Cross-trail escape routes show a "跨轨迹" badge and note the connecting trail name & distance
- 🛠 All trails rebuild escape routes whenever a new trail is added

## v1.6.0 — 2026-06-09

**中文**

- 🐛 海拔图位置修复：right 值从 334px 起步（侧栏展开时不重叠），侧栏收起时自动缩回 14px
- ✨ 海拔图右下角显示当前路段爬升 ↑XXXm / 下降 ↓XXXm 总量
- ✨ 普通模式下点击海拔图 → 地图上标记对应轨迹点（黄色圆点 + km/海拔标注，3 秒后消失）
- ✨ 点击时地图自动 panTo 对应位置
- 🛠 海拔图 hover/click 逻辑重构为统一的 elevHitTest() 函数

**English**

- 🐛 Elev chart position fix: right=334px (no overlap with sidebar), collapses to 14px when sidebar hidden
- ✨ Elev chart shows total ↑ascent / ↓descent for current segment in bottom-right corner
- ✨ Normal mode: click elev chart → map shows a marker at the corresponding track point (3s auto-remove)
- ✨ Map auto-pans to the clicked point
- 🛠 Refactored hover/click into shared elevHitTest() helper

## v1.5.0 — 2026-06-09

**中文**

- ✨ 海拔图改为右下角悬浮卡片（340×120px），不遮挡地图操作区域
- ✨ 海拔图配色优化：深色主题、轨迹主色渐变填充、虚线参考线、最高/最低点标注更清晰
- 🐛 修复下撤路线未生成问题：重写 buildEscapeRoutes，使用最近邻配对（不再要求严格 km 顺序）
- 🛠 旧 IndexedDB 数据加载时自动 backfill escape_routes（用 track 点重建 pts）
- 🛠 下撤路线说明增加方向（原路返回/继续前进）和落差描述

**English**

- ✨ Elevation chart moved to bottom-right floating card (340×120px), no longer blocking map
- ✨ Chart colors: dark theme, trail-color gradient fill, dashed reference lines, clearer peak/valley labels
- 🐛 Fix escape routes not generating: rewrote buildEscapeRoutes with nearest-neighbor pairing
- 🛠 Auto-backfill escape_routes for old IndexedDB data on load
- 🛠 Escape route descriptions now include direction and elevation drop detail

## v1.4.0 — 2026-06-09

**中文**

- 🐛 修复 📏 测距 按钮显示为「action.measure」— 补充了中英文 i18n 翻译 key
- ✨ 底部海拔变化图：主轨迹的完整海拔剖面实时绘制在底部固定栏
- ✨ 测距模式下底部海拔图自动切换为路段视图，退出恢复完整图
- ✨ 底部海拔图可 hover：十字准线 + 浮窗显示当前里程/海拔/累积爬升
- ✨ 底部海拔图可点击选取测距 A/B 点（测距模式下）

**English**

- 🐛 Fix 📏 Measure button showing "action.measure" — added i18n translation keys
- ✨ Bottom elevation chart: full elevation profile of primary trail drawn in fixed bottom bar
- ✨ In measure mode the chart auto-switches to segment view; restores on exit
- ✨ Bottom chart hover: crosshair + tooltip showing km / elev / cumulative ascent
- ✨ Bottom chart clickable to pick A/B measure points (when in measure mode)

## v1.3.0 — 2026-06-09

**中文**

- ✨ 悬停轨迹 tooltip 新增「下降」字段（累积下降随里程变化）
- ✨ 每条轨迹支持「⇄ 反向」：翻转轨迹走向，重算里程/爬升/下降/天数分色/标注点 km
- ✨ 测距面板新增「⇄ 交换 A/B」按钮：快速反向测量方向
- 🐛 修复「+ 添加轨迹」按钮被「📏 测距」按钮覆盖的布局冲突（添加轨迹移至 top:244px，存储移至 top:290px）

**English**

- ✨ Hover tooltip on track now shows cumulative descent
- ✨ Each trail supports ⇄ Reverse: flips direction, recalculates km/ascent/descent/day colors/waypoint km
- ✨ Measure panel: added ⇄ Swap A/B button to flip measurement direction instantly
- 🐛 Fixed layout conflict: + Add Trail button was hidden behind 📏 Measure (moved to top:244px, storage to top:290px)

## v1.2.0 — 2026-06-09

**中文**

- ✨ 轨迹统计新增「下降」数据（累加器法 thr=10m，与爬升对称）
- ✨ 头部全局栏 + 每条轨迹卡片均显示 ↓下降
- ✨ 新增「📏 测距」工具：在主轨迹上点两个点，自动计算两点间的里程/爬升/下降/方向
- ✨ 测距高亮整段轨迹，并标记 A/B 点；支持多次重选
- 🐛 lightbox 图片放大不再触发页面级缩放（自带 pinch/wheel/双击/拖动）
- 🛠 旧 IndexedDB 数据加载时自动补算 descent_m

**English**

- ✨ Trail stats: added descent (accumulator method thr=10m, symmetric to ascent)
- ✨ Header bar & each trail card now show ↓descent
- ✨ New 📏 Measure tool: pick two points on primary trail → distance / ascent / descent / direction
- ✨ Measure highlights segment, marks A/B; supports re-selection
- 🐛 Lightbox zoom no longer triggers page-level zoom (built-in pinch/wheel/dblclick/drag)
- 🛠 Auto-backfill descent_m for old IndexedDB data on load

## v1.1.0 — 2026-06-05

**中文**

- ✨ 导出行程图片（小红书 3:4 竖图 1080×1440）
- ✨ 总览图 + 每日分图，分天着色轨迹 + 标注点卡片
- ✨ Canvas 2D 手绘（深色背景+经纬度网格+信息栏）

**English**

- ✨ Export itinerary images (Xiaohongshu 3:4 1080x1440)
- ✨ Overview + per-day images, day-colored tracks + waypoint cards
- ✨ Canvas 2D drawn (dark bg + grid + info bar)

## v1.0.0 — 2026-06-01

**中文**

- 🎉 1.0 正式版
- ✨ 顶部按钮横排布局
- ✨ 折叠/展开镜像对称半圆形
- ✨ 双击标题改名
- ✨ 右键/长按添加标注点（标记 [手动]）
- ✨ 导出可选 HTML 地图或行程 MD
- ✨ Leaflet 内嵌（290KB 自包含）
- ✨ Chrome emoji 修复
- ✨ 移动端拖动+长按
- 🐛 导出不依赖 fetch（兼容 file://）
- 🐛 activeTrails 序列化修复

**English**

- 🎉 1.0 Stable
- ✨ Horizontal top buttons
- ✨ Mirror semicircle collapse/expand
- ✨ Double-click title to rename
- ✨ Right-click/long-press add waypoint ([手动])
- ✨ Export: HTML map or itinerary MD
- ✨ Leaflet embedded (290KB self-contained)
- ✨ Chrome emoji fix
- ✨ Mobile touch: drag + long-press
- 🐛 Export no fetch dependency (file:// compatible)
- 🐛 activeTrails serialization fix

## v0.6.0 — 2026-05-24

**中文**

- 🎉 正式发行（Stable Release）
- ✨ 新增 ❓ 帮助按钮：完整功能介绍和使用说明
- ✨ 新增 🎯 复位按钮：以主轨迹为中心重新定位
- ✨ 折叠按钮挂到 sidebar 左边线中间，避开 Tab 区
- ✨ 关闭添加面板时清除上次的解析记录
- ✨ 轨迹链接显示改为：🔗 轨迹名 ✎，简洁直观

**English**

- 🎉 Stable Release
- ✨ New ❓ Help button: full feature guide
- ✨ New 🎯 Reset button: zoom map to main trail
- ✨ Sidebar collapse button moved to left edge center (avoids tab overlap)
- ✨ Add panel clears parse log on close
- ✨ Trail link display redesigned: 🔗 trail-name ✎, cleaner

## v0.6.0-rc1 — 2026-05-24

**中文**

- 🎯 正式发行候选版（Release Candidate 1）
- ✨ 添加轨迹时可同步编辑 ID 和链接（添加面板内每条都有输入框）
- ✨ 右侧栏可折叠（顶部 ⟩ 收起，地图右上 ☰ 展开）
- ✨ 标注点模式选择面板改为 2 列网格，更整齐
- ✨ 筛选栏重命名为「标注点」，去掉"显示轨迹线"和"标注点标签"开关

**English**

- 🎯 Release Candidate 1
- ✨ Edit ID & source URL in real-time when adding trails
- ✨ Collapsible right sidebar (⟩ to collapse, ☰ to expand)
- ✨ Waypoint mode tag selection: 2-column grid for better alignment
- ✨ "Filter" tab renamed to "Waypoints"; removed "Show track lines" and "Show waypoint labels" toggles

## v0.5.26 — 2026-05-24

**中文**

- ✨ 鼠标悬停不再显示卡片，点击标注点固定显示卡片（×按钮关闭）
- ✨ 卡片中点击图片 → 全屏放大
- ✨ 显示模式重命名：天数模式 / 海拔模式 / 标注点模式
- ✨ 标注点模式下非主轨迹标注点颜色和主轨迹一样深，只是无 km·海拔标签
- 🐛 标注点对比模式 tag 名跟随系统语言（中英）

**English**

- ✨ Hover no longer shows card; click marker pins card (×to close)
- ✨ Click photo in card → fullscreen zoom
- ✨ Display modes renamed: Days / Elevation / Waypoints
- ✨ Waypoint mode: non-main trail markers use same vivid color as main, only icon (no label)
- 🐛 Waypoint mode tag names follow system language

## v0.5.25 — 2026-05-24

**中文**

- ✨ 轨迹 ID 默认用添加顺序（1, 2, 3...），支持手动编辑
- ✨ 轨迹链接默认 None，支持手动编辑（点 ✎）
- ✨ 标注点对比模式：其他轨迹的标注点只显示图标（无 km·海拔标签），保留 hover 卡片
- ✨ 海拔最高点不再默认选中（标注点对比模式）
- ✨ 标注点类别名称跟随系统语言切换
- 🐛 点击标注点直接放大图片（如有图）；hover 显示卡片但不固定

**English**

- ✨ Trail ID defaults to insertion order (1, 2, 3...), manually editable
- ✨ Trail source defaults to None, manually editable (click ✎)
- ✨ Waypoint compare mode: non-main trail waypoints show icon only (no km·elev label), hover card kept
- ✨ Highest peak no longer selected by default in waypoint compare mode
- ✨ Waypoint category labels follow system language
- 🐛 Click waypoint directly opens photo lightbox (if photo exists); hover shows card but not pinned

## v0.5.24 — 2026-05-24

**中文**

- ✨ 国际化支持中英文切换
- ✨ 标注点对比模式：主轨迹海拔渐变，其他轨迹虚线轮廓+浅色标注点
- ✨ 海拔最高点作为可选标注点类别（默认选中）
- ✨ 轨迹卡片 ID 可手动编辑
- ✨ 鼠标 hover 轨迹线显示最近标注点（图片+文字+轨迹+里程+海拔），点击放大图片
- ✨ IndexedDB 配额查询/请求持久化
- ✨ 版本号点击查看更新日志
- 🐛 多 KML 段轨迹合并修复（gx:Track + LineString 同时支持）
- 🐛 IndexedDB 替代 localStorage（解决 5MB 限制）

**English**

- ✨ i18n: Chinese/English switch
- ✨ Waypoint compare mode: main trail uses elevation gradient, others get dashed outline + faded waypoints
- ✨ Highest elevation point as selectable waypoint category (selected by default)
- ✨ Trail card ID is now manually editable
- ✨ Hover trail line to see nearest waypoint (photo+text+trail+distance+elevation), click photo to zoom
- ✨ IndexedDB quota query / persistence request
- ✨ Click version number to view changelog
- 🐛 Multi-segment KML merging (gx:Track + LineString)
- 🐛 IndexedDB replaces localStorage (solves 5MB limit)

## v0.5.23 — 2026-05-23

**中文**

- 🎉 KML 在线版首次上线
- ✨ 多轨迹叠加（主轨迹高亮，其他淡化）
- ✨ 海拔最高点标记
- ✨ localStorage 持久化（已被 IndexedDB 替换）
- ✨ 导出离线 HTML

**English**

- 🎉 KML online first release
- ✨ Multi-trail overlay (main highlighted, others faded)
- ✨ Highest elevation point marker
- ✨ localStorage persistence (replaced by IndexedDB)
- ✨ Export offline HTML
