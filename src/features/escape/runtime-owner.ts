import type { RuntimeContext } from '../../app/runtime/context.ts';
import type { InteractionSessionLike } from '../../app/runtime/interaction-owner.ts';
import { escapeRouteDays } from '../../core/escape.ts';
import {
  createEscapeController,
  type EscapeController,
  type EscapeInteractionState,
  type EscapeTrail,
} from './controller.ts';

interface EscapeTapEvent {
  type: 'tap';
  latlng: {lat: number; lng: number};
}

interface EscapeRuntimeDependencies {
  document: Document;
  leaflet: any;
  map: any;
  displayLayer: any;
  context: RuntimeContext<EscapeTrail>;
  markRevision: (trail: EscapeTrail) => unknown;
  language: () => 'zh' | 'en';
  drawTracks: () => void;
  notify: (message: string, type?: 'info' | 'error') => void;
  beginInteraction: (
    kind: 'escape',
    phase: 'select-a',
    trail: EscapeTrail,
    options: {
      onEvent: (event: object, session: InteractionSessionLike) => void;
      onCancel: (options: {fromManager: true; reason: string}) => void;
    },
  ) => InteractionSessionLike | null;
  cancelInteraction: (kind: 'escape', reason?: string) => boolean;
  setInteractionPhase: (kind: 'escape', phase: string) => boolean;
  recordEdit: <T>(labelZh: string, labelEn: string, mutation: () => T) => T;
  persist: () => void;
  renderDays: () => void;
}

export interface EscapeRuntime {
  readonly controller: EscapeController;
  readonly state: Readonly<EscapeInteractionState>;
  readonly planningLayer: any;
  enter(): boolean;
  exit(options?: {fromManager?: boolean; reason?: string}): void;
  reset(): void;
  commit(): boolean;
  showRoute(trailId: string, routeId?: string | null): void;
  clearRoute(): void;
}

