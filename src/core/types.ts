export type LatLng = {
  lat: number;
  lng: number;
};

export type ElevationPoint = LatLng & {
  elev?: number;
};

export type TrackTuple = [
  lat: number,
  lng: number,
  elev?: number,
  km?: number,
  ascent_m?: number,
  dayId?: number | null,
];

export type WaypointInput = LatLng & {
  name: string;
  tag?: string;
  desc?: string;
  [key: string]: unknown;
};

export type EnrichedWaypoint = WaypointInput & {
  gps_idx: number;
  label: string;
  elev: number;
};

export type TrailLike = {
  id?: string;
  track?: TrackTuple[];
};

export type TrailStats = {
  distance_km: number;
  ascent_m: number;
  descent_m: number;
  max_elev: number;
  min_elev: number;
};

export type TrackIndexPoint = LatLng & {
  idx: number;
  elev: number;
  km: number;
};

export type TrackIndexRange = {
  iStart: number;
  iEnd: number;
  reversed: boolean;
};

export type SegmentStats = TrackIndexRange & {
  distance_m: number;
  km: number;
  kmText: string;
  asc: number;
  desc: number;
  maxE: number;
  minE: number;
  max: number;
  min: number;
};

export type MeasureStats = TrackIndexRange & {
  distKm: number;
  asc: number;
  desc: number;
  maxE: number;
  minE: number;
};

export type MeasureEndpointLabel = 'A' | 'B';

export type MeasureEndpointStateResult = {
  ok: boolean;
  changed: boolean;
  reason?: 'empty' | 'same-as-other' | 'unchanged';
  ptA: TrackIndexPoint | null;
  ptB: TrackIndexPoint | null;
};

export type DayMeta = {
  d: number;
  date: string;
  km: number;
  asc: number;
  desc: number;
  max: number;
  min: number;
  camp: string;
  camp_elev: number;
  seg: string;
  i_start: number;
  i_end: number;
};

export type DayIndexRange = {
  iStart: number;
  iEnd: number;
};

export type DayRangeStats = {
  km: number;
  asc: number;
  desc: number;
  max: number;
  min: number;
};

export type DayRangeTrail = {
  track: TrackTuple[];
  day_meta?: Array<Partial<DayMeta>>;
  track_breaks?: number[];
  _descCum?: number[];
};

export type ElevationAnnotationLayout = {
  alts: number[];
  minE: number;
  maxE: number;
  km: number[];
  kmRange: number;
};

export type ElevationLayoutOptions = {
  width?: number;
  height?: number;
  measureMode?: boolean;
  kmFromZero?: boolean;
  trackBreaks?: number[];
};

export type ElevationLayoutModel = ElevationAnnotationLayout & {
  W: number;
  H: number;
  PL: number;
  PR: number;
  PT: number;
  PB: number;
  pw: number;
  ph: number;
  eRng: number;
  kmStart: number;
  kmEnd: number;
  pX: (index: number) => number;
  pY: (elevation: number) => number;
};

export type ElevationPathPoint = {
  idx: number;
  x: number;
  y: number;
  elev: number;
  km: number;
};

export type ElevationFillPoint = {
  x: number;
  y: number;
};

export type ElevationAxisTick = {
  index: number;
  x: number;
  kmVal: number;
  label: string;
  align: 'left' | 'center' | 'right';
};

export type ElevationGridLine = {
  fraction: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type CanvasGradientStyle = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  stops: Array<{
    offset: number;
    color: string;
  }>;
};

export type CanvasLineStyle = {
  strokeStyle: string;
  lineWidth: number;
  lineDash?: number[];
  lineJoin?: 'round' | 'bevel' | 'miter';
  lineCap?: 'round' | 'butt' | 'square';
};

export type CanvasTextStyle = {
  fillStyle: string;
  font: string;
  textAlign?: 'left' | 'center' | 'right';
};

export type ElevationBackgroundModel = {
  rect: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  gradient: CanvasGradientStyle;
  noise: {
    count: number;
    rgb: [number, number, number];
    maxAlpha: number;
    size: number;
  };
};

export type ElevationRenderModel = {
  background: ElevationBackgroundModel;
  curve: ElevationPathPoint[];
  curveSegments: ElevationPathPoint[][];
  fillPolygon: ElevationFillPoint[];
  fillPolygons: ElevationFillPoint[][];
  gridLines: ElevationGridLine[];
  baseline: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  gridStyle: CanvasLineStyle;
  fillStyle: {
    gradient: CanvasGradientStyle;
  };
  curveStyle: CanvasLineStyle;
  baselineStyle: CanvasLineStyle;
  axisStyle: {
    tickLine: CanvasLineStyle;
    tickText: CanvasTextStyle;
    axisLabel: CanvasTextStyle;
  };
  ticks: ElevationAxisTick[];
  xAxisLabel: {
    x: number;
    y: number;
  };
  badges: {
    ascent: number;
    descent: number;
    ascentText: string;
    descentText: string;
  };
  yBottom: number;
};

export type ElevationLabelStackOptions = {
  measureText?: (text: string, fontSize: number, font: string) => number;
  gap?: number;
};

export type ElevationLabelStackEstimate = {
  labelCount: number;
  fontSize: number;
  lineHeight: number;
  stackDepth: number;
};

export type ElevationPanelHeightOptions = {
  minHeight?: number;
  maxHeight?: number;
  baseHeight?: number;
  extraLayers?: number;
  labelGap?: number;
  padding?: number;
};

