import type {RuntimeContext} from '../../app/runtime/context.ts';
import {openIndexedDbDatabase, executeIndexedDbOperation} from '../../adapters/indexed-db.ts';
import {createStorageController, type StorageControllerEvent} from './controller.ts';
import type {RuntimeTrackPoint} from '../../app/runtime/types.ts';

export interface RuntimeStorageTrail {
  id: string;
  track: RuntimeTrackPoint[];
  track_breaks?: number[];
  stats?: {descent_m?: number; [name: string]: unknown};
  _descCum?: number[];
  waypoints?: unknown[];
  escape_routes?: unknown[];
  [name: string]: unknown;
}

export interface RuntimeStorageOwnerDependencies<TTrail extends RuntimeStorageTrail> {
  context: RuntimeContext<TTrail, unknown>;
  indexedDB: IDBFactory;
  activeGroup(): string | null;
  autoGenerateEscape(): boolean;
  computeSegmentedMetrics(track: RuntimeTrackPoint[], breaks: number[]): {cumulativeDescentM: number[]};
  computeDescent(elevations: number[]): number[];
  buildEscapeRoutes(waypoints: unknown[], points: Array<{lat:number; lng:number; elev:number}>, others: TTrail[]): unknown[];
  replaceTrails(trails: TTrail[]): void;
  restoreWorkspace(workspace: {
    activeTrails: Iterable<string>;
    activeGroup: string | null;
    primaryByGroup: Record<string, string | null>;
  }): void;
  notify(message: string, type?: 'info' | 'error', durationMs?: number): void;
  warn(message: string, error: unknown): void;
}

export interface RuntimeStorageOwner {
  open(): Promise<IDBDatabase>;
  scheduleSave(): void;
  flush(): Promise<boolean>;
  load(): Promise<boolean>;
  clear(): Promise<boolean>;
  dispose(): void;
}

/** Owns persistence, legacy cache migration, and restoration as one typed boundary. */
export function createRuntimeStorageOwner<TTrail extends RuntimeStorageTrail>(
  dependencies: RuntimeStorageOwnerDependencies<TTrail>,
): RuntimeStorageOwner {
  let unavailableWarningShown = false;
  const onEvent = (event: StorageControllerEvent<TTrail>): void => {
    if(event.type === 'storage.saved') {
      dependencies.notify(`✓ 已自动保存（${event.trailCount} 条轨迹）`);
    } else if(event.type === 'storage.quota-exceeded') {
      dependencies.notify(`❌ 存储已满（${event.trailCount} 条轨迹）。请删除部分后重试`, 'error', 5000);
    } else if(event.type === 'storage.unavailable') {
      dependencies.warn('storage unavailable:', event.error);
      if(!unavailableWarningShown) {
        unavailableWarningShown = true;
        const detail = event.error instanceof Error ? `：${event.error.message}` : '';
        dependencies.notify(`ℹ 当前环境不支持自动保存${detail}`, 'info', 5000);
      }
    } else if(event.type === 'storage.failed') {
      dependencies.warn(`${event.operation} failed:`, event.error);
    }
  };

  const controller = createStorageController(dependencies.context, {
    openDatabase:() => openIndexedDbDatabase(dependencies.indexedDB, 'hiking_trail_db', 1, ['trails']),
    execute:executeIndexedDbOperation,
    storeName:'trails',
    dataKey:'main',
    onEvent,
  });

  const load = async (): Promise<boolean> => {
    const restored = await controller.load(dependencies.activeGroup());
    if(!restored) return false;
    try {
      const trails = restored.trails;
      for(const trail of trails) {
        const track = trail.track || [];
        const segmented = track.length && trail.track_breaks?.length
          ? dependencies.computeSegmentedMetrics(track, trail.track_breaks)
          : null;
        if(trail.stats && trail.stats.descent_m == null && track.length) {
          const descent = segmented?.cumulativeDescentM
            || dependencies.computeDescent(track.map(point => Number(point[2]) || 0));
          trail.stats.descent_m = Math.round(descent.at(-1) || 0);
        }
        if(!trail._descCum && track.length) {
          trail._descCum = segmented?.cumulativeDescentM
            || dependencies.computeDescent(track.map(point => Number(point[2]) || 0));
        }
        if(dependencies.autoGenerateEscape() && !trail.escape_routes?.length && trail.waypoints?.length && track.length) {
          const points = track.map(point => ({lat:point[0], lng:point[1], elev:Number(point[2]) || 0}));
          trail.escape_routes = dependencies.buildEscapeRoutes(
            trail.waypoints,
            points,
            trails.filter(candidate => candidate.id !== trail.id),
          );
        }
      }
      dependencies.replaceTrails(trails);
      dependencies.restoreWorkspace({
        activeTrails:restored.activeTrails,
        activeGroup:restored.activeGroup,
        primaryByGroup:restored.primaryByGroup,
      });
      return true;
    } catch(error) {
      dependencies.warn('load failed:', error);
      return false;
    }
  };

  return Object.freeze({
    open:controller.open,
    scheduleSave:controller.scheduleSave,
    flush:controller.flush,
    load,
    clear:controller.clear,
    dispose:controller.dispose,
  });
}
