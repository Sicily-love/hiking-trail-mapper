import { computeSegmentedTrackMetrics, normalizeTrackBreaks, splitTrackByBreaks } from './trackSegments.ts';
import type { TrackTuple } from './types.ts';

export interface ExportWaypoint {
  lat?: number;
  lng?: number;
  elev?: number;
  km?: number;
  day?: number;
  label?: string;
  icon?: string;
  tag?: string;
  description?: string;
}

export interface ExportTrailStats {
  distance_km: number;
  ascent_m: number;
  max_elev: number;
}

export interface ExportDayMeta {
  d?: number;
  km?: number;
  asc?: number;
  max?: number;
  min?: number;
  camp?: string;
  camp_elev?: number;
}

export interface ExportEscapeRoute {
  name: string;
  distance_km: number;
  drop_m: number;
  day?: number;
  direction?: 'forward' | 'reverse';
}

export interface ExportTrail {
  id: string;
  name: string;
  color?: string;
  group?: string | null;
  track: TrackTuple[];
  track_breaks?: number[];
  waypoints?: ExportWaypoint[];
  stats: ExportTrailStats;
  day_meta?: ExportDayMeta[];
  escape_routes?: ExportEscapeRoute[];
}

export interface ItineraryDayGroup {
  day: number;
  points: TrackTuple[];
  trackBreaks: number[];
}

export type ItineraryChartMap = Readonly<Record<number, string>>;

const KML_MIME = 'application/vnd.google-earth.kml+xml';
export { KML_MIME };

function cdata(value: unknown): string {
  return String(value ?? '').replace(/]]>/g, ']]]]><![CDATA[>');
}

