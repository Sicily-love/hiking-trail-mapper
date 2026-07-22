export type InspectionTrackPoint = readonly [number, number, number?, number?, ...unknown[]];

export interface TrackPointInspectionTrail {
  track: InspectionTrackPoint[];
  color?: string;
}

export interface TrackPointInspectionEvent {
  latlng?: {lat: number; lng: number};
}

export interface TrackPointInspectionRenderModel {
  position: [number, number];
  fillColor: string;
  tooltipHtml: string;
}

export interface TrackPointInspectionRenderer {
  show(model: TrackPointInspectionRenderModel): {remove(): void};
}

export interface TrackPointInspectionControllerDependencies {
  renderer: TrackPointInspectionRenderer;
  nearestIndex: (track: InspectionTrackPoint[], lat: number, lng: number) => number;
  schedule?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  cancelSchedule?: (handle: ReturnType<typeof setTimeout>) => void;
  visibleMs?: number;
}

export interface TrackPointInspectionController {
  inspect(event: TrackPointInspectionEvent, trail: TrackPointInspectionTrail): boolean;
  clear(): void;
  destroy(): void;
}

export function formatCoordinate(value: unknown): string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(6) : '-';
}

export function formatTrackPointCoordinates(point: readonly unknown[] | null | undefined): string {
  return `${formatCoordinate(point?.[0])}, ${formatCoordinate(point?.[1])}`;
}

function safeColor(value: unknown): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#F59E0B';
}

/** Owns the transient map inspection marker and its expiration timer. */
export function createTrackPointInspectionController(
  dependencies: TrackPointInspectionControllerDependencies,
): TrackPointInspectionController {
  const schedule = dependencies.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const cancelSchedule = dependencies.cancelSchedule ?? (handle => clearTimeout(handle));
  const visibleMs = Math.max(0, dependencies.visibleMs ?? 8000);
  let marker: {remove(): void} | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  const clear = (): void => {
    if(timer != null) cancelSchedule(timer);
    timer = null;
    marker?.remove();
    marker = null;
  };
  const inspect = (event: TrackPointInspectionEvent, trail: TrackPointInspectionTrail): boolean => {
    if(destroyed || !event.latlng || !trail.track.length) return false;
    const index = dependencies.nearestIndex(trail.track, event.latlng.lat, event.latlng.lng);
    const point = trail.track[index];
    if(!point) return false;
    clear();
    const distance = point[3] != null ? `${point[3]} km · ` : '';
    marker = dependencies.renderer.show({
      position:[point[0], point[1]],
      fillColor:safeColor(trail.color),
      tooltipHtml:`<b>${distance}${Math.round(point[2] || 0)} m</b><br><span class="track-point-coordinate">${formatTrackPointCoordinates(point)}</span>`,
    });
    timer = schedule(clear, visibleMs);
    return true;
  };
  return Object.freeze({
    inspect,
    clear,
    destroy() {
      if(destroyed) return;
      destroyed = true;
      clear();
    },
  });
}
