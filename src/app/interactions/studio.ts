import { InteractionManager } from './manager.ts';
import type {
  ActiveInteractionKind,
  InteractionEventMap,
  InteractionManagerOptions,
  InteractionPhaseMap,
} from './types.ts';

export interface InteractionLatLng {
  readonly lat: number;
  readonly lng: number;
}

export type InteractionTapSource = 'fast' | 'leaflet' | 'contextmenu' | 'long-press';

export interface InteractionTapEvent {
  readonly type: 'tap';
  readonly source: InteractionTapSource;
  readonly latlng: InteractionLatLng;
  readonly requireNear?: boolean;
  readonly transient?: boolean;
}

export type MeasureInteractionEvent = InteractionTapEvent | {
  readonly type: 'drag-start' | 'drag-snap' | 'drag-end';
  readonly endpoint: 'A' | 'B';
  readonly hit?: unknown;
};

export type SegmentInteractionEvent = InteractionTapEvent | {
  readonly type: 'drag-start' | 'drag-end';
  readonly boundaryIndex: number;
  readonly hit?: unknown;
};

export type WaypointInteractionEvent = InteractionTapEvent;
export type EscapeInteractionEvent = InteractionTapEvent;
export type DayPreviewInteractionEvent = { readonly type: 'refresh' };

export interface StudioInteractionEventMap extends InteractionEventMap {
  measure: MeasureInteractionEvent;
  segment: SegmentInteractionEvent;
  waypoint: WaypointInteractionEvent;
  escape: EscapeInteractionEvent;
  'day-preview': DayPreviewInteractionEvent;
}

export interface StudioInteractionPhaseMap extends InteractionPhaseMap {
  measure: 'select-a' | 'select-b' | 'ready' | 'dragging';
  segment: 'editing' | 'dragging' | 'committing';
  waypoint: 'select' | 'committing';
  escape: 'select-a' | 'select-b' | 'preview' | 'committing';
  'day-preview': 'preview';
}

export const STUDIO_INTERACTION_PHASES = Object.freeze({
  measure: Object.freeze(['select-a', 'select-b', 'ready', 'dragging']),
  segment: Object.freeze(['editing', 'dragging', 'committing']),
  waypoint: Object.freeze(['select', 'committing']),
  escape: Object.freeze(['select-a', 'select-b', 'preview', 'committing']),
  'day-preview': Object.freeze(['preview']),
} as const);

const STUDIO_INTERACTION_TRANSITIONS: Readonly<Record<
  ActiveInteractionKind,
  Readonly<Record<string, ReadonlySet<string>>>
>> = Object.freeze({
  measure: Object.freeze({
    'select-a': new Set(['select-b']),
    'select-b': new Set(['select-a', 'ready']),
    ready: new Set(['select-a', 'dragging']),
    dragging: new Set(['select-a', 'ready']),
  }),
  segment: Object.freeze({
    editing: new Set(['dragging', 'committing']),
    dragging: new Set(['editing']),
    committing: new Set<string>(),
  }),
  waypoint: Object.freeze({
    select: new Set(['committing']),
    committing: new Set(['select']),
  }),
  escape: Object.freeze({
    'select-a': new Set(['select-b']),
    'select-b': new Set(['select-a', 'preview']),
    preview: new Set(['select-a', 'select-b', 'committing']),
    committing: new Set<string>(),
  }),
  'day-preview': Object.freeze({
    preview: new Set<string>(),
  }),
});

export function isStudioInteractionPhase(
  kind: ActiveInteractionKind,
  phase: string,
): boolean {
  return (STUDIO_INTERACTION_PHASES[kind] as readonly string[]).includes(phase);
}

export function canTransitionStudioInteraction(
  kind: ActiveInteractionKind,
  currentPhase: string,
  nextPhase: string,
): boolean {
  if(currentPhase === nextPhase) return isStudioInteractionPhase(kind, currentPhase);
  return STUDIO_INTERACTION_TRANSITIONS[kind][currentPhase]?.has(nextPhase) || false;
}

export function createStudioInteractionManager(
  options: Omit<InteractionManagerOptions, 'canTransition'> = {},
): InteractionManager<StudioInteractionEventMap, StudioInteractionPhaseMap> {
  return new InteractionManager<StudioInteractionEventMap, StudioInteractionPhaseMap>({
    ...options,
    canTransition: canTransitionStudioInteraction,
  });
}
