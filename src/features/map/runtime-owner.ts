import type {RuntimeContext} from '../../app/runtime/context.ts';
import type {LeafletNamespace, RuntimeTrackPoint, RuntimeTrail, RuntimeWaypoint} from '../../app/runtime/types.ts';
import {
  createLeafletMarkerRenderer,
  createLeafletTrackPointInspectionRenderer,
  createLeafletTrackRenderer,
  type LeafletLayerGroup,
  type LeafletMarkerDiffStats,
  type LeafletRenderApi,
} from '../../adapters/leaflet.ts';
import {createWorkbenchIcon, type WorkbenchIconName} from '../../ui/icons.ts';
import {createMapOverlayController, type MapTooltipRow} from '../../ui/map-overlays.ts';
import {
  createTrackPointInspectionController,
  formatCoordinate,
  type TrackPointInspectionEvent,
} from './inspection-controller.ts';
import {createMapRenderController} from './render-model.ts';
import {
  buildWaypointMarkerModel,
  createMarkerRenderController,
  setMarkerLabelVisibility,
  type LeafletMarkerRenderModel,
} from '../waypoint/render-model.ts';
import {
  mapLabelBudgetForZoom,
  planMapLabelVisibility,
  resolveMapRenderPolicy,
  type MapRenderPolicy,
  type MapRenderTier,
} from '../../core/performance/map-rendering.ts';

export const MAP_DAY_PALETTE = Object.freeze([
  '#2F6B5F','#D96C4A','#E1A93B','#5577B8','#8A6BBE','#C45D83','#5E9F65','#C58B54',
]);

export const MAP_WAYPOINT_TAG_COLORS:Readonly<Record<string, string>> = Object.freeze({
  start:'#5eb3ff', end:'#5eb3ff', fork:'#ff8c42', camp:'#22c55e', pass:'#ef4444',
  water:'#3b82f6', supply:'#facc15', warn:'#dc2626', shelter:'#a855f7',
  village:'#d97706', bridge:'#06b6d4', river:'#06b6d4', other:'#94a3b8',
});

export const MAP_WAYPOINT_TAG_LABELS:Readonly<Record<string, string>> = Object.freeze({
  start:'起终点', end:'起终点', fork:'分叉点', camp:'营地', pass:'垭口', water:'水源',
  supply:'补给', warn:'高强度', shelter:'庇护', village:'村落/牧民', bridge:'桥梁',
  river:'小溪', other:'其他',
});

export const DAY_ITINERARY_WAYPOINT_TAGS = new Set([
  'pass','water','supply','bridge','river','village','shelter','warn','fork','start','end','highpoint',
]);

const WAYPOINT_SYMBOLS:Readonly<Record<string, string>> = Object.freeze({
  start:'🚩', end:'🏁', fork:'⑫', camp:'🏕', pass:'🏔', water:'💧', supply:'🏪',
  warn:'⚠', shelter:'🏠', village:'🏘', bridge:'🌉', river:'🏞', highpoint:'⛰',
  other:'📍', view:'📍',
});

const WAYPOINT_VECTOR_ICONS:Readonly<Record<string, WorkbenchIconName>> = Object.freeze({
  fork:'git-fork', warn:'triangle-alert', other:'map-pin',
});

interface LeafletPointerEvent {
  latlng: {lat: number; lng: number};
  originalEvent?: {clientX?: number; clientY?: number; stopPropagation?(): void};
}

interface LeafletMapEventSource {
  on(event: string, listener: () => void): unknown;
  off?(event: string, listener: () => void): unknown;
  getCenter?(): {lat: number; lng: number};
  getZoom?(): number;
  getSize?(): {x: number; y: number};
  latLngToContainerPoint?(position: [number, number]): {x: number; y: number};
}

export interface MapRuntimeRenderStats {
  sourcePoints: number;
  renderedPoints: number;
  tier: MapRenderTier;
  maxPointsPerTrail: number;
  visibleLabels: number;
  labelBudget: number;
}

