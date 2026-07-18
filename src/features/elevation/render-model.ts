import {
  buildElevationAnnotationRenderModel,
  collectElevationAnnotations,
  computeElevationLayout,
  computeElevationPanelHeight,
  computeElevationRenderModel,
  estimateElevationLabelStackDepth,
  layoutElevationAnnotations,
} from '../../core/elevationProfile.ts';
import { downsampleMinMaxIndices } from '../../core/performance/downsample.ts';
import { normalizeTrackBreaks } from '../../core/trackSegments.ts';
import type {
  ElevationAnnotationOptions,
  ElevationAnnotationRenderModel,
  ElevationLayoutModel,
  ElevationRenderModel,
  TrackTuple,
} from '../../core/types.ts';

export interface ElevationCanvasScene {
  layout: ElevationLayoutModel;
  chart: ElevationRenderModel;
  annotations: ElevationAnnotationRenderModel;
  axisLabel: string;
  overflow: number;
  sourcePoints: number;
  renderedPoints: number;
}

export interface BuildElevationCanvasSceneOptions extends ElevationAnnotationOptions {
  width: number;
  height: number;
  measureMode?: boolean;
  kmFromZero?: boolean;
  axisLabel: string;
  measureText?: (text: string, fontSize: number, font: string) => number;
  trackBreaks?: number[];
}

/** Builds one complete Canvas scene while retaining full-resolution hit-test data separately. */
export function buildElevationCanvasScene(
  points: TrackTuple[],
  options: BuildElevationCanvasSceneOptions,
): ElevationCanvasScene {
  const layout = computeElevationLayout(points, options);
  const pixelWidth = Math.max(2, Math.floor(layout.pw || layout.W));
  let sampleIndices = downsampleMinMaxIndices(
    points,
    pixelWidth,
    point => Number.isFinite(point[2]) ? Number(point[2]) : 0,
  );
  const sourceBreaks = normalizeTrackBreaks(options.trackBreaks, points.length);
  if(sampleIndices.length !== points.length && sourceBreaks.length) {
    sampleIndices = [...new Set([
      ...sampleIndices,
      ...sourceBreaks,
      ...sourceBreaks.map(index => index - 1),
    ])].filter(index => index >= 0 && index < points.length).sort((left, right) => left - right);
  }
  let chart: ElevationRenderModel;
  if(sampleIndices.length === points.length) {
    chart = computeElevationRenderModel(points, layout, sourceBreaks);
  } else {
    const sampledPoints = sampleIndices.map(index => points[index]);
    const sampledLayout: ElevationLayoutModel = {
      ...layout,
      alts:sampleIndices.map(index => layout.alts[index]),
      km:sampleIndices.map(index => layout.km[index]),
      pX:index => layout.pX(sampleIndices[index]),
    };
    const sampledBreaks = sourceBreaks.map(sourceIndex => sampleIndices.indexOf(sourceIndex)).filter(index => index > 0);
    chart = {
      ...computeElevationRenderModel(sampledPoints, sampledLayout, sampledBreaks),
      badges:computeElevationRenderModel(points, layout, sourceBreaks).badges,
    };
  }
  const annotationItems = collectElevationAnnotations(points, layout, options);
  const annotationLayout = layoutElevationAnnotations(annotationItems, layout, {
    measureText:options.measureText,
  });
  return {
    layout,
    chart,
    annotations:buildElevationAnnotationRenderModel(annotationLayout),
    axisLabel:options.axisLabel,
    overflow:annotationLayout.overflow,
    sourcePoints:points.length,
    renderedPoints:sampleIndices.length,
  };
}

export interface EstimateElevationPanelHeightOptions extends ElevationAnnotationOptions {
  width: number;
  measureMode?: boolean;
  kmFromZero?: boolean;
  measureText?: (text: string, fontSize: number, font: string) => number;
}

export function estimateElevationPanelHeightForPoints(
  points: TrackTuple[],
  options: EstimateElevationPanelHeightOptions,
): number {
  if(points.length < 2) return computeElevationPanelHeight({
    labelCount:0, fontSize:9.5, lineHeight:12.5, stackDepth:1,
  });
  const layout = computeElevationLayout(points, {...options, height:140});
  const annotations = collectElevationAnnotations(points, layout, options);
  return computeElevationPanelHeight(estimateElevationLabelStackDepth(annotations, layout, {
    measureText:options.measureText,
  }));
}
