export type CommandFlag<TContext> = boolean | ((context: TContext) => boolean);

export interface CommandDefinition<TContext = void, TResult = unknown> {
  id: string;
  execute: (context: TContext) => TResult | Promise<TResult>;
  enabled?: CommandFlag<TContext>;
  checked?: CommandFlag<TContext>;
}

export type CommandRegistryEventType =
  | 'registered'
  | 'unregistered'
  | 'changed'
  | 'dispatched';

export interface CommandRegistryEvent {
  type: CommandRegistryEventType;
  id?: string;
}

export interface CommandState {
  enabled: boolean;
  checked: boolean;
}

export const STUDIO_COMMANDS = Object.freeze({
  FILE_IMPORT: 'file.import',
  FILE_EXPORT: 'file.export',
  PROJECT_CLEAR: 'project.clear',
  TRAIL_REVERSE: 'trail.reverse',
  MEASURE_TOGGLE: 'measure.toggle',
  SEGMENT_TOGGLE: 'segment.toggle',
  WAYPOINT_TOGGLE: 'waypoint.toggle',
  ESCAPE_TOGGLE: 'escape.toggle',
  MAP_RESET: 'map.reset',
  HELP_OPEN: 'help.open',
  LANGUAGE_TOGGLE: 'language.toggle',
  APP_RENAME: 'app.rename',
  INTERACTION_CANCEL: 'interaction.cancel',
  MODE_ELEVATION: 'mode.elevation',
  MODE_WAYPOINT: 'mode.waypoint',
  WORKSPACE_GROUPS: 'workspace.groups',
  WORKSPACE_TRAILS: 'workspace.trails',
  WORKSPACE_ITINERARY: 'workspace.itinerary',
  WORKSPACE_WAYPOINTS: 'workspace.waypoints',
} as const);

export type StudioCommandId = typeof STUDIO_COMMANDS[keyof typeof STUDIO_COMMANDS];

export type CommandRegistryListener = (event: CommandRegistryEvent) => void;

type ContextArgs<TContext> = [TContext] extends [void]
  ? [context?: TContext]
  : [context: TContext];

function evaluateFlag<TContext>(
  flag: CommandFlag<TContext> | undefined,
  fallback: boolean,
  context: TContext,
): boolean {
  if(typeof flag === 'function') return flag(context);
  return flag ?? fallback;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' && value !== null) || typeof value === 'function'
  ) && typeof (value as PromiseLike<unknown>).then === 'function';
}

/** DOM-free command state and dispatch registry for Workbench controls. */
export class CommandRegistry<TContext = void> {
  private readonly commands = new Map<string, CommandDefinition<TContext, unknown>>();
  private readonly listeners = new Set<CommandRegistryListener>();

  register<TResult>(command: CommandDefinition<TContext, TResult>): () => void {
    const id = command.id.trim();
    if(!id) throw new TypeError('Command id must be a non-empty string');
    if(id !== command.id) throw new TypeError('Command id must not contain surrounding whitespace');
    if(this.commands.has(id)) throw new Error(`Command already registered: ${id}`);

    const stored: CommandDefinition<TContext, unknown> = command;
    this.commands.set(id, stored);
    this.emit({ type: 'registered', id });

    let active = true;
    return () => {
      if(!active) return;
      active = false;
      if(this.commands.get(id) === stored) this.unregister(id);
    };
  }

  unregister(id: string): boolean {
    if(!this.commands.delete(id)) return false;
    this.emit({ type: 'unregistered', id });
    return true;
  }

  has(id: string): boolean {
    return this.commands.has(id);
  }

  get(id: string): Readonly<CommandDefinition<TContext, unknown>> | undefined {
    return this.commands.get(id);
  }

  ids(): string[] {
    return [...this.commands.keys()];
  }

  isEnabled(id: string, ...args: ContextArgs<TContext>): boolean {
    const command = this.commands.get(id);
    if(!command) return false;
    return evaluateFlag(command.enabled, true, args[0] as TContext);
  }

  enabled(id: string, ...args: ContextArgs<TContext>): boolean {
    return this.isEnabled(id, ...args);
  }

  isChecked(id: string, ...args: ContextArgs<TContext>): boolean {
    const command = this.commands.get(id);
    if(!command) return false;
    return evaluateFlag(command.checked, false, args[0] as TContext);
  }

  checked(id: string, ...args: ContextArgs<TContext>): boolean {
    return this.isChecked(id, ...args);
  }

  getState(id: string, ...args: ContextArgs<TContext>): CommandState {
    return {
      enabled: this.isEnabled(id, ...args),
      checked: this.isChecked(id, ...args),
    };
  }

  dispatch<TResult = unknown>(
    id: string,
    ...args: ContextArgs<TContext>
  ): TResult | Promise<TResult> | undefined {
    const command = this.commands.get(id);
    if(!command) throw new Error(`Unknown command: ${id}`);
    if(!this.isEnabled(id, ...args)) return undefined;

    const notify = () => this.emit({ type: 'dispatched', id });
    let result: unknown;
    try {
      result = command.execute(args[0] as TContext);
    } catch(error) {
      try {
        notify();
      } finally {
        throw error;
      }
    }
    if(isPromiseLike(result)) {
      return Promise.resolve(result).finally(notify) as Promise<TResult>;
    }
    notify();
    return result as TResult;
  }

  subscribe(listener: CommandRegistryListener): () => void {
    this.listeners.add(listener);
    let active = true;
    return () => {
      if(!active) return;
      active = false;
      this.listeners.delete(listener);
    };
  }

  notifyChanged(id?: string): void {
    this.emit({ type: 'changed', id });
  }

  notify(id?: string): void {
    this.notifyChanged(id);
  }

  private emit(event: CommandRegistryEvent): void {
    [...this.listeners].forEach(listener => listener(event));
  }
}
