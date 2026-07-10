export type {
  ElevationPoint,
  EnrichedWaypoint,
  LatLng,
  TrackTuple,
  TrailLike,
  TrailStats,
  TrackIndexPoint,
  TrackIndexRange,
  WaypointInput,
  MeasureEndpointLabel,
  MeasureEndpointStateResult,
  MeasureStats,
  SegmentStats,
  DayMeta,
  DayIndexRange,
  DayRangeStats,
  DayRangeTrail,
  ElevationAnnotation,
  ElevationAnnotationLayoutOptions,
  ElevationAnnotationLayoutResult,
  ElevationAnnotationPlacement,
  ElevationAnnotationRenderCommand,
  ElevationAnnotationRenderModel,
  ElevationAnnotationLayout,
  ElevationAxisTick,
  ElevationFillPoint,
  ElevationGridLine,
  ElevationLabelStackEstimate,
  ElevationLabelStackOptions,
  ElevationPanelHeightOptions,
  ElevationLayoutModel,
  ElevationLayoutOptions,
  ElevationPathPoint,
  ElevationRenderModel,
  ElevationAnnotationOptions,
  KmlCoordTuple,
  KmlDataEntry,
  KmlGxTrackInput,
  KmlParsedWaypoint,
  KmlParseModel,
  KmlParseModelInput,
  KmlTrackPoint,
  SegmentCampEdit,
  SegmentCampEdits,
  StorageTrailLike,
  PersistedStorageSnapshot,
  RuntimeStorageState,
  RestoredStorageState,
  RestoreStorageOptions,
  IndexedDbStorageConfig,
  IndexedDbStorageOperation,
  NormalizedIndexedDbStorageConfig,
  SegmentBoundaryMoveReason,
  SegmentBoundaryMoveResult,
  DayPreviewRenderModel,
} from './types.ts';

export {
  computeCumulativeDistance,
  haversine,
  nearestPointIndex,
  pointElevation,
} from './geo.ts';

export {
  accumulatorAscent,
  accumulatorDescent,
  computeTrailStats,
  elevRatioColor,
  smoothElev,
} from './elevation.ts';

export {
  computeElevationPanelHeight,
  computeElevationLayout,
  computeElevationRenderModel,
  estimateElevationLabelStackDepth,
  collectElevationAnnotations,
  layoutElevationAnnotations,
  buildElevationAnnotationRenderModel,
} from './elevationProfile.ts';

export {
  enrichWaypoints,
  generateNextTrailId,
  trailContentHash,
} from './trail.ts';

export {
  buildKmlParseModel,
  extractKmlImageUrl,
  kmlCoordsToTrackPoints,
  normalizeKmlTitle,
  parseGxCoordText,
  parseKmlCoordinateText,
  shortKmlLabel,
} from './kml.ts';

export {
  buildTrackLatLngs,
  clampTrackIndex,
  applyMeasureEndpointState,
  computeMeasureStats,
  computeSegmentStats,
  normalizeTrackIndexRange,
  pointFromTrackIndex,
  reverseMeasureEndpoints,
} from './measure.ts';

export {
  buildDayMetaFromSegments,
  buildDayMetaFromTrackDays,
  computeDayRangeStats,
  deleteSegmentDay,
  getDayIndexRange,
  insertSegmentPoint,
  moveSegmentBoundary,
  normalizeSegmentIndexes,
  renumberCampEditsForDelete,
  renumberCampEditsForInsert,
  restoreSegmentIndexes,
  segmentHasExplicitDayIds,
  segmentIndexesFromDayIds,
  segmentIndexesFromDayMeta,
  segmentIndexesToPoints,
} from './itinerary.ts';

export {
  buildMeasureSegmentRenderModel,
  buildSegmentLayerModel,
  buildDayPreviewRenderModel,
} from './render.ts';

export {
  buildStorageDeleteOperation,
  buildStorageReadOperation,
  buildStorageWriteOperation,
  ensurePrimaryForActiveGroup,
  normalizeIndexedDbStorageConfig,
  normalizeActiveTrailIds,
  normalizePrimaryByGroup,
  primaryTrailIdForGroup,
  removeTrailFromPrimaryByGroup,
  restoreStorageSnapshot,
  serializeStorageSnapshot,
  storageTrailGroup,
} from './storage.ts';
