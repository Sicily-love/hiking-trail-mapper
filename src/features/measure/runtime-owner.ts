import type { RuntimeContext } from '../../app/runtime/context.ts';
import type { InteractionSessionLike } from '../../app/runtime/interaction-owner.ts';
import { upsertLeafletPolyline } from '../../adapters/leaflet.ts';
import {
  accumulatorAscent,
  accumulatorDescent,
  buildMeasureSegmentRenderModel,
  normalizeTrackIndexRange,
} from '../../core/index.ts';
import type { MeasureStats, TrackIndexPoint, TrackTuple } from '../../core/types.ts';
import type { TrackSnapHit, TrackSnapService } from '../map/track-snap.ts';
import { createMeasureController, type MeasureController, type MeasureInteractionState } from './controller.ts';
import type { MeasurePanelController } from '../../ui/measure-panel.ts';

export interface MeasureRuntimeTrail {
  id: string;
  track: TrackTuple[];
  track_breaks?: number[];
  waypoints?: unknown[];
  _descCum?: number[];
  [name: string]: unknown;
}

interface MeasureTapEvent {
  type: 'tap';
  source?: 'fast' | 'leaflet';
  latlng: {lat: number; lng: number};
}

interface MeasureDragEvent {
  type: 'drag-start' | 'drag-snap' | 'drag-end';
  endpoint: 'A' | 'B';
  hit?: TrackSnapHit<MeasureRuntimeTrail> | null;
}

export interface MeasureRuntime<TTrail extends MeasureRuntimeTrail = MeasureRuntimeTrail> {
  readonly controller: MeasureController;
  readonly state: Readonly<MeasureInteractionState>;
  readonly layer: unknown;
  enter(): boolean;
  exit(options?: {fromManager?: boolean; reason?: string}): void;
  reset(): void;
  reverse(): boolean;
  compute(): void;
  pointFromHit(hit: TrackSnapHit<TTrail>): TrackIndexPoint;
  computeStats(a: TrackIndexPoint | null, b: TrackIndexPoint | null): MeasureStats | null;
  getStatsCache(trail: MeasureRuntimeTrail): MeasureStatsCache | null;
  marker(lat: number, lng: number, label: 'A' | 'B', color: string, options?: {draggable?: boolean}): any;
  addEndpointMarker(point: TrackIndexPoint, label: 'A' | 'B', color: string): any;
  bindEndpointDrag(marker: any, label: 'A' | 'B'): void;
  applyEndpointHit(label: 'A' | 'B', hit: TrackSnapHit<TTrail> | null): boolean;
  queueLiveUpdate(): void;
  renderSegmentLine(maxPoints?: number): void;
  showReadout(): void;
  hideReadout(): void;
  setHint(text: string): void;
  resetReadout(hint?: string): void;
  handleInteractionEvent(event: object, session: InteractionSessionLike): void;
}

interface MeasureStatsCache {
  signature: string;
  distCum: Float64Array;
  ascCum: Float64Array;
  descCum: Float64Array;
  elevations: number[];
  blockSize: number;
  maxBlocks: Float64Array;
}

interface MeasureRuntimeDependencies<TTrail extends MeasureRuntimeTrail> {
  document: Document;
  window: Window;
  leaflet: any;
  map: any;
  context: RuntimeContext<TTrail>;
  panel: MeasurePanelController;
  trackSnap: TrackSnapService<TTrail>;
  interactionMarkerHitSize: number;
  language: () => 'zh' | 'en';
  notify: (message: string, type?: 'info' | 'error') => void;
  beginInteraction: (
    kind: 'measure',
    phase: 'select-a',
    trail: TTrail,
    options: {
      onEvent: (event: object, session: InteractionSessionLike) => void;
      onCancel: (options: {fromManager: true; reason: string}) => void;
    },
  ) => InteractionSessionLike | null;
  cancelInteraction: (kind: 'measure', reason?: string) => boolean;
  setInteractionPhase: (kind: 'measure', phase: string) => boolean;
  scheduleInteractionFrame: (kind: 'measure', callback: () => void) => unknown;
  dispatchInteraction: (kind: 'measure', event: object) => boolean;
  enterRenderMode: (label: string) => void;
  clearDayPreview: () => void;
  refreshElevation: () => void;
}