export interface MapRuntimeDependencies {
  document: Document;
  viewport: Window;
  leaflet: LeafletNamespace & LeafletRenderApi;
  map: LeafletMapEventSource;
  context: RuntimeContext<RuntimeTrail, unknown>;
  trackLayer: LeafletLayerGroup;
  networkLayer: LeafletLayerGroup;
  waypointLayer: LeafletLayerGroup;
  highPointLayer: LeafletLayerGroup;
  interactionBlocked(): boolean;
  escapeReferenceTrailId(): string | null;
  invalidateTracks(): void;
  invalidateMarkers(): void;
  selectTrail(trailId: string): void;
  language(): 'zh' | 'en';
  translate(key: string): string;
  openImage(source: string, caption: string): void;
  recordElevationBands(count: number): void;
  recordMarkerDiff(diff: LeafletMarkerDiffStats): void;
  recordMapStats(stats: MapRuntimeRenderStats): void;
}

export interface MapRuntime {
  readonly dayPalette: readonly string[];
  readonly tagColors: Readonly<Record<string, string>>;
  readonly tagLabels: Readonly<Record<string, string>>;
  readonly waypointRegistry: Record<string, unknown>;
  renderTracks(): void;
  renderWaypoints(): void;
  drawTracks(): void;
  drawWaypoints(): void;
  drawHighPoints(): void;
  collectWaypointMarkerModels(): ReturnType<ReturnType<typeof createMarkerRenderController<RuntimeTrail>>['build']>['waypoints'];
  nearestTrackIndex(track: RuntimeTrackPoint[], lat: number, lng: number): number;
  waypointIcon(value: unknown): string;
  waypointIconMarkup(value: unknown, className?: string): string;
  buildWaypointMarker(trail: RuntimeTrail, waypoint: RuntimeWaypoint, isPrimary: boolean): ReturnType<typeof buildWaypointMarkerModel>;
  inspectTrackPoint(event: TrackPointInspectionEvent, trail: RuntimeTrail): boolean;
  showTooltip(event: LeafletPointerEvent, point: RuntimeTrackPoint, nextPoint: RuntimeTrackPoint, trail: RuntimeTrail, heat?: number): void;
  hideTooltip(): void;
  dispose(): void;
}

function waypointTag(value: unknown): string {
  if(typeof value === 'string') return value;
  if(value && typeof value === 'object' && 'tag' in value) {
    const tag = (value as {tag?: unknown}).tag;
    if(typeof tag === 'string' && tag) return tag;
  }
  return 'other';
}

