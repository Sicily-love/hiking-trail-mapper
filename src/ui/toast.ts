export type ToastTone = 'info' | 'error';

export interface ToastViewport {
  innerWidth: number;
  innerHeight: number;
}

export interface ToastControllerOptions {
  document: Document;
  viewport: ToastViewport;
  requestFrame?: (callback: FrameRequestCallback) => number;
  setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (handle: ReturnType<typeof setTimeout>) => void;
}

export interface ToastController {
  show(message: string, tone?: ToastTone, durationMs?: number): HTMLElement;
  hide(): void;
  dispose(): void;
}

/** Owns semantic toast creation, live-region behavior, and workbench placement. */
export function createToastController(options: ToastControllerOptions): ToastController {
  const requestFrame = options.requestFrame || (callback => requestAnimationFrame(callback));
  const setTimer = options.setTimer || ((callback, delayMs) => setTimeout(callback, delayMs));
  const clearTimer = options.clearTimer || (handle => clearTimeout(handle));
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const element = () => {
    let toast = options.document.getElementById('toast');
    if(!toast) {
      toast = options.document.createElement('div');
      toast.id = 'toast';
      toast.setAttribute('aria-atomic', 'true');
      options.document.body.appendChild(toast);
    }
    return toast;
  };

  const place = (toast: HTMLElement) => {
    const mapStage = options.document.querySelector('.studio-map-stage');
    const bottomDock = options.document.querySelector('.studio-bottom-dock');
    const stageRect = mapStage?.getBoundingClientRect();
    const dockRect = bottomDock?.getBoundingClientRect();
    const centerX = stageRect?.width
      ? Math.min(options.viewport.innerWidth - 12, Math.max(12, stageRect.left + stageRect.width / 2))
      : options.viewport.innerWidth / 2;
    const bottom = dockRect?.height
      ? Math.max(16, options.viewport.innerHeight - dockRect.top + 12)
      : 24;
    toast.style.setProperty('--toast-left', `${centerX}px`);
    toast.style.setProperty('--toast-bottom', `${bottom}px`);
  };

  const hide = () => {
    options.document.getElementById('toast')?.classList.remove('is-visible');
  };

  const show = (message: string, tone: ToastTone = 'info', durationMs = 2400) => {
    if(disposed) throw new Error('ToastController is disposed');
    const toast = element();
    toast.textContent = message;
    toast.dataset.tone = tone;
    toast.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', tone === 'error' ? 'assertive' : 'polite');
    place(toast);
    toast.classList.add('is-visible');
    requestFrame(() => place(toast));
    if(timer !== null) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      hide();
    }, durationMs);
    return toast;
  };

  const dispose = () => {
    if(disposed) return;
    disposed = true;
    if(timer !== null) clearTimer(timer);
    timer = null;
    hide();
  };

  return Object.freeze({show, hide, dispose});
}
