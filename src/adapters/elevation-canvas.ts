import type { ElevationCanvasScene } from '../features/elevation/render-model.ts';

export interface ElevationCanvasDimensions {
  width: number;
  height: number;
  dpr: number;
}

export interface ElevationCanvasRenderer {
  measureText(text: string, fontSize: number, font: string): number;
  clear(dimensions: ElevationCanvasDimensions): void;
  render(scene: ElevationCanvasScene, dimensions: ElevationCanvasDimensions): void;
}

function applyLineStyle(
  context: CanvasRenderingContext2D,
  style: {strokeStyle: string; lineWidth: number; lineDash?: number[]; lineJoin?: CanvasLineJoin; lineCap?: CanvasLineCap},
): void {
  context.strokeStyle = style.strokeStyle;
  context.lineWidth = style.lineWidth;
  if(style.lineJoin) context.lineJoin = style.lineJoin;
  if(style.lineCap) context.lineCap = style.lineCap;
  context.setLineDash(style.lineDash || []);
}

function gradient(context: CanvasRenderingContext2D, model: ElevationCanvasScene['chart']['fillStyle']['gradient']): CanvasGradient {
  const value = context.createLinearGradient(model.x0, model.y0, model.x1, model.y1);
  for(const stop of model.stops) value.addColorStop(stop.offset, stop.color);
  return value;
}

/** Executes a complete typed elevation scene and owns every Canvas drawing instruction. */
export function createElevationCanvasRenderer(
  context: CanvasRenderingContext2D,
  random: () => number = Math.random,
): ElevationCanvasRenderer {
  const prepare = ({width, height, dpr}: ElevationCanvasDimensions): void => {
    context.canvas.width = width * dpr;
    context.canvas.height = height * dpr;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);
  };

  const measureText = (text: string, _fontSize: number, font: string): number => {
    context.font = font;
    return context.measureText(text).width;
  };

  const clear = (dimensions: ElevationCanvasDimensions): void => {
    prepare(dimensions);
    context.clearRect(0, 0, dimensions.width, dimensions.height);
  };

  const render = (scene: ElevationCanvasScene, dimensions: ElevationCanvasDimensions): void => {
    prepare(dimensions);
    const {chart, annotations, layout} = scene;
    context.clearRect(0, 0, dimensions.width, dimensions.height);

    context.fillStyle = gradient(context, chart.background.gradient);
    context.fillRect(chart.background.rect.x, chart.background.rect.y, chart.background.rect.w, chart.background.rect.h);
    const noise = chart.background.noise;
    for(let index = 0; index < noise.count; index += 1) {
      context.fillStyle = `rgba(${noise.rgb[0]},${noise.rgb[1]},${noise.rgb[2]},${(random() * noise.maxAlpha).toFixed(3)})`;
      context.fillRect(random() * chart.background.rect.w, random() * chart.background.rect.h, noise.size, noise.size);
    }

    applyLineStyle(context, chart.gridStyle);
    for(const line of chart.gridLines) {
      context.beginPath();
      context.moveTo(line.x1, line.y1);
      context.lineTo(line.x2, line.y2);
      context.stroke();
    }
    context.setLineDash([]);

    if(chart.fillPolygon.length >= 3) {
      context.beginPath();
      context.moveTo(chart.fillPolygon[0].x, chart.fillPolygon[0].y);
      for(let index = 1; index < chart.fillPolygon.length; index += 1) {
        context.lineTo(chart.fillPolygon[index].x, chart.fillPolygon[index].y);
      }
      context.closePath();
      context.fillStyle = gradient(context, chart.fillStyle.gradient);
      context.fill();
    }

    if(chart.curve.length) {
      context.beginPath();
      chart.curve.forEach((point, index) => index === 0
        ? context.moveTo(point.x, point.y)
        : context.lineTo(point.x, point.y));
      applyLineStyle(context, chart.curveStyle);
      context.stroke();
    }
    context.beginPath();
    context.moveTo(chart.baseline.x1, chart.baseline.y1);
    context.lineTo(chart.baseline.x2, chart.baseline.y2);
    applyLineStyle(context, chart.baselineStyle);
    context.stroke();

    for(const command of annotations.commands) {
      context.beginPath();
      context.arc(command.dot.x, command.dot.y, command.dot.radius, 0, Math.PI * 2);
      context.fillStyle = command.dot.fillStyle || annotations.defaultDotFillStyle;
      context.fill();
      context.strokeStyle = annotations.dotStrokeStyle;
      context.lineWidth = annotations.dotStrokeWidth;
      context.stroke();
      if(command.leader) {
        context.beginPath();
        context.moveTo(command.leader.x1, command.leader.y1);
        context.lineTo(command.leader.x2, command.leader.y2);
        applyLineStyle(context, annotations.leaderStyle);
        context.stroke();
      }
      if(command.text) {
        context.font = annotations.textStyle.font;
        context.fillStyle = command.text.fillStyle || annotations.textStyle.fillStyle;
        context.textAlign = annotations.textStyle.textAlign || 'left';
        context.textBaseline = annotations.textStyle.textBaseline;
        context.fillText(command.text.value, command.text.x, command.text.y);
      }
    }

    context.fillStyle = chart.axisStyle.tickText.fillStyle;
    context.font = chart.axisStyle.tickText.font;
    for(const tick of chart.ticks) {
      context.beginPath();
      context.moveTo(tick.x, layout.PT + layout.ph);
      context.lineTo(tick.x, layout.PT + layout.ph + 3);
      applyLineStyle(context, chart.axisStyle.tickLine);
      context.stroke();
      context.textAlign = tick.align;
      context.fillText(tick.label, tick.x, layout.PT + layout.ph + 14);
    }
    context.textAlign = chart.axisStyle.axisLabel.textAlign || 'center';
    context.fillStyle = chart.axisStyle.axisLabel.fillStyle;
    context.font = chart.axisStyle.axisLabel.font;
    context.fillText(scene.axisLabel, chart.xAxisLabel.x, chart.xAxisLabel.y);
    context.textBaseline = 'alphabetic';
    context.setLineDash([]);
  };

  return Object.freeze({measureText, clear, render});
}
