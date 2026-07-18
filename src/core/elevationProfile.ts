import type {
  ElevationAnnotation,
  ElevationAnnotationLayoutOptions,
  ElevationAnnotationLayoutResult,
  ElevationAnnotationPlacement,
  ElevationAnnotationRenderModel,
  ElevationAnnotationLayout,
  ElevationLabelStackEstimate,
  ElevationLabelStackOptions,
  ElevationPanelHeightOptions,
  ElevationRenderModel,
  ElevationPathPoint,
  ElevationFillPoint,
  ElevationLayoutModel,
  ElevationLayoutOptions,
  ElevationAnnotationOptions,
  TrackTuple,
} from './types.ts';
import { accumulatorAscent, accumulatorDescent, elevRatioColor } from './elevation.ts';
import { haversine } from './geo.ts';
import { normalizeTrackBreaks } from './trackSegments.ts';

function rgba(rgb: [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

export function computeElevationLayout(
  pts: TrackTuple[],
  opts: ElevationLayoutOptions = {},
): ElevationLayoutModel {
  const W = opts.width || 340;
  const H = opts.height || 140;
  const alts = pts.map(p => Number.isFinite(p[2]) ? Number(p[2]) : 0);
  const minE = alts.length ? Math.min(...alts) : 0;
  const maxE = alts.length ? Math.max(...alts) : 0;
  const eRng = maxE - minE || 1;

  const km: number[] = [];
  if(opts.kmFromZero) {
    const breakSet = new Set(normalizeTrackBreaks(opts.trackBreaks, pts.length));
    let acc = 0;
    km.push(0);
    for(let i = 1; i < pts.length; i++) {
      if(!breakSet.has(i)) {
        acc += haversine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) / 1000;
      }
      km.push(acc);
    }
  } else {
    for(let i = 0; i < pts.length; i++) {
      km.push(typeof pts[i][3] === 'number' ? Number(pts[i][3]) : i / pts.length);
    }
  }
  if(!km.length) km.push(0);

  const kmStart = km[0];
  const kmEnd = km[km.length - 1];
  const kmRange = kmEnd - kmStart || 1;
  const PL = opts.measureMode ? 58 : 44;
  const PR = opts.measureMode ? 58 : 16;
  const PT = 22;
  const PB = 34;
  const pw = W - PL - PR;
  const ph = H - PT - PB;
  const pX = (i: number) => PL + (((km[i] ?? kmStart) - kmStart) / kmRange) * pw;
  const pY = (a: number) => PT + ph * (1 - (a - minE) / eRng);

  return { W, H, PL, PR, PT, PB, pw, ph, pX, pY, alts, minE, maxE, eRng, km, kmStart, kmEnd, kmRange };
}

export function computeElevationRenderModel(
  pts: TrackTuple[],
  layout: ElevationLayoutModel,
  trackBreaks: number[] = [],
): ElevationRenderModel {
  const yBottom = layout.PT + layout.ph;
  const curve = pts.map((p, i) => {
    const elev = Number.isFinite(p[2]) ? Number(p[2]) : 0;
    return {
      idx: i,
      x: layout.pX(i),
      y: layout.pY(elev),
      elev,
      km: layout.km[i] ?? 0,
    };
  });
  const fillPolygon = curve.length
    ? [
        { x: curve[0].x, y: yBottom },
        ...curve.map(p => ({ x: p.x, y: p.y })),
        { x: curve[curve.length - 1].x, y: yBottom },
      ]
    : [];
  const segmentStarts = [0, ...normalizeTrackBreaks(trackBreaks, curve.length), curve.length];
  const curveSegments: ElevationPathPoint[][] = [];
  const fillPolygons: ElevationFillPoint[][] = [];
  for(let index = 0; index < segmentStarts.length - 1; index += 1) {
    const segment = curve.slice(segmentStarts[index], segmentStarts[index + 1]).map(point => ({...point}));
    if(!segment.length) continue;
    // A small visual notch makes a zero-distance discontinuity legible without adding fake kilometres.
    if(index > 0) segment[0].x += 3;
    if(index < segmentStarts.length - 2) segment[segment.length - 1].x -= 3;
    curveSegments.push(segment);
    fillPolygons.push([
      {x:segment[0].x, y:yBottom},
      ...segment.map(point => ({x:point.x, y:point.y})),
      {x:segment[segment.length - 1].x, y:yBottom},
    ]);
  }
  const gridLines = [0.25, 0.5, 0.75].map(fraction => {
    const y = layout.PT + layout.ph * (1 - fraction);
    return {
      fraction,
      x1: layout.PL,
      y1: y,
      x2: layout.PL + layout.pw,
      y2: y,
    };
  });

  const tickCount = Math.max(2, Math.min(7, Math.floor(layout.pw / 80) + 1));
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const f = index / (tickCount - 1);
    const kmVal = layout.kmStart + layout.kmRange * f;
    return {
      index,
      x: layout.PL + layout.pw * f,
      kmVal,
      label: `${kmVal.toFixed(layout.kmRange < 5 ? 1 : 0)} km`,
      align: index === 0 ? 'left' as const : index === tickCount - 1 ? 'right' as const : 'center' as const,
    };
  });

  let ascent = 0;
  let descent = 0;
  for(let index = 0; index < segmentStarts.length - 1; index += 1) {
    const elevations = layout.alts.slice(segmentStarts[index], segmentStarts[index + 1]);
    ascent += accumulatorAscent(elevations, 10).at(-1) || 0;
    descent += accumulatorDescent(elevations, 10).at(-1) || 0;
  }
  ascent = Math.round(ascent);
  descent = Math.round(descent);
  const hi = elevRatioColor(1);
  const mid = elevRatioColor(0.55);
  const lo = elevRatioColor(0);

  return {
    background: {
      rect: { x: 0, y: 0, w: layout.W, h: layout.H },
      gradient: {
        x0: 0,
        y0: 0,
        x1: 0,
        y1: layout.H,
        stops: [
          { offset: 0, color: '#F7F9F6' },
          { offset: 1, color: '#E6ECE7' },
        ],
      },
      noise: {
        count: 110,
        rgb: [46, 74, 57],
        maxAlpha: 0.035,
        size: 1,
      },
    },
    curve,
    curveSegments,
    fillPolygon,
    fillPolygons,
    gridLines,
    baseline: {
      x1: layout.PL,
      y1: yBottom,
      x2: layout.PL + layout.pw,
      y2: yBottom,
    },
    gridStyle: {
      strokeStyle: 'rgba(78,101,86,0.24)',
      lineWidth: 1,
      lineDash: [2, 4],
    },
    fillStyle: {
      gradient: {
        x0: 0,
        y0: layout.PT,
        x1: 0,
        y1: yBottom,
        stops: [
          { offset: 0, color: rgba(hi, 0.62) },
          { offset: 0.55, color: rgba(mid, 0.42) },
          { offset: 1, color: rgba(lo, 0.18) },
        ],
      },
    },
    curveStyle: {
      strokeStyle: '#294C39',
      lineWidth: 1.6,
      lineJoin: 'round',
      lineCap: 'round',
    },
    baselineStyle: {
      strokeStyle: 'rgba(88,108,95,0.58)',
      lineWidth: 1,
    },
    axisStyle: {
      tickLine: {
        strokeStyle: 'rgba(88,108,95,0.64)',
        lineWidth: 1,
      },
      tickText: {
        fillStyle: '#526259',
        font: `italic 9.5px 'Source Serif 4', serif`,
      },
      axisLabel: {
        fillStyle: '#7A887F',
        font: `9px 'Source Serif 4', 'PingFang SC', serif`,
        textAlign: 'center',
      },
    },
    ticks,
    xAxisLabel: {
      x: layout.PL + layout.pw / 2,
      y: layout.H - 4,
    },
    badges: {
      ascent,
      descent,
      ascentText: `↑${ascent}m`,
      descentText: `↓${descent}m`,
    },
    yBottom,
  };
}

