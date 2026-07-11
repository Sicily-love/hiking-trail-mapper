import type {
  PersistedStorageSnapshot,
  IndexedDbStorageConfig,
  IndexedDbStorageOperation,
  NormalizedIndexedDbStorageConfig,
  RestoredStorageState,
  RestoreStorageOptions,
  RuntimeStorageState,
  StorageTrailLike,
} from './types.ts';

const DEFAULT_STORE_NAME = 'trails';
const DEFAULT_DATA_KEY = 'main';

export function storageTrailGroup(trail: StorageTrailLike | null | undefined, fallback = '默认'): string {
  const group = trail?.group;
  return typeof group === 'string' && group.trim() ? group : fallback;
}

function trailId(trail: StorageTrailLike | null | undefined): string | null {
  return typeof trail?.id === 'string' && trail.id ? trail.id : null;
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function normalizePrimaryByGroup(
  primaryByGroup: Record<string, string | null | undefined> | null | undefined,
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  if(!primaryByGroup || typeof primaryByGroup !== 'object') return result;
  Object.keys(primaryByGroup).forEach(group => {
    const value = primaryByGroup[group];
    if(typeof value === 'string' && value) result[group] = value;
    else if(value === null) result[group] = null;
  });
  return result;
}

export function normalizeActiveTrailIds(
  activeTrails: Iterable<string> | null | undefined,
  trails: StorageTrailLike[],
): Set<string> {
  const validIds = new Set(trails.map(trailId).filter((id): id is string => !!id));
  if(activeTrails == null) {
    return validIds;
  }
  return new Set(Array.from(activeTrails).filter(
    (id): id is string => typeof id === 'string' && validIds.has(id),
  ));
}

export function primaryTrailIdForGroup(
  activeGroup: string | null | undefined,
  primaryByGroup: Record<string, string | null | undefined>,
): string | null {
  if(activeGroup == null) return null;
  const value = primaryByGroup[activeGroup];
  return typeof value === 'string' && value ? value : null;
}

export function ensurePrimaryForActiveGroup<TTrail extends StorageTrailLike>(
  trails: TTrail[],
  activeGroup: string | null,
  primaryByGroup: Record<string, string | null>,
): Record<string, string | null> {
  const next = { ...primaryByGroup };
  if(activeGroup == null) return next;
  const currentId = primaryTrailIdForGroup(activeGroup, next);
  const currentIsValid = trails.some(
    trail => trailId(trail) === currentId && storageTrailGroup(trail) === activeGroup,
  );
  if(currentIsValid) return next;
  delete next[activeGroup];
  const first = trails.find(t => storageTrailGroup(t) === activeGroup);
  const id = trailId(first);
  if(id) next[activeGroup] = id;
  return next;
}

export function serializeStorageSnapshot<TTrail extends StorageTrailLike>(
  trails: TTrail[],
  state: RuntimeStorageState,
): PersistedStorageSnapshot<TTrail> {
  return {
    trails,
    primaryTrailId: state.primaryTrailId ?? null,
    primaryByGroup: normalizePrimaryByGroup(state.primaryByGroup),
    activeTrails: Array.from(normalizeActiveTrailIds(state.activeTrails, trails)),
    activeGroup: state.activeGroup ?? null,
  };
}

export function normalizeIndexedDbStorageConfig(
  config: IndexedDbStorageConfig = {},
): NormalizedIndexedDbStorageConfig {
  return {
    storeName: typeof config.storeName === 'string' && config.storeName ? config.storeName : DEFAULT_STORE_NAME,
    dataKey: typeof config.dataKey === 'string' && config.dataKey ? config.dataKey : DEFAULT_DATA_KEY,
  };
}

export function buildStorageReadOperation(
  config: IndexedDbStorageConfig = {},
): IndexedDbStorageOperation {
  const normalized = normalizeIndexedDbStorageConfig(config);
  return {
    kind: 'read',
    mode: 'readonly',
    storeName: normalized.storeName,
    key: normalized.dataKey,
  };
}

export function buildStorageWriteOperation<TTrail extends StorageTrailLike>(
  trails: TTrail[],
  state: RuntimeStorageState,
  config: IndexedDbStorageConfig = {},
): IndexedDbStorageOperation<PersistedStorageSnapshot<TTrail>> {
  const normalized = normalizeIndexedDbStorageConfig(config);
  return {
    kind: 'write',
    mode: 'readwrite',
    storeName: normalized.storeName,
    key: normalized.dataKey,
    value: serializeStorageSnapshot(trails, state),
  };
}

export function buildStorageDeleteOperation(
  config: IndexedDbStorageConfig = {},
): IndexedDbStorageOperation {
  const normalized = normalizeIndexedDbStorageConfig(config);
  return {
    kind: 'delete',
    mode: 'readwrite',
    storeName: normalized.storeName,
    key: normalized.dataKey,
  };
}

export function restoreStorageSnapshot<TTrail extends StorageTrailLike>(
  snapshot: PersistedStorageSnapshot<TTrail> | null | undefined,
  options: RestoreStorageOptions = {},
): RestoredStorageState<TTrail> {
  const empty: RestoredStorageState<TTrail> = {
    ok: false,
    trails: [],
    activeTrails: new Set(),
    activeGroup: null,
    primaryByGroup: {},
    primaryTrailId: null,
  };
  if(!snapshot || !Array.isArray(snapshot.trails) || !snapshot.trails.length) return empty;

  const trails = snapshot.trails;
  const activeTrails = normalizeActiveTrailIds(snapshot.activeTrails, trails);
  const activeGroup = hasOwn(snapshot, 'activeGroup')
    ? snapshot.activeGroup ?? null
    : options.currentActiveGroup ?? storageTrailGroup(trails[0], options.defaultGroup || '默认');

  let primaryByGroup = normalizePrimaryByGroup(snapshot.primaryByGroup);
  if(!Object.keys(primaryByGroup).length && typeof snapshot.primaryTrailId === 'string' && snapshot.primaryTrailId) {
    const group = activeGroup ?? storageTrailGroup(trails[0], options.defaultGroup || '默认');
    primaryByGroup = { [group]: snapshot.primaryTrailId };
  }

  primaryByGroup = ensurePrimaryForActiveGroup(trails, activeGroup, primaryByGroup);
  return {
    ok: true,
    trails,
    activeTrails,
    activeGroup,
    primaryByGroup,
    primaryTrailId: primaryTrailIdForGroup(activeGroup, primaryByGroup),
  };
}

export function removeTrailFromPrimaryByGroup<TTrail extends StorageTrailLike>(
  trailsAfterRemoval: TTrail[],
  primaryByGroup: Record<string, string | null | undefined>,
  removedTrailId: string,
): Record<string, string | null> {
  const next = normalizePrimaryByGroup(primaryByGroup);
  Object.keys(next).forEach(group => {
    if(next[group] !== removedTrailId) return;
    const replacement = trailsAfterRemoval.find(t => storageTrailGroup(t) === group && trailId(t) !== removedTrailId);
    const replacementId = trailId(replacement);
    if(replacementId) next[group] = replacementId;
    else delete next[group];
  });
  return next;
}
