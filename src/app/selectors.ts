import type { AppState } from './state.ts';

export interface GroupedTrail {
  id: string;
  group?: string | null;
}

export interface AppStateSelectors<TTrail extends GroupedTrail> {
  snapshot(): Readonly<AppState>;
  activeGroup(): string | null;
  primaryTrailId(): string | null;
  primaryTrail(trails: readonly TTrail[]): TTrail | null;
  trailsInActiveGroup(trails: readonly TTrail[]): TTrail[];
  activeTrails(trails: readonly TTrail[]): TTrail[];
  activeTrailIds(): ReadonlySet<string>;
  isTrailActive(trail: TTrail): boolean;
  isPrimaryTrail(trail: TTrail): boolean;
  mode(): AppState['mode'];
  visibleTags(): ReadonlySet<string>;
  waypointModeTags(): ReadonlySet<string>;
  batchSelected(): ReadonlySet<string>;
  expandedTrails(): ReadonlySet<string>;
  primaryForGroup(group: string): string | null;
  autoGenerateEscape(): boolean;
  display(): Readonly<Pick<AppState, 'showTrack' | 'showLabel' | 'showHighPoint'>>;
  activeEscape(): string | null;
  baseLayer(): string;
}

export function trailGroupOf(trail: GroupedTrail): string {
  return trail.group || '默认';
}

/** Provides read-only, derived access to application state for feature runtimes. */
export function createAppStateSelectors<TTrail extends GroupedTrail>(
  read: () => Readonly<AppState>,
): AppStateSelectors<TTrail> {
  const activeGroup = () => read().activeGroup;
  const primaryTrailId = () => read().primaryTrailId;
  const inActiveGroup = (trail: TTrail): boolean => {
    const group = activeGroup();
    return group !== null && trailGroupOf(trail) === group;
  };

  return Object.freeze({
    snapshot:read,
    activeGroup,
    primaryTrailId,
    primaryTrail(trails: readonly TTrail[]): TTrail | null {
      if(activeGroup() === null) return null;
      const id = primaryTrailId();
      return trails.find(trail => trail.id === id) || null;
    },
    trailsInActiveGroup(trails: readonly TTrail[]): TTrail[] {
      return trails.filter(inActiveGroup);
    },
    activeTrails(trails: readonly TTrail[]): TTrail[] {
      const state = read();
      return trails.filter(trail => inActiveGroup(trail) && state.activeTrails.has(trail.id));
    },
    activeTrailIds:() => read().activeTrails,
    isTrailActive(trail: TTrail): boolean {
      return inActiveGroup(trail) && read().activeTrails.has(trail.id);
    },
    isPrimaryTrail(trail: TTrail): boolean {
      return inActiveGroup(trail) && trail.id === primaryTrailId();
    },
    mode:() => read().mode,
    visibleTags:() => read().visibleTags,
    waypointModeTags:() => read().waypointModeTags,
    batchSelected:() => read().batchSelected,
    expandedTrails:() => read().expandedTrails,
    primaryForGroup:(group: string) => read().primaryByGroup[group] || null,
    autoGenerateEscape:() => read().autoGenerateEscape,
    display:() => {
      const state = read();
      return Object.freeze({
        showTrack:state.showTrack,
        showLabel:state.showLabel,
        showHighPoint:state.showHighPoint,
      });
    },
    activeEscape:() => read().activeEscape,
    baseLayer:() => read().baseLayer,
  });
}