export function estimateElevationLabelStackDepth(
  annos: ElevationAnnotation[],
  layout: ElevationLayoutModel,
  opts: ElevationLabelStackOptions = {},
): ElevationLabelStackEstimate {
  const labels = annos.filter(a => !a.dotOnly && !!a.text);
  if(labels.length <= 1) {
    const fontSize = labels.length <= 5 ? 9.5 : labels.length <= 9 ? 8.5 : 7.5;
    return {
      labelCount: labels.length,
      fontSize,
      lineHeight: fontSize + 3,
      stackDepth: 1,
    };
  }

  const fontSize = labels.length <= 5 ? 9.5 : labels.length <= 9 ? 8.5 : 7.5;
  const lineHeight = fontSize + 3;
  const font = `${fontSize}px 'Source Serif 4', 'PingFang SC', sans-serif`;
  const gap = opts.gap ?? 4;
  const measureText = opts.measureText || ((text: string) => text.length * fontSize * 0.55);

  const placed = labels.map(a => {
    const x = layout.pX(a.idx);
    const lw = measureText(a.text || '', fontSize, font) + 2;
    let labelLeft = x + gap;
    if(labelLeft + lw > layout.PL + layout.pw - 1) labelLeft = x - gap - lw;
    return { labelLeft, lw };
  }).sort((a, b) => a.labelLeft - b.labelLeft);

  let maxOverlap = 1;
  for(let i = 0; i < placed.length; i++) {
    let overlap = 1;
    const ai = placed[i];
    for(let j = 0; j < placed.length; j++) {
      if(j === i) continue;
      const aj = placed[j];
      if(Math.max(ai.labelLeft, aj.labelLeft) < Math.min(ai.labelLeft + ai.lw, aj.labelLeft + aj.lw)) {
        overlap++;
      }
    }
    if(overlap > maxOverlap) maxOverlap = overlap;
  }

  return {
    labelCount: labels.length,
    fontSize,
    lineHeight,
    stackDepth: Math.max(1, maxOverlap),
  };
}

