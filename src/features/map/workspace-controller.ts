import {buildTrackLatLngs, planResetTransition} from '../../core/index.ts';
import type {AppStateSelectors, GroupedTrail} from '../../app/selectors.ts';

export interface WorkspaceTrail extends GroupedTrail {
  track?: number[][];
}

export interface WorkspaceMeasureState {
  active?: boolean;
  ptA?: {idx: number} | null;
  ptB?: {idx: number} | null;
}

export interface WorkspaceFitRequest {
  bounds: any;
  options: Record<string, unknown>;
  closeOverlay: boolean;
  gesture: boolean;
  resetEpoch: number | null;
  source: string;
}

export interface WorkspaceControllerDependencies<TTrail extends WorkspaceTrail> {
  trails: () => readonly TTrail[];
  selectors: AppStateSelectors<TTrail>;
  stateActions: {
    replaceActiveTrails(trailIds: Iterable<string>): void;
    setPrimaryTrail(trailId: string | null): void;
  };
  getMeasureState: () => WorkspaceMeasureState;
  trailRevision: (trail: TTrail) => number;
  leaflet: any;
  map: any;
  requestFit: (request: WorkspaceFitRequest) => number | null;
  invalidateWorkspace: () => void;
  persist: () => void;
  renderStats: {fit: {requested: number; applied: number; superseded: number; lastEpoch: number; lastResetEpoch: number}};
  shouldCloseSidebar: () => boolean;
  closeSidebar: () => void;
  prefersReducedMotion: boolean;
  schedule?: (callback: () => void, delayMs: number) => unknown;
}

export interface WorkspaceController {
  readonly resetEpoch: number;
  cachedTrailBounds(trail: WorkspaceTrail): any | null;
  resetView(options?: {restoreActive?: boolean; gesture?: boolean}): Promise<boolean>;
  executeFit(context: any): void;
  fitBounds(bounds: any, options?: Record<string, unknown>, meta?: Record<string, any>): Promise<boolean>;
}

