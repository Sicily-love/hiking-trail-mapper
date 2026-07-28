export interface LayoutRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface MapSafePadding {
  paddingTopLeft: [number, number];
  paddingBottomRight: [number, number];
}

export interface MapSafeAreaController {
  resolve(basePadding?: number): MapSafePadding;
}

export interface MapSafeAreaControllerOptions {
  document: Document;
  mapElement: HTMLElement;
  occluderSelectors?: readonly string[];
  edgeThreshold?: number;
}

const DEFAULT_OCCLUDERS = [
  '#sidebar',
  '#segment-panel',
  '#addescape-panel',
  '#stitch-panel',
] as const;

function intersection(first: LayoutRect, second: LayoutRect): LayoutRect | null {
  const left = Math.max(first.left, second.left);
  const top = Math.max(first.top, second.top);
  const right = Math.min(first.right, second.right);
  const bottom = Math.min(first.bottom, second.bottom);
  if(right <= left || bottom <= top) return null;
  return {left, top, right, bottom, width:right - left, height:bottom - top};
}

/**
 * Converts visible edge overlays into asymmetric Leaflet fit padding.
 * Tall overlays reserve horizontal space; wide overlays reserve vertical space.
 */
export function calculateMapSafePadding(
  mapRect: LayoutRect,
  occluders: readonly LayoutRect[],
  basePadding = 40,
  edgeThreshold = 24,
): MapSafePadding {
  const base = Math.max(0, Math.round(basePadding));
  const reserved = {left:0, top:0, right:0, bottom:0};

  for(const rect of occluders) {
    const clipped = intersection(mapRect, rect);
    if(!clipped) continue;
    const gaps = {
      left:Math.abs(clipped.left - mapRect.left),
      top:Math.abs(clipped.top - mapRect.top),
      right:Math.abs(mapRect.right - clipped.right),
      bottom:Math.abs(mapRect.bottom - clipped.bottom),
    };
    const horizontal = (['left', 'right'] as const)
      .filter(side => gaps[side] <= edgeThreshold)
      .sort((a, b) => gaps[a] - gaps[b]);
    const vertical = (['top', 'bottom'] as const)
      .filter(side => gaps[side] <= edgeThreshold)
      .sort((a, b) => gaps[a] - gaps[b]);
    const preferred = clipped.height >= clipped.width ? horizontal : vertical;
    const fallback = clipped.height >= clipped.width ? vertical : horizontal;
    const side = preferred[0] ?? fallback[0];
    if(!side) continue;

    if(side === 'left') reserved.left = Math.max(reserved.left, clipped.right - mapRect.left);
    else if(side === 'right') reserved.right = Math.max(reserved.right, mapRect.right - clipped.left);
    else if(side === 'top') reserved.top = Math.max(reserved.top, clipped.bottom - mapRect.top);
    else reserved.bottom = Math.max(reserved.bottom, mapRect.bottom - clipped.top);
  }

  return {
    paddingTopLeft:[base + Math.ceil(reserved.left), base + Math.ceil(reserved.top)],
    paddingBottomRight:[base + Math.ceil(reserved.right), base + Math.ceil(reserved.bottom)],
  };
}

function isVisibleOccluder(document: Document, element: HTMLElement): boolean {
  if(element.classList.contains('collapsed') || element.hidden) return false;
  const style = document.defaultView?.getComputedStyle(element);
  if(!style) return true;
  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && Number.parseFloat(style.opacity || '1') > 0.01;
}

/** Reads layout at fit time so responsive panels cannot invalidate cached padding. */
export function createMapSafeAreaController(
  options: MapSafeAreaControllerOptions,
): MapSafeAreaController {
  const selectors = options.occluderSelectors ?? DEFAULT_OCCLUDERS;
  return Object.freeze({
    resolve(basePadding = 40): MapSafePadding {
      const mapRect = options.mapElement.getBoundingClientRect();
      const occluders = selectors
        .flatMap(selector => Array.from(options.document.querySelectorAll<HTMLElement>(selector)))
        .filter(element => element !== options.mapElement && isVisibleOccluder(options.document, element))
        .map(element => element.getBoundingClientRect());
      return calculateMapSafePadding(
        mapRect,
        occluders,
        basePadding,
        options.edgeThreshold,
      );
    },
  });
}