export function computeElevationPanelHeight(
  estimate: ElevationLabelStackEstimate,
  opts: ElevationPanelHeightOptions = {},
): number {
  const minHeight = opts.minHeight ?? 140;
  const maxHeight = opts.maxHeight ?? 340;
  const baseHeight = opts.baseHeight ?? 110;
  const extraLayers = opts.extraLayers ?? 1;
  const labelGap = opts.labelGap ?? 2;
  const padding = opts.padding ?? 16;
  const target = Math.ceil(baseHeight + (estimate.stackDepth + extraLayers) * (estimate.lineHeight + labelGap) + padding);
  return Math.max(minHeight, Math.min(maxHeight, target));
}

export function collectElevationAnnotations(
  pts: TrackTuple[],
  layout: ElevationAnnotationLayout,
  opts: ElevationAnnotationOptions = {},
): ElevationAnnotation[] {
  const { alts, minE, maxE, km, kmRange } = layout;
  const annos: ElevationAnnotation[] = [];
  if(!pts.length || !alts.length || !km.length) return annos;

  const peakIdx = Math.max(0, alts.indexOf(maxE));
  annos.push({
    idx: peakIdx,
    kmVal: km[peakIdx] ?? 0,
    elev: maxE,
    text: `${Math.round(maxE)}m`,
    color: '#A8543C',
    dotColor: '#A8543C',
    dotRadius: 3.4,
    priority: 100,
    side: 'top',
    kind: 'peak',
  });

  const valleyIdx = Math.max(0, alts.indexOf(minE));
  if(Math.abs((km[valleyIdx] ?? 0) - (km[peakIdx] ?? 0)) > kmRange * 0.08) {
    annos.push({
      idx: valleyIdx,
      kmVal: km[valleyIdx] ?? 0,
      elev: minE,
      text: `${Math.round(minE)}m`,
      color: '#5C7A8C',
      dotColor: '#5C7A8C',
      dotRadius: 3.4,
      priority: 50,
      side: 'bottom',
      kind: 'low',
    });
  }

  if(opts.measureMode && pts.length >= 2) {
    annos.push({
      idx: 0,
      kmVal: km[0] ?? 0,
      elev: pts[0][2] || 0,
      text: `A ${Math.round(pts[0][2] || 0)}m`,
      color: '#2F7D55',
      dotColor: '#22c55e',
      priority: 130,
      labelSide: 'left',
      kind: 'measure-a',
    });
    const endIdx = pts.length - 1;
    annos.push({
      idx: endIdx,
      kmVal: km[endIdx] ?? 0,
      elev: pts[endIdx][2] || 0,
      text: `B ${Math.round(pts[endIdx][2] || 0)}m`,
      color: '#A8543C',
      dotColor: '#ef4444',
      priority: 130,
      labelSide: 'right',
      kind: 'measure-b',
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
      const elev = pts[localIdx][2] || 0;
      const name = (wp.label || wp.name || opts.campLabel || '营地').toString().trim();
      annos.push({
        idx: localIdx,
        kmVal: km[localIdx] ?? 0,
        elev,
        text: `${name} ${Math.round(elev)}m`,
        color: '#3F5238',
        priority: 80,
        side: 'top',
        kind: 'camp',
      });
    });
  }

  annos.sort((a, b) => a.kmVal - b.kmVal);
  return annos;
}

