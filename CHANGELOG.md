# Changelog

**🌐 中英双语条目 · Chinese and English entries preserved per version**

All notable changes to Hiking Trail Mapper. Both Chinese and English entries preserved from in-app CHANGELOG.

## v2.0.14 — 2026-07-18

**中文**

- 合并拼接轨迹中相同海拔色阶的断开路径，将地图渐变图层稳定限制为每轨最多 40 层，修复 Pages 的真实 Chrome 验证失败。
- 双指缩放细化为四分之一级吸附；复位缓存轨迹边界并改用短时 fitBounds 动画，只在移动侧栏收起时重新测量地图尺寸。

**English**

- Merge disconnected paths that share an elevation color band, keeping map gradient layers bounded to 40 per trail and fixing the real-Chrome Pages verification failure.
- Refine pinch zoom snapping to quarter levels; cache trail bounds during reset, use a short fitBounds transition, and remeasure the map only after closing the mobile sidebar.

## v2.0.13 — 2026-07-18

**中文**

- 轨迹拼接改为两阶段地图工作流：从零多选来源后，在地图中拖动每段 A/B、调整方向和顺序，并可复制或删除片段。
- 新增 track_breaks 断点模型；地图、海拔图、测距、Day 预览、统计和 KML 导出不再跨空白区域连接或累计距离与高差。

**English**

- Turn trail stitching into a two-stage map workflow: start with no selected sources, then drag each part's A/B handles, change direction and order, and duplicate or remove parts on the map.
- Add the track_breaks gap model so maps, elevation profiles, measurement, Day preview, statistics, and KML export no longer bridge or accumulate distance and elevation across empty space.

## v2.0.12 — 2026-07-17

**中文**

- 新增标注点保留原生类型下拉框，并用固定预览槽显示当前图标；岔路、警示和其他统一改用 16px Lucide 矢量图标，在地图、侧栏与行程中保持相同尺寸和视觉中心。
- 应用行程分段时先完成 IndexedDB 持久化再退出编辑态，确保重新打开 HTML 后恢复最新日程。

**English**

- Keep the native waypoint-type select with a fixed selected-icon preview, and render junction, warning, and other as 16px Lucide vectors with identical visual centers across the map, sidebar, and itinerary.
- Complete IndexedDB persistence before leaving itinerary segment editing so reopening the HTML restores the latest schedule.

## v2.0.11 — 2026-07-17

**中文**

- 将新增标注点的类型选择改为固定图标槽单选面板，统一岔路、警示与其他类型的图标对齐。
- 每次打开 HTML 或恢复缓存后默认选择有效轨迹组，并进入轨迹页面与海拔模式。
- 附近轨迹标注与主轨迹每日行程共用同一类型集合，避免两处显示口径不一致。

**English**

- Replace the add-waypoint native type select with a fixed icon-slot radio picker so junction, warning, and other waypoint icons align consistently.
- Select a valid trail group and open the Trails workspace in Elevation mode whenever the HTML is opened or restored from cache.
- Use the same waypoint type set for nearby-trail choices and primary-trail itinerary waypoints.

## v2.0.10 — 2026-07-17

**中文**

- 修正地图标注图标的固定锚点与字形对齐，并将桥类型统一命名为桥梁。
- 下撤路线支持同时关联多个 Day，并直接显示在每个对应的每日行程卡片中。
- 每日行程可从当前轨迹组中选择距当日主轨迹段 200 米内的其他轨迹标注，并保存来源引用。

**English**

- Align waypoint glyphs on a stable map anchor and rename the Chinese bridge type to 桥梁.
- Allow one escape route to belong to multiple Days and render it directly inside every associated itinerary card.
- Let each itinerary Day select waypoints from other trails in the active group when they are within 200 metres of that Day segment, preserving source references.

## v2.0.9 — 2026-07-17

**中文**

- 优化复位视图：移动端侧栏收起后只执行一次地图定位，常规复位不再触发无必要的全量重绘、测距重算和缓存写入。
- 轨迹拼接支持为每条来源轨迹指定起止里程，可使用局部区间进行排序、反向和拼接，并正确筛选与重映射标注点。

**English**