/** Owns declarative map models, Leaflet renderers, inspection, and transient map UI. */
export function createMapRuntime(dependencies: MapRuntimeDependencies): MapRuntime {
  const {
    document, viewport, leaflet:L, map, context, trackLayer, networkLayer,
    waypointLayer, highPointLayer,
  } = dependencies;
  const waypointRegistry:Record<string, unknown> = {};
  const waypointIcon = (value: unknown): string => {
    const tag = waypointTag(value);
    if(WAYPOINT_SYMBOLS[tag]) return WAYPOINT_SYMBOLS[tag];
    if(value && typeof value === 'object' && 'icon' in value) {
      const icon = (value as {icon?: unknown}).icon;
      if(typeof icon === 'string' && icon) return icon;
    }
    return WAYPOINT_SYMBOLS.other;
  };
  const waypointIconMarkup = (value: unknown, className = ''): string => {
    const tag = waypointTag(value);
    const vectorName = WAYPOINT_VECTOR_ICONS[tag];
    if(vectorName) {
      return createWorkbenchIcon(document, vectorName, {
        size:16,
        strokeWidth:2.2,
        className:`waypoint-symbol waypoint-symbol--${tag} ${className}`.trim(),
      }).outerHTML;
    }
    const symbol = document.createElement('span');
    symbol.className = `waypoint-symbol waypoint-symbol--emoji ${className}`.trim();
    symbol.textContent = waypointIcon(value);
    return symbol.outerHTML;
  };

  const nearestTrackIndex = (track: RuntimeTrackPoint[], lat: number, lng: number): number => {
    if(!track.length) return -1;
    let best = 0;
    let bestDistance = Infinity;
    const stride = Math.max(1, Math.floor(track.length / 200));
    for(let index = 0; index < track.length; index += stride) {
      const dx = track[index][0] - lat;
      const dy = track[index][1] - lng;
      const distance = dx * dx + dy * dy;
      if(distance < bestDistance) { bestDistance = distance; best = index; }
    }
    const first = Math.max(0, best - Math.max(20, stride));
    const last = Math.min(track.length, best + Math.max(20, stride) + 1);
    for(let index = first; index < last; index += 1) {
      const dx = track[index][0] - lat;
      const dy = track[index][1] - lng;
      const distance = dx * dx + dy * dy;
      if(distance < bestDistance) { bestDistance = distance; best = index; }
    }
    return best;
  };

  const mapRenderController = createMapRenderController(context);
  const markerRenderController = createMarkerRenderController(context, {
    tagColors:MAP_WAYPOINT_TAG_COLORS,
    iconForWaypoint:waypointIconMarkup,
  });
  const trackPointInspector = createTrackPointInspectionController({
    renderer:createLeafletTrackPointInspectionRenderer({leaflet:L, map}),
    nearestIndex:(track, lat, lng) => nearestTrackIndex(track as RuntimeTrackPoint[], lat, lng),
  });
  const overlays = createMapOverlayController({
    document,
    viewport,
    openImage:dependencies.openImage,
  });
  const navigatorHints = viewport.navigator as Navigator & {
    deviceMemory?: number;
    connection?: {saveData?: boolean};
  };
  const resolveRenderPolicy = (): MapRenderPolicy => {
    const state = context.stateSelectors.snapshot();
    const active = context.projectSelectors.trails().filter(trail => state.activeGroup !== null
      && (trail.group || '默认') === state.activeGroup
      && state.activeTrails.has(trail.id));
    return resolveMapRenderPolicy({
      viewportWidth:viewport.innerWidth,
      coarsePointer:viewport.matchMedia?.('(pointer: coarse)').matches === true,
      deviceMemoryGb:navigatorHints.deviceMemory,
      hardwareConcurrency:navigatorHints.hardwareConcurrency,
      saveData:navigatorHints.connection?.saveData === true,
    }, {
      activeTrailCount:active.length,
      totalTrackPoints:active.reduce((sum, trail) => sum + trail.track.length, 0),
    });
  };
  let currentPolicy = resolveRenderPolicy();
  let mapStats:MapRuntimeRenderStats = {
    sourcePoints:0,
    renderedPoints:0,
    tier:currentPolicy.tier,
    maxPointsPerTrail:currentPolicy.maxPointsPerTrail,
    visibleLabels:0,
    labelBudget:0,
  };
  const recordMapStats = (patch: Partial<MapRuntimeRenderStats>): void => {
    mapStats = {...mapStats, ...patch};
    dependencies.recordMapStats({...mapStats});
  };
  const mapViewportSignature = (): string | null => {
    const center = map.getCenter?.();
    const size = map.getSize?.();
    const zoom = map.getZoom?.();
    if(!center || !size || !Number.isFinite(zoom)) return null;
    return [
      Number(center.lat).toFixed(6),
      Number(center.lng).toFixed(6),
      Number(zoom).toFixed(3),
      Math.round(size.x),
      Math.round(size.y),
    ].join(':');
  };
  let lastLabelViewportSignature = mapViewportSignature();

  const tooltipLabel = (zh: string, en: string): string => dependencies.language() === 'zh' ? zh : en;
  const showTooltip = (
    event: LeafletPointerEvent,
    point: RuntimeTrackPoint,
    _nextPoint: RuntimeTrackPoint,
    trail: RuntimeTrail,
    heat?: number,
  ): void => {
    const index = nearestTrackIndex(trail.track, point[0], point[1]);
    const descent = index >= 0 && Array.isArray(trail._descCum)
      ? `${Math.round(Number(trail._descCum[index]) || 0)} m`
      : '-';
    const rows:MapTooltipRow[] = [
      {label:tooltipLabel('里程', 'Distance'), value:`${point[3] ?? '-'} km`},
      {label:tooltipLabel('海拔', 'Elevation'), value:`${point[2] ?? '-'} m`},
      {label:tooltipLabel('爬升', 'Ascent'), value:`${point[4] ?? '-'} m`},
      {label:tooltipLabel('下降', 'Descent'), value:descent},
      {label:tooltipLabel('天数', 'Day'), value:point[5] ? `D${point[5]}` : '-'},
      {label:tooltipLabel('纬度', 'Latitude'), value:formatCoordinate(point[0]), coordinate:true},
      {label:tooltipLabel('经度', 'Longitude'), value:formatCoordinate(point[1]), coordinate:true},
      {label:tooltipLabel('轨迹', 'Trail'), value:trail.name, color:trail.color},
    ];
    if(heat !== undefined) rows.push({label:tooltipLabel('重合度', 'Overlap'), value:`${heat}x`});
    overlays.showTooltip(rows, {
      clientX:event.originalEvent?.clientX ?? viewport.innerWidth / 2,
      clientY:event.originalEvent?.clientY ?? viewport.innerHeight / 2,
    });
  };

  const showWaypointCard = (event: LeafletPointerEvent, waypoint: RuntimeWaypoint, trail: RuntimeTrail): void => {
    const description = String(waypoint.description || (waypoint.name && waypoint.name !== waypoint.label ? waypoint.name : '') || '');
    const label = String(waypoint.label || waypoint.name || '');
    const original = event.originalEvent;
    overlays.showWaypointCard({
      closeLabel:tooltipLabel('关闭标注点详情', 'Close waypoint details'),
      iconHtml:waypointIconMarkup(waypoint),
      label,
      meta:`· ${waypoint.km ?? '-'}${dependencies.translate('header.km')} · ${waypoint.elev ?? '-'}m`,
      trailLabel:dependencies.translate('popup.trailLabel'),
      trailName:trail.name,
      trailColor:trail.color,
      description,
      photo:typeof waypoint.photo === 'string' ? waypoint.photo : undefined,
      photoHint:waypoint.photo ? dependencies.translate('popup.clickPhotoZoom') : undefined,
      photoCaption:`${label} · ${waypoint.km ?? '-'}${dependencies.translate('header.km')} · ${waypoint.elev ?? '-'}m`,
    }, {
      clientX:original?.clientX ?? viewport.innerWidth / 2,
      clientY:original?.clientY ?? viewport.innerHeight / 2,
    });
    original?.stopPropagation?.();
  };

  const trackRenderer = createLeafletTrackRenderer({
    leaflet:L,
    trackLayer,
    networkLayer,
    requestFrame:callback => viewport.requestAnimationFrame(callback),
    cancelFrame:handle => viewport.cancelAnimationFrame(handle),
    interactionBlocked:dependencies.interactionBlocked,
    onHover:(event, model) => {
      const track = model.trail.track as RuntimeTrackPoint[];
      const index = nearestTrackIndex(track, event.latlng.lat, event.latlng.lng);
      if(index < 0) return;
      showTooltip(event, track[index], track[Math.min(index + 1, track.length - 1)], model.trail as RuntimeTrail);
    },
    onHoverEnd:overlays.hideTooltip,
    onInspectPoint:(event, model) => trackPointInspector.inspect(event, model.trail as RuntimeTrail),
    onSelectTrail:dependencies.selectTrail,
  });
  const markerRenderer = createLeafletMarkerRenderer({
    leaflet:L,
    waypointLayer,
    highPointLayer,
    waypointRegistry,
    onWaypointClick:(event, model) => {
      if(model.waypoint) showWaypointCard(event, model.waypoint as RuntimeWaypoint, model.trail as RuntimeTrail);
    },
  });

  const renderTracks = (): void => {
    currentPolicy = resolveRenderPolicy();
    const model = mapRenderController.buildTracks({
      dayPalette:MAP_DAY_PALETTE,
      elevationBandCount:currentPolicy.elevationBandCount,
      maxPointsPerTrail:currentPolicy.maxPointsPerTrail,
      escapeReferenceTrailId:dependencies.escapeReferenceTrailId(),
    });
    trackRenderer.render(model);
    dependencies.recordElevationBands(model.elevationBands);
    recordMapStats({
      sourcePoints:model.sourcePoints,
      renderedPoints:model.renderedPoints,
      tier:currentPolicy.tier,
      maxPointsPerTrail:currentPolicy.maxPointsPerTrail,
    });
  };
  const renderWaypoints = (): void => {
    currentPolicy = resolveRenderPolicy();
    const scene = markerRenderController.build();
    const zoom = map.getZoom?.() ?? 14;
    const labelBudget = mapLabelBudgetForZoom(currentPolicy, zoom);
    const labelModels = [...scene.waypoints, ...scene.highPoints].filter(model => model.labelLayout);
    let visibleKeys = new Set(labelModels.slice(0, labelBudget).map(model => model.key));
    if(map.latLngToContainerPoint && labelModels.length) {
      const size = map.getSize?.() || {x:viewport.innerWidth, y:viewport.innerHeight};
      visibleKeys = planMapLabelVisibility(labelModels.map(model => {
        const point = map.latLngToContainerPoint!(model.position);
        const layout = model.labelLayout!;
        return {key:model.key, x:point.x, y:point.y, ...layout};
      }), {
        viewportWidth:size.x,
        viewportHeight:size.y,
        maxLabels:labelBudget,
        padding:4,
      });
    }
    const applyVisibility = (model: LeafletMarkerRenderModel) =>
      setMarkerLabelVisibility(model, visibleKeys.has(model.key));
    const waypoints = scene.waypoints.map(applyVisibility);
    const highPoints = scene.highPoints.map(applyVisibility);
    dependencies.recordMarkerDiff(markerRenderer.renderWaypoints(waypoints));
    markerRenderer.renderHighPoints(highPoints);
    lastLabelViewportSignature = mapViewportSignature();
    recordMapStats({visibleLabels:visibleKeys.size, labelBudget});
  };
  const drawHighPoints = (): void => markerRenderer.renderHighPoints(markerRenderController.build().highPoints);
  const buildWaypointMarker = (trail: RuntimeTrail, waypoint: RuntimeWaypoint, isPrimary: boolean) =>
    buildWaypointMarkerModel({
      trail,
      waypoint,
      isPrimary,
      waypointMode:context.stateSelectors.mode() === 'waypoint',
      color:MAP_WAYPOINT_TAG_COLORS[waypoint.tag || 'other'] || '#aaa',
      iconText:waypointIconMarkup(waypoint),
    });
  const onMapClick = (): void => overlays.hideWaypointCard();
  let viewportMarkerFrame: number | null = null;
  const onMapViewportChanged = (): void => {
    if(viewportMarkerFrame !== null) return;
    viewportMarkerFrame = viewport.requestAnimationFrame(() => {
      viewportMarkerFrame = null;
      const signature = mapViewportSignature();
      if(signature !== null && signature === lastLabelViewportSignature) return;
      dependencies.invalidateMarkers();
    });
  };
  map.on('click', onMapClick);
  map.on('moveend resize', onMapViewportChanged);

  return Object.freeze({
    dayPalette:MAP_DAY_PALETTE,
    tagColors:MAP_WAYPOINT_TAG_COLORS,
    tagLabels:MAP_WAYPOINT_TAG_LABELS,
    waypointRegistry,
    renderTracks,
    renderWaypoints,
    drawTracks:dependencies.invalidateTracks,
    drawWaypoints:dependencies.invalidateMarkers,
    drawHighPoints,
    collectWaypointMarkerModels:() => markerRenderController.build().waypoints,
    nearestTrackIndex,
    waypointIcon,
    waypointIconMarkup,
    buildWaypointMarker,
    inspectTrackPoint:(event: TrackPointInspectionEvent, trail: RuntimeTrail) => trackPointInspector.inspect(event, trail),
    showTooltip,
    hideTooltip:overlays.hideTooltip,
    dispose() {
      map.off?.('click', onMapClick);
      map.off?.('moveend resize', onMapViewportChanged);
      if(viewportMarkerFrame !== null) viewport.cancelAnimationFrame(viewportMarkerFrame);
      viewportMarkerFrame = null;
      trackRenderer.dispose();
      markerRenderer.dispose();
      trackPointInspector.destroy();
      overlays.dispose();
    },
  });
}
