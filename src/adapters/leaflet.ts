export interface PolylineModel {
  latLngs: Array<[number, number]> | Array<Array<[number, number]>>;
  lineStyle: Record<string, unknown>;
}
interface LeafletPolyline {
  setLatLngs?(latLngs: Array<[number, number]> | Array<Array<[number, number]>>): void;
  bringToBack?(): void;
}

interface LeafletLayer {
  polyline(latLngs: Array<[number, number]> | Array<Array<[number, number]>>, style: Record<string, unknown>): {
    addTo(layer: unknown): LeafletPolyline;
  };
}

export function upsertLeafletPolyline(
  leaflet: LeafletLayer,
  layer: unknown,
  current: LeafletPolyline | null,
  model: PolylineModel,
): LeafletPolyline {
  let line = current;
  if(line?.setLatLngs) line.setLatLngs(model.latLngs);
  else line = leaflet.polyline(model.latLngs, model.lineStyle).addTo(layer);
  line.bringToBack?.();
  return line;
}

import { planKeyedWaypointDiff } from '../core/performance/waypoint-diff.ts';
import type { TrackPolylineRenderModel, TrackRenderModel } from '../features/map/render-model.ts';
import type {
  TrackPointInspectionRenderModel,
  TrackPointInspectionRenderer,
} from '../features/map/inspection-controller.ts';
import type { LeafletMarkerRenderModel } from '../features/waypoint/render-model.ts';

interface LeafletEventedLayer {
  on(events: string, listener: (event: any) => void): LeafletEventedLayer;
  off?(events?: string, listener?: (event: any) => void): LeafletEventedLayer;
  bindTooltip?(content: string, options?: Record<string, unknown>): LeafletEventedLayer;
  unbindTooltip?(): LeafletEventedLayer;
  bindPopup?(content: string, options?: Record<string, unknown>): LeafletEventedLayer;
  setLatLngs?(latLngs: unknown): LeafletEventedLayer;
  setStyle?(style: Record<string, unknown>): LeafletEventedLayer;
  bringToFront?(): LeafletEventedLayer;
  getElement?(): {classList?: {toggle(name: string, force?: boolean): void}} | null;
  addTo(layer: unknown): LeafletEventedLayer;
}

export interface LeafletRenderApi {
  polyline(latLngs: unknown, style: Record<string, unknown>): LeafletEventedLayer;
  divIcon(options: Record<string, unknown>): unknown;
  marker(position: [number, number], options: Record<string, unknown>): LeafletEventedLayer;
}

interface LeafletInspectionApi {
  circleMarker(position: [number, number], options: Record<string, unknown>): {
    addTo(map: unknown): {
      bindTooltip(content: string, options: Record<string, unknown>): {
        openTooltip(): {remove(): void};
      };
    };
  };
}

export function createLeafletTrackPointInspectionRenderer(options: {
  leaflet: LeafletInspectionApi;
  map: unknown;
}): TrackPointInspectionRenderer {
  return Object.freeze({
    show(model: TrackPointInspectionRenderModel) {
      const marker = options.leaflet.circleMarker(model.position, {
        radius:7,
        color:'#fff',
        weight:2,
        fillColor:model.fillColor,
        fillOpacity:1,
        pane:'tooltipPane',
      }).addTo(options.map);
      const visible = marker.bindTooltip(model.tooltipHtml, {
        permanent:true,
        direction:'top',
        offset:[0,-8],
        className:'measure-tip track-point-inspect-tip',
      }).openTooltip();
      return {remove:() => visible.remove()};
    },
  });
}

export interface LeafletLayerGroup {
  clearLayers(): void;
  removeLayer(layer: unknown): void;
}

export interface LeafletTrackRendererOptions {
  leaflet: LeafletRenderApi;
  trackLayer: LeafletLayerGroup;
  networkLayer: LeafletLayerGroup;
  requestFrame: (callback: () => void) => number;
  cancelFrame: (handle: number) => void;
  interactionBlocked: () => boolean;
  onHover: (event: any, model: TrackPolylineRenderModel) => void;
  onHoverEnd: () => void;
  onInspectPoint: (event: any, model: TrackPolylineRenderModel) => void;
  onSelectTrail: (trailId: string) => void;
}

export interface LeafletTrackRenderer {
  render(model: TrackRenderModel): void;
  dispose(): void;
}