/** Owns escape-route Leaflet effects, panel DOM, and interaction orchestration. */
export function createEscapeRuntime(dependencies: EscapeRuntimeDependencies): EscapeRuntime {
  const {
    document, leaflet:L, map, displayLayer, context, language, drawTracks, notify,
    beginInteraction, cancelInteraction, setInteractionPhase, recordEdit, persist, renderDays,
  } = dependencies;
  const controller = createEscapeController(context, {markRevision:dependencies.markRevision});
  const state = controller.state;
  const planningLayer = L.layerGroup().addTo(map);
  const isZh = (): boolean => language() === 'zh';

  const required = <T extends HTMLElement>(id: string): T => {
    const element = document.getElementById(id);
    if(!element) throw new Error(`Escape runtime requires #${id}`);
    return element as T;
  };

  const panel = required<HTMLElement>('addescape-panel');
  const toggleButton = required<HTMLButtonElement>('add-escape-btn');
  const closeButton = required<HTMLButtonElement>('addescape-close');
  const exitButton = required<HTMLButtonElement>('addescape-exit');
  const resetButton = required<HTMLButtonElement>('addescape-reset');
  const commitButton = required<HTMLButtonElement>('addescape-commit');
  const result = required<HTMLElement>('addescape-result');
  const hint = required<HTMLElement>('addescape-hint');
  const trailLabel = required<HTMLLabelElement>('addescape-trail-label');
  const trailSelect = required<HTMLSelectElement>('addescape-trail-select');
  const daySelect = required<HTMLElement>('addescape-day-select');
  const dayValue = required<HTMLElement>('ae-day');
  const distanceValue = required<HTMLElement>('ae-dist');
  const referenceValue = required<HTMLElement>('ae-trail');
  const ascentValue = required<HTMLElement>('ae-asc');
  const descentValue = required<HTMLElement>('ae-desc');
  const pointAValue = required<HTMLElement>('ae-eA');
  const pointBValue = required<HTMLElement>('ae-eB');
  const nameInput = required<HTMLInputElement>('addescape-name');

  const referenceTrails = (): EscapeTrail[] => {
    if(context.stateSelectors.activeGroup() == null) return [];
    return context.stateSelectors.trailsInActiveGroup(context.projectSelectors.trails())
      .filter(trail => trail.track.length > 0);
  };

  function setHint(kind: 'select' | 'selected-a' | 'preview'): void {
    hint.classList.toggle('is-success', kind !== 'select');
    hint.replaceChildren();
    const append = (text: string, className = '') => {
      const span = document.createElement('span');
      span.textContent = text;
      if(className) span.className = className;
      hint.append(span);
    };
    if(kind === 'selected-a') {
      append(isZh() ? '起点 A 已选。继续点击 ' : 'Point A selected. Click ');
      append(isZh() ? '终点 B' : 'point B', 'escape-hint-point escape-hint-point--b');
      append(isZh() ? '。' : '.');
      return;
    }
    if(kind === 'preview') {
      append(isZh() ? '路线已预览。确认信息后保存。' : 'Route preview ready. Review it, then save.');
      return;
    }
    append(isZh() ? '在所选依据轨迹上点击 ' : 'Click ');
    append(isZh() ? '起点 A' : 'point A', 'escape-hint-point escape-hint-point--a');
    append(isZh() ? '，再点击 ' : ', then ');
    append(isZh() ? '终点 B' : 'point B', 'escape-hint-point escape-hint-point--b');
    append(isZh() ? '。' : ' on the selected reference trail.');
    const detail = document.createElement('small');
    detail.className = 'escape-hint-detail';
    detail.textContent = isZh() ? 'A/B 只吸附到当前依据轨迹。' : 'A/B snap only to the selected trail.';
    hint.append(detail);
  }

  function refreshTrailSelector(): void {
    trailLabel.textContent = isZh() ? '依据轨迹' : 'Reference trail';
    const selectedId = state.referenceTrailId || context.stateSelectors.primaryTrailId() || '';
    trailSelect.replaceChildren();
    for(const trail of referenceTrails()) {
      const option = document.createElement('option');
      option.value = trail.id;
      option.textContent = trail.name + (trail.id === context.stateSelectors.primaryTrailId()
        ? (isZh() ? '（主轨迹）' : ' (Primary)')
        : '');
      option.selected = trail.id === selectedId;
      trailSelect.append(option);
    }
    trailSelect.disabled = trailSelect.options.length < 2;
  }

  function refreshDaySelect(selectedDays: number[] = []): number[] {
    const days = controller.availableDays();
    const requested = selectedDays.map(Number);
    const nextDays = days.filter(day => requested.includes(day));
    if(!nextDays.length && days.length) nextDays.push(days[0]);
    daySelect.replaceChildren();
    for(const day of days) {
      const label = document.createElement('label');
      label.className = 'escape-day-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = String(day);
      input.checked = nextDays.includes(day);
      label.append(input, document.createTextNode(`D${day}`));
      daySelect.append(label);
    }
    if(nextDays.length) controller.setDays(nextDays);
    dayValue.textContent = nextDays.length ? nextDays.map(day => `D${day}`).join('、') : '-';
    return nextDays;
  }

  function drawPoint(point: {lat: number; lng: number}, label: 'A' | 'B', color: string): void {
    L.circleMarker([point.lat, point.lng], {
      radius:8, color:'#fff', weight:2, fillColor:color, fillOpacity:1,
    }).bindTooltip(
      label === 'A' ? (isZh() ? 'A（起点）' : 'A (Start)') : (isZh() ? 'B（终点）' : 'B (End)'),
      {permanent:true, direction:'top', offset:[0,-8], className:'measure-tip'},
    ).addTo(planningLayer);
  }

  function compute(): boolean {
    const computed = controller.compute();
    if(!computed.ok) {
      if(computed.reason === 'same-point') {
        notify(isZh() ? '两点太近，请重新选择' : 'The points are too close; select them again', 'error');
      }
      return false;
    }
    const {preview} = computed;
    const {route, pointA, pointB} = preview;
    if(!route._anchor || !route.line.length) return false;

    planningLayer.clearLayers();
    drawPoint(pointA, 'A', '#22c55e');
    drawPoint(pointB, 'B', '#ef4444');
    L.polyline(route.line, {color:'#f87171', weight:5, opacity:0.9, dashArray:'10,7'})
      .addTo(planningLayer);
    map.flyToBounds(L.latLngBounds(route.line).pad(0.2), {duration:0.6});

    distanceValue.textContent = `${route.distance_km} km`;
    referenceValue.textContent = route._anchor.trailName;
    refreshDaySelect(escapeRouteDays(route));
    ascentValue.textContent = `${preview.ascentM} m`;
    descentValue.textContent = `${preview.descentM} m`;
    pointAValue.textContent = `${Math.round(pointA.elev)} m`;
    pointBValue.textContent = `${Math.round(pointB.elev)} m`;
    nameInput.value = route.name;
    result.hidden = false;
    result.style.display = 'block';
    setHint('preview');
    setInteractionPhase('escape', 'preview');
    return true;
  }

  function handleInteractionEvent(event: object, session: InteractionSessionLike): void {
    const tap = event as Partial<EscapeTapEvent>;
    if(tap.type !== 'tap' || !tap.latlng) return;
    const hit = controller.nearestPoint(tap.latlng.lat, tap.latlng.lng);
    if(!hit) {
      notify(
        isZh() ? '请点击所选依据轨迹附近（2 km 内）' : 'Click within 2 km of the selected reference trail',
        'error',
      );
      return;
    }
    if(session.phase === 'select-a') {
      controller.selectA(hit);
      planningLayer.clearLayers();
      drawPoint(hit, 'A', '#22c55e');
      result.hidden = true;
      result.style.display = 'none';
      setHint('selected-a');
      session.setPhase('select-b');
      return;
    }
    if(session.phase === 'preview') session.setPhase('select-b');
    if(session.phase !== 'select-b') return;
    controller.selectB(hit);
    compute();
  }

  function enter(): boolean {
    const main = context.stateSelectors.primaryTrail(context.projectSelectors.trails());
    if(!main?.track.length) {
      notify(isZh() ? '请先设置主轨迹' : 'Set a primary trail first', 'error');
      return false;
    }
    if(!controller.enter(main.id)) return false;
    const session = beginInteraction('escape', 'select-a', main, {
      onEvent:handleInteractionEvent,
      onCancel:options => exit(options),
    });
    if(!session) {
      controller.exit();
      return false;
    }
    refreshTrailSelector();
    toggleButton.classList.add('on');
    planningLayer.clearLayers();
    panel.hidden = false;
    panel.style.display = 'block';
    result.hidden = true;
    result.style.display = 'none';
    dayValue.textContent = '-';
    daySelect.replaceChildren();
    setHint('select');
    map.getContainer().style.cursor = 'crosshair';
    drawTracks();
    return true;
  }

  function exit(options: {fromManager?: boolean; reason?: string} = {}): void {
    if(!options.fromManager && cancelInteraction('escape', options.reason || 'cancelled')) return;
    controller.exit();
    toggleButton.classList.remove('on');
    planningLayer.clearLayers();
    panel.hidden = true;
    panel.style.display = 'none';
    map.getContainer().style.cursor = '';
    drawTracks();
  }

  function reset(): void {
    controller.reset();
    planningLayer.clearLayers();
    result.hidden = true;
    result.style.display = 'none';
    dayValue.textContent = '-';
    setHint('select');
    setInteractionPhase('escape', 'select-a');
  }

  function commit(): boolean {
    if(!state._pending || !setInteractionPhase('escape', 'committing')) return false;
    const route = recordEdit(
      '添加下撤路线',
      'Add escape route',
      () => controller.commit(nameInput.value.trim()),
    );
    if(!route) {
      setInteractionPhase('escape', 'preview');
      notify(isZh() ? '下撤状态已失效，请重新选择' : 'Escape state expired; select the route again', 'error');
      return false;
    }
    persist();
    renderDays();
    notify(isZh() ? `下撤路线“${route.name}”已保存` : `Escape route “${route.name}” saved`);
    exit({reason:'committed'});
    return true;
  }

  function showRoute(trailId: string, routeId?: string | null): void {
    displayLayer.clearLayers();
    const route = routeId ? controller.selectDisplayedRoute(trailId, routeId) : null;
    if(!routeId) controller.clearDisplayedRoute();
    drawTracks();
    if(!route) return;
    const line = L.polyline(route.line, {
      color:'#ff3030', weight:5.5, opacity:0.95, dashArray:'10,8', lineCap:'round',
    }).addTo(displayLayer);
    if(L.polylineDecorator && L.Symbol?.arrowHead) {
      L.polylineDecorator(line, {
        patterns:[{
          offset:'5%', repeat:'10%',
          symbol:L.Symbol.arrowHead({pixelSize:10, polygon:false, pathOptions:{stroke:true, color:'#fff', weight:2.5}}),
        }],
      }).addTo(displayLayer);
    }
    map.flyToBounds(line.getBounds().pad(0.2), {duration:0.8});
  }

  function clearRoute(): void {
    displayLayer.clearLayers();
    controller.clearDisplayedRoute();
    drawTracks();
    document.querySelectorAll('.escape-item').forEach(element => element.classList.remove('active'));
  }

  trailSelect.addEventListener('change', () => {
    const trailId = trailSelect.value;
    if(!controller.setReferenceTrail(trailId)) {
      refreshTrailSelector();
      return;
    }
    if(!context.stateSelectors.activeTrailIds().has(trailId)) {
      context.stateActions.setTrailActive(trailId, true);
    }
    drawTracks();
    planningLayer.clearLayers();
    result.hidden = true;
    result.style.display = 'none';
    setHint('select');
    setInteractionPhase('escape', 'select-a');
  });
  closeButton.addEventListener('click', () => exit());
  exitButton.addEventListener('click', () => exit());
  resetButton.addEventListener('click', reset);
  commitButton.addEventListener('click', commit);
  daySelect.addEventListener('change', event => {
    const target = event.target;
    if(!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
    const inputs = [...daySelect.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    let days = inputs.filter(input => input.checked).map(input => Number(input.value));
    if(!days.length) {
      target.checked = true;
      days = [Number(target.value)];
    }
    if(controller.setDays(days)) dayValue.textContent = days.map(day => `D${day}`).join('、');
  });

  return Object.freeze({controller, state, planningLayer, enter, exit, reset, commit, showRoute, clearRoute});
}
