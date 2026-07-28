export interface VersionBadgeDependencies {
  document: Document;
  mapContainer: HTMLElement;
  version: string;
  title: string;
  onActivate: () => void;
  schedule?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  cancelScheduled?: (handle: ReturnType<typeof setTimeout>) => void;
}

export interface VersionBadgeController {
  reposition(): void;
  destroy(): void;
}

/** Owns the map version badge and its position beside Leaflet attribution. */
export function createVersionBadgeController(
  dependencies: VersionBadgeDependencies,
): VersionBadgeController {
  const {
    document,
    mapContainer,
    version,
    title,
    onActivate,
    schedule = (callback, delayMs) => setTimeout(callback, delayMs),
    cancelScheduled = handle => clearTimeout(handle),
  } = dependencies;
  const badge = document.createElement('div');
  const link = document.createElement('a');
  const scheduled: Array<ReturnType<typeof setTimeout>> = [];

  badge.className = 'leaflet-control-attribution';
  badge.id = 'version-tag-float';
  badge.style.position = 'absolute';
  badge.style.zIndex = '600';
  badge.style.pointerEvents = 'auto';
  link.id = 'version-tag-link';
  link.href = '#';
  link.title = title;
  link.textContent = version;
  badge.appendChild(link);
  mapContainer.appendChild(badge);

  const reposition = (): void => {
    const attribution = mapContainer.querySelector<HTMLElement>(
      '.leaflet-control-attribution:not(#version-tag-float)',
    );
    if(!attribution) return;
    const mapRect = mapContainer.getBoundingClientRect();
    const attributionRect = attribution.getBoundingClientRect();
    badge.style.right = `${mapRect.right - attributionRect.left + 6}px`;
    badge.style.bottom = `${mapRect.bottom - attributionRect.bottom}px`;
  };
  const activate = (event: Event): void => {
    event.preventDefault();
    onActivate();
  };
  link.addEventListener('click', activate);

  reposition();
  scheduled.push(schedule(reposition, 200), schedule(reposition, 600));
  const attribution = mapContainer.querySelector(
    '.leaflet-control-attribution:not(#version-tag-float)',
  );
  const observer = attribution && document.defaultView?.MutationObserver
    ? new document.defaultView.MutationObserver(reposition)
    : null;
  observer?.observe(attribution as Node, {
    childList:true,
    subtree:true,
    characterData:true,
  });
  document.defaultView?.addEventListener('resize', reposition);

  return Object.freeze({
    reposition,
    destroy(): void {
      scheduled.splice(0).forEach(cancelScheduled);
      observer?.disconnect();
      document.defaultView?.removeEventListener('resize', reposition);
      link.removeEventListener('click', activate);
      badge.remove();
    },
  });
}