/** Owns Leaflet polylines and event subscriptions; callers provide declarative models only. */
export function createLeafletTrackRenderer(options: LeafletTrackRendererOptions): LeafletTrackRenderer {
  interface TrackInstance {
    line: LeafletEventedLayer;
    model: TrackPolylineRenderModel;
    signature: string;
    tooltip: string;
    frame: number | null;
    lastEvent: any;
  }
  const instances = new Map<string, TrackInstance>();
  let initialized = false;
  let previousOrder: string[] = [];

  const signatureOf = (model: TrackPolylineRenderModel): string => model.signature
    || `${model.key}:${JSON.stringify(model.lineStyle)}:${JSON.stringify(model.latLngs)}`;

  const updateTooltip = (instance: TrackInstance, tooltip = ''): void => {
    if(instance.tooltip === tooltip) return;
    instance.line.unbindTooltip?.();
    if(tooltip) instance.line.bindTooltip?.(tooltip, {sticky:true});
    instance.tooltip = tooltip;
  };

  const mount = (model: TrackPolylineRenderModel): TrackInstance => {
    const line = options.leaflet.polyline(model.latLngs, model.lineStyle);
    const instance:TrackInstance = {
      line,
      model,
      signature:signatureOf(model),
      tooltip:'',
      frame:null,
      lastEvent:null,
    };
    updateTooltip(instance, model.tooltip || '');
    line.on('click', event => {
      const current = instance.model;
      if(options.interactionBlocked()) return;
      if(current.selectable) options.onSelectTrail(current.trail.id);
      else if(current.hoverable) options.onInspectPoint(event, current);
    });
    line.on('mouseover mousemove', event => {
      if(options.interactionBlocked() || !instance.model.hoverable) return;
      instance.lastEvent = event;
      if(instance.frame !== null) return;
      instance.frame = options.requestFrame(() => {
        instance.frame = null;
        if(instance.lastEvent && instance.model.hoverable) options.onHover(instance.lastEvent, instance.model);
      });
    });
    line.on('mouseout', () => {
      if(instance.frame !== null) options.cancelFrame(instance.frame);
      instance.frame = null;
      instance.lastEvent = null;
      options.onHoverEnd();
    });
    (line as any).__trail = model.trail;
    line.addTo(options.trackLayer);
    instances.set(model.key, instance);
    return instance;
  };

  const remove = (key: string): void => {
    const instance = instances.get(key);
    if(!instance) return;
    if(instance.frame !== null) options.cancelFrame(instance.frame);
    instance.line.off?.();
    options.trackLayer.removeLayer(instance.line);
    instances.delete(key);
  };

  const render = (model: TrackRenderModel): void => {
    if(!initialized) {
      options.trackLayer.clearLayers();
      initialized = true;
    }
    options.networkLayer.clearLayers();
    const nextOrder = model.polylines.map(line => line.key);
    const orderChanged = nextOrder.length !== previousOrder.length
      || nextOrder.some((key, index) => key !== previousOrder[index]);
    const nextKeys = new Set(nextOrder);
    for(const key of instances.keys()) if(!nextKeys.has(key)) remove(key);

    for(const lineModel of model.polylines) {
      let instance = instances.get(lineModel.key);
      if(!instance) instance = mount(lineModel);
      else {
        const signature = signatureOf(lineModel);
        if(signature !== instance.signature) {
          instance.line.setLatLngs?.(lineModel.latLngs);
          instance.line.setStyle?.(lineModel.lineStyle);
          instance.signature = signature;
        }
        instance.model = lineModel;
        (instance.line as any).__trail = lineModel.trail;
        updateTooltip(instance, lineModel.tooltip || '');
      }
      if(orderChanged) instance.line.bringToFront?.();
    }
    previousOrder = nextOrder;
  };
  return Object.freeze({
    render,
    dispose() {
      for(const key of [...instances.keys()]) remove(key);
      options.trackLayer.clearLayers();
      options.networkLayer.clearLayers();
      initialized = false;
      previousOrder = [];
    },
  });
}

export interface LeafletMarkerRendererOptions {
  leaflet: LeafletRenderApi;
  waypointLayer: LeafletLayerGroup;
  highPointLayer: LeafletLayerGroup;
  waypointRegistry: Record<string, unknown>;
  onWaypointClick: (event: any, model: LeafletMarkerRenderModel) => void;
}

export interface LeafletMarkerDiffStats {
  add: number;
  update: number;
  remove: number;
  keep: number;
}

export interface LeafletMarkerRenderer {
  renderWaypoints(models: LeafletMarkerRenderModel[]): LeafletMarkerDiffStats;
  renderHighPoints(models: LeafletMarkerRenderModel[]): void;
  dispose(): void;
}