export type ElevationAnnotationOptions = {
  measureMode?: boolean;
  waypoints?: EnrichedWaypoint[];
  segIdxStart?: number;
  segIdxEnd?: number;
  reversed?: boolean;
  campLabel?: string;
};

export type ElevationAnnotation = {
  idx: number;
  kmVal: number;
  elev: number;
  text: string;
  color: string;
  dotColor?: string;
  dotRadius?: number;
  dotOnly?: boolean;
  priority: number;
  side?: 'top' | 'bottom';
  labelSide?: 'left' | 'right';
  kind: 'peak' | 'low' | 'measure-a' | 'measure-b' | 'camp';
};

export type ElevationAnnotationLayoutOptions = {
  measureText?: (text: string, fontSize: number, font: string) => number;
  gap?: number;
  maxUpLayers?: number;
  maxDownLayers?: number;
  edgePadding?: number;
};

export type ElevationAnnotationPlacement = ElevationAnnotation & {
  x: number;
  anchorY: number;
  textWidth: number;
  labelWidth: number;
  labelHeight: number;
  labelLeft?: number;
  labelTop?: number;
};

export type ElevationAnnotationLayoutResult = {
  annotations: ElevationAnnotationPlacement[];
  font: string;
  fontSize: number;
  overflow: number;
};

export type ElevationAnnotationRenderCommand = {
  dot: {
    x: number;
    y: number;
    radius: number;
    fillStyle: string;
  };
  leader?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  text?: {
    value: string;
    x: number;
    y: number;
    fillStyle: string;
  };
};

export type ElevationAnnotationRenderModel = {
  commands: ElevationAnnotationRenderCommand[];
  dotStrokeStyle: string;
  dotStrokeWidth: number;
  defaultDotFillStyle: string;
  leaderStyle: CanvasLineStyle;
  textStyle: CanvasTextStyle & {
    textBaseline: 'top';
  };
};

export type SegmentBoundaryMoveReason =
  | 'empty'
  | 'endpoint'
  | 'duplicate'
  | 'before-previous'
  | 'after-next';

export type SegmentBoundaryMoveResult = {
  ok: boolean;
  changed: boolean;
  reason?: SegmentBoundaryMoveReason;
  points: TrackIndexPoint[];
};

export type DayPreviewRenderModel = TrackIndexRange & {
  latLngs: Array<[number, number]> | Array<Array<[number, number]>>;
  lineStyle: {
    color: string;
    weight: number;
    opacity: number;
    interactive: boolean;
  };
  fitOptions: {
    padding: [number, number];
  };
  endpoints: Array<{
    label: 'A' | 'B';
    lat: number;
    lng: number;
    color: string;
  }>;
};

export type KmlCoordTuple = [lng: number, lat: number, elev: number];

export type KmlTrackPoint = {
  lng: number;
  lat: number;
  elev: number;
  t: string;
  spd: number;
};

export type KmlGxTrackInput = {
  coords: Array<string | null | undefined>;
  whens?: Array<string | null | undefined>;
};

export type KmlWaypointInput = {
  name?: string | null;
  coordinateText?: string | null;
  description?: string | null;
};

export type KmlDataEntry = {
  name?: string | null;
  value?: string | null;
};

export type KmlParseModelInput = {
  title?: string | null;
  lineStringCoordinateTexts?: Array<string | null | undefined>;
  gxTracks?: KmlGxTrackInput[];
  waypoints?: KmlWaypointInput[];
  data?: KmlDataEntry[];
};

export type KmlParsedWaypoint = {
  id: number;
  name: string;
  tag: string;
  time: string;
  lng: number;
  lat: number;
  photo: string;
};

export type KmlParseModel = {
  title: string;
  trackPoints: KmlTrackPoint[];
  waypoints: KmlParsedWaypoint[];
  trackId: string;
  beginTime: string;
  trackBreaks: number[];
};

export type SegmentCampEdit = {
  name?: string;
};

export type SegmentCampEdits = Record<number, SegmentCampEdit>;

export type StorageTrailLike = {
  id?: string;
  group?: string | null;
  [key: string]: unknown;
};

export type PersistedStorageSnapshot<TTrail extends StorageTrailLike = StorageTrailLike> = {
  trails?: TTrail[];
  primaryTrailId?: string | null;
  primaryByGroup?: Record<string, string | null | undefined>;
  activeTrails?: Iterable<string> | null;
  activeGroup?: string | null;
};

export type RuntimeStorageState = {
  primaryTrailId?: string | null;
  primaryByGroup?: Record<string, string | null | undefined>;
  activeTrails?: Iterable<string> | null;
  activeGroup?: string | null;
};

export type RestoredStorageState<TTrail extends StorageTrailLike = StorageTrailLike> = {
  ok: boolean;
  trails: TTrail[];
  activeTrails: Set<string>;
  activeGroup: string | null;
  primaryByGroup: Record<string, string | null>;
  primaryTrailId: string | null;
};

export type RestoreStorageOptions = {
  currentActiveGroup?: string | null;
  defaultGroup?: string;
};

export type IndexedDbStorageConfig = {
  storeName?: string;
  dataKey?: string;
};

export type NormalizedIndexedDbStorageConfig = {
  storeName: string;
  dataKey: string;
};

export type IndexedDbStorageOperation<TValue = unknown> = {
  kind: 'read' | 'write' | 'delete';
  mode: 'readonly' | 'readwrite';
  storeName: string;
  key: string;
  value?: TValue;
};
