import { createAppState, type AppState, type MapMode } from './state.ts';

export type DisplayOption = 'showTrack' | 'showLabel' | 'showHighPoint';

export interface AppStateSnapshot {
  readonly activeTrails: ReadonlySet<string>;
  readonly expandedTrails: ReadonlySet<string>;
  readonly autoGenerateEscape: boolean;
  readonly primaryByGroup: Readonly<Record<string, string>>;
  readonly primaryTrailId: string | null;
  readonly activeGroup: string | null;
  readonly batchSelected: ReadonlySet<string>;
  readonly modeVisibleTags: Readonly<Record<MapMode, ReadonlySet<string>>>;
  readonly visibleTags: ReadonlySet<string>;
  readonly waypointModeTags: ReadonlySet<string>;
  readonly showTrack: boolean;
  readonly showLabel: boolean;
  readonly showHighPoint: boolean;
  readonly mode: MapMode;
  readonly baseLayer: string;
  readonly activeEscape: string | null;
}

export type AppStateCommand =
  | { type: 'active-trail.set'; trailId: string; active: boolean }
  | { type: 'active-trails.replace'; trailIds: Iterable<string> }
  | { type: 'trail-id.rename'; oldId: string; newId: string }
  | { type: 'trail.remove'; trailId: string }
  | { type: 'primary-trail.set'; trailId: string | null }
  | { type: 'primary-by-group.replace'; value: Record<string, string> }
  | { type: 'group.set-active'; group: string | null }
  | { type: 'group.set-primary'; group: string; trailId: string | null }
  | { type: 'batch.replace'; trailIds: Iterable<string> }
  | { type: 'batch.toggle'; trailId: string }
  | { type: 'expanded.toggle'; trailId: string }
  | { type: 'escape.set-active'; escapeId: string | null }
  | { type: 'mode.set'; mode: MapMode }
  | { type: 'visible-tag.set'; tag: string; visible: boolean }
  | { type: 'visible-tags.replace'; tags: Iterable<string> }
  | { type: 'waypoint-tag.set'; tag: string; visible: boolean }
  | { type: 'display.set'; option: DisplayOption; visible: boolean }
  | {
      type: 'workspace.restore';
      activeTrails: Iterable<string>;
      activeGroup: string | null;
      primaryByGroup: Record<string, string>;
      mode?: MapMode;
      modeVisibleTags?: Partial<Record<MapMode, Iterable<string>>>;
      waypointModeTags?: Iterable<string>;
      display?: Partial<Record<DisplayOption, boolean>>;
      baseLayer?: string;
      autoGenerateEscape?: boolean;
    }
  | { type: 'workspace.clear' };

export interface AppStateChangedEvent {
  type: 'state.changed';
  command: AppStateCommand;
  revision: number;
}

export type AppStateListener = (event: AppStateChangedEvent) => void;

function replaceSet(target: Set<string>, values: Iterable<string>): void {
  target.clear();
  for(const value of values) target.add(value);
}

function replaceRecord<T>(target: Record<string, T>, values: Readonly<Record<string, T>>): void {
  for(const key of Object.keys(target)) delete target[key];
  Object.assign(target, values);
}

function rejectSnapshotMutation(): never {
  throw new TypeError('Application state snapshots are read-only');
}