export function layoutElevationAnnotations(
  annotations: ElevationAnnotation[],
  layout: ElevationLayoutModel,
  opts: ElevationAnnotationLayoutOptions = {},
): ElevationAnnotationLayoutResult {
  const fontSize = annotations.length <= 5 ? 9.5 : annotations.length <= 9 ? 8.5 : 7.5;
  const font = `${fontSize}px 'Source Serif 4', 'PingFang SC', sans-serif`;
  const gap = opts.gap ?? 4;
  const maxUpLayers = opts.maxUpLayers ?? 6;
  const maxDownLayers = opts.maxDownLayers ?? 4;
  const edgePadding = opts.edgePadding ?? 2;
  const measureText = opts.measureText || ((text: string) => text.length * fontSize * 0.55);
  const placed: Array<{ left: number; top: number; width: number; height: number }> = [];
  let overflow = 0;

  const working: ElevationAnnotationPlacement[] = annotations.map(annotation => {
    const textWidth = annotation.dotOnly ? 0 : measureText(annotation.text || '', fontSize, font);
    return {
      ...annotation,
      x: layout.pX(annotation.idx),
      anchorY: layout.pY(annotation.elev),
      textWidth,
      labelWidth: annotation.dotOnly ? 0 : textWidth + 2,
      labelHeight: annotation.dotOnly ? 0 : fontSize + 3,
    };
  }).sort((a, b) => (b.priority || 0) - (a.priority || 0));

  working.forEach(annotation => {
    if(annotation.dotOnly || !annotation.text) return;
    const { x, anchorY, labelWidth, labelHeight } = annotation;
    const rightTop = { left: x + gap, top: anchorY - labelHeight - 2 };
    const leftTop = { left: x - gap - labelWidth, top: anchorY - labelHeight - 2 };
    const rightBottom = { left: x + gap, top: anchorY + 4 };
    const leftBottom = { left: x - gap - labelWidth, top: anchorY + 4 };
    const candidates = annotation.labelSide === 'left'
      ? [leftTop, leftBottom, rightTop, rightBottom]
      : annotation.labelSide === 'right'
        ? [rightTop, rightBottom, leftTop, leftBottom]
        : [rightTop, leftTop, rightBottom, leftBottom];

    for(let layer = 1; layer <= maxUpLayers; layer++) {
      const offsetY = layer * (labelHeight + 2);
      candidates.push(
        { left: x + gap, top: anchorY - labelHeight - 2 - offsetY },
        { left: x - gap - labelWidth, top: anchorY - labelHeight - 2 - offsetY },
      );
    }
    for(let layer = 1; layer <= maxDownLayers; layer++) {
      const offsetY = layer * (labelHeight + 2);
      candidates.push(
        { left: x + gap, top: anchorY + 4 + offsetY },
        { left: x - gap - labelWidth, top: anchorY + 4 + offsetY },
      );
    }

    const fits = (candidate: { left: number; top: number }) => {
      if(candidate.left + labelWidth > layout.W - edgePadding) return false;
      if(candidate.left < edgePadding) return false;
      if(candidate.top < layout.PT + 1) return false;
      if(candidate.top + labelHeight > layout.PT + layout.ph - 2) return false;
      return !placed.some(item => {
        const overlapsX = Math.max(candidate.left, item.left) < Math.min(candidate.left + labelWidth, item.left + item.width);
        const overlapsY = Math.max(candidate.top, item.top) < Math.min(candidate.top + labelHeight, item.top + item.height);
        return overlapsX && overlapsY;
      });
    };

    const chosen = candidates.find(fits) || candidates[0];
    if(chosen.top < layout.PT + 1) overflow = Math.max(overflow, layout.PT + 1 - chosen.top);
    annotation.labelLeft = Math.max(edgePadding, Math.min(chosen.left, layout.W - edgePadding - labelWidth));
    annotation.labelTop = Math.max(layout.PT + 1, chosen.top);
    placed.push({
      left: annotation.labelLeft,
      top: annotation.labelTop,
      width: labelWidth,
      height: labelHeight,
    });
  });

  working.sort((a, b) => a.kmVal - b.kmVal);
  return { annotations: working, font, fontSize, overflow };
}

