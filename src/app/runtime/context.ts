import type { DialogController } from '../../ui/dialog/controller.ts';
import type { CommandRegistry } from '../command.ts';
import type { AppStateStore } from '../state-store.ts';
import type { createStudioInteractionManager } from '../interactions/studio.ts';
import type { RenderScheduler } from '../rendering/scheduler.ts';

export interface RuntimeProject<TTrail> {
  title: string;
  trails: TTrail[];
  calc_method?: Record<string, unknown>;
}

export interface RuntimeContext<TTrail = unknown, TFitRequest = unknown> {
  readonly project: RuntimeProject<TTrail>;
  readonly state: AppStateStore;
  readonly commands: CommandRegistry<void>;
  readonly interactions: ReturnType<typeof createStudioInteractionManager>;
  readonly renderer: RenderScheduler<TFitRequest>;
  readonly dialogs: DialogController;
}

/** Creates the explicit service boundary passed to typed feature controllers. */
export function createRuntimeContext<TTrail, TFitRequest = unknown>(
  context: RuntimeContext<TTrail, TFitRequest>,
): RuntimeContext<TTrail, TFitRequest> {
  if(!context.project || !Array.isArray(context.project.trails)) {
    throw new TypeError('RuntimeContext requires a project with a trails array');
  }
  if(!context.state || typeof context.state.dispatch !== 'function') {
    throw new TypeError('RuntimeContext requires an AppStateStore');
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
