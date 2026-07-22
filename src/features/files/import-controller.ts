import type { RuntimeContext } from '../../app/runtime/context.ts';

export interface ImportFileLike {
  name: string;
  text: () => Promise<string>;
  arrayBuffer?: () => Promise<ArrayBuffer>;
  _fromZip?: string;
}

export interface ImportTrail {
  id: string;
  name: string;
  track: unknown[];
  waypoints: unknown[];
  stats: {distance_km: number; ascent_m: number; [key: string]: unknown};
  group?: string | null;
  color?: string;
  source?: string;
  _contentHash?: string;
  [key: string]: unknown;
}

export type FileImportEvent =
  | {type:'archive.expanded'; archiveName: string; count: number}
  | {type:'archive.empty'; archiveName: string}
  | {type:'archive.failed'; archiveName: string; error: unknown};

export type AddTrailResult<TTrail extends ImportTrail> =
  | {status:'added'; trail: TTrail}
  | {status:'duplicate'; trail: TTrail; duplicate: TTrail};

export type RenameTrailResult<TTrail extends ImportTrail> =
  | {status:'renamed'; trail: TTrail; oldId: string; newId: string}
  | {status:'missing' | 'empty' | 'duplicate' | 'unchanged'};

export interface FileImportControllerDependencies<TTrail extends ImportTrail> {
  contentHash: (trail: TTrail) => string;
  unzip: (bytes: Uint8Array) => Record<string, Uint8Array>;
  decode: (bytes: Uint8Array) => string;
  palette: readonly string[];
  onEvent?: (event: FileImportEvent) => void;
  commit: () => void;
  resetView: () => void;
}

export interface FileImportController<TTrail extends ImportTrail> {
  expandFiles: (files: Iterable<ImportFileLike>) => Promise<ImportFileLike[]>;
  findDuplicate: (trail: TTrail) => TTrail | null;
  ensureUniqueId: (trail: TTrail) => string;
  addTrail: (trail: TTrail) => AddTrailResult<TTrail>;
  renameTrail: (oldId: string, requestedId: string) => RenameTrailResult<TTrail>;
  updateSource: (trailId: string, source: string) => boolean;
  finalizeImport: (addedCount: number) => boolean;
}

function isKmlArchive(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.zip') || lower.endsWith('.kml.zip');
}

function isVisibleKmlPath(path: string): boolean {
  return path.toLowerCase().endsWith('.kml')
    && !path.startsWith('__MACOSX/')
    && !path.split('/').some(segment => segment.startsWith('.'));
}

/** Owns archive expansion and project-level import mutations without DOM access. */
export function createFileImportController<TTrail extends ImportTrail>(
  context: RuntimeContext<TTrail>,
  dependencies: FileImportControllerDependencies<TTrail>,
): FileImportController<TTrail> {
  if(!dependencies.palette.length) throw new TypeError('FileImportController requires a color palette');
  const emit = (event: FileImportEvent): void => dependencies.onEvent?.(event);

  const expandFiles = async (files: Iterable<ImportFileLike>): Promise<ImportFileLike[]> => {
    const expanded: ImportFileLike[] = [];
    for(const file of files) {
      if(!isKmlArchive(file.name)) {
        expanded.push(file);
        continue;
      }
      try {
        if(typeof file.arrayBuffer !== 'function') throw new TypeError('Archive file cannot be read');
        const entries = dependencies.unzip(new Uint8Array(await file.arrayBuffer()));
        let count = 0;
        for(const [path, bytes] of Object.entries(entries)) {
          if(!isVisibleKmlPath(path)) continue;
          const text = dependencies.decode(bytes);
          expanded.push({
            name:path.split('/').pop() || path,
            _fromZip:file.name,
            text:async () => text,
          });
          count += 1;
        }
        emit(count
          ? {type:'archive.expanded', archiveName:file.name, count}
          : {type:'archive.empty', archiveName:file.name});
      } catch(error) {
        emit({type:'archive.failed', archiveName:file.name, error});
      }
    }
    return expanded;
  };

  const findDuplicate = (trail: TTrail): TTrail | null => {
    const hash = dependencies.contentHash(trail);
    const duplicate = context.projectSelectors.trails().find(existing => {
      const existingHash = existing._contentHash || dependencies.contentHash(existing);
      return existingHash === hash;
    });
    if(duplicate) return duplicate;
    trail._contentHash = hash;
    return null;
  };

  const ensureUniqueId = (trail: TTrail): string => {
    const baseId = trail.id;
    let nextId = baseId;
    let suffix = 0;
    while(context.projectSelectors.trails().some(existing => existing.id === nextId)) {
      suffix += 1;
      nextId = `${baseId}-${suffix}`;
    }
    trail.id = nextId;
    return nextId;
  };

  const addTrail = (trail: TTrail): AddTrailResult<TTrail> => {
    const duplicate = findDuplicate(trail);
    if(duplicate) return {status:'duplicate', trail, duplicate};
    ensureUniqueId(trail);
    trail.color = dependencies.palette[context.projectSelectors.trailCount() % dependencies.palette.length];
    if(!trail.group) trail.group = context.stateSelectors.activeGroup() || '默认';
    context.projectActions.addTrail(trail, 'trail.import');
    context.stateActions.setTrailActive(trail.id, true);
    return {status:'added', trail};
  };

  const renameTrail = (oldId: string, requestedId: string): RenameTrailResult<TTrail> => {
    const trail = context.projectSelectors.trailById(oldId);
    if(!trail) return {status:'missing'};
    const newId = requestedId.trim();
    if(!newId) return {status:'empty'};
    if(newId === oldId) return {status:'unchanged'};
    if(context.projectSelectors.trails().some(candidate => candidate !== trail && candidate.id === newId)) {
      return {status:'duplicate'};
    }
    context.projectActions.mutateTrail(oldId, 'trail.rename-id', candidate => { candidate.id = newId; });
    context.stateActions.renameTrailId(oldId, newId);
    dependencies.commit();
    return {status:'renamed', trail, oldId, newId};
  };

  const updateSource = (trailId: string, source: string): boolean => {
    const trail = context.projectSelectors.trailById(trailId);
    if(!trail) return false;
    context.projectActions.mutateTrail(trailId, 'trail.source', candidate => {
      candidate.source = source.trim();
    });
    dependencies.commit();
    return true;
  };

  const finalizeImport = (addedCount: number): boolean => {
    if(addedCount <= 0) return false;
    context.stateActions.setActiveEscape(null);
    dependencies.commit();
    dependencies.resetView();
    return true;
  };

  return Object.freeze({
    expandFiles,
    findDuplicate,
    ensureUniqueId,
    addTrail,
    renameTrail,
    updateSource,
    finalizeImport,
  });
}