- Make view reset smoother by fitting once after mobile sidebar closure and skipping unnecessary full rendering, measurement recomputation, and storage writes.
- Allow each stitch source to use a From/To distance range, then reorder, reverse, and join partial trails with correctly filtered and remapped waypoints.

## v2.0.8 — 2026-07-17

**中文**

- 修复测距模式下重新选点、反向和退出操作条在工作台海拔栏中不可见的问题，并在海拔栏收起时保持操作可用。
- 新增已有轨迹拼接：支持多轨迹选择、顺序调整、逐段反向、接缝检查、标注点重映射和统计重算。

**English**

- Keep Reset points, Reverse, and Exit measurement actions visible in the Workbench elevation dock, including its collapsed state.
- Add existing-trail stitching with ordered selection, per-part reversal, junction checks, waypoint remapping, and recalculated statistics.

## v2.0.7 — 2026-07-17

**中文**

- 修复 KML 标注点类型识别，并在每日行程中去除与专用扎营栏重复的营地条目。
- 行程分段的扎营点海拔固定采用当天终点轨迹点海拔，不再允许产生不一致的独立数值。
- 轨迹悬停、轨迹点击和海拔图定位统一显示六位经纬度，并为点击检查提供短时地图标记。

**English**

- Classify KML waypoints during import and remove camp entries duplicated by the dedicated itinerary camp row.
- Use each day endpoint elevation as the itinerary camp elevation instead of allowing a conflicting independent value.
- Show six-decimal coordinates consistently for trail hover, trail inspection, and elevation-chart location markers.

## v2.0.6 — 2026-07-15

**中文**

- 下撤方案支持手动选择对应 Day，并保存明确的正向或反向信息。
- 行程页下撤方案支持按名称、方向、Day 和依据轨迹联合筛选。
- 分段编辑显示未应用状态，退出或切换工具前通过统一对话框确认。
- 新增下撤高亮、分段还原、退出确认和海拔收放的真实 Chrome 交互回归。

**English**

- Allow escape routes to select an itinerary day manually and persist an explicit direction.
- Filter itinerary escape routes by name, direction, day, and reference trail together.
- Show unapplied segment changes and confirm before exiting or switching tools.
- Add real Chrome interaction regressions for escape highlighting, segment restore, exit confirmation, and elevation collapse.

## v2.0.5 — 2026-07-15

**中文**

- 下撤规划高亮当前依据轨迹，并将方案关联到对应行程 Day。
- 复位视图改为按缩放级差平滑过渡，接近触控缩放的节奏。
- 海拔分析栏支持收起与展开，收起后释放地图空间并记忆状态。
- 行程分段改为还原进入编辑时的分段与营地信息。

**English**

- Highlight the selected escape reference trail and associate saved routes with the matching itinerary day.
- Animate view reset according to the zoom-level distance for a gesture-like transition.
- Allow the elevation analysis dock to collapse, reclaim map space, and remember its state.
- Restore itinerary segments and camps to their state when editing began.

## v2.0.4 — 2026-07-14

**中文**

- 将轨迹组提升为最左侧活动栏中的独立入口和专门页面
- 轨迹组页面始终显示当前工作组与轨迹数量，并为移动端增加六格响应式入口

**English**

- Promoted Trail Groups to a dedicated far-left activity and workspace page
- Trail Groups now always shows workspace choices and trail counts with a six-item responsive mobile rail

## v2.0.3 — 2026-07-14

**中文**

- 将轨迹组选择拆分为独立区域，避免与轨迹列表混排
- 扁平化顶部工具栏：仅编辑和规划保留下拉菜单，添加轨迹、测距、标注、导出、复位、帮助和语言改为同级操作

**English**

- Moved trail-group selection into a dedicated area instead of mixing it into the trail list
- Flattened the top toolbar so only Edit and Plan retain menus while Add trail, Measure, Waypoint, Export, Reset, Help, and Language are peer actions

## v2.0.2 — 2026-07-14

**中文**

- 将视图菜单中的复位、帮助和语言拆分为顶栏独立操作，移除不再承载内容的设置入口，并优化桌面与移动端响应式排列

**English**

- Split Reset, Help, and Language out of the View menu into standalone top-bar actions, removed the now-empty Settings entry, and refined responsive desktop and mobile layouts

## v2.0.1 — 2026-07-14

**中文**

