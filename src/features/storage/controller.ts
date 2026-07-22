import type { RuntimeContext } from '../../app/runtime/context.ts';
import {
  buildStorageDeleteOperation,
  buildStorageReadOperation,
  buildStorageWriteOperation,
  restoreStorageSnapshot,
} from '../../core/storage.ts';
import type {
  IndexedDbStorageOperation,
  PersistedStorageSnapshot,
  RestoredStorageState,
  StorageTrailLike,
} from '../../core/types.ts';

export type StorageControllerEvent<TTrail extends StorageTrailLike = StorageTrailLike> =
  | {type:'storage.saved'; trailCount: number}
  | {type:'storage.loaded'; trailCount: number}
  | {type:'storage.cleared'}
  | {type:'storage.quota-exceeded'; trailCount: number; error: unknown}
  | {type:'storage.unavailable'; error: unknown}
  | {type:'storage.failed'; operation: 'load' | 'clear'; error: unknown}
  | {type:'storage.snapshot'; snapshot: RestoredStorageState<TTrail>};

export interface StorageControllerDependencies<TTrail extends StorageTrailLike & {id: string}> {
  openDatabase: () => Promise<IDBDatabase>;
  execute: <T>(db: IDBDatabase, operation: IndexedDbStorageOperation<T>) => Promise<T | undefined>;
  onEvent?: (event: StorageControllerEvent<TTrail>) => void;
  setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (handle: ReturnType<typeof setTimeout>) => void;
  saveDelayMs?: number;
  storeName?: string;
  dataKey?: string;
}

export interface StorageController<TTrail extends StorageTrailLike & {id: string}> {
  readonly available: boolean;
  open: () => Promise<IDBDatabase>;
  scheduleSave: () => void;
  flush: () => Promise<boolean>;
  load: (currentActiveGroup?: string | null) => Promise<RestoredStorageState<TTrail> | null>;
  clear: () => Promise<boolean>;
  dispose: () => void;
}

function isQuotaError(error: unknown): boolean {
  return (typeof DOMException !== 'undefined' && error instanceof DOMException)
    ? error.name === 'QuotaExceededError'
    : !!error && typeof error === 'object' && 'name' in error && error.name === 'QuotaExceededError';
}

/** Owns IndexedDB lifecycle and snapshot persistence without DOM dependencies. */
export function createStorageController<TTrail extends StorageTrailLike & {id: string}>(
  context: RuntimeContext<TTrail>,
  dependencies: StorageControllerDependencies<TTrail>,
): StorageController<TTrail> {
  const emit = (event: StorageControllerEvent<TTrail>): void => dependencies.onEvent?.(event);
  const setTimer = dependencies.setTimer || ((callback, delayMs) => setTimeout(callback, delayMs));
  const clearTimer = dependencies.clearTimer || (handle => clearTimeout(handle));
  const config = {storeName:dependencies.storeName, dataKey:dependencies.dataKey};
  const saveDelayMs = dependencies.saveDelayMs ?? 300;
  let databasePromise: Promise<IDBDatabase> | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let available = true;
  let disposed = false;

  const open = (): Promise<IDBDatabase> => {
    if(disposed) return Promise.reject(new Error('StorageController is disposed'));
    if(!available) return Promise.reject(new Error('IndexedDB is unavailable'));
    if(!databasePromise) {
      databasePromise = dependencies.openDatabase().catch(error => {
        available = false;
        emit({type:'storage.unavailable', error});
        throw error;
      });
    }
    return databasePromise;
  };

  const flush = async (): Promise<boolean> => {
    if(disposed || !available) return false;
    if(saveTimer !== null) {
      clearTimer(saveTimer);
      saveTimer = null;
    }
    try {
      const db = await open();
      const trails = context.projectSelectors.trails();
      const operation = buildStorageWriteOperation([...trails], context.stateSelectors.snapshot(), config);
      await dependencies.execute(db, operation);
      emit({type:'storage.saved', trailCount:trails.length});
      return true;
    } catch(error) {
      if(isQuotaError(error)) {
        emit({type:'storage.quota-exceeded', trailCount:context.projectSelectors.trailCount(), error});
      } else if(available) {
        available = false;
        emit({type:'storage.unavailable', error});
      }
      return false;
    }
  };

  const scheduleSave = (): void => {
    if(disposed) return;
    if(saveTimer !== null) clearTimer(saveTimer);
    saveTimer = setTimer(() => {
      saveTimer = null;
      void flush();
    }, saveDelayMs);
  };

  const load = async (currentActiveGroup?: string | null): Promise<RestoredStorageState<TTrail> | null> => {
    if(disposed || !available) return null;
    try {
      const db = await open();
      const operation = buildStorageReadOperation(config);
      const snapshot = await dependencies.execute<PersistedStorageSnapshot<TTrail>>(
        db,
        operation as IndexedDbStorageOperation<PersistedStorageSnapshot<TTrail>>,
      );
      const restored = restoreStorageSnapshot(snapshot, {currentActiveGroup});
      if(!restored.ok) return null;
      emit({type:'storage.snapshot', snapshot:restored});
      emit({type:'storage.loaded', trailCount:restored.trails.length});
      return restored;
    } catch(error) {
      emit({type:'storage.failed', operation:'load', error});
      return null;
    }
  };

  const clear = async (): Promise<boolean> => {
    if(disposed || !available) return false;
    try {
      const db = await open();
      await dependencies.execute(db, buildStorageDeleteOperation(config));
      emit({type:'storage.cleared'});
      return true;
    } catch(error) {
      emit({type:'storage.failed', operation:'clear', error});
      return false;
    }
  };

  const dispose = (): void => {
    if(disposed) return;
    disposed = true;
    if(saveTimer !== null) clearTimer(saveTimer);
    saveTimer = null;
  };

  return Object.freeze({
    get available() { return available; },
    open,
    scheduleSave,
    flush,
    load,
    clear,
    dispose,
  });
}