function createReadonlySetView<T>(source: Set<T>): ReadonlySet<T> {
  return new Proxy(source, {
    get(target, property) {
      if(property === 'add' || property === 'delete' || property === 'clear') {
        return rejectSnapshotMutation;
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set:rejectSnapshotMutation,
    defineProperty:rejectSnapshotMutation,
    deleteProperty:rejectSnapshotMutation,
  }) as ReadonlySet<T>;
}

function createReadonlyRecordView<T>(source: Record<string, T>): Readonly<Record<string, T>> {
  return new Proxy(source, {
    set:rejectSnapshotMutation,
    defineProperty:rejectSnapshotMutation,
    deleteProperty:rejectSnapshotMutation,
  });
}

function createAppStateSnapshot(state: AppState): AppStateSnapshot {
  const activeTrails = createReadonlySetView(state.activeTrails);
  const expandedTrails = createReadonlySetView(state.expandedTrails);
  const batchSelected = createReadonlySetView(state.batchSelected);
  const waypointModeTags = createReadonlySetView(state.waypointModeTags);
  const modeVisibleTags = createReadonlyRecordView({
    day:createReadonlySetView(state.modeVisibleTags.day),
    elev:createReadonlySetView(state.modeVisibleTags.elev),
    waypoint:createReadonlySetView(state.modeVisibleTags.waypoint),
  });
  const primaryByGroup = createReadonlyRecordView(state.primaryByGroup);

  const snapshot = {
    activeTrails,
    expandedTrails,
    get autoGenerateEscape() { return state.autoGenerateEscape; },
    primaryByGroup,
    get primaryTrailId() { return state.primaryTrailId; },
    get activeGroup() { return state.activeGroup; },
    batchSelected,
    modeVisibleTags,
    get visibleTags() { return modeVisibleTags[state.mode]; },
    waypointModeTags,
    get showTrack() { return state.showTrack; },
    get showLabel() { return state.showLabel; },
    get showHighPoint() { return state.showHighPoint; },
    get mode() { return state.mode; },
    get baseLayer() { return state.baseLayer; },
    get activeEscape() { return state.activeEscape; },
  };
  return new Proxy(snapshot, {
    set:rejectSnapshotMutation,
    defineProperty:rejectSnapshotMutation,
    deleteProperty:rejectSnapshotMutation,
  });
}

/** Owns application-level mutable state and exposes one typed write boundary. */
export class AppStateStore {
  private readonly value: AppState;
  private readonly view: AppStateSnapshot;
  private readonly listeners = new Set<AppStateListener>();
  private revision = 0;

  constructor(seed: Parameters<typeof createAppState>[0] = {}) {
    this.value = createAppState(seed);
    this.view = createAppStateSnapshot(this.value);
  }

  snapshot(): AppStateSnapshot {
    return this.view;
  }

  dispatch(command: AppStateCommand): AppStateChangedEvent {
    const state = this.value;
    switch(command.type) {
      case 'active-trail.set':
        if(command.active) state.activeTrails.add(command.trailId);
        else state.activeTrails.delete(command.trailId);
        break;
      case 'active-trails.replace':
        replaceSet(state.activeTrails, command.trailIds);
        break;
      case 'trail-id.rename':
        if(state.activeTrails.delete(command.oldId)) state.activeTrails.add(command.newId);
        for(const group of Object.keys(state.primaryByGroup)) {
          if(state.primaryByGroup[group] === command.oldId) state.primaryByGroup[group] = command.newId;
        }
        break;
      case 'trail.remove':
        state.activeTrails.delete(command.trailId);
        state.batchSelected.delete(command.trailId);
        state.expandedTrails.delete(command.trailId);
        for(const group of Object.keys(state.primaryByGroup)) {
          if(state.primaryByGroup[group] === command.trailId) delete state.primaryByGroup[group];
        }
        break;
      case 'primary-trail.set':
        state.primaryTrailId = command.trailId;
        break;
      case 'primary-by-group.replace':
        replaceRecord(state.primaryByGroup, command.value);
        break;
      case 'group.set-active':
        state.activeGroup = command.group;
        break;
      case 'group.set-primary':
        if(command.trailId == null) delete state.primaryByGroup[command.group];
        else state.primaryByGroup[command.group] = command.trailId;
        break;
      case 'batch.replace':
        replaceSet(state.batchSelected, command.trailIds);
        break;
      case 'batch.toggle':
        if(state.batchSelected.has(command.trailId)) state.batchSelected.delete(command.trailId);
        else state.batchSelected.add(command.trailId);
        break;
      case 'expanded.toggle':
        if(state.expandedTrails.has(command.trailId)) state.expandedTrails.delete(command.trailId);
        else state.expandedTrails.add(command.trailId);
        break;
      case 'escape.set-active':
        state.activeEscape = command.escapeId;
        break;
      case 'mode.set':
        state.mode = command.mode;
        break;
      case 'visible-tag.set':
        if(command.visible) state.visibleTags.add(command.tag);
        else state.visibleTags.delete(command.tag);
        break;
      case 'visible-tags.replace':
        replaceSet(state.visibleTags, command.tags);
        break;
      case 'waypoint-tag.set':
        if(command.visible) state.waypointModeTags.add(command.tag);
        else state.waypointModeTags.delete(command.tag);
        break;
      case 'display.set':
        state[command.option] = command.visible;
        break;
      case 'workspace.restore':
        replaceSet(state.activeTrails, command.activeTrails);
        state.activeGroup = command.activeGroup;
        replaceRecord(state.primaryByGroup, command.primaryByGroup);
        state.batchSelected.clear();
        state.expandedTrails.clear();
        state.activeEscape = null;
        if(command.mode) state.mode = command.mode;
        if(command.modeVisibleTags) {
          for(const mode of ['day', 'elev', 'waypoint'] as const) {
            const tags = command.modeVisibleTags[mode];
            if(tags) replaceSet(state.modeVisibleTags[mode], tags);
          }
        }
        if(command.waypointModeTags) replaceSet(state.waypointModeTags, command.waypointModeTags);
        if(command.display) {
          for(const option of ['showTrack', 'showLabel', 'showHighPoint'] as const) {
            if(typeof command.display[option] === 'boolean') state[option] = command.display[option];
          }
        }
        if(command.baseLayer) state.baseLayer = command.baseLayer;
        if(typeof command.autoGenerateEscape === 'boolean') state.autoGenerateEscape = command.autoGenerateEscape;
        break;
      case 'workspace.clear':
        state.activeTrails.clear();
        state.batchSelected.clear();
        state.expandedTrails.clear();
        replaceRecord(state.primaryByGroup, {});
        state.activeEscape = null;
        break;
    }

    const event: AppStateChangedEvent = {
      type: 'state.changed',
      command,
      revision: ++this.revision,
    };
    for(const listener of [...this.listeners]) listener(event);
    return event;
  }

  subscribe(listener: AppStateListener): () => void {
    this.listeners.add(listener);
    let active = true;
    return () => {
      if(!active) return;
      active = false;
      this.listeners.delete(listener);
    };
  }
}

export function createAppStateStore(seed: Parameters<typeof createAppState>[0] = {}): AppStateStore {
  return new AppStateStore(seed);
}