- 移除重复的项目、统计和独立下撤入口，同时删除底部 Log、Measure、Segment 重复 Tab；底部区域收敛为海拔分析
- 下撤方案合并进行程页，测距操作嵌入海拔区，分段保留专用编辑面板，并移除右上角旧侧栏恢复按钮
- 新增完整标注点编辑器：在主轨迹选点后可选择图标与类型、填写文字描述并添加可选图片
- 下撤规划新增依据轨迹选择，可在同组其他轨迹上选择 A/B 路段并将方案保存到主轨迹行程；A/B 仅吸附当前依据轨迹
- 去除 Day 信息网格中重复的扎营点海拔，保留独立扎营点行；同时修复版本更新说明滚动时关闭按钮离开可视区域的问题
- 将海拔/标注点模式切换移至最左侧活动栏，并将主轨迹与叠加轨迹选择整理为侧栏中的独立轨迹选择器
- 整理工程结构：删除旧 Field Console 初始化、dev.html 和测试兼容桥，合并 Workbench 状态所有权，重写可读的应用模板并清理失效 CSS 与全局变量

**English**

- Removed duplicate Project, Statistics, and standalone Escape navigation plus the redundant Log, Measure, and Segment bottom tabs; the bottom area now focuses on elevation analysis
- Merged saved escape routes into Itinerary, embedded Measure actions in the elevation area, retained the focused Segment editor, and removed the legacy top-right sidebar restore button
- Added a complete waypoint editor for selecting an icon and type, entering a description, and attaching an optional image after choosing a point on the primary trail
- Added explicit reference-trail selection to Escape planning so A/B can follow another trail in the active group while the saved plan remains attached to the primary itinerary
- Removed the duplicate camp elevation from the Day metrics grid while retaining the dedicated camp row, and kept changelog actions visible during scrolling
- Moved the Elevation/Waypoint mode switch to the far-left activity rail and promoted primary/overlay trail selection into a dedicated sidebar selector
- Cleaned up the project structure by removing the old Field Console initializer, dev.html, and test compatibility bridge; consolidated Workbench state ownership, rewrote the application shell as a readable template, and removed obsolete CSS and globals

## v2.0.0 — 2026-07-14

**中文**

- 删除 executeClassicScript、runtime composer、raw runtime import 和 13 个 classic owner，生产启动链改为直接 TypeScript 模块
- 将版本真源迁移到 src/app/version.ts，第三方库纳入 Vite 模块图，并保留自包含单 HTML 与 GitHub Pages 发布
- 重构测试为 direct runtime 契约，并通过仅测试模式 inspector 保持真实 Chrome、E2E 与视觉回归覆盖
- 修复 Workbench 顶部七个菜单无法接收指针点击的问题，并统一菜单、活动栏、分析 Tab 和辅助控件的中英文切换

**English**

- Removed executeClassicScript, the runtime composer, raw runtime imports, and all 13 classic owners; production now boots through a direct TypeScript module
- Moved version ownership to src/app/version.ts, loaded vendors through the Vite module graph, and retained the self-contained single-HTML and GitHub Pages release
- Reworked tests around direct-runtime contracts and preserved real-Chrome, E2E, and visual coverage through a test-only inspector
- Fixed pointer interaction across all seven Workbench menus and unified Chinese/English switching for menus, activity rail, analysis tabs, and auxiliary controls

## v1.32.2 — 2026-07-11

**中文**

- 修复打开 HTML 从浏览器缓存恢复轨迹后未可靠自动复位的问题：清理失效缓存引用，等待地图布局完成后仅执行一次主轨迹复位

**English**

- Fixed unreliable automatic reset after restoring trails from browser cache when opening the HTML by cleaning stale cache references and fitting the primary trail exactly once after map layout

## v1.32.1 — 2026-07-11

**中文**

- 修复路线工作台副标题越界及左端与地图缩放按钮重叠，并让移动端复位先收起侧栏后重新校准地图视野
- 整理 scripts/build、scripts/release、scripts/maintenance 与 tests/browser 目录，保持 npm 命令兼容
- 扩展真实 KML 视觉回归，覆盖 Day 卡片、A/B 测距、两日分段和移动端复位，并记录 GPX/GeoJSON 独立评估

**English**

