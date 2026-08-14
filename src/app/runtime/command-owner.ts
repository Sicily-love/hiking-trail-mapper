import {STUDIO_COMMANDS, type CommandRegistry} from '../command.ts';

type Execute = () => unknown;

export interface RuntimeCommandDependencies {
  registry: CommandRegistry<void>;
  trailCount(): number;
  hasPrimaryTrail(): boolean;
  interactionKind(): string;
  mode(): string;
  canUndo(): boolean;
  canRedo(): boolean;
  openImport: Execute;
  exportProject: Execute;
  clearProject: Execute;
  undo: Execute;
  redo: Execute;
  reversePrimary: Execute;
  stitchTrails: Execute;
  toggleMeasure: Execute;
  toggleSegment: Execute;
  toggleWaypoint: Execute;
  toggleEscape: Execute;
  resetMap: Execute;
  showHelp: Execute;
  toggleLanguage: Execute;
  renameWorkspace: Execute;
  cancelInteraction: Execute;
  setElevationMode: Execute;
  setWaypointMode: Execute;
  showGroups: Execute;
  showTrails: Execute;
  showItinerary: Execute;
}

export interface RuntimeCommandOwner {
  readonly disposers: ReadonlyArray<() => void>;
  dispose(): void;
}

/** Registers the one semantic command surface shared by every Workbench entry. */
export function createRuntimeCommandOwner(
  dependencies: RuntimeCommandDependencies,
): RuntimeCommandOwner {
  const {registry} = dependencies;
  const hasTrails = (): boolean => dependencies.trailCount() > 0;
  const register = (
    id: string,
    execute: Execute,
    options: {enabled?: () => boolean; checked?: () => boolean} = {},
  ): (() => void) => registry.register({id, execute, ...options});

  const disposers = [
    register(STUDIO_COMMANDS.FILE_IMPORT, dependencies.openImport),
    register(STUDIO_COMMANDS.FILE_EXPORT, dependencies.exportProject, {enabled:hasTrails}),
    register(STUDIO_COMMANDS.PROJECT_CLEAR, dependencies.clearProject, {enabled:hasTrails}),
    register(STUDIO_COMMANDS.EDIT_UNDO, dependencies.undo, {enabled:dependencies.canUndo}),
    register(STUDIO_COMMANDS.EDIT_REDO, dependencies.redo, {enabled:dependencies.canRedo}),
    register(STUDIO_COMMANDS.TRAIL_REVERSE, dependencies.reversePrimary, {enabled:dependencies.hasPrimaryTrail}),
    register(STUDIO_COMMANDS.TRAIL_STITCH, dependencies.stitchTrails, {enabled:() => dependencies.trailCount() >= 2}),
    register(STUDIO_COMMANDS.MEASURE_TOGGLE, dependencies.toggleMeasure, {
      enabled:dependencies.hasPrimaryTrail,
      checked:() => dependencies.interactionKind() === 'measure',
    }),
    register(STUDIO_COMMANDS.SEGMENT_TOGGLE, dependencies.toggleSegment, {
      enabled:dependencies.hasPrimaryTrail,
      checked:() => dependencies.interactionKind() === 'segment',
    }),
    register(STUDIO_COMMANDS.WAYPOINT_TOGGLE, dependencies.toggleWaypoint, {
      enabled:dependencies.hasPrimaryTrail,
      checked:() => dependencies.interactionKind() === 'waypoint',
    }),
    register(STUDIO_COMMANDS.ESCAPE_TOGGLE, dependencies.toggleEscape, {
      enabled:dependencies.hasPrimaryTrail,
      checked:() => dependencies.interactionKind() === 'escape',
    }),
    register(STUDIO_COMMANDS.MAP_RESET, dependencies.resetMap, {enabled:hasTrails}),
    register(STUDIO_COMMANDS.HELP_OPEN, dependencies.showHelp),
    register(STUDIO_COMMANDS.LANGUAGE_TOGGLE, dependencies.toggleLanguage),
    register(STUDIO_COMMANDS.APP_RENAME, dependencies.renameWorkspace),
    register(STUDIO_COMMANDS.INTERACTION_CANCEL, dependencies.cancelInteraction),
    register(STUDIO_COMMANDS.MODE_ELEVATION, dependencies.setElevationMode, {
      checked:() => dependencies.mode() === 'elev',
    }),
    register(STUDIO_COMMANDS.MODE_WAYPOINT, dependencies.setWaypointMode, {
      checked:() => dependencies.mode() === 'waypoint',
    }),
    register(STUDIO_COMMANDS.WORKSPACE_GROUPS, dependencies.showGroups),
    register(STUDIO_COMMANDS.WORKSPACE_TRAILS, dependencies.showTrails),
    register(STUDIO_COMMANDS.WORKSPACE_ITINERARY, dependencies.showItinerary),
  ];
  registry.notifyChanged();

  let disposed = false;
  return Object.freeze({
    disposers:Object.freeze(disposers.slice()),
    dispose(): void {
      if(disposed) return;
      disposed = true;
      disposers.splice(0).reverse().forEach(dispose => dispose());
    },
  });
}
