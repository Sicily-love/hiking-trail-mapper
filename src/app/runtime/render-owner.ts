import {
  RenderScheduler,
  type FitFlushContext,
  type RenderDirtyMask,
  type RenderFlushContext,
  type RenderPhase,
} from '../rendering/scheduler.ts';

export interface RuntimeRenderStats {
  frames: number;
  lastTimestamp: number | null;
  lastMask: number;
  phases: Record<RenderPhase, number>;
  elevation: {sourcePoints: number; renderedPoints: number};
  elevationBands: number;
  markers: {add: number; update: number; remove: number; keep: number};
  fit: {requested: number; applied: number; superseded: number; lastEpoch: number; lastResetEpoch: number};
}

export interface RuntimeRenderOwnerDependencies<TFitRequest> {
  renderTracks(): void;
  renderMarkers(): void;
  renderSidebar(): void;
  renderDays(): void;
  renderLegend(): void;
  renderChart(): void;
  executeFit(context: FitFlushContext<TFitRequest>): void;
}

export interface RuntimeRenderOwner<TFitRequest> {
  readonly scheduler: RenderScheduler<TFitRequest>;
  readonly stats: RuntimeRenderStats;
  invalidate(mask: RenderDirtyMask): void;
  dispose(): void;
}

/** Owns render scheduling and instrumentation outside the browser composition root. */
export function createRuntimeRenderOwner<TFitRequest>(
  dependencies: RuntimeRenderOwnerDependencies<TFitRequest>,
): RuntimeRenderOwner<TFitRequest> {
  const stats:RuntimeRenderStats = {
    frames:0,
    lastTimestamp:null,
    lastMask:0,
    phases:{tracks:0, markers:0, sidebar:0, days:0, legend:0, chart:0, fit:0},
    elevation:{sourcePoints:0, renderedPoints:0},
    elevationBands:0,
    markers:{add:0, update:0, remove:0, keep:0},
    fit:{requested:0, applied:0, superseded:0, lastEpoch:0, lastResetEpoch:0},
  };

  const record = (context: RenderFlushContext): void => {
    if(stats.lastTimestamp !== context.timestamp) {
      stats.frames += 1;
      stats.lastTimestamp = context.timestamp;
    }
    stats.lastMask = context.frameMask;
    stats.phases[context.phase] += 1;
  };

  const scheduler = new RenderScheduler<TFitRequest>({
    handlers:{
      tracks(context) { record(context); dependencies.renderTracks(); },
      markers(context) { record(context); dependencies.renderMarkers(); },
      sidebar(context) { record(context); dependencies.renderSidebar(); },
      days(context) { record(context); dependencies.renderDays(); },
      legend(context) { record(context); dependencies.renderLegend(); },
      chart(context) { record(context); dependencies.renderChart(); },
      fit(context) { record(context); dependencies.executeFit(context); },
    },
  });

  return Object.freeze({
    scheduler,
    stats,
    invalidate:(mask: RenderDirtyMask) => scheduler.invalidate(mask),
    dispose:() => scheduler.dispose(),
  });
}
