import type { ContentDialogOptions, ContentDialogSection } from '../../ui/dialog/content-model.ts';
import type { LocalizationLanguage } from './translations.ts';

const HELP_SECTIONS: Record<LocalizationLanguage, readonly ContentDialogSection[]> = {
  zh: [
    {
      heading:'这是什么',
      paragraphs:['用于在同一张地图中导入、比较和规划多条徒步路线，支持常见户外平台导出的 KML 文件。'],
    },
    {
      heading:'基本流程', ordered:true,
      items:['导入一个或多个 KML 文件。', '选择当前分组和主轨迹。', '使用测距、行程分段、标注点和下撤工具调整方案。', '导出当前组 KML ZIP 或行程 Markdown 作为备份。'],
    },
    {
      heading:'地图与显示',
      items:['海拔模式使用蓝到红表示低到高。', '标注点模式突出主轨迹，并显示所选类别的标注点。', '打开行程页后，主轨迹按天分色。', '复位会根据当前主轨迹或预览路段重新计算可见范围。'],
    },
    {
      heading:'测距与海拔',
      items:['进入测距后依次选择 A、B 两点，也可以拖动端点修改范围。', '海拔图显示路段距离、爬升、下降、最高点、最低点以及 A/B 海拔。', '点击海拔图可在地图上定位对应轨迹点。'],
    },
    {
      heading:'轨迹操作',
      items:['轨迹列表可以切换显示、设为主轨迹、修改 ID 与来源链接、反向或删除。', '反向后会重新计算里程、爬升、下降、日程分色和标注点位置。', '双击项目标题可以重命名。'],
    },
    {
      heading:'行程与标注',
      items:['行程分段支持拖动边界、删除指定天数并保留编辑结果。', '点击 Day 信息会预览该日轨迹并自动适配地图范围。', '进入标注工具后在主轨迹上点击位置，可选择图标与类型、填写描述并添加可选图片。', '点击标注点可固定信息卡；点击照片可进入支持缩放和拖动的查看器。'],
    },
    {
      heading:'下撤与工作台',
      items:['下撤工具可选择同组任一依据轨迹，再在该轨迹上选择 A、B 点；生成的方案仍保存到主轨迹并显示在行程页底部。', '轨迹、行程和标注点集中在工作台左侧活动栏；底部区域只显示海拔分析。', '测距操作按钮会在测距期间出现在海拔区，行程分段使用独立编辑面板；收起侧栏后点击任一活动入口即可重新展开。'],
    },
    {
      heading:'数据与备份',
      items:['轨迹保存在浏览器 IndexedDB 中，重新打开页面可以恢复。', '浏览器缓存并不是永久备份，重要路线应定期导出。', '版本号入口可以查看完整更新记录。'],
    },
  ],
  en: [
    {
      heading:'Overview',
      paragraphs:['Import, compare, and plan multiple hiking routes on one map using KML files exported by common outdoor platforms.'],
    },
    {
      heading:'Basic workflow', ordered:true,
      items:['Import one or more KML files.', 'Choose the active group and primary trail.', 'Refine the plan with Measure, Itinerary, Waypoint, and Escape tools.', 'Export the active group as KML ZIP or itinerary Markdown for backup.'],
    },
    {
      heading:'Map and display',
      items:['Elevation mode maps low-to-high elevation from blue to red.', 'Waypoint mode emphasizes the primary trail and selected waypoint categories.', 'Opening Itinerary colors the primary trail by day.', 'Reset fits the current primary trail or preview segment.'],
    },
    {
      heading:'Measure and elevation',
      items:['Select A and B in Measure mode, then drag either endpoint to refine the range.', 'The elevation panel shows distance, ascent, descent, high and low points, and A/B elevation.', 'Click the elevation chart to locate the matching trail point on the map.'],
    },
    {
      heading:'Trail operations',
      items:['Use the trail list to toggle visibility, set the primary trail, edit ID and source, reverse, or delete.', 'Reversing recalculates distance, ascent, descent, day colors, and waypoint positions.', 'Double-click the project title to rename it.'],
    },
    {
      heading:'Itinerary and waypoints',
      items:['Drag itinerary boundaries, remove a selected day, and keep edits between sessions.', 'Select a Day row to preview and fit that segment.', 'Use the Waypoint tool and click the primary trail to choose an icon and type, enter a description, and attach an optional image.', 'Select a waypoint to pin its details; select its photo for a zoomable, draggable viewer.'],
    },
    {
      heading:'Escape and workbench',
      items:['Choose any reference trail in the active group for Escape A/B selection; the generated route is still saved under the primary itinerary.', 'Trails, Itinerary, and Waypoints live in the Workbench activity rail, while the bottom area is reserved for elevation analysis.', 'Measure actions appear in the elevation area during measurement and Segment uses its focused editor; select any activity to reopen a collapsed sidebar.'],
    },
    {
      heading:'Data and backups',
      items:['Trails are restored from browser IndexedDB when the page opens again.', 'Browser storage is not a permanent backup; export important routes regularly.', 'Use the version entry to open the complete changelog.'],
    },
  ],
};

export function buildHelpDialogModel(
  language: LocalizationLanguage,
  version: string,
  title: string,
  closeLabel: string,
): ContentDialogOptions {
  const sections = HELP_SECTIONS[language].map(section => ({...section}));
  sections.push({tone:'muted', paragraphs:[language === 'zh' ? `当前版本：${version}` : `Current version: ${version}`]});
  return {title, closeLabel, size:'wide', sections};
}
