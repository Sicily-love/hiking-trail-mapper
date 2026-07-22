import type { DialogController } from '../../ui/dialog/controller.ts';
import type { CommandRegistry } from '../command.ts';
import type { AppStateActions } from '../actions.ts';
import type { AppStateSelectors, GroupedTrail } from '../selectors.ts';
import type { ProjectActions } from '../project-actions.ts';
import type { ProjectSelectors } from '../project-selectors.ts';
import type { createStudioInteractionManager } from '../interactions/studio.ts';
import type { RenderScheduler } from '../rendering/scheduler.ts';
import type { ProjectState } from '../project-store.ts';

export type RuntimeProject<TTrail> = ProjectState<TTrail>;

export interface RuntimeContext<TTrail extends GroupedTrail = GroupedTrail, TFitRequest = unknown> {
  readonly projectActions: ProjectActions<TTrail>;
  readonly projectSelectors: ProjectSelectors<TTrail>;
  readonly stateActions: AppStateActions;
  readonly stateSelectors: AppStateSelectors<TTrail>;
  readonly commands: CommandRegistry<void>;
  readonly interactions: ReturnType<typeof createStudioInteractionManager>;
  readonly renderer: RenderScheduler<TFitRequest>;
  readonly dialogs: DialogController;
}

/** Creates the explicit service boundary passed to typed feature controllers. */
export function createRuntimeContext<TTrail extends GroupedTrail, TFitRequest = unknown>(
  context: RuntimeContext<TTrail, TFitRequest>,
): RuntimeContext<TTrail, TFitRequest> {
  if(!context.projectActions || typeof context.projectActions.mutateTrail !== 'function') {
    throw new TypeError('RuntimeContext requires ProjectActions');
  }
  if(!context.projectSelectors || typeof context.projectSelectors.trails !== 'function') {
    throw new TypeError('RuntimeContext requires ProjectSelectors');
  }
  if(!context.stateActions || typeof context.stateActions.setMode !== 'function') {
    throw new TypeError('RuntimeContext requires AppStateActions');
  }
  if(!context.stateSelectors || typeof context.stateSelectors.snapshot !== 'function') {
    throw new TypeError('RuntimeContext requires AppStateSelectors');
  }
  if(!context.commands || typeof context.commands.dispatch !== 'function') {
    throw new TypeError('RuntimeContext requires a CommandRegistry');
  }
  if(!context.interactions || typeof context.interactions.cancel !== 'function') {
    throw new TypeError('RuntimeContext requires an InteractionManager');
  }
  if(!context.renderer || typeof context.renderer.invalidate !== 'function') {
    throw new TypeError('RuntimeContext requires a RenderScheduler');
  }
  if(!context.dialogs || typeof context.dialogs.confirm !== 'function') {
    throw new TypeError('RuntimeContext requires a DialogController');
  }
  return Object.freeze({...context});
}
