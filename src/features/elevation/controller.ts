export interface ElevationDockState {
  collapsed: boolean;
  pinned: boolean;
}
export function createElevationDockState(collapsed = false): ElevationDockState {
  return { collapsed, pinned: false };
}

export function toggleElevationDock(state: ElevationDockState): ElevationDockState {
  return { ...state, collapsed: !state.collapsed };
}
