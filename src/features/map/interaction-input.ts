export type MapInputInteractionKind = 'measure' | 'segment' | 'waypoint' | 'escape';

export interface MapInteractionInput {
  destroy(): void;
}

interface PointerStart {
  x: number;
  y: number;
  time: number;
  pointerType: 'mouse' | 'touch' | 'pen';
  pointerId: number | null;
}

/** Owns fast pointer taps and the single Leaflet click fallback for map interaction modes. */
export function createMapInteractionInput(dependencies: {
  window: Window;
  map: any;
  currentKind: () => string;
  dispatch: (kind: MapInputInteractionKind, event: object) => boolean;
  suppressFastTap: (kind: 'measure' | 'segment', until: number) => void;
  isPointerTap: (input: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    elapsedMs: number;
    pointerType: 'mouse' | 'touch' | 'pen';
  }) => boolean;
}): MapInteractionInput {
  const {window, map, currentKind, dispatch, suppressFastTap, isPointerTap} = dependencies;
  const container = map.getContainer() as HTMLElement;
  let pointerStart: PointerStart | null = null;
  const removers: Array<() => void> = [];
  const now = (): number => window.performance?.now?.() ?? Date.now();

  const isControlTarget = (target: EventTarget | null): boolean => {
    const element = target && typeof (target as Element).closest === 'function' ? target as Element : null;
    return Boolean(element?.closest(
      '.leaflet-marker-icon, .leaflet-control, #segment-panel, #measure-panel, #map-toolbar, #sidebar',
    ));
  };

  const begin = (
    x: number,
    y: number,
    target: EventTarget | null,
    pointerType: 'mouse' | 'touch' | 'pen',
    pointerId: number | null = null,
  ): void => {
    if(!['measure', 'segment'].includes(currentKind()) || isControlTarget(target)) {
      pointerStart = null;
      return;
    }
    pointerStart = {x, y, time:now(), pointerType, pointerId};
  };

  const finish = (
    x: number,
    y: number,
    target: EventTarget | null,
    pointerType: 'mouse' | 'touch' | 'pen',
    pointerId: number | null = null,
  ): void => {
    const start = pointerStart;
    pointerStart = null;
    if(!start || isControlTarget(target)) return;
    if(pointerId != null && start.pointerId != null && pointerId !== start.pointerId) return;
    if(!isPointerTap({
      startX:start.x,
      startY:start.y,
      endX:x,
      endY:y,
      elapsedMs:now() - start.time,
      pointerType:pointerType || start.pointerType || 'mouse',
    })) return;
    const kind = currentKind();
    if(kind !== 'measure' && kind !== 'segment') return;
    const rect = container.getBoundingClientRect();
    const latlng = map.containerPointToLatLng([x - rect.left, y - rect.top]);
    if(!dispatch(kind, {type:'tap', source:'fast', latlng})) return;
    suppressFastTap(kind, Date.now() + 350);
  };

  const listen = <K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void => {
    container.addEventListener(type, listener as EventListener, options);
    removers.push(() => container.removeEventListener(type, listener as EventListener, options));
  };

  if('PointerEvent' in window) {
    listen('pointerdown', event => {
      if(!['mouse', 'touch', 'pen'].includes(event.pointerType)) return;
      begin(event.clientX, event.clientY, event.target, event.pointerType as PointerStart['pointerType'], event.pointerId);
    }, {capture:true, passive:true});
    listen('pointerup', event => {
      finish(event.clientX, event.clientY, event.target, event.pointerType as PointerStart['pointerType'], event.pointerId);
    }, {capture:true, passive:true});
    listen('pointercancel', () => { pointerStart = null; }, {capture:true, passive:true});
  } else {
    listen('mousedown', event => begin(event.clientX, event.clientY, event.target, 'mouse'), {capture:true});
    listen('mouseup', event => finish(event.clientX, event.clientY, event.target, 'mouse'), {capture:true});
    listen('touchstart', event => {
      const touch = event.touches[0];
      if(event.touches.length === 1 && touch) {
        begin(touch.clientX, touch.clientY, event.target, 'touch', touch.identifier);
      }
    }, {capture:true, passive:true});
    listen('touchend', event => {
      const touch = event.changedTouches[0];
      if(event.changedTouches.length === 1 && touch) {
        finish(touch.clientX, touch.clientY, event.target, 'touch', touch.identifier);
      }
    }, {capture:true, passive:true});
  }

  const onMapClick = (event: {latlng: {lat: number; lng: number}}): void => {
    const kind = currentKind();
    if(!['measure', 'segment', 'waypoint', 'escape'].includes(kind)) return;
    dispatch(kind as MapInputInteractionKind, {type:'tap', source:'leaflet', latlng:event.latlng});
  };
  map.on('click', onMapClick);

  return Object.freeze({
    destroy(): void {
      pointerStart = null;
      removers.splice(0).forEach(remove => remove());
      map.off?.('click', onMapClick);
    },
  });
}