- Fixed Trail Console subtitle overflow and overlap with map zoom controls, and made mobile reset close the sidebar before recalibrating map bounds
- Organized scripts/build, scripts/release, scripts/maintenance, and tests/browser while preserving npm command compatibility
- Expanded real-KML visual regression for Day cards, A/B measurement, two-day segmentation, and mobile reset, and documented a separate GPX/GeoJSON evaluation

## v1.32.0 — 2026-07-10

**中文**

- 完成 src/template、src/app、src/features、src/adapters 与 src/ui 分层，根目录 HTML 改为自动生成物并删除 45 个核心 fallback
- 上线地图优先的路线工作台 UI、可收起海拔分析坞、桌面命令台、移动端底部操作栏与 bottom sheet
- 将发布对齐测试升级为内嵌 runtime 行为校验，并接入 TypeScript 状态、Leaflet 与 IndexedDB 适配层

**English**

- Split source ownership across src/template, src/app, src/features, src/adapters, and src/ui; root HTML is now generated and 45 core fallbacks were removed
- Introduced the map-first field console UI with a collapsible elevation dock, desktop command surface, mobile action bar, and bottom sheets
- Replaced fallback-source alignment with embedded-runtime behavior checks and added TypeScript state, Leaflet, and IndexedDB adapters

## v1.31.14 — 2026-07-10

**中文**

- 完成测距、分段、Day 预览和海拔标注渲染模型的核心模块化，HTML 只保留浏览器与 Leaflet/Canvas 适配职责
- 统一工具栏、浮动面板、侧栏、Day 卡片与移动端响应式视觉，并修复无主轨迹空浮动卡遮挡按钮
- 收口 Vite 静态构建、版本同步、完整测试与 GitHub Pages 自动部署流程

**English**

- Completed core modularization for measurement, itinerary segmentation, Day preview, and elevation annotation render models while keeping browser and Leaflet/Canvas effects at the HTML boundary
- Unified toolbar, floating panels, sidebar, Day cards, and responsive styling, and fixed the empty primary mini card covering mobile toolbar controls
- Closed the Vite static build, version synchronization, full validation, and GitHub Pages deployment pipeline

## v1.31.13 — 2026-07-05

**中文**

- 🎯 行程页点击 Day 信息后，地图会自动复位到该日轨迹段，同时保留 A/B 高亮与海拔段显示

**English**

- 🎯 Clicking a Day entry in the itinerary now fits the map to that day segment while keeping A/B highlight and segment elevation view

## v1.31.12 — 2026-07-05

**中文**

- 📈 海拔图最高点/最低点恢复海拔数字标注，但仍保留红蓝颜色区分并取消左侧高低轴标
- 📅 行程分段进入时自动复位视野，并从已有 day_meta / dayId 恢复分段点；无天数信息时默认起点与终点
- ✂ 行程分段支持点击任意位置插入边界、拖动边界调整，并可在列表中指定删除某一天
- 🐛 修复 Day 1 预览在没有显式 dayId 时误把整条轨迹当作第一天的问题，优先使用 day_meta 范围

**English**

- 📈 Elevation high/low points show elevation numbers again while keeping red/blue distinction and no left-side high/low axis labels
- 📅 Segment mode now resets the viewport on entry and restores boundaries from day_meta/day IDs, defaulting to start/end when no day data exists
- ✂ Segment mode can insert boundaries by clicking, drag boundaries to adjust them, and delete a specific day from the list
- 🐛 Fixed Day 1 preview treating the entire trail as day one when no explicit day IDs exist, preferring day_meta ranges instead

## v1.31.11 — 2026-07-04

**中文**

- 🎨 天数模式按天分色改为更柔和且区分度更高的新色板，并同步到分段预览与行程导出
- 📍 海拔图最高点/最低点改为仅用红蓝色点区分，取消数值文字与左侧高低海拔轴标
- 📏 测距 A/B 海拔固定贴在端点左右，里程放在“测距路段 · A → B”右侧，移除“已测量”等状态文字
- ⇄ 测距浮动面板新增“反向”按钮，可交换 A/B 并重新计算方向性的爬升/下降
- 🐛 修复行程页点击 Day 1 可能高亮错误轨迹段：优先使用当前轨迹点 dayId，再回退 day_meta 索引

