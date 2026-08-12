import type { RuntimeContext } from '../../app/runtime/context.ts';
import type { InteractionSessionLike } from '../../app/runtime/interaction-owner.ts';
import { buildSegmentLayerModel, computeSegmentStats } from '../../core/index.ts';
import type { TrackIndexPoint } from '../../core/types.ts';
import type { DialogController } from '../../ui/dialog/controller.ts';
import type { TrackSnapHit, TrackSnapService } from '../map/track-snap.ts';
import {
  createSegmentController,
  type SegmentController,
  type SegmentInteractionState,
  type SegmentTrail,
} from './controller.ts';

interface SegmentTapEvent {
  type: 'tap';
  source?: 'fast' | 'leaflet';
  latlng: {lat: number; lng: number};
}

interface SegmentDragEvent {
  type: 'drag-start' | 'drag-end';
  boundaryIndex: number;
  hit?: TrackSnapHit<SegmentTrail> | null;
}

export interface SegmentRuntime<TTrail extends SegmentTrail = SegmentTrail> {
  readonly controller: SegmentController;
  readonly state: Readonly<SegmentInteractionState>;
  readonly layer: unknown;
  enter(): boolean;
  exit(options?: {fromManager?: boolean; reason?: string}): void;
  requestExit(reason?: string): Promise<boolean>;
  restore(): boolean;
  insertPoint(point: TrackIndexPoint | null): boolean;
  deleteDay(dayNo: number): boolean;
  apply(): Promise<boolean>;
  update(): void;
  redraw(): void;
}

interface SegmentRuntimeDependencies<TTrail extends SegmentTrail> {
  document: Document;
  leaflet: any;
  map: any;
  dialogs: DialogController;
  context: RuntimeContext<TTrail>;
  trackSnap: TrackSnapService<TTrail>;
  dayPalette: string[];
  interactionMarkerHitSize: number;
  language: () => 'zh' | 'en';
  formatCoordinates: (point: [number, number]) => string;
  markRevision: (trail: SegmentTrail) => unknown;
  notify: (message: string, type?: 'info' | 'error') => void;
  beginInteraction: (
    kind: 'segment',
    phase: 'editing',
    trail: TTrail,
    options: {
      onEvent: (event: object, session: InteractionSessionLike) => void;
      onCancel: (options: {fromManager: true; reason: string}) => void;
    },
  ) => InteractionSessionLike | null;
  cancelInteraction: (kind: 'segment', reason?: string) => boolean;
  setInteractionPhase: (kind: 'segment', phase: string) => boolean;
  scheduleInteractionFrame: (kind: 'segment', callback: () => void) => unknown;
  dispatchInteraction: (kind: 'segment', event: object) => boolean;
  currentInteractionKind: () => string;
  enterRenderMode: (label: string) => void;
  resetView: () => unknown;
  persistNow: () => Promise<boolean>;
  rebuild: () => void;
  refreshElevation: () => void;
  captureHistory: () => unknown;
  commitHistory: (labelZh: string, labelEn: string, before: unknown) => void;
}

