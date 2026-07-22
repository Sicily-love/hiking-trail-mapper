export interface ImageLightboxViewport {
  visualViewport?: {scale: number} | null;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  scrollTo(options: ScrollToOptions): void;
}

export interface ImageLightboxDependencies {
  document: Document;
  viewport: ImageLightboxViewport;
  container: HTMLElement;
  image: HTMLImageElement;
  caption: HTMLElement;
  schedule?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  cancelSchedule?: (handle: ReturnType<typeof setTimeout>) => void;
}

export interface ImageLightboxController {
  readonly isOpen: boolean;
  open(src: string, caption?: string): void;
  close(): void;
  reset(): void;
  destroy(): void;
}

interface LightboxTransformState {
  scale: number;
  tx: number;
  ty: number;
  startDist: number;
  startScale: number;
  startTx: number;
  startTy: number;
  startCx: number;
  startCy: number;
  dragging: boolean;
  pinching: boolean;
}

function safeDecode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

function touchDistance(first: Touch, second: Touch): number {
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function touchCenter(first: Touch, second: Touch): {x: number; y: number} {
  return {x:(first.clientX + second.clientX) / 2, y:(first.clientY + second.clientY) / 2};
}

/** Owns the waypoint-photo Lightbox lifecycle and every pointer/zoom listener. */
export function createImageLightboxController(
  dependencies: ImageLightboxDependencies,
): ImageLightboxController {
  const {document, viewport, container, image, caption} = dependencies;
  const schedule = dependencies.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const cancelSchedule = dependencies.cancelSchedule ?? (handle => clearTimeout(handle));
  const state: LightboxTransformState = {
    scale:1, tx:0, ty:0, startDist:0, startScale:1,
    startTx:0, startTy:0, startCx:0, startCy:0,
    dragging:false, pinching:false,
  };
  let mouseDown = false;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;
  let touchEndTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  const apply = (): void => {
    image.style.transform = `translate(${state.tx}px,${state.ty}px) scale(${state.scale})`;
  };
  const reset = (): void => {
    state.scale = 1;
    state.tx = 0;
    state.ty = 0;
    image.style.transition = 'transform 0.2s ease-out';
    apply();
    if(resetTimer != null) cancelSchedule(resetTimer);
    resetTimer = schedule(() => {
      image.style.transition = 'transform 0.15s ease-out';
      resetTimer = null;
    }, 220);
  };
  const open = (src: string, description = ''): void => {
    if(destroyed) return;
    image.src = safeDecode(src);
    caption.textContent = safeDecode(description);
    container.style.display = 'flex';
    reset();
  };
  const close = (): void => {
    if(destroyed) return;
    container.style.display = 'none';
    reset();
    try {
      if(viewport.visualViewport && Math.abs(viewport.visualViewport.scale - 1) > 0.01) {
        viewport.scrollTo({top:0, left:0, behavior:'instant'});
        document.body.style.zoom = '1';
      }
    } catch {
      // Browser viewport recovery is best effort.
    }
  };

  const onContainerClick = (event: Event): void => {
    if(event.target === image || state.dragging || state.pinching) return;
    close();
  };
  const preventSelection = (event: Event): void => event.preventDefault();
  const onContainerMouseDown = (event: Event): void => {
    if((event as MouseEvent).detail >= 2) event.preventDefault();
  };
  const onDoubleClick = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    if(state.scale > 1.05) reset();
    else { state.scale = 2.5; apply(); }
  };
  const onWheel = (event: Event): void => {
    const wheel = event as WheelEvent;
    wheel.preventDefault();
    const nextScale = Math.max(1, Math.min(6, state.scale * (1 - wheel.deltaY * 0.002)));
    state.scale = nextScale;
    if(nextScale === 1) { state.tx = 0; state.ty = 0; }
    apply();
  };
  const onImageMouseDown = (event: Event): void => {
    const mouse = event as MouseEvent;
    if(state.scale <= 1.05) return;
    mouse.preventDefault();
    mouseDown = true;
    state.startCx = mouse.clientX;
    state.startCy = mouse.clientY;
    state.startTx = state.tx;
    state.startTy = state.ty;
    image.style.transition = 'none';
  };
  const onMouseMove = (event: Event): void => {
    if(!mouseDown) return;
    const mouse = event as MouseEvent;
    state.tx = state.startTx + mouse.clientX - state.startCx;
    state.ty = state.startTy + mouse.clientY - state.startCy;
    apply();
  };
  const onMouseUp = (): void => {
    if(!mouseDown) return;
    mouseDown = false;
    image.style.transition = 'transform 0.15s ease-out';
  };
  const onTouchStart = (event: Event): void => {
    const touch = event as TouchEvent;
    touch.preventDefault();
    if(touch.touches.length === 2) {
      state.pinching = true;
      state.startDist = touchDistance(touch.touches[0], touch.touches[1]);
      state.startScale = state.scale;
      const center = touchCenter(touch.touches[0], touch.touches[1]);
      state.startCx = center.x;
      state.startCy = center.y;
      state.startTx = state.tx;
      state.startTy = state.ty;
      image.style.transition = 'none';
    } else if(touch.touches.length === 1 && state.scale > 1.05) {
      state.dragging = true;
      state.startCx = touch.touches[0].clientX;
      state.startCy = touch.touches[0].clientY;
      state.startTx = state.tx;
      state.startTy = state.ty;
      image.style.transition = 'none';
    }
  };
  const onTouchMove = (event: Event): void => {
    const touch = event as TouchEvent;
    touch.preventDefault();
    if(touch.touches.length === 2 && state.pinching) {
      const distance = touchDistance(touch.touches[0], touch.touches[1]);
      state.scale = Math.max(1, Math.min(6, state.startScale * distance / state.startDist));
      apply();
    } else if(touch.touches.length === 1 && state.dragging) {
      state.tx = state.startTx + touch.touches[0].clientX - state.startCx;
      state.ty = state.startTy + touch.touches[0].clientY - state.startCy;
      apply();
    }
  };
  const onTouchEnd = (event: Event): void => {
    const touch = event as TouchEvent;
    if(touch.touches.length !== 0) return;
    if(touchEndTimer != null) cancelSchedule(touchEndTimer);
    touchEndTimer = schedule(() => {
      state.pinching = false;
      state.dragging = false;
      touchEndTimer = null;
    }, 50);
    image.style.transition = 'transform 0.15s ease-out';
    if(state.scale < 1.02) {
      state.scale = 1;
      state.tx = 0;
      state.ty = 0;
      apply();
    }
  };

  container.addEventListener('click', onContainerClick);
  container.addEventListener('selectstart', preventSelection);
  container.addEventListener('mousedown', onContainerMouseDown);
  container.addEventListener('wheel', onWheel, {passive:false});
  container.addEventListener('touchstart', onTouchStart, {passive:false});
  container.addEventListener('touchmove', onTouchMove, {passive:false});
  container.addEventListener('touchend', onTouchEnd, {passive:false});
  for(const type of ['gesturestart','gesturechange','gestureend']) {
    container.addEventListener(type, preventSelection);
  }
  image.addEventListener('dblclick', onDoubleClick);
  image.addEventListener('mousedown', onImageMouseDown);
  viewport.addEventListener('mousemove', onMouseMove);
  viewport.addEventListener('mouseup', onMouseUp);

  return Object.freeze({
    get isOpen() { return container.style.display === 'flex'; },
    open,
    close,
    reset,
    destroy() {
      if(destroyed) return;
      destroyed = true;
      if(resetTimer != null) cancelSchedule(resetTimer);
      if(touchEndTimer != null) cancelSchedule(touchEndTimer);
      container.removeEventListener('click', onContainerClick);
      container.removeEventListener('selectstart', preventSelection);
      container.removeEventListener('mousedown', onContainerMouseDown);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      for(const type of ['gesturestart','gesturechange','gestureend']) {
        container.removeEventListener(type, preventSelection);
      }
      image.removeEventListener('dblclick', onDoubleClick);
      image.removeEventListener('mousedown', onImageMouseDown);
      viewport.removeEventListener('mousemove', onMouseMove);
      viewport.removeEventListener('mouseup', onMouseUp);
    },
  });
}
