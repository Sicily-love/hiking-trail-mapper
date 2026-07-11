export {
  DEFAULT_ELEVATION_BAND_COUNT,
  buildElevationPolylineSegments,
  elevationBandRatio,
  quantizeElevationBand,
} from './elevation.ts';

export type {
  ElevationPolylineOptions,
  ElevationPolylinePath,
  ElevationPolylineSegment,
  PerformanceLatLng,
} from './elevation.ts';

export {
  downsampleForCanvas,
  downsampleMinMaxIndices,
  downsampleTrackForCanvas,
} from './downsample.ts';

export type { NumericAccessor } from './downsample.ts';

export {
  planKeyedWaypointDiff,
  planWaypointDiff,
} from './waypointDiff.ts';

export type {
  KeyedWaypoint,
  WaypointDiffAdd,
  WaypointDiffKeep,
  WaypointDiffPlan,
  WaypointDiffRemove,
  WaypointDiffUpdate,
  WaypointEquality,
  WaypointKey,
  WaypointKeySelector,
} from './waypointDiff.ts';

export {
  createTrackRevision,
  createTrackSignature,
  nextTrackRevision,
} from './trackRevision.ts';

export type {
  TrackRevision,
  TrackRevisionResult,
} from './trackRevision.ts';