/** Owns itinerary segmentation DOM, Leaflet layers, prompts, and interaction effects. */
export function createSegmentRuntime<TTrail extends SegmentTrail>(
  dependencies: SegmentRuntimeDependencies<TTrail>,
): SegmentRuntime<TTrail> {
  const {
    document, leaflet:L, map, dialogs, context, trackSnap, dayPalette, interactionMarkerHitSize,
    language, formatCoordinates, markRevision, notify, beginInteraction, cancelInteraction,
    setInteractionPhase, scheduleInteractionFrame, dispatchInteraction, currentInteractionKind,
    enterRenderMode, resetView, persistNow, rebuild, refreshElevation, captureHistory, commitHistory,
  } = dependencies;
  const controller = createSegmentController(context, {markRevision});
  const state = controller.state;
  const layer = L.layerGroup().addTo(map);
  const isZh = (): boolean => language() === 'zh';
  const text = (zh: string, en: string): string => isZh() ? zh : en;
  let exitPrompt: Promise<boolean> | null = null;

  const required = <T extends HTMLElement>(id: string): T => {
    const element = document.getElementById(id);
    if(!element) throw new Error(`Segment runtime requires #${id}`);
    return element as T;
  };
  const panel = required<HTMLElement>('segment-panel');
  const hint = required<HTMLElement>('segment-hint');
  const list = required<HTMLElement>('segment-list');
  const dirtyIndicator = required<HTMLElement>('segment-dirty-indicator');
  const closeButton = required<HTMLButtonElement>('segment-close');
  const exitButton = required<HTMLButtonElement>('segment-exit');
  const restoreButton = required<HTMLButtonElement>('segment-restore');
  const applyButton = required<HTMLButtonElement>('segment-apply');

  const primaryTrail = (): TTrail | null =>
    context.stateSelectors.primaryTrail(context.projectSelectors.trails());

  function updateDirtyIndicator(): void {
    dirtyIndicator.hidden = !controller.isDirty();
    dirtyIndicator.textContent = text('存在未应用修改', 'Unapplied changes');
  }

  function pointFromHit(hit: TrackSnapHit<TTrail>): TrackIndexPoint {
    return {
      idx:hit.idx,
      lat:hit.point[0],
      lng:hit.point[1],
      elev:hit.point[2] || 0,
      km:hit.point[3] || 0,
    };
  }

  function insertPoint(point: TrackIndexPoint | null): boolean {
    const result = controller.insertPoint(point);
    if(!result.ok) {
      if(result.reason === 'duplicate') {
        notify(text('该点已选中，请选另一个位置', 'That point is already selected'), 'error');
      } else if(result.reason !== 'empty') {
        notify(text('请点击现有行程范围内的未占用位置', 'Choose an unused point inside the itinerary range'), 'error');
      }
      return false;
    }
    update();
    return true;
  }

  function deleteDay(dayNo: number): boolean {
    const result = controller.deleteDay(dayNo);
    if(!result.ok) {
      if(result.reason === 'min-days') notify(text('至少保留 1 天行程', 'Keep at least one itinerary day'), 'info');
      return false;
    }
    update();
    return true;
  }

  function restore(): boolean {
    if(!controller.restore()) return false;
    update();
    return true;
  }

  function segmentStats(startIndex: number, endIndex: number) {
    const trail = primaryTrail();
    if(!trail?.track.length) return null;
    return computeSegmentStats(trail.track, startIndex, endIndex);
  }

  function createDayCard(day: number): HTMLElement | null {
    const start = state.points[day - 1];
    const end = state.points[day];
    const stats = segmentStats(start.idx, end.idx);
    if(!stats) return null;
    const card = document.createElement('article');
    card.className = 'segment-day-card';
    card.style.setProperty('--day-color', dayPalette[(day - 1) % dayPalette.length]);

    const heading = document.createElement('header');
    heading.className = 'segment-day-head';
    const title = document.createElement('b');
    title.className = 'segment-day-title';
    title.textContent = `D${day}`;
    const summary = document.createElement('span');
    summary.className = 'segment-day-stats';
    summary.textContent = `${stats.kmText} km · ↑${stats.asc} · ↓${stats.desc} · ${text('高', 'H ')}${stats.maxE} · ${text('低', 'L ')}${stats.minE}`;
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'seg-day-delete';
    deleteButton.dataset.day = String(day);
    deleteButton.textContent = text('删除', 'Delete');
    deleteButton.title = text(`删除 D${day}`, `Delete D${day}`);
    deleteButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      deleteDay(day);
    });
    heading.append(title, summary, deleteButton);

    const campField = document.createElement('label');
    campField.className = 'segment-field segment-field--input';
    const campLabel = document.createElement('span');
    campLabel.textContent = text('营地名', 'Camp');
    const campInput = document.createElement('input');
    campInput.className = 'seg-camp-name';
    campInput.dataset.day = String(day);
    campInput.placeholder = text('选填，如“仲达牧场”', 'Optional camp name');
    campInput.value = state.campEdits[day]?.name || '';
    campInput.addEventListener('input', () => {
      controller.updateCamp(day, {name:campInput.value});
      updateDirtyIndicator();
    });
    campField.append(campLabel, campInput);

    const elevationField = document.createElement('div');
    elevationField.className = 'segment-field segment-field--elevation';
    const elevationLabel = document.createElement('span');
    elevationLabel.textContent = text('营地海拔', 'Camp elevation');
    const elevation = document.createElement('output');
    elevation.className = 'seg-camp-elev';
    elevation.textContent = `${Math.round(end.elev)} m`;
    const coordinates = document.createElement('span');
    coordinates.className = 'segment-point-coordinate';
    coordinates.textContent = formatCoordinates([end.lat, end.lng]);
    elevationField.append(elevationLabel, elevation, coordinates);
    card.append(heading, campField, elevationField);
    return card;
  }

  function renderList(): void {
    list.replaceChildren();
    if(state.points.length < 2) {
      const empty = document.createElement('p');
      empty.className = 'segment-empty-state';
      empty.textContent = text('尚未选中任何一天', 'No itinerary day selected');
      list.append(empty);
      return;
    }
    for(let day = 1; day < state.points.length; day += 1) {
      const card = createDayCard(day);
      if(card) list.append(card);
    }
  }

  function redraw(): void {
    layer.clearLayers();
    const trail = primaryTrail();
    if(!trail?.track.length) return;
    const model = buildSegmentLayerModel(
      trail.track,
      state.points,
      dayPalette,
      900,
      Array.isArray(trail.track_breaks) ? trail.track_breaks : [],
    );
    model.segments.forEach(segment => L.polyline(segment.latLngs, segment.lineStyle).addTo(layer));
    model.markers.forEach(markerModel => {
      const size = Math.max(markerModel.iconSize[0], interactionMarkerHitSize);
      const icon = L.divIcon({
        className:'segment-marker',
        html:`<div class="segment-boundary-dot" style="--segment-point-color:${markerModel.color}">${markerModel.label}</div>`,
        iconSize:[size, size],
        iconAnchor:[size / 2, size / 2],
      });
      const marker = L.marker(
        [markerModel.lat, markerModel.lng],
        {...markerModel.markerOptions, icon},
      ).addTo(layer);
      marker._segIdx = markerModel.pointIndex;
      if(!markerModel.isBoundary) return;
      const snapper = trackSnap.createDragSnapper(marker, {
        scheduleFrame:callback => scheduleInteractionFrame('segment', callback) as never,
      });
      marker.on('dragstart', () => {
        dispatchInteraction('segment', {type:'drag-start', boundaryIndex:marker._segIdx});
      });
      marker.on('drag', (event: {target: any}) => snapper.schedule(event));
      marker.on('dragend', (event: {target: any}) => {
        const hit = snapper.resolve(event.target.getLatLng());
        snapper.cancel();
        dispatchInteraction('segment', {type:'drag-end', boundaryIndex:marker._segIdx, hit});
      });
    });
  }

  function update(): void {
    const dayCount = Math.max(1, state.points.length - 1);
    hint.replaceChildren();
    const summary = document.createElement('span');
    summary.className = 'segment-hint-summary';
    summary.textContent = text(`已规划 ${dayCount} 天`, `${dayCount} day${dayCount === 1 ? '' : 's'} planned`);
    const detail = document.createElement('small');
    detail.textContent = text(
      '点击轨迹插入边界，拖动黄色分段点调整；可在列表中删除指定日期。',
      'Click the trail to insert a boundary, drag yellow points to adjust, or delete a specific day below.',
    );
    hint.append(summary, detail);
    renderList();
    redraw();
    updateDirtyIndicator();
  }

  function handleTap(event: SegmentTapEvent, session: InteractionSessionLike): void {
    if(state._justDragged || (event.source !== 'fast' && state._fastTapUntil > Date.now())) return;
    const commitHit = (hit: TrackSnapHit<TTrail> | null): void => {
      if(!session.isCurrent()) return;
      if(!hit) {
        notify(text('请点击主轨迹附近（200m 内）', 'Click within 200 m of the primary trail'), 'error');
        return;
      }
      insertPoint(pointFromHit(hit));
    };
    if(event.source !== 'fast') {
      commitHit(trackSnap.nearestPrimary(event.latlng.lat, event.latlng.lng));
      return;
    }
    const temporary = L.circleMarker([event.latlng.lat, event.latlng.lng], {
      radius:6, color:'#fff', weight:2, fillColor:'#fbbf24', fillOpacity:0.7,
    }).addTo(layer);
    session.frame(() => {
      temporary.remove();
      commitHit(trackSnap.nearestPrimary(event.latlng.lat, event.latlng.lng));
    });
  }

  function handleInteractionEvent(event: object, session: InteractionSessionLike): void {
    const interaction = event as {
      type?: SegmentTapEvent['type'] | SegmentDragEvent['type'];
      source?: SegmentTapEvent['source'];
      latlng?: SegmentTapEvent['latlng'];
      boundaryIndex?: SegmentDragEvent['boundaryIndex'];
      hit?: TrackSnapHit<TTrail> | null;
    };
    if(interaction.type === 'tap' && interaction.latlng) {
      handleTap(interaction as SegmentTapEvent, session);
      return;
    }
    if(interaction.type === 'drag-start') {
      controller.beginDrag();
      session.setPhase('dragging');
      return;
    }
    if(interaction.type !== 'drag-end' || !Number.isInteger(interaction.boundaryIndex)) return;
    session.setPhase('editing');
    session.delay(200, () => controller.endDrag());
    const hit = interaction.hit || null;
    if(!hit) {
      notify(text('必须拖到主轨迹附近（200m 内）', 'Drag within 200 m of the primary trail'), 'error');
      redraw();
      return;
    }
    const move = controller.moveBoundary(Number(interaction.boundaryIndex), pointFromHit(hit));
    if(!move.ok) {
      const messages = {
        duplicate:text('该位置已被占用，请选另一处', 'That position is already occupied'),
        'before-previous':text('分段点必须在上一边界之后', 'The boundary must remain after the previous one'),
        'after-next':text('分段点必须在下一边界之前', 'The boundary must remain before the next one'),
      } as const;
      notify(messages[move.reason as keyof typeof messages]
        || text('该分段点不能移动到此处', 'The boundary cannot move there'), 'error');
      redraw();
      return;
    }
    update();
  }

  function enter(): boolean {
    const trail = primaryTrail();
    if(!trail?.track.length) {
      notify(text('请先设置主轨迹', 'Set a primary trail first'), 'error');
      return false;
    }
    if(!controller.enter(trail.id)) return false;
    const session = beginInteraction('segment', 'editing', trail, {
      onEvent:handleInteractionEvent,
      onCancel:options => exit(options),
    });
    if(!session) {
      controller.exit();
      return false;
    }
    enterRenderMode(text('分段', 'Segment'));
    layer.clearLayers();
    panel.hidden = false;
    panel.style.display = 'flex';
    map.getContainer().style.cursor = 'crosshair';
    map.getContainer().classList.add('measure-active');
    void resetView();
    update();
    return true;
  }

  function exit(options: {fromManager?: boolean; reason?: string} = {}): void {
    if(!options.fromManager && cancelInteraction('segment', options.reason || 'cancelled')) return;
    controller.exit();
    layer.clearLayers();
    panel.hidden = true;
    panel.style.display = 'none';
    map.getContainer().style.cursor = '';
    map.getContainer().classList.remove('measure-active');
    updateDirtyIndicator();
  }

  function requestExit(reason = 'cancelled'): Promise<boolean> {
    if(!state.active && currentInteractionKind() !== 'segment') return Promise.resolve(true);
    const finish = (): boolean => {
      if(cancelInteraction('segment', reason)) return true;
      exit({fromManager:true, reason});
      return true;
    };
    if(!controller.isDirty()) return Promise.resolve(finish());
    if(exitPrompt) return exitPrompt;
    exitPrompt = dialogs.confirm({
      title:text('存在未应用修改', 'Unapplied segment changes'),
      message:text(
        '当前分段边界或营地信息尚未应用。确定放弃这些修改并退出吗？',
        'Segment boundaries or camp details have not been applied. Discard these changes and exit?',
      ),
      danger:true,
      confirmLabel:text('放弃并退出', 'Discard and exit'),
      cancelLabel:text('继续编辑', 'Keep editing'),
    }).then(confirmed => confirmed ? finish() : false).finally(() => { exitPrompt = null; });
    return exitPrompt;
  }

  async function apply(): Promise<boolean> {
    if(state.points.length < 2) {
      notify(text('至少需要 2 个分段点（1 天）', 'At least two boundary points are required'), 'error');
      return false;
    }
    if(!setInteractionPhase('segment', 'committing')) return false;
    const before = captureHistory();
    const result = controller.apply();
    if(!result) {
      setInteractionPhase('segment', 'editing');
      notify(text('分段状态已失效，请重新进入分段模式', 'Segment state expired; reopen segment mode'), 'error');
      return false;
    }
    const saved = await persistNow();
    notify(saved
      ? text(`已应用并保存 ${result.dayCount} 天分段`, `Applied and saved ${result.dayCount} itinerary days`)
      : text('已应用分段，但浏览器缓存保存失败', 'Segments were applied, but browser storage failed'),
    saved ? 'info' : 'error');
    rebuild();
    refreshElevation();
    commitHistory('应用行程分段', 'Apply itinerary segments', before);
    exit({reason:'committed'});
    return saved;
  }

  closeButton.addEventListener('click', () => { void requestExit('close'); });
  exitButton.addEventListener('click', () => { void requestExit('exit'); });
  restoreButton.addEventListener('click', restore);
  applyButton.addEventListener('click', () => { void apply(); });
  return Object.freeze({controller, state, layer, enter, exit, requestExit, restore, insertPoint, deleteDay, apply, update, redraw});
}
