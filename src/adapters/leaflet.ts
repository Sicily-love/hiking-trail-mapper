export interface PolylineModel {
  latLngs: Array<[number, number]>;
  lineStyle: Record<string, unknown>;
}
interface LeafletPolyline {
  setLatLngs?(latLngs: Array<[number, number]>): void;
  bringToBack?(): void;
}

interface LeafletLayer {
  polyline(latLngs: Array<[number, number]>, style: Record<string, unknown>): {
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

import { planKeyedWaypointDiff } from '../core/performance/waypointDiff.ts';
import type { TrackPolylineRenderModel, TrackRenderModel } from '../features/map/render-model.ts';
import type { LeafletMarkerRenderModel } from '../features/waypoint/render-model.ts';

interface LeafletEventedLayer {
  on(events: string, listener: (event: any) => void): LeafletEventedLayer;
  bindTooltip?(content: string, options?: Record<string, unknown>): LeafletEventedLayer;
  bindPopup?(content: string, options?: Record<string, unknown>): LeafletEventedLayer;
  addTo(layer: unknown): LeafletEventedLayer;
}

interface LeafletRenderApi {
  polyline(latLngs: unknown, style: Record<string, unknown>): LeafletEventedLayer;
  divIcon(options: Record<string, unknown>): unknown;
  marker(position: [number, number], options: Record<string, unknown>): LeafletEventedLayer;
}

interface LeafletLayerGroup {
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
  onSelectTrail: (trailId: string) => void;
}

export interface LeafletTrackRenderer {
  render(model: TrackRenderModel): void;
}

/** Owns Leaflet polylines and event subscriptions; callers provide declarative models only. */
export function createLeafletTrackRenderer(options: LeafletTrackRendererOptions): LeafletTrackRenderer {
  const render = (model: TrackRenderModel): void => {
    options.trackLayer.clearLayers();
    options.networkLayer.clearLayers();
    for(const lineModel of model.polylines) {
      const line = options.leaflet.polyline(lineModel.latLngs, lineModel.lineStyle);
      if(lineModel.tooltip) line.bindTooltip?.(lineModel.tooltip, {sticky:true});
      if(lineModel.selectable) {
        line.on('click', () => {
          if(!options.interactionBlocked()) options.onSelectTrail(lineModel.trail.id);
        });
      }
      if(lineModel.hoverable) {
        let frame: number | null = null;
        let lastEvent: any = null;
        line.on('mouseover mousemove', event => {
          if(options.interactionBlocked()) return;
          lastEvent = event;
          if(frame !== null) return;
          frame = options.requestFrame(() => {
            frame = null;
            options.onHover(lastEvent, lineModel);
          });
        });
        line.on('mouseout', () => {
          if(frame !== null) options.cancelFrame(frame);
          frame = null;
          lastEvent = null;
          options.onHoverEnd();
        });
      }
      (line as any).__trail = lineModel.trail;
      line.addTo(options.trackLayer);
    }
  };
  return Object.freeze({render});
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
}

/** Owns keyed waypoint Marker instances and the replace-on-render high-point layer. */
export function createLeafletMarkerRenderer(options: LeafletMarkerRendererOptions): LeafletMarkerRenderer {
  let previous: LeafletMarkerRenderModel[] = [];
  const instances = new Map<string, LeafletEventedLayer>();

  const createMarker = (model: LeafletMarkerRenderModel, layer: LeafletLayerGroup): LeafletEventedLayer => {
    const icon = options.leaflet.divIcon({
      html:model.iconHtml, className:'', iconSize:model.iconSize, iconAnchor:model.iconAnchor,
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
    options.waypointLayer.removeLayer(marker);
    instances.delete(key);
    delete options.waypointRegistry[key];
  };

  const mount = (model: LeafletMarkerRenderModel): void => {
    const marker = createMarker(model, options.waypointLayer);
    instances.set(model.key, marker);
    options.waypointRegistry[model.key] = marker;
  };

  const renderWaypoints = (models: LeafletMarkerRenderModel[]): LeafletMarkerDiffStats => {
    const diff = planKeyedWaypointDiff(
      previous,
      models,
      model => model.key,
      (left, right) => left.signature === right.signature,
    );
    for(const item of diff.remove) remove(String(item.key));
    for(const item of diff.update) {
      remove(String(item.key));
      mount(item.next);
    }
    for(const item of diff.add) mount(item.next);
    previous = models;
    return {add:diff.add.length, update:diff.update.length, remove:diff.remove.length, keep:diff.keep.length};
  };

  const renderHighPoints = (models: LeafletMarkerRenderModel[]): void => {
    options.highPointLayer.clearLayers();
    for(const model of models) createMarker(model, options.highPointLayer);
  };

  return Object.freeze({renderWaypoints, renderHighPoints});
}