function kmlColor(value: string | undefined): string {
  const match = (value || '').match(/^#?([0-9a-f]{6})$/i);
  const color = match?.[1] || '3F5238';
  return `ff${color.slice(4, 6)}${color.slice(2, 4)}${color.slice(0, 2)}`;
}

function waypointName(waypoint: ExportWaypoint): string {
  return waypoint.label || waypoint.icon || waypoint.tag || 'Waypoint';
}

function waypointKml(waypoint: ExportWaypoint, indent = '    '): string {
  if(!Number.isFinite(waypoint.lat) || !Number.isFinite(waypoint.lng)) return '';
  return `${indent}<Placemark>
${indent}  <name><![CDATA[${cdata(waypointName(waypoint))}]]></name>
${indent}  <description><![CDATA[${cdata(waypoint.description || waypoint.tag || '')} | ${waypoint.elev || 0}m | ${waypoint.km || 0}km]]></description>
${indent}  <Point><coordinates>${waypoint.lng},${waypoint.lat},${waypoint.elev || 0}</coordinates></Point>
${indent}</Placemark>
`;
}

export function sanitizeExportFilename(value: string, fallback = 'route'): string {
  const sanitized = value.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ');
  return sanitized || fallback;
}

export function buildTrailKml(trail: ExportTrail): string {
  const group = trail.group || '默认';
  const segments = splitTrackByBreaks(trail.track, trail.track_breaks);
  const geometry = segments.map(segment => {
    const coordinates = segment
      .map(point => `          ${point[1]},${point[0]},${point[2] || 0}`)
      .join('\n');
    return `        <LineString><tessellate>1</tessellate><coordinates>\n${coordinates}\n        </coordinates></LineString>`;
  }).join('\n');
  const waypoints = (trail.waypoints || []).map(point => waypointKml(point)).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name><![CDATA[${cdata(trail.name)}]]></name>
    <description><![CDATA[${cdata(trail.id)} | ${trail.stats.distance_km}km ↑${trail.stats.ascent_m}m | 最高${trail.stats.max_elev}m | 分组：${cdata(group)}]]></description>
    <Style id="trackStyle"><LineStyle><color>${kmlColor(trail.color)}</color><width>3</width></LineStyle></Style>
    <Placemark>
      <name><![CDATA[${cdata(trail.name)}]]></name>
      <styleUrl>#trackStyle</styleUrl>
      <MultiGeometry>
${geometry}
      </MultiGeometry>
    </Placemark>
${waypoints}  </Document>
</kml>`;
}

export function buildMergedKml(
  trails: readonly ExportTrail[],
  groupName: string,
  exportedAt: string,
): string {
  const folders = trails.map((trail, index) => {
    const geometry = splitTrackByBreaks(trail.track, trail.track_breaks).map(segment => {
      const coordinates = segment
        .map(point => `            ${point[1]},${point[0]},${point[2] || 0}`)
        .join('\n');
      return `          <LineString><tessellate>1</tessellate><coordinates>\n${coordinates}\n          </coordinates></LineString>`;
    }).join('\n');
    const waypoints = (trail.waypoints || []).map(point => waypointKml(point, '      ')).join('');
    return `    <Style id="track_${index}"><LineStyle><color>${kmlColor(trail.color)}</color><width>3</width></LineStyle></Style>
    <Folder><name><![CDATA[${cdata(trail.name)}]]></name>
      <Placemark>
        <name><![CDATA[${cdata(trail.name)} 轨迹]]></name>
        <styleUrl>#track_${index}</styleUrl>
        <MultiGeometry>
${geometry}
        </MultiGeometry>
      </Placemark>
${waypoints}    </Folder>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name><![CDATA[${cdata(groupName)}（合并）]]></name>
    <description><![CDATA[导出时间：${cdata(exportedAt)} | 共 ${trails.length} 条轨迹]]></description>
${folders}
  </Document>
</kml>`;
}

function uniquePath(path: string, used: Set<string>): string {
  if(!used.has(path)) {
    used.add(path);
    return path;
  }
  const dot = path.lastIndexOf('.');
  const stem = dot >= 0 ? path.slice(0, dot) : path;
  const extension = dot >= 0 ? path.slice(dot) : '';
  let suffix = 2;
  while(used.has(`${stem}_${suffix}${extension}`)) suffix += 1;
  const next = `${stem}_${suffix}${extension}`;
  used.add(next);
  return next;
}

export function buildGroupExportFiles(
  trails: readonly ExportTrail[],
  groupName: string,
  exportedAt: string,
): Record<string, string> {
  const safeGroup = sanitizeExportFilename(groupName, 'routes');
  const used = new Set<string>();
  const files: Record<string, string> = {};
  for(const trail of trails) {
    const path = uniquePath(`轨迹/${sanitizeExportFilename(trail.name)}.kml`, used);
    files[path] = buildTrailKml(trail);
  }
  files[uniquePath(`_${safeGroup}_合并导入.kml`, used)] = buildMergedKml(trails, groupName, exportedAt);
  files['README.txt'] = `# ${groupName} 轨迹包

导出时间：${exportedAt}
共 ${trails.length} 条轨迹

## 使用方式
- **推荐**：直接拖拽本文件夹里所有 *.kml 到目标地图（支持多选）
- **一键导入**：拖拽 _${safeGroup}_合并导入.kml 一个文件，即可加载全部
- **单条查看**：轨迹/ 目录下每条轨迹独立 KML

## 轨迹清单
${trails.map((trail, index) => `${index + 1}. ${trail.name}  (${trail.stats.distance_km}km, ↑${trail.stats.ascent_m}m, 最高 ${trail.stats.max_elev}m, ${(trail.waypoints || []).length} 个标注点)`).join('\n')}
`;
  return files;
}

export function groupTrackByDay(track: readonly TrackTuple[], trackBreaks: number[] = []): ItineraryDayGroup[] {
  const groups = new Map<number, ItineraryDayGroup>();
  const breakSet = new Set(normalizeTrackBreaks(trackBreaks, track.length));
  for(const [sourceIndex, point] of track.entries()) {
    const rawDay = Number(point[5]);
    const day = Number.isInteger(rawDay) && rawDay > 0 ? rawDay : 1;
    const group = groups.get(day) || {day, points:[], trackBreaks:[]};
    if(breakSet.has(sourceIndex) && group.points.length) group.trackBreaks.push(group.points.length);
    group.points.push(point);
    groups.set(day, group);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, group]) => group);
}

function dayStats(points: readonly TrackTuple[], trackBreaks: number[] = []) {
  const metrics = computeSegmentedTrackMetrics([...points], trackBreaks, 10);
  return {
    km:metrics.stats.distance_km.toFixed(1),
    ascent:metrics.stats.ascent_m,
    max:metrics.stats.max_elev,
    min:metrics.stats.min_elev,
  };
}

export function buildItineraryMarkdown(
  trail: ExportTrail,
  language: 'zh' | 'en',
  charts: ItineraryChartMap = {},
): string {
  const isZh = language === 'zh';
  const groups = groupTrackByDay(trail.track, trail.track_breaks);
  let markdown = `# ${trail.name} ${isZh ? '行程表' : 'Itinerary'}\n\n`;
  markdown += `> 总里程 **${trail.stats.distance_km}km** · 爬升 **${trail.stats.ascent_m}m** · 最高 **${trail.stats.max_elev}m** · ${groups.length}天\n\n---\n\n`;
  markdown += '| 天数 | 里程 | 爬升 | 最高海拔 | 最低海拔 | 营地 |\n|---|---|---|---|---|---|\n';

  if(trail.day_meta?.length) {
    for(const day of trail.day_meta) {
      markdown += `| D${day.d || '?'} | ${day.km ?? '-'}km | ${day.asc ?? '-'}m | ${day.max ?? '-'}m | ${day.min ?? '-'}m | ${day.camp || '-'}(${day.camp_elev ?? '?'}m) |\n`;
    }
  } else {
    groups.forEach((group, index) => {
      const stats = dayStats(group.points, group.trackBreaks);
      const camp = (trail.waypoints || []).find(waypoint =>
        waypoint.tag === 'camp' && (waypoint.day || index + 1) === group.day);
      markdown += `| D${group.day} | ${stats.km}km | ${stats.ascent}m | ${stats.max}m | ${stats.min}m | ${camp ? `${waypointName(camp)} ${camp.elev || 0}m` : '-'} |\n`;
    });
  }
  markdown += '\n---\n\n';

  groups.forEach((group, index) => {
    const stats = dayStats(group.points, group.trackBreaks);
    const dayWaypoints = (trail.waypoints || []).filter(waypoint =>
      (waypoint.day || index + 1) === group.day);
    const camp = dayWaypoints.find(waypoint => waypoint.tag === 'camp');
    const passes = dayWaypoints.filter(waypoint => waypoint.tag === 'pass');
    markdown += `## D${group.day}\n\n`;
    markdown += `**里程**: ${stats.km}km　**爬升**: ${stats.ascent}m　**最高**: ${stats.max}m　**最低**: ${stats.min}m`;
    if(camp) markdown += `　**营地**: ${waypointName(camp)} (${camp.elev || 0}m)`;
    markdown += '\n\n';
    if(passes.length) {
      markdown += `${passes.map(pass => `**垭口**: ${waypointName(pass)} (${pass.elev || 0}m)`).join('　')}\n\n`;
    }
    if(charts[group.day]) markdown += `![D${group.day} 海拔剖面](${charts[group.day]})\n\n`;
    markdown += '---\n\n';
  });

  if(trail.escape_routes?.length) {
    markdown += `## ${isZh ? '下撤方案' : 'Escape Routes'}\n\n`;
    for(const route of trail.escape_routes) {
      const day = route.day ? `D${route.day} · ` : '';
      markdown += `- ${day}**${route.name}** · ${route.distance_km}km · ${route.drop_m >= 0 ? '↓' : '↑'}${Math.abs(route.drop_m)}m\n`;
    }
    markdown += '\n';
  }
  return markdown;
}
