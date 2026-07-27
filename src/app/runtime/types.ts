export type RuntimeTrackPoint = [
  lat: number,
  lng: number,
  elevation?: number,
  distanceKm?: number,
  timestamp?: string | null,
  day?: number | null,
  ...extra: unknown[],
];

export interface RuntimeWaypoint {
  id: string;
  lat: number;
  lng: number;
  tag?: string;
  label?: string;
  name?: string;
  elev?: number;
  km?: number;
  gps_idx?: number;
  [name: string]: unknown;
}

export interface RuntimeTrail {
  id: string;
  name: string;
  group: string;
  track: RuntimeTrackPoint[];
  track_breaks: number[];
  waypoints: RuntimeWaypoint[];
  stats: {
    distance_km: number;
    ascent_m: number;
    descent_m?: number;
    max_elev: number;
    min_elev?: number;
    [name: string]: number | undefined;
  };
  color?: string;
  days?: number;
  reversed?: boolean;
  [name: string]: unknown;
}

/** Leaflet and its optional plugins remain a browser adapter, not domain state. */
export interface LeafletNamespace {
  map(...args: any[]): any;
  layerGroup(...args: any[]): any;
  tileLayer(...args: any[]): any;
  latLngBounds(...args: any[]): any;
  polyline(...args: any[]): any;
  divIcon(...args: any[]): any;
  marker(...args: any[]): any;
  circleMarker(...args: any[]): any;
  DomEvent: Record<string, (...args: any[]) => any>;
  [name: string]: any;
}

export interface StudioBrowserWindow extends Window {
  L: LeafletNamespace;
  fflate: any;
  showSaveFilePicker?: (options?: unknown) => Promise<any>;
  [name: string]: any;
}