/** Owns keyed waypoint and high-point Marker instances. */
export function createLeafletMarkerRenderer(options: LeafletMarkerRendererOptions): LeafletMarkerRenderer {
  let previous: LeafletMarkerRenderModel[] = [];
  let previousHighPoints: LeafletMarkerRenderModel[] = [];
  let highPointsInitialized = false;
  const instances = new Map<string, LeafletEventedLayer>();
  const highPointInstances = new Map<string, LeafletEventedLayer>();

  const createMarker = (model: LeafletMarkerRenderModel, layer: LeafletLayerGroup): LeafletEventedLayer => {
    const icon = options.leaflet.divIcon({
      html:model.iconHtml, className:model.className || '', iconSize:model.iconSize, iconAnchor:model.iconAnchor,
    });
    const marker = options.leaflet.marker(model.position, {...model.markerOptions, icon});
    if(model.kind === 'waypoint') marker.on('click', event => options.onWaypointClick(event, model));
    if(model.popupHtml) marker.bindPopup?.(model.popupHtml, model.popupOptions);
    marker.addTo(layer);
    return marker;
  };

  const remove = (key: string): void => {
    const marker = instances.get(key);
    if(!marker) return;
    marker.off?.();
    options.waypointLayer.removeLayer(marker);
    instances.delete(key);
    delete options.waypointRegistry[key];
  };

  const mount = (model: LeafletMarkerRenderModel): void => {
    const marker = createMarker(model, options.waypointLayer);
    instances.set(model.key, marker);
    options.waypointRegistry[model.key] = marker;
  };

  const updateLabelClass = (marker: LeafletEventedLayer, model: LeafletMarkerRenderModel): void => {
    const classes = marker.getElement?.()?.classList;
    if(!classes) return;
    classes.toggle('map-marker-label-visible', model.className?.includes('map-marker-label-visible') === true);
    classes.toggle('map-marker-label-hidden', model.className?.includes('map-marker-label-hidden') === true);
  };

  const isLabelOnlyUpdate = (previousModel: LeafletMarkerRenderModel, nextModel: LeafletMarkerRenderModel): boolean =>
    Boolean(previousModel.baseSignature)
    && previousModel.baseSignature === nextModel.baseSignature
    && previousModel.className !== nextModel.className;

  const renderWaypoints = (models: LeafletMarkerRenderModel[]): LeafletMarkerDiffStats => {
    const diff = planKeyedWaypointDiff(
      previous,
      models,
      model => model.key,
      (left, right) => left.signature === right.signature,
    );
    for(const item of diff.remove) remove(String(item.key));
    for(const item of diff.update) {
      const marker = instances.get(String(item.key));
      if(marker && isLabelOnlyUpdate(item.previous, item.next)) {
        updateLabelClass(marker, item.next);
        continue;
      }
      remove(String(item.key));
      mount(item.next);
    }
    for(const item of diff.add) mount(item.next);
    previous = models;
    return {add:diff.add.length, update:diff.update.length, remove:diff.remove.length, keep:diff.keep.length};
  };

  const renderHighPoints = (models: LeafletMarkerRenderModel[]): void => {
    if(!highPointsInitialized) {
      options.highPointLayer.clearLayers();
      highPointsInitialized = true;
    }
    const diff = planKeyedWaypointDiff(
      previousHighPoints,
      models,
      model => model.key,
      (left, right) => left.signature === right.signature,
    );
    const removeHighPoint = (key: string): void => {
      const marker = highPointInstances.get(key);
      if(!marker) return;
      marker.off?.();
      options.highPointLayer.removeLayer(marker);
      highPointInstances.delete(key);
    };
    const mountHighPoint = (model: LeafletMarkerRenderModel): void => {
      highPointInstances.set(model.key, createMarker(model, options.highPointLayer));
    };
    for(const item of diff.remove) removeHighPoint(String(item.key));
    for(const item of diff.update) {
      const marker = highPointInstances.get(String(item.key));
      if(marker && isLabelOnlyUpdate(item.previous, item.next)) {
        updateLabelClass(marker, item.next);
        continue;
      }
      removeHighPoint(String(item.key));
      mountHighPoint(item.next);
    }
    for(const item of diff.add) mountHighPoint(item.next);
    previousHighPoints = models;
  };

  return Object.freeze({
    renderWaypoints,
    renderHighPoints,
    dispose() {
      for(const key of [...instances.keys()]) remove(key);
      for(const marker of highPointInstances.values()) marker.off?.();
      previous = [];
      previousHighPoints = [];
      highPointsInitialized = false;
      instances.clear();
      highPointInstances.clear();
      options.waypointLayer.clearLayers();
      options.highPointLayer.clearLayers();
      for(const key of Object.keys(options.waypointRegistry)) delete options.waypointRegistry[key];
    },
  });
}
