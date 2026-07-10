let DATA = {"title": "徒步路线地图", "trails": [], "calc_method": {}}; window.DATA = DATA;

/* src/core is the runtime source of truth; browser orchestration binds directly to it. */
const HTM_CORE = window.HikingTrailCore;
if(!HTM_CORE) throw new Error('HikingTrailCore runtime is missing');
window.__HTM_CORE_RUNTIME__ = HTM_CORE;
const HTM_APP = window.HikingTrailApp;
if(!HTM_APP) throw new Error('HikingTrailApp runtime is missing');
window.__HTM_APP_RUNTIME__ = HTM_APP;
HTM_APP.initializeWorkbenchChrome(document, window.localStorage);
haversine = HTM_CORE.haversine;
smoothElev = HTM_CORE.smoothElev;
accumulatorAscent = HTM_CORE.accumulatorAscent;
accumulatorDescent = HTM_CORE.accumulatorDescent;
elevRatioColor = HTM_CORE.elevRatioColor;
trailContentHash = HTM_CORE.trailContentHash;
clampTrackIndex = HTM_CORE.clampTrackIndex;
pointFromTrackIndex = HTM_CORE.pointFromTrackIndex;
normalizeTrackIndexRange = HTM_CORE.normalizeTrackIndexRange;
buildTrackLatLngs = HTM_CORE.buildTrackLatLngs;
buildMeasureSegmentRenderModel = HTM_CORE.buildMeasureSegmentRenderModel;
buildDayPreviewRenderModel = HTM_CORE.buildDayPreviewRenderModel;
applyMeasureEndpointState = HTM_CORE.applyMeasureEndpointState;
reverseMeasureEndpoints = HTM_CORE.reverseMeasureEndpoints;
moveSegmentBoundary = HTM_CORE.moveSegmentBoundary;
computeSegmentStatsForTrack = HTM_CORE.computeSegmentStats;
buildSegmentLayerModel = HTM_CORE.buildSegmentLayerModel;
computeElevationLayout = HTM_CORE.computeElevationLayout;
computeElevationRenderModel = HTM_CORE.computeElevationRenderModel;
estimateElevationLabelStackDepth = HTM_CORE.estimateElevationLabelStackDepth;
computeElevationPanelHeight = HTM_CORE.computeElevationPanelHeight;
layoutElevationAnnotations = HTM_CORE.layoutElevationAnnotations;
buildElevationAnnotationRenderModel = HTM_CORE.buildElevationAnnotationRenderModel;
storageTrailGroup = HTM_CORE.storageTrailGroup;
normalizePrimaryByGroup = HTM_CORE.normalizePrimaryByGroup;
normalizeActiveTrailIds = HTM_CORE.normalizeActiveTrailIds;
primaryTrailIdForGroup = HTM_CORE.primaryTrailIdForGroup;
ensurePrimaryForActiveGroup = HTM_CORE.ensurePrimaryForActiveGroup;
serializeStorageSnapshot = HTM_CORE.serializeStorageSnapshot;
normalizeIndexedDbStorageConfig = HTM_CORE.normalizeIndexedDbStorageConfig;
buildStorageReadOperation = HTM_CORE.buildStorageReadOperation;
buildStorageWriteOperation = HTM_CORE.buildStorageWriteOperation;
buildStorageDeleteOperation = HTM_CORE.buildStorageDeleteOperation;
restoreStorageSnapshot = HTM_CORE.restoreStorageSnapshot;
removeTrailFromPrimaryByGroup = HTM_CORE.removeTrailFromPrimaryByGroup;
parseCoordStr = HTM_CORE.parseKmlCoordinateText;
parseGxCoordText = HTM_CORE.parseGxCoordText;
kmlCoordsToTrackPoints = HTM_CORE.kmlCoordsToTrackPoints;
extractImageUrl = HTM_CORE.extractKmlImageUrl;
shortLabel = HTM_CORE.shortKmlLabel;
normalizeKmlTitle = HTM_CORE.normalizeKmlTitle;
buildKmlParseModel = HTM_CORE.buildKmlParseModel;
enrichWaypoints = HTM_CORE.enrichWaypoints;
computeCumulativeDistance = HTM_CORE.computeCumulativeDistance;
computeTrailStats = HTM_CORE.computeTrailStats;


/* ============ i18n ============ */
const I18N = {
  zh: {
    // 通用
    'app.title': '徒步路线地图',
    'header.trails': '条',
    'header.peak': '最高',
    'header.km': 'km',
    'header.ascent': 'm ↑',
    // Tabs
    'tab.trail': '轨迹',
    'tab.filter': '标注点',
    'tab.day': '行程',
    'tab.escape': '下撤',
    // 轨迹 tab
    'trail.list': '轨迹列表',
    'trail.primary': '★主',
    'trail.show': '✓ 显示',
    'trail.hide': '○ 隐藏',
    'trail.setPrimary': '设为主轨迹',
    'trail.isPrimary': '主轨迹',
    'trail.currentPrimary': '⭐ 当前主轨迹',
    'trail.original': '🔗 原始',
    'trail.delete': '🗑 删除',
    'trail.id': 'ID',
    'trail.editId': '编辑 ID',
    'trail.editLink': '编辑轨迹链接',
    'trail.addLink': '添加链接',
    'trail.days': '日',
    'mode.title': '显示模式',
    'mode.day': '天数模式',
    'mode.elev': '海拔模式',
    'mode.waypoint': '标注点模式',
    'mode.day.descSep': '：',
    'mode.day.desc': '主轨迹按天数分色',
    'mode.elev.desc': '已叠加的每条轨迹用蓝→红表示低→高，主轨迹凸显',
    'mode.waypoint.desc': '主轨迹按海拔渐变；其他轨迹仅显示所选的标注点（含未叠加）',
    'mode.waypoint.tagsTitle': '本模式显示哪些类别的标注点：',
    // v1.12.5
    'mode.tagTitle.day': '天数模式 · 标注点',
    'mode.tagTitle.elev': '海拔模式 · 标注点',
    'mode.tagTitle.waypoint': '标注点模式 · 标注点',
    'elev.title': '海拔剖面',
    'elev.measure': '测距路段 · A → B',
    'elev.km': '里程',
    'mini.primary': '★ 主轨迹',
    'mini.km': 'km',
    'mini.ascent': 'm↑',
    'mini.peak': 'm',
    // primary-card 字段
    'pc.eyebrow': '★ 主轨迹',
    'pc.distance': 'km · 距离',
    'pc.dayUnit': 'day · 天数',
    'pc.daysUnit': 'days · 天数',
    'pc.ascent': 'm · 累计爬升',
    'pc.descent': 'm · 累计下降',
    'pc.maxElev': 'm · 最高点',
    'pc.minElev': 'm · 最低点',
    'pc.dlKml': '⬇ KML',
    'pc.source': '🔗 来源',
    'pc.editLink': '✎ 链接',
    'pc.empty': '尚未设置主轨迹，导入 KML 开始。',
    'pc.emptyGroup': '未选中任何分组 · 点击顶部分组切换',
    'trail.emptyNoGroup': '未选中任何分组，再次点击分组 tab 可切换或取消选中',
    // 海拔图标注（绘制在 canvas 上的中文字符）
    'elev.anno.peak': '最高',
    'elev.anno.valley': '最低',
    'elev.anno.camp': '营地',
    'elev.start': '起',
    'elev.end': '止',
    'mini.openSidebar': '点击展开侧栏',
    // 筛选 tab
    'filter.title': '显示轨迹线',
    'filter.showTrack': '显示轨迹线',
    'filter.showLabel': '显示标注点标签',
    'filter.tagsTitle': '标注点类型',
    'filter.selectAll': '全选',
    'filter.selectNone': '全不选',
    'filter.showHighPoint': '标注每条轨迹海拔最高点',
    // 行程 tab
    'days.title': '行程安排',
    // 下撤 tab
    'escape.title': '下撤路线',
    // 操作
    'action.add': '+ 轨迹',
    'action.addWaypoint': '📍 标注',
    'action.addEscape': '⚡ 下撤',
    'action.export': '📤 导出',
    'action.clear': '🗑 清空',
    'action.cancel': '取消',
    'export.chooseFormat': '选择导出格式',
    'export.htmlMap': 'HTML 地图',
    'export.mdItinerary': '行程 MD',
    'export.imgItinerary': '行程图片',
    'action.reset': '🎯 复位',
    'action.measure': '📏 测距',
    'action.segment': '📅 分段',
    'action.help': '❓ 帮助',
    'action.reverse': '⇌ 反向',
    'help.title': '使用说明',
    'action.save': '保存',
    // 添加轨迹弹窗
    'add.title': '添加 KML 轨迹',
    'add.dropHint': '拖入或点击选择 .kml / .zip 文件（可多选，支持导入前导出的 KML 打包）',
    'add.parsing': '⏳ 解析',
    'add.waypoints': '标注点',
    'add.urlPlaceholder': '可选：粘贴轨迹来源链接',
    // tag 名
    'tag.start': '起点',
    'tag.end': '终点',
    'tag.camp': '营地',
    'tag.pass': '垭口',
    'tag.water': '水源',
    'tag.supply': '补给',
    'tag.fork': '岔路',
    'tag.warn': '警示',
    'tag.shelter': '庇护',
    'tag.village': '村庄',
    'tag.view': '其他',
    'tag.other': '其他',
    'tag.bridge': '桥',
    'tag.river': '河流',
    'tag.peak': '山峰',
    'tag.viewpoint': '观景',
    'tag.highpoint': '最高海拔',
    'tag.other': '其他',
    // 弹窗
    'popup.km': 'km',
    'popup.elev': 'm',
    'popup.trailLabel': '轨迹',
    'popup.zoom': '点击图片放大',
    'popup.clickToZoom': '点击标注点放大图片',
    'popup.clickPhotoZoom': '点击图片放大',
    // 提示
    'toast.saved': '✓ 已自动保存',
    'toast.loaded': '✓ 从浏览器恢复',
    'toast.full': '❌ 存储已满，请删除部分轨迹',
    'toast.imported': '✓ 已导入',
    'storage.title': '缓存',
    'storage.used': '已用',
    'storage.total': '总配额',
    'storage.persist': '请求持久化',
    'storage.persisted': '✓ 已持久化',
    'legend.title': '多轨迹（主轨迹高亮）',
    'lang.label': '语言',
    'changelog.title': '更新日志',
    'changelog.close': '关闭',
  },
  en: {
    'app.title': 'Hiking Trail Map',
    'header.trails': 'trails',
    'header.peak': 'peak',
    'header.km': 'km',
    'header.ascent': 'm ↑',
    'tab.trail': 'Trails',
    'tab.filter': 'Waypoints',
    'tab.day': 'Itinerary',
    'tab.escape': 'Escape',
    'trail.list': 'Trail List',
    'trail.primary': '★Main',
    'trail.show': '✓ Show',
    'trail.hide': '○ Hide',
    'trail.setPrimary': 'Set as Main',
    'trail.isPrimary': 'Main',
    'trail.currentPrimary': '⭐ Current Main',
    'trail.original': '🔗 Source',
    'trail.delete': '🗑 Delete',
    'trail.id': 'ID',
    'trail.editId': 'Edit ID',
    'trail.editLink': 'Edit Source URL',
    'trail.addLink': 'Add link',
    'trail.days': 'd',
    'mode.title': 'Display Mode',
    'mode.day': 'Days',
    'mode.elev': 'Elevation',
    'mode.waypoint': 'Waypoints',
    'mode.day.descSep': ': ',
    'mode.day.desc': 'Primary trail colored by day',
    'mode.elev.desc': 'Each overlaid trail uses Blue→Red = Low→High; primary highlighted',
    'mode.waypoint.desc': 'Primary uses elevation gradient; other trails show only selected waypoints (incl. not overlaid)',
    'mode.waypoint.tagsTitle': 'Categories to display in this mode:',
    'mode.tagTitle.day': 'Days mode · Waypoints',
    'mode.tagTitle.elev': 'Elevation mode · Waypoints',
    'mode.tagTitle.waypoint': 'Waypoint mode · Waypoints',
    'elev.title': 'Elevation Profile',
    'elev.measure': 'Measure segment · A → B',
    'elev.km': 'Distance',
    'mini.primary': '★ Primary Trail',
    'mini.km': 'km',
    'mini.ascent': 'm↑',
    'mini.peak': 'm',
    'pc.eyebrow': '★ Primary Trail',
    'pc.distance': 'km · Distance',
    'pc.dayUnit': 'day · Days',
    'pc.daysUnit': 'days · Days',
    'pc.ascent': 'm · Total Ascent',
    'pc.descent': 'm · Total Descent',
    'pc.maxElev': 'm · Peak',
    'pc.minElev': 'm · Lowest',
    'pc.dlKml': '⬇ KML',
    'pc.source': '🔗 Source',
    'pc.editLink': '✎ Link',
    'pc.empty': 'No primary trail set. Import KML to start.',
    'pc.emptyGroup': 'No group selected · Click a group tab above',
    'trail.emptyNoGroup': 'No group selected. Click a group tab to select or click active tab again to deselect.',
    'elev.anno.peak': 'Peak',
    'elev.anno.valley': 'Low',
    'elev.anno.camp': 'Camp',
    'elev.start': 'Start',
    'elev.end': 'End',
    'mini.openSidebar': 'Click to expand sidebar',
    'filter.title': 'Track Lines',
    'filter.showTrack': 'Show track lines',
    'filter.showLabel': 'Show waypoint labels',
    'filter.tagsTitle': 'Waypoint Types',
    'filter.selectAll': 'All',
    'filter.selectNone': 'None',
    'filter.showHighPoint': 'Mark elevation peak of each trail',
    'days.title': 'Daily Itinerary',
    'escape.title': 'Escape Routes',
    'action.add': '+ Trail',
    'action.addWaypoint': '📍 Mark',
    'action.addEscape': '⚡ Escape',
    'action.export': '📤 Export',
    'action.clear': '🗑 Clear',
    'action.cancel': 'Cancel',
    'export.chooseFormat': 'Export Format',
    'export.htmlMap': 'HTML Map',
    'export.mdItinerary': 'Itinerary MD',
    'export.imgItinerary': 'Itinerary Images',
    'action.reset': '🎯 Reset',
    'action.measure': '📏 Measure',
    'action.segment': '📅 Segment',
    'action.help': '❓ Help',
    'action.reverse': '⇌ Reverse',
    'help.title': 'How to Use',
    'action.save': 'Save',
    'add.title': 'Add KML Trails',
    'add.dropHint': 'Drop or click to select .kml or .zip file(s) (bundled KML export supported)',
    'add.parsing': '⏳ Parsing',
    'add.waypoints': 'waypoints',
    'add.urlPlaceholder': 'Optional: paste trail source URL',
    'tag.start': 'Start',
    'tag.end': 'End',
    'tag.camp': 'Camp',
    'tag.pass': 'Pass',
    'tag.water': 'Water',
    'tag.supply': 'Supply',
    'tag.fork': 'Fork',
    'tag.warn': 'Warning',
    'tag.shelter': 'Shelter',
    'tag.village': 'Village',
    'tag.view': 'Other',
    'tag.other': 'Other',
    'tag.bridge': 'Bridge',
    'tag.river': 'River',
    'tag.peak': 'Peak',
    'tag.viewpoint': 'Viewpoint',
    'tag.highpoint': 'Highest Point',
    'tag.other': 'Other',
    'popup.km': 'km',
    'popup.elev': 'm',
    'popup.trailLabel': 'Trail',
    'popup.zoom': 'Click to zoom',
    'popup.clickToZoom': 'Click marker to zoom photo',
    'popup.clickPhotoZoom': 'Click photo to zoom',
    'toast.saved': '✓ Auto-saved',
    'toast.loaded': '✓ Restored',
    'toast.full': '❌ Storage full, please delete some trails',
    'toast.imported': '✓ Imported',
    'storage.title': 'Cache',
    'storage.used': 'Used',
    'storage.total': 'Quota',
    'storage.persist': 'Request Persistence',
    'storage.persisted': '✓ Persisted',
    'legend.title': 'Multi-trail (main highlighted)',
    'lang.label': 'Language',
    'changelog.title': 'Changelog',
    'changelog.close': 'Close',
  }
};
let currentLang = (() => {
  try { return localStorage.getItem('hiking_lang') || (navigator.language && navigator.language.startsWith('en') ? 'en' : 'zh'); }
  catch(e) { return 'zh'; }
})();
function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.zh[key] || key;
}
function setLang(lang) {
  currentLang = lang;
  try { localStorage.setItem('hiking_lang', lang); } catch(e) {}
  if(typeof rebuildAll === 'function') rebuildAll({fit: false});
  applyI18n();  // 必须在 rebuildAll 之后再次调用，因为重建后 DOM 是新的中文默认
  // 海拔图、主轨迹小卡、模式标注点筛选标题用 JS 拼接，无 data-i18n，需手动刷新
  if(typeof refreshElevBar === 'function') refreshElevBar();
  if(typeof buildPrimaryMini === 'function') buildPrimaryMini();
  if(typeof buildPrimaryCard === 'function') buildPrimaryCard();
  if(typeof updateModeTagTitle === 'function') updateModeTagTitle();
}
function applyI18n() {
  document.title = t('app.title');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  HTM_APP.initializeWorkbenchChrome(document, window.localStorage);
}

/* ============ Changelog ============ */
const APP_VERSION = 'v1.32.1';
const CHANGELOG = [
  {
    version: 'v1.32.1',
    date: '2026-07-11',
    items: {
      zh: ['修复路线工作台副标题越界及左端与地图缩放按钮重叠，并让移动端复位先收起侧栏后重新校准地图视野', '整理 scripts/build、scripts/release、scripts/maintenance 与 tests/browser 目录，保持 npm 命令兼容', '扩展真实 KML 视觉回归，覆盖 Day 卡片、A/B 测距、两日分段和移动端复位，并记录 GPX/GeoJSON 独立评估'],
      en: ['Fixed Trail Console subtitle overflow and overlap with map zoom controls, and made mobile reset close the sidebar before recalibrating map bounds', 'Organized scripts/build, scripts/release, scripts/maintenance, and tests/browser while preserving npm command compatibility', 'Expanded real-KML visual regression for Day cards, A/B measurement, two-day segmentation, and mobile reset, and documented a separate GPX/GeoJSON evaluation'],
    },
  },
  {
    version: 'v1.32.0',
    date: '2026-07-10',
    items: {
      zh: ['完成 src/template、src/app、src/features、src/adapters 与 src/ui 分层，根目录 HTML 改为自动生成物并删除 45 个核心 fallback', '上线地图优先的路线工作台 UI、可收起海拔分析坞、桌面命令台、移动端底部操作栏与 bottom sheet', '将发布对齐测试升级为内嵌 runtime 行为校验，并接入 TypeScript 状态、Leaflet 与 IndexedDB 适配层'],
      en: ['Split source ownership across src/template, src/app, src/features, src/adapters, and src/ui; root HTML is now generated and 45 core fallbacks were removed', 'Introduced the map-first field console UI with a collapsible elevation dock, desktop command surface, mobile action bar, and bottom sheets', 'Replaced fallback-source alignment with embedded-runtime behavior checks and added TypeScript state, Leaflet, and IndexedDB adapters'],
    },
  },
  {
    version: 'v1.31.14',
    date: '2026-07-10',
    items: {
      zh: ['完成测距、分段、Day 预览和海拔标注渲染模型的核心模块化，HTML 只保留浏览器与 Leaflet/Canvas 适配职责', '统一工具栏、浮动面板、侧栏、Day 卡片与移动端响应式视觉，并修复无主轨迹空浮动卡遮挡按钮', '收口 Vite 静态构建、版本同步、完整测试与 GitHub Pages 自动部署流程'],
      en: ['Completed core modularization for measurement, itinerary segmentation, Day preview, and elevation annotation render models while keeping browser and Leaflet/Canvas effects at the HTML boundary', 'Unified toolbar, floating panels, sidebar, Day cards, and responsive styling, and fixed the empty primary mini card covering mobile toolbar controls', 'Closed the Vite static build, version synchronization, full validation, and GitHub Pages deployment pipeline'],
    },
  },
  {
    version: 'v1.31.13',
    date: '2026-07-05',
    items: {
      zh: [
        '🎯 行程页点击 Day 信息后，地图会自动复位到该日轨迹段，同时保留 A/B 高亮与海拔段显示',
      ],
      en: [
        '🎯 Clicking a Day entry in the itinerary now fits the map to that day segment while keeping A/B highlight and segment elevation view',
      ]
    }
  },
  {
    version: 'v1.31.12',
    date: '2026-07-05',
    items: {
      zh: [
        '📈 海拔图最高点/最低点恢复海拔数字标注，但仍保留红蓝颜色区分并取消左侧高低轴标',
        '📅 行程分段进入时自动复位视野，并从已有 day_meta / dayId 恢复分段点；无天数信息时默认起点与终点',
        '✂ 行程分段支持点击任意位置插入边界、拖动边界调整，并可在列表中指定删除某一天',
        '🐛 修复 Day 1 预览在没有显式 dayId 时误把整条轨迹当作第一天的问题，优先使用 day_meta 范围',
      ],
      en: [
        '📈 Elevation high/low points show elevation numbers again while keeping red/blue distinction and no left-side high/low axis labels',
        '📅 Segment mode now resets the viewport on entry and restores boundaries from day_meta/day IDs, defaulting to start/end when no day data exists',
        '✂ Segment mode can insert boundaries by clicking, drag boundaries to adjust them, and delete a specific day from the list',
        '🐛 Fixed Day 1 preview treating the entire trail as day one when no explicit day IDs exist, preferring day_meta ranges instead',
      ]
    }
  },
  {
    version: 'v1.31.11',
    date: '2026-07-04',
    items: {
      zh: [
        '🎨 天数模式按天分色改为更柔和且区分度更高的新色板，并同步到分段预览与行程导出',
        '📍 海拔图最高点/最低点改为仅用红蓝色点区分，取消数值文字与左侧高低海拔轴标',
        '📏 测距 A/B 海拔固定贴在端点左右，里程放在“测距路段 · A → B”右侧，移除“已测量”等状态文字',
        '⇄ 测距浮动面板新增“反向”按钮，可交换 A/B 并重新计算方向性的爬升/下降',
        '🐛 修复行程页点击 Day 1 可能高亮错误轨迹段：优先使用当前轨迹点 dayId，再回退 day_meta 索引',
      ],
      en: [
        '🎨 Day coloring now uses a softer, more distinguishable palette shared by day mode, segment preview, and itinerary export',
        '📍 Elevation high/low points are now color-only dots, with numeric labels and left-side high/low axis labels removed',
        '📏 Measure A/B elevations are pinned to the endpoint sides, distance sits next to “Measure segment · A → B”, and measured-status text is removed',
        '⇄ The measure floating panel now has a Reverse button that swaps A/B and recalculates directional ascent/descent',
        '🐛 Fixed itinerary Day 1 preview selecting the wrong segment by preferring current track day IDs before day_meta indexes',
      ]
    }
  },
  {
    version: 'v1.31.10',
    date: '2026-07-04',
    items: {
      zh: [
        '📈 测距信息不再堆成海拔图内的聚合框：A/B、最高点、最低点改为直接标注在海拔曲线对应位置',
        '📏 测距里程独立显示在海拔图左上，爬升/下降统一使用海拔图右上统计位，整体更像图表原生信息',
      ],
      en: [
        '📈 Measure details no longer use a bundled overlay box: A/B, high point, and low point are labeled directly on the elevation curve',
        '📏 Measure distance is shown separately in the chart header while ascent/descent reuse the chart stats area for a more native chart layout',
      ]
    }
  },
  {
    version: 'v1.31.9',
    date: '2026-07-04',
    items: {
      zh: [
        '📅 行程页每日卡片重排为更清晰的摘要卡，突出路线、距离、爬升、下降、高低海拔与扎营点',
        '🗺 天数模式入口从轨迹页移除，点击“行程”页时自动切换为按天分色，离开后回到此前的海拔/标注点模式',
        '📍 海拔模式作为默认显示时保留水源、补给、桥河、起终点等核心标注，避免默认可读性下降',
      ],
      en: [
        '📅 Daily itinerary cards are redesigned as clearer summary cards highlighting route, distance, ascent, descent, elevation range, and camp',
        '🗺 Days mode is removed from the Trails tab and now activates automatically when opening the Itinerary tab, then restores the previous elevation/waypoint mode when leaving',
        '📍 Elevation mode now keeps core waypoint types visible by default, including water, supply, bridge/river, start, and end markers',
      ]
    }
  },
  {
    version: 'v1.31.8',
    date: '2026-07-04',
    items: {
      zh: [
        '📏 测距浮动面板精简为“重新选点 / 退出”两个按钮，减少地图遮挡',
        '📈 测距提示与里程、爬升、下降、A/B 海拔、段内最高等信息移入海拔图内部显示',
        '📝 明确日程标注点逻辑：只使用主轨迹已吸附/落入当天范围的关键标注类型，不直接吸附其他轨迹点',
      ],
      en: [
        '📏 Measure floating panel is reduced to only Reset and Exit buttons to reduce map obstruction',
        '📈 Measure hints and stats now live inside the elevation chart: distance, ascent, descent, A/B elevation, and segment max elevation',
        '📝 Clarified itinerary waypoint logic: it uses key waypoint types attached to the primary trail/day range, not arbitrary points from other trails',
      ]
    }
  },
  {
    version: 'v1.31.7',
    date: '2026-07-04',
    items: {
      zh: [
        '🎛 顶部工具栏去掉外层浅色背景，移除“缓存”入口，并重排为两行五列按钮',
        '⚡ 测距与分段进入时自动切到标注点模式，避免海拔模式下多轨迹渐变分段带来的拖动卡顿',
        '📅 行程页每日卡片补充最低海拔，并支持点击每日信息栏高亮对应当天轨迹与海拔剖面',
        '🔎 地图 +/- 缩放按钮步进调大为 1 级，保留 0.5 级吸附以兼顾滚轮与触控板缩放',
        '📝 README 补充 Vite + TypeScript + 模块化工程化实施方案与发布仍输出静态 HTML 的迁移路线',
      ],
      en: [
        '🎛 The top toolbar no longer has an outer light background, removes the Cache entry, and uses a two-row five-column layout',
        '⚡ Measure and segment tools now switch to waypoint mode on entry, avoiding drag lag from multi-trail elevation-gradient rendering',
        '📅 Daily itinerary cards now include minimum elevation and can highlight that day’s map segment plus elevation profile when clicked',
        '🔎 Map +/- zoom buttons now step by 1 level while retaining 0.5 snapping for wheel and trackpad zooming',
        '📝 README now documents the Vite + TypeScript + modularization plan while keeping static HTML release output',
      ]
    }
  },
  {
    version: 'v1.31.6',
    date: '2026-07-04',
    items: {
      zh: [
        '🎛 顶部工具栏改为三行固定网格：帮助/复位，测距/分段/标注/下撤/反向，轨迹/导出/缓存/清空',
        '💾 顶部存储入口改名为“缓存”，按钮名称与当前功能表达保持一致',
        '📈 海拔图支持拖动并记忆位置，双击拖动手柄可恢复默认左下角，减少复位后遮挡轨迹的问题',
        '📏 测距浮动栏支持拖动并记忆位置，双击标题行恢复默认居中位置，避免遮挡当前测距路段',
      ],
      en: [
        '🎛 Top toolbar now uses a fixed three-row grid: help/reset, measure/segment/mark/escape/reverse, trail/export/cache/clear',
        '💾 The storage entry is renamed to “Cache” for a shorter, clearer toolbar label',
        '📈 Elevation chart is draggable with remembered position; double-click the drag grip to restore the default bottom-left placement',
        '📏 Measure panel is draggable with remembered position; double-click the title row to restore its default centered placement',
      ]
    }
  },
  {
    version: 'v1.31.5',
    date: '2026-07-04',
    items: {
      zh: [
        '🐛 修复测距模式选完 A/B 后点击复位只调整视野、不补画 A/B 黄色高亮段的问题',
        '⚡ 测距统计改为使用累计里程/爬升/下降与分块最高海拔缓存，避免拖动端点后遍历整段轨迹导致数秒延迟',
        '📏 A/B 端点拖动中实时更新测距线与面板数值，松手后只做最终确认与海拔图刷新',
        '🧲 A/B 拖动吸附优先搜索当前端点附近的轨迹索引窗口，密集轨迹点场景下再回退到网格查找',
      ],
      en: [
        '🐛 Fix reset in measure mode after selecting A/B: the viewport fit now also redraws the yellow highlighted A/B segment',
        '⚡ Measure stats now use cumulative distance/ascent/descent plus cached block max elevation, avoiding full segment scans that caused multi-second endpoint update delays',
        '📏 A/B endpoint dragging now live-updates the measured line and panel values; dragend only confirms and refreshes the elevation chart',
        '🧲 A/B drag snapping first searches a local index window around the current endpoint, then falls back to grid lookup for dense-track cases',
      ]
    }
  },
  {
    version: 'v1.31.4',
    date: '2026-07-04',
    items: {
      zh: [
        '🧭 主轨迹浮动小卡在侧栏收起动画结束后再次套用记忆位置，避免下一次收起时使用收起前的地图宽度计算位置',
        '📍 标注点图标统一按 tag 取标准图标，地图、行程页和筛选页不再受旧数据里历史 icon 影响',
        '🎛 顶部按钮重排为导航、分析、新增、数据四组，并为新增标注点与手动下撤入口预留固定位置',
        '➕ 新增顶部“标注”按钮：进入一次性点选模式，在主轨迹附近点击即可新增手动标注点',
      ],
      en: [
        '🧭 The primary mini card reapplies remembered position after the sidebar collapse transition, avoiding position math based on the pre-collapse map width',
        '📍 Waypoint icons now resolve from canonical tag icons so map markers, itinerary, and filter chips no longer depend on stale stored icons',
        '🎛 Top buttons are regrouped into navigation, analysis, creation, and data clusters with fixed slots for new waypoint and manual escape actions',
        '➕ Added a top “Mark” button for one-shot waypoint placement near the primary trail',
      ]
    }
  },
  {
    version: 'v1.31.3',
    date: '2026-07-04',
    items: {
      zh: [
        '⚡ 测距拖动结束后先即时刷新 A/B 点位，再用抽样高亮线和计算序号避免旧结果回写，降低长路段更新延迟',
        '🎛 顶部工具栏、测距面板和分段面板按钮重新分组排布，整体对齐更稳定',
        '🧭 侧栏收起后的主轨迹浮动卡片支持点击拖动并记忆位置，短点击仍展开侧栏',
        '🔄 从浏览器缓存恢复数据后采用延迟两阶段复位，打开 HTML 时更稳定地贴合主轨迹',
        '📍 地图标注点标签显示 D 天数，并在分段应用后刷新标注、行程和主轨迹小卡',
        '🧪 Codex 沙箱内静态验收不再启动 Chrome；真实浏览器测试只通过外部 full check 执行',
      ],
      en: [
        '⚡ Measure endpoint drag now updates A/B markers immediately, then uses sampled highlight paths plus compute sequence guards to avoid stale result writes and reduce long-section lag',
        '🎛 Top toolbar plus measure/segment panel buttons are regrouped and aligned for steadier layout',
        '🧭 The collapsed-sidebar primary mini card is now draggable with remembered position; short click still opens the sidebar',
        '🔄 Browser-cache restore now performs a delayed two-phase reset so opening the HTML more reliably fits the primary trail',
        '📍 Map waypoint labels show D-day badges and refresh waypoints, itinerary, and the primary mini card after applying segments',
        '🧪 Codex sandbox static checks no longer launch Chrome; real browser validation only runs through the external full check',
      ]
    }
  },
  {
    version: 'v1.31.2',
    date: '2026-07-04',
    items: {
      zh: [
        '⚡ 测距 A/B 与分段点拖动吸附改为 requestAnimationFrame 节流，每帧最多查一次最近主轨迹点，降低密集轨迹拖动卡顿',
        '🧭 测距与分段共用主轨迹拖动吸附调度器，dragend 会取消未执行帧，避免旧 marker 异步吸附干扰重绘',
      ],
      en: [
        '⚡ Measure A/B and segment point drag snapping now use requestAnimationFrame throttling, limiting nearest-primary-track lookup to once per frame and reducing lag on dense trails',
        '🧭 Measure and segment modes share the primary-track drag snap scheduler; dragend cancels pending frames to avoid stale marker snapping after redraw',
      ]
    }
  },
  {
    version: 'v1.31.1',
    date: '2026-07-03',
    items: {
      zh: [
        '📝 README 标题居中并加入小图标，优化双语文档结构与版本策略说明',
        '🔖 日常修复、文档和小交互优化优先走 PATCH 小版本，不再把每项改动都当成大版本',
        '📈 海拔图填充改为与黑色曲线共用同一路径，修复曲线和下方图形边缘不重合的问题',
        '📏 测距模式改为先点击 A/B 两点，后续通过拖动 A/B 端点调整位置，逻辑与日期规划模式保持一致',
      ],
      en: [
        '📝 Center README title, add small icons, and improve bilingual documentation structure plus versioning notes',
        '🔖 Daily fixes, docs, and small interaction changes now use PATCH releases instead of treating every change as a large version bump',
        '📈 Elevation fill now shares the exact same path as the black curve, fixing the mismatch between curve and area edge',
        '📏 Measure mode now selects A/B with the first two clicks, then adjusts endpoints by dragging A/B, matching the date-planning flow',
      ]
    }
  },
  {
    version: 'v1.31.0',
    date: '2026-07-02',
    items: {
      zh: [
        '🐛 修复"选完 AB → 复位 → 再选 B 慢"：measureReset 现在同步刷新海拔图回全轨模式，避免下次 measureCompute 的 refreshElevBar 与残留状态竞态',
        '⚡ 海拔图 predictStackDepth 用 for-loop 找 min/max/peakIdx/valleyIdx，替换 alts.map + Math.min(...spread) + indexOf，大轨迹上省几十 ms 且避免栈溢出',
        '✨ 从浏览器缓存恢复数据后自动执行一次复位（resetView），保证视野贴到主轨迹上',
        '🛠 sync_release.sh 默认以 template 为准（不再从 hiking_trail_assets/current 特化版拉，避免误覆盖新版本）',
      ],
      en: [
        '🐛 Fix "select AB → reset → re-select B slow": measureReset now syncs elevation bar back to full-trail mode, avoiding race with next measureCompute\'s refreshElevBar',
        '⚡ Elevation predictStackDepth uses for-loop for min/max/peakIdx/valleyIdx, replaces alts.map + Math.min(...spread) + indexOf; saves dozens of ms on long trails and avoids stack overflow',
        '✨ After restoring data from browser cache, auto-perform resetView so viewport snaps to primary trail',
        '🛠 sync_release.sh defaults to template (no longer pulls specialized HTML from hiking_trail_assets/current, avoids overwriting newer versions)',
      ]
    }
  },
  {
    version: 'v1.30.0',
    date: '2026-07-02',
    items: {
      zh: [
        '🎯 定位到轨迹上点击慢的真正真凶：不是 JS handler，而是浏览器渲染层的 SVG path 命中测试 —— 长轨迹的 SVG path 有几千段，每一次 mousemove/mousedown 都要 O(n) 段命中检测',
        '⚡ 测距/分段模式下给 map container 加 .measure-active 类，CSS 强制所有 SVG path 变为 pointer-events: none，浏览器完全跳过命中测试',
        '✂ 取消测距完成后的自动 fitBounds 复位（用户不希望测距时视图跳转）',
        '✂ 取消退出测距时的自动 resetView 复位',
      ],
      en: [
        '🎯 Pinpointed the real cause of on-trail click slowness: not JS handlers, but browser-level SVG path hit-testing — long trails have thousands of SVG path segments, each mousemove/mousedown triggers O(n) hit tests',
        '⚡ Measure/segment modes add .measure-active class to map container, CSS forces all SVG paths to pointer-events: none, browser completely skips hit-testing',
        '✂ Removed auto-fitBounds after measure A+B computed (user doesn\'t want view to jump during measurement)',
        '✂ Removed auto-resetView on measure exit',
      ]
    }
  },
  {
    version: 'v1.29.0',
    date: '2026-07-02',
    items: {
      zh: [
        '⚡ 修复轨迹上点击/悬停卡顿真凶：polyline.on("mousemove") 每秒触发几十次，每次都做 O(n) nearestTrackIdx + showTooltip 渲染，长轨迹上会积压主线程数百 ms 到几秒',
        '⚡ mousemove 用 requestAnimationFrame 节流，每帧最多处理一次；测距/分段模式下完全禁用轨迹 hover tooltip',
        '📊 用户反馈：鼠标在轨迹上时慢、在轨迹旁快 —— 精准定位到这个瓶颈',
      ],
      en: [
        '⚡ Fixed the real cause of trail hover/click lag: polyline.on("mousemove") fires dozens of times per second, each doing O(n) nearestTrackIdx + showTooltip render, backlogs main thread by hundreds of ms to seconds on long trails',
        '⚡ Throttle mousemove via requestAnimationFrame (once per frame max); disable trail hover tooltip entirely in measure/segment modes',
        '📊 User feedback: mouse on trail = slow, mouse near trail = fast — precisely pointed to this bottleneck',
      ]
    }
  },
  {
    version: 'v1.28.0',
    date: '2026-07-02',
    items: {
      zh: [
        '⚡ 测距/分段：点击瞬间立刻画临时 marker（<16ms 视觉反馈），nearestTrackIdx 搜索+吸附延迟到下一帧，感知延迟由几百 ms 降为「点即出」',
        '🔍 加入性能诊断日志：控制台运行 `window.PERF_DEBUG = true` 即可看到每步耗时（nearestTrackIdx、marker addTo、hint、measureCompute…）帮助定位剩余瓶颈',
      ],
      en: [
        '⚡ Measure/segment: click immediately draws a temporary marker (<16ms visual feedback), nearestTrackIdx search + snap deferred to next frame; perceived latency drops from hundreds of ms to "click = marker"',
        '🔍 Perf diagnostic logs: run `window.PERF_DEBUG = true` in console to see per-step timings (nearestTrackIdx, marker addTo, hint, measureCompute…) for pinpointing remaining bottlenecks',
      ]
    }
  },
  {
    version: 'v1.27.0',
    date: '2026-07-02',
    items: {
      zh: [
        '⚡ 测距点击生成 A/B 大幅提速：measureMarker 从 circleMarker+permanent tooltip 改为轻量 divIcon marker，减少 DOM 层级和 layout 触发',
        '⚡ 主轨迹 lat/lng 缓存为 Float64Array，加速 nearestTrackIdxOnPrimary 的 O(n) 搜索（对大轨迹提速 3-5 倍）',
        '⚡ 放宽 fast-tap 阈值：位移 6→10 px、时间 400→800 ms，覆盖 trackpad 慢速点击',
        '⚡ 关闭 Leaflet 的 L.Tap 处理（tap: false），消除触屏 tap 延迟',
        '✨ 测距选中 A+B 后自动 fitBounds 到测距段（padding 60px），无需手动点复位',
        '✨ 退出测距模式（✕ 退出按钮或再次点 📏）后自动复位到主轨迹全景',
        '✨ 分段应用后同步刷新侧栏「行程」tab：不仅写入导出用的 day_meta 和 track dayId，行程 tab 立刻显示每天卡片',
        '✨ 分段应用时自动给主轨迹 waypoints 打上 day 字段，行程 tab 精确按每天分组显示 waypoints',
        '✨ 行程 tab 每日展开区固定显示关键类型（营地/垭口/水源/补给/桥/河/村庄/避难/警告/岔路/起终点），不受 filter 影响',
        '🐛 修复 buildDaysTab 在 day_meta 为 undefined 时崩溃',
      ],
      en: [
        '⚡ Measure click A/B generation greatly sped up: measureMarker from circleMarker+permanent tooltip to lightweight divIcon marker, reducing DOM layers and layout triggers',
        '⚡ Primary trail lat/lng cached as Float64Array, accelerates nearestTrackIdxOnPrimary O(n) search (3-5x speedup for large trails)',
        '⚡ Relaxed fast-tap thresholds: movement 6→10 px, time 400→800 ms, covers trackpad slow clicks',
        '⚡ Disabled Leaflet\'s L.Tap handler (tap: false), removes touch tap delay',
        '✨ After selecting A+B in measure mode, auto-fitBounds to the measured segment (60px padding), no manual reset needed',
        '✨ Exiting measure mode (✕ Exit or re-clicking 📏) auto-resets view to full primary trail',
        '✨ Applying segments syncs to sidebar Itinerary tab: not only writes day_meta and track dayId, but daily cards immediately show',
        '✨ Segment apply automatically tags primary trail waypoints with day field, itinerary tab precisely groups waypoints by day',
        '✨ Itinerary tab daily expansions fixed-show key types (camp/pass/water/supply/bridge/river/village/shelter/warn/fork/start/end), unaffected by filter',
        '🐛 Fix buildDaysTab crash when day_meta is undefined',
      ]
    }
  },
  {
    version: 'v1.26.0',
    date: '2026-07-02',
    items: {
      zh: [
        '⚡ 测距/分段选点极速响应：改用原生 pointerdown/pointerup（<400ms & <6px 位移视为 tap），绕过 Leaflet click 内部延迟；click 事件保留为兼容 fallback',
        '✨ 分段应用后同步刷新侧栏「行程」tab：不仅写入导出用的 day_meta 和 track dayId，行程 tab 立刻显示每天卡片（D1/D2/…、里程、爬升、最高、营地）',
        '✨ 分段生成 seg 描述字段（起点海拔 → 顶 → 终点海拔（km）），行程 tab 顶部一行即可看清一天全貌',
        '🐛 修复 buildDaysTab 在 day_meta 为 undefined 时崩溃：改为显示"尚未设置每日行程"占位',
        '🐛 修复 buildDaysTab 里 dm.seg 为空时显示 undefined：改为 fallback 到 km/asc/desc/max 组合',
      ],
      en: [
        '⚡ Measure/segment click response near-instant: uses native pointerdown/pointerup (<400ms & <6px movement = tap), bypasses Leaflet click internal delay; click event kept as fallback',
        '✨ Applying segments now also refreshes sidebar "Itinerary" tab: not only writes day_meta and track dayId for export, but the tab immediately shows daily cards (D1/D2/…, distance, ascent, max, camp)',
        '✨ Segment generates seg description field (start elev → peak → end elev (km)), itinerary tab shows the day\'s summary at a glance',
        '🐛 Fix buildDaysTab crash when day_meta is undefined: shows "no daily itinerary set" placeholder',
        '🐛 Fix buildDaysTab showing "undefined" when dm.seg is empty: falls back to km/asc/desc/max combo',
      ]
    }
  },
  {
    version: 'v1.25.0',
    date: '2026-07-01',
    items: {
      zh: [
        '⚡ 测距选点响应大幅提速：doubleClickZoom 关闭 → 消除 Leaflet 内部 ~200ms click 延迟',
        '⚡ 测距计算异步化：点击立即绘制高亮段+marker，dist/asc/desc/max 挪到下一帧计算，海拔图再下一帧',
        '⚡ 优化数组遍历：避免 slice + spread（大数组慢/爆栈），用 for 循环 + 预分配 typed array',
        '🎨 测距结果面板移除"方向"字段（永远 A→B，无需显示）',
        '🎨 测距结果面板移除「⇄ 交换 A/B」按钮（方向不重要，简化 UI）',
        '🎨 「⛰ 段内最高」从跨列独占一行改为与其他 5 项等宽两列布局，更紧凑',
      ],
      en: [
        '⚡ Measure click response greatly sped up: doubleClickZoom disabled → removes Leaflet\'s internal ~200ms click delay',
        '⚡ Measure computation async: click immediately draws segment+markers, dist/asc/desc/max moved to next frame, elev chart to the frame after',
        '⚡ Array traversal optimized: avoid slice + spread (slow/stack overflow on big arrays), use for-loops + pre-allocated arrays',
        '🎨 Measure panel removed "Direction" field (always A→B, no need to show)',
        '🎨 Measure panel removed "⇄ Swap A/B" button (direction irrelevant, simplify UI)',
        '🎨 "⛰ Max in segment" no longer spans two columns, joins the two-column grid layout',
      ]
    }
  },
  {
    version: 'v1.24.0',
    date: '2026-07-01',
    items: {
      zh: [
        '✨ 分段模式：分段点可以直接拖拽调整每天边界（吸附到主轨迹 + 保持天数顺序 + 相邻点冲突检测）',
        '✨ 分段面板：营地名和营地海拔拆成两栏，各有独立标签，输入更清晰',
        '✨ 测距模式：结果面板新增「⛰ 段内最高海拔」',
        '✨ 测距模式下点击 🎯 复位 → 以选中段（A→B）为中心 fitBounds，方便快速对齐视野',
      ],
      en: [
        '✨ Segment mode: drag segment markers directly to adjust day boundaries (snaps to primary trail + preserves order + neighbor conflict check)',
        '✨ Segment panel: camp name and camp elevation split into two separate rows with labels for clarity',
        '✨ Measure mode: result panel now shows "⛰ Max elevation in segment"',
        '✨ In measure mode, clicking 🎯 Reset fits the map to the selected segment (A→B), for quick visual alignment',
      ]
    }
  },
  {
    version: 'v1.23.0',
    date: '2026-07-01',
    items: {
      zh: [
        '✨ 新增 📅 分段模式：在主轨迹上依次点选每天的起止点，自动计算每天里程/爬升/下降/最高海拔，支持手填营地名和海拔',
        '✨ 分段应用后自动写入 main.day_meta 和 track dayId，导出行程 MD 会用手工分段的数据',
        '✨ 分段模式再次进入时自动从已有 day_meta 恢复分段点',
        '🎨 标注点图标更新：补给 🛒 → 🏪（小卖部）、河流 ≋ → 🏞（山水），"观景"分类移除，未识别标签统一归入"其他 📍"',
        '🐛 分段模式下点击主轨迹不再切换主轨迹',
      ],
      en: [
        '✨ New 📅 Segment mode: sequentially click points on the primary trail to mark each day; auto-computes daily distance/ascent/descent/max elevation, with manual camp name + elevation input',
        '✨ Applying segments writes to main.day_meta and track dayId, exported itinerary MD uses the manual segmentation',
        '✨ Re-entering segment mode restores segment points from existing day_meta',
        '🎨 Waypoint icon updates: Supply 🛒 → 🏪 (mini-mart), River ≋ → 🏞 (landscape); "View" category removed, unrecognized tags fall back to "Other 📍"',
        '🐛 Clicking primary trail in segment mode no longer switches primary',
      ]
    }
  },
  {
    version: 'v1.22.0',
    date: '2026-07-01',
    items: {
      zh: [
        '✨ 地图缩放粒度更细：zoomSnap=0.25（对齐到 0.25 级）+ zoomDelta=0.5（按钮/键盘每次 0.5 级）+ wheelPxPerZoomLevel=120（滚轮更平滑）',
        '✨ 导入 KML/ZIP 完成后自动执行完整复位（fitBounds 到主轨迹），无需手动点复位按钮',
        '✨ 切换分组时自动执行完整复位，视野立即对齐到新组主轨迹',
        '♻️ 抽出 resetView() 函数供复位按钮 / 导入 / 切换分组共用，行为一致（含主轨迹兜底 + 全量重绘 + fitBounds）',
      ],
      en: [
        '✨ Finer-grained map zoom: zoomSnap=0.25 (snap to 0.25 level) + zoomDelta=0.5 (button/keyboard step) + wheelPxPerZoomLevel=120 (smoother wheel)',
        '✨ After importing KML/ZIP, auto-execute full reset (fitBounds to primary trail), no manual reset button click needed',
        '✨ Auto-reset on group switch, view immediately aligns to the new group\'s primary trail',
        '♻️ Extracted resetView() shared by reset button / import / group switch, consistent behavior (primary trail fallback + full redraw + fitBounds)',
      ]
    }
  },
  {
    version: 'v1.21.0',
    date: '2026-07-01',
    items: {
      zh: [
        '✨ 主轨迹保留在轨迹列表中不再被剔除，用金色左边框和 ★ 徽章标识（之前主轨迹会"消失"到顶部卡片里，用户找不到）',
        '✨ 主轨迹卡片"设为主轨迹"按钮替换为 "★ 主轨迹" 只读标识（避免让用户点自己设自己）',
        '✨ 每个分组独立记忆主轨迹：state.primaryByGroup[groupName]。A 组切主轨迹不会污染 B 组，切回来还能记住',
        '🔧 state.primaryTrailId 现在是 getter/setter，桥接到 primaryByGroup[activeGroup]。所有旧代码无感升级',
        '🔧 场景全覆盖：分组切换 / 拖动分组 / 批量移动 / 删除轨迹 / IndexedDB 恢复都会正确清理其他组的记忆值',
        '🔧 兼容旧数据：老 IndexedDB 里的单值 primaryTrailId 会自动迁移到 primaryByGroup 里',
        '🧪 E2E 新增 E16 场景（13 项断言）验证跨分组独立主轨迹的完整生命周期；总 62/62 全过',
      ],
      en: [
        '✨ Primary trail no longer removed from the trail list, marked with gold left border and ★ badge instead (previously the primary trail "disappeared" into the top card and users couldn\'t find it)',
        '✨ "Set as Main" button on the primary card replaced with read-only "★ Main" label (prevents users from clicking to set themselves as primary)',
        '✨ Each group independently remembers its primary trail: state.primaryByGroup[groupName]. Switching primary in group A no longer pollutes group B; switching back preserves memory',
        '🔧 state.primaryTrailId is now a getter/setter bridging to primaryByGroup[activeGroup]. All legacy code upgraded transparently',
        '🔧 Full scenario coverage: group switch / group dropdown / batch move / trail delete / IndexedDB restore all correctly clean up other groups\' memory values',
        '🔧 Backward compatible: legacy single-value primaryTrailId in old IndexedDB auto-migrates into primaryByGroup',
        '🧪 New E16 scenario (13 assertions) verifies full cross-group independent primary lifecycle; total 62/62 pass',
      ]
    }
  },
  {
    version: 'v1.20.0',
    date: '2026-07-01',
    items: {
      zh: [
        '✨ 支持"无选中分组"状态：再次点击已激活的分组 tab 可取消选中，此时主轨迹、叠加轨迹、海拔剖面全部隐藏，只保留分组 tab bar 和轨迹卡片列表',
        '✨ 分组切换回具体组时，primaryTrailId 自动挑选该组内第一条轨迹',
        '✨ 空态文案精准区分"无轨迹"和"未选中分组"两种情况（i18n 新增 pc.emptyGroup / trail.emptyNoGroup 键）',
        '🔧 activeGroup=null 状态持久化到 IndexedDB（用 in 运算符判定字段存在性，兼容旧数据）',
        '🔧 rebuildAll 兜底优化：activeGroup=null 时保持 primaryTrailId=null；有 activeGroup 但主轨迹丢失时先在组内挑，找不到再跨组回退',
        '🧪 大改动测试流程首次实战：E15 新场景（9 项断言）覆盖 activeGroup=null 全链路 UI + 持久化，与既有 39 项一起 49/49 全过',
      ],
      en: [
        '✨ Support "no group selected" state: click the active group tab again to deselect. Primary trail, overlay tracks, elevation profile all hidden; only group tab bar and trail card list remain',
        '✨ When switching back to a specific group, primaryTrailId auto-selects the first trail in that group',
        '✨ Empty-state text precisely distinguishes "no trails" from "no group selected" (new i18n keys pc.emptyGroup / trail.emptyNoGroup)',
        '🔧 activeGroup=null state persists to IndexedDB (uses `in` operator for field-existence check, backward compatible)',
        '🔧 rebuildAll fallback improved: keep primaryTrailId=null when activeGroup=null; when activeGroup exists but primary is lost, first pick within group, then fall back cross-group',
        '🧪 First-time real-world use of the big-change testing workflow: new E15 scenario (9 assertions) covering full activeGroup=null UI + persistence chain, 49/49 total pass with the existing 39',
      ]
    }
  },
  {
    version: 'v1.19.0',
    date: '2026-07-01',
    items: {
      zh: [
        '📝 JSDoc 类型注解全覆盖：新增 10 个 @typedef（TrackPoint / TrackTuple / Waypoint / DayMeta / TrailStats / EscapeRoute / Trail / ElevLayout / ElevAnnotation / ImportedFile），15+ 顶层函数带 @param / @returns（haversine / accumulatorAscent / smoothElev / parseKml / enrichWaypoints / parseAndProcessKml / drawElevBar / handleFiles / applyChange / trailContentHash 等）',
        '🧪 单元测试首次落地（tests/unit/）：抽出 trail_core.js 纯函数镜像 + test_math.js（30 断言）+ test_enrich.js（12 断言）+ verify_alignment.js（13 项 HTML↔trail_core 对齐校准）',
        '🧪 端到端测试首次落地（tests/e2e/run_all.py）：14 大场景 39 项断言，覆盖启动、KML/ZIP 导入、去重、切主轨迹、批量分组、反转、删除、waypoint 过滤、分天切换、IndexedDB、i18n、导出、file:// 错误检测',
        '🛠 一键测试流程 tests/run_full_check.sh：6 阶段流水线（语法→单元→静态→功能→e2e→sync），大改动必跑，失败即停',
        '📚 文档三件套：docs/TESTING.md（测试指南）+ docs/CONTRIBUTING.md（贡献指引，含类型注解风格/命名/大改动流程）+ ARCHITECTURE.md 补齐 v1.17-1.19 拆分架构与 applyChange 约定，全部 zh + en 双语',
        '🎯 无功能变化，纯工程化基建；6/6 阶段测试全过（Phase1 语法 · Phase2 单元 55/55 · Phase3 静态 54/54 · Phase4 功能 55/55 · Phase5 e2e 39/39 · Phase6 sync）',
      ],
      en: [
        '📝 Full JSDoc type coverage: 10 new @typedefs (TrackPoint / TrackTuple / Waypoint / DayMeta / TrailStats / EscapeRoute / Trail / ElevLayout / ElevAnnotation / ImportedFile), 15+ top-level functions with @param / @returns (haversine / accumulatorAscent / smoothElev / parseKml / enrichWaypoints / parseAndProcessKml / drawElevBar / handleFiles / applyChange / trailContentHash etc.)',
        '🧪 Unit tests first-time landing (tests/unit/): extracted trail_core.js pure-function mirror + test_math.js (30 assertions) + test_enrich.js (12) + verify_alignment.js (13 HTML↔trail_core alignment checks)',
        '🧪 End-to-end tests first-time landing (tests/e2e/run_all.py): 14 scenarios × 39 assertions covering startup, KML/ZIP import, dedup, switch primary trail, batch grouping, reverse, delete, waypoint filter, day switch, IndexedDB, i18n, export, file:// error detection',
        '🛠 One-command test flow tests/run_full_check.sh: 6-phase pipeline (syntax→unit→static→functional→e2e→sync), required for big changes, fail-fast',
        '📚 Documentation triple: docs/TESTING.md (testing guide) + docs/CONTRIBUTING.md (contribution guide with type annotation style / naming / big-change workflow) + ARCHITECTURE.md updated with v1.17-1.19 split architecture and applyChange convention, all zh + en bilingual',
        '🎯 No behavior change, pure engineering infrastructure; all 6 phases pass (Phase1 syntax · Phase2 unit 55/55 · Phase3 static 54/54 · Phase4 functional 55/55 · Phase5 e2e 39/39 · Phase6 sync)',
      ]
    }
  },
  {
    version: 'v1.18.0',
    date: '2026-07-01',
    items: {
      zh: [
        '♻️ handleFiles 大瘦身：166 行 → 17 行，拆出 6 个辅助函数（expandZipFiles / importSingleKml / findDuplicateTrail / ensureUniqueTrailId / renderKmlImportRow / bindKmlImportRowEvents / postImportFinalize）',
        '♻️ parseAndProcessKml 拆分：174 行 → 36 行，抽出 computeCumulativeDistance / buildDayMeta / computeTrailStats / generateNextTrailId 四个纯函数',
        '♻️ drawElevBar 深度重构：363 行 → 24 行，Canvas 绘制逻辑拆成 9 个语义子函数（computeElevLayout / drawElevBackground / drawElevGridLines / drawElevFill / drawElevCurve / collectElevAnnotations / layoutElevLabels / renderElevLabels / drawElevAxes / updateElevBadges）；elevRatioColor 提升为独立顶层函数便于测试',
        '🎯 v1.17.0-v1.18.0 累计：3 个 300+ 行大函数合计 703 行 → 77 行（编排层），共抽出 30 个语义清晰的辅助函数',
        '🎯 无功能变化，纯代码质量重构；54 项静态验收 + 30 项功能测试全通过',
      ],
      en: [
        '♻️ handleFiles slimmed down: 166 lines → 17 lines, extracted 6 helpers (expandZipFiles / importSingleKml / findDuplicateTrail / ensureUniqueTrailId / renderKmlImportRow / bindKmlImportRowEvents / postImportFinalize)',
        '♻️ parseAndProcessKml split: 174 lines → 36 lines, extracted 4 pure functions (computeCumulativeDistance / buildDayMeta / computeTrailStats / generateNextTrailId)',
        '♻️ drawElevBar deep refactor: 363 lines → 24 lines, Canvas rendering split into 9 semantic sub-functions (computeElevLayout / drawElevBackground / drawElevGridLines / drawElevFill / drawElevCurve / collectElevAnnotations / layoutElevLabels / renderElevLabels / drawElevAxes / updateElevBadges); elevRatioColor promoted to top-level for testability',
        '🎯 v1.17.0-v1.18.0 combined: three 300+ line functions totaling 703 lines → 77 lines (orchestration layer), 30 semantically-named helpers extracted total',
        '🎯 No behavior changes, pure code-quality refactor; 54 static checks + 30 functional tests all pass',
      ]
    }
  },
  {
    version: 'v1.17.0',
    date: '2026-07-01',
    items: {
      zh: [
        '♻️ buildTrailList 大瘦身：从 372 行 → 25 行（编排层），逻辑拆分为 15 个语义清晰的辅助函数（renderGroupTabs / renderBatchToolbar / renderTrailCard / trailCardHeaderHtml / trailCardExpandedHtml / handleTrailCardClick / handleTrailDetailClick / handleTrailGroupChange / moveBatchToGroup / isDetailButtonTarget 等）',
        '♻️ 引入 state 变更 helpers：toggleSetItem / applyChange / toggleTrailActive / toggleTrailExpanded / toggleTrailBatch，统一"读-改-刷新-持久化"流程，消除 20+ 处重复的 rebuildAll+saveToStorage 模式',
        '📝 waypointModeTags 字段加详细注释：澄清它与 modeVisibleTags 的关系（两套独立 Set，各自服务不同场景），避免后续重构再次踩 v1.13.4 的 bug',
        '🎯 无功能变化，纯代码质量重构；54 项静态验收 + 14 项功能测试全通过',
      ],
      en: [
        '♻️ buildTrailList slimmed down: 372 lines → 25 lines (orchestration only), logic split into 15 semantically-named helpers (renderGroupTabs / renderBatchToolbar / renderTrailCard / trailCardHeaderHtml / trailCardExpandedHtml / handleTrailCardClick / handleTrailDetailClick / handleTrailGroupChange / moveBatchToGroup / isDetailButtonTarget etc.)',
        '♻️ Introduced state mutation helpers: toggleSetItem / applyChange / toggleTrailActive / toggleTrailExpanded / toggleTrailBatch — unified the "read-mutate-refresh-persist" flow and eliminated 20+ occurrences of duplicated rebuildAll+saveToStorage patterns',
        '📝 waypointModeTags now has a detailed comment explaining its relationship with modeVisibleTags (two independent Sets serving different scenarios), preventing future refactors from repeating the v1.13.4 regression',
        '🎯 No behavior changes, pure code-quality refactor; 54 static checks + 14 functional tests all pass',
      ]
    }
  },
  {
    version: 'v1.16.0',
    date: '2026-07-01',
    items: {
      zh: [
        '✨ 复选框合并：v1.15.0 的批量勾选框（trail-batch-check）合并回原有的 trail-checkbox（专职批量选中）；展开/收起改用独立的 ▸/▾ 箭头。三个动作三个入口，各司其职',
        '♻️ 代码清理：清理 15 处历史版本注释（v1.10–v1.13 stamp），保留最近 3 版；批量工具栏与分组 tab 的内联样式抽离为 CSS 类（.batch-toolbar / .group-tab-bar），buildTrailList 少 7 行且噪音大幅减少',
        '📝 README 重写：去除装饰性 emoji / shields 徽章 / 居中 block / 鸡汤结尾，改为 Leaflet / fflate 风格的正式项目 README（中英双语同步）',
      ],
      en: [
        '✨ Checkbox unified: the v1.15.0 batch checkbox (trail-batch-check) is merged back into trail-checkbox (batch-select only); expand/collapse now uses a dedicated ▸/▾ arrow. Three actions, three entry points',
        '♻️ Code cleanup: removed 15 stale version stamps (v1.10–v1.13), kept the last 3 versions; batch toolbar and group tab inline styles extracted to CSS classes (.batch-toolbar / .group-tab-bar), buildTrailList is 7 lines shorter with much less noise',
        '📝 README rewrite: removed decorative emoji / shields badges / centered blocks / sentimental sign-off; adopted the plain, official style of Leaflet / fflate READMEs (both zh and en)',
      ]
    }
  },
  {
    version: 'v1.15.0',
    date: '2026-07-01',
    items: {
      zh: [
        '✨ 分组交互重构：去掉「☐ 批量分组」入口/退出按钮；每张轨迹卡片左侧常驻小勾选框，勾选任意条目即自动出现「已选 X · 全选 · 反选 · 移到… · 清除」浮条，操作完自动隐藏',
        '✨ KML.zip 导入：文件选择器与拖拽支持 .zip / .kml.zip 压缩包，自动展开包内所有 .kml 递归处理（跳过 __MACOSX 与隐藏文件），与「打包 KML ZIP」导出格式对应',
        '🔧 移除 state.batchMode，改为由 batchSelected.size 单一驱动 UI 出现/隐藏，减少一处状态双源',
      ],
      en: [
        '✨ Grouping UX rebuild: removed the "☐ Batch group" enter/exit toggle. Each trail card now has a persistent mini-checkbox on the left; selecting any trail auto-reveals the "N selected · Select all · Invert · Move to… · Clear" bar, which auto-hides when selection is cleared',
        '✨ KML.zip import: file picker and drag-drop now accept .zip / .kml.zip archives, auto-extract all inner .kml files (skips __MACOSX and hidden files). Matches the "Pack KML ZIP" export format',
        '🔧 Removed state.batchMode; UI visibility now driven solely by batchSelected.size, eliminating one dual-source state',
      ]
    }
  },
  {
    version: 'v1.14.1',
    date: '2026-07-01',
    items: {
      zh: [
        '✨ 批量分组：sidebar 顶部新增「☐ 批量分组」入口，进入后点击卡片切换选中态，支持全选/反选，一次性把选中的轨迹移到其他组或新建组',
        '✨ 导出改为点击式菜单：📤 导出按钮点击后在其下方悬浮出选项卡（打包 KML ZIP / 行程 Markdown），无需 confirm 阻塞对话框',
      ],
      en: [
        '✨ Batch group: sidebar top now has a "☐ Batch group" toggle; click cards to select, supports select-all/invert, then move all selected trails to another group (or new group) in one action',
        '✨ Export menu: click 📤 Export to open a floating menu (Pack KML ZIP / Itinerary Markdown) below the button, replacing the blocking confirm dialog',
      ]
    }
  },
  {
    version: 'v1.14.0',
    date: '2026-07-01',
    items: {
      zh: [
        '✨ 轨迹分组：trail 增加 group 字段，sidebar 顶部 Tab bar 切换分组；只有当前组的轨迹参与地图渲染/海拔图/行程统计/图例等一切前端功能',
        '✨ 移至组：展开轨迹详情后可通过下拉菜单将轨迹移入已有组或新建组',
        '✨ 批量导出 KML ZIP：📤 导出打包当前组叠加中的轨迹为 ZIP（每条独立 KML + 合并版 + README），支持在其他设备一键拖拽导入',
        '🔧 activeGroup 与 trails 一起持久化到 IndexedDB',
      ],
      en: [
        '✨ Trail grouping: trails now have a group field; tab bar at top of sidebar switches active group',
        '✨ Move to group: expand trail details to reassign via dropdown',
        '✨ Batch KML ZIP export: 📤 Export packs all active-group overlaid trails into a ZIP with per-trail KMLs, merged KML, and README',
        '🔧 activeGroup persisted to IndexedDB alongside trails',
      ]
    }
  },
  {
    version: 'v1.13.3',
    date: '2026-06-12',
    items: {
      zh: [
        '🐛 浏览器整体放大后无法缩小：leaflet 的 wheel 拦截了 ctrl/meta+wheel 缩放手势 → 在 capture 阶段 stopImmediatePropagation 让浏览器接管',
        '🐛 海拔图点击反向定位：hit-test 用的 PL/PR 与绘制不一致（38/8 vs 44/16），且按 idx 等距映射但绘制按 km，定位偏离 → 改用与 drawElevBar 相同的 PL/PR + 二分按 km 找 idx',
        '🎨 海拔图标注布局重写为「右上为主 + 引线」：右上→左上→右下→左下→外推；从 label 边到对应黑点画一条 0.6px 半透明引线，对应关系一目了然，不再有"高度对不上"的视觉错位',
        '📦 elev-bar 高度公式：baseH 100→110，stackDepth+1 预留一层，max 320→340',
        '🎨 measure-tip（点击海拔图后地图上的浮标）改为深底浅字（#1d2630/#f4e8c8）+ 苔绿描边 + 6px 加粗，从浅色地图背景中跳出来',
        '🎨 版本号浮层套上 leaflet-control-attribution 类，与 Leaflet \\| © Esri 完全相同的 background/font-size/padding/line-height',
      ],
      en: [
        '🐛 Browser pinch zoom stuck after zoom-in: leaflet swallowed ctrl/meta+wheel; capture-phase stopImmediatePropagation now lets browser zoom',
        '🐛 Elev chart click-locate offset: hit-test PL/PR differed from draw (38/8 vs 44/16) and used idx-linear mapping while draw uses km — fixed both',
        '🎨 Elev label layout: top-right priority + leader lines from label edge to anchor dot, eliminating the "height mismatch" illusion',
        '📦 elev-bar height: baseH 100→110, +1 reserved stack layer, max 320→340',
        '🎨 measure-tip styled dark-on-cream with 6px padding, pops out of the map',
        '🎨 Version tag inherits leaflet-control-attribution style fully',
      ]
    }
  },
  {
    version: 'v1.13.2',
    date: '2026-06-12',
    items: {
      zh: [
        '🎨 版本号浮层套上 leaflet-control-attribution 类，自动继承相同 background/font-size/padding/line-height，与 Leaflet \\| © Esri 同款样式 + 同高度',
        '🎯 海拔图标注紧贴对应点：之前是垂直方位（上方）+ 互相往上推，远离了 anchor。改成水平贴点（label 中线 = 点 Y），右伸→左伸→微上下偏移→更大偏移。最后效果：营地名"挂在"点旁边，绝对紧挨',
      ],
      en: [
        '🎨 Version tag now uses leaflet-control-attribution class — same style & height as Leaflet \\| © Esri',
        '🎯 Elev labels hug their anchor: horizontal-first layout (label center = point Y), right→left→tiny up/down→larger offsets. Camp names now sit right next to their points',
      ]
    }
  },
  {
    version: 'v1.13.1',
    date: '2026-06-12',
    items: {
      zh: [
        '🎯 海拔图标注布局重写：不再"先固定右上 + 互相上推"造成的位置偏移；改为按优先级（最高>营地>最低）逐个放置，每个标注尝试 4 方位 × 多层候选（右上→左上→右下→左下），紧贴 anchor 点最近的有效位置；反向后 wp.gps_idx 重映射后位置同样紧贴',
        '🎨 版本号改为独立浮层（独立背景框）：不再合并到 Leaflet attribution prefix；用绝对定位 + getBoundingClientRect 实时计算位置，紧贴 attribution 左侧 8px',
      ],
      en: [
        '🎯 Elev label layout rewritten: priority-based placement with 4-direction × multi-layer candidates, hugging the anchor point closely; reverse-correct',
        '🎨 Version tag now an independent floating box, not in attribution prefix; positioned via getBoundingClientRect, 8px to the left of attribution',
      ]
    }
  },
  {
    version: 'v1.13.0',
    date: '2026-06-12',
    items: {
      zh: [
        '🎯 海拔图高度自适应彻底修复：用「扫描线预测算法」算出 X 方向标签最大重叠数（即堆叠层数），与画布高度完全解耦，一次设定不再抖动；反向后 wp.gps_idx 已重映射，预测同步正确',
        '🎯 高度公式：H = max(140, min(320, 100 + stackDepth × (字高+2) + 20))；标签水平不重叠时停在 140，越多营地堆叠越精确加高',
        '🎨 版本号与 Leaflet attribution 间距再加大：&nbsp;×4 + |&nbsp;×2',
        '📦 发布 v1.13.0 — 阶段性稳定版本',
      ],
      en: [
        '🎯 Elev chart height fully fixed: scan-line algorithm predicts max horizontal label overlap (stack depth), decoupled from canvas height. No more oscillation. Reverse-correct.',
        '🎯 Formula: H = max(140, min(320, 100 + stackDepth × (lh+2) + 20))',
        '🎨 More spacing between version tag and Leaflet attribution',
        '📦 Released v1.13.0 — stable milestone',
      ]
    }
  },
  {
    version: 'v1.12.6',
    date: '2026-06-12',
    items: {
      zh: [
        '🐛 i18n 漏覆盖修复：海拔图营地默认名、主轨迹卡所有字段（距离/天数/累计爬升/累计下降/最高点/最低点/⬇KML/🔗来源/✎链接/★主轨迹眉头）现在都走 i18n',
        '🎨 主轨迹小卡 m峰 → m（去掉「峰」）',
        '🐛 海拔图高度仍不准 → 改用「两遍同步策略」：第 1 遍设 140 试画，记录顶部 overflow；第 2 遍按 overflow + 6px margin 加高重绘。无 RAF、无抖动、反向后也对',
        '✏️ 显示模式说明改用更精准的措辞：天数=主轨迹分色 / 海拔=已叠加蓝→红主轨迹凸显 / 标注点=主轨迹按海拔渐变其他仅显示所选标注',
        '🗑 移除主轨迹卡（侧栏未缩放状态）的 ⇄ 反向按钮（功能 toolbar 已有）',
        '🐛 +添加 按钮位置错乱：删除旧的 #add-trail-btn 绝对定位样式（top:244px right:14px），完全交给 .tb-btn 接管',
        '🐛 toolbar 快速连点触发地图双击放大：用 L.DomEvent.disableClickPropagation 阻止冒泡 + 每个按钮单独阻止 dblclick',
        '🎨 版本号与 Leaflet attribution 之间增加 &nbsp;&nbsp; 间距',
      ],
      en: [
        '🐛 i18n gaps fixed: elev camp default name, all primary card fields, mini "m peak" → "m"',
        '🐛 Elev chart height inaccurate → 2-pass sync strategy (no RAF, no jitter, reversed-correct)',
        '✏️ Mode descriptions reworded',
        '🗑 Removed reverse button from sidebar primary card (toolbar has it)',
        '🐛 + Add button mis-positioned: removed legacy #add-trail-btn absolute style',
        '🐛 Fast-clicking toolbar zoomed map: L.DomEvent.disableClickPropagation + per-button dblclick stop',
        '🎨 Spacing added between version tag and Leaflet attribution',
      ]
    }
  },
  {
    version: 'v1.12.5',
    date: '2026-06-12',
    items: {
      zh: [
        '🐛 切换语言后海拔图标题、X 轴、主轨迹小卡内容用 JS 拼接，applyI18n 触发不到。setLang 末尾手动刷新这些组件',
        '🐛 海拔图高度反复抖动：用预估算法（标注数 + 字号 + 堆叠行数）一次性算出目标高度，禁用旧的"溢出 → 加高 → 缩回"循环',
        '🐛 dpr scale 累积：每次 drawElevBar 先 setTransform(1,0,0,1,0,0) 再 scale，避免反复缩放后坐标错位',
        '🎨 显示模式说明更新：体现"叠加才显示"和"标注点模式下未叠加轨迹也显示标注点"的新行为',
        '🎨 主轨迹小卡 top:42→54px，避开顶部 toolbar',
        '🎨 功能按钮全部移到顶部水平 toolbar：帮助 / 复位 / 测距 / ⇌ 反向 / + 添加 / 📤 导出 / 🗑 清空 / 💾 存储',
        '✨ 新增反向按钮：⇌ 反向（顶部 toolbar）',
        '🎨 版本号合并到 Leaflet attribution prefix：v1.12.5 | Leaflet | © Esri 同一基线，样式完全一致',
      ],
      en: [
        '🐛 setLang now manually refreshes elev chart title/X-axis label/primary mini card (these use JS templates without data-i18n)',
        '🐛 Elev chart height oscillation fixed: pre-compute target height from annotation count, no more grow/shrink loop',
        '🐛 dpr scale accumulation fixed via setTransform reset',
        '🎨 Mode descriptions updated to reflect new overlay/waypoint behavior',
        '🎨 Mini card top moved 42→54px, avoiding new toolbar',
        '🎨 All map buttons collapsed into a horizontal top toolbar: Help / Reset / Measure / Reverse / Add / Export / Clear / Storage',
        '✨ Added Reverse button (top toolbar)',
        '🎨 Version tag merged into Leaflet attribution prefix — same baseline & style as © Esri',
      ]
    }
  },
  {
    version: 'v1.12.4',
    date: '2026-06-12',
    items: {
      zh: [
        '🐛 反向轨迹后海拔图营地标错位置：reverseTrail 现在同时重置 wp.gps_idx（之前漏了，导致海拔图按旧索引定位）',
        '🎨 侧栏收起后，主轨迹信息以小卡（240px）形式浮在右上角；点击小卡展开侧栏',
        '🎨 删除「标注点」tab：标注点类型筛选移到「轨迹」tab 底部',
        '✨ 每个显示模式独立的标注点筛选：state.modeVisibleTags = { day, elev, waypoint }；state.visibleTags 改为 getter 反射当前模式',
        '🎨 轨迹缩略图回退到无地图底版本（去掉等高线和渐变底）；最低海拔点标记 + 数字标在最低点附近（蓝灰色），最高海拔标在山顶处（红棕）',
        '🎨 ID 与轨迹信息合并到同一行（距离/爬升/下降/天数 + ID 右对齐）',
        '🎨 版本号挪到右下 Leaflet/Esri attribution 左侧（同一基线）',
        '🎨 标注点模式下未叠加的轨迹也显示其标注点：drawWaypoints/drawHighPoints 跳过 activeTrails 检查（限 waypoint 模式）',
      ],
      en: [
        '🐛 Reversed trail elev chart camp positions: reverseTrail now also resets wp.gps_idx',
        '🎨 Sidebar collapsed → primary trail info floats as 240px card at top-right',
        '🎨 Removed "Waypoints" tab: tag filter moved to bottom of "Trails" tab',
        '✨ Per-mode visibleTags: state.modeVisibleTags = { day, elev, waypoint }',
        '🎨 Trail thumbnail reverted (no map-base contours); low-elevation marker + label near valley point',
        '🎨 ID and trail meta now share a single row',
        '🎨 Version tag relocated to left of Leaflet/Esri attribution',
        '🎨 In waypoint mode, inactive trails still show their waypoints',
      ]
    }
  },
  {
    version: 'v1.12.3',
    date: '2026-06-12',
    items: {
      zh: [
        '🐛 修复：未展开的卡片（默认状态）没绑 click 事件，导致勾选/卡片整体点击都失效',
        '🎨 左下角多轨迹图例 #legend 移除（仍保留隐藏锚点供 buildLegend 调用）',
        '🎨 海拔图 #elev-bar 从右下移到左下：bottom:28px / left:14px',
        '🎨 版本号挪到右上 top:8px / right:8px，与 Leaflet attribution（右下）和 zoom 控件互不重叠',
        '⚙️ 默认关闭「行程 / 下撤路线」自动生成：state.autoGenerateEscape = false（接口保留：手动改为 true 即恢复 buildEscapeRoutes 自动推算）',
      ],
      en: [
        '🐛 Fix: collapsed (default) cards had no click handler — checkbox & card click were both dead',
        '🎨 Removed #legend from bottom-left (kept hidden anchor for buildLegend)',
        '🎨 Moved #elev-bar to bottom-left (was bottom-right next to sidebar)',
        '🎨 Version tag relocated to top-right; no overlap with Leaflet attribution or zoom controls',
        '⚙️ Disabled auto-generation of escape routes by default: state.autoGenerateEscape=false (set true to restore)',
      ]
    }
  },
  {
    version: 'v1.12.2',
    date: '2026-06-12',
    items: {
      zh: [
        '🎨 重新定义勾选框语义：勾选 = 展开详情（缩略图/数据/操作行），不再控制地图叠加',
        '🎨 卡片其他区域点击 = 切换地图叠加；状态徽标改为「叠加中●」/「点击叠加」',
        '🐛 勾选框可点击：加 cursor:pointer + 独立 click 拦截，不会触发卡片整体的叠加切换',
        '🎨 海拔图标注：黑点放大到 2.5px + 白描边，文字统一固定在小点右上方（gap 仅 3px）',
        '✨ 文字重叠时自动加高海拔图框：检测顶部溢出 → 把容器扩高 N px → 重绘；无溢出时缩回 140 默认',
      ],
      en: [
        '🎨 Checkbox now toggles detail expansion only (not map overlay)',
        '🎨 Card body click toggles overlay; badge: "叠加中●" or "点击叠加"',
        '🐛 Checkbox clickable with cursor:pointer + dedicated click handler',
        '🎨 Elevation chart: dots enlarged to 2.5px + white halo; labels pinned to top-right',
        '✨ Auto-grow elev card: detects top overflow → expands container → redraws; shrinks back when free',
      ]
    }
  },
  {
    version: 'v1.12.1',
    date: '2026-06-12',
    items: {
      zh: [
        '🎨 备选轨迹卡片新增勾选框：左上角小方块，未叠加=空框，已叠加=苔绿底+白勾「✓」',
        '🎨 海拔图标注去掉所有图标（⛰⛺💧），只留黑色小点（1.6px）+ 文字，文字探测起跳从 4px 缩到 1px，紧贴小点',
        '🎨 海拔图绿色调全面落地：填充用 4 段绿色渐变（浅薄荷→草绿→苔绿→深森林），每段再做纵向不透明度 0.62→0.18 衰减，呈现地形剖面感',
        '🎨 海拔曲线主线改为单色深森林绿（去掉 Bloom 外发光），整体更克制',
        '🎨 海拔图卡片底色加深为图2 杂志风：#F2EBD3→#E8DEC0 纵向渐变 + 棕色噪点纹理',
      ],
      en: [
        '🎨 Trail cards now have a checkbox in the top-left',
        '🎨 Elevation chart annotations: dropped all icons, kept only the black dot + text (gap reduced from 4 to 1px)',
        '🎨 Green palette: 4-stop gradient (mint→grass→moss→forest) with vertical alpha falloff (0.62→0.18)',
        '🎨 Curve drawn as single forest-green stroke (no Bloom)',
        '🎨 Elev card background updated to match concept B paper feel',
      ]
    }
  },
  {
    version: 'v1.12.0',
    date: '2026-06-12',
    items: {
      zh: [
        '🎨 备选轨迹缩略图加地图底：浅米色 + 3 条等高线柔和弧线，山顶用三角点标注',
        '🎨 已选为合并叠加的轨迹卡片极简化：只显示色点 + 名称 + 「显示中」徽标，不再显示缩略图与详细数据',
        '🎨 海拔图标注全面优化：山顶 ⛰ 三角、营地 ⛺ 圆+外圈、最低点 💧 圆点；点和文字尺寸都缩小',
        '✨ 海拔图字号自适应：≤5 个标注用 9.5px，6-9 个用 8.5px，>9 个用 7.5px',
        '✨ 海拔图标注智能避让海拔曲线：把曲线离散成像素采样数组，标签上下/左右探测无碰撞位置',
        '🌐 海拔图全部改中文：标题「海拔剖面」、X 轴「里程」、营地/最高/最低中文',
        '🐛 测距点击响应优化：nearestTrackIdxOnPrimary 改为平面距离粗筛 + 单次 haversine 校验，7000 点延迟从 ~30ms 降到 ~3ms',
        '🐛 海拔图避让算法用二分搜索替代 O(N) 循环，标注绘制速度提升 ~5 倍',
        '🐛 测距 elev bar 重绘 requestAnimationFrame 推迟到下一帧，让点击立即响应',
      ],
      en: [
        '🎨 Trail thumbnails now have a map-like base (cream + soft contour curves) with peak triangle marker',
        '🎨 Active (overlaid) trail cards collapse to minimal: just dot + name + "showing" badge',
        '🎨 Elevation chart markers redesigned: peak ⛰ triangle, camp ⛺ ring, low 💧 dot — smaller dots and text',
        '✨ Adaptive font size: 9.5px for ≤5 labels, 8.5px for 6-9, 7.5px for >9',
        '✨ Smart label-vs-curve avoidance: discretize curve to pixel array, probe label positions',
        '🌐 Elevation chart fully in Chinese: title 海拔剖面, X-axis 里程',
        '🐛 Click-to-measure latency: planar distance coarse filter + single haversine check (~30ms → ~3ms)',
        '🐛 Curve hit-testing uses binary indexing for ~5x speedup',
        '🐛 Elev bar redraw deferred to requestAnimationFrame so click feels instant',
      ]
    }
  },
  {
    version: 'v1.11.0',
    date: '2026-06-12',
    items: {
      zh: [
        '🎨 移除整体顶部 header，主轨迹信息整合到右侧 sidebar 顶部的 primary card',
        '🎨 主轨迹卡片：奶油色卡纸 + 大衬线路线名 + 6 项关键指标（距离/天数/爬升/下降/最高/最低）+ 反向/KML/链接操作行',
        '✨ 备选轨迹列表新增缩略图：左半轨迹平面投影（起绿点/终砖红点）+ 右半海拔迷你图 + Min/Max 标签',
        '✨ 反向按钮只在主轨迹（primary card）上显示，备选轨迹移除该入口',
        '🎨 海拔图标注按图2风格重绘：去除虚线引导线，标签紧贴点旁（左/右自适应），不再画半透明背景框',
        '🐛 修复 minE 标签与 X 轴 km 刻度重叠的 bug：底部 padding 从 26px 加到 34px，minE 标签上移到 X 轴上方',
        '🐛 修复一处 annotation 块语法错误（少一个 `})` 导致旧版本下半段渲染异常）',
        '🌐 语言切换按钮整合到 sidebar 的 tabs 行末尾',
      ],
      en: [
        '🎨 Removed top header; primary trail info moved to a dedicated card at the top of the sidebar',
        '🎨 Primary card: cream paper + serif name + 6 stats (distance/days/ascent/descent/peak/low) + reverse/KML/link actions',
        '✨ Trail list cards now show thumbnails: left half is GPS shape (green start, red end), right half is mini elevation chart',
        '✨ Reverse action only on primary trail; removed from non-primary cards',
        '🎨 Elevation chart annotations redesigned per concept B: no leader lines, labels sit beside dots, no background pill',
        '🐛 Fixed minE label colliding with X-axis km ticks (bottom padding 26→34, minE moved above the axis line)',
        '🐛 Fixed a missing `})` block that broke later annotation rendering',
        '🌐 Language switch moved into the sidebar tabs row',
      ]
    }
  },
  {
    version: 'v1.10.0',
    date: '2026-06-12',
    items: {
      zh: [
        '🎨 整体配色改为图2杂志风：米黄底 + 苔绿/砖红双主色 + Source Serif 4 衬线',
        '🎨 顶部 header 改成杂志样式：路线名称大衬线 + 数据指标按图2两行排布（数字大 / 标签小斜体大写）',
        '🎨 轨迹列表：不再显示主轨迹（信息已在顶部 header），只显示备选轨迹',
        '🎨 天数模式轨迹色板改为杂志风 7 色（苔绿/砖红/赭石/沙金/灰蓝/紫黛/暮粉），并加 Bloom 外发光',
        '✨ 海拔图新增营地标注：图标=圆点 + 双圈，文字=营地名 + "CAMP xxxxm"',
        '✨ 海拔图标注智能避让：相邻标注横向重叠时自动错位 13px，避免文字打架',
        '✨ 标注引导线：从轨迹点用虚线连到文字框，文字带半透明米色背景框便于阅读',
        '🐛 多个 UI 元素的硬编码深色被替换为 CSS 变量，整体浅色风格统一',
      ],
      en: [
        '🎨 Editorial magazine palette throughout: cream + moss-green / brick-red + Source Serif 4',
        '🎨 Header redesigned: route name in serif + stats in editorial 2-line format',
        '🎨 Trail list no longer shows the primary trail (it lives in the top header now)',
        '🎨 Day-mode palette redesigned (7 magazine-tone colors) + Bloom glow',
        '✨ Camp annotations on elevation chart with dot+ring marker',
        '✨ Smart label collision avoidance (auto stacks 13px when overlap)',
        '✨ Dashed leader lines from track point to label, with cream background pill',
        '🐛 Hard-coded dark colors replaced by CSS variables for consistency',
      ]
    }
  },
  {
    version: 'v1.9.0',
    date: '2026-06-12',
    items: {
      zh: [
        '✨ 视觉重设计：参考三张概念稿融合落地（地图保持原样不变）',
        '🎨 主轨迹 Bloom 外发光：白光 + 嫩绿辉光双层叠加，海拔渐变色更醒目（A 风格）',
        '🎨 海拔图杂志卡纸化：米色 #F5F1E8 底 + Source Serif 4 衬线 + 微纸纹噪点（B 风格）',
        '🎨 轨迹卡片杂志化：米黄渐变背景、左侧色带、衬线大标题、italic small caps 副信息',
        '✨ 海拔图横轴显示多个里程刻度（每 80px 自适应一个），从 0 km 到终点',
        '✨ 测距模式海拔图：里程从 0 开始计数，按 A→B 实际方向取海拔序列',
        '🐛 测距交换 A/B 修复：交换后爬升/下降数据按 A→B 实际方向重算（之前是固定值不变）',
      ],
      en: [
        '✨ Visual redesign: applied concept blend (map basemap unchanged)',
        '🎨 Primary trail Bloom: white outer + mint inner glow with elevation gradient',
        '🎨 Elevation chart magazine card: cream #F5F1E8 base + Source Serif 4 + paper grain',
        '🎨 Trail cards editorial style: cream gradient, left color rail, serif title, italic small caps',
        '✨ Multiple km ticks on the elevation X-axis (one per ~80px)',
        '✨ Measure-mode elevation chart starts at 0 km along A→B direction',
        '🐛 Measure swap A/B now correctly re-computes ascent/descent for the new direction',
      ]
    }
  },
  {
    version: 'v1.8.0',
    date: '2026-06-10',
    items: {
      zh: [
        '✨ 手动添加下撤路线：在下撤方案面板点击「＋ 手动添加」，地图上点选 A/B 两点',
        '✨ 自动吸附到最近轨迹（2km 范围内），跨轨迹选点时优先 A 所在轨迹',
        '✨ 路线预览：A/B 标记 + 红色虚线高亮 + 自动 flyToBounds',
        '✨ 路线名称可编辑后保存，持久化到 IndexedDB',
        '✨ 手动路线显示「手动」绿色标签，支持单独删除（🗑）',
      ],
      en: [
        '✨ Manual escape route: click "＋ Add manual" in escape panel, then pick A/B on map',
        '✨ Auto-snaps to nearest trail (within 2km); uses A\'s trail when points are on different trails',
        '✨ Preview: A/B markers + red dashed polyline + auto flyToBounds',
        '✨ Route name editable before saving; persisted to IndexedDB',
        '✨ Manual routes show green "手动" badge and can be individually deleted (🗑)',
      ]
    }
  },
  {
    version: 'v1.7.0',
    date: '2026-06-09',
    items: {
      zh: [
        '✨ 海拔图颜色渐变：按海拔高度从蓝→青→绿→黄→红五色渐变，直观识别高海拔段',
        '🐛 海拔图现在随主轨迹切换而实时更新（修复「设为主轨迹」按钮未触发刷新的问题）',
        '🐛 修复 lightbox 放大图片后双击触发浏览器元素选中（浅灰蓝色高亮）的问题',
        '✨ 测距模式连续测量：已有 A+B 后，再次点击自动替换距离当前点击最近的端点，实现拖动调整',
        '✨ 下撤路线跨轨迹分析：导入多条轨迹后，自动检测 500m 内的轨迹交叉/接驳点作为额外下撤目标',
        '✨ 跨轨迹下撤在面板显示「跨轨迹」标签，描述文字注明接驳轨迹名与接驳距离',
        '🛠 新增轨迹后自动对全部轨迹重建下撤方案（确保彼此参考关系完整）',
      ],
      en: [
        '✨ Elevation chart gradient coloring: blue→cyan→green→yellow→red by altitude',
        '🐛 Elevation chart now updates immediately when primary trail changes (fix missing refresh in "set primary" button)',
        '🐛 Fix lightbox double-click causing browser element selection (blue-grey highlight)',
        '✨ Measure mode: with A+B set, next click replaces the nearest endpoint for continuous adjustment',
        '✨ Cross-trail escape routes: after importing multiple trails, auto-detect ≤500m intersection points as additional escape targets',
        '✨ Cross-trail escape routes show a "跨轨迹" badge and note the connecting trail name & distance',
        '🛠 All trails rebuild escape routes whenever a new trail is added',
      ]
    }
  },
  {
    version: 'v1.6.0',
    date: '2026-06-09',
    items: {
      zh: [
        '🐛 海拔图位置修复：right 值从 334px 起步（侧栏展开时不重叠），侧栏收起时自动缩回 14px',
        '✨ 海拔图右下角显示当前路段爬升 ↑XXXm / 下降 ↓XXXm 总量',
        '✨ 普通模式下点击海拔图 → 地图上标记对应轨迹点（黄色圆点 + km/海拔标注，3 秒后消失）',
        '✨ 点击时地图自动 panTo 对应位置',
        '🛠 海拔图 hover/click 逻辑重构为统一的 elevHitTest() 函数',
      ],
      en: [
        '🐛 Elev chart position fix: right=334px (no overlap with sidebar), collapses to 14px when sidebar hidden',
        '✨ Elev chart shows total ↑ascent / ↓descent for current segment in bottom-right corner',
        '✨ Normal mode: click elev chart → map shows a marker at the corresponding track point (3s auto-remove)',
        '✨ Map auto-pans to the clicked point',
        '🛠 Refactored hover/click into shared elevHitTest() helper',
      ]
    }
  },
  {
    version: 'v1.5.0',
    date: '2026-06-09',
    items: {
      zh: [
        '✨ 海拔图改为右下角悬浮卡片（340×120px），不遮挡地图操作区域',
        '✨ 海拔图配色优化：深色主题、轨迹主色渐变填充、虚线参考线、最高/最低点标注更清晰',
        '🐛 修复下撤路线未生成问题：重写 buildEscapeRoutes，使用最近邻配对（不再要求严格 km 顺序）',
        '🛠 旧 IndexedDB 数据加载时自动 backfill escape_routes（用 track 点重建 pts）',
        '🛠 下撤路线说明增加方向（原路返回/继续前进）和落差描述',
      ],
      en: [
        '✨ Elevation chart moved to bottom-right floating card (340×120px), no longer blocking map',
        '✨ Chart colors: dark theme, trail-color gradient fill, dashed reference lines, clearer peak/valley labels',
        '🐛 Fix escape routes not generating: rewrote buildEscapeRoutes with nearest-neighbor pairing',
        '🛠 Auto-backfill escape_routes for old IndexedDB data on load',
        '🛠 Escape route descriptions now include direction and elevation drop detail',
      ]
    }
  },
  {
    version: 'v1.4.0',
    date: '2026-06-09',
    items: {
      zh: [
        '🐛 修复 📏 测距 按钮显示为「action.measure」— 补充了中英文 i18n 翻译 key',
        '✨ 底部海拔变化图：主轨迹的完整海拔剖面实时绘制在底部固定栏',
        '✨ 测距模式下底部海拔图自动切换为路段视图，退出恢复完整图',
        '✨ 底部海拔图可 hover：十字准线 + 浮窗显示当前里程/海拔/累积爬升',
        '✨ 底部海拔图可点击选取测距 A/B 点（测距模式下）',
      ],
      en: [
        '🐛 Fix 📏 Measure button showing "action.measure" — added i18n translation keys',
        '✨ Bottom elevation chart: full elevation profile of primary trail drawn in fixed bottom bar',
        '✨ In measure mode the chart auto-switches to segment view; restores on exit',
        '✨ Bottom chart hover: crosshair + tooltip showing km / elev / cumulative ascent',
        '✨ Bottom chart clickable to pick A/B measure points (when in measure mode)',
      ]
    }
  },
  {
    version: 'v1.3.0',
    date: '2026-06-09',
    items: {
      zh: [
        '✨ 悬停轨迹 tooltip 新增「下降」字段（累积下降随里程变化）',
        '✨ 每条轨迹支持「⇄ 反向」：翻转轨迹走向，重算里程/爬升/下降/天数分色/标注点 km',
        '✨ 测距面板新增「⇄ 交换 A/B」按钮：快速反向测量方向',
        '🐛 修复「+ 添加轨迹」按钮被「📏 测距」按钮覆盖的布局冲突（添加轨迹移至 top:244px，存储移至 top:290px）',
      ],
      en: [
        '✨ Hover tooltip on track now shows cumulative descent',
        '✨ Each trail supports ⇄ Reverse: flips direction, recalculates km/ascent/descent/day colors/waypoint km',
        '✨ Measure panel: added ⇄ Swap A/B button to flip measurement direction instantly',
        '🐛 Fixed layout conflict: + Add Trail button was hidden behind 📏 Measure (moved to top:244px, storage to top:290px)',
      ]
    }
  },
  {
    version: 'v1.2.0',
    date: '2026-06-09',
    items: {
      zh: [
        '✨ 轨迹统计新增「下降」数据（累加器法 thr=10m，与爬升对称）',
        '✨ 头部全局栏 + 每条轨迹卡片均显示 ↓下降',
        '✨ 新增「📏 测距」工具：在主轨迹上点两个点，自动计算两点间的里程/爬升/下降/方向',
        '✨ 测距高亮整段轨迹，并标记 A/B 点；支持多次重选',
        '🐛 lightbox 图片放大不再触发页面级缩放（自带 pinch/wheel/双击/拖动）',
        '🛠 旧 IndexedDB 数据加载时自动补算 descent_m',
      ],
      en: [
        '✨ Trail stats: added descent (accumulator method thr=10m, symmetric to ascent)',
        '✨ Header bar & each trail card now show ↓descent',
        '✨ New 📏 Measure tool: pick two points on primary trail → distance / ascent / descent / direction',
        '✨ Measure highlights segment, marks A/B; supports re-selection',
        '🐛 Lightbox zoom no longer triggers page-level zoom (built-in pinch/wheel/dblclick/drag)',
        '🛠 Auto-backfill descent_m for old IndexedDB data on load',
      ]
    }
  },
  {
    version: 'v1.1.0',
    date: '2026-06-05',
    items: {
      zh: [
        '✨ 导出行程图片（小红书 3:4 竖图 1080×1440）',
        '✨ 总览图 + 每日分图，分天着色轨迹 + 标注点卡片',
        '✨ Canvas 2D 手绘（深色背景+经纬度网格+信息栏）',
      ],
      en: [
        '✨ Export itinerary images (Xiaohongshu 3:4 1080x1440)',
        '✨ Overview + per-day images, day-colored tracks + waypoint cards',
        '✨ Canvas 2D drawn (dark bg + grid + info bar)',
      ]
    }
  },
  {
    version: 'v1.0.0',
    date: '2026-06-01',
    items: {
      zh: [
        '🎉 1.0 正式版',
        '✨ 顶部按钮横排布局',
        '✨ 折叠/展开镜像对称半圆形',
        '✨ 双击标题改名',
        '✨ 右键/长按添加标注点（标记 [手动]）',
        '✨ 导出可选 HTML 地图或行程 MD',
        '✨ Leaflet 内嵌（290KB 自包含）',
        '✨ Chrome emoji 修复',
        '✨ 移动端拖动+长按',
        '🐛 导出不依赖 fetch（兼容 file://）',
        '🐛 activeTrails 序列化修复',
      ],
      en: [
        '🎉 1.0 Stable',
        '✨ Horizontal top buttons',
        '✨ Mirror semicircle collapse/expand',
        '✨ Double-click title to rename',
        '✨ Right-click/long-press add waypoint ([手动])',
        '✨ Export: HTML map or itinerary MD',
        '✨ Leaflet embedded (290KB self-contained)',
        '✨ Chrome emoji fix',
        '✨ Mobile touch: drag + long-press',
        '🐛 Export no fetch dependency (file:// compatible)',
        '🐛 activeTrails serialization fix',
      ]
    }
  },
  {
    version: 'v0.6.0',
    date: '2026-05-24',
    items: {
      zh: [
        '🎉 正式发行（Stable Release）',
        '✨ 新增 ❓ 帮助按钮：完整功能介绍和使用说明',
        '✨ 新增 🎯 复位按钮：以主轨迹为中心重新定位',
        '✨ 折叠按钮挂到 sidebar 左边线中间，避开 Tab 区',
        '✨ 关闭添加面板时清除上次的解析记录',
        '✨ 轨迹链接显示改为：🔗 轨迹名 ✎，简洁直观',
      ],
      en: [
        '🎉 Stable Release',
        '✨ New ❓ Help button: full feature guide',
        '✨ New 🎯 Reset button: zoom map to main trail',
        '✨ Sidebar collapse button moved to left edge center (avoids tab overlap)',
        '✨ Add panel clears parse log on close',
        '✨ Trail link display redesigned: 🔗 trail-name ✎, cleaner',
      ]
    }
  },
  {
    version: 'v0.6.0-rc1',
    date: '2026-05-24',
    items: {
      zh: [
        '🎯 正式发行候选版（Release Candidate 1）',
        '✨ 添加轨迹时可同步编辑 ID 和链接（添加面板内每条都有输入框）',
        '✨ 右侧栏可折叠（顶部 ⟩ 收起，地图右上 ☰ 展开）',
        '✨ 标注点模式选择面板改为 2 列网格，更整齐',
        '✨ 筛选栏重命名为「标注点」，去掉"显示轨迹线"和"标注点标签"开关',
      ],
      en: [
        '🎯 Release Candidate 1',
        '✨ Edit ID & source URL in real-time when adding trails',
        '✨ Collapsible right sidebar (⟩ to collapse, ☰ to expand)',
        '✨ Waypoint mode tag selection: 2-column grid for better alignment',
        '✨ "Filter" tab renamed to "Waypoints"; removed "Show track lines" and "Show waypoint labels" toggles',
      ]
    }
  },
  {
    version: 'v0.5.26',
    date: '2026-05-24',
    items: {
      zh: [
        '✨ 鼠标悬停不再显示卡片，点击标注点固定显示卡片（×按钮关闭）',
        '✨ 卡片中点击图片 → 全屏放大',
        '✨ 显示模式重命名：天数模式 / 海拔模式 / 标注点模式',
        '✨ 标注点模式下非主轨迹标注点颜色和主轨迹一样深，只是无 km·海拔标签',
        '🐛 标注点对比模式 tag 名跟随系统语言（中英）',
      ],
      en: [
        '✨ Hover no longer shows card; click marker pins card (×to close)',
        '✨ Click photo in card → fullscreen zoom',
        '✨ Display modes renamed: Days / Elevation / Waypoints',
        '✨ Waypoint mode: non-main trail markers use same vivid color as main, only icon (no label)',
        '🐛 Waypoint mode tag names follow system language',
      ]
    }
  },
  {
    version: 'v0.5.25',
    date: '2026-05-24',
    items: {
      zh: [
        '✨ 轨迹 ID 默认用添加顺序（1, 2, 3...），支持手动编辑',
        '✨ 轨迹链接默认 None，支持手动编辑（点 ✎）',
        '✨ 标注点对比模式：其他轨迹的标注点只显示图标（无 km·海拔标签），保留 hover 卡片',
        '✨ 海拔最高点不再默认选中（标注点对比模式）',
        '✨ 标注点类别名称跟随系统语言切换',
        '🐛 点击标注点直接放大图片（如有图）；hover 显示卡片但不固定',
      ],
      en: [
        '✨ Trail ID defaults to insertion order (1, 2, 3...), manually editable',
        '✨ Trail source defaults to None, manually editable (click ✎)',
        '✨ Waypoint compare mode: non-main trail waypoints show icon only (no km·elev label), hover card kept',
        '✨ Highest peak no longer selected by default in waypoint compare mode',
        '✨ Waypoint category labels follow system language',
        '🐛 Click waypoint directly opens photo lightbox (if photo exists); hover shows card but not pinned',
      ]
    }
  },
  {
    version: 'v0.5.24',
    date: '2026-05-24',
    items: {
      zh: [
        '✨ 国际化支持中英文切换',
        '✨ 标注点对比模式：主轨迹海拔渐变，其他轨迹虚线轮廓+浅色标注点',
        '✨ 海拔最高点作为可选标注点类别（默认选中）',
        '✨ 轨迹卡片 ID 可手动编辑',
        '✨ 鼠标 hover 轨迹线显示最近标注点（图片+文字+轨迹+里程+海拔），点击放大图片',
        '✨ IndexedDB 配额查询/请求持久化',
        '✨ 版本号点击查看更新日志',
        '🐛 多 KML 段轨迹合并修复（gx:Track + LineString 同时支持）',
        '🐛 IndexedDB 替代 localStorage（解决 5MB 限制）',
      ],
      en: [
        '✨ i18n: Chinese/English switch',
        '✨ Waypoint compare mode: main trail uses elevation gradient, others get dashed outline + faded waypoints',
        '✨ Highest elevation point as selectable waypoint category (selected by default)',
        '✨ Trail card ID is now manually editable',
        '✨ Hover trail line to see nearest waypoint (photo+text+trail+distance+elevation), click photo to zoom',
        '✨ IndexedDB quota query / persistence request',
        '✨ Click version number to view changelog',
        '🐛 Multi-segment KML merging (gx:Track + LineString)',
        '🐛 IndexedDB replaces localStorage (solves 5MB limit)',
      ]
    }
  },
  {
    version: 'v0.5.23',
    date: '2026-05-23',
    items: {
      zh: [
        '🎉 KML 在线版首次上线',
        '✨ 多轨迹叠加（主轨迹高亮，其他淡化）',
        '✨ 海拔最高点标记',
        '✨ localStorage 持久化（已被 IndexedDB 替换）',
        '✨ 导出离线 HTML',
      ],
      en: [
        '🎉 KML online first release',
        '✨ Multi-trail overlay (main highlighted, others faded)',
        '✨ Highest elevation point marker',
        '✨ localStorage persistence (replaced by IndexedDB)',
        '✨ Export offline HTML',
      ]
    }
  }
];
function showChangelog() {
  let modal = document.getElementById('changelog-modal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'changelog-modal';
    modal.className = 'modal-mask';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:560px;max-height:80vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3 data-i18n="changelog.title" style="margin:0">${t('changelog.title')}</h3>
          <button class="btn-mini" onclick="document.getElementById('changelog-modal').classList.remove('open')" data-i18n="changelog.close">${t('changelog.close')}</button>
        </div>
        <div id="changelog-body"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
  }
  const body = modal.querySelector('#changelog-body');
  body.innerHTML = CHANGELOG.map(v => `
    <div style="margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:8px">
        <strong style="font-size:14px;color:var(--accent)">${v.version}</strong>
        <span style="color:var(--text-dim);font-size:11px">${v.date}</span>
      </div>
      <ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.7;color:var(--text-base)">
        ${(v.items[currentLang] || v.items.zh).map(it => `<li>${it}</li>`).join('')}
      </ul>
    </div>
  `).join('');
  modal.classList.add('open');
}

async function showStorageInfo() {
  let modal = document.getElementById('storage-modal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'storage-modal';
    modal.className = 'modal-mask';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:480px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3 data-i18n="storage.title" style="margin:0">${t('storage.title')}</h3>
          <button class="btn-mini" onclick="document.getElementById('storage-modal').classList.remove('open')" data-i18n="changelog.close">${t('changelog.close')}</button>
        </div>
        <div id="storage-info" style="font-size:12px;line-height:1.8;color:var(--text-base)"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
  }
  const info = modal.querySelector('#storage-info');
  let html = '';
  try {
    if(navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      const usedMB = (est.usage / 1024 / 1024).toFixed(2);
      const quotaMB = (est.quota / 1024 / 1024).toFixed(0);
      const pct = ((est.usage / est.quota) * 100).toFixed(1);
      html += `<div style="margin-bottom:6px"><b>${t('storage.used')}:</b> ${usedMB} MB</div>`;
      html += `<div style="margin-bottom:6px"><b>${t('storage.total')}:</b> ${quotaMB} MB (${pct}%)</div>`;
      html += `<div style="background:var(--bg-2);border-radius:4px;overflow:hidden;height:8px;margin:8px 0"><div style="height:100%;background:linear-gradient(90deg,#10b981,#facc15,#ef4444);width:${pct}%"></div></div>`;
      html += `<div style="margin-top:10px;font-size:11px;color:var(--text-muted)">轨迹数: <b>${DATA.trails.length}</b></div>`;
    } else {
      html += `<div style="color:var(--text-muted)">浏览器不支持 storage.estimate API</div>`;
    }

    let persisted = false;
    if(navigator.storage && navigator.storage.persisted) {
      persisted = await navigator.storage.persisted();
    }

    if(persisted) {
      html += `<div style="margin-top:14px;color:#10b981;font-weight:600">${t('storage.persisted')}</div>`;
      html += `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">数据不会被浏览器自动清理</div>`;
    } else {
      html += `<button class="btn-mini" id="persist-btn" style="margin-top:14px;background:var(--accent);color:#000;padding:6px 14px">${t('storage.persist')}</button>`;
      html += `<div style="font-size:11px;color:var(--text-muted);margin-top:6px">默认浏览器在存储不足时可能清理本站数据。点击"持久化"请求保留</div>`;
    }

    html += `<div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border);font-size:11px;color:var(--text-muted);line-height:1.7">
      <b>关于浏览器存储配额：</b><br>
      • 配额由浏览器自动管理（一般为可用磁盘 60%）<br>
      • 无法手动设置容量上限<br>
      • 推荐：定期点击「📤 导出」备份重要轨迹<br>
      • 配额不够时可在浏览器"设置 → 隐私 → 站点设置"清理其他网站数据
    </div>`;
  } catch(e) {
    html = '<div style="color:#ef4444">' + e.message + '</div>';
  }
  info.innerHTML = html;

  const persistBtn = info.querySelector('#persist-btn');
  if(persistBtn) {
    persistBtn.addEventListener('click', async () => {
      try {
        const ok = await navigator.storage.persist();
        if(ok) {
          showToast(t('storage.persisted'));
          showStorageInfo();
        } else {
          alert('请求被拒绝。某些浏览器需要先把站点加为书签或频繁访问后才能持久化。');
        }
      } catch(e) {
        alert('Failed: ' + e.message);
      }
    });
  }

  modal.classList.add('open');
}


/* ============ State ============ */
const state = HTM_APP.createAppState(DATA);

/* v1.17.0：state 变更 helpers ─────────────────────────────────
   统一"读-改-写-刷新-持久化"的常见组合，消除各处重复的 if/set/delete +
   rebuildAll + saveToStorage 模式。所有涉及 state 变更的 UI 事件都应
   走这些 helper，减少漏调 saveToStorage 的隐蔽 bug。
   ─────────────────────────────────────────────────────────────── */

/**
 * 切换 Set 中的元素（存在则删除，不存在则添加）
 * @param {Set} set - 目标 Set
 * @param {*} item - 元素
 * @returns {boolean} 切换后该元素是否存在于 Set
 */
function toggleSetItem(set, item) {
  return HTM_APP.toggleSetItem(set, item);
}

/**
 * 应用一次状态变更后的完整刷新流程
 * @param {Object} opts - 传递给 rebuildAll 的选项，如 {fit: true}
 * @param {boolean} [opts.save=true] - 是否持久化到 IndexedDB
 * @param {boolean} [opts.fit=false] - 是否重置地图视野
 * @param {boolean} [opts.tracks=true] - 是否只重画 tracks/waypoints（跳过 rebuildAll）
 */
function applyChange(opts = {}) {
  const { save = true, fit = false, tracksOnly = false } = opts;
  if(tracksOnly) {
    if(typeof drawTracks === 'function') drawTracks();
    if(typeof drawWaypoints === 'function') drawWaypoints();
  } else {
    if(typeof rebuildAll === 'function') rebuildAll({ fit });
  }
  if(save && typeof saveToStorage === 'function') saveToStorage();
}

/**
 * 切换轨迹叠加态；如果主轨迹被隐藏，自动降级主轨迹到还叠加着的第一条
 * @param {string} trailId
 */
function toggleTrailActive(trailId) {
  toggleSetItem(state.activeTrails, trailId);
  // v1.21.0：主轨迹兜底只在当前组内挑
  if(state.activeGroup != null && !state.activeTrails.has(state.primaryTrailId)) {
    const inGroupActive = [...state.activeTrails].filter(id => {
      const tr = DATA.trails.find(t => t.id === id);
      return tr && trailGroup(tr) === state.activeGroup;
    });
    state.primaryTrailId = inGroupActive[0] || null;
  }
}

/** 切换详情展开态 */
function toggleTrailExpanded(trailId) { toggleSetItem(state.expandedTrails, trailId); }

/** 切换批量选中态 */
function toggleTrailBatch(trailId) { toggleSetItem(state.batchSelected, trailId); }


/* v1.14.1：分组支持 ─────────────────────────────────────────────
   trail.group（字符串）标识轨迹所属分组，未设置时默认'默认'。
   只有 state.activeGroup 组内的轨迹参与地图渲染/统计/行程等一切功能。
   v1.20.0：允许 state.activeGroup = null（"无选中"状态），此时所有渲染归零。
   ─────────────────────────────────────────────────────────────── */
function trailGroup(trail) { return trail.group || '默认'; }
function isTrailActive(trail) {
  // v1.20.0：无选中分组时，所有轨迹都不显示
  if(state.activeGroup == null) return false;
  return trailGroup(trail) === state.activeGroup && state.activeTrails.has(trail.id);
}
function getGroups() {
  const seen = new Set();
  const groups = [];
  if(DATA.trails.some(t => trailGroup(t) === '默认')) { groups.push('默认'); seen.add('默认'); }
  DATA.trails.forEach(t => {
    const g = trailGroup(t);
    if(!seen.has(g)) { seen.add(g); groups.push(g); }
  });
  if(!groups.length) groups.push('默认');
  return groups;
}
/**
 * 切换到指定分组。v1.20.0 起支持传 null 表示"取消选中所有分组"。
 * v1.21.0：每个组的主轨迹独立记忆（state.primaryByGroup[groupName]）。
 *         切到目标组时优先读记忆值；若记忆值失效（trail 已删或已移出），
 *         自动挑组内第一条作为该组的新主轨迹。
 * @param {string|null} groupName 分组名，或 null 进入无选中状态
 */
function switchGroup(groupName) {
  state.activeGroup = groupName;
  if(groupName == null) {
    // 无选中状态：不动 primaryByGroup 记忆值，只是 getter 返回 null
    rebuildAll({ fit: false });
  } else {
    // 校验/回填该组的记忆值
    const inGroup = DATA.trails.filter(t => trailGroup(t) === groupName);
    const memorized = state.primaryByGroup[groupName];
    if(!memorized || !inGroup.find(t => t.id === memorized)) {
      // 记忆值失效或不存在 → 挑组内第一条
      state.primaryByGroup[groupName] = inGroup[0] ? inGroup[0].id : null;
      if(!inGroup[0]) delete state.primaryByGroup[groupName];
    }
    rebuildAll({ fit: false });
    // v1.22.0：切组时自动执行完整复位（比原来只是 fitBounds 更彻底：会重新算 primary + 重绘）
    if(inGroup.length > 0 && typeof resetView === 'function') resetView();
  }
  saveToStorage();
}


/* ============ Map ============ */
const map = L.map('map', {
  center: [29.74, 99.65], zoom: 11,
  zoomControl: true, attributionControl: true,
  dragging: true, tap: false, touchZoom: true,  // v1.27.0：关闭 L.Tap 消除触屏 tap 延迟
  // v1.31.7：+/- 按钮步进调大，滚轮仍保持半级吸附
  zoomSnap: 0.5,             // 缩放对齐到 0.5 级
  zoomDelta: 1,              // +/- 按钮和键盘每次变化 1 级（更快放大/缩小）
  wheelPxPerZoomLevel: 120,  // 滚轮每 120px 触发 1 级缩放，比默认 60 更平滑
  wheelDebounceTime: 40,     // 滚轮防抖（默认 40，保留）
  // v1.25.0：关闭双击缩放，消除 Leaflet 内部 200ms click 延迟
  doubleClickZoom: false,
});
// 把版本号塞进 Leaflet attribution prefix，与 Leaflet/Esri 同一行同一基线
// 版本号独立浮层（独立背景框 + 与 Leaflet attribution 完全同款样式）
map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank">Leaflet</a>');
(function(){
  const tag = document.createElement('div');
  // 关键：套上 leaflet-control-attribution 类，自动继承同款 background/font-size/padding/line-height
  tag.className = 'leaflet-control-attribution';
  tag.id = 'version-tag-float';
  tag.innerHTML = '<a href="javascript:void(0)" id="version-tag-link" title="点击查看更新日志">v1.32.1</a>';
  // 仅覆盖定位相关；样式继承自 .leaflet-control-attribution
  tag.style.position = 'absolute';
  tag.style.zIndex = '600';
  tag.style.pointerEvents = 'auto';
  setTimeout(() => {
    const map_el = document.getElementById('map');
    if(!map_el) return;
    map_el.appendChild(tag);
    const reposition = () => {
      const attr = map_el.querySelector('.leaflet-control-attribution:not(#version-tag-float)');
      if(!attr) return;
      const mapRect = map_el.getBoundingClientRect();
      const attrRect = attr.getBoundingClientRect();
      const attrRightOffset = mapRect.right - attrRect.left;
      tag.style.right = (attrRightOffset + 6) + 'px';  // 与 attribution 间隔 6px
      tag.style.bottom = (mapRect.bottom - attrRect.bottom) + 'px';
    };
    reposition();
    setTimeout(reposition, 200);
    setTimeout(reposition, 600);
    const attr = map_el.querySelector('.leaflet-control-attribution:not(#version-tag-float)');
    if(attr) new MutationObserver(reposition).observe(attr, {childList:true, subtree:true, characterData:true});
    window.addEventListener('resize', reposition);
    document.getElementById('version-tag-link').addEventListener('click', e => {
      e.preventDefault(); if(window.showChangelog) showChangelog();
    });
  }, 100);
})();
// v1.14.1：撤销 v1.13.3 的 ctrl/meta+wheel 放行
//   原因：trackpad pinch-zoom 被浏览器映射成 ctrl+wheel；放行后双指捏合在地图上触发的是
//   浏览器整页缩放而不是地图缩放，反而把"地图缩放"功能搞坏了。
//   用户要做浏览器整页缩放可以用 Cmd/Ctrl +/-/0 快捷键或菜单，不必从地图区域捕捉。
const _toolbarEl = document.getElementById('map-toolbar');
if(_toolbarEl) {
  L.DomEvent.disableClickPropagation(_toolbarEl);
  L.DomEvent.disableScrollPropagation(_toolbarEl);
  // 进一步：每个按钮再单独阻止 dblclick（双击放大 = map 的 doubleClickZoom）
  _toolbarEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('dblclick', e => { e.preventDefault(); e.stopPropagation(); });
  });
}
// 同时给 mini card 也加一层防护
const _miniEl = document.getElementById('primary-mini');
if(_miniEl) {
  L.DomEvent.disableClickPropagation(_miniEl);
  L.DomEvent.disableScrollPropagation(_miniEl);
}

const baseLayers = {
  sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {attribution:'© Esri', maxZoom:18}),
};
let currentBase = baseLayers.sat.addTo(map);

/* ============ Layer groups ============ */
const trackLayer = L.layerGroup().addTo(map);
const wpLayer = L.layerGroup().addTo(map);
const escapeLayer = L.layerGroup().addTo(map);
const networkLayer = L.layerGroup().addTo(map);

/* ============ Computed: all elev range ============ */
let minE = 0, maxE = 5000;
function recomputeElevRange() {
  const allElevs = [];
  DATA.trails.forEach(t => {
    if(state.activeTrails && !isTrailActive(t)) return;
    t.track.forEach(p => allElevs.push(p[2]));
  });
  if(allElevs.length) {
    minE = Math.min(...allElevs);
    maxE = Math.max(...allElevs);
  } else {
    minE = 0; maxE = 5000;
  }
}

/* ============ Color helpers ============ */
// 天数分色：柔和但有区分度，适合卫星图与米色面板上的连续天数阅读
const dayPalette = ['#2F6B5F','#D96C4A','#E1A93B','#5577B8','#8A6BBE','#C45D83','#5E9F65','#C58B54'];

function elevColor(e) {
  const t = Math.max(0, Math.min(1, (e - minE) / (maxE - minE)));
  // 6-stop gradient
  const stops = [
    [0.00, [59,130,246]],   // blue
    [0.20, [6,182,212]],    // cyan
    [0.40, [132,204,22]],   // lime
    [0.60, [250,204,21]],   // yellow
    [0.80, [249,115,22]],   // orange
    [1.00, [239,68,68]],    // red
  ];
  for(let i=0;i<stops.length-1;i++){
    if(t>=stops[i][0] && t<=stops[i+1][0]){
      const r=(t-stops[i][0])/(stops[i+1][0]-stops[i][0]);
      const c1=stops[i][1], c2=stops[i+1][1];
      return `rgb(${Math.round(c1[0]+(c2[0]-c1[0])*r)},${Math.round(c1[1]+(c2[1]-c1[1])*r)},${Math.round(c1[2]+(c2[2]-c1[2])*r)})`;
    }
  }
  return 'rgb(239,68,68)';
}

/* ============ Draw Track ============ */
function drawTracks() {
  trackLayer.clearLayers();
  networkLayer.clearLayers();
  if(!state.showTrack) return;
  recomputeElevRange();

  const isWaypointMode = state.mode === 'waypoint';

  // 按trail绘制：先非主，后主（主轨迹在上层）
  const ordered = [
    ...DATA.trails.filter(t => t.id !== state.primaryTrailId),
    ...DATA.trails.filter(t => t.id === state.primaryTrailId)
  ];

  ordered.forEach(trail => {
    if(!isTrailActive(trail)) return;
    const track = trail.track;
    if(track.length < 2) return;
    const isMain = (trail.id === state.primaryTrailId);

    // 标注点对比模式：非主轨迹画浅色虚线
    if(isWaypointMode && !isMain) {
      const latlngs = track.map(p => [p[0], p[1]]);
      const line = L.polyline(latlngs, {
        color: trail.color || '#888',
        weight: 1.8,
        opacity: 0.45,
        dashArray: '4,6',
      });
      line.bindTooltip(trail.name, {sticky: true});
      line.on('click', () => {
        if(measureState.active) return;  // 测距模式下不切换主轨迹
        if(typeof segmentState !== 'undefined' && segmentState.active) return; // 分段模式下不切换
        state.primaryTrailId = trail.id;
        rebuildAll({fit: false});
        saveToStorage();
      });
      line.addTo(trackLayer);
      return;
    }

    const baseOpacity = isMain ? 0.95 : 0.4;
    const baseWeight = isMain ? 4.5 : 2.5;
    const opacity = state.activeEscape ? baseOpacity * 0.35 : baseOpacity;
    const weight = state.activeEscape ? Math.max(1, baseWeight - 1.5) : baseWeight;

    // 标注点对比模式下的主轨迹：强制走海拔渐变
    const renderMode = (isWaypointMode && isMain) ? 'elev' : state.mode;

    if(renderMode === 'day' && !isMain) {
      // 非主轨迹：单 polyline 一种颜色，性能最好
      const latlngs = track.map(p => [p[0], p[1]]);
      const line = L.polyline(latlngs, {
        color: trail.color, weight, opacity, smoothFactor: 1, lineCap:'round',
      });
      line.__trail = trail;
      // v1.29.0：mousemove 用 rAF 节流；测距/分段模式下完全禁用（避免 pointer 事件阻塞）
      let _rafId = null;
      line.on('mouseover mousemove', e => {
        if(measureState.active || (typeof segmentState !== 'undefined' && segmentState.active)) return;
        if(_rafId) return;
        _rafId = requestAnimationFrame(() => {
          _rafId = null;
          const ll = e.latlng;
          const i = nearestTrackIdx(track, ll.lat, ll.lng);
          showTooltip(e, track[i], track[Math.min(i+1, track.length-1)], trail);
        });
      });
      line.on('mouseout', () => {
        if(_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
        hideTooltip();
      });
      trackLayer.addLayer(line);
      return;
    }

    // 主轨迹（按天分色）或海拔渐变模式：按颜色分组成多个 polyline
    // 主轨迹海拔渐变 / 天数模式下加 Bloom 外发光（保持杂志风的暖色辉光）
    const isElevMain = isMain && renderMode === 'elev';
    const isDayMain = isMain && renderMode === 'day';
    if((isElevMain || isDayMain) && !state.activeEscape) {
      const allLatLngs = track.map(p => [p[0], p[1]]);
      // 暖色辉光：白光 + 米黄
      const bloomOuter = L.polyline(allLatLngs, {
        color: '#ffffff', weight: weight + 5, opacity: 0.32,
        smoothFactor: 1, lineCap:'round', lineJoin:'round', interactive: false,
      });
      const bloomInner = L.polyline(allLatLngs, {
        color: '#FAF6EA', weight: weight + 2.5, opacity: 0.42,
        smoothFactor: 1, lineCap:'round', lineJoin:'round', interactive: false,
      });
      trackLayer.addLayer(bloomOuter);
      trackLayer.addLayer(bloomInner);
    }

    let curColor = null, curPath = [];
    const flush = () => {
      if(curPath.length < 2) return;
      const line = L.polyline(curPath, {
        color: curColor, weight, opacity, smoothFactor: 1, lineCap:'round',
      });
      line.__trail = trail;
      // v1.29.0：mousemove 用 rAF 节流；测距/分段模式下完全禁用（避免 pointer 事件阻塞）
      let _rafId = null;
      line.on('mouseover mousemove', e => {
        if(measureState.active || (typeof segmentState !== 'undefined' && segmentState.active)) return;
        if(_rafId) return;
        _rafId = requestAnimationFrame(() => {
          _rafId = null;
          const ll = e.latlng;
          const i = nearestTrackIdx(track, ll.lat, ll.lng);
          showTooltip(e, track[i], track[Math.min(i+1, track.length-1)], trail);
        });
      });
      line.on('mouseout', () => {
        if(_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
        hideTooltip();
      });
      trackLayer.addLayer(line);
    };
    for(let i=0; i<track.length; i++) {
      const a = track[i];
      const b = track[Math.min(i+1, track.length-1)];
      let color;
      if(renderMode === 'day') {
        color = dayPalette[(a[5]-1) % dayPalette.length];
      } else {
        color = elevColor((a[2]+b[2])/2);
      }
      if(color !== curColor) {
        flush();
        curColor = color;
        curPath = i > 0 ? [[track[i-1][0], track[i-1][1]], [a[0], a[1]]] : [[a[0], a[1]]];
      } else {
        curPath.push([a[0], a[1]]);
      }
    }
    flush();
  });
}

// 用于鼠标悬停时找最近轨迹点
function nearestTrackIdx(track, lat, lng) {
  let best = 0, bestD = Infinity;
  for(let i=0; i<track.length; i+=Math.max(1, Math.floor(track.length/200))) {
    const dx = track[i][0] - lat, dy = track[i][1] - lng;
    const d = dx*dx + dy*dy;
    if(d < bestD) { bestD = d; best = i; }
  }
  // 在最佳点附近精修
  const lo = Math.max(0, best - 20), hi = Math.min(track.length, best + 20);
  for(let i=lo; i<hi; i++) {
    const dx = track[i][0] - lat, dy = track[i][1] - lng;
    const d = dx*dx + dy*dy;
    if(d < bestD) { bestD = d; best = i; }
  }
  return best;
}


/* ============ Waypoints ============ */
const tagColors = {
  start:'#5eb3ff', end:'#5eb3ff',
  fork:'#ff8c42',
  camp:'#22c55e',
  pass:'#ef4444',
  water:'#3b82f6',
  supply:'#facc15',
  warn:'#dc2626',
  shelter:'#a855f7',
  village:'#d97706',
  bridge:'#06b6d4',
  river:'#06b6d4',
  other:'#94a3b8',
};
const tagIcons = {
  start:'🚩',
  end:'🏁',
  fork:'⑫',
  camp:'🏕',
  pass:'🏔',
  water:'💧',
  supply:'🏪',
  warn:'⚠',
  shelter:'🏠',
  village:'🏘',
  bridge:'🌉',
  river:'🏞',
  highpoint:'⛰',
  other:'📍',
  view:'📍',
};
function waypointIcon(wpOrTag) {
  const tag = typeof wpOrTag === 'string' ? wpOrTag : (wpOrTag && wpOrTag.tag);
  return tagIcons[tag] || (wpOrTag && wpOrTag.icon) || '📍';
}
const tagLabels = {
  start:'起终点', end:'起终点',
  fork:'分叉点', camp:'营地', pass:'垭口',
  water:'水源', supply:'补给', warn:'高强度',
  shelter:'庇护', village:'村落/牧民', bridge:'桥/河',
  river:'小溪', other:'其他'
};

const wpMarkers = {};

function drawWaypoints() {
  wpLayer.clearLayers();
  Object.keys(wpMarkers).forEach(k => delete wpMarkers[k]);
  if(!state.showLabel) {
    drawHighPoints();
    return;
  }

  const isWpMode = state.mode === 'waypoint';

  DATA.trails.forEach(trail => {
    // 标注点模式忽略 activeTrails，所有轨迹的标注点都可见；其他模式只显示叠加中的
    if(!isWpMode && !isTrailActive(trail)) return;
    const isPrimary = trail.id === state.primaryTrailId;

    if(isWpMode) {
      // 标注点对比模式：所有显示中的轨迹都显示选中类别的标注点
      // v1.14.1：与普通模式统一走 state.visibleTags（反射 modeVisibleTags.waypoint）
      trail.waypoints.forEach(wp => {
        if(!state.visibleTags.has(wp.tag)) return;
        addWpMarker(trail, wp, isPrimary);
      });
    } else {
      // 普通模式：只显示主轨迹的标注点
      if(!isPrimary) return;
      trail.waypoints.forEach(wp => {
        if(!state.visibleTags.has(wp.tag)) return;
        addWpMarker(trail, wp, true);
      });
    }
  });
  drawHighPoints();
}
function showHelp() {
  let modal = document.getElementById('help-modal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'help-modal';
    modal.className = 'modal-mask';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:640px;max-height:85vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3 data-i18n="help.title" style="margin:0">${t('help.title')}</h3>
          <button class="btn-mini" onclick="document.getElementById('help-modal').classList.remove('open')" data-i18n="changelog.close">${t('changelog.close')}</button>
        </div>
        <div id="help-body" style="font-size:12px;line-height:1.7;color:var(--text-base)"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
  }
  const body = modal.querySelector('#help-body');
  const isZh = currentLang === 'zh';
  body.innerHTML = isZh ? `
    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📌 这是什么</h4>
    <p>多条徒步路线在同一张地图上对比的工具。支持 KML 文件导入（两步路、Strava、Gaia GPS、Garmin、All Trails 等所有户外平台均可导出 KML）。</p>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">🚀 基本流程</h4>
    <ol style="padding-left:18px;margin:6px 0">
      <li>点 <b>+ 添加轨迹</b> 上传一个或多个 KML 文件</li>
      <li>导入时直接编辑轨迹的 <b>ID</b> 和 <b>来源链接</b></li>
      <li>第一条自动设为主轨迹，可在轨迹列表点 <b>设为主轨迹</b> 切换</li>
      <li>点 <b>📤 导出</b>：打包当前组轨迹为 KML ZIP（可跨设备一键导入），或导出行程 MD</li>
    </ol>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">🎨 显示模式</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>海拔模式</b>：蓝→红表示低→高，看起伏</li>
      <li><b>标注点模式</b>：主轨迹海拔渐变 + 其他轨迹浅虚线，勾选类别标注点对比显示</li>
      <li><b>行程页</b>：点击“行程”后地图自动按天分色</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">🛠 顶部按钮</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>❓ 帮助</b>：打开本说明</li>
      <li><b>🎯 复位</b>：地图回到主轨迹中心 + 适合缩放</li>
      <li><b>🗑 清空</b>：删除所有轨迹（带确认）</li>
      <li><b>📤 导出</b>：打包当前组轨迹为 KML ZIP，或行程 MD</li>
      <li><b>📏 测距</b>：在主轨迹上选两点，计算里程 / 爬升 / 下降（见下方详细说明）</li>
      <li><b>📍 标注</b>：在主轨迹附近点选新增手动标注点</li>
      <li><b>⚡ 下撤</b>：手动选择 A/B 生成下撤路线</li>
      <li><b>+ 轨迹</b>：上传新 KML</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📏 测距工具</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>点 <b>📏 测距</b> 进入测距模式（鼠标变十字准线）</li>
      <li>在地图主轨迹上点击 <b>A 点</b>，再点击 <b>B 点</b></li>
      <li>也可以直接 <b>点击右下角海拔图</b> 在地图上定位对应点</li>
      <li>海拔图内直接标注 <b>A/B</b> 海拔，最高点/最低点仅用红蓝点区分；里程单独显示，爬升/下降使用右上统计位</li>
      <li>测距浮动按钮保留 <b>🔄 重新选点</b>、<b>⇄ 反向</b> 与 <b>✕ 退出</b></li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">⇄ 轨迹反向</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>轨迹卡片底部点 <b>⇄ 反向</b>，翻转走向</li>
      <li>里程 / 爬升 / 下降 / 天数分色 / 标注点 km 全部重算</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📊 右下角海拔图</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>默认显示主轨迹完整海拔剖面（左下角悬浮卡片）</li>
      <li>测距模式选完 A/B 后自动切换为 <b>路段海拔图</b>，退出恢复</li>
      <li>图内 <b>Hover</b>：十字准线 + 里程/海拔/爬升提示</li>
      <li>图内 <b>点击</b>：地图标记并 panTo 对应轨迹点（3 秒消失）</li>
      <li>图内显示当前路段 <b>↑爬升 / ↓下降</b> 与测距结果</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📍 标注点交互</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>点击</b>：固定显示卡片（× 关闭）</li>
      <li>卡片中 <b>点击图片</b>：全屏放大，支持双指/滚轮缩放 + 拖动</li>
      <li><b>右键</b>地图可手动添加标注点（标记 [手动]）</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📋 侧栏 4 个 Tab</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>轨迹</b>：列出所有轨迹，可设主、改 ID/链接、反向、删除、显示/隐藏</li>
      <li><b>标注点</b>：勾选要显示的标注点类别</li>
      <li><b>行程</b>：主轨迹按天列表 + 营地/最高点</li>
      <li><b>下撤</b>：自动检测营地→最近出口的下撤路线（点击高亮）</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">💡 提示</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>顶部栏显示 <b>当前主轨迹</b> 的里程/爬升/下降/最高</li>
      <li>侧栏 <b>⟩</b> 收起；地图右侧 <b>⟨</b> 展开；海拔图位置自动跟随</li>
      <li><b>双击</b>标题可改名</li>
      <li>右下角 <b>${APP_VERSION} 📝</b> 查看完整更新日志</li>
      <li>数据存 IndexedDB，刷新不丢，导出可离线分享</li>
    </ul>
  ` : `
    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📌 What is this</h4>
    <p>Compare multiple hiking trails on one map. Supports KML from 2bulu, Strava, Gaia GPS, Garmin, All Trails, and any outdoor platform.</p>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">🚀 Quick Start</h4>
    <ol style="padding-left:18px;margin:6px 0">
      <li>Click <b>+ Add Trail</b> to upload KML files</li>
      <li>Edit trail <b>ID</b> and <b>source URL</b> in the upload panel</li>
      <li>First trail becomes main; click <b>Set as Main</b> to switch</li>
      <li>Click <b>📤 Export</b> to save as a single offline HTML</li>
    </ol>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">🎨 Display Modes</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>Elevation</b>: blue→red = low→high</li>
      <li><b>Waypoints</b>: main trail elevation gradient, others dashed</li>
      <li><b>Itinerary</b>: opening the Itinerary tab automatically colors the map by day</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">🛠 Top Buttons</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>❓ Help</b>: this guide</li>
      <li><b>🎯 Reset</b>: zoom to main trail</li>
      <li><b>🗑 Clear</b>: remove all trails (confirm)</li>
      <li><b>📤 Export</b>: pack active group as KML ZIP, or itinerary MD</li>
      <li><b>📏 Measure</b>: pick two points on main trail → distance / ascent / descent</li>
      <li><b>📍 Mark</b>: add a manual waypoint near the primary trail</li>
      <li><b>⚡ Escape</b>: manually pick A/B for an escape route</li>
      <li><b>+ Trail</b>: upload new KML</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📏 Measure Tool</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>Click <b>📏 Measure</b> → crosshair cursor</li>
      <li>Click <b>point A</b> then <b>point B</b> on the main trail</li>
      <li>Or click the <b>elevation chart</b> to pan to any point</li>
      <li>The elevation chart labels <b>A/B</b> elevations directly; high and low points are color dots only, with distance separate and ascent/descent in the top-right stats</li>
      <li>The measure floating controls only keep <b>🔄 Reset</b> and <b>✕ Exit</b></li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">⇄ Reverse Trail</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>Click <b>⇄ Reverse</b> on any trail card to flip direction</li>
      <li>Distance / ascent / descent / day colors / waypoint km all recalculated</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📊 Elevation Chart (bottom-right)</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>Always shows main trail elevation profile</li>
      <li>In measure mode with A+B: switches to <b>segment view</b>, restores on exit</li>
      <li><b>Hover</b>: crosshair + km / elev / cumulative ascent tooltip</li>
      <li><b>Click</b>: map marker + panTo corresponding point (3s auto-remove)</li>
      <li>The chart shows <b>↑ascent / ↓descent</b> plus measure stats for the current view</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📍 Waypoints</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>Click</b>: pin card (× to close)</li>
      <li><b>Click photo</b>: fullscreen with pinch/scroll zoom + drag</li>
      <li><b>Right-click map</b>: add manual waypoint</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">📋 Sidebar Tabs</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li><b>Trails</b>: set main, edit, reverse, delete, toggle visibility</li>
      <li><b>Waypoints</b>: filter categories</li>
      <li><b>Itinerary</b>: day breakdown for main trail</li>
      <li><b>Escape</b>: auto-detected camp→exit routes (click to highlight)</li>
    </ul>

    <h4 style="color:var(--accent);margin:12px 0 6px;font-size:13px">💡 Tips</h4>
    <ul style="padding-left:18px;margin:6px 0">
      <li>Header shows <b>current main trail</b> stats only</li>
      <li>Sidebar <b>⟩</b> collapse; map edge <b>⟨</b> expand; elevation chart auto-follows</li>
      <li><b>Double-click</b> title to rename</li>
      <li>Bottom-right <b>${APP_VERSION} 📝</b> for changelog</li>
      <li>Data in IndexedDB (refresh-safe); export for offline sharing</li>
    </ul>
  `;
  modal.classList.add('open');
}


function addWpMarker(trail, wp, isPrimary) {
      const color = tagColors[wp.tag] || '#aaa';
      const isWpMode = state.mode === 'waypoint';
      // waypoint 模式 + 非主轨迹：只显示 emoji 图标（无 km·elev label），但颜色和主轨迹一样深
      const onlyEmoji = isWpMode && !isPrimary;
      // waypoint 模式下所有显示中轨迹的标注点都是全色（用户要求）
      const labelOpacity = isWpMode ? 1 : (isPrimary ? 1 : 0.7);
      const labelBorder = color;
      const iconText = waypointIcon(wp);
      const dayBadge = wp.day != null ? `<span class="wp-day-badge">D${wp.day}</span>` : '';
      const label = onlyEmoji ? '' : `<div class="wp-marker-label" style="color:${color};border-color:${labelBorder};opacity:${labelOpacity}">${dayBadge}${wp.km}km · ${wp.elev}m</div>`;
      const emojiSize = onlyEmoji ? 'font-size:16px;' : '';
      const emojiShadow = onlyEmoji ? 'filter:drop-shadow(0 1px 2px rgba(0,0,0,0.7));' : '';
      const html = `<div style="display:flex;align-items:center;gap:4px">
        <span class="wp-marker-emoji" style="opacity:${labelOpacity};${emojiSize}${emojiShadow}">${iconText}</span>
        ${label}
      </div>`;
      const icon = L.divIcon({ html, className:'', iconSize:[null, 24], iconAnchor:[12,12] });
      const m = L.marker([wp.lat, wp.lng], { icon, zIndexOffset: isPrimary ? 700 : 600, opacity: 1 });
      const photoHtml = wp.photo ? `<img src="${wp.photo}" loading="lazy" style="max-width:240px;max-height:180px;border-radius:4px;margin-top:6px;display:block;cursor:zoom-in" onerror="this.style.display='none'" onclick="openLightbox('${wp.photo.replace(/'/g, '%27')}', '${(iconText + ' ' + wp.label).replace(/'/g, '%27')}')">` : '';
      // 点击标注点 → 固定显示卡片；卡片中点图片再放大
      m.on('click', e => pinWpCard(e, wp, trail));
      m.addTo(wpLayer);
      wpMarkers[`${trail.id}#${wp.id}`] = m;
}

function drawHighPoints() {
  // 根据当前模式决定是否显示
  const isWpMode = state.mode === 'waypoint';
  // v1.14.1：统一走 state.visibleTags（getter 自动反射 modeVisibleTags[当前模式]）
  const showInThisMode = state.visibleTags.has('highpoint');

  DATA.trails.forEach(trail => {
    // 标注点模式忽略 activeTrails
    if(!isWpMode && !isTrailActive(trail)) return;
    if(!showInThisMode) return;
    // waypoint 模式下，非主轨迹也显示，但要标识
    const isMainCheck = trail.id === state.primaryTrailId;
    if(!isWpMode && !isMainCheck) {
      // 普通模式下只画主轨迹（保持原逻辑）
      // 不过这里允许所有显示中轨迹都画——保持原行为，每条都画
    }
    const track = trail.track;
    if(!track || track.length === 0) return;
    let maxIdx = 0, maxE = -Infinity;
    for(let i=0; i<track.length; i++) {
      const e = track[i][2];
      if(typeof e === 'number' && isFinite(e) && e > maxE) { maxE = e; maxIdx = i; }
    }
    if(maxE === -Infinity) return;  // 整条轨迹无有效海拔
    const p = track[maxIdx];
    const isMain = trail.id === state.primaryTrailId;
    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto">
        <div style="font-size:18px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6))">⛰</div>
        <div style="background:${trail.color};color:#fff;font-size:10px;padding:2px 6px;border-radius:3px;margin-top:2px;white-space:nowrap;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.3)">${maxE} m</div>
      </div>
    `;
    const icon = L.divIcon({ html, className:'', iconSize:[null, 36], iconAnchor:[12, 30] });
    const m = L.marker([p[0], p[1]], { icon, zIndexOffset: isMain ? 800 : 750, opacity: isMain ? 1 : 0.85 });
    m.bindPopup(`
      <div class="popup-content">
        <h4>⛰ ${trail.name} 最高点</h4>
        <div class="pmeta">海拔 <b>${maxE}</b> m</div>
        <div class="pmeta">里程 <b>${p[3]}</b> km</div>
      </div>
    `, { maxWidth: 260 });
    m.addTo(wpLayer);
  });
}

/* ============ Tooltip ============ */
const tooltipEl = document.getElementById('tooltip');

/* ============ Waypoint Photo Hover ============ */
const wpPhotoEl = document.getElementById('wp-photo-tip');
function pinWpCard(e, wp, trail) {
  // 点击标注点 → 固定显示卡片，卡片中图片可点击放大
  const photoSrc = wp.photo || '';
  const iconText = waypointIcon(wp);
  const photoHtml = photoSrc ? `<img id="pin-card-img" src="${photoSrc}" loading="lazy" style="display:block;max-width:260px;max-height:200px;border-radius:4px;cursor:zoom-in" onerror="this.style.display='none'">` : '';
  const trailLine = trail ? `<div style="color:${trail.color || '#aaa'};font-size:10px;font-weight:600;margin-bottom:3px">${t('popup.trailLabel')}: ${trail.name}</div>` : '';
  const descLine = wp.name && wp.name !== wp.label ? `<div style="color:#cfd6e0;font-size:10px;margin-top:3px;line-height:1.4;max-width:260px">${wp.name}</div>` : '';
  wpPhotoEl.innerHTML = `
    <button id="pin-card-close" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.4);border:none;color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;padding:0">×</button>
    ${trailLine}
    ${photoHtml}
    <div style="color:#cfd6e0;font-size:11px;margin-top:${photoHtml ? '4px' : '0'};padding:0 2px">${iconText} <b>${wp.label}</b> · ${wp.km}${t('header.km')} · ${wp.elev}m</div>
    ${descLine}
    ${photoSrc ? `<div style="color:var(--text-dim);font-size:9px;margin-top:3px">${t('popup.clickPhotoZoom')}</div>` : ''}
  `;
  wpPhotoEl.style.display = 'block';
  wpPhotoEl.style.pointerEvents = 'auto';  // 卡片接收事件（关闭按钮+图片点击）
  const oe = e.originalEvent;
  // 显示在地图视口中央偏上（避免被 marker 遮挡）
  const x = Math.min(Math.max(oe.clientX - 140, 10), window.innerWidth - 290);
  const y = Math.min(Math.max(oe.clientY + 20, 10), window.innerHeight - 280);
  wpPhotoEl.style.left = x + 'px';
  wpPhotoEl.style.top = y + 'px';

  // 关闭按钮
  const closeBtn = document.getElementById('pin-card-close');
  if(closeBtn) closeBtn.onclick = (ev) => { ev.stopPropagation(); hideWpPhoto(); };
  // 图片点击放大
  const imgEl = document.getElementById('pin-card-img');
  if(imgEl) imgEl.onclick = (ev) => {
    ev.stopPropagation();
    openLightbox(photoSrc, `${iconText} ${wp.label} · ${wp.km}${t('header.km')} · ${wp.elev}m`);
  };

  // 阻止事件冒泡到地图（否则 map click 会立即关掉）
  if(oe) oe.stopPropagation && oe.stopPropagation();
}

function hideWpPhoto() {
  wpPhotoEl.style.display = 'none';
  wpPhotoEl.style.pointerEvents = 'none';
}

// 点击地图空白处 → 关闭卡片
if(typeof map !== 'undefined' && map && !window.__wpCardMapBound) {
  window.__wpCardMapBound = true;
  map.on('click', () => hideWpPhoto());
}

function showTooltip(e, a, b, trail, heat) {
  // a[4] = 累计爬升，通过 trail 反查累计下降
  let descVal = '-';
  if(trail && trail._descCum && a[3] !== undefined) {
    // 找最近索引的累计下降
    const idx = trail.track ? trail.track.findIndex(p => p[3] >= a[3]) : -1;
    if(idx >= 0 && trail._descCum[idx] !== undefined) descVal = Math.round(trail._descCum[idx]) + ' m';
  }
  let html = `
    <div class="row"><span class="lab">里程</span><span class="val">${a[3]} km</span></div>
    <div class="row"><span class="lab">海拔</span><span class="val">${a[2]} m</span></div>
    <div class="row"><span class="lab">爬升</span><span class="val">${a[4]} m</span></div>
    <div class="row"><span class="lab">下降</span><span class="val">${descVal}</span></div>
    <div class="row"><span class="lab">天数</span><span class="val">D${a[5]}</span></div>
    <div class="row"><span class="lab">轨迹</span><span style="color:${trail.color}">${trail.name}</span></div>
  `;
  if(heat !== undefined) {
    html += `<div class="row"><span class="lab">重合度</span><span class="val">${heat}x</span></div>`;
  }
  tooltipEl.innerHTML = html;
  tooltipEl.style.display = 'block';
  tooltipEl.style.left = e.originalEvent.clientX + 'px';
  tooltipEl.style.top = e.originalEvent.clientY + 'px';
}
function hideTooltip() { tooltipEl.style.display = 'none'; }

/* ============ Escape ============ */
function showEscape(trailId, escapeId) {
  escapeLayer.clearLayers();
  state.activeEscape = null;
  drawTracks();  // 重绘以淡化

  if(!escapeId) return;
  const trail = DATA.trails.find(t => t.id === trailId);
  if(!trail) return;
  const r = trail.escape_routes.find(e => e.id === escapeId);
  if(!r) return;

  state.activeEscape = escapeId;
  drawTracks();  // 再画一次（淡化版）

  const pl = L.polyline(r.line, {
    color:'#ff3030', weight:5.5, opacity:0.95,
    dashArray:'10,8', lineCap:'round',
  }).addTo(escapeLayer);

  const decorator = L.polylineDecorator(pl, {
    patterns: [{
      offset:'5%', repeat:'10%',
      symbol: L.Symbol.arrowHead({ pixelSize:10, polygon:false, pathOptions:{stroke:true, color:'#fff', weight:2.5}})
    }]
  }).addTo(escapeLayer);

  map.flyToBounds(pl.getBounds().pad(0.2), {duration:0.8});
}

function clearEscape() {
  escapeLayer.clearLayers();
  state.activeEscape = null;
  drawTracks();
  document.querySelectorAll('.escape-item').forEach(el => el.classList.remove('active'));
}

/* ============ Build sidebar ============ */
function buildHeaderStats() {
  const card = document.getElementById('primary-card');
  const toolbarContext = document.getElementById('toolbar-context');
  if(!card) return;
  const main = state.activeGroup == null ? null : DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main) {
    // v1.20.0：区分"未选中分组"和"没有轨迹/主轨迹"两种空态
    const emptyKey = (state.activeGroup == null && DATA.trails.length > 0)
      ? 'pc.emptyGroup'
      : 'pc.empty';
    card.innerHTML = `<div style="font-size:11px;color:var(--text-muted);font-style:italic;text-align:center;padding:20px 4px">${t(emptyKey)}</div>`;
    if(toolbarContext) toolbarContext.textContent = DATA.trails.length ? 'NO ACTIVE GROUP' : 'NO TRAIL LOADED';
    return;
  }
  if(toolbarContext) toolbarContext.textContent = `${main.stats.distance_km} KM · ${main.name}`;
  const sourceLink = main.source && main.source.startsWith('http')
    ? `<a href="${main.source}" target="_blank" class="pc-link" title="${main.source}">${t('pc.source')}</a>` : '';
  card.innerHTML = `
    <div class="pc-eyebrow">${t('pc.eyebrow')}</div>
    <div class="pc-name" id="pc-name" title="点击重命名" style="cursor:pointer">${main.name}</div>
    <div class="pc-stats">
      <div class="pc-stat"><b>${main.stats.distance_km}</b><span>${t('pc.distance')}</span></div>
      <div class="pc-stat"><b>${main.days || '-'}</b><span>${(main.days||1) > 1 ? t('pc.daysUnit') : t('pc.dayUnit')}</span></div>
      <div class="pc-stat"><b>${main.stats.ascent_m}</b><span>${t('pc.ascent')}</span></div>
      <div class="pc-stat"><b>${main.stats.descent_m || 0}</b><span>${t('pc.descent')}</span></div>
      <div class="pc-stat"><b>${main.stats.max_elev}</b><span>${t('pc.maxElev')}</span></div>
      <div class="pc-stat"><b>${main.stats.min_elev || '-'}</b><span>${t('pc.minElev')}</span></div>
    </div>
    <div class="pc-actions">
      <a href="#" class="pc-dl-kml" id="pc-dl-kml" title="下载 KML">${t('pc.dlKml')}</a>
      ${sourceLink}
      <a href="#" class="pc-edit-link" id="pc-edit-link" title="编辑链接">${t('pc.editLink')}</a>
    </div>
  `;
  // 绑定事件
  const renameEl = document.getElementById('pc-name');
  if(renameEl) renameEl.addEventListener('click', () => {
    const newName = prompt('Rename primary trail:', main.name);
    if(newName && newName.trim() && newName !== main.name) {
      main.name = newName.trim();
      saveToStorage(); rebuildAll({fit: false});
    }
  });
  const dlBtn = document.getElementById('pc-dl-kml');
  if(dlBtn) dlBtn.addEventListener('click', e => {
    e.preventDefault();
    if(window.downloadTrailKml) window.downloadTrailKml(main.id);
    else if(typeof downloadTrailKML === 'function') downloadTrailKML(main.id);
  });
  const editLinkBtn = document.getElementById('pc-edit-link');
  if(editLinkBtn) editLinkBtn.addEventListener('click', e => {
    e.preventDefault();
    const newLink = prompt('Edit source link:', main.source || '');
    if(newLink !== null) {
      main.source = newLink.trim();
      saveToStorage(); buildHeaderStats();
    }
  });
  // 同步小卡（侧栏收起时显示）
  buildPrimaryMini();
}

const PRIMARY_MINI_POS_KEY = 'hiking_primary_mini_pos';

function clampPrimaryMiniPosition(mini, left, top) {
  const mapEl = document.getElementById('map');
  if(!mapEl) return { left, top };
  const mapRect = mapEl.getBoundingClientRect();
  const miniRect = mini.getBoundingClientRect();
  const w = miniRect.width || 240;
  const h = miniRect.height || 92;
  const margin = 8;
  const maxLeft = Math.max(margin, mapRect.width - w - margin);
  const maxTop = Math.max(margin, mapRect.height - h - margin);
  return {
    left: Math.min(Math.max(margin, left), maxLeft),
    top: Math.min(Math.max(margin, top), maxTop),
  };
}

function applyPrimaryMiniPosition(mini) {
  if(!mini) return;
  try {
    const raw = localStorage.getItem(PRIMARY_MINI_POS_KEY);
    if(!raw) return;
    const pos = JSON.parse(raw);
    if(!pos || !isFinite(pos.left) || !isFinite(pos.top)) return;
    const p = clampPrimaryMiniPosition(mini, pos.left, pos.top);
    mini.style.left = p.left + 'px';
    mini.style.top = p.top + 'px';
    mini.style.right = 'auto';
  } catch(e) {}
}

function schedulePrimaryMiniPositionApply(mini) {
  if(!mini) return;
  requestAnimationFrame(() => applyPrimaryMiniPosition(mini));
  setTimeout(() => applyPrimaryMiniPosition(mini), 280);
  setTimeout(() => applyPrimaryMiniPosition(mini), 360);
}

function savePrimaryMiniPosition(mini) {
  const mapEl = document.getElementById('map');
  if(!mini || !mapEl) return;
  const mapRect = mapEl.getBoundingClientRect();
  const miniRect = mini.getBoundingClientRect();
  try {
    localStorage.setItem(PRIMARY_MINI_POS_KEY, JSON.stringify({
      left: Math.round(miniRect.left - mapRect.left),
      top: Math.round(miniRect.top - mapRect.top),
    }));
  } catch(e) {}
}

function bindPrimaryMiniDrag(mini) {
  if(!mini || mini._dragBound) return;
  mini._dragBound = true;
  let drag = null;

  mini.addEventListener('pointerdown', e => {
    if(e.button !== undefined && e.button !== 0) return;
    const mapEl = document.getElementById('map');
    if(!mapEl) return;
    const mapRect = mapEl.getBoundingClientRect();
    const miniRect = mini.getBoundingClientRect();
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      left: miniRect.left - mapRect.left,
      top: miniRect.top - mapRect.top,
      moved: false,
    };
    mini.setPointerCapture && mini.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  });

  mini.addEventListener('pointermove', e => {
    if(!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if(!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    mini.classList.add('dragging');
    const p = clampPrimaryMiniPosition(mini, drag.left + dx, drag.top + dy);
    mini.style.left = p.left + 'px';
    mini.style.top = p.top + 'px';
    mini.style.right = 'auto';
    e.preventDefault();
    e.stopPropagation();
  });

  const finish = (e, cancelled = false) => {
    if(!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    mini.classList.remove('dragging');
    try { mini.releasePointerCapture && mini.releasePointerCapture(e.pointerId); } catch(err) {}
    e.preventDefault();
    e.stopPropagation();
    if(moved) savePrimaryMiniPosition(mini);
    else if(!cancelled && typeof toggleSidebar === 'function') toggleSidebar(true);
  };
  mini.addEventListener('pointerup', e => finish(e, false));
  mini.addEventListener('pointercancel', e => finish(e, true));
}

function buildPrimaryMini() {
  const mini = document.getElementById('primary-mini');
  if(!mini) return false;
  const main = state.activeGroup == null ? null : DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main) {
    mini.innerHTML = '';
    mini.style.display = 'none';
    return false;
  }
  mini.title = t('mini.openSidebar') + ' / 拖动可移动';
  mini.innerHTML = `
    <div style="font-size:9px;color:#7A6E54;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:4px">${t('mini.primary')}</div>
    <div style="font-size:13px;font-weight:600;color:#1F2A1C;line-height:1.3;margin-bottom:6px;font-family:var(--serif)">${main.name}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 8px;font-size:10px;color:#3F5238">
      <div><b style="font-size:13px;color:#1F2A1C;font-family:var(--serif)">${main.stats.distance_km}</b> ${t('mini.km')}</div>
      <div><b style="font-size:13px;color:#1F2A1C;font-family:var(--serif)">${main.stats.ascent_m}</b> ${t('mini.ascent')}</div>
      <div><b style="font-size:13px;color:#1F2A1C;font-family:var(--serif)">${main.stats.max_elev}</b> ${t('mini.peak')}</div>
    </div>
  `;
  applyPrimaryMiniPosition(mini);
  bindPrimaryMiniDrag(mini);
  return true;
}

function floatingBoundaryRect(mode) {
  if(mode === 'map') {
    const mapEl = document.getElementById('map');
    if(mapEl) return mapEl.getBoundingClientRect();
  }
  return { left:0, top:0, width:window.innerWidth, height:window.innerHeight };
}

function floatingStyleOriginRect(el) {
  if(!el || !el.offsetParent) return { left:0, top:0 };
  return el.offsetParent.getBoundingClientRect();
}

function clampFloatingPanelPosition(el, left, top, mode) {
  const rect = el.getBoundingClientRect();
  const bounds = floatingBoundaryRect(mode);
  const margin = 8;
  const w = rect.width || el.offsetWidth || 300;
  const h = rect.height || el.offsetHeight || 120;
  const maxLeft = Math.max(margin, bounds.width - w - margin);
  const maxTop = Math.max(margin, bounds.height - h - margin);
  return {
    left: Math.min(Math.max(margin, left), maxLeft),
    top: Math.min(Math.max(margin, top), maxTop),
  };
}

function setFloatingPanelStyle(el, pos, mode) {
  const bounds = floatingBoundaryRect(mode);
  const origin = floatingStyleOriginRect(el);
  el.style.left = (bounds.left - origin.left + pos.left) + 'px';
  el.style.top = (bounds.top - origin.top + pos.top) + 'px';
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.style.transform = 'none';
}

function applyFloatingPanelPosition(el, opts) {
  if(!el || !opts || !opts.storageKey) return;
  try {
    const raw = localStorage.getItem(opts.storageKey);
    if(!raw) return;
    const pos = JSON.parse(raw);
    if(!pos || !isFinite(pos.left) || !isFinite(pos.top)) return;
    const p = clampFloatingPanelPosition(el, pos.left, pos.top, opts.mode);
    setFloatingPanelStyle(el, p, opts.mode);
  } catch(e) {}
}

function resetFloatingPanelPosition(el, opts) {
  if(!el || !opts) return;
  try { if(opts.storageKey) localStorage.removeItem(opts.storageKey); } catch(e) {}
  const defaults = opts.defaultStyle || {};
  ['left','right','top','bottom','transform'].forEach(k => {
    el.style[k] = defaults[k] != null ? defaults[k] : '';
  });
}

function bindFloatingPanelDrag(el, opts) {
  if(!el || el._floatingDragBound) return;
  el._floatingDragBound = true;
  const handle = opts.handleSelector ? el.querySelector(opts.handleSelector) : el;
  if(!handle) return;
  let drag = null;
  el._applyFloatingPosition = () => applyFloatingPanelPosition(el, opts);
  el._resetFloatingPosition = () => resetFloatingPanelPosition(el, opts);
  if(typeof L !== 'undefined' && L.DomEvent) {
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }

  handle.addEventListener('pointerdown', e => {
    if(e.button !== undefined && e.button !== 0) return;
    if(e.target && e.target.closest && e.target.closest('button,a,input,textarea,select')) return;
    const bounds = floatingBoundaryRect(opts.mode);
    const rect = el.getBoundingClientRect();
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      left: rect.left - bounds.left,
      top: rect.top - bounds.top,
      moved: false,
    };
    handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  });

  handle.addEventListener('pointermove', e => {
    if(!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if(!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    el.classList.add('floating-dragging');
    const p = clampFloatingPanelPosition(el, drag.left + dx, drag.top + dy, opts.mode);
    setFloatingPanelStyle(el, p, opts.mode);
    e.preventDefault();
    e.stopPropagation();
  });

  const finish = e => {
    if(!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    el.classList.remove('floating-dragging');
    try { handle.releasePointerCapture && handle.releasePointerCapture(e.pointerId); } catch(err) {}
    e.preventDefault();
    e.stopPropagation();
    if(moved && opts.storageKey) {
      const bounds = floatingBoundaryRect(opts.mode);
      const rect = el.getBoundingClientRect();
      const p = clampFloatingPanelPosition(el, rect.left - bounds.left, rect.top - bounds.top, opts.mode);
      try { localStorage.setItem(opts.storageKey, JSON.stringify({left:Math.round(p.left), top:Math.round(p.top)})); } catch(err) {}
    }
  };
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', finish);
  handle.addEventListener('dblclick', e => {
    if(e.target && e.target.closest && e.target.closest('button,a,input,textarea,select')) return;
    e.preventDefault();
    e.stopPropagation();
    resetFloatingPanelPosition(el, opts);
  });
  applyFloatingPanelPosition(el, opts);
}

function initFloatingPanelPositions() {
  bindFloatingPanelDrag(document.getElementById('elev-bar'), {
    storageKey: 'hiking_elev_bar_pos',
    mode: 'map',
    handleSelector: '[data-panel-drag]',
    defaultStyle: { left:'14px', right:'auto', top:'auto', bottom:'28px', transform:'' },
  });
  bindFloatingPanelDrag(document.getElementById('measure-panel'), {
    storageKey: 'hiking_measure_panel_pos',
    mode: 'viewport',
    handleSelector: '[data-panel-drag]',
    defaultStyle: { left:'50%', right:'auto', top:'80px', bottom:'auto', transform:'translateX(-50%)' },
  });
}

// 更新当前模式 · 标注点 标题
function updateModeTagTitle() {
  const el = document.getElementById('mode-tag-title');
  if(!el) return;
  const key = 'mode.tagTitle.' + state.mode;
  el.textContent = t(key);
}

// 生成轨迹缩略图：左侧轨迹形状（GPS 平面投影 + 类等高线底） + 右侧海拔迷你图
function buildTrailThumbnail(tr) {
  const W = 280, H = 60;
  const pad = 4;
  const track = tr.track || [];
  if(track.length < 2) return '';
  // 左侧 33% 区域：地图轨迹（lat/lng 投影到 box）
  const mapW = Math.floor(W * 0.34) - pad * 2;
  const mapH = H - pad * 2;
  const lats = track.map(p => p[0]);
  const lngs = track.map(p => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latR = maxLat - minLat || 1, lngR = maxLng - minLng || 1;
  // 等比缩放
  const aspectMap = mapW / mapH;
  const aspectGeo = lngR / latR;
  let mw, mh;
  if(aspectGeo > aspectMap) { mw = mapW; mh = mapW / aspectGeo; }
  else { mh = mapH; mw = mapH * aspectGeo; }
  const mox = pad + (mapW - mw) / 2;
  const moy = pad + (mapH - mh) / 2;
  const proj = (lat, lng) => [
    mox + ((lng - minLng) / lngR) * mw,
    moy + (1 - (lat - minLat) / latR) * mh,
  ];
  // 抽稀：最多 80 个点
  const stride = Math.max(1, Math.floor(track.length / 80));
  const mapPts = [];
  for(let i = 0; i < track.length; i += stride) mapPts.push(proj(track[i][0], track[i][1]));
  if(mapPts[mapPts.length-1][0] !== proj(track[track.length-1][0], track[track.length-1][1])[0])
    mapPts.push(proj(track[track.length-1][0], track[track.length-1][1]));
  const mapPath = 'M ' + mapPts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L ');
  // 起终点
  const startPt = mapPts[0], endPt = mapPts[mapPts.length-1];
  // 山顶（最高海拔点）在地图上的位置
  let peakIdxAll = 0, maxAlt = -Infinity;
  for(let i=0; i<track.length; i++) {
    if((track[i][2] || 0) > maxAlt) { maxAlt = track[i][2] || 0; peakIdxAll = i; }
  }
  const peakMapPt = proj(track[peakIdxAll][0], track[peakIdxAll][1]);

  // 右侧 65% 区域：迷你海拔
  const elevX = Math.floor(W * 0.36) + pad;
  const elevW = W - elevX - pad;
  const elevH = H - pad * 2;
  const eY = pad;
  const alts = track.map(p => p[2]);
  const minE = Math.min(...alts), maxE = Math.max(...alts);
  const eR = maxE - minE || 1;
  const eStride = Math.max(1, Math.floor(track.length / 70));
  const ePts = [];
  for(let i = 0; i < track.length; i += eStride) {
    const x = elevX + (i / (track.length - 1)) * elevW;
    const y = eY + elevH * (1 - (alts[i] - minE) / eR);
    ePts.push([x, y]);
  }
  ePts.push([elevX + elevW, eY + elevH * (1 - (alts[alts.length-1] - minE) / eR)]);
  const elevPath = 'M ' + ePts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L ');
  const elevFill = elevPath + ` L ${elevX + elevW},${eY + elevH} L ${elevX},${eY + elevH} Z`;
  // 海拔图最高点
  const ePeakX = elevX + (peakIdxAll / (track.length - 1)) * elevW;
  const ePeakY = eY + elevH * (1 - (maxE - minE) / eR);
  // 最低点
  let valleyIdxAll = 0, minAlt = Infinity;
  for(let i=0; i<track.length; i++) {
    if((track[i][2] || 0) < minAlt) { minAlt = track[i][2] || 0; valleyIdxAll = i; }
  }
  const eValleyX = elevX + (valleyIdxAll / (track.length - 1)) * elevW;
  const eValleyY = eY + elevH * (1 - (minE - minE) / eR); // 最低点 y = elevH 底部

  const c = tr.color || '#3F5238';

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="width:100%;height:60px;display:block">
      <!-- 整体米色底 -->
      <rect x="0" y="0" width="${W}" height="${H}" fill="#FAF6EA" rx="3"/>
      <!-- 中间分隔线 -->
      <line x1="${Math.floor(W*0.345)}" y1="${pad}" x2="${Math.floor(W*0.345)}" y2="${H-pad}" stroke="#C8B998" stroke-width="0.5" stroke-dasharray="2,2"/>
      <!-- 左：地图轨迹 -->
      <path d="${mapPath}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      <circle cx="${startPt[0].toFixed(1)}" cy="${startPt[1].toFixed(1)}" r="2" fill="#3F5238" stroke="#fff" stroke-width="0.7"/>
      <circle cx="${endPt[0].toFixed(1)}" cy="${endPt[1].toFixed(1)}" r="2" fill="#A8543C" stroke="#fff" stroke-width="0.7"/>
      <!-- 右：海拔填充 -->
      <path d="${elevFill}" fill="${c}" opacity="0.18"/>
      <path d="${elevPath}" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      <!-- 海拔图山顶 -->
      <circle cx="${ePeakX.toFixed(1)}" cy="${ePeakY.toFixed(1)}" r="1.6" fill="#A8543C" stroke="#fff" stroke-width="0.5"/>
      <!-- 海拔 max/min 标签（min 标在最低点附近） -->
      <text x="${ePeakX+4}" y="${ePeakY+3}" font-family="'Source Serif 4',serif" font-size="8" fill="#A8543C" font-style="italic">${Math.round(maxE)}m</text>
      <circle cx="${eValleyX.toFixed(1)}" cy="${eValleyY.toFixed(1)}" r="1.4" fill="#5C7A8C" stroke="#fff" stroke-width="0.4"/>
      <text x="${eValleyX+4}" y="${eValleyY-2}" font-family="'Source Serif 4',serif" font-size="8" fill="#5C7A8C" font-style="italic">${Math.round(minE)}m</text>
    </svg>
  `;
}

/* ═════════════════════════════════════════════════════════════════
   Trail 列表渲染（v1.17.0 拆分：主函数 + 4 个辅助）
   ─────────────────────────────────────────────────────────────────
   主函数 buildTrailList() 只负责编排：
     1. renderGroupTabs()        —— 顶部分组切换
     2. renderBatchToolbar()     —— 批量操作工具栏（size>0 才显示）
     3. renderTrailCard(tr)      —— 单张轨迹卡片
     4. attachTrailCardHandlers() —— 卡片事件绑定
   ═════════════════════════════════════════════════════════════════ */

/** 顶部分组 Tab bar（仅在存在自定义分组时显示） */
function renderGroupTabs() {
  const groups = getGroups();
  if(groups.length <= 1 && groups[0] === '默认') return null;
  const bar = document.createElement('div');
  bar.className = 'group-tab-bar';
  groups.forEach(g => {
    const btn = document.createElement('button');
    const count = DATA.trails.filter(t => trailGroup(t) === g).length;
    btn.className = 'group-tab' + (g === state.activeGroup ? ' active' : '');
    btn.textContent = `${g}·${count}`;
    btn.title = g === state.activeGroup
      ? `再次点击取消选中「${g}」组`
      : `切换到「${g}」组`;
    btn.addEventListener('click', () => {
      // v1.20.0：再次点击当前 tab → 取消选中（进入无分组显示状态）
      if(g === state.activeGroup) switchGroup(null);
      else switchGroup(g);
    });
    bar.appendChild(btn);
  });
  return bar;
}

/** 批量工具栏（仅在 batchSelected.size > 0 时显示） */
function renderBatchToolbar(others) {
  if(state.batchSelected.size === 0) return null;
  const toolbar = document.createElement('div');
  toolbar.className = 'batch-toolbar';

  const info = document.createElement('span');
  info.className = 'info';
  info.textContent = `已选 ${state.batchSelected.size} / ${others.length}`;
  toolbar.appendChild(info);

  const btn = (text, muted, onClick) => {
    const b = document.createElement('button');
    if(muted) b.className = 'muted';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  };
  toolbar.appendChild(btn('全选', false, () => {
    state.batchSelected = new Set(others.map(t => t.id));
    buildTrailList();
  }));
  toolbar.appendChild(btn('反选', false, () => {
    const cur = state.batchSelected;
    state.batchSelected = new Set(others.map(t => t.id).filter(id => !cur.has(id)));
    buildTrailList();
  }));

  const moveSel = document.createElement('select');
  moveSel.innerHTML = '<option value="">移到…</option>'
    + getGroups().filter(g => g !== state.activeGroup).map(g => `<option value="${g}">${g}</option>`).join('')
    + '<option value="__new__">＋ 新建组…</option>';
  moveSel.addEventListener('change', e => {
    let target = e.target.value;
    if(!target) return;
    if(target === '__new__') {
      const name = prompt('新分组名称：');
      if(!name || !name.trim()) { e.target.value = ''; return; }
      target = name.trim();
    }
    moveBatchToGroup(target);
  });
  toolbar.appendChild(moveSel);

  toolbar.appendChild(btn('清除', true, () => {
    state.batchSelected = new Set();
    buildTrailList();
  }));
  return toolbar;
}

/** 执行批量移动（供 renderBatchToolbar 调用） */
function moveBatchToGroup(target) {
  const ids = [...state.batchSelected];
  let moved = 0;
  DATA.trails.forEach(t => {
    if(!ids.includes(t.id)) return;
    const oldGroup = trailGroup(t);
    t.group = target;
    // v1.21.0：如果被移动的 trail 是 activeGroup 的主轨迹，重新挑一条
    if(t.id === state.primaryTrailId) {
      const remaining = DATA.trails.filter(x => trailGroup(x) === state.activeGroup && x.id !== t.id);
      state.primaryTrailId = remaining[0] ? remaining[0].id : null;
    }
    // v1.21.0：如果 trail 是它原来组的主轨迹，清掉原组的记忆（避免"幽灵主轨迹"）
    if(oldGroup !== target && state.primaryByGroup[oldGroup] === t.id) {
      const remaining = DATA.trails.filter(x => trailGroup(x) === oldGroup && x.id !== t.id);
      if(remaining[0]) state.primaryByGroup[oldGroup] = remaining[0].id;
      else delete state.primaryByGroup[oldGroup];
    }
    moved++;
  });
  state.batchSelected = new Set();
  applyChange();
  showToast(`✓ 已将 ${moved} 条轨迹移至「${target}」`);
}

/** 单张轨迹卡片的 HTML 头部（收起态和展开态共用） */
/**
 * 单张轨迹卡片的头部 HTML
 * @param {Trail} tr
 * @param {boolean} isActive       是否叠加到地图
 * @param {boolean} isExpanded     是否展开详情
 * @param {boolean} isBatchChecked 是否被批量选中
 * @param {boolean} [isPrimary]    是否是当前分组的主轨迹（v1.21.0）
 */
function trailCardHeaderHtml(tr, isActive, isExpanded, isBatchChecked, isPrimary) {
  return `
    <div class="trail-card-hdr">
      <div class="trail-checkbox ${isBatchChecked ? 'checked' : ''}" data-action="batch-toggle" title="${isBatchChecked ? '已选（点击取消）' : '选中此轨迹'}">${isBatchChecked ? '☑' : '☐'}</div>
      <div class="trail-expand-arrow ${isExpanded ? 'expanded' : ''}" data-action="toggle-expand" title="${isExpanded ? '收起详情' : '展开详情'}">${isExpanded ? '▾' : '▸'}</div>
      <div class="trail-color-dot" style="background:${tr.color}"></div>
      <div class="trail-name">${tr.name}</div>
      <div class="trail-toggle" style="${isActive ? 'color:var(--accent);font-weight:600' : ''}">${isActive ? '叠加中 ●' : '点击叠加'}</div>
    </div>
  `;
}

/** 单张轨迹卡片的详情区 HTML（仅展开态） */
function trailCardExpandedHtml(tr) {
  const thumbSvg = buildTrailThumbnail(tr);
  const linkArea = tr.source && tr.source.startsWith('http')
    ? `<a href="${tr.source}" target="_blank" class="trail-link-btn" title="${tr.source}" style="color:var(--accent);font-size:10px;text-decoration:none;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🔗 ${tr.name}</a><a href="#" class="trail-edit-link-btn" data-tid="${tr.id}" title="${t('trail.editLink')}" style="color:var(--text-muted);font-size:10px;text-decoration:none">✎</a>`
    : `<a href="#" class="trail-edit-link-btn" data-tid="${tr.id}" title="${t('trail.editLink')}" style="color:var(--text-muted);font-size:10px;text-decoration:none">🔗 ${t('trail.addLink') || '添加链接'} ✎</a>`;
  const groupOpts = getGroups().map(g => `<option value="${g}" ${trailGroup(tr)===g?'selected':''}>${g}</option>`).join('');
  // v1.21.0：主轨迹卡不显示"设为主轨迹"按钮，显示 "★ 主轨迹" 标识
  const isPrimary = (tr.id === state.primaryTrailId);
  const primaryLabel = isPrimary
    ? `<span style="color:#C6912D;font-size:10px;font-weight:600;letter-spacing:0.02em">★ ${t('trail.isPrimary') || '主轨迹'}</span>`
    : `<a href="#" class="set-primary-btn" data-tid="${tr.id}" style="color:var(--accent);font-size:10px;text-decoration:none;font-weight:600;letter-spacing:0.02em">${t('trail.setPrimary')}</a>`;
  return `
    <div class="trail-thumb">${thumbSvg}</div>
    <div class="trail-info" style="align-items:center;gap:8px;flex-wrap:wrap">
      <span><b>${tr.stats.distance_km}</b>${t('header.km')}</span>
      <span>↑<b>${tr.stats.ascent_m}</b>m</span>
      <span>↓<b>${tr.stats.descent_m || 0}</b>m</span>
      <span><b>${tr.days}</b>${t('trail.days')}</span>
      <span style="margin-left:auto;display:inline-flex;align-items:center;gap:4px;font-family:monospace;font-size:10px;color:var(--text-muted);user-select:all">${t('trail.id')}: <span class="trail-id-text" data-tid="${tr.id}">${tr.id}</span><a href="#" class="trail-edit-id-btn" data-tid="${tr.id}" title="${t('trail.editId')}" style="color:var(--accent);font-size:10px;text-decoration:none">✎</a></span>
    </div>
    <div class="trail-info" style="margin-top:4px;align-items:center;gap:10px">
      ${primaryLabel}
      ${linkArea}
      <a href="#" class="trail-dl-kml-btn" data-tid="${tr.id}" title="下载 KML" style="color:var(--accent);font-size:10px;text-decoration:none">⬇ KML</a>
      <a href="#" class="trail-delete-btn" data-tid="${tr.id}" title="${t('trail.delete')}" style="margin-left:auto;color:var(--accent-2);font-size:10px;text-decoration:none">${t('trail.delete')}</a>
    </div>
    <div class="trail-info" style="margin-top:4px;align-items:center;gap:6px">
      <span style="font-size:10px;color:var(--text-muted)">分组：</span>
      <select class="trail-group-select" data-tid="${tr.id}" style="font-size:10px;padding:2px 6px;border:1px solid var(--line);border-radius:3px;background:var(--bg-0);color:var(--text);cursor:pointer;max-width:120px">
        ${groupOpts}
        <option value="__new__">＋ 新建组…</option>
      </select>
    </div>
  `;
}

/** 判断 click 是否来自"要走详情按钮独立 handler"的元素 */
function isDetailButtonTarget(el) {
  return el.closest('.trail-link-btn')
      || el.classList.contains('trail-edit-link-btn')
      || el.classList.contains('trail-edit-id-btn')
      || el.classList.contains('trail-dl-kml-btn')
      || el.classList.contains('trail-reverse-btn')
      || el.classList.contains('trail-delete-btn')
      || el.classList.contains('set-primary-btn')
      || el.classList.contains('trail-group-select');
}

/** 卡片主点击 handler（复选框 / 展开箭头 / 其他区域=切换叠加） */
function handleTrailCardClick(tr, e) {
  if(e.target.classList.contains('trail-checkbox')) {
    e.preventDefault(); e.stopPropagation();
    toggleTrailBatch(tr.id);
    buildTrailList();
    return true;
  }
  if(e.target.classList.contains('trail-expand-arrow')) {
    e.preventDefault(); e.stopPropagation();
    toggleTrailExpanded(tr.id);
    buildTrailList();
    return true;
  }
  if(isDetailButtonTarget(e.target)) return false; // 让详情按钮 handler 接管
  // 其他区域：切换地图叠加
  toggleTrailActive(tr.id);
  state.activeEscape = null;
  document.querySelectorAll('.escape-item').forEach(el => el.classList.remove('active'));
  applyChange();
  return true;
}

/** 展开态特有的详情按钮 handler（编辑 ID / 编辑链接 / 删除 / 反向 / 设为主 等） */
function handleTrailDetailClick(tr, e) {
  if(e.target.classList.contains('trail-edit-link-btn')) {
    e.preventDefault(); e.stopPropagation();
    const newUrl = prompt(t('trail.editLink') + ':', tr.source || '');
    if(newUrl !== null) { tr.source = newUrl.trim(); applyChange(); }
    return true;
  }
  if(e.target.classList.contains('trail-edit-id-btn')) {
    e.preventDefault(); e.stopPropagation();
    const newId = prompt(t('trail.editId') + ':', tr.id);
    if(!newId || !newId.trim() || newId === tr.id) return true;
    const trimmed = newId.trim();
    if(DATA.trails.some(other => other !== tr && other.id === trimmed)) {
      alert('ID 已存在 / ID already exists');
      return true;
    }
    const oldId = tr.id;
    tr.id = trimmed;
    if(state.activeTrails.has(oldId)) {
      state.activeTrails.delete(oldId); state.activeTrails.add(trimmed);
    }
    if(state.primaryTrailId === oldId) state.primaryTrailId = trimmed;
    applyChange();
    return true;
  }
  if(e.target.classList.contains('trail-dl-kml-btn')) {
    e.preventDefault(); e.stopPropagation();
    downloadTrailKML(tr.id); return true;
  }
  if(e.target.classList.contains('trail-reverse-btn')) {
    e.preventDefault(); e.stopPropagation();
    reverseTrail(tr.id); return true;
  }
  if(e.target.classList.contains('trail-delete-btn')) {
    e.preventDefault(); e.stopPropagation();
    if(confirm(`确定删除「${tr.name}」吗？`)) deleteTrail(tr.id);
    return true;
  }
  if(e.target.classList.contains('set-primary-btn')) {
    e.preventDefault(); e.stopPropagation();
    state.primaryTrailId = tr.id;
    state.activeTrails.add(tr.id);
    state.activeEscape = null;
    document.querySelectorAll('.escape-item').forEach(el => el.classList.remove('active'));
    applyChange();
    return true;
  }
  return false;
}

/** 分组下拉的 change handler（展开态） */
function handleTrailGroupChange(tr, newGroup, selectEl) {
  if(newGroup === '__new__') {
    const name = prompt('新分组名称：');
    if(!name || !name.trim()) { selectEl.value = trailGroup(tr); return; }
    newGroup = name.trim();
  }
  const oldGroup = trailGroup(tr);
  tr.group = newGroup;
  // v1.21.0：如果被移出的 trail 是原组的主轨迹，清掉原组的记忆
  if(oldGroup !== newGroup && state.primaryByGroup[oldGroup] === tr.id) {
    const remaining = DATA.trails.filter(t => trailGroup(t) === oldGroup && t.id !== tr.id);
    if(remaining[0]) state.primaryByGroup[oldGroup] = remaining[0].id;
    else delete state.primaryByGroup[oldGroup];
  }
  applyChange();
  showToast(`已移至「${newGroup}」组`);
}

/** 渲染单张 trail 卡片并绑定所有 handler */
function renderTrailCard(tr) {
  const card = document.createElement('div');
  const isActive = state.activeTrails.has(tr.id);
  const isExpanded = state.expandedTrails.has(tr.id);
  const isBatchChecked = state.batchSelected.has(tr.id);
  const isPrimary = (tr.id === state.primaryTrailId);

  card.className = 'trail-card'
    + (isActive ? ' active' : '')
    + (isBatchChecked ? ' batch-checked' : '')
    + (isPrimary ? ' is-primary' : '');
  card.style.setProperty('--card-color', tr.color || '#3F5238');
  if(isBatchChecked) {
    card.style.outline = '2px solid var(--accent)';
    card.style.outlineOffset = '-2px';
  }

  const headerHtml = trailCardHeaderHtml(tr, isActive, isExpanded, isBatchChecked, isPrimary);

  if(!isExpanded) {
    card.innerHTML = headerHtml;
    card.addEventListener('click', e => handleTrailCardClick(tr, e));
    return card;
  }

  // 展开态：header + 详情
  card.innerHTML = headerHtml + trailCardExpandedHtml(tr);

  // 详情区里的 <a class="trail-link-btn"> 保留浏览器默认行为（打开新标签），阻止 click 冒泡即可
  const linkBtn = card.querySelector('.trail-link-btn');
  if(linkBtn) linkBtn.addEventListener('click', e => e.stopPropagation());

  card.addEventListener('click', e => {
    if(handleTrailDetailClick(tr, e)) return;
    handleTrailCardClick(tr, e);
  });

  const groupSel = card.querySelector('.trail-group-select');
  if(groupSel) {
    groupSel.addEventListener('change', e => {
      e.stopPropagation();
      handleTrailGroupChange(tr, e.target.value, e.target);
    });
  }
  return card;
}

function buildTrailList() {
  const list = document.getElementById('trail-list');
  list.innerHTML = '';

  const tabs = renderGroupTabs();
  if(tabs) list.appendChild(tabs);

  // v1.20.0：无选中分组时给一个明确提示（而不是"当前组暂无备选轨迹"的误导）
  if(state.activeGroup == null && DATA.trails.length > 0) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:var(--text-muted);font-style:italic;padding:10px 4px;letter-spacing:0.04em;text-align:center';
    hint.textContent = t('trail.emptyNoGroup');
    list.appendChild(hint);
    return;
  }

  // v1.21.0：主轨迹不再被剔除，而是保留在列表里（用 is-primary class 视觉标记）
  //          排序：主轨迹在最前，其他按原顺序
  const inGroup = DATA.trails.filter(tr => trailGroup(tr) === state.activeGroup);
  const primary = inGroup.find(tr => tr.id === state.primaryTrailId);
  const others = primary
    ? [primary, ...inGroup.filter(tr => tr.id !== state.primaryTrailId)]
    : inGroup;

  const toolbar = renderBatchToolbar(others);
  if(toolbar) list.appendChild(toolbar);

  if(others.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:11px;color:var(--text-muted);font-style:italic;padding:10px 4px;letter-spacing:0.04em';
    empty.textContent = '当前组暂无轨迹，点 ＋ 添加或从其他组移入。';
    list.appendChild(empty);
    return;
  }
  others.forEach(tr => list.appendChild(renderTrailCard(tr)));
}

function buildFilterGrid() {
  const grid = document.getElementById('filter-grid');
  grid.innerHTML = '';
  // 统计各tag数量（active trails）
  const counts = {};
  DATA.trails.forEach(t => {
    if(!isTrailActive(t)) return;
    t.waypoints.forEach(w => counts[w.tag] = (counts[w.tag]||0) + 1);
  });

  const tagOrder = ['camp','pass','supply','water','fork','warn','shelter','village','bridge','river','other','start','end'];

  tagOrder.forEach(tag => {
    if(!counts[tag]) return;
    const chip = document.createElement('div');
    chip.className = 'filter-chip' + (state.visibleTags.has(tag) ? ' on' : '');
    chip.innerHTML = `<span class="ic">${waypointIcon(tag)}</span><span>${t('tag.'+tag)}</span><span class="cnt">${counts[tag]}</span>`;
    chip.addEventListener('click', () => {
      if(state.visibleTags.has(tag)) state.visibleTags.delete(tag);
      else state.visibleTags.add(tag);
      buildFilterGrid();
      drawWaypoints();
    });
    grid.appendChild(chip);
  });
}

const dayPreviewState = HTM_APP.createDayPreviewInteractionState();

function getDayIndexRange(trail, dm) {
  if(!trail || !trail.track || !trail.track.length || !dm) return null;
  const n = trail.track.length;
  const isValidIdx = v => Number.isInteger(v) && v >= 0 && v < n;
  if(isValidIdx(dm.i_start) && isValidIdx(dm.i_end)) {
    return { iStart: Math.min(dm.i_start, dm.i_end), iEnd: Math.max(dm.i_start, dm.i_end) };
  }
  let first = -1, last = -1;
  let hasExplicitDayId = false;
  for(let i=0; i<n; i++) {
    const dayId = Number(trail.track[i][5]);
    if(Number.isInteger(dayId) && dayId > 0) {
      hasExplicitDayId = true;
      if(dayId === dm.d) {
        if(first < 0) first = i;
        last = i;
      }
    }
  }
  if(hasExplicitDayId && first >= 0 && last >= first) return { iStart:first, iEnd:last };
  if(trail.day_meta && typeof dm.km === 'number') {
    let prevKm = 0;
    for(const item of trail.day_meta) {
      if(item === dm || item.d === dm.d) break;
      prevKm += Number(item.km) || 0;
    }
    const endKm = prevKm + (Number(dm.km) || 0);
    first = trail.track.findIndex(p => (p[3] || 0) >= prevKm - 0.02);
    last = -1;
    for(let i=n-1; i>=0; i--) {
      if((trail.track[i][3] || 0) <= endKm + 0.02) { last = i; break; }
    }
    if(first >= 0 && last >= first) return { iStart:first, iEnd:last };
  }
  return null;
}

function computeDayRangeStats(trail, range) {
  if(!trail || !range) return null;
  const i1 = Math.max(0, Math.min(range.iStart, range.iEnd));
  const i2 = Math.min(trail.track.length - 1, Math.max(range.iStart, range.iEnd));
  if(i2 < i1) return null;
  const cache = getMeasureStatsCache(trail);
  let minE = Infinity, maxE = -Infinity;
  for(let i=i1; i<=i2; i++) {
    const e = trail.track[i][2] || 0;
    if(e < minE) minE = e;
    if(e > maxE) maxE = e;
  }
  if(cache) {
    return {
      km: Math.abs((cache.distCum[i2] || 0) - (cache.distCum[i1] || 0)),
      asc: Math.max(0, (cache.ascCum[i2] || 0) - (cache.ascCum[i1] || 0)),
      desc: Math.max(0, (cache.descCum[i2] || 0) - (cache.descCum[i1] || 0)),
      max: maxE,
      min: minE,
    };
  }
  return segmentStats(i1, i2);
}

function clearDaySegmentPreview(opts = {}) {
  if(dayPreviewState.layer) dayPreviewState.layer.clearLayers();
  HTM_APP.clearDayPreviewState(dayPreviewState);
  document.querySelectorAll('.day-preview-target.active').forEach(el => el.classList.remove('active'));
  if(!measureState.active) hideMeasureElevReadout();
  if(!opts.silent && typeof refreshElevBar === 'function') refreshElevBar();
}

function showDaySegmentPreview(trail, dm) {
  const range = getDayIndexRange(trail, dm);
  if(!range) { showToast('这一天缺少可定位的轨迹范围', 'error'); return; }
  if(measureState.active || (typeof segmentState !== 'undefined' && segmentState.active)) {
    showToast('请先退出测距/分段，再预览每日轨迹', 'info');
    return;
  }
  if(dayPreviewState.active && dayPreviewState.trailId === trail.id && dayPreviewState.day === dm.d) {
    clearDaySegmentPreview();
    return;
  }
  if(!dayPreviewState.layer) dayPreviewState.layer = L.layerGroup().addTo(map);
  clearDaySegmentPreview({silent:true});
  const model = buildDayPreviewRenderModel(trail.track, range, 1200);
  if(!model) return;
  L.polyline(model.latLngs, model.lineStyle).addTo(dayPreviewState.layer);
  map.fitBounds(L.latLngBounds(model.latLngs), model.fitOptions);
  model.endpoints.forEach(endpoint => {
    measureMarker(endpoint.lat, endpoint.lng, endpoint.label, endpoint.color).addTo(dayPreviewState.layer);
  });
  dayPreviewState.active = true;
  dayPreviewState.trailId = trail.id;
  dayPreviewState.day = dm.d;
  dayPreviewState.iStart = model.iStart;
  dayPreviewState.iEnd = model.iEnd;
  document.querySelectorAll(`[data-day-preview="${dm.d}"]`).forEach(el => el.classList.add('active'));
  const stats = computeDayRangeStats(trail, range);
  const distEl = document.getElementById('m-dist');
  const distBox = document.getElementById('measure-distance');
  if(distEl && stats) distEl.textContent = Number(stats.km || 0).toFixed(1) + ' km';
  if(distBox) distBox.classList.add('active');
  setMeasureElevHint('');
  if(typeof refreshElevBar === 'function') refreshElevBar();
}

function buildDaysTab() {
  const tab = document.getElementById('tab-days');
  tab.innerHTML = '';
  // 只显示主轨迹的行程
  const trail = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!trail) return;
  const trailHdr = document.createElement('div');
  trailHdr.className = 'days-summary';
  const totalDays = trail.day_meta && trail.day_meta.length ? trail.day_meta.length : (trail.days || 0);
  trailHdr.innerHTML = `
    <h3 style="color:${trail.color}">★ ${trail.name}（主轨迹）</h3>
    <div class="days-summary-meta">
      <span>${totalDays || '-'} 天</span>
      <span>${trail.stats && trail.stats.distance_km != null ? trail.stats.distance_km : '-'} km</span>
      <span>↑ ${trail.stats && trail.stats.ascent_m != null ? trail.stats.ascent_m : '-'} m</span>
      <span>最高 ${trail.stats && trail.stats.max_elev != null ? trail.stats.max_elev : '-'} m</span>
    </div>
  `;
  tab.appendChild(trailHdr);

  // v1.26.0：若无 day_meta，显示占位提示
  if(!trail.day_meta || trail.day_meta.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:12px;color:var(--text-muted);font-size:11px;line-height:1.6';
    empty.innerHTML = '尚未设置每日行程。<br>点工具栏 <b>📅 分段</b> 在主轨迹上选点标记每天。';
    tab.appendChild(empty);
    return;
  }

  trail.day_meta.forEach((dm, dIdx) => {
      const range = getDayIndexRange(trail, dm);
      const computed = computeDayRangeStats(trail, range) || {};
      const dayKm = Number.isFinite(Number(dm.km)) ? Number(dm.km) : (computed.km || 0);
      const dayAsc = Number.isFinite(Number(dm.asc)) ? Number(dm.asc) : (computed.asc || 0);
      const dayDesc = Number.isFinite(Number(dm.desc)) ? Number(dm.desc) : (computed.desc || 0);
      const dayMax = Number.isFinite(Number(dm.max)) ? Number(dm.max) : (computed.max || 0);
      const dayMin = Number.isFinite(Number(dm.min)) ? Number(dm.min) : (computed.min || 0);
      const dayWps = trail.waypoints.filter(w => {
        // v1.27.0：优先用 wp.day 字段；否则用 day_meta cumulative km 划分
        if(w.day != null) return w.day === dm.d;
        if(range && w.gps_idx != null) return w.gps_idx >= range.iStart && w.gps_idx <= range.iEnd;
        let prevKm = 0;
        for(let i=0;i<dIdx;i++) prevKm += trail.day_meta[i].km;
        const endKm = prevKm + dm.km;
        return w.km >= prevKm - 0.5 && w.km <= endKm + 0.5;
      });
      const block = document.createElement('div');
      block.className = 'day-block';
      const color = dayPalette[dIdx % dayPalette.length];
      const routeText = dm.seg || ((dayKm || '-') + 'km · ↑' + (Math.round(dayAsc) || '-') + ' · ↓' + (Math.round(dayDesc) || '-') + ' · ⛰' + (Math.round(dayMax) || '-'));
      const campName = dm.camp || '未设置扎营点';
      const campElevNum = (dm.camp_elev == null || dm.camp_elev === '') ? NaN : Number(dm.camp_elev);
      const campElevText = Number.isFinite(campElevNum) ? Math.round(campElevNum) + ' m' : '-';
      block.style.setProperty('--day-color', color);
      block.innerHTML = `
        <div class="day-hdr" data-toggle>
          <span class="day-tag">D${dm.d}</span>
          <span class="day-head-main">
            <span class="day-route">${routeText}</span>
            <span class="day-title">${dayKm.toFixed(1)} km · ↑${Math.round(dayAsc)} m · ↓${Math.round(dayDesc)} m</span>
          </span>
          <span class="day-meta">▾</span>
        </div>
        <div class="day-body open">
          <div class="day-seg day-preview-target" data-day-preview="${dm.d}" title="点击高亮当天轨迹">
            <span class="ic">📍</span><span>${routeText}</span>
          </div>
          <div class="day-stats day-preview-target" data-day-preview="${dm.d}" title="点击高亮当天轨迹">
            <span class="lab">距离</span><span class="val">${dayKm.toFixed(1)} km</span>
            <span class="lab">当日爬升</span><span class="val">${Math.round(dayAsc)} m</span>
            <span class="lab">当日下降</span><span class="val">${Math.round(dayDesc)} m</span>
            <span class="lab">最高海拔</span><span class="val">${Math.round(dayMax)} m</span>
            <span class="lab">最低海拔</span><span class="val">${Math.round(dayMin)} m</span>
            <span class="lab">扎营点</span><span class="val">${campElevText}</span>
          </div>
          <div class="day-camp"><span>🏕</span><span>扎营点</span><b>${campName}</b><em>${campElevText}</em></div>
          <button class="day-evac-btn" data-trail="${trail.id}" data-day="${dm.d}">⚡ 下撤方案</button>
          <div class="wp-list"></div>
        </div>
      `;
      tab.appendChild(block);
      block.querySelectorAll('.day-preview-target').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          showDaySegmentPreview(trail, dm);
        });
      });
      const list = block.querySelector('.wp-list');
      // v1.27.0：行程 tab 固定显示这几类关键信息（不受 filter 影响）
      const DAYTAB_TAGS = new Set(['camp','pass','water','supply','bridge','river','village','shelter','warn','fork','start','end','highpoint']);
      dayWps.forEach(wp => {
        if(!DAYTAB_TAGS.has(wp.tag)) return;
        const item = document.createElement('div');
        item.className = 'wp-item';
        item.innerHTML = `
          <div class="wp-icon">${waypointIcon(wp)}</div>
          <div style="flex:1">
            <div class="wp-name" style="color:${tagColors[wp.tag]}">${wp.label}</div>
            <div class="wp-meta">km ${wp.km} · ${wp.elev}m · ${t('tag.'+wp.tag) || wp.tag}</div>
          </div>
        `;
        item.addEventListener('click', () => {
          clearEscape();
          map.flyTo([wp.lat, wp.lng], 15, {duration:0.7});
          setTimeout(() => {
            const m = wpMarkers[`${trail.id}#${wp.id}`];
            if(m) m.openPopup();
          }, 800);
        });
        list.appendChild(item);
      });
    });
  // 函数体结束（移除原 trails forEach 闭合）
}

function buildEscapeTab() {
  const tab = document.getElementById('tab-escape');
  tab.innerHTML = '<div class="section" style="padding-bottom:0"><h3>主轨迹下撤方案</h3><div style="font-size:10px;color:var(--text-muted);margin-bottom:6px">点击任意方案在地图上高亮，再次点击退出</div></div>';
  const trail = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!trail) return;
  if(!trail.escape_routes || trail.escape_routes.length === 0) {
    tab.innerHTML += '<div style="color:var(--text-muted);font-size:11px;padding:8px 12px">暂无下撤方案（需含营地标注点，或手动添加）</div>';
  } else {
    trail.escape_routes.forEach(r => {
      const item = document.createElement('div');
      item.className = 'escape-item';
      item.dataset.trail = trail.id;
      item.dataset.id = r.id;
      const isOtherTrail = r._anchor && r._anchor.trailId !== trail.id;
      const crossTag = isOtherTrail
        ? `<span style="background:#1e3a5f;color:#60a5fa;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:4px">跨轨迹</span>`
        : '';
      const manualTag = r._manual
        ? `<span style="background:#1a2e1a;color:#4ade80;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:4px">手动</span>`
        : '';
      const delBtn = r._manual
        ? `<button class="escape-del-btn" data-id="${r.id}" style="float:right;background:transparent;border:none;color:#6b7280;font-size:13px;cursor:pointer;padding:0 2px;line-height:1" title="删除">🗑</button>`
        : '';
      item.innerHTML = `
        <h4>${delBtn}⚡ ${r.name}${crossTag}${manualTag}</h4>
        <p>${r.desc}</p>
        <div class="meta">
          <span>📏 沿迹 ${r.distance_km} km</span>
          ${r.straight_km != null ? `<span>↗直线 ${r.straight_km} km</span>` : ''}
          <span>${r.drop_m > 0 ? '⬇' : r.drop_m < 0 ? '⬆' : '—'} ${Math.abs(r.drop_m)} m</span>
        </div>
      `;
      item.addEventListener('click', e => {
        if(e.target.classList.contains('escape-del-btn')) {
          const delId = e.target.dataset.id;
          trail.escape_routes = trail.escape_routes.filter(x => x.id !== delId);
          if(state.activeEscape === delId) clearEscape();
          saveToStorage();
          buildEscapeTab();
          return;
        }
        if(state.activeEscape === r.id) {
          clearEscape();
        } else {
          document.querySelectorAll('.escape-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          showEscape(trail.id, r.id);
        }
      });
      tab.appendChild(item);
    });
  }
  // 手动添加按钮
  const addBtn = document.createElement('button');
  addBtn.textContent = '＋ 手动添加下撤路线';
  addBtn.style.cssText = 'width:100%;margin-top:10px;padding:7px;background:rgba(127,29,29,0.3);border:1px dashed #7f1d1d;border-radius:5px;color:#fca5a5;font-size:11px;cursor:pointer';
  addBtn.addEventListener('mouseenter', () => addBtn.style.background = 'rgba(127,29,29,0.5)');
  addBtn.addEventListener('mouseleave', () => addBtn.style.background = 'rgba(127,29,29,0.3)');
  addBtn.addEventListener('click', () => addEscapeEnter());
  tab.appendChild(addBtn);
}

function buildLegend() {
  const lg = document.getElementById('legend');
  if(state.mode === 'day') {
    if(DATA.trails.length === 1) {
      lg.innerHTML = `
        <h4>按天分色</h4>
        ${dayPalette.map((c,i)=>`<div class="lg-row"><div class="swatch" style="background:${c}"></div>D${i+1}</div>`).join('')}
      `;
    } else {
      lg.innerHTML = `<h4><span data-i18n="legend.title">多轨迹（主轨迹高亮）</span></h4>` + DATA.trails.filter(t=>isTrailActive(t))
        .map(t=>{
          const isP = t.id === state.primaryTrailId;
          return `<div class="lg-row" style="opacity:${isP?1:0.6}"><div class="swatch" style="background:${t.color};height:${isP?5:3}px"></div>${isP?'★ ':''}${t.name}</div>`;
        }).join('');
    }
  } else if(state.mode === 'elev') {
    lg.innerHTML = `
      <h4>海拔渐变</h4>
      <div class="lg-row"><div class="swatch elev-grad" style="width:140px"></div></div>
      <div class="lg-row" style="justify-content:space-between"><span>${minE}m</span><span>${maxE}m</span></div>
    `;
  }
}

/* ============ Wire up controls ============ */
// tabs
let lastNonDayMode = state.mode === 'day' ? 'elev' : state.mode;
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    const tabName = t.dataset.tab;
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('tab-'+tabName).classList.add('active');
    if(tabName === 'days') {
      if(state.mode !== 'day') lastNonDayMode = state.mode;
      setMapMode('day');
    } else if(state.mode === 'day') {
      if(typeof clearDaySegmentPreview === 'function') clearDaySegmentPreview({silent:true});
      setMapMode(lastNonDayMode || 'elev');
      if(typeof refreshElevBar === 'function') refreshElevBar();
    }
  });
});

// day collapse
document.addEventListener('click', e => {
  if(e.target.closest('[data-toggle]')) {
    e.target.closest('[data-toggle]').nextElementSibling.classList.toggle('open');
  }
});

// day evac button
document.addEventListener('click', e => {
  if(e.target.classList && e.target.classList.contains('day-evac-btn')) {
    document.querySelector('.tab[data-tab="escape"]').click();
  }
});

function setMapMode(mode, opts = {}) {
  document.querySelectorAll('[data-mode]').forEach(x => {
    x.classList.toggle('on', x.dataset.mode === mode);
  });
  state.mode = mode;
  if(mode !== 'day') lastNonDayMode = mode;
  // 标注点模式下显示 tag 选择面板，并确保已渲染按钮
  const wpModePanel = document.getElementById('waypoint-mode-tags');
  if(wpModePanel) {
    wpModePanel.style.display = state.mode === 'waypoint' ? 'block' : 'none';
    if(state.mode === 'waypoint') {
      // 防御性重渲染（避免在某些时序下 grid 为空）
      try { buildWaypointModeTagGrid(); } catch(e) {}
    }
  }
  // 切换模式后更新模式·标注点 标题 + 重建 filter-grid（visibleTags 现在是该模式独立 Set）
  if(typeof updateModeTagTitle === 'function') updateModeTagTitle();
  if(typeof buildFilterGrid === 'function') buildFilterGrid();
  drawTracks(); drawWaypoints(); buildLegend();
  if(opts.toast) showToast(opts.toast, 'info');
}

function enterInteractionRenderMode(toolName) {
  if(state.mode !== 'waypoint') {
    setMapMode('waypoint', { toast: `${toolName}已切换到标注点模式以提升拖动流畅度` });
  }
}

// mode buttons
document.querySelectorAll('[data-mode]').forEach(b => {
  b.addEventListener('click', () => setMapMode(b.dataset.mode));
});

// 标注点模式：tag 选择按钮
function buildWaypointModeTagGrid() {
  const grid = document.getElementById('wpmode-tag-grid');
  if(!grid) return;
  grid.innerHTML = '';
  if(typeof TAG_RULES_JS === 'undefined') return;  // 还没定义，等后面再调
  TAG_RULES_JS.forEach(([tag, kws, icon, color]) => {
    const btn = document.createElement('button');
    const on = state.waypointModeTags.has(tag);
    btn.className = 'btn-mini' + (on ? ' on' : '');
    btn.style.cssText = 'padding:6px 8px;font-size:11px;display:flex;align-items:center;gap:6px;justify-content:flex-start;text-align:left;width:100%';
    btn.innerHTML = `<span style="color:${color}">${waypointIcon(tag)}</span> ${t('tag.'+tag)}`;
    btn.onclick = () => {
      if(state.waypointModeTags.has(tag)) state.waypointModeTags.delete(tag);
      else state.waypointModeTags.add(tag);
      buildWaypointModeTagGrid();
      if(state.mode === 'waypoint') drawWaypoints();
    };
    grid.appendChild(btn);
  });
}
// 不在这里立即调，TAG_RULES_JS 还未定义；放到 Boot 里调

// base layer
document.querySelectorAll('[data-base]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-base]').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    map.removeLayer(currentBase);
    currentBase = baseLayers[b.dataset.base].addTo(map);
  });
});

// show track checkbox
const _showTrackEl = document.getElementById('showTrack');
if(_showTrackEl) _showTrackEl.addEventListener('change', e => {
  state.showTrack = e.target.checked;
  drawTracks();
});
const _showLabelEl = document.getElementById('showLabel');
if(_showLabelEl) _showLabelEl.addEventListener('change', e => {
  state.showLabel = e.target.checked;
  drawWaypoints();
});
const _showHighPointEl = document.getElementById('showHighPoint');
if(_showHighPointEl) _showHighPointEl.addEventListener('change', e => {
  state.showHighPoint = e.target.checked;
  drawWaypoints();
});

// filter all/none
document.getElementById('filterAll').addEventListener('click', () => {
  ['start','end','camp','pass','water','supply','fork','warn','shelter','village','bridge','river','other']
    .forEach(t => state.visibleTags.add(t));
  buildFilterGrid(); drawWaypoints();
});
document.getElementById('filterNone').addEventListener('click', () => {
  state.visibleTags.clear();
  buildFilterGrid(); drawWaypoints();
});

// click empty to clear escape
map.on('click', e => {
  if(state.activeEscape) {
    const target = e.originalEvent.target;
    if(!target.closest('.leaflet-marker-icon, .leaflet-interactive')) clearEscape();
  }
});

/* ============ Add Trail UI (KML upload) ============ */
const addBtn = document.getElementById('add-trail-btn');
const addModal = document.getElementById('add-trail-modal');
const addCancel = document.getElementById('add-cancel');
const addStatus = document.getElementById('add-status');
const kmlDrop = document.getElementById('kml-drop');
const kmlFile = document.getElementById('kml-file');
const kmlList = document.getElementById('kml-list');

addBtn.addEventListener('click', () => addModal.classList.add('open'));
document.getElementById('export-btn').addEventListener('click', exportOffline);
document.getElementById('clear-btn').addEventListener('click', clearAllTrails);
function _closeAddModal() {
  addModal.classList.remove('open');
  // 清除上次的解析记录
  setTimeout(() => {
    if(kmlList) kmlList.innerHTML = '';
    if(addStatus) addStatus.textContent = '';
    if(kmlFile) kmlFile.value = '';
  }, 250);
}
addCancel.addEventListener('click', _closeAddModal);
addModal.addEventListener('click', e => { if(e.target === addModal) _closeAddModal(); });

kmlDrop.addEventListener('click', () => kmlFile.click());
kmlDrop.addEventListener('dragover', e => { e.preventDefault(); kmlDrop.style.borderColor = 'var(--accent)'; kmlDrop.style.background = 'var(--bg-2)'; });
kmlDrop.addEventListener('dragleave', e => { kmlDrop.style.borderColor = 'var(--line)'; kmlDrop.style.background = 'var(--bg-0)'; });
kmlDrop.addEventListener('drop', e => {
  e.preventDefault();
  kmlDrop.style.borderColor = 'var(--line)';
  kmlDrop.style.background = 'var(--bg-0)';
  handleFiles(e.dataTransfer.files);
});
kmlFile.addEventListener('change', e => handleFiles(e.target.files));

const PALETTE_LOCAL = ['#f97316','#3b82f6','#10b981','#a855f7','#eab308','#ec4899','#06b6d4','#f59e0b','#84cc16'];


/* ═════════════════════════════════════════════════════════════════
   File Import Pipeline（v1.18.0 拆分：主函数 + 6 个辅助）
   ─────────────────────────────────────────────────────────────────
   handleFiles(files)
     │
     ├── expandZipFiles(files)          —— .zip → 逐条虚拟 File-like
     ├── for each file:
     │     ├── importSingleKml(f)        —— 解析 + 去重 + 加入 DATA
     │     └── renderKmlImportRow(f, trail, displayLabel)  —— UI 反馈行
     └── postImportFinalize(addedCount)  —— 全部完成后统一 fit+save
   ═════════════════════════════════════════════════════════════════ */

/**
 * 将 zip 文件展开为一批虚拟 File-like 对象。非 zip 文件原样返回。
 * @param {FileList|Array<File>} files
 * @returns {Promise<Array<File | {name:string, text:()=>Promise<string>, _fromZip:string}>>}
 */
async function expandZipFiles(files) {
  const expanded = [];
  for(const f of files) {
    const lower = f.name.toLowerCase();
    if(!(lower.endsWith('.zip') || lower.endsWith('.kml.zip'))) {
      expanded.push(f); continue;
    }
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      if(typeof fflate === 'undefined' || typeof fflate.unzipSync !== 'function') {
        throw new Error('fflate 未加载，无法解压 zip');
      }
      const entries = fflate.unzipSync(buf);
      let picked = 0;
      for(const [path, bytes] of Object.entries(entries)) {
        if(!path.toLowerCase().endsWith('.kml')) continue;
        // 跳过 __MACOSX 和隐藏文件（macOS 打包容易带进去）
        if(path.startsWith('__MACOSX/') || path.split('/').some(seg => seg.startsWith('.'))) continue;
        const text = new TextDecoder('utf-8').decode(bytes);
        expanded.push({
          name: path.split('/').pop() || path,
          _fromZip: f.name,
          text: async () => text,
        });
        picked++;
      }
      if(picked === 0) {
        kmlList.innerHTML += `<div style="color:#ff8888">❌ ${f.name}：压缩包内未找到 .kml 文件</div>`;
      } else {
        kmlList.innerHTML += `<div style="color:#5cb85c;font-size:11px">📦 ${f.name} → 提取 ${picked} 个 KML</div>`;
      }
    } catch(err) {
      console.error('[expandZipFiles] 解压 zip 失败:', f.name, err);
      kmlList.innerHTML += `<div style="color:#ff8888">❌ ${f.name}：解压失败（${err.message}）</div>`;
    }
  }
  return expanded;
}

/**
 * 保证 trail.id 在 DATA.trails 中唯一（时间戳+随机极端撞车时补序号）
 */
function ensureUniqueTrailId(trail) {
  let safeId = trail.id;
  let suffix = 0;
  while(DATA.trails.some(t => t.id === safeId)) {
    suffix++;
    safeId = trail.id + '-' + suffix;
  }
  trail.id = safeId;
}

/**
 * 检查 trail 是否与已有轨迹重复（基于 trailContentHash）
 * @returns {Trail|null} 重复的现有轨迹；null 表示不重复
 */
function findDuplicateTrail(trail) {
  const newHash = trailContentHash(trail);
  const dup = DATA.trails.find(t => {
    if(!t._contentHash) t._contentHash = trailContentHash(t);
    return t._contentHash === newHash;
  });
  if(dup) return dup;
  trail._contentHash = newHash;
  return null;
}

/**
 * 渲染一条 KML 导入的 UI 行（含 ID / source 可编辑输入框）
 */
function renderKmlImportRow(displayLabel, trail) {
  const row = document.createElement('div');
  row.style.cssText = 'border:1px solid var(--line);border-radius:5px;padding:8px;margin-top:6px;background:var(--bg-0)';
  row.innerHTML = `
    <div style="color:#5cb85c;font-size:11px;margin-bottom:6px">✓ ${displayLabel} → <b>${trail.name}</b> (${trail.stats.distance_km}km, ↑${trail.stats.ascent_m}m, ${trail.waypoints.length} ${t('add.waypoints') || '标注点'})</div>
    <div style="display:flex;gap:6px;align-items:center;font-size:11px">
      <span style="color:var(--text-muted);min-width:30px">${t('trail.id')}:</span>
      <input type="text" class="kml-row-id" data-tid="${trail.id}" value="${trail.id}" style="flex:1;background:var(--bg-2);border:1px solid var(--line);color:var(--text);padding:4px 6px;border-radius:3px;font-size:11px;font-family:monospace">
    </div>
    <div style="display:flex;gap:6px;align-items:center;font-size:11px;margin-top:4px">
      <span style="color:var(--text-muted);min-width:30px">🔗:</span>
      <input type="text" class="kml-row-source" data-tid="${trail.id}" value="${trail.source || ''}" placeholder="${t('add.urlPlaceholder') || 'None'}" style="flex:1;background:var(--bg-2);border:1px solid var(--line);color:var(--text);padding:4px 6px;border-radius:3px;font-size:11px">
    </div>
  `;
  kmlList.appendChild(row);
  bindKmlImportRowEvents(row, trail);
}

/**
 * 绑定导入行的 ID / source 输入框事件（v1.18.0 从 handleFiles 拆出）
 */
function bindKmlImportRowEvents(row, trail) {
  const idInput = row.querySelector('.kml-row-id');
  const srcInput = row.querySelector('.kml-row-source');
  let cachedTid = trail.id;

  idInput.addEventListener('change', () => {
    const newId = idInput.value.trim();
    const tr = DATA.trails.find(x => x.id === cachedTid);
    if(!tr || newId === cachedTid) return;
    if(!newId) { idInput.value = cachedTid; return; }
    if(DATA.trails.some(other => other !== tr && other.id === newId)) {
      alert('ID 已存在 / ID exists');
      idInput.value = cachedTid;
      return;
    }
    const oldId = cachedTid;
    tr.id = newId;
    if(state.activeTrails.has(oldId)) { state.activeTrails.delete(oldId); state.activeTrails.add(newId); }
    if(state.primaryTrailId === oldId) state.primaryTrailId = newId;
    cachedTid = newId;
    srcInput.dataset.tid = newId;
    idInput.dataset.tid = newId;
    applyChange();
  });

  srcInput.addEventListener('change', () => {
    const tr = DATA.trails.find(x => x.id === cachedTid);
    if(!tr) return;
    tr.source = srcInput.value.trim();
    applyChange();
  });
}

/**
 * 导入单个 KML 文件（含解析、去重、入库、UI 反馈）
 * @returns {'added' | 'skipped' | 'failed'}
 */
async function importSingleKml(f) {
  if(!f.name.toLowerCase().endsWith('.kml')) {
    kmlList.innerHTML += `<div style="color:#ff8888">❌ ${f.name}：不是 KML/ZIP 文件</div>`;
    return 'failed';
  }
  const displayLabel = f._fromZip ? `${f._fromZip} → ${f.name}` : f.name;
  addStatus.textContent = `⏳ 解析 ${displayLabel}...`;
  addStatus.style.color = 'var(--text-dim)';

  try {
    const text = await f.text();
    const trail = parseAndProcessKml(text, f.name);
    if(!trail) {
      kmlList.innerHTML += `<div style="color:#ff8888">❌ ${displayLabel}：未找到轨迹点</div>`;
      return 'failed';
    }

    const dup = findDuplicateTrail(trail);
    if(dup) {
      kmlList.innerHTML += `<div style="color:#f59e0b">⚠ ${displayLabel}：与「${dup.name}」重复，已跳过</div>`;
      return 'skipped';
    }

    ensureUniqueTrailId(trail);
    trail.color = PALETTE_LOCAL[DATA.trails.length % PALETTE_LOCAL.length];
    // v1.20.0：当前无选中分组时，新轨迹归入「默认」组（否则会成为"孤儿"）
    if(!trail.group) trail.group = state.activeGroup || '默认';
    DATA.trails.push(trail);
    state.activeTrails.add(trail.id);

    renderKmlImportRow(displayLabel, trail);
    addStatus.textContent = '';
    return 'added';
  } catch(err) {
    console.error('[importSingleKml] 处理失败:', displayLabel, err);
    kmlList.innerHTML += `<div style="color:#ff8888">❌ ${displayLabel}：${err.message}</div>`;
    return 'failed';
  }
}

/**
 * 完成导入后的收尾：清下撤高亮、重算 escape_routes（可选）、fit 视野、持久化
 */
function postImportFinalize(addedCount) {
  if(addedCount === 0) return;
  state.activeEscape = null;
  if(state.autoGenerateEscape) {
    for(const tr of DATA.trails) {
      if(!tr.waypoints || !tr.track || !tr.track.length) continue;
      const fakePts = tr.track.map(p => ({ lat: p[0], lng: p[1], elev: p[2] || 0 }));
      const others = DATA.trails.filter(t => t.id !== tr.id);
      tr.escape_routes = buildEscapeRoutes(tr.waypoints, fakePts, others);
    }
  }
  applyChange({ fit: false });
  // v1.22.0：导入完成后自动执行完整复位
  if(typeof resetView === 'function') resetView();
}

async function handleFiles(files) {
  if(!files || files.length === 0) return;

  const expanded = await expandZipFiles(files);
  let added = 0;

  // 串行处理，让出主线程避免同 tick id 冲突
  for(const f of expanded) {
    const result = await importSingleKml(f);
    if(result === 'added') added++;
    // 每条之间让出主线程一帧
    await new Promise(r => setTimeout(r, 0));
  }
  postImportFinalize(added);
}


/* ============ Lightbox ============ */
const lightboxEl = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCap = document.getElementById('lightbox-caption');

// ── Lightbox 内置缩放/拖动状态 ──
const lbState = { scale: 1, tx: 0, ty: 0, startDist: 0, startScale: 1, startTx: 0, startTy: 0, startCx: 0, startCy: 0, dragging: false, pinching: false };

function lbApply() {
  lightboxImg.style.transform = `translate(${lbState.tx}px,${lbState.ty}px) scale(${lbState.scale})`;
}
function lbReset() {
  lbState.scale = 1; lbState.tx = 0; lbState.ty = 0;
  lightboxImg.style.transition = 'transform 0.2s ease-out';
  lbApply();
  setTimeout(() => { lightboxImg.style.transition = 'transform 0.15s ease-out'; }, 220);
}

function openLightbox(src, caption) {
  lightboxImg.src = decodeURIComponent(src);
  lightboxCap.textContent = decodeURIComponent(caption || '');
  lightboxEl.style.display = 'flex';
  lbReset();
}
function closeLightbox() {
  lightboxEl.style.display = 'none';
  lbReset();
  // 兜底：如果 visual viewport 被意外缩放（旧版浏览器），强制滚回顶部
  try {
    if(window.visualViewport && Math.abs(window.visualViewport.scale - 1) > 0.01) {
      window.scrollTo({top: 0, left: 0, behavior: 'instant'});
      // iOS Safari: 通过给 body 加 zoom hack 强制重置
      document.body.style.zoom = 1;
    }
  } catch(e) {}
}

// 点击背景关闭，但不要在拖拽/缩放后误关
lightboxEl.addEventListener('click', e => {
  if(e.target === lightboxImg) return;     // 点图本身不关
  if(lbState.dragging || lbState.pinching) return;
  closeLightbox();
});
document.addEventListener('keydown', e => { if(e.key === 'Escape' && lightboxEl.style.display === 'flex') closeLightbox(); });

// 双击图片 → 切换 1x / 2.5x
// 禁止 lightbox 内容被选中（双击放大时浏览器会选中元素）
lightboxEl.addEventListener('selectstart', e => e.preventDefault());
lightboxEl.addEventListener('mousedown', e => { if(e.detail >= 2) e.preventDefault(); }); // 双击时阻止选中

lightboxImg.addEventListener('dblclick', e => {
  e.preventDefault(); e.stopPropagation();
  if(lbState.scale > 1.05) lbReset();
  else { lbState.scale = 2.5; lbApply(); }
});

// 滚轮缩放（桌面）
lightboxEl.addEventListener('wheel', e => {
  e.preventDefault();
  const delta = -e.deltaY * 0.002;
  const newScale = Math.max(1, Math.min(6, lbState.scale * (1 + delta)));
  lbState.scale = newScale;
  if(newScale === 1) { lbState.tx = 0; lbState.ty = 0; }
  lbApply();
}, {passive: false});

// 鼠标拖动（缩放后才能拖）
let lbMouseDown = false;
lightboxImg.addEventListener('mousedown', e => {
  if(lbState.scale <= 1.05) return;
  e.preventDefault();
  lbMouseDown = true;
  lbState.startCx = e.clientX; lbState.startCy = e.clientY;
  lbState.startTx = lbState.tx; lbState.startTy = lbState.ty;
  lightboxImg.style.transition = 'none';
});
window.addEventListener('mousemove', e => {
  if(!lbMouseDown) return;
  lbState.tx = lbState.startTx + (e.clientX - lbState.startCx);
  lbState.ty = lbState.startTy + (e.clientY - lbState.startCy);
  lbApply();
});
window.addEventListener('mouseup', () => {
  if(lbMouseDown) { lbMouseDown = false; lightboxImg.style.transition = 'transform 0.15s ease-out'; }
});

// ── 触摸：pinch zoom + pan，阻止页面级缩放 ──
function lbTouchDist(t1, t2) { return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY); }
function lbTouchCenter(t1, t2) { return { x: (t1.clientX + t2.clientX)/2, y: (t1.clientY + t2.clientY)/2 }; }

lightboxEl.addEventListener('touchstart', e => {
  e.preventDefault(); // 阻断页面级 pinch
  if(e.touches.length === 2) {
    lbState.pinching = true;
    lbState.startDist = lbTouchDist(e.touches[0], e.touches[1]);
    lbState.startScale = lbState.scale;
    const c = lbTouchCenter(e.touches[0], e.touches[1]);
    lbState.startCx = c.x; lbState.startCy = c.y;
    lbState.startTx = lbState.tx; lbState.startTy = lbState.ty;
    lightboxImg.style.transition = 'none';
  } else if(e.touches.length === 1 && lbState.scale > 1.05) {
    lbState.dragging = true;
    lbState.startCx = e.touches[0].clientX; lbState.startCy = e.touches[0].clientY;
    lbState.startTx = lbState.tx; lbState.startTy = lbState.ty;
    lightboxImg.style.transition = 'none';
  }
}, {passive: false});

lightboxEl.addEventListener('touchmove', e => {
  e.preventDefault();
  if(e.touches.length === 2 && lbState.pinching) {
    const dist = lbTouchDist(e.touches[0], e.touches[1]);
    const newScale = Math.max(1, Math.min(6, lbState.startScale * (dist / lbState.startDist)));
    lbState.scale = newScale;
    lbApply();
  } else if(e.touches.length === 1 && lbState.dragging) {
    lbState.tx = lbState.startTx + (e.touches[0].clientX - lbState.startCx);
    lbState.ty = lbState.startTy + (e.touches[0].clientY - lbState.startCy);
    lbApply();
  }
}, {passive: false});

lightboxEl.addEventListener('touchend', e => {
  if(e.touches.length === 0) {
    setTimeout(() => { lbState.pinching = false; lbState.dragging = false; }, 50);
    lightboxImg.style.transition = 'transform 0.15s ease-out';
    if(lbState.scale < 1.02) { lbState.scale = 1; lbState.tx = 0; lbState.ty = 0; lbApply(); }
  }
}, {passive: false});

// 阻止 iOS Safari 的 gesturestart 触发页面级缩放
lightboxEl.addEventListener('gesturestart', e => e.preventDefault());
lightboxEl.addEventListener('gesturechange', e => e.preventDefault());
lightboxEl.addEventListener('gestureend', e => e.preventDefault());

/* ============ 测距功能（主轨迹上选两点 → 爬升/下降/里程） ============ */
const measureState = HTM_APP.createMeasureInteractionState();
const measureTrackCache = new WeakMap();
const measureStatsCache = new WeakMap();

function nearestTrackIdxOnPrimary(lat, lng) {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) return null;
  const tk = main.track;
  const sig = `${tk[0][0]},${tk[0][1]}|${tk[tk.length-1][0]},${tk[tk.length-1][1]}`;
  // 缓存主轨迹 typed array + 经纬度网格；测距点击只查附近网格，避免每次全轨扫描。
  let cache = measureTrackCache.get(main);
  if(!cache || cache.length !== tk.length || cache.sig !== sig) {
    const cellSize = 0.0015; // 约 160m，经纬度网格只用于候选点粗筛
    const latCache = new Float64Array(tk.length);
    const lngCache = new Float64Array(tk.length);
    const grid = new Map();
    for(let i=0; i<tk.length; i++) {
      const la = tk[i][0], ln = tk[i][1];
      latCache[i] = la;
      lngCache[i] = ln;
      const key = `${Math.floor(la / cellSize)}:${Math.floor(ln / cellSize)}`;
      let bucket = grid.get(key);
      if(!bucket) { bucket = []; grid.set(key, bucket); }
      bucket.push(i);
    }
    cache = { length: tk.length, sig, cellSize, grid, latCache, lngCache };
    measureTrackCache.set(main, cache);
  }
  const lats = cache.latCache;
  const lngs = cache.lngCache;
  const cellSize = cache.cellSize;
  const cosL = Math.cos(lat * Math.PI / 180);
  let bestI = 0, bestPlanar = Infinity;

  const cLat = Math.floor(lat / cellSize);
  const cLng = Math.floor(lng / cellSize);
  const latRadius = 2;
  const lngRadius = Math.max(2, Math.ceil((0.002 / Math.max(cosL, 0.15)) / cellSize));
  let seenCandidate = false;
  for(let gy = cLat - latRadius; gy <= cLat + latRadius; gy++) {
    for(let gx = cLng - lngRadius; gx <= cLng + lngRadius; gx++) {
      const bucket = cache.grid.get(`${gy}:${gx}`);
      if(!bucket) continue;
      for(let k=0; k<bucket.length; k++) {
        const i = bucket[k];
        const dy = lats[i] - lat;
        const dx = (lngs[i] - lng) * cosL;
        const d2 = dx*dx + dy*dy;
        if(d2 < bestPlanar) { bestPlanar = d2; bestI = i; }
      }
      seenCandidate = true;
    }
  }

  if(!seenCandidate) return null;
  // 邻近网格可能仍有多点集中，候选内取最近；不再扫描整条主轨迹。
  const p = tk[bestI];
  const distM = haversine(lat, lng, p[0], p[1]);
  if(distM > 200) return null;
  return { idx: bestI, point: p, dist: distM, trail: main };
}

function nearestTrackIdxNearPrimary(lat, lng, centerIdx, windowSize = 700) {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length || centerIdx == null || !isFinite(centerIdx)) {
    return nearestTrackIdxOnPrimary(lat, lng);
  }
  const tk = main.track;
  const lo = Math.max(0, Math.floor(centerIdx) - windowSize);
  const hi = Math.min(tk.length - 1, Math.floor(centerIdx) + windowSize);
  const cosL = Math.cos(lat * Math.PI / 180);
  let bestI = -1, bestPlanar = Infinity;
  for(let i=lo; i<=hi; i++) {
    const dy = tk[i][0] - lat;
    const dx = (tk[i][1] - lng) * cosL;
    const d2 = dx*dx + dy*dy;
    if(d2 < bestPlanar) { bestPlanar = d2; bestI = i; }
  }
  if(bestI >= 0) {
    const p = tk[bestI];
    const distM = haversine(lat, lng, p[0], p[1]);
    if(distM <= 200) return { idx: bestI, point: p, dist: distM, trail: main };
  }
  return nearestTrackIdxOnPrimary(lat, lng);
}

function measurePointFromHit(hit) {
  const p = hit.point;
  return { idx: hit.idx, lat: p[0], lng: p[1], elev: p[2] || 0, km: p[3] || 0 };
}


function getMeasureStatsCache(main) {
  if(!main || !main.track || !main.track.length) return null;
  const tk = main.track;
  const sig = `${tk[0][0]},${tk[0][1]}|${tk[tk.length-1][0]},${tk[tk.length-1][1]}|${tk.length}`;
  let cache = measureStatsCache.get(main);
  if(cache && cache.sig === sig) return cache;

  const n = tk.length;
  const ascCum = new Float64Array(n);
  const descCum = new Float64Array(n);
  const distCum = new Float64Array(n);
  const elevs = new Array(n);
  for(let i=0; i<n; i++) {
    distCum[i] = Number.isFinite(tk[i][3]) ? tk[i][3] : (i ? distCum[i-1] : 0);
    ascCum[i] = Number.isFinite(tk[i][4]) ? tk[i][4] : 0;
    descCum[i] = main._descCum && Number.isFinite(main._descCum[i]) ? main._descCum[i] : 0;
    elevs[i] = Number.isFinite(tk[i][2]) ? tk[i][2] : 0;
  }
  if(!main._descCum || main._descCum.length !== n) {
    const d = accumulatorDescent(elevs, 10);
    for(let i=0; i<n; i++) descCum[i] = d[i] || 0;
  }
  if(!Number.isFinite(tk[n-1][4])) {
    const a = accumulatorAscent(elevs, 10);
    for(let i=0; i<n; i++) ascCum[i] = a[i] || 0;
  }

  const blockSize = 256;
  const blockCount = Math.ceil(n / blockSize);
  const maxBlocks = new Float64Array(blockCount);
  for(let b=0; b<blockCount; b++) {
    let maxE = -Infinity;
    const start = b * blockSize;
    const end = Math.min(n, start + blockSize);
    for(let i=start; i<end; i++) if(elevs[i] > maxE) maxE = elevs[i];
    maxBlocks[b] = maxE;
  }
  cache = { sig, distCum, ascCum, descCum, elevs, blockSize, maxBlocks };
  measureStatsCache.set(main, cache);
  return cache;
}

function measureRangeMaxElev(cache, i1, i2) {
  if(!cache) return 0;
  const { elevs, blockSize, maxBlocks } = cache;
  let maxE = -Infinity;
  let i = i1;
  while(i <= i2 && i % blockSize !== 0) {
    if(elevs[i] > maxE) maxE = elevs[i];
    i++;
  }
  while(i + blockSize - 1 <= i2) {
    const b = Math.floor(i / blockSize);
    if(maxBlocks[b] > maxE) maxE = maxBlocks[b];
    i += blockSize;
  }
  while(i <= i2) {
    if(elevs[i] > maxE) maxE = elevs[i];
    i++;
  }
  return maxE;
}

function measureRangeMinElev(cache, i1, i2) {
  if(!cache) return 0;
  const { elevs } = cache;
  let minE = Infinity;
  for(let i=i1; i<=i2; i++) {
    if(elevs[i] < minE) minE = elevs[i];
  }
  return minE;
}

function computeMeasureStatsFromCache(cache, startIdx, endIdx) {
  if(!cache || !cache.elevs || !cache.elevs.length) return null;
  const fakeTrack = { length: cache.elevs.length };
  const range = normalizeTrackIndexRange(fakeTrack, startIdx, endIdx);
  if(!range) return null;
  const { iStart, iEnd, reversed } = range;
  const distKm = Math.abs((cache.distCum[iEnd] || 0) - (cache.distCum[iStart] || 0));
  const forwardAsc = Math.max(0, (cache.ascCum[iEnd] || 0) - (cache.ascCum[iStart] || 0));
  const forwardDesc = Math.max(0, (cache.descCum[iEnd] || 0) - (cache.descCum[iStart] || 0));
  return {
    ...range,
    distKm,
    asc: Math.round(reversed ? forwardDesc : forwardAsc),
    desc: Math.round(reversed ? forwardAsc : forwardDesc),
    maxE: Math.round(measureRangeMaxElev(cache, iStart, iEnd)),
    minE: Math.round(measureRangeMinElev(cache, iStart, iEnd)),
  };
}

function computeMeasureStats(a, b) {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !a || !b) return null;
  const cache = getMeasureStatsCache(main);
  if(!cache) return null;
  return computeMeasureStatsFromCache(cache, a.idx, b.idx);
}


function createPrimaryTrackDragSnapper(marker, opts = {}) {
  let latestLatLng = null;
  let frameId = 0;
  const raf = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (cb) => setTimeout(cb, 16);
  const cancelRaf = typeof cancelAnimationFrame === 'function'
    ? cancelAnimationFrame
    : clearTimeout;

  function resolveLatLng(ll) {
    const centerIdx = typeof opts.getCenterIdx === 'function' ? opts.getCenterIdx() : null;
    return centerIdx != null
      ? nearestTrackIdxNearPrimary(ll.lat, ll.lng, centerIdx, opts.windowSize || 700)
      : nearestTrackIdxOnPrimary(ll.lat, ll.lng);
  }

  function flush() {
    frameId = 0;
    if(!latestLatLng) return;
    const ll = latestLatLng;
    latestLatLng = null;
    const hit = resolveLatLng(ll);
    if(hit && marker && marker.setLatLng) {
      marker.setLatLng([hit.point[0], hit.point[1]]);
      if(typeof opts.onSnap === 'function') opts.onSnap(hit);
    }
  }

  return {
    schedule(ev) {
      latestLatLng = ev.target.getLatLng();
      if(frameId) return;
      frameId = raf(flush);
    },
    cancel() {
      if(frameId) cancelRaf(frameId);
      frameId = 0;
      latestLatLng = null;
    },
    resolve: resolveLatLng
  };
}

function measureEnter() {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) {
    showToast('请先设置主轨迹', 'error');
    return;
  }
  enterInteractionRenderMode('测距');
  clearDaySegmentPreview({silent:true});
  measureState.active = true;
  // v1.28.0：诊断日志（默认关闭，PERF_DEBUG=true 打开）
  if(window.PERF_DEBUG === true) {
    console.log('[measure-perf] 主轨迹点数:', main.track.length,
      '· 主轨迹 waypoint 数:', (main.waypoints || []).length,
      '· DATA.trails 数:', DATA.trails.length);
  }
  measureState.ptA = null;
  measureState.ptB = null;
  measureState._justDragged = false;
  measureState._computeSeq++;
  if(!measureState.layer) measureState.layer = L.layerGroup().addTo(map);
  clearMeasureLayer();
  const measurePanel = document.getElementById('measure-panel');
  measurePanel.style.display = 'block';
  if(measurePanel._applyFloatingPosition) measurePanel._applyFloatingPosition();
  resetMeasureElevReadout('在主轨迹上点击起点，再点击终点。');
  // 改鼠标样式
  map.getContainer().style.cursor = 'crosshair';
  // v1.30.0：加 measure-active 类，让 CSS 关闭所有 SVG path 的命中测试（消除 O(n) 命中检测的浏览器层瓶颈）
  map.getContainer().classList.add('measure-active');
}

function measureExit() {
  measureState.active = false;
  measureState.ptA = null;
  measureState.ptB = null;
  measureState._justDragged = false;
  measureState._computeSeq++;
  clearMeasureLayer();
  document.getElementById('measure-panel').style.display = 'none';
  hideMeasureElevReadout();
  map.getContainer().style.cursor = '';
  // v1.30.0：移除 measure-active 类，恢复 SVG path 的命中检测
  map.getContainer().classList.remove('measure-active');
  // 恢复完整主轨迹海拔图
  if(typeof refreshElevBar === 'function') refreshElevBar();
  // v1.30.0：取消自动复位到主轨迹（用户不希望测距退出后视图跳走）
}

function measureReset() {
  measureState.ptA = null;
  measureState.ptB = null;
  measureState._justDragged = false;
  measureState._computeSeq++;
  clearMeasureLayer();
  resetMeasureElevReadout('在主轨迹上点击起点，再点击终点。');
  // v1.31.0：复位时把海拔图刷回全轨模式，否则下次 measureCompute 的 refreshElevBar 会与残留状态竞态，出现"选 B 慢"
  if(typeof refreshElevBar === 'function') {
    requestAnimationFrame(() => refreshElevBar());
  }
}

function measureReverse() {
  if(!measureState.ptA || !measureState.ptB) {
    showToast('请先选择 A/B 两点', 'info');
    return;
  }
  const reversed = reverseMeasureEndpoints(measureState.ptA, measureState.ptB);
  if(!reversed) return;
  measureState.ptA = reversed.ptA;
  measureState.ptB = reversed.ptB;
  measureCompute();
}

function measureMarker(lat, lng, label, color, opts = {}) {
  // v1.27.0：用 divIcon 替代 circleMarker+tooltip，减少 DOM 层级和 layout 触发
  const draggable = !!opts.draggable;
  const icon = L.divIcon({
    className: 'measure-marker-icon',
    html: '<div style="width:20px;height:20px;background:'+color+';border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;font-family:sans-serif;'+(draggable?'cursor:move;':'')+'">'+label+'</div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
  return L.marker([lat, lng], { icon, interactive: draggable, keyboard: false, draggable, autoPan: draggable });
}

function clearMeasureLayer() {
  if(measureState._liveFrame) {
    try { cancelAnimationFrame(measureState._liveFrame); } catch(e) {}
    measureState._liveFrame = 0;
  }
  if(measureState.layer) measureState.layer.clearLayers();
  measureState.segmentLine = null;
}

function showMeasureElevReadout() {
  const dist = document.getElementById('measure-distance');
  const hint = document.getElementById('measure-hint');
  if(dist) dist.classList.add('active');
  if(hint) hint.classList.add('active');
}

function hideMeasureElevReadout() {
  const dist = document.getElementById('measure-distance');
  const hint = document.getElementById('measure-hint');
  if(dist) dist.classList.remove('active');
  if(hint) hint.classList.remove('active');
}

function setMeasureElevHint(html) {
  const hint = document.getElementById('measure-hint');
  if(hint) hint.innerHTML = html;
  if(hint) hint.classList.toggle('active', !!html);
}

function resetMeasureElevReadout(hintText) {
  const dist = document.getElementById('measure-distance');
  const distText = document.getElementById('m-dist');
  if(dist) dist.classList.remove('active');
  if(distText) distText.textContent = '-';
  setMeasureElevHint(hintText || '在主轨迹上点击起点，再点击终点。');
}


function renderMeasureSegmentLine(maxPoints = 900) {
  if(!measureState.layer || !measureState.ptA || !measureState.ptB) return;
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track) return;
  const model = buildMeasureSegmentRenderModel(main.track, measureState.ptA, measureState.ptB, maxPoints);
  if(!model) return;
  measureState.segmentLine = HTM_APP.upsertLeafletPolyline(
    L,
    measureState.layer,
    measureState.segmentLine,
    model,
  );
}

function updateMeasureReadout(loading = false) {
  const a = measureState.ptA, b = measureState.ptB;
  if(!a || !b) return;
  const dist_el = document.getElementById('m-dist');
  const ascEl = document.getElementById('elev-stat-asc');
  const descEl = document.getElementById('elev-stat-desc');
  showMeasureElevReadout();
  if(loading) {
    if(dist_el) dist_el.textContent = '⋯';
    if(ascEl) ascEl.textContent = '↑⋯';
    if(descEl) descEl.textContent = '↓⋯';
    return;
  }
  const stats = computeMeasureStats(a, b);
  if(!stats) return;
  if(dist_el) dist_el.textContent = stats.distKm.toFixed(2) + ' km';
  if(ascEl) ascEl.textContent = '↑' + stats.asc + 'm';
  if(descEl) descEl.textContent = '↓' + stats.desc + 'm';
}

function queueMeasureLiveUpdate() {
  if(measureState._liveFrame) return;
  measureState._liveFrame = requestAnimationFrame(() => {
    measureState._liveFrame = 0;
    renderMeasureSegmentLine(700);
    updateMeasureReadout(false);
  });
}


function applyMeasureEndpointHit(label, hit, live = false) {
  if(!hit) return false;
  const pt = measurePointFromHit(hit);
  const result = applyMeasureEndpointState(measureState.ptA, measureState.ptB, label, pt);
  if(!result.ok) return false;
  measureState.ptA = result.ptA;
  measureState.ptB = result.ptB;
  setMeasureElevHint('');
  return result.changed;
}

function bindMeasureEndpointDrag(marker, label) {
  const snapper = createPrimaryTrackDragSnapper(marker, {
    getCenterIdx: () => {
      const pt = label === 'A' ? measureState.ptA : measureState.ptB;
      return pt ? pt.idx : null;
    },
    onSnap: hit => {
      if(applyMeasureEndpointHit(label, hit, true)) queueMeasureLiveUpdate();
    },
  });
  marker.on('dragstart', () => {
    measureState._justDragged = true;
  });
  marker.on('drag', ev => snapper.schedule(ev));
  marker.on('dragend', ev => {
    const ll = ev.target.getLatLng();
    const hit = snapper.resolve(ll);
    snapper.cancel();
    setTimeout(() => { measureState._justDragged = false; }, 250);
    if(!hit) {
      showToast('必须拖到主轨迹附近（200m 内）', 'error');
      measureCompute();
      return;
    }
    const other = label === 'A' ? measureState.ptB : measureState.ptA;
    if(other && hit.idx === other.idx) {
      showToast('起点和终点不能是同一点', 'error');
      measureCompute();
      return;
    }
    applyMeasureEndpointHit(label, hit, false);
    measureCompute();
  });
}

function addMeasureEndpointMarker(pt, label, color) {
  const marker = measureMarker(pt.lat, pt.lng, label, color, { draggable: true }).addTo(measureState.layer);
  bindMeasureEndpointDrag(marker, label);
  return marker;
}

/* ============ 手动添加下撤路线 ============ */
const addEscapeState = {
  active: false,
  ptA: null,   // {lat, lng, elev, trailId, trackIdx}
  ptB: null,
  layer: null,
  _pending: null, // 待保存的路线对象
};

// 在所有活跃轨迹中，找离 (lat,lng) 最近的轨迹点
function nearestPointOnAnyTrail(lat, lng) {
  let best = null, bestD = Infinity;
  for(const tr of DATA.trails) {
    if(!isTrailActive(tr)) continue;
    if(!tr.track || !tr.track.length) continue;
    for(let i = 0; i < tr.track.length; i++) {
      const p = tr.track[i];
      const d = haversine(lat, lng, p[0], p[1]);
      if(d < bestD) {
        bestD = d;
        best = { lat: p[0], lng: p[1], elev: p[2] || 0, km: p[3] || 0,
                 trailId: tr.id, trailName: tr.name, trackIdx: i };
      }
    }
  }
  return bestD < 2000 ? best : null; // 2km 内才吸附
}

function addEscapeEnter() {
  if(!DATA.trails.length) { showToast('请先导入轨迹', 'error'); return; }
  addEscapeState.active = true;
  const btn = document.getElementById('add-escape-btn');
  if(btn) btn.classList.add('on');
  addEscapeState.ptA = null;
  addEscapeState.ptB = null;
  addEscapeState._pending = null;
  if(!addEscapeState.layer) addEscapeState.layer = L.layerGroup().addTo(map);
  addEscapeState.layer.clearLayers();
  document.getElementById('addescape-panel').style.display = 'block';
  document.getElementById('addescape-result').style.display = 'none';
  document.getElementById('addescape-hint').innerHTML =
    '在地图上点击 <b style="color:#22c55e">起点 A</b>，再点击 <b style="color:#ef4444">终点 B</b>。<br><span style="font-size:10px">系统自动找最近的轨迹段作为路线依据。</span>';
  map.getContainer().style.cursor = 'crosshair';
}

function addEscapeExit() {
  addEscapeState.active = false;
  const btn = document.getElementById('add-escape-btn');
  if(btn) btn.classList.remove('on');
  addEscapeState.ptA = null;
  addEscapeState.ptB = null;
  addEscapeState._pending = null;
  if(addEscapeState.layer) addEscapeState.layer.clearLayers();
  document.getElementById('addescape-panel').style.display = 'none';
  map.getContainer().style.cursor = '';
}

function addEscapeReset() {
  addEscapeState.ptA = null;
  addEscapeState.ptB = null;
  addEscapeState._pending = null;
  if(addEscapeState.layer) addEscapeState.layer.clearLayers();
  document.getElementById('addescape-result').style.display = 'none';
  document.getElementById('addescape-hint').innerHTML =
    '在地图上点击 <b style="color:#22c55e">起点 A</b>，再点击 <b style="color:#ef4444">终点 B</b>。<br><span style="font-size:10px">系统自动找最近的轨迹段作为路线依据。</span>';
}

function addEscapeCompute() {
  const a = addEscapeState.ptA, b = addEscapeState.ptB;
  if(!a || !b) return;

  // 找两点共同最近的轨迹（优先同一条；若不同条，选 A 所在轨迹）
  let refTrailId = a.trailId;
  // 如果 B 在同一轨迹上，直接用该轨迹；否则也用 A 的轨迹（B 已 snap 到该轨迹）
  // 重新 snap B 到 refTrail 上
  const refTrail = DATA.trails.find(t => t.id === refTrailId);
  if(!refTrail) return;

  // 在 refTrail.track 上找 A、B 最近点
  function snapToTrail(lat, lng, track) {
    let best = 0, bestD = Infinity;
    for(let i = 0; i < track.length; i++) {
      const d = haversine(lat, lng, track[i][0], track[i][1]);
      if(d < bestD) { bestD = d; best = i; }
    }
    return { idx: best, pt: track[best] };
  }
  const snapA = snapToTrail(a.lat, a.lng, refTrail.track);
  const snapB = snapToTrail(b.lat, b.lng, refTrail.track);

  if(snapA.idx === snapB.idx) {
    showToast('两点太近，请重新选择', 'error'); return;
  }

  const i1 = Math.min(snapA.idx, snapB.idx);
  const i2 = Math.max(snapA.idx, snapB.idx);
  const seg = refTrail.track.slice(i1, i2 + 1);

  // 计算里程
  let dist_m = 0;
  for(let i = 1; i < seg.length; i++) {
    dist_m += haversine(seg[i-1][0], seg[i-1][1], seg[i][0], seg[i][1]);
  }
  const elevs = seg.map(p => p[2] || 0);
  const asc = Math.round((accumulatorAscent(elevs, 10) || [0]).slice(-1)[0]);
  const desc = Math.round((accumulatorDescent(elevs, 10) || [0]).slice(-1)[0]);
  const drop = Math.round(snapA.pt[2] - snapB.pt[2]);
  const km = +(dist_m / 1000).toFixed(1);

  // 抽稀构建 line
  const line = [];
  for(let i = 0; i < seg.length; i += Math.max(1, Math.floor(seg.length / 200))) {
    line.push([+seg[i][0].toFixed(6), +seg[i][1].toFixed(6)]);
  }
  if(line[line.length-1][0] !== seg[seg.length-1][0]) {
    line.push([+seg[seg.length-1][0].toFixed(6), +seg[seg.length-1][1].toFixed(6)]);
  }

  // 预览高亮
  addEscapeState.layer.clearLayers();
  L.circleMarker([snapA.pt[0], snapA.pt[1]], {radius:8, color:'#fff', weight:2, fillColor:'#22c55e', fillOpacity:1})
    .bindTooltip('A（起点）', {permanent:true, direction:'top', offset:[0,-8], className:'measure-tip'})
    .addTo(addEscapeState.layer);
  L.circleMarker([snapB.pt[0], snapB.pt[1]], {radius:8, color:'#fff', weight:2, fillColor:'#ef4444', fillOpacity:1})
    .bindTooltip('B（终点）', {permanent:true, direction:'top', offset:[0,-8], className:'measure-tip'})
    .addTo(addEscapeState.layer);
  L.polyline(line, {color:'#f87171', weight:5, opacity:0.9, dashArray:'10,7'}).addTo(addEscapeState.layer);
  map.flyToBounds(L.latLngBounds(line).pad(0.2), {duration:0.6});

  // 填充面板
  document.getElementById('ae-dist').textContent = km + ' km';
  document.getElementById('ae-trail').textContent = refTrail.name;
  document.getElementById('ae-asc').textContent = asc + ' m';
  document.getElementById('ae-desc').textContent = desc + ' m';
  document.getElementById('ae-eA').textContent = Math.round(snapA.pt[2] || 0) + ' m';
  document.getElementById('ae-eB').textContent = Math.round(snapB.pt[2] || 0) + ' m';

  const autoName = `手动下撤 A→B（${refTrail.name}，${km}km）`;
  document.getElementById('addescape-name').value = autoName;
  document.getElementById('addescape-result').style.display = 'block';
  document.getElementById('addescape-hint').textContent = '✓ 路线已预览。确认后点击「保存」。';

  const direction = snapA.idx < snapB.idx ? '正向' : '逆向（反方向）';
  addEscapeState._pending = {
    id: `manual-escape-${Date.now()}`,
    name: autoName,
    desc: `手动选点 · ${direction} · 依据轨迹《${refTrail.name}》，沿轨迹约 ${km}km，落差 ${Math.abs(drop)}m（${drop > 0 ? '下降' : drop < 0 ? '上升' : '平路'}）。↑${asc}m ↓${desc}m`,
    distance_km: km, drop_m: drop, line,
    _manual: true,
    _anchor: { trailId: refTrailId, trailName: refTrail.name },
  };
}

function addEscapeCommit() {
  const pending = addEscapeState._pending;
  if(!pending) return;
  const trail = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!trail) { showToast('请先设置主轨迹', 'error'); return; }
  if(!trail.escape_routes) trail.escape_routes = [];
  // 用用户填写的名称覆盖
  const nameInput = document.getElementById('addescape-name').value.trim();
  if(nameInput) {
    pending.name = nameInput;
    pending.desc = pending.desc.replace(/^手动选点.*?）/, `${nameInput}`).replace(/^[^·]+·/, `${nameInput} ·`);
    // 重写 desc 更简洁
    pending.desc = `手动标注 · 依据轨迹《${pending._anchor.trailName}》，沿轨迹约 ${pending.distance_km}km，落差 ${Math.abs(pending.drop_m)}m（${pending.drop_m > 0 ? '下降' : pending.drop_m < 0 ? '上升' : '平路'}）。`;
    pending.name = nameInput;
  }
  // 去重（同 id）
  trail.escape_routes = trail.escape_routes.filter(r => r.id !== pending.id);
  trail.escape_routes.push(pending);
  saveToStorage();
  buildEscapeTab();
  showToast(`✓ 下撤路线「${pending.name}」已保存`);
  addEscapeExit();
}

// 地图点击：手动添加下撤选点
map.on('click', e => {
  if(!addEscapeState.active) return;
  const hit = nearestPointOnAnyTrail(e.latlng.lat, e.latlng.lng);
  if(!hit) {
    showToast('请点击轨迹附近（2km 内）', 'error'); return;
  }
  if(!addEscapeState.ptA) {
    addEscapeState.ptA = hit;
    addEscapeState.layer.clearLayers();
    L.circleMarker([hit.lat, hit.lng], {radius:8, color:'#fff', weight:2, fillColor:'#22c55e', fillOpacity:1})
      .bindTooltip('A（起点）', {permanent:true, direction:'top', offset:[0,-8], className:'measure-tip'})
      .addTo(addEscapeState.layer);
    document.getElementById('addescape-hint').innerHTML =
      '✓ 起点 A 已选。再点击 <b style="color:#ef4444">终点 B</b>。';
  } else {
    addEscapeState.ptB = hit;
    addEscapeCompute();
  }
});

// 按钮绑定
document.getElementById('addescape-close').addEventListener('click', addEscapeExit);
document.getElementById('addescape-exit').addEventListener('click', addEscapeExit);
document.getElementById('addescape-reset').addEventListener('click', addEscapeReset);
document.getElementById('addescape-commit').addEventListener('click', addEscapeCommit);

function measureCompute() {
  if(!measureState.ptA || !measureState.ptB) return;
  const seq = ++measureState._computeSeq;
  const a = measureState.ptA, b = measureState.ptB;

  // 视觉反馈立即执行：先落 A/B marker，再把长线段绘制放到下一帧，避免拖动松手时卡住点位刷新。
  clearMeasureLayer();
  addMeasureEndpointMarker(a, 'A', '#22c55e');
  addMeasureEndpointMarker(b, 'B', '#ef4444');

  // 立即先显示计算中的数值状态，端点海拔由海拔图标注呈现。
  updateMeasureReadout(true);
  setMeasureElevHint('');

  // ── 计算重活放到下一帧，不阻塞点击 ──
  requestAnimationFrame(() => {
    if(seq !== measureState._computeSeq) return;
    renderMeasureSegmentLine(1200);
    if(seq !== measureState._computeSeq) return;
    updateMeasureReadout(false);

    // v1.30.0：取消 AB 计算完成后的自动 fitBounds（用户不希望测距时视图跳转）

    // 海拔图重绘放到再下一帧，让上面的数字先渲染
    if(typeof refreshElevBar === 'function') {
      requestAnimationFrame(() => {
        if(seq === measureState._computeSeq) refreshElevBar();
      });
    }
  });
}

// 测距按钮
const measureBtn = document.getElementById('measure-btn');
if(measureBtn) measureBtn.addEventListener('click', () => {
  if(measureState.active) measureExit();
  else measureEnter();
});
// 反向按钮（反转主轨迹）
const reverseBtn = document.getElementById('reverse-btn');
if(reverseBtn) reverseBtn.addEventListener('click', () => {
  if(!state.primaryTrailId) { alert(t('reverse.noPrimary') || '无主轨迹'); return; }
  if(typeof reverseTrail === 'function') reverseTrail(state.primaryTrailId);
});

/* ============ 分段功能（在主轨迹上依次选点，标记每天行程） ============ */
const segmentState = HTM_APP.createSegmentInteractionState();

function segmentPointFromTrackIdx(trail, idx) {
  if(!trail || !trail.track || !trail.track.length) return null;
  return pointFromTrackIndex(trail.track, idx);
}

function normalizeSegmentIndexes(trail, indexes) {
  if(!trail || !trail.track || !trail.track.length) return [];
  const n = trail.track.length;
  const clean = Array.from(new Set((indexes || [])
    .map(v => clampTrackIndex(trail.track, Number(v)))
    .filter(v => Number.isInteger(v))))
    .sort((a, b) => a - b);
  if(clean[0] !== 0) clean.unshift(0);
  if(clean[clean.length - 1] !== n - 1) clean.push(n - 1);
  return clean;
}

function segmentIndexesToPoints(trail, indexes) {
  if(!trail || !trail.track || !trail.track.length) return [];
  const clean = normalizeSegmentIndexes(trail, indexes);
  return clean.map(idx => segmentPointFromTrackIdx(trail, idx)).filter(Boolean);
}

function segmentHasExplicitDayIds(trail) {
  return !!(trail && trail.track && trail.track.some(p => {
    const d = Number(p[5]);
    return Number.isInteger(d) && d > 0;
  }));
}

function segmentRangeFromDayMeta(trail, dm) {
  if(!trail || !trail.track || !trail.track.length || !dm) return null;
  const n = trail.track.length;
  const isValidIdx = v => Number.isInteger(v) && v >= 0 && v < n;
  if(isValidIdx(dm.i_start) && isValidIdx(dm.i_end)) {
    return { iStart: Math.min(dm.i_start, dm.i_end), iEnd: Math.max(dm.i_start, dm.i_end) };
  }
  return getDayIndexRange(trail, dm);
}

function segmentIndexesFromDayMeta(trail, dayMeta) {
  if(!trail || !trail.track || !trail.track.length || !dayMeta || !dayMeta.length) return [];
  const indexes = [];
  const meta = dayMeta.slice().sort((a, b) => (a.d || 0) - (b.d || 0));
  if(meta.length) {
    meta.forEach((dm, i) => {
      const range = segmentRangeFromDayMeta(trail, dm);
      if(range) {
        if(i === 0) indexes.push(range.iStart);
        indexes.push(range.iEnd);
      }
    });
  }
  return normalizeSegmentIndexes(trail, indexes);
}

function segmentIndexesFromDayIds(trail) {
  if(!trail || !trail.track || !trail.track.length || !segmentHasExplicitDayIds(trail)) return [];
  const indexes = [0];
  let currentDay = Number(trail.track[0][5]) || null;
  for(let i=1; i<trail.track.length; i++) {
    const d = Number(trail.track[i][5]) || null;
    if(d && currentDay && d !== currentDay) {
      indexes.push(i - 1);
      currentDay = d;
    } else if(d && !currentDay) {
      currentDay = d;
    }
  }
  indexes.push(trail.track.length - 1);
  return normalizeSegmentIndexes(trail, indexes);
}

function restoreSegmentIndexesForTrail(trail) {
  if(!trail || !trail.track || !trail.track.length) return [];
  const fromMeta = segmentIndexesFromDayMeta(trail, trail.day_meta || []);
  if(fromMeta.length >= 2) return fromMeta;
  const fromDays = segmentIndexesFromDayIds(trail);
  if(fromDays.length >= 2) return fromDays;
  return [0, trail.track.length - 1];
}

function segmentCampEditsFromDayMeta(dayMeta) {
  const edits = {};
  const meta = (dayMeta || []).slice().sort((a, b) => (a.d || 0) - (b.d || 0));
  meta.forEach((dm, i) => {
    if(dm.camp && dm.camp !== '-') {
      edits[dm.d || (i + 1)] = { name: dm.camp, elev: dm.camp_elev || null };
    }
  });
  return edits;
}

function restoreSegmentStateFromTrail(trail) {
  segmentState.points = [];
  segmentState.campEdits = {};
  if(!trail || !trail.track || !trail.track.length) return;
  segmentState.campEdits = segmentCampEditsFromDayMeta(trail.day_meta || []);
  segmentState.points = segmentIndexesToPoints(trail, restoreSegmentIndexesForTrail(trail));
}

function segmentEnter() {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) {
    showToast('请先设置主轨迹', 'error');
    return;
  }
  enterInteractionRenderMode('分段');
  clearDaySegmentPreview({silent:true});
  // 与测距互斥
  if(measureState.active) measureExit();
  if(typeof addEscapeState !== 'undefined' && addEscapeState.active && typeof addEscapeExit === 'function') addEscapeExit();

  segmentState.active = true;
  if(!segmentState.layer) segmentState.layer = L.layerGroup().addTo(map);
  segmentState.layer.clearLayers();
  restoreSegmentStateFromTrail(main);

  document.getElementById('segment-panel').style.display = 'flex';
  map.getContainer().style.cursor = 'crosshair';
  // v1.30.0：分段模式也开启 SVG path 命中测试跳过
  map.getContainer().classList.add('measure-active');
  if(typeof resetView === 'function') resetView({restoreActive: true});
  updateSegmentUI();
}

function segmentExit() {
  segmentState.active = false;
  if(segmentState.layer) segmentState.layer.clearLayers();
  document.getElementById('segment-panel').style.display = 'none';
  map.getContainer().style.cursor = '';
  // v1.30.0：恢复 SVG 命中检测
  map.getContainer().classList.remove('measure-active');
}

function segmentUndo() {
  segmentDeleteDay(segmentState.points.length - 1);
}

function segmentClear() {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  segmentState.points = main ? segmentIndexesToPoints(main, [0, main.track.length - 1]) : [];
  segmentState.campEdits = {};
  updateSegmentUI();
}

function renumberSegmentCampEditsForInsertFrom(old, insertAt) {
  const next = {};
  Object.keys(old || {}).forEach(k => {
    const d = Number(k);
    next[d >= insertAt ? d + 1 : d] = old[k];
  });
  return next;
}

function renumberSegmentCampEditsForDeleteFrom(old, dayNo, oldDayCount) {
  const next = {};
  for(let d=1; d<=oldDayCount; d++) {
    if(d === dayNo) continue;
    const newDay = d < dayNo ? d : d - 1;
    if(old && old[d]) next[newDay] = old[d];
  }
  return next;
}

function renumberSegmentCampEditsForInsert(insertAt) {
  segmentState.campEdits = renumberSegmentCampEditsForInsertFrom(segmentState.campEdits || {}, insertAt);
}

function renumberSegmentCampEditsForDelete(dayNo, oldDayCount) {
  segmentState.campEdits = renumberSegmentCampEditsForDeleteFrom(segmentState.campEdits || {}, dayNo, oldDayCount);
}

function insertSegmentPointInto(points, pt) {
  if(!pt) return { ok: false, reason: 'empty' };
  if(points.some(p => p.idx === pt.idx)) return { ok: false, reason: 'duplicate' };
  let insertAt = -1;
  for(let i=1; i<points.length; i++) {
    if(pt.idx > points[i-1].idx && pt.idx < points[i].idx) {
      insertAt = i;
      break;
    }
  }
  if(insertAt < 0) return { ok: false, reason: 'out-of-range' };
  const next = points.slice();
  next.splice(insertAt, 0, pt);
  return { ok: true, points: next, insertAt };
}

function deleteSegmentDayFrom(points, dayNo) {
  const oldDayCount = points.length - 1;
  if(oldDayCount <= 1) return { ok: false, reason: 'min-days', oldDayCount };
  if(dayNo < 1 || dayNo > oldDayCount) return { ok: false, reason: 'out-of-range', oldDayCount };
  const removePointIdx = dayNo < oldDayCount ? dayNo : dayNo - 1;
  const next = points.slice();
  next.splice(removePointIdx, 1);
  return { ok: true, points: next, oldDayCount, removePointIdx };
}


function segmentInsertPoint(pt) {
  const result = insertSegmentPointInto(segmentState.points, pt);
  if(!result.ok) {
    if(result.reason === 'empty') return false;
    if(result.reason === 'duplicate') {
      showToast('该点已选中，请选另一个位置', 'error');
      return false;
    }
    showToast('请点击现有行程范围内的未占用位置', 'error');
    return false;
  }
  segmentState.campEdits = renumberSegmentCampEditsForInsertFrom(segmentState.campEdits || {}, result.insertAt);
  segmentState.points = result.points;
  updateSegmentUI();
  return true;
}

function segmentDeleteDay(dayNo) {
  const result = deleteSegmentDayFrom(segmentState.points, dayNo);
  if(!result.ok) {
    if(result.reason === 'min-days') {
      showToast('至少保留 1 天行程', 'info');
    }
    return false;
  }
  segmentState.points = result.points;
  segmentState.campEdits = renumberSegmentCampEditsForDeleteFrom(segmentState.campEdits || {}, dayNo, result.oldDayCount);
  updateSegmentUI();
  return true;
}


function segmentStats(startIdx, endIdx) {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track) return null;
  const stats = computeSegmentStatsForTrack(main.track, startIdx, endIdx);
  if(!stats) return null;
  return { km: stats.kmText, asc: stats.asc, desc: stats.desc, maxE: stats.maxE, max: stats.max, minE: stats.minE, min: stats.min };
}

function updateSegmentUI() {
  const pts = segmentState.points;
  const hint = document.getElementById('segment-hint');
  if(pts.length === 0) {
    hint.innerHTML = '自动使用主轨迹起点与终点作为 1 天行程；点击轨迹中间位置可插入新的分段边界。';
  } else if(pts.length === 1) {
    hint.innerHTML = '✓ 起点已选（<span style="color:#22c55e">▲</span> D1 起点）。再点击选择 <b style="color:#fbbf24">D1 终点</b>（也是 D2 起点）。';
  } else {
    hint.innerHTML = '✓ 已分 <b style="color:#60a5fa">' + (pts.length - 1) + '</b> 天。点击轨迹插入边界，拖动黄色分段点调整，或在列表中删除指定日期。';
  }
  renderSegmentList();
  redrawSegmentLayer();
}

function renderSegmentList() {
  const list = document.getElementById('segment-list');
  const pts = segmentState.points;
  if(pts.length < 2) {
    list.innerHTML = '<div style="color:#64748b;text-align:center;padding:16px 0;font-size:11px">尚未选中任何一天…</div>';
    return;
  }
  const DAY_COLORS = dayPalette;
  let html = '';
  for(let d=1; d<pts.length; d++) {
    const stats = segmentStats(pts[d-1].idx, pts[d].idx);
    const color = DAY_COLORS[(d-1) % DAY_COLORS.length];
    const campData = segmentState.campEdits[d] || {};
    const campName = campData.name || '';
    const campElev = campData.elev != null ? campData.elev : Math.round(pts[d].elev);
    html += '<div class="segment-day-card" style="--day-color:'+color+'">' +
      '<div class="segment-day-head">' +
        '<b class="segment-day-title">D'+d+'</b>' +
        '<span class="segment-day-stats">'+stats.km+'km · ↑'+stats.asc+' · ↓'+stats.desc+' · 高'+stats.maxE+' · 低'+stats.minE+'</span>' +
        '<button class="seg-day-delete" data-day="'+d+'" title="删除 D'+d+'">删除</button>' +
      '</div>' +
      '<div class="segment-field">' +
        '<label>营地名</label>' +
        '<input class="seg-camp-name" data-day="'+d+'" placeholder="选填，如「仲达牧场」" value="'+campName.replace(/"/g,'&quot;')+'">' +
      '</div>' +
      '<div class="segment-field">' +
        '<label>营地海拔</label>' +
        '<input class="seg-camp-elev" data-day="'+d+'" type="number" placeholder="米" value="'+campElev+'">' +
        '<span class="unit">m</span>' +
      '</div>' +
    '</div>';
  }
  list.innerHTML = html;
  // 绑定输入事件
  list.querySelectorAll('.seg-camp-name').forEach(inp => {
    inp.addEventListener('input', e => {
      const d = +e.target.dataset.day;
      if(!segmentState.campEdits[d]) segmentState.campEdits[d] = {};
      segmentState.campEdits[d].name = e.target.value;
    });
  });
  list.querySelectorAll('.seg-camp-elev').forEach(inp => {
    inp.addEventListener('input', e => {
      const d = +e.target.dataset.day;
      if(!segmentState.campEdits[d]) segmentState.campEdits[d] = {};
      const v = parseFloat(e.target.value);
      segmentState.campEdits[d].elev = isNaN(v) ? null : v;
    });
  });
  list.querySelectorAll('.seg-day-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      segmentDeleteDay(+e.currentTarget.dataset.day);
    });
  });
}


function redrawSegmentLayer() {
  if(!segmentState.layer) return;
  segmentState.layer.clearLayers();
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main) return;
  const tk = main.track;
  const pts = segmentState.points;
  const DAY_COLORS = dayPalette;
  const model = buildSegmentLayerModel(tk, pts, DAY_COLORS, 900);
  // 为每天绘制不同颜色高亮线段
  model.segments.forEach(seg => {
    L.polyline(seg.latLngs, seg.lineStyle).addTo(segmentState.layer);
  });
  // 绘制分段点标记（可拖拽的 divIcon Marker）
  model.markers.forEach(m => {
    const icon = L.divIcon({
      className: 'segment-marker',
      html: '<div style="width:22px;height:22px;background:'+m.color+';border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-weight:700;color:#1a1a1a;font-size:10px;font-family:sans-serif;cursor:'+m.cursor+'">'+m.label+'</div>',
      iconSize: m.iconSize,
      iconAnchor: m.iconAnchor,
    });
    const marker = L.marker([m.lat, m.lng], Object.assign({ icon }, m.markerOptions)).addTo(segmentState.layer);
    marker._segIdx = m.pointIndex;
    if(!m.isBoundary) return;
    const snapper = createPrimaryTrackDragSnapper(marker);
    // 拖动过程中：吸附到主轨迹上（同时约束在相邻分段点之间）
    marker.on('drag', ev => snapper.schedule(ev));
    // 拖动结束：确定 idx，检查冲突，重排（保持递增顺序）后重绘
    marker.on('dragend', ev => {
      snapper.cancel();
      const ll = ev.target.getLatLng();
      const hit = nearestTrackIdxOnPrimary(ll.lat, ll.lng);
      if(!hit) {
        showToast('必须拖到主轨迹附近（200m 内）', 'error');
        redrawSegmentLayer();
        return;
      }
      const k = marker._segIdx;
      const nextPoint = {
        idx: hit.idx,
        lat: hit.point[0],
        lng: hit.point[1],
        elev: hit.point[2] || 0,
        km: hit.point[3] || 0,
      };
      const move = moveSegmentBoundary(pts, k, nextPoint);
      if(!move.ok && move.reason === 'duplicate') {
        showToast('该位置已被占用，请选另一处', 'error');
        redrawSegmentLayer();
        return;
      }
      if(!move.ok) {
        const message = move.reason === 'before-previous'
          ? '分段点必须在上一边界之后'
          : move.reason === 'after-next'
            ? '分段点必须在下一边界之前'
            : '该分段点不能移动到此处';
        showToast(message, 'error');
        redrawSegmentLayer();
        return;
      }
      segmentState.points = move.points;
      // 防止 dragend 后紧跟 map click 触发新增分段点
      segmentState._justDragged = true;
      setTimeout(() => { segmentState._justDragged = false; }, 200);
      updateSegmentUI();
    });
  });
}

function segmentApply() {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main) return;
  const pts = segmentState.points;
  if(pts.length < 2) {
    showToast('至少需要 2 个分段点（1 天）', 'error');
    return;
  }
  const tk = main.track;
  // 写 track[i][5] = dayId
  // 分段点之间的所有点归属该天；两点方向可能反转，用 min/max
  // 先全部重置为 1，再按段覆盖
  const dayIds = new Array(tk.length).fill(1);
  for(let d=1; d<pts.length; d++) {
    const i1 = Math.min(pts[d-1].idx, pts[d].idx);
    const i2 = Math.max(pts[d-1].idx, pts[d].idx);
    for(let i=i1; i<=i2; i++) dayIds[i] = d;
  }
  // 覆盖到 track（每个点第 6 个位置存 dayId，若原本没有则扩展）
  for(let i=0; i<tk.length; i++) {
    if(tk[i].length < 6) {
      while(tk[i].length < 6) tk[i].push(null);
    }
    tk[i][5] = dayIds[i];
  }
  // 生成 day_meta
  const day_meta = [];
  for(let d=1; d<pts.length; d++) {
    const stats = segmentStats(pts[d-1].idx, pts[d].idx);
    const campData = segmentState.campEdits[d] || {};
    const startElev = Math.round(pts[d-1].elev);
    const endElev = Math.round(pts[d].elev);
    const iStart = Math.min(pts[d-1].idx, pts[d].idx);
    const iEnd = Math.max(pts[d-1].idx, pts[d].idx);
    // seg 描述：起点海拔 → 最高海拔 → 终点海拔（km）
    const seg = `起 ${startElev}m → 顶 ${stats.maxE}m → 低 ${stats.minE}m → 终 ${endElev}m（${stats.km}km）`;
    day_meta.push({
      d: d,
      km: parseFloat(stats.km),
      asc: stats.asc,
      desc: stats.desc,
      max: stats.maxE,
      min: stats.minE,
      seg: seg,
      camp: campData.name && campData.name.trim() ? campData.name.trim() : '-',
      camp_elev: campData.elev != null ? Math.round(campData.elev) : Math.round(pts[d].elev),
      i_start: iStart,
      i_end: iEnd,
    });
  }
  main.day_meta = day_meta;
  main.days = day_meta.length;
  // v1.27.0：给主轨迹的 waypoints 也打上 day 字段（按最近 track idx 匹配所在段）
  if(main.waypoints && main.waypoints.length && main.track && main.track.length) {
    main.waypoints.forEach(wp => {
      // 找 waypoint 对应的 track idx（优先用 wp.trackIdx，否则做一次 nearest 搜索）
      let idx = wp.gps_idx != null ? wp.gps_idx : wp.trackIdx;
      if(idx == null || idx < 0 || idx >= main.track.length) {
        // 用 haversine 找最近点（简易 O(n)）
        let bestI = 0, bestD = Infinity;
        const cosL = Math.cos(wp.lat * Math.PI / 180);
        for(let i=0; i<main.track.length; i++) {
          const dy = main.track[i][0] - wp.lat;
          const dx = (main.track[i][1] - wp.lng) * cosL;
          const d2 = dx*dx + dy*dy;
          if(d2 < bestD) { bestD = d2; bestI = i; }
        }
        idx = bestI;
      }
      const dayId = main.track[idx][5];
      if(dayId != null) wp.day = dayId;
    });
  }
  showToast('✓ 已应用 ' + (pts.length-1) + ' 天分段');
  // 保存 + 完整重绘（fit:false 保持当前视野，但同步地图标注、行程、主轨迹小卡等所有 UI）
  saveToStorage();
  rebuildAll({fit:false});
  if(typeof refreshElevBar === 'function') refreshElevBar();
  segmentExit();
}

const segmentBtn = document.getElementById('segment-btn');
if(segmentBtn) segmentBtn.addEventListener('click', () => {
  if(segmentState.active) segmentExit();
  else segmentEnter();
});
const segmentCloseBtn = document.getElementById('segment-close');
if(segmentCloseBtn) segmentCloseBtn.addEventListener('click', segmentExit);
const segmentExitBtn = document.getElementById('segment-exit');
if(segmentExitBtn) segmentExitBtn.addEventListener('click', segmentExit);
const segmentUndoBtn = document.getElementById('segment-undo');
if(segmentUndoBtn) segmentUndoBtn.addEventListener('click', segmentUndo);
const segmentClearBtn = document.getElementById('segment-clear');
if(segmentClearBtn) segmentClearBtn.addEventListener('click', segmentClear);
const segmentApplyBtn = document.getElementById('segment-apply');
if(segmentApplyBtn) segmentApplyBtn.addEventListener('click', segmentApply);

const measureCloseBtn = document.getElementById('measure-close');
if(measureCloseBtn) measureCloseBtn.addEventListener('click', measureExit);
const measureExitBtn = document.getElementById('measure-exit');
if(measureExitBtn) measureExitBtn.addEventListener('click', measureExit);
const measureResetBtn = document.getElementById('measure-reset');
if(measureResetBtn) measureResetBtn.addEventListener('click', measureReset);
const measureReverseBtn = document.getElementById('measure-reverse');
if(measureReverseBtn) measureReverseBtn.addEventListener('click', measureReverse);

// v1.26.0：测距/分段模式改用原生 pointerdown/pointerup 快速触发（绕过 Leaflet click 内部延迟）
// 判断"不是拖拽" = down 到 up 位置差 < 6px 且时间 < 400ms
(function() {
  const container = map.getContainer();
  let pd = null; // {x, y, t}
  function isFastTap(x, y, t) {
    if(!pd) return false;
    const dx = x - pd.x, dy = y - pd.y;
    // v1.27.0：放宽阈值（10px 位移 + 800ms 时间），覆盖 trackpad 慢速点击
    return (dx*dx + dy*dy) < 100 && (t - pd.t) < 800;
  }
  function onDown(x, y, target) {
    // 只有测距/分段模式激活时才捕获
    if(!(measureState.active || segmentState.active)) { pd = null; return; }
    // 别拦截控件/UI 上的点击
    if(target && (target.closest('.leaflet-marker-icon') || target.closest('.leaflet-control') ||
                   target.closest('#segment-panel') || target.closest('#measure-panel') ||
                   target.closest('#map-toolbar') || target.closest('#sidebar'))) {
      pd = null; return;
    }
    pd = { x, y, t: (typeof performance !== 'undefined' ? performance.now() : Date.now()) };
  }
  function onUp(x, y, target) {
    if(!pd) return;
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if(!isFastTap(x, y, t)) { pd = null; return; }
    // 别拦截控件/marker 上的点击
    if(target && (target.closest('.leaflet-marker-icon') || target.closest('.leaflet-control'))) {
      pd = null; return;
    }
    // 转换 x,y → latlng（相对 container 的位置）
    const rect = container.getBoundingClientRect();
    const latlng = map.containerPointToLatLng([x - rect.left, y - rect.top]);
    // 派发到 measure/segment 处理逻辑，先阻止 Leaflet 的默认 click（避免重复）
    handleFastTap(latlng);
    // 抑制紧跟着的 map.click 事件（避免同一次点击被处理两次）
    measureState._justFastTap = true;
    segmentState._justFastTap = true;
    setTimeout(() => { measureState._justFastTap = false; segmentState._justFastTap = false; }, 350);
    pd = null;
  }
  function handleFastTap(latlng) {
    // v1.28.0：性能诊断日志（默认关闭，控制台运行 window.PERF_DEBUG = true 打开）
    const _perfEnabled = window.PERF_DEBUG === true;
    const _t0 = _perfEnabled ? performance.now() : 0;
    const _mark = (label) => {
      if(_perfEnabled) console.log('[measure-perf]', label, (performance.now() - _t0).toFixed(1) + 'ms');
    };
    // 分段模式
    if(segmentState.active) {
      if(segmentState._justDragged) return;
      // v1.28.0：立即在点击位置画个临时 marker，nearest 搜索在下一帧异步做
      const tempMarker = L.circleMarker([latlng.lat, latlng.lng], {
        radius: 6, color: '#fff', weight: 2, fillColor: '#fbbf24', fillOpacity: 0.7
      }).addTo(segmentState.layer || (segmentState.layer = L.layerGroup().addTo(map)));
      _mark('分段 临时 marker');
      requestAnimationFrame(() => {
        const hit = nearestTrackIdxOnPrimary(latlng.lat, latlng.lng);
        _mark('分段 nearestTrackIdx');
        tempMarker.remove();
        if(!hit) { showToast('请点击主轨迹附近（200m 内）', 'error'); return; }
        const p = hit.point;
        const pt = { idx: hit.idx, lat: p[0], lng: p[1], elev: p[2] || 0, km: p[3] || 0 };
        segmentInsertPoint(pt);
        _mark('分段 updateSegmentUI');
      });
      return;
    }
    // 测距模式
    if(!measureState.active) return;
    if(measureState._justDragged) return;
    // v1.28.0：立即在点击位置画个临时占位 marker，nearest 搜索/renderMarker 挪到下一帧
    // 这样用户点下的瞬间就有视觉反馈，感知延迟从 nearest 计算 + marker 渲染合计的百 ms 变成 <16ms
    const isA = !measureState.ptA;
    const isB = measureState.ptA && !measureState.ptB;
    if(!isA && !isB) {
      showToast('已选 A/B 后请拖动端点调整，或点「重新选点」', 'info');
      return;
    }
    if(isA) {
      measureState.layer.clearLayers();
      _mark('A clearLayers');
    }
    const tempColor = isA ? '#22c55e' : (isB ? '#ef4444' : '#fbbf24');
    const tempLabel = isA ? 'A' : (isB ? 'B' : '?');
    const tempMarker = measureMarker(latlng.lat, latlng.lng, tempLabel, tempColor);
    tempMarker.addTo(measureState.layer);
    _mark('临时 marker addTo (立即视觉反馈)');
    // 真实的 nearest 搜索 + 计算延迟到下一帧
    requestAnimationFrame(() => {
      const hit = nearestTrackIdxOnPrimary(latlng.lat, latlng.lng);
      _mark('nearestTrackIdx');
      if(!hit) {
        tempMarker.remove();
        showToast('请点击主轨迹附近（200m 内）', 'error');
        return;
      }
      const p = hit.point;
      const pt = measurePointFromHit(hit);
      // 把临时 marker 位置吸附到最近的轨迹点
      if(tempMarker.setLatLng) tempMarker.setLatLng([p[0], p[1]]);
      _mark('marker 吸附');
      if(!measureState.ptA) {
        measureState.ptA = pt;
        setMeasureElevHint('再点击终点。');
        _mark('A hint');
      } else if(!measureState.ptB) {
        if(pt.idx === measureState.ptA.idx) {
          tempMarker.remove();
          showToast('起点和终点不能是同一点', 'error');
          return;
        }
        measureState.ptB = pt;
        measureCompute();
        _mark('B measureCompute');
      } else {
        tempMarker.remove();
        showToast('已选 A/B 后请拖动端点调整，或点「重新选点」', 'info');
        _mark('第三次点击忽略');
      }
    });
  }
  // 优先使用 pointer 事件（覆盖鼠标 + 触屏 + 触控笔）
  if(window.PointerEvent) {
    container.addEventListener('pointerdown', e => {
      if(e.pointerType !== 'mouse' && e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      onDown(e.clientX, e.clientY, e.target);
    }, {capture: true, passive: true});
    container.addEventListener('pointerup', e => {
      onUp(e.clientX, e.clientY, e.target);
    }, {capture: true, passive: true});
    container.addEventListener('pointercancel', () => { pd = null; }, {capture: true, passive: true});
  } else {
    container.addEventListener('mousedown', e => onDown(e.clientX, e.clientY, e.target), {capture: true});
    container.addEventListener('mouseup', e => onUp(e.clientX, e.clientY, e.target), {capture: true});
    container.addEventListener('touchstart', e => {
      if(e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }, {capture: true, passive: true});
    container.addEventListener('touchend', e => {
      if(e.changedTouches.length === 1) onUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY, e.target);
    }, {capture: true, passive: true});
  }
})();

// 监听地图点击：测距模式下选点（fallback：如果 fast-tap 没触发，click 兜底）
map.on('click', e => {
  // 分段模式优先处理（互斥）
  if(segmentState.active) {
    if(segmentState._justDragged || segmentState._justFastTap) return; // 忽略拖拽后紧跟的 click
    const hit = nearestTrackIdxOnPrimary(e.latlng.lat, e.latlng.lng);
    if(!hit) {
      showToast('请点击主轨迹附近（200m 内）', 'error');
      return;
    }
    const p = hit.point;
    const pt = { idx: hit.idx, lat: p[0], lng: p[1], elev: p[2] || 0, km: p[3] || 0 };
    segmentInsertPoint(pt);
    return;
  }
  if(!measureState.active) return;
  if(measureState._justFastTap) return; // 已被 fast-tap 处理
  if(measureState._justDragged) return; // 忽略拖拽端点后 Leaflet 可能补发的 click
  if(measureState.ptA && measureState.ptB) {
    showToast('已选 A/B 后请拖动端点调整，或点「重新选点」', 'info');
    return;
  }
  const hit = nearestTrackIdxOnPrimary(e.latlng.lat, e.latlng.lng);
  if(!hit) {
    showToast('请点击主轨迹附近（200m 内）', 'error');
    return;
  }
  const pt = measurePointFromHit(hit);
  if(!measureState.ptA) {
    // 第一次点击：设起点 A
    measureState.ptA = pt;
    measureState.layer.clearLayers();
    measureMarker(pt.lat, pt.lng, 'A', '#22c55e').addTo(measureState.layer);
    setMeasureElevHint('再点击终点。');
  } else if(!measureState.ptB) {
    // 第二次点击：设终点 B
    if(pt.idx === measureState.ptA.idx) {
      showToast('起点和终点不能是同一点', 'error');
      return;
    }
    measureState.ptB = pt;
    measureCompute();
  }
});

/* ============ 底部海拔剖面图 ============ */
const elevCanvas = document.getElementById('elev-canvas');
const elevCtx = elevCanvas ? elevCanvas.getContext('2d') : null;
const elevCrosshair = document.getElementById('elev-crosshair');
const elevTip = document.getElementById('elev-tip');
const elevLabel = document.getElementById('elev-label');

// 当前绘制数据缓存
let _elevBarData = null;

function computeElevLayout(pts, opts) {
  opts = opts || {};
  const W = elevCanvas.offsetWidth || 340;
  const H = elevCanvas.offsetHeight || 140;
  const dpr = window.devicePixelRatio || 1;
  elevCanvas.width = W * dpr;
  elevCanvas.height = H * dpr;
  elevCtx.setTransform(1, 0, 0, 1, 0, 0);
  elevCtx.scale(dpr, dpr);
  return computeElevationLayout(pts, Object.assign({}, opts, { width: W, height: H }));
}


/** 绘制米色卡纸背景 + 微噪点纹理 */
function drawElevBackground(layout, renderModel) {
  renderModel = renderModel || computeElevationRenderModel([], layout);
  const bg = renderModel.background;
  const bgGrad = elevCtx.createLinearGradient(bg.gradient.x0, bg.gradient.y0, bg.gradient.x1, bg.gradient.y1);
  bg.gradient.stops.forEach(stop => bgGrad.addColorStop(stop.offset, stop.color));
  elevCtx.fillStyle = bgGrad;
  elevCtx.fillRect(bg.rect.x, bg.rect.y, bg.rect.w, bg.rect.h);
  const noise = bg.noise;
  for(let i = 0; i < noise.count; i++) {
    elevCtx.fillStyle = 'rgba(' + noise.rgb[0] + ',' + noise.rgb[1] + ',' + noise.rgb[2] + ',' + (Math.random()*noise.maxAlpha).toFixed(3) + ')';
    elevCtx.fillRect(Math.random()*bg.rect.w, Math.random()*bg.rect.h, noise.size, noise.size);
  }
}

/** 绘制 25% / 50% / 75% 横向参考虚线 */
function drawElevGridLines(layout, renderModel) {
  renderModel = renderModel || computeElevationRenderModel([], layout);
  const style = renderModel.gridStyle;
  renderModel.gridLines.forEach(line => {
    elevCtx.beginPath();
    elevCtx.moveTo(line.x1, line.y1);
    elevCtx.lineTo(line.x2, line.y2);
    elevCtx.strokeStyle = style.strokeStyle;
    elevCtx.lineWidth = style.lineWidth;
    elevCtx.setLineDash(style.lineDash || []);
    elevCtx.stroke();
    elevCtx.setLineDash([]);
  });
}

/** 绘制与海拔曲线完全同路径的填充，避免曲线和下方面积边缘错位 */
function drawElevFill(pts, layout, renderModel) {
  if(!pts || pts.length < 2) return;
  renderModel = renderModel || computeElevationRenderModel(pts, layout);
  const fillPolygon = renderModel.fillPolygon;
  if(fillPolygon.length < 3) return;
  const fillGrad = renderModel.fillStyle.gradient;
  const grad = elevCtx.createLinearGradient(fillGrad.x0, fillGrad.y0, fillGrad.x1, fillGrad.y1);
  fillGrad.stops.forEach(stop => grad.addColorStop(stop.offset, stop.color));
  elevCtx.beginPath();
  elevCtx.moveTo(fillPolygon[0].x, fillPolygon[0].y);
  for(let i=1; i<fillPolygon.length; i++) {
    elevCtx.lineTo(fillPolygon[i].x, fillPolygon[i].y);
  }
  elevCtx.closePath();
  elevCtx.fillStyle = grad;
  elevCtx.fill();
}

/** 绘制海拔曲线（深森林绿主线 + 底线） */
function drawElevCurve(pts, layout, renderModel) {
  renderModel = renderModel || computeElevationRenderModel(pts, layout);
  const curve = renderModel.curve;
  if(!curve.length) return;
  elevCtx.beginPath();
  curve.forEach((p, i) => i === 0 ? elevCtx.moveTo(p.x, p.y) : elevCtx.lineTo(p.x, p.y));
  const curveStyle = renderModel.curveStyle;
  elevCtx.strokeStyle = curveStyle.strokeStyle;
  elevCtx.lineWidth = curveStyle.lineWidth;
  elevCtx.lineJoin = curveStyle.lineJoin || 'miter';
  elevCtx.lineCap = curveStyle.lineCap || 'butt';
  elevCtx.stroke();
  // 底线
  const { baseline } = renderModel;
  const baselineStyle = renderModel.baselineStyle;
  elevCtx.beginPath();
  elevCtx.moveTo(baseline.x1, baseline.y1);
  elevCtx.lineTo(baseline.x2, baseline.y2);
  elevCtx.strokeStyle = baselineStyle.strokeStyle;
  elevCtx.lineWidth = baselineStyle.lineWidth;
  elevCtx.stroke();
}

/** 收集要标注的关键点：最高点、最低点（若与最高点足够远）、营地 */
function collectElevAnnotations(pts, layout, opts) {
  const { alts, minE, maxE, km, kmRange } = layout;
  const annos = [];

  const peakIdx = alts.indexOf(maxE);
  annos.push({
    idx: peakIdx, kmVal: km[peakIdx], elev: maxE,
    text: Math.round(maxE) + 'm',
    color: '#A8543C', dotColor: '#A8543C', dotRadius: 3.4,
    priority: 100, side: 'top', kind: 'peak',
  });

  const valleyIdx = alts.indexOf(minE);
  if(Math.abs(km[valleyIdx] - km[peakIdx]) > kmRange * 0.08) {
    annos.push({
      idx: valleyIdx, kmVal: km[valleyIdx], elev: minE,
      text: Math.round(minE) + 'm',
      color: '#5C7A8C', dotColor: '#5C7A8C', dotRadius: 3.4,
      priority: 50, side: 'bottom', kind: 'low',
    });
  }

  if(opts.measureMode && pts.length >= 2) {
    annos.push({
      idx: 0, kmVal: km[0], elev: pts[0][2] || 0,
      text: 'A ' + Math.round(pts[0][2] || 0) + 'm',
      color: '#2F7D55', dotColor: '#22c55e', priority: 130, labelSide: 'left', kind: 'measure-a',
    });
    const endIdx = pts.length - 1;
    annos.push({
      idx: endIdx, kmVal: km[endIdx], elev: pts[endIdx][2] || 0,
      text: 'B ' + Math.round(pts[endIdx][2] || 0) + 'm',
      color: '#A8543C', dotColor: '#ef4444', priority: 130, labelSide: 'right', kind: 'measure-b',
    });
  }

  if(opts.waypoints && opts.waypoints.length) {
    const segIdxStart = opts.segIdxStart || 0;
    const segIdxEnd = opts.segIdxEnd != null ? opts.segIdxEnd : (segIdxStart + pts.length - 1);
    const reversed = !!opts.reversed;
    opts.waypoints.forEach(wp => {
      if(wp.tag !== 'camp' || wp.gps_idx == null) return;
      if(wp.gps_idx < segIdxStart || wp.gps_idx > segIdxEnd) return;
      let localIdx = wp.gps_idx - segIdxStart;
      if(reversed) localIdx = (pts.length - 1) - localIdx;
      if(localIdx < 0 || localIdx >= pts.length) return;
      const elv = pts[localIdx][2] || 0;
      const nm = (wp.label || wp.name || t('elev.anno.camp')).toString().trim();
      annos.push({
        idx: localIdx, kmVal: km[localIdx], elev: elv,
        text: nm + ' ' + Math.round(elv) + 'm',
        color: '#3F5238', priority: 80, side: 'top', kind: 'camp',
      });
    });
  }
  annos.sort((a, b) => a.kmVal - b.kmVal);
  return annos;
}


/** Canvas 文本测量适配：兼容原入口，布局计算仍由纯函数负责。 */
function layoutElevLabels(annotations, layout) {
  return layoutElevationAnnotations(annotations, layout, {
    measureText: (text, fontSize, font) => {
      elevCtx.font = font;
      return elevCtx.measureText(text).width;
    },
  });
}

/** Canvas 适配层：执行纯渲染模型。 */
function renderElevLabels(renderModel) {
  renderModel.commands.forEach(command => {
    elevCtx.beginPath();
    elevCtx.arc(command.dot.x, command.dot.y, command.dot.radius, 0, Math.PI * 2);
    elevCtx.fillStyle = command.dot.fillStyle || renderModel.defaultDotFillStyle;
    elevCtx.fill();
    elevCtx.strokeStyle = renderModel.dotStrokeStyle;
    elevCtx.lineWidth = renderModel.dotStrokeWidth;
    elevCtx.stroke();
    if(command.leader) {
      elevCtx.beginPath();
      elevCtx.moveTo(command.leader.x1, command.leader.y1);
      elevCtx.lineTo(command.leader.x2, command.leader.y2);
      elevCtx.strokeStyle = renderModel.leaderStyle.strokeStyle;
      elevCtx.lineWidth = renderModel.leaderStyle.lineWidth;
      elevCtx.stroke();
    }
    if(command.text) {
      elevCtx.font = renderModel.textStyle.font;
      elevCtx.fillStyle = command.text.fillStyle || renderModel.textStyle.fillStyle;
      elevCtx.textAlign = renderModel.textStyle.textAlign;
      elevCtx.textBaseline = renderModel.textStyle.textBaseline;
      elevCtx.fillText(command.text.value, command.text.x, command.text.y);
      elevCtx.textBaseline = 'alphabetic';
    }
  });
}

/** 绘制 X 轴里程刻度 */
function drawElevAxes(layout, renderModel) {
  renderModel = renderModel || computeElevationRenderModel([], layout);
  const { PT, ph } = layout;
  const axisStyle = renderModel.axisStyle;

  // X 轴刻度
  elevCtx.fillStyle = axisStyle.tickText.fillStyle;
  elevCtx.font = axisStyle.tickText.font;
  renderModel.ticks.forEach(tick => {
    elevCtx.beginPath();
    elevCtx.moveTo(tick.x, PT + ph);
    elevCtx.lineTo(tick.x, PT + ph + 3);
    elevCtx.strokeStyle = axisStyle.tickLine.strokeStyle;
    elevCtx.lineWidth = axisStyle.tickLine.lineWidth;
    elevCtx.stroke();
    elevCtx.textAlign = tick.align;
    elevCtx.fillText(tick.label, tick.x, PT + ph + 14);
  });
  // X 轴标题
  elevCtx.textAlign = axisStyle.axisLabel.textAlign || 'center';
  elevCtx.fillStyle = axisStyle.axisLabel.fillStyle;
  elevCtx.font = axisStyle.axisLabel.font;
  elevCtx.fillText(t('elev.km'), renderModel.xAxisLabel.x, renderModel.xAxisLabel.y);
}

/** 更新顶部爬升/下降 badge */
function updateElevBadges(badges) {
  const ascEl = document.getElementById('elev-stat-asc');
  const descEl = document.getElementById('elev-stat-desc');
  if(ascEl) ascEl.textContent = badges.ascentText;
  if(descEl) descEl.textContent = badges.descentText;
}

function drawElevBar(pts, color, label, opts) {
  if(!elevCanvas || !elevCtx || !pts || pts.length < 2) return;
  opts = opts || {};

  const layout = computeElevLayout(pts, opts);
  const renderModel = computeElevationRenderModel(pts, layout);

  // 供 hit test / tooltip 使用
  _elevBarData = {
    pts, minE: layout.minE, maxE: layout.maxE,
    color: color || '#3F5238',
    km: layout.km,
    PL: layout.PL, PR: layout.PR, pw: layout.pw,
  };
  if(elevLabel) elevLabel.textContent = label || t('elev.title');
  updateElevBadges(renderModel.badges);

  elevCtx.clearRect(0, 0, layout.W, layout.H);
  drawElevBackground(layout, renderModel);
  drawElevGridLines(layout, renderModel);
  drawElevFill(pts, layout, renderModel);
  drawElevCurve(pts, layout, renderModel);

  const annos = collectElevAnnotations(pts, layout, opts);
  const annotationLayout = layoutElevLabels(annos, layout);
  drawElevBar._overflowRequest = annotationLayout.overflow;
  renderElevLabels(buildElevationAnnotationRenderModel(annotationLayout));
  drawElevAxes(layout, renderModel);
}

function refreshElevBar() {
  if(!elevCanvas) return;
  // v1.20.0：无选中分组时不绘制
  const main = state.activeGroup == null ? null : DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) {
    if(elevCtx) elevCtx.clearRect(0, 0, elevCanvas.width, elevCanvas.height);
    _elevBarData = null;
    return;
  }

  const bar = document.getElementById('elev-bar');

  function doDraw() {
    if(measureState.active && measureState.ptA && measureState.ptB) {
      const i1 = Math.min(measureState.ptA.idx, measureState.ptB.idx);
      const i2 = Math.max(measureState.ptA.idx, measureState.ptB.idx);
      const reversed = measureState.ptA.idx > measureState.ptB.idx;
      let segPts = main.track.slice(i1, i2 + 1);
      if(reversed) segPts = segPts.slice().reverse();
      drawElevBar(segPts, '#3F5238', t('elev.measure'), {
        kmFromZero: true,
        waypoints: main.waypoints,
        segIdxStart: i1, segIdxEnd: i2, reversed,
        measureMode: true,
      });
    } else if(dayPreviewState.active && dayPreviewState.trailId === main.id && dayPreviewState.iStart != null && dayPreviewState.iEnd != null) {
      const i1 = Math.min(dayPreviewState.iStart, dayPreviewState.iEnd);
      const i2 = Math.max(dayPreviewState.iStart, dayPreviewState.iEnd);
      const segPts = main.track.slice(i1, i2 + 1);
      drawElevBar(segPts, '#fbbf24', `D${dayPreviewState.day} · ${t('elev.measure')}`, {
        kmFromZero: true,
        waypoints: main.waypoints,
        segIdxStart: i1, segIdxEnd: i2, reversed: false,
        measureMode: true,
      });
    } else {
      drawElevBar(main.track, main.color, (main.name || t('mini.primary')) + ' · ' + t('elev.title'), {
        waypoints: main.waypoints,
        segIdxStart: 0, segIdxEnd: main.track.length - 1, reversed: false,
      });
    }
  }

  function currentElevStackContext() {
    let segPts = main.track;
    const layoutOpts = { width: elevCanvas.offsetWidth || 340, height: 140 };
    const annoOpts = {
      waypoints: main.waypoints,
      segIdxStart: 0,
      segIdxEnd: main.track.length - 1,
      reversed: false,
      measureMode: false,
    };
    if(measureState.active && measureState.ptA && measureState.ptB) {
      const i1 = Math.min(measureState.ptA.idx, measureState.ptB.idx);
      const i2 = Math.max(measureState.ptA.idx, measureState.ptB.idx);
      const reversed = measureState.ptA.idx > measureState.ptB.idx;
      segPts = main.track.slice(i1, i2 + 1);
      if(reversed) segPts = segPts.slice().reverse();
      layoutOpts.kmFromZero = true;
      layoutOpts.measureMode = true;
      Object.assign(annoOpts, { segIdxStart: i1, segIdxEnd: i2, reversed, measureMode: true });
    } else if(dayPreviewState.active && dayPreviewState.trailId === main.id && dayPreviewState.iStart != null && dayPreviewState.iEnd != null) {
      const i1 = Math.min(dayPreviewState.iStart, dayPreviewState.iEnd);
      const i2 = Math.max(dayPreviewState.iStart, dayPreviewState.iEnd);
      segPts = main.track.slice(i1, i2 + 1);
      layoutOpts.kmFromZero = true;
      layoutOpts.measureMode = true;
      Object.assign(annoOpts, { segIdxStart: i1, segIdxEnd: i2, reversed: false, measureMode: true });
    }
    return { segPts, layoutOpts, annoOpts };
  }

  // 计算目标高度：基础画布需求 + 堆叠层数 × (字高 + 间隔)
  const stackEstimate = (() => {
    const ctx = currentElevStackContext();
    if(!ctx.segPts || ctx.segPts.length < 2) {
      return { labelCount: 0, fontSize: 9.5, lineHeight: 12.5, stackDepth: 1 };
    }
    const layout = computeElevationLayout(ctx.segPts, ctx.layoutOpts);
    const annos = collectElevAnnotations(ctx.segPts, layout, ctx.annoOpts);
    return estimateElevationLabelStackDepth(annos, layout, {
      measureText: (text, fontSize, font) => {
        if(elevCtx) elevCtx.font = font;
        return elevCtx ? elevCtx.measureText(text).width : text.length * fontSize * 0.55;
      },
    });
  })();
  const targetH = computeElevationPanelHeight(stackEstimate);

  if(bar) {
    const cur = bar.offsetHeight;
    if(Math.abs(cur - targetH) > 2) {
      bar.style.height = targetH + 'px';
      void bar.offsetHeight; // 强制同步 reflow
    }
  }
  doDraw();
}

// hover：在海拔图上移动鼠标显示十字准线和数值
if(elevCanvas) {
  elevCanvas.style.pointerEvents = 'auto';

  // 共用：根据鼠标 X 找到对应 track 点
  function elevHitTest(e) {
    if(!_elevBarData) return null;
    const rect = elevCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const PL = _elevBarData.PL != null ? _elevBarData.PL : 44;
    const PR = _elevBarData.PR != null ? _elevBarData.PR : 16;
    const pw = rect.width - PL - PR;
    if(mx < PL || mx > PL + pw) return null;
    const ratio = (mx - PL) / pw;
    const km = _elevBarData.km || [];
    const pts = _elevBarData.pts;
    if(!km.length || !pts.length) return null;
    // X 是按 km 等距映射，不是按 idx —— 二分定位 idx
    const kmStart = km[0], kmEnd = km[km.length - 1];
    const targetKm = kmStart + (kmEnd - kmStart) * ratio;
    let lo = 0, hi = km.length - 1;
    while(lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if(km[mid] < targetKm) lo = mid; else hi = mid;
    }
    const idx = (Math.abs(km[lo] - targetKm) < Math.abs(km[hi] - targetKm)) ? lo : hi;
    return { idx, pt: pts[idx], mx };
  }

  elevCanvas.addEventListener('mousemove', e => {
    const hit = elevHitTest(e);
    if(!hit) { elevCrosshair.style.display = 'none'; elevTip.style.display = 'none'; return; }
    const { pt, mx } = hit;
    elevCrosshair.style.display = 'block';
    elevCrosshair.style.left = mx + 'px';
    elevTip.style.display = 'block';
    const rect = elevCanvas.getBoundingClientRect();
    elevTip.style.left = Math.min(mx + 8, rect.width - 140) + 'px';
    elevTip.innerHTML = `<b>${pt[3] !== undefined ? pt[3] + 'km' : ''}</b> · ${pt[2]}m · ↑<b>${pt[4]}m</b>`;
  });

  elevCanvas.addEventListener('mouseleave', () => {
    elevCrosshair.style.display = 'none';
    elevTip.style.display = 'none';
  });

  // 点击：无论是否测距模式，海拔图内点击 → 地图定位
  let _elevClickMarker = null;
  elevCanvas.addEventListener('click', e => {
    const hit = elevHitTest(e);
    if(!hit) return;
    const { pt } = hit;
    if(!pt || pt[0] == null) return;

    // 移除旧标记
    if(_elevClickMarker) { _elevClickMarker.remove(); _elevClickMarker = null; }

    const latlng = [pt[0], pt[1]];
    const color = (_elevBarData && _elevBarData.color) || '#fbbf24';
    _elevClickMarker = L.circleMarker(latlng, {
      radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1,
      pane: 'tooltipPane'
    }).addTo(map);
    const tipTxt = `${pt[3] !== undefined ? pt[3] + 'km · ' : ''}${Math.round(pt[2])}m`;
    _elevClickMarker.bindTooltip(tipTxt, { permanent: true, direction: 'top', offset: [0,-8], className: 'measure-tip' }).openTooltip();
    map.panTo(latlng, { animate: true, duration: 0.4 });

    clearTimeout(_elevClickMarker._autoRemove);
    _elevClickMarker._autoRemove = setTimeout(() => {
      if(_elevClickMarker) { _elevClickMarker.remove(); _elevClickMarker = null; }
    }, 3000);
  });
}

// window resize 时重绘
window.addEventListener('resize', () => { if(_elevBarData) refreshElevBar(); });

/* ============ Persistence (IndexedDB) ============ */
const DB_NAME = 'hiking_trail_db';
const STORE_NAME = 'trails';
const DATA_KEY = 'main';
let _dbPromise = null;
let storageAvailable = true;

function openDB() {
  if(_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if(!window.indexedDB) { storageAvailable = false; reject(new Error('IndexedDB not supported')); return; }
    let req;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch(e) {
      storageAvailable = false;
      reject(e);
      return;
    }
    req.onerror = () => { storageAvailable = false; reject(req.error); };
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
  });
  return _dbPromise;
}

let _saveTimer = null;
function saveToStorage() {
  // 防抖：300ms 内的多次保存合并成 1 次
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_doSave, 300);
}


function storageTrailId(trail) {
  return trail && typeof trail.id === 'string' && trail.id ? trail.id : null;
}

function storageHasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}


async function _doSave() {
  if(!storageAvailable) {
    if(!window._sandboxWarned) {
      window._sandboxWarned = true;
      showToast('ℹ 当前环境不支持自动保存。请用「📤 导出」保留数据', 'info', 5000);
    }
    return;
  }
  try {
    const db = await openDB();
    const op = buildStorageWriteOperation(DATA.trails, state, { storeName: STORE_NAME, dataKey: DATA_KEY });
    await HTM_APP.executeIndexedDbOperation(db, op);
    showToast('✓ 已自动保存（' + DATA.trails.length + ' 条轨迹）');
  } catch(e) {
    if(e.name === 'QuotaExceededError') {
      showToast('❌ 存储已满（' + (DATA.trails.length) + ' 条轨迹）。请删除部分后重试', 'error', 5000);
    } else {
      console.warn('save failed:', e);
      storageAvailable = false;
      if(!window._sandboxWarned) {
        window._sandboxWarned = true;
        showToast('ℹ 当前环境不支持自动保存：' + e.message, 'info', 5000);
      }
    }
  }
}

async function loadFromStorage() {
  if(!storageAvailable) return false;
  try {
    const db = await openDB();
    const op = buildStorageReadOperation({ storeName: STORE_NAME, dataKey: DATA_KEY });
    const data = await HTM_APP.executeIndexedDbOperation(db, op);
    const restored = restoreStorageSnapshot(data, { currentActiveGroup: state.activeGroup });
    if(!restored.ok) return false;
    DATA.trails = restored.trails;
    // 兼容旧数据：缺 descent_m 则现场补算
    DATA.trails.forEach(tr => {
      if(tr.stats && (tr.stats.descent_m === undefined || tr.stats.descent_m === null) && tr.track && tr.track.length) {
        const elevs = tr.track.map(p => p[2] || 0);
        const arr = accumulatorDescent(elevs, 10);
        tr.stats.descent_m = Math.round(arr[arr.length-1] || 0);
      }
      // 兼容旧数据：补算 _descCum
      if(!tr._descCum && tr.track && tr.track.length) {
        tr._descCum = accumulatorDescent(tr.track.map(p => p[2] || 0), 10);
      }
      // 兼容旧数据：escape_routes 为空则从 waypoints + track 重新推算（v1.12.3：默认关闭，仅 state.autoGenerateEscape=true 时启用）
      if(state.autoGenerateEscape && (!tr.escape_routes || tr.escape_routes.length === 0) && tr.waypoints && tr.track && tr.track.length) {
        const fakePts = tr.track.map(p => ({ lat: p[0], lng: p[1], elev: p[2] || 0 }));
        const others = DATA.trails.filter(t => t.id !== tr.id);
        tr.escape_routes = buildEscapeRoutes(tr.waypoints, fakePts, others);
      }
    });
    state.activeTrails = restored.activeTrails;
    state.activeGroup = restored.activeGroup;
    state.primaryByGroup = restored.primaryByGroup;
    return true;
  } catch(e) {
    console.warn('load failed:', e);
    return false;
  }
}

async function clearStorage() {
  if(!storageAvailable) return;
  try {
    const db = await openDB();
    const op = buildStorageDeleteOperation({ storeName: STORE_NAME, dataKey: DATA_KEY });
    await HTM_APP.executeIndexedDbOperation(db, op);
  } catch(e) {
    console.warn('clear failed:', e);
  }
}

/* ── 下载单条轨迹为 KML 文件 ── */
function downloadTrailKML(id) {
  const trail = DATA.trails.find(t => t.id === id);
  if(!trail) return;
  const track = trail.track;
  const waypoints = trail.waypoints;
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name><![CDATA[${trail.name}]]></name>
    <description><![CDATA[${trail.id} | ${trail.stats.distance_km}km ↑${trail.stats.ascent_m}m | 最高${trail.stats.max_elev}m]]></description>
    <Style id="trackStyle">
      <LineStyle><color>ff${trail.color.replace('#','').split('').reverse().join('')}</color><width>3</width></LineStyle>
    </Style>
`;
  // 轨迹线
  kml += `    <Placemark>
      <name><![CDATA[${trail.name}]]></name>
      <styleUrl>#trackStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
`;
  track.forEach(p => { kml += `          ${p[1]},${p[0]},${p[2]||0}
`; });
  kml += `        </coordinates>
      </LineString>
    </Placemark>
`;
  // 标注点
  waypoints.forEach(wp => {
    if(!wp.lat || !wp.lng) return;
    kml += `    <Placemark>
      <name><![CDATA[${wp.label || wp.icon}]]></name>
      <description><![CDATA[${wp.tag} | ${wp.elev}m | ${wp.km}km]]></description>
      <Point><coordinates>${wp.lng},${wp.lat},${wp.elev||0}</coordinates></Point>
    </Placemark>
`;
  });
  kml += `  </Document>
</kml>`;
  const blob = new Blob([kml], {type:'application/vnd.google-earth.kml+xml'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${trail.name}.kml`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('✓ KML 已下载：' + trail.name);
}

function deleteTrail(id) {
  DATA.trails = DATA.trails.filter(t => t.id !== id);
  state.activeTrails.delete(id);
  state.primaryByGroup = removeTrailFromPrimaryByGroup(DATA.trails, state.primaryByGroup, id);
  // 如果当前组没有主轨迹了，也不强制兜底（rebuildAll 会处理）
  saveToStorage();
  rebuildAll();
}

// 反向一条轨迹：翻转 track + 重算里程/爬升/下降/天数 + 翻转 waypoints
function reverseTrail(id) {
  const trail = DATA.trails.find(t => t.id === id);
  if(!trail || !trail.track || !trail.track.length) return;

  // 1. 翻转 track 点顺序
  trail.track.reverse();

  // 2. 重算累计里程（cumD），爬升（cumA），下降（cumDesc），天数
  const elevs = trail.track.map(p => p[2]);
  const cumA = accumulatorAscent(elevs, 10);
  const cumDesc = accumulatorDescent(elevs, 10);
  let cumD = 0;
  for(let i=0; i<trail.track.length; i++) {
    if(i > 0) {
      cumD += haversine(trail.track[i-1][0], trail.track[i-1][1], trail.track[i][0], trail.track[i][1]);
    }
    trail.track[i][3] = +(cumD/1000).toFixed(2);  // km
    trail.track[i][4] = Math.round(cumA[i]);        // cum ascent
    // 天数反向：D1→Dn, D2→Dn-1...
  }

  // 3. 反向天数标签（把 D1..Dn 翻转为 Dn..D1）
  const nDays = trail.days || 1;
  if(nDays > 1) {
    trail.track.forEach(p => { if(p[5]) p[5] = nDays - p[5] + 1; });
  }

  // 4. 更新 stats（爬升/下降交换，因为反向后原下降变爬升）
  const totalAsc = Math.round(cumA[cumA.length-1] || 0);
  const totalDesc = Math.round(cumDesc[cumDesc.length-1] || 0);
  trail.stats.ascent_m = totalAsc;
  trail.stats.descent_m = totalDesc;
  // 距离不变（标量），最高最低也不变

  // 5. 更新 _descCum
  trail._descCum = cumDesc;

  // 6. 翻转 waypoints 的 km / elev / gps_idx（gps_idx 重新 snap 到新顺序）
  if(trail.waypoints && trail.waypoints.length) {
    const totalKm = trail.stats.distance_km;
    trail.waypoints.forEach(wp => {
      // km 映射：原始 km → totalKm - km（镜像）
      if(wp.km !== undefined) wp.km = +(totalKm - wp.km).toFixed(1);
      // lat/lng 不变，重新 snap 到新顺序，更新 gps_idx + km + elev
      if(wp.lat && wp.lng) {
        let bestI = 0, bestD = Infinity;
        for(let i=0; i<trail.track.length; i++) {
          const d = haversine(wp.lat, wp.lng, trail.track[i][0], trail.track[i][1]);
          if(d < bestD) { bestD = d; bestI = i; }
        }
        wp.gps_idx = bestI;
        wp.km = +(trail.track[bestI][3]).toFixed(1);
        wp.elev = Math.round(trail.track[bestI][2]);
      } else if(wp.gps_idx != null) {
        // 没 lat/lng 但有 gps_idx：直接镜像 idx
        wp.gps_idx = (trail.track.length - 1) - wp.gps_idx;
      }
    });
    // 按 km 重新排序
    trail.waypoints.sort((a,b) => (a.km||0) - (b.km||0));
  }

  // 7. 缓存失效
  delete trail._descCum;
  trail._descCum = cumDesc;

  saveToStorage();
  rebuildAll({fit: false});
  showToast(`⇄ 「${trail.name}」已反向`);
}

async function clearAllTrails() {
  if(!DATA.trails.length) return;
  if(!confirm(`确定清除全部 ${DATA.trails.length} 条轨迹？此操作不可撤销。`)) return;
  DATA.trails = [];
  state.primaryTrailId = null;
  state.activeTrails = new Set();
  state.activeEscape = null;
  await clearStorage();
  rebuildAll();
}

/* ============ Toast ============ */
function showToast(msg, type='info', duration=2400) {
  let el = document.getElementById('toast');
  if(!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(20,24,32,0.96);border:1px solid var(--line);padding:8px 16px;border-radius:5px;color:var(--text);font-size:12px;z-index:5500;box-shadow:0 4px 16px rgba(0,0,0,0.4);transition:opacity 0.3s;max-width:80vw';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.color = type === 'error' ? '#ff8888' : 'var(--text)';
  el.style.opacity = '1';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { el.style.opacity = '0'; }, duration);
}

/* ============ Export Offline ============ */
async function exportOffline() {
  if(!DATA.trails.length) { showToast('没有轨迹可导出', 'error'); return; }
  // v1.14.1：点击式选择菜单（附着在导出按钮下方），不用 confirm 阻塞对话框
  showExportMenu();
}

/* v1.14.1：导出选择菜单（悬浮在导出按钮下方） */
function showExportMenu() {
  // 已存在则先关闭（起到 toggle 效果）
  const existing = document.getElementById('export-menu-popup');
  if(existing) { existing.remove(); return; }

  const btn = document.getElementById('export-btn');
  if(!btn) { exportGroupKML(); return; }
  const rect = btn.getBoundingClientRect();

  const popup = document.createElement('div');
  popup.id = 'export-menu-popup';
  popup.style.cssText = `
    position:fixed;
    top:${rect.bottom + 6}px;
    left:${Math.max(8, rect.right - 260)}px;
    z-index:9999;
    background:var(--bg-1, #fff);
    border:1px solid var(--line, #ccc);
    border-radius:6px;
    box-shadow:0 6px 20px rgba(0,0,0,0.22);
    min-width:260px;
    padding:6px;
    font-size:12px;
    color:var(--text, #222);
  `;

  const activeCount = DATA.trails.filter(t => isTrailActive(t)).length;
  const items = [
    {
      icon: '📦',
      label: '打包 KML ZIP',
      desc: state.activeGroup
        ? `当前组「${state.activeGroup}」叠加中 ${activeCount} 条 · 可跨设备一键导入`
        : `未选中任何分组 · 请先切换到一个分组`,
      disabled: activeCount === 0,
      handler: () => { popup.remove(); exportGroupKML(); },
    },
    {
      icon: '📄',
      label: '行程 Markdown',
      desc: '按天数/爬升/扎营点/下撤方案生成行程表',
      handler: () => { popup.remove(); exportItineraryMD(); },
    },
  ];

  items.forEach(item => {
    const el = document.createElement('div');
    el.style.cssText = `
      padding:8px 10px;
      border-radius:4px;
      cursor:${item.disabled ? 'not-allowed' : 'pointer'};
      opacity:${item.disabled ? 0.4 : 1};
      display:flex;
      align-items:flex-start;
      gap:8px;
      transition:background 0.12s;
    `;
    el.innerHTML = `
      <span style="font-size:16px;line-height:1">${item.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;line-height:1.3">${item.label}</div>
        <div style="font-size:10.5px;color:var(--text-muted, #888);margin-top:2px;line-height:1.35">${item.desc}</div>
      </div>
    `;
    if(!item.disabled) {
      el.addEventListener('mouseenter', () => el.style.background = 'var(--bg-0, rgba(0,0,0,0.04))');
      el.addEventListener('mouseleave', () => el.style.background = '');
      el.addEventListener('click', item.handler);
    }
    popup.appendChild(el);
  });

  document.body.appendChild(popup);

  // 点外部关闭
  const closeOnOutside = (e) => {
    if(!popup.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      popup.remove();
      document.removeEventListener('mousedown', closeOnOutside, true);
      document.removeEventListener('touchstart', closeOnOutside, true);
    }
  };
  setTimeout(() => {
    document.addEventListener('mousedown', closeOnOutside, true);
    document.addEventListener('touchstart', closeOnOutside, true);
  }, 0);
}

/* ─── v1.14.1：批量导出当前组叠加中的轨迹为 ZIP ───────────────
   ZIP 内容：
     - 每条轨迹独立一个 .kml（含轨迹线 + 标注点）
     - _<组名>_合并.kml：所有轨迹合并到一个 Document（便于一键导入不支持多文件的设备）
     - README.txt：说明与轨迹清单
   fflate 未加载时降级为逐条下载 KML。
   ────────────────────────────────────────────────────────────── */
function _trailToKMLString(trail) {
  const track = trail.track;
  const waypoints = trail.waypoints || [];
  const colorHex = (trail.color || '#3F5238').replace('#','');
  const kmlColor = 'ff' + colorHex.slice(4,6) + colorHex.slice(2,4) + colorHex.slice(0,2);
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name><![CDATA[${trail.name}]]></name>
    <description><![CDATA[${trail.id} | ${trail.stats.distance_km}km ↑${trail.stats.ascent_m}m | 最高${trail.stats.max_elev}m | 分组：${trailGroup(trail)}]]></description>
    <Style id="trackStyle"><LineStyle><color>${kmlColor}</color><width>3</width></LineStyle></Style>
    <Placemark>
      <name><![CDATA[${trail.name}]]></name>
      <styleUrl>#trackStyle</styleUrl>
      <LineString><tessellate>1</tessellate><coordinates>
`;
  track.forEach(p => { kml += `        ${p[1]},${p[0]},${p[2]||0}\n`; });
  kml += `      </coordinates></LineString>
    </Placemark>
`;
  waypoints.forEach(wp => {
    if(!wp.lat || !wp.lng) return;
    kml += `    <Placemark>
      <name><![CDATA[${wp.label || wp.icon || wp.tag}]]></name>
      <description><![CDATA[${wp.tag} | ${wp.elev}m | ${wp.km}km]]></description>
      <Point><coordinates>${wp.lng},${wp.lat},${wp.elev||0}</coordinates></Point>
    </Placemark>
`;
  });
  kml += `  </Document>
</kml>`;
  return kml;
}

function _buildMergedKML(trails, groupName) {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name><![CDATA[${groupName}（合并）]]></name>
    <description><![CDATA[导出时间：${new Date().toLocaleString('zh-CN')} | 共 ${trails.length} 条轨迹]]></description>
`;
  trails.forEach(trail => {
    const colorHex = (trail.color || '#3F5238').replace('#','');
    const kmlColor = 'ff' + colorHex.slice(4,6) + colorHex.slice(2,4) + colorHex.slice(0,2);
    kml += `    <Style id="s_${trail.id}"><LineStyle><color>${kmlColor}</color><width>3</width></LineStyle></Style>
    <Folder><name><![CDATA[${trail.name}]]></name>
      <Placemark>
        <name><![CDATA[${trail.name} 轨迹]]></name>
        <styleUrl>#s_${trail.id}</styleUrl>
        <LineString><tessellate>1</tessellate><coordinates>
`;
    trail.track.forEach(p => { kml += `          ${p[1]},${p[0]},${p[2]||0}\n`; });
    kml += `        </coordinates></LineString>
      </Placemark>
`;
    (trail.waypoints || []).forEach(wp => {
      if(!wp.lat || !wp.lng) return;
      kml += `      <Placemark>
        <name><![CDATA[${wp.label||wp.icon||wp.tag}]]></name>
        <description><![CDATA[${wp.tag}|${wp.elev}m|${wp.km}km]]></description>
        <Point><coordinates>${wp.lng},${wp.lat},${wp.elev||0}</coordinates></Point>
      </Placemark>
`;
    });
    kml += `    </Folder>
`;
  });
  kml += `  </Document>
</kml>`;
  return kml;
}

function exportGroupKML() {
  const trails = DATA.trails.filter(t => isTrailActive(t));
  if(!trails.length) {
    showToast('当前组没有叠加中的轨迹', 'error');
    return;
  }
  const groupName = state.activeGroup || '未选中';
  const timestamp = new Date().toISOString().slice(0,10);
  const safeGroup = groupName.replace(/[\\/:*?"<>|]/g, '_');

  if(typeof fflate !== 'undefined') {
    const files = {};
    // 独立 KML
    trails.forEach(trail => {
      const kml = _trailToKMLString(trail);
      const safeName = trail.name.replace(/[\\/:*?"<>|]/g, '_');
      files[`轨迹/${safeName}.kml`] = fflate.strToU8(kml);
    });
    // 合并 KML（前缀 _ 排在前面）
    files[`_${safeGroup}_合并导入.kml`] = fflate.strToU8(_buildMergedKML(trails, groupName));
    // README
    const readme = `# ${groupName} 轨迹包

导出时间：${new Date().toLocaleString('zh-CN')}
共 ${trails.length} 条轨迹

## 使用方式
- **推荐**：直接拖拽本文件夹里所有 *.kml 到目标地图（支持多选）
- **一键导入**：拖拽 _${safeGroup}_合并导入.kml 一个文件，即可加载全部
- **单条查看**：轨迹/ 目录下每条轨迹独立 KML

## 轨迹清单
${trails.map((t, i) => `${i+1}. ${t.name}  (${t.stats.distance_km}km, ↑${t.stats.ascent_m}m, 最高 ${t.stats.max_elev}m, ${t.waypoints.length} 个标注点)`).join('\n')}
`;
    files['README.txt'] = fflate.strToU8(readme);

    fflate.zip(files, {level: 6}, (err, data) => {
      if(err) { showToast('ZIP 打包失败：' + err.message, 'error'); return; }
      const blob = new Blob([data], {type: 'application/zip'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${safeGroup}_轨迹_${timestamp}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast(`✓ 已导出 ${trails.length} 条轨迹 → ${a.download}`);
    });
  } else {
    // fflate 未加载：先下载合并 KML（一键导入用），再逐条下载单独 KML
    showToast(`ZIP 库未加载，将下载 ${trails.length + 1} 个 KML 文件（首个为合并版）…`, 'info', 4000);
    // 合并版
    const mergedBlob = new Blob([_buildMergedKML(trails, groupName)], {type:'application/vnd.google-earth.kml+xml'});
    const a0 = document.createElement('a');
    a0.href = URL.createObjectURL(mergedBlob);
    a0.download = `_${safeGroup}_合并导入.kml`;
    a0.click();
    URL.revokeObjectURL(a0.href);
    // 单独 KML
    trails.forEach((trail, i) => {
      setTimeout(() => {
        const kml = _trailToKMLString(trail);
        const blob = new Blob([kml], {type:'application/vnd.google-earth.kml+xml'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const safeName = trail.name.replace(/[\\/:*?"<>|]/g, '_');
        a.download = `${safeName}.kml`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, (i + 1) * 400);
    });
  }
}


/* ─── 生成单天海拔剖面图 Canvas，返回 base64 PNG dataURL ─── */
function buildDayElevChart(pts, color, dayLabel) {
  const CW = 900, CH = 200;
  const c = document.createElement('canvas'); c.width = CW; c.height = CH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1f2e'; ctx.fillRect(0, 0, CW, CH);
  const alts = pts.map(p => p[2]);
  const minE = Math.min(...alts), maxE = Math.max(...alts), eRng = maxE - minE || 1;
  const PL = 52, PR = 12, PT = 24, PB = 32;
  const pw = CW - PL - PR, ph = CH - PT - PB;
  const pX = i => PL + (i / (pts.length - 1)) * pw;
  const pY = a => PT + ph * (1 - (a - minE) / eRng);
  // 填充区域
  ctx.beginPath();
  ctx.moveTo(PL, PT + ph);
  pts.forEach((p, i) => ctx.lineTo(pX(i), pY(p[2])));
  ctx.lineTo(PL + pw, PT + ph);
  ctx.closePath();
  // 将 hex color 转为 rgba
  let r=100,g=150,b=255;
  const m = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if(m){r=parseInt(m[1],16);g=parseInt(m[2],16);b=parseInt(m[3],16);}
  const grad = ctx.createLinearGradient(0, PT, 0, PT + ph);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad; ctx.fill();
  // 轮廓线
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(pX(i), pY(p[2])) : ctx.lineTo(pX(i), pY(p[2])));
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  // Y 轴刻度
  ctx.font = '11px monospace'; ctx.textAlign = 'right';
  [0, 0.5, 1].forEach(f => {
    const e = minE + f * eRng, y = PT + ph * (1 - f);
    ctx.fillStyle = 'rgba(100,120,150,0.25)';
    ctx.fillRect(PL, y - 0.5, pw, 1);
    ctx.fillStyle = '#8899aa'; ctx.fillText(Math.round(e) + 'm', PL - 4, y + 4);
  });
  // 最高点
  const peakIdx = alts.indexOf(maxE);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(pX(peakIdx), pY(maxE), 4, 0, Math.PI * 2); ctx.fill();
  ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
  ctx.fillText('▲' + Math.round(maxE) + 'm', pX(peakIdx), pY(maxE) - 10);
  // 起终高度
  ctx.font = '11px monospace'; ctx.fillStyle = '#aabbcc';
  ctx.textAlign = 'left';  ctx.fillText(Math.round(alts[0]) + 'm', PL + 2, CH - 8);
  ctx.textAlign = 'right'; ctx.fillText(Math.round(alts[alts.length-1]) + 'm', PL + pw - 2, CH - 8);
  // 标题
  ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = color; ctx.textAlign = 'left';
  ctx.fillText(dayLabel + ' 海拔剖面', PL, 16);
  return c.toDataURL('image/png');
}


async function exportItineraryMD() {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main) { showToast('请先设置主轨迹', 'error'); return; }
  const isZh = currentLang === 'zh';

  // ── 按天分组 ──
  const track = main.track;
  const days = {};
  track.forEach(p => { const d = p[5] || 1; if(!days[d]) days[d] = []; days[d].push(p); });
  const dayKeys = Object.keys(days).map(Number).sort((a,b) => a-b);
  const DAY_COLORS = dayPalette;

  // ── 辅助函数 ──
  function haversine2d(p1, p2) {
    const R=6371, dLat=(p2[0]-p1[0])*Math.PI/180, dLon=(p2[1]-p1[1])*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(p1[0]*Math.PI/180)*Math.cos(p2[0]*Math.PI/180)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }
  function dayDist2(pts) { let d=0; for(let i=1;i<pts.length;i++) d+=haversine2d(pts[i-1],pts[i]); return d.toFixed(1); }
  function dayAsc2(pts) { let a=0,prev=pts[0][2]; pts.forEach(p=>{const d=p[2]-prev;if(d>10)a+=d;prev=p[2];}); return Math.round(a); }
  function dayMax2(pts) { return Math.round(Math.max(...pts.map(p=>p[2]))); }
  function dayMin2(pts) { return Math.round(Math.min(...pts.map(p=>p[2]))); }

  // ── 生成每天海拔剖面图 ──
  showToast('⏳ 生成行程图…');
  const dayCharts = {};
  dayKeys.forEach((dk, di) => {
    dayCharts[dk] = buildDayElevChart(days[dk], DAY_COLORS[di % DAY_COLORS.length], 'D' + dk);
  });

  // ── 生成 MD 内容 ──
  let md = `# ${main.name} ${isZh ? '行程表' : 'Itinerary'}\n\n`;
  md += `> 总里程 **${main.stats.distance_km}km** · 爬升 **${main.stats.ascent_m}m** · 最高 **${main.stats.max_elev}m** · ${dayKeys.length}天\n\n---\n\n`;

  // 汇总表格
  md += `| 天数 | 里程 | 爬升 | 最高海拔 | 最低海拔 | 营地 |\n|---|---|---|---|---|---|\n`;
  if(main.day_meta && main.day_meta.length) {
    main.day_meta.forEach(d => {
      md += `| D${d.d||'?'} | ${d.km||'-'}km | ${d.asc||'-'}m | ${d.max||'-'}m | ${d.min||'-'}m | ${d.camp||'-'}(${d.camp_elev||'?'}m) |\n`;
    });
  } else {
    dayKeys.forEach((dk, di) => {
      const pts = days[dk];
      const camp = main.waypoints.find(w => w.tag === 'camp' && (w.day || di+1) === dk);
      md += `| D${dk} | ${dayDist2(pts)}km | ${dayAsc2(pts)}m | ${dayMax2(pts)}m | ${dayMin2(pts)}m | ${camp ? camp.label + ' ' + camp.elev + 'm' : '-'} |\n`;
    });
  }
  md += '\n---\n\n';

  // 每天详情 + 海拔剖面图
  dayKeys.forEach((dk, di) => {
    const pts = days[dk];
    const color = DAY_COLORS[di % DAY_COLORS.length];
    const km = dayDist2(pts), asc = dayAsc2(pts), maxE = dayMax2(pts), minE = dayMin2(pts);
    const camp = main.waypoints.find(w => w.tag === 'camp' && ((w.day || di+1) === dk));
    const passes = main.waypoints.filter(w => w.tag === 'pass' && ((w.day || di+1) === dk));
    const imgUrl = dayCharts[dk];

    md += `## D${dk}\n\n`;
    md += `**里程**: ${km}km　**爬升**: ${asc}m　**最高**: ${maxE}m　**最低**: ${minE}m`;
    if(camp) md += `　**营地**: ${camp.label} (${camp.elev}m)`;
    md += '\n\n';
    if(passes.length) md += passes.map(p => `**垭口**: ${p.label} (${p.elev}m)`).join('　') + '\n\n';

    // 嵌入 base64 海拔剖面图
    md += `![D${dk} 海拔剖面](${imgUrl})\n\n`;

    md += '---\n\n';
  });

  const blob = new Blob([md], {type:'text/markdown;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `${main.name}_${isZh?'行程':'itinerary'}.md`;
  if(window.showSaveFilePicker) {
    try {
      const h = await showSaveFilePicker({suggestedName:a.download,types:[{description:'MD',accept:{'text/markdown':['.md']}}]});
      const w = await h.createWritable(); await w.write(blob); await w.close();
      showToast('✓ MD 已保存'); return;
    } catch(e) {}
  }
  a.click(); URL.revokeObjectURL(a.href); showToast('✓ 行程 MD（含海拔图）已导出');
}


function rebuildAll(opts={}) {
  // 主轨迹兜底（v1.20.0：无选中分组时不做兜底，保留 null；否则先在当前分组挑，找不到再跨分组）
  if(state.activeGroup != null && !state.primaryTrailId && DATA.trails.length) {
    const inGroup = DATA.trails.filter(t => trailGroup(t) === state.activeGroup);
    state.primaryTrailId = (inGroup[0] || DATA.trails[0]).id;
  }
  if(typeof clearDaySegmentPreview === 'function') clearDaySegmentPreview({silent:true});
  // 刷新所有面板
  buildTrailList();
  buildHeaderStats();
  buildFilterGrid();
  buildDaysTab();
  buildEscapeTab();
  buildLegend();
  buildWaypointModeTagGrid();
  drawTracks();
  drawWaypoints();
  // 重建后立即应用 i18n（动态 HTML 中可能有 data-i18n 标记）
  if(typeof applyI18n === 'function') applyI18n();
  // 刷新底部海拔图
  if(typeof refreshElevBar === 'function') setTimeout(refreshElevBar, 100);
  // 自动定位（仅 fit=true 时）
  if(opts.fit && DATA.trails.length) {
    const allLatLngs = [];
    DATA.trails.forEach(t => t.track.forEach(p => allLatLngs.push([p[0], p[1]])));
    if(allLatLngs.length) {
      map.fitBounds(L.latLngBounds(allLatLngs), {padding:[40,40]});
    }
  }
}


function findNearestIdx(pts, lat, lng) {
  let bestI = 0, bestD = Infinity;
  for(let i=0; i<pts.length; i++) {
    const d = haversine(lat, lng, pts[i].lat, pts[i].lng);
    if(d < bestD) { bestD = d; bestI = i; }
  }
  return bestI;
}

const TAG_RULES_JS = [
  ['start', ['开始徒步','起点','出发','起步'], '🚩', '#5eb3ff'],
  ['end',   ['终点','结束','收队'], '🏁', '#5eb3ff'],
  ['fork',  ['分叉','分岔','路口','走左边','走右边','切下去','右转','左转','岔路'], '⑫', '#ff8c42'],
  ['camp',  ['营地','扎营','宿营','过夜'], '🏕', '#22c55e'],
  ['pass',  ['垭口','口子'], '🏔', '#ef4444'],
  ['warn',  ['Z字','陡','危险','注意','小心','高反','滚石','滑'], '⚠', '#dc2626'],
  ['supply',['商店','补给','便宜','柠檬茶','咖啡','卖','夯达','小卖部','杂货'], '🏪', '#facc15'],
  ['water', ['水源','打水','取水'], '💧', '#3b82f6'],
  ['shelter',['避雨','避风','小木屋','木屋'], '🏠', '#a855f7'],
  ['bridge',['过桥','过河','涉水'], '🌉', '#06b6d4'],
  ['river', ['小溪','大河'], '🏞', '#0ea5e9'],
  ['village',['村','寨','牧民','藏民','居民点'], '🏘', '#d97706'],
  ['highpoint', [], '⛰', '#fbbf24'],
];
function classifyTag(name) {
  if(!name) return ['other', '📍', '#aaa'];
  for(const [tag, kws, icon, color] of TAG_RULES_JS) {
    for(const kw of kws) if(name.includes(kw)) return [tag, icon, color];
  }
  return ['other', '📍', '#aaa'];
}


function extractKmlParseModelInput(doc) {
  const titleEl = doc.querySelector('Document > name') || doc.querySelector('name');
  const title = titleEl ? titleEl.textContent.trim() : '';
  const lineStringCoordinateTexts = Array.from(doc.querySelectorAll('LineString'))
    .map(ls => {
      const c = ls.querySelector('coordinates');
      return c ? c.textContent : '';
    });

  const gxTracks = Array.from(doc.getElementsByTagNameNS('http://www.google.com/kml/ext/2.2', 'Track'))
    .map(trk => ({
      whens: Array.from(trk.getElementsByTagNameNS('http://www.opengis.net/kml/2.2', 'when')).map(w => w.textContent),
      coords: Array.from(trk.getElementsByTagNameNS('http://www.google.com/kml/ext/2.2', 'coord')).map(c => c.textContent),
    }));

  // 标注点
  const waypoints = [];
  doc.querySelectorAll('Placemark').forEach(pm => {
    const point = pm.querySelector('Point');
    if(!point) return;
    const c = point.querySelector('coordinates');
    if(!c || !c.textContent) return;
    const nameEl = pm.querySelector(':scope > name');
    const descEl = pm.querySelector(':scope > description');
    waypoints.push({
      name: nameEl ? nameEl.textContent : undefined,
      coordinateText: c.textContent,
      description: descEl ? descEl.textContent : '',
    });
  });

  const data = Array.from(doc.querySelectorAll('Data')).map(d => {
    const v = d.querySelector('value');
    return { name: d.getAttribute('name'), value: v ? v.textContent : '' };
  });

  return { title, lineStringCoordinateTexts, gxTracks, waypoints, data };
}

function parseKml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  if(doc.querySelector('parsererror')) throw new Error('XML 解析失败');
  return buildKmlParseModel(extractKmlParseModelInput(doc));
}

function processTrack(pts) {
  const cumD = [0];
  for(let i=1; i<pts.length; i++) {
    cumD.push(cumD[i-1] + haversine(pts[i-1].lat, pts[i-1].lng, pts[i].lat, pts[i].lng));
  }
  const elevs = pts.map(p => p.elev);
  const smoothE = smoothElev(elevs, 7);
  const cumA = accumulatorAscent(elevs, 10);
  const cumDesc = accumulatorDescent(elevs, 10);
  // 分天：基于时间戳，没时间戳全归 1
  const days = pts.map(p => {
    if(!p.t) return null;
    const m = p.t.match(/(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  });
  const uniqDays = [...new Set(days.filter(d => d))];
  uniqDays.sort();
  const dayMap = {};
  uniqDays.forEach((d, i) => { dayMap[d] = i+1; });
  const dayOfIdx = days.map(d => dayMap[d] || 1);

  return pts.map((p, i) => [
    +p.lat.toFixed(6), +p.lng.toFixed(6),
    Math.round(smoothE[i]), +(cumD[i]/1000).toFixed(2),
    Math.round(cumA[i]), dayOfIdx[i],
  ]);
}


function buildEscapeRoutes(wps, pts, otherTrails) {
  // pts 是原始 trackPoints（有 lat/lng/elev 字段）
  // otherTrails: 可选，DATA.trails 中除本轨迹外的其他轨迹数组
  const cumD = [0];
  for(let i=1; i<pts.length; i++) {
    cumD.push(cumD[i-1] + haversine(pts[i-1].lat, pts[i-1].lng, pts[i].lat, pts[i].lng));
  }

  // 所有营地
  const camps = wps.filter(w => w.tag === 'camp');
  // 本轨迹下撤目标：village / start / end / supply
  const exits = wps.filter(w => ['village','start','end','supply'].includes(w.tag));

  // ── 跨轨迹下撤目标 ──
  // 策略：在其他轨迹中找与本轨迹交叉/接近的点（≤500m），作为额外下撤锚点
  const crossAnchors = []; // {lat, lng, elev, label, trailId, trailName, tag}
  if(otherTrails && otherTrails.length) {
    for(const ot of otherTrails) {
      if(!ot.track || !ot.track.length) continue;
      // 先用 start/end/supply/village/camp waypoints（最有意义的节点）
      const otWps = (ot.waypoints || []).filter(w =>
        ['start','end','supply','village','camp'].includes(w.tag)
      );
      for(const ow of otWps) {
        // 找本轨迹上离它最近的点
        let bestI = 0, bestD = Infinity;
        for(let i = 0; i < pts.length; i++) {
          const d = haversine(ow.lat, ow.lng, pts[i].lat, pts[i].lng);
          if(d < bestD) { bestD = d; bestI = i; }
        }
        if(bestD <= 500) { // 500m 以内视为可接驳
          crossAnchors.push({
            lat: pts[bestI].lat, lng: pts[bestI].lng,
            elev: pts[bestI].elev || 0,
            label: `${ow.label || ow.name}（${ot.name}）`,
            tag: ow.tag,
            trailId: ot.id,
            trailName: ot.name,
            gps_idx: bestI,
            _crossDist: Math.round(bestD),
          });
        }
      }
      // 如果没有 waypoints，退而求其次：取其他轨迹 track 的起/终点
      if(otWps.length === 0) {
        for(const rawPt of [ot.track[0], ot.track[ot.track.length-1]]) {
          if(!rawPt) continue;
          let bestI = 0, bestD = Infinity;
          for(let i = 0; i < pts.length; i++) {
            const d = haversine(rawPt[0], rawPt[1], pts[i].lat, pts[i].lng);
            if(d < bestD) { bestD = d; bestI = i; }
          }
          if(bestD <= 500) {
            crossAnchors.push({
              lat: pts[bestI].lat, lng: pts[bestI].lng,
              elev: pts[bestI].elev || 0,
              label: `${ot.name} 轨迹接入点`,
              tag: 'start',
              trailId: ot.id,
              trailName: ot.name,
              gps_idx: bestI,
              _crossDist: Math.round(bestD),
            });
          }
        }
      }
    }
  }

  if(camps.length === 0 || (exits.length === 0 && crossAnchors.length === 0)) return [];

  // 确保 gps_idx
  function ensureIdx(wp) {
    if(wp.gps_idx != null) return wp.gps_idx;
    let best = 0, bestD = Infinity;
    for(let i=0; i<pts.length; i++) {
      const d = haversine(wp.lat, wp.lng, pts[i].lat, pts[i].lng);
      if(d < bestD) { bestD = d; best = i; }
    }
    wp.gps_idx = best;
    return best;
  }

  const routes = [];
  const seen = new Set();

  // 合并本轨迹 exits + 跨轨迹 anchors
  const allExits = [
    ...exits.map(e => ({...e, _cross: false})),
    ...crossAnchors.map(a => ({...a, _cross: true})),
  ];

  for(const camp of camps) {
    const campIdx = ensureIdx(camp);
    // 找最近的下撤点（轨迹里程差最小）
    let bestExit = null, bestKmDiff = Infinity;
    for(const ex of allExits) {
      const exIdx = ensureIdx(ex);
      if(exIdx === campIdx) continue;
      const diff = Math.abs(cumD[campIdx] - cumD[exIdx]);
      if(diff < bestKmDiff) { bestKmDiff = diff; bestExit = ex; }
    }
    if(!bestExit) continue;

    const key = `${campIdx}-${bestExit.gps_idx}`;
    if(seen.has(key)) continue;
    seen.add(key);

    const i_from = campIdx, i_to = bestExit.gps_idx;
    const lo = Math.min(i_from, i_to), hi = Math.max(i_from, i_to);
    const seg = pts.slice(lo, hi+1);
    const line = [];
    for(let i=0; i<seg.length; i+= Math.max(1, Math.floor(seg.length/200))) {
      line.push([+seg[i].lat.toFixed(6), +seg[i].lng.toFixed(6)]);
    }
    if(line.length < 2) continue;

    const km = +(bestKmDiff / 1000).toFixed(1);
    const drop = Math.round(pts[i_from].elev - pts[i_to].elev);
    const direction = i_from > i_to ? '原路返回（反向）' : '继续前进';

    let desc, crossInfo;
    if(bestExit._cross) {
      const crossDist = bestExit._crossDist;
      crossInfo = `接驳至《${bestExit.trailName}》轨迹（距接驳点 ${crossDist}m 内），沿主轨迹行进约 ${km}km，落差 ${Math.abs(drop)}m。`;
      desc = `${direction}，${crossInfo}`;
    } else {
      desc = `${direction}，沿主轨迹 GPS 路线。约 ${km}km，落差 ${Math.abs(drop)}m（${drop > 0 ? '下降' : drop < 0 ? '上升' : '平路'}）。`;
    }

    routes.push({
      id: `escape-${camp.id || campIdx}`,
      name: `从 ${camp.label || camp.name} 下撤至 ${bestExit.label || bestExit.name}`,
      desc,
      distance_km: km,
      drop_m: drop,
      line,
      _anchor: bestExit._cross ? { trailId: bestExit.trailId, trailName: bestExit.trailName } : null,
    });
  }
  return routes;
}


/** 按天数把 GPS 点分组，生成每日元信息（距离/爬升/最高海拔/营地/关键标注点） */
function buildDayMeta(trackPoints, track, enrichedWps, cumD) {
  const days = {};
  for(let i=0; i<trackPoints.length; i++) {
    const d = track[i][5];
    if(!days[d]) days[d] = { indexes: [] };
    days[d].indexes.push(i);
  }
  return Object.keys(days).map(Number).sort((a,b)=>a-b).map(d => {
    const idxs = days[d].indexes;
    const i_s = idxs[0], i_e = idxs[idxs.length-1];
    const km = (cumD[i_e] - cumD[i_s]) / 1000;
    const segElevs = trackPoints.slice(i_s, i_e+1).map(p => p.elev);
    const asc = accumulatorAscent(segElevs, 10).slice(-1)[0];
    const desc = accumulatorDescent(segElevs, 10).slice(-1)[0];
    const maxE = Math.max(...segElevs);
    const minE = Math.min(...segElevs);
    const dayWps = enrichedWps.filter(w => w.gps_idx >= i_s && w.gps_idx <= i_e);
    const camps = dayWps.filter(w => w.tag === 'camp');
    const camp = camps[camps.length-1];
    const keyWps = dayWps.filter(w => ['start','camp','pass','village','supply','end'].includes(w.tag));
    return {
      d, date: '',
      km: +km.toFixed(1),
      asc: Math.round(asc),
      desc: Math.round(desc),
      max: Math.round(maxE),
      min: Math.round(minE),
      camp: camp ? camp.label : '未标注',
      camp_elev: camp ? camp.elev : Math.round(maxE),
      seg: keyWps.length ? keyWps.slice(0,5).map(w => w.label).join(' → ') : `D${d}行程`,
      i_start: i_s, i_end: i_e,
    };
  });
}


/** 生成下一个可用的自增 ID（1, 2, 3...）。用户可后续手动改成任意字符串 */
function generateNextTrailId() {
  let nextSeq = 1;
  for(const ex of DATA.trails) {
    const n = parseInt(ex.id, 10);
    if(!isNaN(n) && String(n) === String(ex.id) && n >= nextSeq) nextSeq = n + 1;
  }
  while(DATA.trails.some(ex => ex.id === String(nextSeq))) nextSeq++;
  return String(nextSeq);
}

function parseAndProcessKml(xmlText, filename) {
  const { title, trackPoints, waypoints } = parseKml(xmlText);
  if(trackPoints.length === 0) return null;

  const track = processTrack(trackPoints);
  const enrichedWps = enrichWaypoints(waypoints, trackPoints).filter(w => w.name);
  const escapeRoutes = state.autoGenerateEscape
    ? buildEscapeRoutes(enrichedWps, trackPoints, DATA.trails)
    : [];

  const cumD = computeCumulativeDistance(trackPoints);
  const dayMeta = buildDayMeta(trackPoints, track, enrichedWps, cumD);
  const elevs = trackPoints.map(p => p.elev);
  const smoothE = smoothElev(elevs, 7);

  return {
    id: generateNextTrailId(),
    name: title,
    source: '',
    color: '#f97316',
    days: dayMeta.length,
    stats: computeTrailStats(elevs, cumD, smoothE),
    day_meta: dayMeta,
    track,
    _descCum: accumulatorDescent(elevs, 10),
    waypoints: enrichedWps,
    escape_routes: escapeRoutes,
    calc_method: {
      distance: 'haversine球面公式累加',
      ascent: '累加器法 thr=10m',
      elev_smooth: '滑动平均 win=7',
      wp_match: '真实坐标投影到最近GPS点',
    },
  };
}

/* ============ Boot ============ */

function schedulePostRestoreReset() {
  const run = () => {
    if(typeof resetView === 'function') resetView({restoreActive: true});
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
  setTimeout(run, 360);
}

// 启动时如果没内嵌数据，尝试从 IndexedDB 恢复（async）
async function _boot() {
  if(Array.isArray(state.activeTrails)) state.activeTrails = new Set(state.activeTrails);
  let restored = false;
  if(DATA.trails.length === 0 && !window.__exportedMap) {
    const ok = await loadFromStorage();
    if(ok) {
      showToast(`✓ 从浏览器恢复 ${DATA.trails.length} 条轨迹`);
      restored = true;
    }
  }
  // 防御性兜底：保证 activeTrails 至少包含全部已加载轨迹
  if(DATA.trails.length && (!state.activeTrails || state.activeTrails.size === 0)) {
    state.activeTrails = new Set(DATA.trails.map(t => t.id));
  }
  // 兜底主轨迹
  // v1.21.0：兜底选当前组内的第一条（而不是 DATA.trails[0]，可能不在当前组）
  if(state.activeGroup != null && !state.primaryTrailId && DATA.trails.length) {
    const inGroup = DATA.trails.filter(t => trailGroup(t) === state.activeGroup);
    state.primaryTrailId = (inGroup[0] || DATA.trails[0]).id;
  }
  // 无论是否从 storage 恢复，都做一次 rebuildAll 以保证 UI/绘制/视野一致
  rebuildAll({fit: true});
  // 若处于标注点模式，确保面板显示
  const _wpPanel = document.getElementById('waypoint-mode-tags');
  if(_wpPanel) _wpPanel.style.display = state.mode === 'waypoint' ? 'block' : 'none';
  // v1.31.0：从 IndexedDB 恢复的场景，rebuildAll 里的 fit 可能被后续绑定/UI 覆盖，
  //         这里显式再做一次 resetView，保证视野贴到主轨迹上
  if(restored && typeof resetView === 'function') {
    schedulePostRestoreReset();
  }
}
_boot();
applyI18n();
const appTitle = document.getElementById('app-title');
if(appTitle) {
  appTitle.addEventListener('dblclick', () => {
    const n = prompt('修改标题:', appTitle.textContent);
    if(n && n.trim()) { appTitle.textContent = n.trim(); document.title = n.trim(); try{localStorage.setItem('hiking_title',n.trim())}catch(e){} }
  });
  try { const s = localStorage.getItem('hiking_title'); if(s) { appTitle.textContent = s; document.title = s; } } catch(e) {}
}
const langBtn = document.getElementById('lang-btn');
if(langBtn) {
  langBtn.textContent = currentLang === 'zh' ? '🌐 EN' : '🌐 中';
  langBtn.addEventListener('click', () => {
    setLang(currentLang === 'zh' ? 'en' : 'zh');
    langBtn.textContent = currentLang === 'zh' ? '🌐 EN' : '🌐 中';
  });
}
const storageBtn = document.getElementById('storage-btn');
if(storageBtn) storageBtn.addEventListener('click', showStorageInfo);

/**
 * "复位"：把地图视野归一到当前组的主轨迹（或所有 active 轨迹的 bounds）。
 * v1.22.0 抽出，供复位按钮 / 导入 / 切换分组共用。
 * @param {Object} [opts]
 * @param {boolean} [opts.restoreActive=false] 是否把 activeTrails 补齐为所有 trail（复位按钮用）
 */
function resetView(opts = {}) {
  if(opts.restoreActive && (!state.activeTrails || state.activeTrails.size === 0)) {
    state.activeTrails = new Set(DATA.trails.map(t => t.id));
  }
  // 兜底主轨迹（当前组内）
  if(state.activeGroup != null && !state.primaryTrailId && DATA.trails.length) {
    const inGroup = DATA.trails.filter(t => trailGroup(t) === state.activeGroup);
    state.primaryTrailId = (inGroup[0] || DATA.trails[0]).id;
  }
  // 重绘（保证 UI/绘图与 state 一致）
  buildTrailList();
  drawTracks();
  drawWaypoints();
  buildLegend();

  // v1.24.0：测距模式下，若已选中段（A+B），复位到该段
  if(typeof measureState !== 'undefined' && measureState.active && measureState.ptA && measureState.ptB) {
    const main = DATA.trails.find(t => t.id === state.primaryTrailId);
    if(main && main.track) {
      const i1 = Math.min(measureState.ptA.idx, measureState.ptB.idx);
      const i2 = Math.max(measureState.ptA.idx, measureState.ptB.idx);
      const segLL = buildTrackLatLngs(main.track, i1, i2, 1600);
      if(segLL.length >= 2) {
        if(typeof measureCompute === 'function') measureCompute();
        fitWorkspaceBounds(L.latLngBounds(segLL), {padding:[60,60]});
        saveToStorage();
        return;
      }
    }
  }

  // 计算 fit 目标：优先主轨迹，其次当前组所有 active 轨迹
  const main = state.activeGroup == null ? null : DATA.trails.find(t => t.id === state.primaryTrailId);
  if(main && main.track && main.track.length) {
    const latlngs = main.track.map(p => [p[0], p[1]]);
    fitWorkspaceBounds(L.latLngBounds(latlngs), {padding:[40,40]});
  } else {
    const allLatLngs = [];
    DATA.trails.forEach(t => {
      if(isTrailActive(t)) t.track.forEach(p => allLatLngs.push([p[0], p[1]]));
    });
    if(allLatLngs.length) fitWorkspaceBounds(L.latLngBounds(allLatLngs), {padding:[40,40]});
  }
  saveToStorage();
}

function fitWorkspaceBounds(bounds, options = {}) {
  if(!bounds || !map) return;
  const sidebar = document.getElementById('sidebar');
  const sidebarCollapsed = !sidebar || sidebar.classList.contains('collapsed');
  const closeOverlay = HTM_APP.shouldCloseSidebarForFit(window.innerWidth, sidebarCollapsed);
  if(closeOverlay && typeof toggleSidebar === 'function') toggleSidebar(false);

  const fit = () => {
    map.invalidateSize({pan:false});
    map.fitBounds(bounds, options);
  };
  fit();
  if(closeOverlay) setTimeout(fit, 260);
}

// 复位按钮：以主轨迹为中心 fitBounds
const resetBtn = document.getElementById('reset-btn');
if(resetBtn) resetBtn.addEventListener('click', () => resetView({restoreActive: true}));

// 帮助按钮
const helpBtn = document.getElementById('help-btn');
if(helpBtn) helpBtn.addEventListener('click', showHelp);


// Sidebar collapse
const _sidebar = document.getElementById('sidebar');
const _sbClose = document.getElementById('sidebar-close');
const _sbToggle = document.getElementById('sidebar-toggle');
function toggleSidebar(open) {
  if(open === undefined) open = _sidebar.classList.contains('collapsed');
  if(open) {
    _sidebar.classList.remove('collapsed');
    if(_sbToggle) _sbToggle.classList.remove('show');
  } else {
    _sidebar.classList.add('collapsed');
    if(_sbToggle) _sbToggle.classList.add('show');
  }
  // 触发地图重排
  setTimeout(() => {
    if(typeof map !== 'undefined' && map) map.invalidateSize();
    if(typeof refreshElevBar === 'function') refreshElevBar();
  }, 280);
  // 主轨迹小卡：侧栏收起时显示
  const mini = document.getElementById('primary-mini');
  if(mini) {
    if(_sidebar.classList.contains('collapsed')) {
      const hasPrimary = typeof buildPrimaryMini === 'function' ? buildPrimaryMini() : false;
      mini.style.display = hasPrimary ? 'block' : 'none';
      if(hasPrimary && typeof schedulePrimaryMiniPositionApply === 'function') schedulePrimaryMiniPositionApply(mini);
    } else {
      mini.style.display = 'none';
    }
  }
}
if(_sbClose) _sbClose.addEventListener('click', () => toggleSidebar(false));
if(_sbToggle) _sbToggle.addEventListener('click', () => toggleSidebar(true));

const addWaypointState = { active: false };

function nextWaypointId(trail) {
  const ids = (trail.waypoints || []).map(w => parseInt(w.id, 10)).filter(n => isFinite(n));
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function findWaypointAnchorOnPrimary(latlng, requireNear = false) {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) return null;
  const hit = nearestTrackIdxOnPrimary(latlng.lat, latlng.lng);
  if(hit) return hit;
  if(requireNear) return null;
  let bestI = 0, bestD = Infinity;
  for(let i=0; i<main.track.length; i++) {
    const p = main.track[i];
    const d = haversine(latlng.lat, latlng.lng, p[0], p[1]);
    if(d < bestD) { bestD = d; bestI = i; }
  }
  return { idx: bestI, point: main.track[bestI], dist: bestD, trail: main };
}

function addManualWaypointAt(latlng, opts = {}) {
  const { requireNear = false } = opts;
  const anchor = findWaypointAnchorOnPrimary(latlng, requireNear);
  if(!anchor) {
    showToast('请点击主轨迹附近（200m 内）', 'error');
    return false;
  }
  const main = anchor.trail;
  const name = prompt('标注点名称（标记 [手动]）:', '');
  if(!name || !name.trim()) return false;
  const p = anchor.point;
  const cleanName = name.trim();
  const wp = {
    id: nextWaypointId(main),
    name: cleanName + ' [手动]',
    label: cleanName + ' [手动]',
    icon: waypointIcon('other'),
    tag: 'other',
    km: parseFloat((p[3] || 0).toFixed(1)),
    elev: Math.round(p[2] || 0),
    lat: p[0],
    lng: p[1],
    gps_idx: anchor.idx,
    day: p[5] || null,
    time: '',
    photo: '',
    manuallyAdded: true,
  };
  main.waypoints.push(wp);
  drawWaypoints();
  buildFilterGrid();
  buildDaysTab();
  saveToStorage();
  showToast(`✓ "${cleanName}" 已添加`);
  return true;
}

function exitAddWaypointMode() {
  addWaypointState.active = false;
  const btn = document.getElementById('add-waypoint-btn');
  if(btn) btn.classList.remove('on');
  if(!(measureState.active || segmentState.active || addEscapeState.active)) {
    map.getContainer().style.cursor = '';
  }
}

function enterAddWaypointMode() {
  const main = DATA.trails.find(t => t.id === state.primaryTrailId);
  if(!main || !main.track || !main.track.length) {
    showToast('请先设置主轨迹', 'error');
    return;
  }
  if(measureState.active) measureExit();
  if(segmentState.active) segmentExit();
  if(addEscapeState.active) addEscapeExit();
  addWaypointState.active = true;
  const btn = document.getElementById('add-waypoint-btn');
  if(btn) btn.classList.add('on');
  map.getContainer().style.cursor = 'crosshair';
  showToast('在主轨迹附近点击一次，添加手动标注点');
}

const addWaypointBtn = document.getElementById('add-waypoint-btn');
if(addWaypointBtn) addWaypointBtn.addEventListener('click', () => {
  if(addWaypointState.active) exitAddWaypointMode();
  else enterAddWaypointMode();
});
const addEscapeBtn = document.getElementById('add-escape-btn');
if(addEscapeBtn) addEscapeBtn.addEventListener('click', () => {
  if(addWaypointState.active) exitAddWaypointMode();
  if(addEscapeState.active) addEscapeExit();
  else addEscapeEnter();
});

// 右键/长按地图添加标注点
if(map && !window.__wpAddBound) { window.__wpAddBound = true;
  map.on('click', e => {
    if(!addWaypointState.active) return;
    if(addManualWaypointAt(e.latlng, {requireNear: true})) exitAddWaypointMode();
  });
  // 桌面端：右键 contextmenu
  map.on('contextmenu', e => {
    addManualWaypointAt(e.latlng, {requireNear: false});
  });
  // 移动端：长按 600ms
  let longPressTimer = null;
  map.getContainer().addEventListener('touchstart', e => {
    if(e.touches.length === 1) {
      longPressTimer = setTimeout(() => {
        const rect = map.getContainer().getBoundingClientRect();
        const pt = L.point(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
        const ll = map.containerPointToLatLng(pt);
        addManualWaypointAt(ll, {requireNear: false});
      }, 600);
    }
  }, {passive: true});
  map.getContainer().addEventListener('touchend', () => { if(longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } }, {passive: true});
  map.getContainer().addEventListener('touchmove', () => { if(longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } }, {passive: true});
}

initFloatingPanelPositions();

buildHeaderStats();
buildTrailList();
buildFilterGrid();
buildDaysTab();
buildEscapeTab();
buildLegend();
buildWaypointModeTagGrid();
drawTracks();
drawWaypoints();

// 如果有数据，自动 fit 视野
if(DATA.trails.length > 0) {
  setTimeout(() => {
    const allLatLngs = [];
    DATA.trails.forEach(t => {
      if(isTrailActive(t)) {
        t.track.forEach(p => allLatLngs.push([p[0], p[1]]));
      }
    });
    if(allLatLngs.length) {
      map.fitBounds(L.latLngBounds(allLatLngs), {padding:[40,40]});
    }
  }, 200);
}

const allPts = [];
DATA.trails.forEach(t => t.track.forEach(p => allPts.push([p[0],p[1]])));
if(allPts.length) map.fitBounds(L.latLngBounds(allPts).pad(0.05));
