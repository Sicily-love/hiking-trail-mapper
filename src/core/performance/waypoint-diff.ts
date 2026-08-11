export type WaypointKey = string | number;

export type KeyedWaypoint = {
  readonly id: WaypointKey;
};

export type WaypointDiffAdd<T, K extends PropertyKey> = {
  readonly key: K;
  readonly next: T;
  readonly nextIndex: number;
};

export type WaypointDiffUpdate<T, K extends PropertyKey> = {
  readonly key: K;
  readonly previous: T;
  readonly next: T;
  readonly previousIndex: number;
  readonly nextIndex: number;
};

export type WaypointDiffRemove<T, K extends PropertyKey> = {
  readonly key: K;
  readonly previous: T;
  readonly previousIndex: number;
};

export type WaypointDiffKeep<T, K extends PropertyKey> = WaypointDiffUpdate<T, K>;

export type WaypointDiffPlan<T, K extends PropertyKey> = {
  readonly add: Array<WaypointDiffAdd<T, K>>;
  readonly update: Array<WaypointDiffUpdate<T, K>>;
  readonly remove: Array<WaypointDiffRemove<T, K>>;
  readonly keep: Array<WaypointDiffKeep<T, K>>;
  readonly changed: boolean;
};

export type WaypointKeySelector<T, K extends PropertyKey> = (waypoint: T, index: number) => K;
export type WaypointEquality<T> = (previous: T, next: T) => boolean;

type IndexedWaypoint<T> = {
  readonly waypoint: T;
  readonly index: number;
};

function shallowEqualObjects<T extends object>(previous: T, next: T): boolean {
  if(Object.is(previous, next)) return true;
  const previousRecord = previous as Record<PropertyKey, unknown>;
  const nextRecord = next as Record<PropertyKey, unknown>;
  const previousKeys = Reflect.ownKeys(previous).filter(key =>
    Object.prototype.propertyIsEnumerable.call(previous, key));
  const nextKeys = Reflect.ownKeys(next).filter(key =>
    Object.prototype.propertyIsEnumerable.call(next, key));
  if(previousKeys.length !== nextKeys.length) return false;
  for(const key of previousKeys) {
    if(!Object.prototype.hasOwnProperty.call(next, key)) return false;
    if(!Object.is(previousRecord[key], nextRecord[key])) return false;
  }
  return true;
}

function indexWaypoints<T, K extends PropertyKey>(
  waypoints: ReadonlyArray<T>,
  keyOf: WaypointKeySelector<T, K>,
  label: 'previous' | 'next',
): Map<K, IndexedWaypoint<T>> {
  const indexed = new Map<K, IndexedWaypoint<T>>();
  for(let index = 0; index < waypoints.length; index++) {
    const waypoint = waypoints[index];
    const key = keyOf(waypoint, index);
    if(typeof key !== 'string' && typeof key !== 'number' && typeof key !== 'symbol') {
      throw new TypeError(`${label} waypoint key at index ${index} must be a property key`);
    }
    if(indexed.has(key)) {
      throw new Error(`${label} waypoints contain duplicate key ${String(key)}`);
    }
    indexed.set(key, { waypoint, index });
  }
  return indexed;
}

/** Plans stable keyed add/update/remove/keep operations without mutating either list. */
export function planKeyedWaypointDiff<T extends object, K extends PropertyKey>(
  previous: ReadonlyArray<T>,
  next: ReadonlyArray<T>,
  keyOf: WaypointKeySelector<T, K>,
  equals: WaypointEquality<T> = shallowEqualObjects,
): WaypointDiffPlan<T, K> {
  const previousByKey = indexWaypoints(previous, keyOf, 'previous');
  const nextByKey = indexWaypoints(next, keyOf, 'next');
  const add: Array<WaypointDiffAdd<T, K>> = [];
  const update: Array<WaypointDiffUpdate<T, K>> = [];
  const remove: Array<WaypointDiffRemove<T, K>> = [];
  const keep: Array<WaypointDiffKeep<T, K>> = [];

  for(const [key, indexedNext] of nextByKey) {
    const nextWaypoint = indexedNext.waypoint;
    const nextIndex = indexedNext.index;
    const old = previousByKey.get(key);
    if(!old) {
      add.push({ key, next: nextWaypoint, nextIndex });
      continue;
    }

    const entry = {
      key,
      previous: old.waypoint,
      next: nextWaypoint,
      previousIndex: old.index,
      nextIndex,
    };
    if(equals(old.waypoint, nextWaypoint)) keep.push(entry);
    else update.push(entry);
  }

  for(const [key, indexedPrevious] of previousByKey) {
    const previousWaypoint = indexedPrevious.waypoint;
    const previousIndex = indexedPrevious.index;
    if(!nextByKey.has(key)) remove.push({ key, previous: previousWaypoint, previousIndex });
  }

  return {
    add,
    update,
    remove,
    keep,
    changed: add.length > 0 || update.length > 0 || remove.length > 0,
  };
}

/** Convenience id-keyed waypoint plan with shallow value equality by default. */
export function planWaypointDiff<T extends KeyedWaypoint & object>(
  previous: ReadonlyArray<T>,
  next: ReadonlyArray<T>,
  equals?: WaypointEquality<T>,
): WaypointDiffPlan<T, T['id']> {
  return planKeyedWaypointDiff(previous, next, waypoint => waypoint.id, equals);
}
