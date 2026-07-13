import { accumulatorAscent } from './elevation.ts';
import { haversine } from './geo.ts';
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
}

export interface ExportTrail {
  id: string;
  name: string;
  color?: string;
  group?: string | null;
  track: TrackTuple[];
  waypoints?: ExportWaypoint[];
  stats: ExportTrailStats;
  day_meta?: ExportDayMeta[];
  escape_routes?: ExportEscapeRoute[];
}

export interface ItineraryDayGroup {
  day: number;
  points: TrackTuple[];
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
${indent}  <description><![CDATA[${cdata(waypoint.tag || '')} | ${waypoint.elev || 0}m | ${waypoint.km || 0}km]]></description>
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
  const coordinates = trail.track
    .map(point => `        ${point[1]},${point[0]},${point[2] || 0}`)
    .join('\n');
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
      <LineString><tessellate>1</tessellate><coordinates>
${coordinates}
      </coordinates></LineString>
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
    const coordinates = trail.track
      .map(point => `          ${point[1]},${point[0]},${point[2] || 0}`)
      .join('\n');
    const waypoints = (trail.waypoints || []).map(point => waypointKml(point, '      ')).join('');
    return `    <Style id="track_${index}"><LineStyle><color>${kmlColor(trail.color)}</color><width>3</width></LineStyle></Style>
    <Folder><name><![CDATA[${cdata(trail.name)}]]></name>
      <Placemark>
        <name><![CDATA[${cdata(trail.name)} 轨迹]]></name>
        <styleUrl>#track_${index}</styleUrl>
        <LineString><tessellate>1</tessellate><coordinates>
${coordinates}
        </coordinates></LineString>
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

export function groupTrackByDay(track: readonly TrackTuple[]): ItineraryDayGroup[] {
  const groups = new Map<number, TrackTuple[]>();
  for(const point of track) {
    const rawDay = Number(point[5]);
    const day = Number.isInteger(rawDay) && rawDay > 0 ? rawDay : 1;
    const points = groups.get(day) || [];
    points.push(point);
    groups.set(day, points);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([day, points]) => ({day, points}));
}

function dayStats(points: readonly TrackTuple[]) {
  let distanceM = 0;
  let max = -Infinity;
  let min = Infinity;
  const elevations: number[] = [];
  for(let index = 0; index < points.length; index += 1) {
    const elevation = Number.isFinite(points[index][2]) ? Number(points[index][2]) : 0;
    elevations.push(elevation);
    max = Math.max(max, elevation);
    min = Math.min(min, elevation);
    if(index > 0) {
      distanceM += haversine(
        points[index - 1][0], points[index - 1][1],
        points[index][0], points[index][1],
      );
    }
  }
  const ascent = accumulatorAscent(elevations, 10).at(-1) || 0;
  return {
    km:(distanceM / 1000).toFixed(1),
    ascent:Math.round(ascent),
    max:Math.round(Number.isFinite(max) ? max : 0),
    min:Math.round(Number.isFinite(min) ? min : 0),
  };
}

export function buildItineraryMarkdown(
  trail: ExportTrail,
  language: 'zh' | 'en',
  charts: ItineraryChartMap = {},
): string {
  const isZh = language === 'zh';
  const groups = groupTrackByDay(trail.track);
  let markdown = `# ${trail.name} ${isZh ? '行程表' : 'Itinerary'}\n\n`;
  markdown += `> 总里程 **${trail.stats.distance_km}km** · 爬升 **${trail.stats.ascent_m}m** · 最高 **${trail.stats.max_elev}m** · ${groups.length}天\n\n---\n\n`;
  markdown += '| 天数 | 里程 | 爬升 | 最高海拔 | 最低海拔 | 营地 |\n|---|---|---|---|---|---|\n';

  if(trail.day_meta?.length) {
    for(const day of trail.day_meta) {
      markdown += `| D${day.d || '?'} | ${day.km ?? '-'}km | ${day.asc ?? '-'}m | ${day.max ?? '-'}m | ${day.min ?? '-'}m | ${day.camp || '-'}(${day.camp_elev ?? '?'}m) |\n`;
    }
  } else {
    groups.forEach((group, index) => {
      const stats = dayStats(group.points);
      const camp = (trail.waypoints || []).find(waypoint =>
        waypoint.tag === 'camp' && (waypoint.day || index + 1) === group.day);
      markdown += `| D${group.day} | ${stats.km}km | ${stats.ascent}m | ${stats.max}m | ${stats.min}m | ${camp ? `${waypointName(camp)} ${camp.elev || 0}m` : '-'} |\n`;
    });
  }
  markdown += '\n---\n\n';

  groups.forEach((group, index) => {
    const stats = dayStats(group.points);
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
      markdown += `- **${route.name}** · ${route.distance_km}km · ${route.drop_m >= 0 ? '↓' : '↑'}${Math.abs(route.drop_m)}m\n`;
    }
    markdown += '\n';
  }
  return markdown;
}
