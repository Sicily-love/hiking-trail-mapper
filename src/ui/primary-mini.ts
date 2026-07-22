export interface PrimaryMiniTrail {
  name: string;
  stats: {distance_km: number; ascent_m: number; descent_m: number};
}

export interface PrimaryMiniStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PrimaryMiniControllerDependencies {
  element: HTMLElement;
  mapElement: HTMLElement;
  storage?: PrimaryMiniStorage | null;
  storageKey?: string;
  getTrail: () => PrimaryMiniTrail | null;
  translate: (key: string) => string;
  escapeText: (value: unknown) => string;
  dragHint: () => string;
  openSidebar: () => void;
  requestFrame?: (callback: () => void) => number;
  schedule?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  cancelFrame?: (handle: number) => void;
  cancelSchedule?: (handle: ReturnType<typeof setTimeout>) => void;
}

export interface PrimaryMiniController {
  readonly storageKey: string;
  render(): boolean;
  clamp(left: number, top: number): {left: number; top: number};
  applyPosition(): void;
  schedulePositionApply(): void;
  savePosition(): void;
  destroy(): void;
}

/** Owns the collapsed-sidebar primary card, including drag persistence and map bounds. */
export function createPrimaryMiniController(
  dependencies: PrimaryMiniControllerDependencies,
): PrimaryMiniController {
  const {element, mapElement} = dependencies;
  const storageKey = dependencies.storageKey ?? 'hiking_primary_mini_pos';
  const requestFrame = dependencies.requestFrame ?? (callback => requestAnimationFrame(callback));
  const schedule = dependencies.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const cancelFrame = dependencies.cancelFrame ?? (handle => cancelAnimationFrame(handle));
  const cancelSchedule = dependencies.cancelSchedule ?? (handle => clearTimeout(handle));
  const scheduledFrames = new Set<number>();
  const scheduledTimers = new Set<ReturnType<typeof setTimeout>>();
  let drag: null | {id: number; x: number; y: number; left: number; top: number; moved: boolean} = null;
  let destroyed = false;

  const clamp = (left: number, top: number): {left: number; top: number} => {
    const mapRect = mapElement.getBoundingClientRect();
    const miniRect = element.getBoundingClientRect();
    const margin = 8;
    return {
      left:Math.min(Math.max(margin, left), Math.max(margin, mapRect.width - (miniRect.width || 240) - margin)),
      top:Math.min(Math.max(margin, top), Math.max(margin, mapRect.height - (miniRect.height || 92) - margin)),
    };
  };
  const setPosition = (position: {left: number; top: number}): void => {
    element.style.left = `${position.left}px`;
    element.style.top = `${position.top}px`;
    element.style.right = 'auto';
  };
  const applyPosition = (): void => {
    try {
      const raw = dependencies.storage?.getItem(storageKey);
      if(!raw) return;
      const position = JSON.parse(raw) as {left?: unknown; top?: unknown};
      if(!Number.isFinite(position.left) || !Number.isFinite(position.top)) return;
      setPosition(clamp(Number(position.left), Number(position.top)));
    } catch {
      // A corrupt local position must not hide the card.
    }
  };
  const savePosition = (): void => {
    const mapRect = mapElement.getBoundingClientRect();
    const miniRect = element.getBoundingClientRect();
    try {
      dependencies.storage?.setItem(storageKey, JSON.stringify({
        left:Math.round(miniRect.left - mapRect.left),
        top:Math.round(miniRect.top - mapRect.top),
      }));
    } catch {
      // Dragging remains useful without persistent storage.
    }
  };
  const schedulePositionApply = (): void => {
    let frame = 0;
    frame = requestFrame(() => {
      scheduledFrames.delete(frame);
      applyPosition();
    });
    scheduledFrames.add(frame);
    for(const delay of [280, 360]) {
      let timer: ReturnType<typeof setTimeout>;
      timer = schedule(() => {
        scheduledTimers.delete(timer);
        applyPosition();
      }, delay);
      scheduledTimers.add(timer);
    }
  };
  const render = (): boolean => {
    const trail = dependencies.getTrail();
    if(!trail) {
      element.replaceChildren();
      element.style.display = 'none';
      return false;
    }
    const t = dependencies.translate;
    element.title = `${t('mini.openSidebar')} / ${dependencies.dragHint()}`;
    element.innerHTML = `
      <div class="primary-mini__eyebrow">${t('mini.primary')}</div>
      <div class="primary-mini__name">${dependencies.escapeText(trail.name)}</div>
      <div class="primary-mini__stats">
        <div><b>${trail.stats.distance_km}<small> km</small></b><span>${t('mini.distance')}</span></div>
        <div><b>${trail.stats.ascent_m}<small> m</small></b><span>↑ ${t('mini.ascent')}</span></div>
        <div><b>${trail.stats.descent_m}<small> m</small></b><span>↓ ${t('mini.descent')}</span></div>
      </div>
    `;
    applyPosition();
    return true;
  };

  const onPointerDown = (event: PointerEvent): void => {
    if(event.button !== 0) return;
    const mapRect = mapElement.getBoundingClientRect();
    const miniRect = element.getBoundingClientRect();
    drag = {
      id:event.pointerId,
      x:event.clientX,
      y:event.clientY,
      left:miniRect.left - mapRect.left,
      top:miniRect.top - mapRect.top,
      moved:false,
    };
    try { element.setPointerCapture(event.pointerId); } catch {}
    event.preventDefault();
    event.stopPropagation();
  };
  const onPointerMove = (event: PointerEvent): void => {
    if(!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if(!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    element.classList.add('dragging');
    setPosition(clamp(drag.left + dx, drag.top + dy));
    event.preventDefault();
    event.stopPropagation();
  };
  const finish = (event: PointerEvent, cancelled: boolean): void => {
    if(!drag || event.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    element.classList.remove('dragging');
    try { element.releasePointerCapture(event.pointerId); } catch {}
    event.preventDefault();
    event.stopPropagation();
    if(moved) savePosition();
    else if(!cancelled) dependencies.openSidebar();
  };
  const onPointerUp = (event: PointerEvent): void => finish(event, false);
  const onPointerCancel = (event: PointerEvent): void => finish(event, true);
  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerCancel);

  return Object.freeze({
    storageKey,
    render,
    clamp,
    applyPosition,
    schedulePositionApply,
    savePosition,
    destroy() {
      if(destroyed) return;
      destroyed = true;
      for(const handle of scheduledFrames) cancelFrame(handle);
      for(const handle of scheduledTimers) cancelSchedule(handle);
      scheduledFrames.clear();
      scheduledTimers.clear();
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerCancel);
    },
  });
}
