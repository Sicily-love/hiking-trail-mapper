import type { RuntimeContext } from '../../app/runtime/context.ts';
import type { BrowserFileAdapter } from '../../adapters/file.ts';
import {
  PROJECT_ARCHIVE_EXTENSION,
  PROJECT_ARCHIVE_MIME,
  createProjectArchive,
  parseProjectArchive,
  serializeProjectArchive,
  type ProjectArchive,
  type ProjectArchiveParseResult,
  type ProjectArchiveTrail,
} from '../../core/projectArchive.ts';
import { sanitizeExportFilename } from '../../core/export.ts';

export type ProjectArchiveEvent =
  | {type:'project-archive.exported'; filename: string; trailCount: number}
  | {type:'project-archive.restored'; title: string; trailCount: number}
  | {type:'project-archive.failed'; operation: 'export' | 'parse'; message: string};

export interface ProjectArchiveControllerDependencies {
  files: BrowserFileAdapter;
  appVersion: string;
  now?: () => Date;
  commit: () => void;
  resetView: () => void | Promise<unknown>;
  onEvent?: (event: ProjectArchiveEvent) => void;
}

export interface ProjectArchiveController<TTrail extends ProjectArchiveTrail> {
  exportProject: () => Promise<{status:'exported'; filename: string} | {status:'failed'; error: unknown}>;
  parse: (text: string) => ProjectArchiveParseResult<TTrail>;
  restore: (archive: ProjectArchive<TTrail>) => {status:'restored'; trailCount: number};
}

/** Owns complete project exchange while runtime retains only file selection and confirmation UI. */
export function createProjectArchiveController<TTrail extends ProjectArchiveTrail>(
  context: RuntimeContext<TTrail>,
  dependencies: ProjectArchiveControllerDependencies,
): ProjectArchiveController<TTrail> {
  const now = dependencies.now || (() => new Date());
  const emit = (event: ProjectArchiveEvent): void => dependencies.onEvent?.(event);

  const exportProject = async () => {
    try {
      const date = now();
      const archive = createProjectArchive({
        project:context.project,
        state:context.state.snapshot(),
        appVersion:dependencies.appVersion,
        exportedAt:date.toISOString(),
      });
      const filename = `${sanitizeExportFilename(context.project.title, 'outdoor-route-project')}_${date.toISOString().slice(0, 10)}${PROJECT_ARCHIVE_EXTENSION}`;
      await dependencies.files.saveText(
        serializeProjectArchive(archive),
        filename,
        PROJECT_ARCHIVE_MIME,
        PROJECT_ARCHIVE_EXTENSION,
      );
      emit({type:'project-archive.exported', filename, trailCount:archive.project.trails.length});
      return {status:'exported' as const, filename};
    } catch(error) {
      emit({
        type:'project-archive.failed',
        operation:'export',
        message:error instanceof Error ? error.message : String(error),
      });
      return {status:'failed' as const, error};
    }
  };

  const parse = (text: string): ProjectArchiveParseResult<TTrail> => {
    const result = parseProjectArchive(text) as ProjectArchiveParseResult<TTrail>;
    if(!result.ok) emit({type:'project-archive.failed', operation:'parse', message:result.message});
    return result;
  };

  const restore = (archive: ProjectArchive<TTrail>) => {
    context.project.title = archive.project.title;
    context.project.calc_method = archive.project.calc_method;
    context.project.trails.splice(0, context.project.trails.length, ...archive.project.trails);
    const workspace = archive.workspace;
    context.state.dispatch({
      type:'workspace.restore',
      activeTrails:workspace.activeTrails,
      activeGroup:workspace.activeGroup,
      primaryByGroup:workspace.primaryByGroup,
      mode:workspace.mode,
      modeVisibleTags:workspace.modeVisibleTags,
      waypointModeTags:workspace.waypointModeTags,
      display:{
        showTrack:workspace.showTrack,
        showLabel:workspace.showLabel,
        showHighPoint:workspace.showHighPoint,
      },
      baseLayer:workspace.baseLayer,
      autoGenerateEscape:workspace.autoGenerateEscape,
    });
    dependencies.commit();
    void dependencies.resetView();
    emit({type:'project-archive.restored', title:archive.project.title, trailCount:archive.project.trails.length});
    return {status:'restored' as const, trailCount:archive.project.trails.length};
  };

  return Object.freeze({exportProject, parse, restore});
}