/** Owns measurement snapping, Leaflet effects, panel presentation, and session orchestration. */
export function createMeasureRuntime<TTrail extends MeasureRuntimeTrail>(
  dependencies: MeasureRuntimeDependencies<TTrail>,
): MeasureRuntime<TTrail> {
  const {
    window, leaflet:L, map, context, panel, trackSnap, interactionMarkerHitSize,
    language, notify, beginInteraction, cancelInteraction, setInteractionPhase,
    scheduleInteractionFrame, dispatchInteraction, enterRenderMode, clearDayPreview, refreshElevation,
  } = dependencies;
  const controller = createMeasureController();
  const state = controller.state;
  const layer = L.layerGroup().addTo(map);
  const statsCache = new WeakMap<object, MeasureStatsCache>();
  let segmentLine: unknown = null;
  let liveFrame: unknown = null;
  const isZh = (): boolean => language() === 'zh';
  const text = (zh: string, en: string): string => isZh() ? zh : en;

  const primaryTrail = (): TTrail | null =>
    context.stateSelectors.primaryTrail(context.projectSelectors.trails());

  const trailForSelection = (): TTrail | null =>
    context.projectSelectors.trailById(state.trailId || context.stateSelectors.primaryTrailId());

  function pointFromHit(hit: TrackSnapHit<TTrail>): TrackIndexPoint {
    return {
      idx:hit.idx,
      lat:hit.point[0],
      lng:hit.point[1],
      elev:hit.point[2] || 0,
      km:hit.point[3] || 0,
    };
  }

  function getStatsCache(trail: TTrail): MeasureStatsCache | null {
    if(!trail?.track.length) return null;
    const track = trail.track;
    const signature = `${track[0][0]},${track[0][1]}|${track.at(-1)?.[0]},${track.at(-1)?.[1]}|${track.length}`;
    const existing = statsCache.get(trail);
    if(existing?.signature === signature) return existing;

    const count = track.length;
    const distCum = new Float64Array(count);
    const ascCum = new Float64Array(count);
    const descCum = new Float64Array(count);
    const elevations = new Array<number>(count);
    for(let index = 0; index < count; index += 1) {
      distCum[index] = Number.isFinite(track[index][3]) ? Number(track[index][3]) : (index ? distCum[index - 1] : 0);
      ascCum[index] = Number.isFinite(track[index][4]) ? Number(track[index][4]) : 0;
      descCum[index] = Number.isFinite(trail._descCum?.[index]) ? Number(trail._descCum?.[index]) : 0;
      elevations[index] = Number.isFinite(track[index][2]) ? Number(track[index][2]) : 0;
    }
    if(!trail._descCum || trail._descCum.length !== count) {
      const cumulative = accumulatorDescent(elevations, 10);
      for(let index = 0; index < count; index += 1) descCum[index] = cumulative[index] || 0;
    }
    if(!Number.isFinite(track[count - 1][4])) {
      const cumulative = accumulatorAscent(elevations, 10);
      for(let index = 0; index < count; index += 1) ascCum[index] = cumulative[index] || 0;
    }

    const blockSize = 256;
    const maxBlocks = new Float64Array(Math.ceil(count / blockSize));
    for(let block = 0; block < maxBlocks.length; block += 1) {
      let maximum = -Infinity;
      const first = block * blockSize;
      const last = Math.min(count, first + blockSize);
      for(let index = first; index < last; index += 1) maximum = Math.max(maximum, elevations[index]);
      maxBlocks[block] = maximum;
    }
    const next = {signature, distCum, ascCum, descCum, elevations, blockSize, maxBlocks};
    statsCache.set(trail, next);
    return next;
  }

  function rangeMaximum(cache: MeasureStatsCache, first: number, last: number): number {
    let maximum = -Infinity;
    let index = first;
    while(index <= last && index % cache.blockSize !== 0) maximum = Math.max(maximum, cache.elevations[index++]);
    while(index + cache.blockSize - 1 <= last) {
      maximum = Math.max(maximum, cache.maxBlocks[Math.floor(index / cache.blockSize)]);
      index += cache.blockSize;
    }
    while(index <= last) maximum = Math.max(maximum, cache.elevations[index++]);
    return maximum;
  }

  function rangeMinimum(cache: MeasureStatsCache, first: number, last: number): number {
    let minimum = Infinity;
    for(let index = first; index <= last; index += 1) minimum = Math.min(minimum, cache.elevations[index]);
    return minimum;
  }

  function computeStats(a: TrackIndexPoint | null, b: TrackIndexPoint | null): MeasureStats | null {
    const trail = trailForSelection();
    if(!trail || !a || !b) return null;
    const cache = getStatsCache(trail);
    if(!cache) return null;
    const range = normalizeTrackIndexRange(trail.track, a.idx, b.idx);
    if(!range) return null;
    const {iStart, iEnd, reversed} = range;
    const forwardAscent = Math.max(0, cache.ascCum[iEnd] - cache.ascCum[iStart]);
    const forwardDescent = Math.max(0, cache.descCum[iEnd] - cache.descCum[iStart]);
    return {
      ...range,
      distKm:Math.abs(cache.distCum[iEnd] - cache.distCum[iStart]),
      asc:Math.round(reversed ? forwardDescent : forwardAscent),
      desc:Math.round(reversed ? forwardAscent : forwardDescent),
      maxE:Math.round(rangeMaximum(cache, iStart, iEnd)),
      minE:Math.round(rangeMinimum(cache, iStart, iEnd)),
    };
  }

  function marker(
    lat: number,
    lng: number,
    label: 'A' | 'B',
    color: string,
    options: {draggable?: boolean} = {},
  ): any {
    const draggable = Boolean(options.draggable);
    const icon = L.divIcon({
      className:'measure-marker-icon',
      html:`<div class="measure-endpoint measure-endpoint--${label.toLowerCase()}" style="--measure-point-color:${color}">${label}</div>`,
      iconSize:[interactionMarkerHitSize, interactionMarkerHitSize],
      iconAnchor:[interactionMarkerHitSize / 2, interactionMarkerHitSize / 2],
    });
    return L.marker([lat, lng], {icon, interactive:draggable, keyboard:false, draggable, autoPan:draggable});
  }

  function clearLayer(): void {
    if(liveFrame && typeof liveFrame === 'object' && 'cancel' in liveFrame) {
      try { (liveFrame as {cancel?: () => void}).cancel?.(); } catch { /* stale frame */ }
    } else if(typeof liveFrame === 'number') {
      window.cancelAnimationFrame(liveFrame);
    }
    liveFrame = null;
    layer.clearLayers();
    segmentLine = null;
  }

  function renderSegmentLine(maxPoints = 900): void {
    if(!state.ptA || !state.ptB) return;
    const trail = trailForSelection();
    if(!trail?.track.length) return;
    const model = buildMeasureSegmentRenderModel(
      trail.track,
      state.ptA,
      state.ptB,
      maxPoints,
      trail.track_breaks,
    );
    if(model) segmentLine = upsertLeafletPolyline(L, layer, segmentLine as never, model);
  }

  function updateReadout(loading = false): void {
    if(!state.ptA || !state.ptB) return;
    panel.update(loading ? null : computeStats(state.ptA, state.ptB), loading);
  }

  function queueLiveUpdate(): void {
    if(liveFrame) return;
    liveFrame = scheduleInteractionFrame('measure', () => {
      liveFrame = null;
      renderSegmentLine(700);
      updateReadout();
    });
  }

  function applyEndpointHit(
    label: 'A' | 'B',
    hit: TrackSnapHit<TTrail> | null,
  ): boolean {
    if(!hit) return false;
    const changed = controller.updateEndpoint(label, pointFromHit(hit));
    if(changed) panel.setHint('');
    return changed;
  }

  function bindEndpointDrag(endpointMarker: any, label: 'A' | 'B'): void {
    const snapper = trackSnap.createDragSnapper(endpointMarker, {
      scheduleFrame:callback => scheduleInteractionFrame('measure', callback) as never,
      getCenterIdx:() => (label === 'A' ? state.ptA : state.ptB)?.idx ?? null,
      onSnap:hit => { dispatchInteraction('measure', {type:'drag-snap', endpoint:label, hit}); },
    });
    endpointMarker.on('dragstart', () => {
      dispatchInteraction('measure', {type:'drag-start', endpoint:label});
    });
    endpointMarker.on('drag', (event: {target: any}) => snapper.schedule(event));
    endpointMarker.on('dragend', (event: {target: any}) => {
      const hit = snapper.resolve(event.target.getLatLng());
      snapper.cancel();
      dispatchInteraction('measure', {type:'drag-end', endpoint:label, hit});
    });
  }

  function addEndpointMarker(point: TrackIndexPoint, label: 'A' | 'B', color: string): any {
    const endpointMarker = marker(point.lat, point.lng, label, color, {draggable:true}).addTo(layer);
    bindEndpointDrag(endpointMarker, label);
    return endpointMarker;
  }

  function compute(): void {
    if(!state.ptA || !state.ptB) return;
    const sequence = controller.nextComputeSequence();
    const pointA = state.ptA;
    const pointB = state.ptB;
    clearLayer();
    addEndpointMarker(pointA, 'A', '#22c55e');
    addEndpointMarker(pointB, 'B', '#ef4444');
    updateReadout(true);
    panel.setHint('');
    scheduleInteractionFrame('measure', () => {
      if(!controller.isComputeCurrent(sequence)) return;
      renderSegmentLine(1200);
      if(!controller.isComputeCurrent(sequence)) return;
      updateReadout();
      scheduleInteractionFrame('measure', () => {
        if(controller.isComputeCurrent(sequence)) refreshElevation();
      });
    });
  }

  function handleTap(event: MeasureTapEvent, session: InteractionSessionLike): void {
    if(state._justDragged || (event.source !== 'fast' && state._fastTapUntil > Date.now())) return;
    if(state.ptA && state.ptB) {
      notify(text('已选 A/B 后请拖动端点调整，或点“重新选点”', 'Drag A/B to adjust them, or choose “Select again”'), 'info');
      return;
    }
    const label = state.ptA ? 'B' : 'A';
    const color = label === 'A' ? '#22c55e' : '#ef4444';
    let temporary: any = null;
    if(event.source === 'fast') {
      if(label === 'A') layer.clearLayers();
      temporary = marker(event.latlng.lat, event.latlng.lng, label, color).addTo(layer);
    }
    const commitHit = (hit: TrackSnapHit<TTrail> | null): void => {
      if(!session.isCurrent()) return;
      if(!hit) {
        temporary?.remove();
        notify(text('请点击主轨迹附近（200m 内）', 'Click within 200 m of the primary trail'), 'error');
        return;
      }
      const point = pointFromHit(hit);
      temporary?.setLatLng?.([point.lat, point.lng]);
      if(label === 'A') {
        controller.updateEndpoint('A', point);
        session.setPhase('select-b');
        if(!temporary) marker(point.lat, point.lng, 'A', color).addTo(layer);
        panel.setHint(text('再点击终点。', 'Now click the end point.'));
        return;
      }
      if(point.idx === state.ptA?.idx) {
        temporary?.remove();
        notify(text('起点和终点不能是同一点', 'Start and end cannot be the same point'), 'error');
        return;
      }
      controller.updateEndpoint('B', point);
      session.setPhase('ready');
      compute();
    };
    const resolve = (): void => commitHit(trackSnap.nearestPrimary(event.latlng.lat, event.latlng.lng));
    if(event.source === 'fast') session.frame(resolve);
    else resolve();
  }

  function handleInteractionEvent(event: object, session: InteractionSessionLike): void {
    const interaction = event as {
      type?: MeasureTapEvent['type'] | MeasureDragEvent['type'];
      source?: MeasureTapEvent['source'];
      latlng?: MeasureTapEvent['latlng'];
      endpoint?: MeasureDragEvent['endpoint'];
      hit?: TrackSnapHit<TTrail> | null;
    };
    if(interaction.type === 'tap' && interaction.latlng) {
      handleTap(interaction as MeasureTapEvent, session);
      return;
    }
    if(interaction.type === 'drag-start') {
      controller.beginDrag();
      session.setPhase('dragging');
      return;
    }
    if(interaction.type === 'drag-snap') {
      if(session.phase === 'dragging' && interaction.endpoint
          && applyEndpointHit(interaction.endpoint, interaction.hit || null)) queueLiveUpdate();
      return;
    }
    if(interaction.type !== 'drag-end' || !interaction.endpoint) return;
    session.setPhase('ready');
    session.delay(250, () => controller.endDrag());
    const hit = interaction.hit || null;
    if(!hit) {
      notify(text('必须拖到主轨迹附近（200m 内）', 'Drag within 200 m of the primary trail'), 'error');
      compute();
      return;
    }
    const other = interaction.endpoint === 'A' ? state.ptB : state.ptA;
    if(other?.idx === hit.idx) {
      notify(text('起点和终点不能是同一点', 'Start and end cannot be the same point'), 'error');
      compute();
      return;
    }
    applyEndpointHit(interaction.endpoint, hit);
    compute();
  }

  function enter(): boolean {
    const trail = primaryTrail();
    if(!trail?.track.length) {
      notify(text('请先设置主轨迹', 'Set a primary trail first'), 'error');
      return false;
    }
    const session = beginInteraction('measure', 'select-a', trail, {
      onEvent:handleInteractionEvent,
      onCancel:options => exit(options),
    });
    if(!session) return false;
    controller.enter(trail.id);
    enterRenderMode(text('测距', 'Measure'));
    clearDayPreview();
    clearLayer();
    panel.enter();
    panel.reset(text('在主轨迹上点击起点，再点击终点。', 'Click a start point, then an end point on the primary trail.'));
    return true;
  }

  function exit(options: {fromManager?: boolean; reason?: string} = {}): void {
    if(!options.fromManager && cancelInteraction('measure', options.reason || 'cancelled')) return;
    controller.exit();
    clearLayer();
    panel.exit();
    panel.hideReadout();
    refreshElevation();
  }

  function reset(): void {
    controller.reset();
    setInteractionPhase('measure', 'select-a');
    clearLayer();
    panel.reset(text('在主轨迹上点击起点，再点击终点。', 'Click a start point, then an end point on the primary trail.'));
    window.requestAnimationFrame(refreshElevation);
  }

  function reverse(): boolean {
    if(!state.ptA || !state.ptB) {
      notify(text('请先选择 A/B 两点', 'Select points A and B first'), 'info');
      return false;
    }
    if(!controller.reverse()) return false;
    compute();
    return true;
  }

  return Object.freeze({
    controller,
    state,
    layer,
    enter,
    exit,
    reset,
    reverse,
    compute,
    pointFromHit,
    computeStats,
    getStatsCache,
    marker,
    addEndpointMarker,
    bindEndpointDrag,
    applyEndpointHit,
    queueLiveUpdate,
    renderSegmentLine,
    showReadout:panel.showReadout,
    hideReadout:panel.hideReadout,
    setHint:panel.setHint,
    resetReadout:panel.reset,
    handleInteractionEvent,
  });
}