**English**

- 🎨 Day coloring now uses a softer, more distinguishable palette shared by day mode, segment preview, and itinerary export
- 📍 Elevation high/low points are now color-only dots, with numeric labels and left-side high/low axis labels removed
- 📏 Measure A/B elevations are pinned to the endpoint sides, distance sits next to “Measure segment · A → B”, and measured-status text is removed
- ⇄ The measure floating panel now has a Reverse button that swaps A/B and recalculates directional ascent/descent
- 🐛 Fixed itinerary Day 1 preview selecting the wrong segment by preferring current track day IDs before day_meta indexes

## v1.31.10 — 2026-07-04

**中文**

- 📈 测距信息不再堆成海拔图内的聚合框：A/B、最高点、最低点改为直接标注在海拔曲线对应位置
- 📏 测距里程独立显示在海拔图左上，爬升/下降统一使用海拔图右上统计位，整体更像图表原生信息

**English**

- 📈 Measure details no longer use a bundled overlay box: A/B, high point, and low point are labeled directly on the elevation curve
- 📏 Measure distance is shown separately in the chart header while ascent/descent reuse the chart stats area for a more native chart layout

## v1.31.9 — 2026-07-04

**中文**

- 📅 行程页每日卡片重排为更清晰的摘要卡，突出路线、距离、爬升、下降、高低海拔与扎营点
- 🗺 天数模式入口从轨迹页移除，点击“行程”页时自动切换为按天分色，离开后回到此前的海拔/标注点模式
- 📍 海拔模式作为默认显示时保留水源、补给、桥河、起终点等核心标注，避免默认可读性下降

**English**

- 📅 Daily itinerary cards are redesigned as clearer summary cards highlighting route, distance, ascent, descent, elevation range, and camp
- 🗺 Days mode is removed from the Trails tab and now activates automatically when opening the Itinerary tab, then restores the previous elevation/waypoint mode when leaving
- 📍 Elevation mode now keeps core waypoint types visible by default, including water, supply, bridge/river, start, and end markers

## v1.31.8 — 2026-07-04

**中文**

- 📏 测距浮动面板精简为“重新选点 / 退出”两个按钮，减少地图遮挡
- 📈 测距提示与里程、爬升、下降、A/B 海拔、段内最高等信息移入海拔图内部显示
- 📝 明确日程标注点逻辑：只使用主轨迹已吸附/落入当天范围的关键标注类型，不直接吸附其他轨迹点

**English**

- 📏 Measure floating panel is reduced to only Reset and Exit buttons to reduce map obstruction
- 📈 Measure hints and stats now live inside the elevation chart: distance, ascent, descent, A/B elevation, and segment max elevation
- 📝 Clarified itinerary waypoint logic: it uses key waypoint types attached to the primary trail/day range, not arbitrary points from other trails

## v1.31.7 — 2026-07-04

**中文**

- 🎛 顶部工具栏去掉外层浅色背景，移除“缓存”入口，并重排为两行五列按钮
- ⚡ 测距与分段进入时自动切到标注点模式，避免海拔模式下多轨迹渐变分段带来的拖动卡顿
- 📅 行程页每日卡片补充最低海拔，并支持点击每日信息栏高亮对应当天轨迹与海拔剖面
- 🔎 地图 +/- 缩放按钮步进调大为 1 级，保留 0.5 级吸附以兼顾滚轮与触控板缩放
- 📝 README 补充 Vite + TypeScript + 模块化工程化实施方案与发布仍输出静态 HTML 的迁移路线

**English**

- 🎛 The top toolbar no longer has an outer light background, removes the Cache entry, and uses a two-row five-column layout
- ⚡ Measure and segment tools now switch to waypoint mode on entry, avoiding drag lag from multi-trail elevation-gradient rendering
- 📅 Daily itinerary cards now include minimum elevation and can highlight that day’s map segment plus elevation profile when clicked
- 🔎 Map +/- zoom buttons now step by 1 level while retaining 0.5 snapping for wheel and trackpad zooming
- 📝 README now documents the Vite + TypeScript + modularization plan while keeping static HTML release output

## v1.31.6 — 2026-07-04

**中文**

