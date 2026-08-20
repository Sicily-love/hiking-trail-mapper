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
  downsampleTrackForMap,
  mapLabelBudgetForZoom,
  planMapLabelVisibility,
  resolveMapRenderPolicy,
} from './map-rendering.ts';

export type {
  MapLabelCandidate,
  MapLabelLayout,
  MapRenderCapabilities,
  MapRenderLoad,
  MapRenderPolicy,
  MapRenderTier,
} from './map-rendering.ts';

export {
  planKeyedWaypointDiff,
  planWaypointDiff,
} from './waypoint-diff.ts';

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
} from './waypoint-diff.ts';

export {
  createTrackRevision,
  createTrackSignature,
  nextTrackRevision,
} from './track-revision.ts';

export type {
  TrackRevision,
  TrackRevisionResult,
} from './track-revision.ts';

export {
  interactionHitTargetSize,
  isPointerTap,
  planResetTransition,
  pointerTapThreshold,
} from './interaction.ts';

export type {
  PointerTapSample,
  ResetTransitionInput,
  ResetTransitionPlan,
  StudioPointerType,
} from './interaction.ts';
