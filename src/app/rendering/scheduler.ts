export const RENDER_DIRTY = Object.freeze({
  NONE: 0,
  TRACKS: 1 << 0,
  MARKERS: 1 << 1,
  SIDEBAR: 1 << 2,
  DAYS: 1 << 3,
  LEGEND: 1 << 4,
  CHART: 1 << 5,
  FIT: 1 << 6,
  ALL: (1 << 7) - 1,
} as const);

export const {
  TRACKS,
  MARKERS,
  SIDEBAR,
  DAYS,
  LEGEND,
  CHART,
  FIT,
} = RENDER_DIRTY;

export const RENDER_FLUSH_ORDER = Object.freeze([
  TRACKS,
  MARKERS,
  SIDEBAR,
  DAYS,
  LEGEND,
  CHART,
  FIT,
] as const);

export type RenderDirtyMask = number;
export type RenderPhase = 'tracks' | 'markers' | 'sidebar' | 'days' | 'legend' | 'chart' | 'fit';
export type RequestFrame = (callback: (timestamp: number) => void) => number;
export type CancelFrame = (handle: number) => void;

type NonFitRenderPhase = Exclude<RenderPhase, 'fit'>;

export interface RenderFlushContext<P extends RenderPhase = RenderPhase> {
  readonly phase: P;
  readonly flag: RenderDirtyMask;
  readonly frameMask: RenderDirtyMask;
  readonly timestamp: number;
}

export interface FitFlushContext<TFitRequest = unknown> extends RenderFlushContext<'fit'> {
  readonly request: TFitRequest | undefined;
  readonly epoch: number;
  readonly isCurrent: () => boolean;
}

export type RenderHandler<P extends NonFitRenderPhase = NonFitRenderPhase> = (
  context: RenderFlushContext<P>,
) => void;

export type FitHandler<TFitRequest = unknown> = (
  context: FitFlushContext<TFitRequest>,
) => void;

export interface RenderSchedulerHandlers<TFitRequest = unknown> {
  tracks?: RenderHandler<'tracks'>;
  markers?: RenderHandler<'markers'>;
  sidebar?: RenderHandler<'sidebar'>;
  days?: RenderHandler<'days'>;
  legend?: RenderHandler<'legend'>;
  chart?: RenderHandler<'chart'>;
  fit?: FitHandler<TFitRequest>;
}

export interface RenderSchedulerOptions<TFitRequest = unknown> {
  handlers?: RenderSchedulerHandlers<TFitRequest>;
  raf?: RequestFrame;
  caf?: CancelFrame;
}

interface PendingFit<TFitRequest> {
  request: TFitRequest | undefined;
  epoch: number;
}

const NON_FIT_FLUSH_ORDER: ReadonlyArray<{
  phase: NonFitRenderPhase;
  flag: RenderDirtyMask;
}> = Object.freeze([
  {phase: 'tracks', flag: TRACKS},
  {phase: 'markers', flag: MARKERS},
  {phase: 'sidebar', flag: SIDEBAR},
  {phase: 'days', flag: DAYS},
  {phase: 'legend', flag: LEGEND},
  {phase: 'chart', flag: CHART},
]);

const defaultRaf: RequestFrame = callback => {
  if(typeof globalThis.requestAnimationFrame !== 'function') {
    throw new Error('RenderScheduler requires requestAnimationFrame or an injected raf');
  }
  return globalThis.requestAnimationFrame(callback);
};

const defaultCaf: CancelFrame = handle => {
  if(typeof globalThis.cancelAnimationFrame !== 'function') {
    throw new Error('RenderScheduler requires cancelAnimationFrame or an injected caf');
  }
  globalThis.cancelAnimationFrame(handle);
};

export class RenderScheduler<TFitRequest = unknown> {
  private handlers: RenderSchedulerHandlers<TFitRequest>;
  private readonly raf: RequestFrame;
  private readonly caf: CancelFrame;
  private dirtyMask = RENDER_DIRTY.NONE;
  private frameHandle: number | null = null;
  private pendingFit: PendingFit<TFitRequest> | null = null;
  private currentFitEpoch: number | null = null;
  private nextFitEpoch = 0;
  private flushing = false;
  private isDisposed = false;