- 🎛 顶部工具栏改为三行固定网格：帮助/复位，测距/分段/标注/下撤/反向，轨迹/导出/缓存/清空
- 💾 顶部存储入口改名为“缓存”，按钮名称与当前功能表达保持一致
- 📈 海拔图支持拖动并记忆位置，双击拖动手柄可恢复默认左下角，减少复位后遮挡轨迹的问题
- 📏 测距浮动栏支持拖动并记忆位置，双击标题行恢复默认居中位置，避免遮挡当前测距路段

**English**

- 🎛 Top toolbar now uses a fixed three-row grid: help/reset, measure/segment/mark/escape/reverse, trail/export/cache/clear
- 💾 The storage entry is renamed to “Cache” for a shorter, clearer toolbar label
- 📈 Elevation chart is draggable with remembered position; double-click the drag grip to restore the default bottom-left placement
- 📏 Measure panel is draggable with remembered position; double-click the title row to restore its default centered placement

## v1.31.5 — 2026-07-04

**中文**

- 🐛 修复测距模式选完 A/B 后点击复位只调整视野、不补画 A/B 黄色高亮段的问题
- ⚡ 测距统计改为使用累计里程/爬升/下降与分块最高海拔缓存，避免拖动端点后遍历整段轨迹导致数秒延迟
- 📏 A/B 端点拖动中实时更新测距线与面板数值，松手后只做最终确认与海拔图刷新
- 🧲 A/B 拖动吸附优先搜索当前端点附近的轨迹索引窗口，密集轨迹点场景下再回退到网格查找

**English**

- 🐛 Fix reset in measure mode after selecting A/B: the viewport fit now also redraws the yellow highlighted A/B segment
- ⚡ Measure stats now use cumulative distance/ascent/descent plus cached block max elevation, avoiding full segment scans that caused multi-second endpoint update delays
- 📏 A/B endpoint dragging now live-updates the measured line and panel values; dragend only confirms and refreshes the elevation chart
- 🧲 A/B drag snapping first searches a local index window around the current endpoint, then falls back to grid lookup for dense-track cases

## v1.31.4 — 2026-07-04

**中文**

- 🧭 主轨迹浮动小卡在侧栏收起动画结束后再次套用记忆位置，避免下一次收起时使用收起前的地图宽度计算位置
- 📍 标注点图标统一按 tag 取标准图标，地图、行程页和筛选页不再受旧数据里历史 icon 影响
- 🎛 顶部按钮重排为导航、分析、新增、数据四组，并为新增标注点与手动下撤入口预留固定位置
- ➕ 新增顶部“标注”按钮：进入一次性点选模式，在主轨迹附近点击即可新增手动标注点

**English**

- 🧭 The primary mini card reapplies remembered position after the sidebar collapse transition, avoiding position math based on the pre-collapse map width
- 📍 Waypoint icons now resolve from canonical tag icons so map markers, itinerary, and filter chips no longer depend on stale stored icons
- 🎛 Top buttons are regrouped into navigation, analysis, creation, and data clusters with fixed slots for new waypoint and manual escape actions
- ➕ Added a top “Mark” button for one-shot waypoint placement near the primary trail

## v1.31.3 — 2026-07-04

**中文**

- ⚡ 测距拖动结束后先即时刷新 A/B 点位，再用抽样高亮线和计算序号避免旧结果回写，降低长路段更新延迟
- 🎛 顶部工具栏、测距面板和分段面板按钮重新分组排布，整体对齐更稳定
- 🧭 侧栏收起后的主轨迹浮动卡片支持点击拖动并记忆位置，短点击仍展开侧栏
- 🔄 从浏览器缓存恢复数据后采用延迟两阶段复位，打开 HTML 时更稳定地贴合主轨迹
- 📍 地图标注点标签显示 D 天数，并在分段应用后刷新标注、行程和主轨迹小卡
- 🧪 Codex 沙箱内静态验收不再启动 Chrome；真实浏览器测试只通过外部 full check 执行

**English**

- ⚡ Measure endpoint drag now updates A/B markers immediately, then uses sampled highlight paths plus compute sequence guards to avoid stale result writes and reduce long-section lag
- 🎛 Top toolbar plus measure/segment panel buttons are regrouped and aligned for steadier layout
- 🧭 The collapsed-sidebar primary mini card is now draggable with remembered position; short click still opens the sidebar
- 🔄 Browser-cache restore now performs a delayed two-phase reset so opening the HTML more reliably fits the primary trail
- 📍 Map waypoint labels show D-day badges and refresh waypoints, itinerary, and the primary mini card after applying segments
- 🧪 Codex sandbox static checks no longer launch Chrome; real browser validation only runs through the external full check

