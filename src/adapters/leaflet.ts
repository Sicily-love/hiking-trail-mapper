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
