export type MapMode = 'day' | 'elev' | 'waypoint';

export interface TrailSeed {
  id: string;
  group?: string;
}
export interface AppDataSeed {
  trails?: TrailSeed[];
  activeTrails?: Iterable<string>;
}

const DEFAULT_TAGS = {
  day: ['start', 'end', 'camp', 'pass', 'water', 'supply', 'bridge', 'river', 'highpoint'],
  elev: ['start', 'end', 'camp', 'pass', 'water', 'supply', 'bridge', 'river'],
  waypoint: ['camp', 'pass', 'water', 'supply'],
} as const;

export function createAppState(data: AppDataSeed = {}) {
  const trails = data.trails || [];
  const firstGroup = trails[0]?.group || '默认';
  const primaryByGroup: Record<string, string> = {};
  if(trails[0]) primaryByGroup[firstGroup] = trails[0].id;

  const state = {
    activeTrails: data.activeTrails ? new Set(data.activeTrails) : new Set(trails.map(trail => trail.id)),
    expandedTrails: new Set<string>(),
    autoGenerateEscape: false,
    primaryByGroup,
    activeGroup: firstGroup as string | null,
    batchSelected: new Set<string>(),
    modeVisibleTags: {
      day: new Set(DEFAULT_TAGS.day),
      elev: new Set(DEFAULT_TAGS.elev),
      waypoint: new Set(DEFAULT_TAGS.waypoint),
    },
    waypointModeTags: new Set(['camp', 'water', 'supply']),
    showTrack: true,
    showLabel: true,
    showHighPoint: true,
    mode: 'elev' as MapMode,
    baseLayer: 'sat',
    activeEscape: null as string | null,
  };

  Object.defineProperty(state, 'visibleTags', {
    get() {
      return state.modeVisibleTags[state.mode] || state.modeVisibleTags.day;
    },
    configurable: true,
  });
  Object.defineProperty(state, 'primaryTrailId', {
    get() {
      if(state.activeGroup == null) return null;
      return state.primaryByGroup[state.activeGroup] || null;
    },
    set(value: string | null) {
      if(state.activeGroup == null) return;
      if(value == null) delete state.primaryByGroup[state.activeGroup];
      else state.primaryByGroup[state.activeGroup] = value;
    },
    configurable: true,
  });
  return state as typeof state & {
    readonly visibleTags: Set<string>;
    primaryTrailId: string | null;
  };
}

export type AppState = ReturnType<typeof createAppState>;

export function toggleSetItem<T>(set: Set<T>, item: T): boolean {
  if(set.has(item)) set.delete(item);
  else set.add(item);
  return set.has(item);
}
