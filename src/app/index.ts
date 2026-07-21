export { createAppState, toggleSetItem } from './state.ts';
export {
  AppStateStore,
  createAppStateStore,
  type AppStateChangedEvent,
  type AppStateCommand,
  type AppStateListener,
  type DisplayOption,
} from './state-store.ts';
export {
  createRuntimeContext,
  type RuntimeContext,
  type RuntimeProject,
} from './runtime/context.ts';
export {
  createTrailController,
  type MutableTrail,
  type MutableTrailPoint,
  type MutableTrailStats,
  type MutableTrailWaypoint,
  type TrailController,
  type TrailControllerDependencies,
} from '../features/trails/controller.ts';
export {
  createMeasureController,
  createMeasureInteractionState,
  resetMeasureInteraction,
  reverseMeasureInteraction,
  updateMeasureEndpoint,
  type MeasureController,
  type MeasureInteractionState,
} from '../features/measure/controller.ts';
export {
  clearDayPreviewState,
  createDayPreviewController,
  createDayPreviewInteractionState,
  type DayPreviewController,
  type DayPreviewInteractionState,
  type DayPreviewPlan,
  type DayPreviewTrail,
} from '../features/itinerary/controller.ts';
export {
  createSegmentController,
  createSegmentInteractionState,
  type SegmentApplyResult,
  type SegmentController,
  type SegmentControllerDependencies,
  type SegmentEditReason,
  type SegmentEditResult,
  type SegmentInteractionState,
  type SegmentTrail,
  type SegmentTrailWaypoint,
} from '../features/segment/controller.ts';
export {
  createEscapeController,
  createEscapeInteractionState,
  type EscapeController,
  type EscapeControllerDependencies,
  type EscapeInteractionState,
  type EscapeTrail,
} from '../features/escape/controller.ts';
export { createElevationDockState, toggleElevationDock } from '../features/elevation/controller.ts';
export {
  createLeafletMarkerRenderer,
  createLeafletTrackRenderer,
  upsertLeafletPolyline,
  type LeafletMarkerDiffStats,
  type LeafletMarkerRenderer,
  type LeafletTrackRenderer,
} from '../adapters/leaflet.ts';
export {
  createMapRenderController,
  buildTrackRenderModel,
  elevationTrackColor,
  type BuildTrackRenderModelOptions,
  type TrackPolylineRenderModel,
  type TrackRenderModel,
  type TrackRenderTrail,
  type MapRenderController,
} from '../features/map/render-model.ts';
export {
  buildHighPointMarkerModel,
  buildWaypointMarkerModel,
  createMarkerRenderController,
  type LeafletMarkerRenderModel,
  type WaypointRenderRecord,
  type WaypointRenderTrail,
  type MarkerRenderController,
  type MarkerRenderScene,
} from '../features/waypoint/render-model.ts';
export {
  buildElevationCanvasScene,
  estimateElevationPanelHeightForPoints,
  type BuildElevationCanvasSceneOptions,
  type ElevationCanvasScene,
} from '../features/elevation/render-model.ts';
export {
  createElevationCanvasRenderer,
  type ElevationCanvasDimensions,
  type ElevationCanvasRenderer,
} from '../adapters/elevation-canvas.ts';
export { executeIndexedDbOperation } from '../adapters/indexedDb.ts';
export { openIndexedDbDatabase } from '../adapters/indexedDb.ts';
export {
  createBrowserFileAdapter,
  createFileArchiveAdapter,
  renderDayElevationChart,
  type BrowserFileAdapter,
  type BrowserFileEnvironment,
  type FileArchiveAdapter,
  type FflateCodec,
} from '../adapters/file.ts';
export {
  createStorageController,
  type StorageController,
  type StorageControllerDependencies,
  type StorageControllerEvent,
} from '../features/storage/controller.ts';
export {
  createFileImportController,
  type AddTrailResult,
  type FileImportController,
  type FileImportControllerDependencies,
  type FileImportEvent,
  type ImportFileLike,
  type ImportTrail,
  type RenameTrailResult,
} from '../features/files/import-controller.ts';
export {
  createFileExportController,
  type FileExportController,
  type FileExportControllerDependencies,
  type FileExportEvent,
  type FileExportResult,
} from '../features/files/export-controller.ts';
export {
  createProjectArchiveController,
  type ProjectArchiveController,
  type ProjectArchiveControllerDependencies,
  type ProjectArchiveEvent,
} from '../features/project/archive-controller.ts';
export {
  createWaypointController,
  type ManualWaypointAnchor,
  type WaypointController,
  type WaypointControllerDependencies,
  type WaypointControllerState,
  type WaypointRecord,
  type WaypointTrackPoint,
  type WaypointTrail,
} from '../features/waypoint/controller.ts';
export {
  CommandRegistry,
  STUDIO_COMMANDS,
  type CommandRegistryEvent,
  type CommandState,
  type StudioCommandId,
} from './command.ts';
export * from './interactions/index.ts';
export * from './rendering/index.ts';
export {
  createDialogController,
  DialogController,
  type ContentDialogAction,
  type ContentDialogOptions,
  type ContentDialogProgress,
  type ContentDialogRow,
  type ContentDialogSection,
  type ContentDialogSize,
  type ContentTone,
} from '../ui/dialog/index.ts';
export {
  TRANSLATIONS,
  resolveLocalizationLanguage,
  translateMessage,
  type LocalizationLanguage,
  type TranslationCatalog,
} from '../features/localization/translations.ts';
export {
  CHANGELOG,
  buildChangelogDialogModel,
  type ChangelogEntry,
} from '../features/localization/changelog.ts';
export { buildHelpDialogModel } from '../features/localization/help.ts';
export {
  buildStorageDialogModel,
  type StorageInfoSnapshot,
} from '../features/localization/storage-content.ts';
export { shouldCloseSidebarForFit } from '../ui/layout/workbench.ts';
