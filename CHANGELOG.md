# Changelog

**🌐 中英双语条目 · Chinese and English entries preserved per version**

All notable changes to Hiking Trail Mapper. Both Chinese and English entries preserved from in-app CHANGELOG.

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