  constructor(options: RenderSchedulerOptions<TFitRequest> = {}) {
    this.handlers = {...options.handlers};
    this.raf = options.raf || defaultRaf;
    this.caf = options.caf || defaultCaf;
  }

  get pendingMask(): RenderDirtyMask {
    return this.dirtyMask;
  }

  get hasScheduledFrame(): boolean {
    return this.frameHandle !== null;
  }

  get disposed(): boolean {
    return this.isDisposed;
  }

  get fitEpoch(): number {
    return this.nextFitEpoch;
  }

  invalidate(mask: RenderDirtyMask, fitRequest?: TFitRequest): void {
    if(this.isDisposed) return;
    const knownMask = mask & RENDER_DIRTY.ALL;
    if(knownMask === RENDER_DIRTY.NONE) return;

    if(knownMask & FIT) this.queueFit(fitRequest);
    this.dirtyMask |= knownMask;
    this.ensureFrame();
  }

  requestFit(request: TFitRequest): number | null {
    if(this.isDisposed) return null;
    const epoch = this.queueFit(request);
    this.dirtyMask |= FIT;
    this.ensureFrame();
    return epoch;
  }

  isFitEpochCurrent(epoch: number): boolean {
    return !this.isDisposed && this.currentFitEpoch === epoch;
  }

  flush(timestamp = 0): void {
    if(this.isDisposed || this.flushing) return;
    if(this.frameHandle !== null) {
      this.caf(this.frameHandle);
      this.frameHandle = null;
    }

    const frameMask = this.dirtyMask;
    if(frameMask === RENDER_DIRTY.NONE) return;
    const fit = this.pendingFit;
    this.dirtyMask = RENDER_DIRTY.NONE;
    this.pendingFit = null;
    this.flushing = true;

    const errors: unknown[] = [];
    try {
      for(const {phase, flag} of NON_FIT_FLUSH_ORDER) {
        if(!(frameMask & flag) || this.isDisposed) continue;
        const handler = this.handlers[phase] as RenderHandler | undefined;
        if(!handler) continue;
        try {
          handler({phase, flag, frameMask, timestamp});
        } catch(error) {
          errors.push(error);
        }
      }

      if((frameMask & FIT) && fit && !this.isDisposed && this.handlers.fit) {
        const epoch = fit.epoch;
        try {
          this.handlers.fit({
            phase: 'fit',
            flag: FIT,
            frameMask,
            timestamp,
            request: fit.request,
            epoch,
            isCurrent: () => this.isFitEpochCurrent(epoch),
          });
        } catch(error) {
          errors.push(error);
        }
      }
    } finally {
      this.flushing = false;
      this.ensureFrame();
    }

    if(errors.length === 1) throw errors[0];
    if(errors.length > 1) throw new AggregateError(errors, 'Multiple RenderScheduler handlers failed');
  }

  cancel(): void {
    if(this.frameHandle !== null) this.caf(this.frameHandle);
    this.frameHandle = null;
    this.dirtyMask = RENDER_DIRTY.NONE;
    this.pendingFit = null;
    this.currentFitEpoch = null;
  }

  dispose(): void {
    if(this.isDisposed) return;
    this.isDisposed = true;
    this.cancel();
    this.handlers = {};
  }

  private queueFit(request: TFitRequest | undefined): number {
    const epoch = ++this.nextFitEpoch;
    this.currentFitEpoch = epoch;
    this.pendingFit = {request, epoch};
    return epoch;
  }

  private ensureFrame(): void {
    if(
      this.isDisposed
      || this.flushing
      || this.frameHandle !== null
      || this.dirtyMask === RENDER_DIRTY.NONE
    ) return;
    this.frameHandle = this.raf(timestamp => {
      this.frameHandle = null;
      this.flush(timestamp);
    });
  }
}
