import {
  accumulatorAscent,
  accumulatorDescent,
  buildKmlParseModel,
  computeSegmentedTrackMetrics,
  enrichWaypoints,
  haversine,
  smoothElev,
} from '../../core/index.ts';
import type {TrackTuple} from '../../core/types.ts';

export const KML_WAYPOINT_RULES = Object.freeze([
  ['start', ['开始徒步','起点','出发','起步'], '🚩', '#5eb3ff'],
  ['end', ['终点','结束','收队'], '🏁', '#5eb3ff'],
  ['fork', ['分叉','分岔','路口','走左边','走右边','切下去','右转','左转','岔路'], '⑫', '#ff8c42'],
  ['camp', ['营地','扎营','宿营','过夜'], '🏕', '#22c55e'],
  ['pass', ['垭口','口子'], '🏔', '#ef4444'],
  ['warn', ['Z字','陡','危险','注意','小心','高反','滚石','滑'], '⚠', '#dc2626'],
  ['supply',['商店','补给','便宜','柠檬茶','咖啡','卖','夯达','小卖部','杂货'], '🏪', '#facc15'],
  ['water', ['水源','打水','取水'], '💧', '#3b82f6'],
  ['shelter',['避雨','避风','小木屋','木屋'], '🏠', '#a855f7'],
  ['bridge',['过桥','过河','涉水'], '🌉', '#06b6d4'],
  ['river', ['小溪','大河'], '🏞', '#0ea5e9'],
  ['village',['村','寨','牧民','藏民','居民点'], '🏘', '#d97706'],
  ['highpoint', [], '⛰', '#fbbf24'],
] as const);

export interface KmlProjectBuilderDependencies {
  readTrails: () => readonly any[];
  readAutoGenerateEscape: () => boolean;
  createDomParser?: () => DOMParser;
}

export interface KmlProjectBuilder {
  extractKmlParseModelInput(doc: Document): Record<string, unknown>;
  parseKml(xmlText: string): any;
  processTrack(points: any[], trackBreaks?: number[]): any[];
  buildEscapeRoutes(waypoints: any[], points: any[], otherTrails: any[]): any[];
  buildDayMeta(trackPoints: any[], track: any[], waypoints: any[], cumulativeDistance: number[]): any[];
  generateNextTrailId(): string;
  parseAndProcessKml(xmlText: string, filename?: string): any | null;
}

