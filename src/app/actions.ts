import type {AppStateCommand, AppStateStore, DisplayOption} from './state-store.ts';
import type {MapMode} from './state.ts';

export interface AppStateActions {
  replaceActiveTrails(trailIds: Iterable<string>): void;
  setTrailActive(trailId: string, active: boolean): void;
  renameTrailId(oldId: string, newId: string): void;
  removeTrail(trailId: string): void;
  setPrimaryTrail(trailId: string | null): void;
  setGroupPrimary(group: string, trailId: string | null): void;
  setActiveGroup(group: string | null): void;
  replaceBatch(trailIds: Iterable<string>): void;
  toggleBatch(trailId: string): void;
  toggleExpanded(trailId: string): void;
  setActiveEscape(escapeId: string | null): void;
  setMode(mode: MapMode): void;
  setVisibleTag(tag: string, visible: boolean): void;
  replaceVisibleTags(tags: Iterable<string>): void;
  setWaypointTag(tag: string, visible: boolean): void;
  setDisplay(option: DisplayOption, visible: boolean): void;
  restoreWorkspace(command: Omit<Extract<AppStateCommand, {type:'workspace.restore'}>, 'type'>): void;
  clearWorkspace(): void;
}

/** Exposes semantic typed writes instead of leaking raw state commands to features. */
export function createAppStateActions(store: AppStateStore): AppStateActions {
  return Object.freeze({
    replaceActiveTrails:(trailIds: Iterable<string>) => { store.dispatch({type:'active-trails.replace', trailIds}); },
    setTrailActive:(trailId: string, active: boolean) => { store.dispatch({type:'active-trail.set', trailId, active}); },
    renameTrailId:(oldId: string, newId: string) => { store.dispatch({type:'trail-id.rename', oldId, newId}); },
    removeTrail:(trailId: string) => { store.dispatch({type:'trail.remove', trailId}); },
    setPrimaryTrail:(trailId: string | null) => { store.dispatch({type:'primary-trail.set', trailId}); },
    setGroupPrimary:(group: string, trailId: string | null) => { store.dispatch({type:'group.set-primary', group, trailId}); },
    setActiveGroup:(group: string | null) => { store.dispatch({type:'group.set-active', group}); },
    replaceBatch:(trailIds: Iterable<string>) => { store.dispatch({type:'batch.replace', trailIds}); },
    toggleBatch:(trailId: string) => { store.dispatch({type:'batch.toggle', trailId}); },
    toggleExpanded:(trailId: string) => { store.dispatch({type:'expanded.toggle', trailId}); },
    setActiveEscape:(escapeId: string | null) => { store.dispatch({type:'escape.set-active', escapeId}); },
    setMode:(mode: MapMode) => { store.dispatch({type:'mode.set', mode}); },
    setVisibleTag:(tag: string, visible: boolean) => { store.dispatch({type:'visible-tag.set', tag, visible}); },
    replaceVisibleTags:(tags: Iterable<string>) => { store.dispatch({type:'visible-tags.replace', tags}); },
    setWaypointTag:(tag: string, visible: boolean) => { store.dispatch({type:'waypoint-tag.set', tag, visible}); },
    setDisplay:(option: DisplayOption, visible: boolean) => { store.dispatch({type:'display.set', option, visible}); },
    restoreWorkspace:(command: Omit<Extract<AppStateCommand, {type:'workspace.restore'}>, 'type'>) => {
      store.dispatch({type:'workspace.restore', ...command});
    },
    clearWorkspace:() => { store.dispatch({type:'workspace.clear'}); },
  });
}
