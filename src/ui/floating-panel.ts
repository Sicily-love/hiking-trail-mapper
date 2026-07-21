export type FloatingPanelBoundary = 'viewport' | 'map' | 'measure-dock';

export interface FloatingPanelStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface FloatingPanelViewport {
  innerWidth: number;
  innerHeight: number;
}

export interface FloatingPanelBindingOptions {
  storageKey?: string;
  mode: FloatingPanelBoundary;
  handleSelector?: string;
  defaultStyle?: Partial<Record<'left' | 'right' | 'top' | 'bottom' | 'transform', string>>;
}

export type FloatingPanelElement = HTMLElement & {
  _applyFloatingPosition?: () => void;
  _resetFloatingPosition?: () => void;
};

export interface FloatingPanelPositionController {
  bind(element: FloatingPanelElement | null, options: FloatingPanelBindingOptions): void;
  apply(element: FloatingPanelElement | null, options: FloatingPanelBindingOptions): void;
  reset(element: FloatingPanelElement | null, options: FloatingPanelBindingOptions): void;
  clamp(element: FloatingPanelElement, left: number, top: number, mode: FloatingPanelBoundary): {left: number; top: number};
}

export interface FloatingPanelControllerOptions {
  document: Document;
  viewport: FloatingPanelViewport;
  storage?: FloatingPanelStorage | null;
  disablePropagation?: (element: HTMLElement) => void;
}

const STYLE_KEYS = ['left','right','top','bottom','transform'] as const;

/** Owns draggable panel positioning, persistence, and viewport boundary rules. */
export function createFloatingPanelPositionController(
  environment: FloatingPanelControllerOptions,
): FloatingPanelPositionController {
  const bound = new WeakSet<FloatingPanelElement>();

  const boundaryRect = (mode: FloatingPanelBoundary, element?: FloatingPanelElement) => {
    if(mode === 'map') {
      const mapElement = environment.document.getElementById('map');
      if(mapElement) return mapElement.getBoundingClientRect();
    }
    if(mode === 'measure-dock' && element) {
      const dock = element.closest('.studio-bottom-pane');
      if(dock) return dock.getBoundingClientRect();
    }
    return {left:0, top:0, width:environment.viewport.innerWidth, height:environment.viewport.innerHeight};
  };

  const originRect = (element: FloatingPanelElement) => {
    if(!element.offsetParent) return {left:0, top:0};
    return element.offsetParent.getBoundingClientRect();
  };

  const clamp = (
    element: FloatingPanelElement,
    left: number,
    top: number,
    mode: FloatingPanelBoundary,
  ) => {
    const rect = element.getBoundingClientRect();
    const bounds = boundaryRect(mode, element);
    const margin = 8;
    const width = rect.width || element.offsetWidth || 300;
    const height = rect.height || element.offsetHeight || 120;
    return {
      left:Math.min(Math.max(margin, left), Math.max(margin, bounds.width - width - margin)),
      top:Math.min(Math.max(margin, top), Math.max(margin, bounds.height - height - margin)),
    };
  };

  const setStyle = (
    element: FloatingPanelElement,
    position: {left: number; top: number},
    mode: FloatingPanelBoundary,
  ) => {
    const bounds = boundaryRect(mode, element);
    const origin = originRect(element);
    element.style.left = `${bounds.left - origin.left + position.left}px`;
    element.style.top = `${bounds.top - origin.top + position.top}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.transform = 'none';
  };

  const apply = (element: FloatingPanelElement | null, options: FloatingPanelBindingOptions) => {
    if(!element || !options.storageKey || !environment.storage) return;
    try {
      const raw = environment.storage.getItem(options.storageKey);
      if(!raw) return;
      const position = JSON.parse(raw) as {left?: unknown; top?: unknown};
      if(!Number.isFinite(position.left) || !Number.isFinite(position.top)) return;
      setStyle(element, clamp(element, Number(position.left), Number(position.top), options.mode), options.mode);
    } catch {
      // Corrupt or unavailable browser storage should not block the UI.
    }
  };

  const reset = (element: FloatingPanelElement | null, options: FloatingPanelBindingOptions) => {
    if(!element) return;
    try {
      if(options.storageKey) environment.storage?.removeItem(options.storageKey);
    } catch {
      // Reset the visible style even when storage is unavailable.
    }
    STYLE_KEYS.forEach(key => {
      element.style[key] = options.defaultStyle?.[key] ?? '';
    });
  };

  const bind = (element: FloatingPanelElement | null, options: FloatingPanelBindingOptions) => {
    if(!element || bound.has(element)) return;
    const handle = options.handleSelector
      ? element.querySelector<HTMLElement>(options.handleSelector)
      : element;
    if(!handle) return;
    bound.add(element);
    element._applyFloatingPosition = () => apply(element, options);
    element._resetFloatingPosition = () => reset(element, options);
    environment.disablePropagation?.(element);

    let drag: null | {
      id: number;
      x: number;
      y: number;
      left: number;
      top: number;
      moved: boolean;
    } = null;

    handle.addEventListener('pointerdown', event => {
      if(event.button !== 0) return;
      if((event.target as Element | null)?.closest?.('button,a,input,textarea,select')) return;
      const bounds = boundaryRect(options.mode, element);
      const rect = element.getBoundingClientRect();
      drag = {
        id:event.pointerId,
        x:event.clientX,
        y:event.clientY,
        left:rect.left - bounds.left,
        top:rect.top - bounds.top,
        moved:false,
      };
      try { handle.setPointerCapture(event.pointerId); } catch {}
      event.preventDefault();
      event.stopPropagation();
    });

    handle.addEventListener('pointermove', event => {
      if(!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if(!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      element.classList.add('floating-dragging');
      setStyle(element, clamp(element, drag.left + dx, drag.top + dy, options.mode), options.mode);
      event.preventDefault();
      event.stopPropagation();
    });

    const finish = (event: PointerEvent) => {
      if(!drag || event.pointerId !== drag.id) return;
      const moved = drag.moved;
      drag = null;
      element.classList.remove('floating-dragging');
      try { handle.releasePointerCapture(event.pointerId); } catch {}
      event.preventDefault();
      event.stopPropagation();
      if(!moved || !options.storageKey || !environment.storage) return;
      const bounds = boundaryRect(options.mode, element);
      const rect = element.getBoundingClientRect();
      const position = clamp(element, rect.left - bounds.left, rect.top - bounds.top, options.mode);
      try {
        environment.storage.setItem(options.storageKey, JSON.stringify({
          left:Math.round(position.left),
          top:Math.round(position.top),
        }));
      } catch {
        // Dragging remains usable when persistence is unavailable.
      }
    };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
    handle.addEventListener('dblclick', event => {
      if((event.target as Element | null)?.closest?.('button,a,input,textarea,select')) return;
      event.preventDefault();
      event.stopPropagation();
      reset(element, options);
    });
    apply(element, options);
  };

  return Object.freeze({bind, apply, reset, clamp});
}