/** Converts KML input into complete project trails without DOM or state writes. */
export function createKmlProjectBuilder(
  dependencies: KmlProjectBuilderDependencies,
): KmlProjectBuilder {
  const createDomParser = dependencies.createDomParser ?? (() => new DOMParser());

  const extractKmlParseModelInput = (doc: Document): Record<string, unknown> => {
    const titleElement = doc.querySelector('Document > name') || doc.querySelector('name');
    const lineStringCoordinateTexts = Array.from(doc.querySelectorAll('LineString')).map(line =>
      line.querySelector('coordinates')?.textContent || '');
    const gxTracks = Array.from(doc.getElementsByTagNameNS('http://www.google.com/kml/ext/2.2', 'Track'))
      .map(track => ({
        whens:Array.from(track.getElementsByTagNameNS('http://www.opengis.net/kml/2.2', 'when')).map(node => node.textContent),
        coords:Array.from(track.getElementsByTagNameNS('http://www.google.com/kml/ext/2.2', 'coord')).map(node => node.textContent),
      }));
    const waypoints: Array<Record<string, unknown>> = [];
    doc.querySelectorAll('Placemark').forEach(placemark => {
      const coordinates = placemark.querySelector('Point coordinates');
      if(!coordinates?.textContent) return;
      waypoints.push({
        name:placemark.querySelector(':scope > name')?.textContent || undefined,
        coordinateText:coordinates.textContent,
        description:placemark.querySelector(':scope > description')?.textContent || '',
      });
    });
    const data = Array.from(doc.querySelectorAll('Data')).map(node => ({
      name:node.getAttribute('name'),
      value:node.querySelector('value')?.textContent || '',
    }));
    return {
      title:titleElement?.textContent?.trim() || '',
      lineStringCoordinateTexts,
      gxTracks,
      waypoints,
      data,
    };
  };

  const parseKml = (xmlText: string): any => {
    const document = createDomParser().parseFromString(xmlText, 'application/xml');
    if(document.querySelector('parsererror')) throw new Error('XML 解析失败');
    return buildKmlParseModel(extractKmlParseModelInput(document) as any);
  };

  const processTrack = (points: any[], trackBreaks: number[] = []): any[] => {
    const smoothedElevation = smoothElev(points.map(point => point.elev), 7);
    const dates = points.map(point => point.t?.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || null);
    const uniqueDates = [...new Set<string>(dates.filter(Boolean))].sort();
    const dayByDate = Object.fromEntries(uniqueDates.map((date, index) => [date, index + 1]));
    const track: TrackTuple[] = points.map((point, index) => [
      +point.lat.toFixed(6), +point.lng.toFixed(6), Math.round(smoothedElevation[index]), 0, 0,
      dayByDate[dates[index]] || 1,
    ]);
    const metrics = computeSegmentedTrackMetrics(track, trackBreaks, 10);
    track.forEach((point, index) => {
      point[3] = +(metrics.cumulativeDistanceM[index] / 1000).toFixed(2);
      point[4] = Math.round(metrics.cumulativeAscentM[index]);
    });
    return track;
  };

  const buildEscapeRoutes = (waypoints: any[], points: any[], otherTrails: any[]): any[] => {
    const cumulativeDistance = [0];
    for(let index = 1; index < points.length; index += 1) {
      cumulativeDistance.push(cumulativeDistance[index - 1]
        + haversine(points[index - 1].lat, points[index - 1].lng, points[index].lat, points[index].lng));
    }
    const camps = waypoints.filter(waypoint => waypoint.tag === 'camp');
    const exits = waypoints.filter(waypoint => ['village','start','end','supply'].includes(waypoint.tag));
    const crossAnchors: any[] = [];
    for(const trail of otherTrails || []) {
      if(!trail.track?.length) continue;
      const candidates = (trail.waypoints || []).filter((waypoint: any) =>
        ['start','end','supply','village','camp'].includes(waypoint.tag));
      for(const waypoint of candidates) {
        let nearestIndex = 0;
        let nearestDistance = Infinity;
        points.forEach((point, index) => {
          const distance = haversine(waypoint.lat, waypoint.lng, point.lat, point.lng);
          if(distance < nearestDistance) [nearestDistance, nearestIndex] = [distance, index];
        });
        if(nearestDistance <= 500) crossAnchors.push({
          lat:points[nearestIndex].lat, lng:points[nearestIndex].lng,
          elev:points[nearestIndex].elev || 0, label:`${waypoint.label || waypoint.name}（${trail.name}）`,
          tag:waypoint.tag, trailId:trail.id, trailName:trail.name, gps_idx:nearestIndex,
          _crossDist:Math.round(nearestDistance),
        });
      }
      if(candidates.length) continue;
      for(const rawPoint of [trail.track[0], trail.track.at(-1)]) {
        if(!rawPoint) continue;
        let nearestIndex = 0;
        let nearestDistance = Infinity;
        points.forEach((point, index) => {
          const distance = haversine(rawPoint[0], rawPoint[1], point.lat, point.lng);
          if(distance < nearestDistance) [nearestDistance, nearestIndex] = [distance, index];
        });
        if(nearestDistance <= 500) crossAnchors.push({
          lat:points[nearestIndex].lat, lng:points[nearestIndex].lng,
          elev:points[nearestIndex].elev || 0, label:`${trail.name} 轨迹接入点`, tag:'start',
          trailId:trail.id, trailName:trail.name, gps_idx:nearestIndex, _crossDist:Math.round(nearestDistance),
        });
      }
    }
    if(!camps.length || (!exits.length && !crossAnchors.length)) return [];
    const ensureIndex = (waypoint: any): number => {
      if(waypoint.gps_idx != null) return waypoint.gps_idx;
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      points.forEach((point, index) => {
        const distance = haversine(waypoint.lat, waypoint.lng, point.lat, point.lng);
        if(distance < nearestDistance) [nearestDistance, nearestIndex] = [distance, index];
      });
      waypoint.gps_idx = nearestIndex;
      return nearestIndex;
    };
    const routes: any[] = [];
    const seen = new Set<string>();
    const allExits = [
      ...exits.map(exit => ({...exit, _cross:false})),
      ...crossAnchors.map(anchor => ({...anchor, _cross:true})),
    ];
    for(const camp of camps) {
      const from = ensureIndex(camp);
      let bestExit: any = null;
      let bestDistance = Infinity;
      for(const exit of allExits) {
        const to = ensureIndex(exit);
        const distance = Math.abs(cumulativeDistance[from] - cumulativeDistance[to]);
        if(to !== from && distance < bestDistance) [bestExit, bestDistance] = [exit, distance];
      }
      if(!bestExit) continue;
      const key = `${from}-${bestExit.gps_idx}`;
      if(seen.has(key)) continue;
      seen.add(key);
      const [low, high] = [Math.min(from, bestExit.gps_idx), Math.max(from, bestExit.gps_idx)];
      const segment = points.slice(low, high + 1);
      const line: number[][] = [];
      for(let index = 0; index < segment.length; index += Math.max(1, Math.floor(segment.length / 200))) {
        line.push([+segment[index].lat.toFixed(6), +segment[index].lng.toFixed(6)]);
      }
      if(line.length < 2) continue;
      const distanceKm = +(bestDistance / 1000).toFixed(1);
      const drop = Math.round(points[from].elev - points[bestExit.gps_idx].elev);
      const direction = from > bestExit.gps_idx ? '原路返回（反向）' : '继续前进';
      const description = bestExit._cross
        ? `${direction}，接驳至《${bestExit.trailName}》轨迹（距接驳点 ${bestExit._crossDist}m 内），沿主轨迹行进约 ${distanceKm}km，落差 ${Math.abs(drop)}m。`
        : `${direction}，沿主轨迹 GPS 路线。约 ${distanceKm}km，落差 ${Math.abs(drop)}m（${drop > 0 ? '下降' : drop < 0 ? '上升' : '平路'}）。`;
      routes.push({
        id:`escape-${camp.id || from}`,
        name:`从 ${camp.label || camp.name} 下撤至 ${bestExit.label || bestExit.name}`,
        desc:description, distance_km:distanceKm, drop_m:drop,
        day:Number(camp.day) || Number(points[from].day) || undefined,
        direction:from > bestExit.gps_idx ? 'reverse' : 'forward', line,
        _anchor:bestExit._cross ? {trailId:bestExit.trailId, trailName:bestExit.trailName} : null,
      });
    }
    return routes;
  };

  const buildDayMeta = (trackPoints: any[], track: any[], waypoints: any[], cumulativeDistance: number[]): any[] => {
    const days: Record<number, number[]> = {};
    trackPoints.forEach((_, index) => (days[track[index][5]] ||= []).push(index));
    return Object.keys(days).map(Number).sort((left, right) => left - right).map(day => {
      const indexes = days[day];
      const start = indexes[0];
      const end = indexes.at(-1)!;
      const elevations = trackPoints.slice(start, end + 1).map(point => point.elev);
      const dayWaypoints = waypoints.filter(waypoint => waypoint.gps_idx >= start && waypoint.gps_idx <= end);
      const camp = dayWaypoints.filter(waypoint => waypoint.tag === 'camp').at(-1);
      const keyWaypoints = dayWaypoints.filter(waypoint =>
        ['start','camp','pass','village','supply','end'].includes(waypoint.tag));
      return {
        d:day, date:'', km:+((cumulativeDistance[end] - cumulativeDistance[start]) / 1000).toFixed(1),
        asc:Math.round(accumulatorAscent(elevations, 10).at(-1) || 0),
        desc:Math.round(accumulatorDescent(elevations, 10).at(-1) || 0),
        max:Math.round(Math.max(...elevations)), min:Math.round(Math.min(...elevations)),
        camp:camp?.label || '未标注', camp_elev:Math.round(track[end][2] || 0),
        seg:keyWaypoints.length ? keyWaypoints.slice(0, 5).map(waypoint => waypoint.label).join(' → ') : `D${day}行程`,
        i_start:start, i_end:end,
      };
    });
  };

  const generateNextTrailId = (): string => {
    const trails = dependencies.readTrails();
    let next = 1;
    for(const trail of trails) {
      const numericId = Number.parseInt(trail.id, 10);
      if(!Number.isNaN(numericId) && String(numericId) === String(trail.id) && numericId >= next) next = numericId + 1;
    }
    while(trails.some(trail => trail.id === String(next))) next += 1;
    return String(next);
  };

  const parseAndProcessKml = (xmlText: string, _filename = ''): any | null => {
    const {title, trackPoints, waypoints, trackBreaks} = parseKml(xmlText);
    if(!trackPoints.length) return null;
    const track = processTrack(trackPoints, trackBreaks);
    const enrichedWaypoints = enrichWaypoints(waypoints, trackPoints).filter(waypoint => waypoint.name).map(waypoint => {
      const point = track[waypoint.gps_idx] || [];
      return {...waypoint, km:+Number(point[3] || 0).toFixed(1), day:Number(point[5]) || 1};
    });
    const metrics = computeSegmentedTrackMetrics(track, trackBreaks, 10);
    const dayMeta = buildDayMeta(trackPoints, track, enrichedWaypoints, metrics.cumulativeDistanceM);
    return {
      id:generateNextTrailId(), name:title, source:'', color:'#f97316', days:dayMeta.length,
      stats:metrics.stats, day_meta:dayMeta, track, track_breaks:trackBreaks,
      _descCum:metrics.cumulativeDescentM, waypoints:enrichedWaypoints,
      escape_routes:dependencies.readAutoGenerateEscape()
        ? buildEscapeRoutes(enrichedWaypoints, trackPoints, [...dependencies.readTrails()]) : [],
      calc_method:{
        distance:'haversine球面公式累加', ascent:'累加器法 thr=10m',
        elev_smooth:'滑动平均 win=7', wp_match:'真实坐标投影到最近GPS点',
      },
    };
  };

  return Object.freeze({
    extractKmlParseModelInput, parseKml, processTrack, buildEscapeRoutes,
    buildDayMeta, generateNextTrailId, parseAndProcessKml,
  });
}