export function buildElevationAnnotationRenderModel(
  annotationLayout: ElevationAnnotationLayoutResult,
): ElevationAnnotationRenderModel {
  const commands = annotationLayout.annotations.map(annotation => {
    const command: ElevationAnnotationRenderModel['commands'][number] = {
      dot: {
        x: annotation.x,
        y: annotation.anchorY,
        radius: annotation.dotRadius || 2.5,
        fillStyle: annotation.dotColor || '#1F2A1C',
      },
    };
    if(annotation.dotOnly || !annotation.text || annotation.labelLeft == null || annotation.labelTop == null) {
      return command;
    }
    const leaderX = annotation.labelLeft >= annotation.x
      ? annotation.labelLeft
      : annotation.labelLeft + annotation.labelWidth;
    let leaderY = annotation.labelTop + annotation.labelHeight / 2;
    if(annotation.labelTop + annotation.labelHeight < annotation.anchorY) {
      leaderY = annotation.labelTop + annotation.labelHeight;
    } else if(annotation.labelTop > annotation.anchorY) {
      leaderY = annotation.labelTop;
    }
    command.leader = {
      x1: leaderX,
      y1: leaderY,
      x2: annotation.x,
      y2: annotation.anchorY,
    };
    command.text = {
      value: annotation.text,
      x: annotation.labelLeft,
      y: annotation.labelTop,
      fillStyle: annotation.color,
    };
    return command;
  });

  return {
    commands,
    dotStrokeStyle: 'rgba(255,255,255,0.92)',
    dotStrokeWidth: 0.8,
    defaultDotFillStyle: '#1F2A1C',
    leaderStyle: {
      strokeStyle: 'rgba(41,76,57,0.48)',
      lineWidth: 0.6,
    },
    textStyle: {
      fillStyle: '#2A3A28',
      font: annotationLayout.font,
      textAlign: 'left',
      textBaseline: 'top',
    },
  };
}
