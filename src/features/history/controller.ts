import type { RuntimeContext } from '../../app/runtime/context.ts';
import {
  createProjectArchive,
  type ProjectArchive,
  type ProjectArchiveTrail,
} from '../../core/projectArchive.ts';
import { applyProjectArchive } from '../project/archive-controller.ts';

export type ProjectHistoryEvent =
  | {type:'history.changed'; undoCount: number; redoCount: number}
  | {type:'history.applied'; direction: 'undo' | 'redo'; label: string};

export interface ProjectHistoryControllerDependencies {
  appVersion: string;
  persist: () => void;
  render: () => void;
  beforeApply?: () => void;
  onEvent?: (event: ProjectHistoryEvent) => void;
  maxEntries?: number;
}

interface ProjectHistoryEntry<TTrail extends ProjectArchiveTrail> {
  label: string;
  before: ProjectArchive<TTrail>;
  after: ProjectArchive<TTrail>;
}

export interface ProjectHistoryController<TTrail extends ProjectArchiveTrail> {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undoLabel: string | null;
  readonly redoLabel: string | null;
  readonly undoCount: number;
  readonly redoCount: number;
  capture: () => ProjectArchive<TTrail>;
  commit: (label: string, before: ProjectArchive<TTrail>) => boolean;
  execute: <TResult>(label: string, operation: () => TResult) => TResult;
  undo: () => boolean;
  redo: () => boolean;
  clear: () => void;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return !!value && (typeof value === 'object' || typeof value === 'function')
    && typeof (value as PromiseLike<unknown>).then === 'function';
}

/** Records durable project edits while excluding transient map and panel state. */
export function createProjectHistoryController<TTrail extends ProjectArchiveTrail>(
  context: RuntimeContext<TTrail>,
  dependencies: ProjectHistoryControllerDependencies,
): ProjectHistoryController<TTrail> {
  const undoEntries: ProjectHistoryEntry<TTrail>[] = [];
  const redoEntries: ProjectHistoryEntry<TTrail>[] = [];
  const maxEntries = Math.max(1, Math.trunc(dependencies.maxEntries ?? 30));
  let applying = false;
  const emitChanged = (): void => dependencies.onEvent?.({
    type:'history.changed', undoCount:undoEntries.length, redoCount:redoEntries.length,
  });
  const capture = (): ProjectArchive<TTrail> => createProjectArchive({
    project:context.project,
    state:context.state.snapshot(),
    appVersion:dependencies.appVersion,
  }) as ProjectArchive<TTrail>;

  const commit = (label: string, before: ProjectArchive<TTrail>): boolean => {
    if(applying) return false;
    const after = capture();
    const beforeText = JSON.stringify({project:before.project, workspace:before.workspace});
    const afterText = JSON.stringify({project:after.project, workspace:after.workspace});
    if(beforeText === afterText) return false;
    undoEntries.push({label:label.trim() || 'Edit project', before, after});
    if(undoEntries.length > maxEntries) undoEntries.splice(0, undoEntries.length - maxEntries);
    redoEntries.length = 0;
    emitChanged();
    return true;
  };

  const rollbackFailedOperation = (before: ProjectArchive<TTrail>): void => {
    applying = true;
    try {
      applyProjectArchive(context, before);
      dependencies.persist();
      dependencies.render();
    } finally {
      applying = false;
    }
  };

  const execute = <TResult>(label: string, operation: () => TResult): TResult => {
    if(applying) return operation();
    const before = capture();
    let result: TResult;
    try {
      result = operation();
    } catch(error) {
      rollbackFailedOperation(before);
      throw error;
    }
    if(isPromiseLike(result)) {
      return Promise.resolve(result).then(value => {
        commit(label, before);
        return value;
      }, error => {
        rollbackFailedOperation(before);
        throw error;
      }) as TResult;
    }
    commit(label, before);
    return result;
  };

  const applyEntry = (entry: ProjectHistoryEntry<TTrail>, direction: 'undo' | 'redo'): boolean => {
    if(applying) return false;
    applying = true;
    try {
      dependencies.beforeApply?.();
      applyProjectArchive(context, direction === 'undo' ? entry.before : entry.after);
      dependencies.persist();
      dependencies.render();
      dependencies.onEvent?.({type:'history.applied', direction, label:entry.label});
      return true;
    } finally {
      applying = false;
    }
  };

  const undo = (): boolean => {
    const entry = undoEntries.at(-1);
    if(!entry || !applyEntry(entry, 'undo')) return false;
    undoEntries.pop();
    redoEntries.push(entry);
    emitChanged();
    return true;
  };

  const redo = (): boolean => {
    const entry = redoEntries.at(-1);
    if(!entry || !applyEntry(entry, 'redo')) return false;
    redoEntries.pop();
    undoEntries.push(entry);
    emitChanged();
    return true;
  };

  const clear = (): void => {
    if(!undoEntries.length && !redoEntries.length) return;
    undoEntries.length = 0;
    redoEntries.length = 0;
    emitChanged();
  };

  return Object.freeze({
    get canUndo() { return undoEntries.length > 0; },
    get canRedo() { return redoEntries.length > 0; },
    get undoLabel() { return undoEntries.at(-1)?.label ?? null; },
    get redoLabel() { return redoEntries.at(-1)?.label ?? null; },
    get undoCount() { return undoEntries.length; },
    get redoCount() { return redoEntries.length; },
    capture,
    commit,
    execute,
    undo,
    redo,
    clear,
  });
}