## v1.31.2 — 2026-07-04

**中文**

- ⚡ 测距 A/B 与分段点拖动吸附改为 requestAnimationFrame 节流，每帧最多查一次最近主轨迹点，降低密集轨迹拖动卡顿
- 🧭 测距与分段共用主轨迹拖动吸附调度器，dragend 会取消未执行帧，避免旧 marker 异步吸附干扰重绘

**English**

- ⚡ Measure A/B and segment point drag snapping now use requestAnimationFrame throttling, limiting nearest-primary-track lookup to once per frame and reducing lag on dense trails
- 🧭 Measure and segment modes share the primary-track drag snap scheduler; dragend cancels pending frames to avoid stale marker snapping after redraw

## v1.31.1 — 2026-07-03

**中文**

- 📝 README 标题居中并加入小图标，优化双语文档结构与版本策略说明
- 🔖 日常修复、文档和小交互优化优先走 PATCH 小版本，不再把每项改动都当成大版本
- 📈 海拔图填充改为与黑色曲线共用同一路径，修复曲线和下方图形边缘不重合的问题
- 📏 测距模式改为先点击 A/B 两点，后续通过拖动 A/B 端点调整位置，逻辑与日期规划模式保持一致

**English**

- 📝 Center README title, add small icons, and improve bilingual documentation structure plus versioning notes
- 🔖 Daily fixes, docs, and small interaction changes now use PATCH releases instead of treating every change as a large version bump
- 📈 Elevation fill now shares the exact same path as the black curve, fixing the mismatch between curve and area edge
- 📏 Measure mode now selects A/B with the first two clicks, then adjusts endpoints by dragging A/B, matching the date-planning flow

## v1.31.0 — 2026-07-02

**中文**

- 🐛 修复"选完 AB → 复位 → 再选 B 慢"：measureReset 现在同步刷新海拔图回全轨模式，避免下次 measureCompute 的 refreshElevBar 与残留状态竞态
- ⚡ 海拔图 predictStackDepth 用 for-loop 找 min/max/peakIdx/valleyIdx，替换 alts.map + Math.min(...spread) + indexOf，大轨迹上省几十 ms 且避免栈溢出
- ✨ 从浏览器缓存恢复数据后自动执行一次复位（resetView），保证视野贴到主轨迹上
- 🛠 sync_release.sh 默认以 template 为准（不再从 hiking_trail_assets/current 特化版拉，避免误覆盖新版本）

**English**

- 🐛 Fix "select AB → reset → re-select B slow": measureReset now syncs elevation bar back to full-trail mode, avoiding race with next measureCompute's refreshElevBar
- ⚡ Elevation predictStackDepth uses for-loop for min/max/peakIdx/valleyIdx, replaces alts.map + Math.min(...spread) + indexOf; saves dozens of ms on long trails and avoids stack overflow
- ✨ After restoring data from browser cache, auto-perform resetView so viewport snaps to primary trail
- 🛠 sync_release.sh defaults to template (no longer pulls specialized HTML from hiking_trail_assets/current, avoids overwriting newer versions)

## v1.30.0 — 2026-07-02

**中文**

- 🎯 定位到轨迹上点击慢的真正真凶：不是 JS handler，而是浏览器渲染层的 SVG path 命中测试 —— 长轨迹的 SVG path 有几千段，每一次 mousemove/mousedown 都要 O(n) 段命中检测
- ⚡ 测距/分段模式下给 map container 加 .measure-active 类，CSS 强制所有 SVG path 变为 pointer-events: none，浏览器完全跳过命中测试
- ✂ 取消测距完成后的自动 fitBounds 复位（用户不希望测距时视图跳转）
- ✂ 取消退出测距时的自动 resetView 复位

**English**

