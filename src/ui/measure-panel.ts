export interface MeasurePanelStats {
  distKm: number;
  asc: number;
  desc: number;
}

export interface MeasurePanelDependencies {
  document: Document;
  mapContainer: HTMLElement;
}

export interface MeasurePanelController {
  enter(): void;
  exit(): void;
  showReadout(): void;
  hideReadout(): void;
  setHint(html: string): void;
  reset(hint: string): void;
  update(stats: MeasurePanelStats | null, loading?: boolean): void;
}

type FloatingPanelElement = HTMLElement & {
  _applyFloatingPosition?: () => void;
};

/** Owns the measurement panel and its map-cursor presentation state. */
export function createMeasurePanelController(
  dependencies: MeasurePanelDependencies,
): MeasurePanelController {
  const {document, mapContainer} = dependencies;
  const element = (id: string): HTMLElement | null => document.getElementById(id);

  const enter = (): void => {
    const panel = element('measure-panel') as FloatingPanelElement | null;
    if(panel) {
      panel.style.display = 'block';
      panel._applyFloatingPosition?.();
    }
    mapContainer.style.cursor = 'crosshair';
    mapContainer.classList.add('measure-active');
  };

  const exit = (): void => {
    const panel = element('measure-panel');
    if(panel) panel.style.display = 'none';
    mapContainer.style.cursor = '';
    mapContainer.classList.remove('measure-active');
  };

  const showReadout = (): void => {
    element('measure-distance')?.classList.add('active');
    element('measure-hint')?.classList.add('active');
  };

  const hideReadout = (): void => {
    element('measure-distance')?.classList.remove('active');
    element('measure-hint')?.classList.remove('active');
  };

  const setHint = (html: string): void => {
    const hint = element('measure-hint');
    if(!hint) return;
    hint.innerHTML = html;
    hint.classList.toggle('active', Boolean(html));
  };

  const reset = (hint: string): void => {
    element('measure-distance')?.classList.remove('active');
    const distance = element('m-dist');
    if(distance) distance.textContent = '-';
    setHint(hint);
  };

  const update = (stats: MeasurePanelStats | null, loading = false): void => {
    const distance = element('m-dist');
    const ascent = element('elev-stat-asc');
    const descent = element('elev-stat-desc');
    showReadout();
    if(loading) {
      if(distance) distance.textContent = '⋯';
      if(ascent) ascent.textContent = '↑⋯';
      if(descent) descent.textContent = '↓⋯';
      return;
    }
    if(!stats) return;
    if(distance) distance.textContent = `${stats.distKm.toFixed(2)} km`;
    if(ascent) ascent.textContent = `↑${stats.asc}m`;
    if(descent) descent.textContent = `↓${stats.desc}m`;
  };

  return Object.freeze({
    enter,
    exit,
    showReadout,
    hideReadout,
    setHint,
    reset,
    update,
  });
}