/** Owns last-request-wins map fitting and reset state without UI DOM access. */
export function createWorkspaceController<TTrail extends WorkspaceTrail>(
  dependencies: WorkspaceControllerDependencies<TTrail>,
): WorkspaceController {
  const schedule = dependencies.schedule ?? ((callback, delay) => setTimeout(callback, delay));
  const boundsCache = new WeakMap<object, {track: unknown; revision: number; bounds: any}>();
  let resetEpoch = 0;
  let pending: null | {epoch: number; resolve: (applied: boolean) => void} = null;

  const cachedTrailBounds = (trail: WorkspaceTrail): any | null => {
    if(!trail.track?.length) return null;
    const revision = dependencies.trailRevision(trail as TTrail);
    const cached = boundsCache.get(trail);
    if(cached?.track === trail.track && cached.revision === revision) return cached.bounds;
    const bounds = dependencies.leaflet.latLngBounds([]);
    for(const point of trail.track) {
      if(Number.isFinite(point[0]) && Number.isFinite(point[1])) bounds.extend([point[0], point[1]]);
    }
    if(!bounds.isValid()) return null;
    boundsCache.set(trail, {track:trail.track, revision, bounds});
    return bounds;
  };

  const fitBounds = (
    bounds: any,
    options: Record<string, unknown> = {},
    meta: Record<string, any> = {},
  ): Promise<boolean> => {
    if(!bounds || !dependencies.map) return Promise.resolve(false);
    const closeOverlay = dependencies.shouldCloseSidebar();
    if(closeOverlay) dependencies.closeSidebar();
    if(pending) {
      dependencies.renderStats.fit.superseded += 1;
      pending.resolve(false);
      pending = null;
    }
    let resolveFit!: (applied: boolean) => void;
    const promise = new Promise<boolean>(resolve => { resolveFit = resolve; });
    const epoch = dependencies.requestFit({
      bounds, options, closeOverlay, gesture:Boolean(meta.gesture),
      resetEpoch:meta.resetEpoch ?? null, source:meta.source || 'workspace',
    });
    if(epoch == null) {
      resolveFit(false);
      return promise;
    }
    pending = {epoch, resolve:resolveFit};
    dependencies.renderStats.fit.requested += 1;
    dependencies.renderStats.fit.lastEpoch = epoch;
    return promise;
  };

  const finishFit = (epoch: number, applied: boolean): void => {
    if(!pending || pending.epoch !== epoch) return;
    const request = pending;
    pending = null;
    if(applied) dependencies.renderStats.fit.applied += 1;
    request.resolve(applied);
  };

  const executeFit = (context: any): void => {
    const request = context.request as WorkspaceFitRequest | null;
    if(!request) return;
    const isCurrent = () => context.isCurrent()
      && (request.resetEpoch == null || request.resetEpoch === resetEpoch);
    if(!isCurrent()) {
      finishFit(context.epoch, false);
      return;
    }
    const apply = () => {
      if(request.closeOverlay) dependencies.map.invalidateSize({pan:false, animate:false});
      const targetZoom = dependencies.map.getBoundsZoom(
        request.bounds,
        false,
        dependencies.leaflet.point(80, 80),
      );
      const transition = planResetTransition({
        gesture:request.gesture,
        currentZoom:dependencies.map.getZoom(),
        targetZoom,
        reducedMotion:dependencies.prefersReducedMotion,
      });
      dependencies.map.fitBounds(request.bounds, {...request.options, ...transition});
    };
    if(!request.closeOverlay) {
      apply();
      finishFit(context.epoch, true);
      return;
    }
    schedule(() => {
      if(!isCurrent()) {
        finishFit(context.epoch, false);
        return;
      }
      apply();
      finishFit(context.epoch, true);
    }, 120);
  };

  const resetView = (options: {restoreActive?: boolean; gesture?: boolean} = {}): Promise<boolean> => {
    const epoch = ++resetEpoch;
    dependencies.renderStats.fit.lastResetEpoch = epoch;
    dependencies.map.stop?.();
    const trails = dependencies.trails();
    let stateChanged = false;
    if(options.restoreActive && dependencies.selectors.activeTrails(trails).length === 0) {
      dependencies.stateActions.replaceActiveTrails(trails.map(trail => trail.id));
      stateChanged = true;
    }
    if(dependencies.selectors.activeGroup() !== null && !dependencies.selectors.primaryTrailId() && trails.length) {
      const first = dependencies.selectors.trailsInActiveGroup(trails)[0] || trails[0];
      dependencies.stateActions.setPrimaryTrail(first.id);
      stateChanged = true;
    }
    if(stateChanged) dependencies.invalidateWorkspace();
    const persist = () => { if(stateChanged) dependencies.persist(); };
    const measure = dependencies.getMeasureState();
    const primary = dependencies.selectors.primaryTrail(trails);
    if(measure.active && measure.ptA && measure.ptB && primary?.track) {
      const start = Math.min(measure.ptA.idx, measure.ptB.idx);
      const end = Math.max(measure.ptA.idx, measure.ptB.idx);
      const line = buildTrackLatLngs(primary.track as any, start, end, 1600);
      if(line.length >= 2) {
        const result = fitBounds(dependencies.leaflet.latLngBounds(line), {padding:[60,60]}, {
          source:'reset-measure', resetEpoch:epoch, gesture:Boolean(options.gesture),
        });
        persist();
        return result;
      }
    }
    if(primary?.track?.length) {
      const bounds = cachedTrailBounds(primary);
      if(!bounds) return Promise.resolve(false);
      const result = fitBounds(bounds, {padding:[40,40]}, {
        source:'reset-primary', resetEpoch:epoch, gesture:Boolean(options.gesture),
      });
      persist();
      return result;
    }
    const bounds = dependencies.leaflet.latLngBounds([]);
    for(const trail of dependencies.selectors.activeTrails(trails)) {
      const trailBounds = cachedTrailBounds(trail);
      if(trailBounds) bounds.extend(trailBounds);
    }
    if(bounds.isValid()) {
      const result = fitBounds(bounds, {padding:[40,40]}, {
        source:'reset-active', resetEpoch:epoch, gesture:Boolean(options.gesture),
      });
      persist();
      return result;
    }
    persist();
    return Promise.resolve(false);
  };

  return Object.freeze({
    get resetEpoch() { return resetEpoch; },
    cachedTrailBounds,
    resetView,
    executeFit,
    fitBounds,
  });
}