- 🎯 Pinpointed the real cause of on-trail click slowness: not JS handlers, but browser-level SVG path hit-testing — long trails have thousands of SVG path segments, each mousemove/mousedown triggers O(n) hit tests
- ⚡ Measure/segment modes add .measure-active class to map container, CSS forces all SVG paths to pointer-events: none, browser completely skips hit-testing
- ✂ Removed auto-fitBounds after measure A+B computed (user doesn't want view to jump during measurement)
- ✂ Removed auto-resetView on measure exit

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
- ⚡ Disabled Leaflet's L.Tap handler (tap: false), removes touch tap delay
- ✨ After selecting A+B in measure mode, auto-fitBounds to the measured segment (60px padding), no manual reset needed
- ✨ Exiting measure mode (✕ Exit or re-clicking 📏) auto-resets view to full primary trail
- ✨ Applying segments syncs to sidebar Itinerary tab: not only writes day_meta and track dayId, but daily cards immediately show
- ✨ Segment apply automatically tags primary trail waypoints with day field, itinerary tab precisely groups waypoints by day
- ✨ Itinerary tab daily expansions fixed-show key types (camp/pass/water/supply/bridge/river/village/shelter/warn/fork/start/end), unaffected by filter
- 🐛 Fix buildDaysTab crash when day_meta is undefined

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
- ✨ Segment generates seg description field (start elev → peak → end elev (km)), itinerary tab shows the day's summary at a glance
- 🐛 Fix buildDaysTab crash when day_meta is undefined: shows "no daily itinerary set" placeholder
- 🐛 Fix buildDaysTab showing "undefined" when dm.seg is empty: falls back to km/asc/desc/max combo

## v1.25.0 — 2026-07-01

**中文**

- ⚡ 测距选点响应大幅提速：doubleClickZoom 关闭 → 消除 Leaflet 内部 ~200ms click 延迟
- ⚡ 测距计算异步化：点击立即绘制高亮段+marker，dist/asc/desc/max 挪到下一帧计算，海拔图再下一帧
- ⚡ 优化数组遍历：避免 slice + spread（大数组慢/爆栈），用 for 循环 + 预分配 typed array
- 🎨 测距结果面板移除"方向"字段（永远 A→B，无需显示）
- 🎨 测距结果面板移除「⇄ 交换 A/B」按钮（方向不重要，简化 UI）
- 🎨 「⛰ 段内最高」从跨列独占一行改为与其他 5 项等宽两列布局，更紧凑

**English**

- ⚡ Measure click response greatly sped up: doubleClickZoom disabled → removes Leaflet's internal ~200ms click delay
- ⚡ Measure computation async: click immediately draws segment+markers, dist/asc/desc/max moved to next frame, elev chart to the frame after
- ⚡ Array traversal optimized: avoid slice + spread (slow/stack overflow on big arrays), use for-loops + pre-allocated arrays
- 🎨 Measure panel removed "Direction" field (always A→B, no need to show)
- 🎨 Measure panel removed "⇄ Swap A/B" button (direction irrelevant, simplify UI)
- 🎨 "⛰ Max in segment" no longer spans two columns, joins the two-column grid layout

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
- ✨ Auto-reset on group switch, view immediately aligns to the new group's primary trail
- ♻️ Extracted resetView() shared by reset button / import / group switch, consistent behavior (primary trail fallback + full redraw + fitBounds)

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

- ✨ Primary trail no longer removed from the trail list, marked with gold left border and ★ badge instead (previously the primary trail "disappeared" into the top card and users couldn't find it)
- ✨ "Set as Main" button on the primary card replaced with read-only "★ Main" label (prevents users from clicking to set themselves as primary)
- ✨ Each group independently remembers its primary trail: state.primaryByGroup[groupName]. Switching primary in group A no longer pollutes group B; switching back preserves memory
- 🔧 state.primaryTrailId is now a getter/setter bridging to primaryByGroup[activeGroup]. All legacy code upgraded transparently
- 🔧 Full scenario coverage: group switch / group dropdown / batch move / trail delete / IndexedDB restore all correctly clean up other groups' memory values
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
- ✨ Auto-snaps to nearest trail (within 2km); uses A's trail when points are on different trails
- ✨ Preview: A/B markers + red dashed polyline + auto flyToBounds
- ✨ Route name editable before saving; persisted to IndexedDB
- ✨ Manual routes show green "手动" badge and can be individually deleted (🗑)

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
