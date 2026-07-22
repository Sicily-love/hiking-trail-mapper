export interface ProjectState<TTrail> {
  title: string;
  trails: TTrail[];
  calc_method?: Record<string, unknown>;
}

export type ProjectMutationReason =
  | 'archive.restore'
  | 'history.restore'
  | 'storage.restore'
  | 'storage.migrate'
  | 'trail.import'
  | 'trail.delete'
  | 'trail.clear'
  | 'trail.rename'
  | 'trail.rename-id'
  | 'trail.move-group'
  | 'trail.reverse'
  | 'trail.source'
  | 'waypoint.add'
  | 'segment.apply'
  | 'itinerary.waypoints'
  | 'escape.generate'
  | 'escape.commit'
  | 'escape.delete';

type ProjectStateEventPayload =
  | {type:'project.replaced'; reason: ProjectMutationReason}
  | {type:'trails.replaced'; reason: ProjectMutationReason; count: number}
  | {type:'trail.added'; reason: ProjectMutationReason; trailId: string}
  | {type:'trail.removed'; reason: ProjectMutationReason; trailId: string}
  | {type:'trail.changed'; reason: ProjectMutationReason; trailId: string}
  | {type:'trails.changed'; reason: ProjectMutationReason};

export type ProjectStateEvent = ProjectStateEventPayload & {revision: number};

export type ProjectStateListener = (event: ProjectStateEvent) => void;

/** Owns durable project data and emits typed events for every structural mutation. */
export class ProjectStore<TTrail extends {id: string}> {
  private readonly value: ProjectState<TTrail>;
  private readonly listeners = new Set<ProjectStateListener>();
  private revision = 0;

  constructor(seed: ProjectState<TTrail>) {
    this.value = seed;
  }

  snapshot(): Readonly<ProjectState<TTrail>> {
    return this.value;
  }

  private emit(event: ProjectStateEventPayload): ProjectStateEvent {
    const changed = {...event, revision:++this.revision} as ProjectStateEvent;
    for(const listener of [...this.listeners]) listener(changed);
    return changed;
  }

  replaceProject(project: ProjectState<TTrail>, reason: ProjectMutationReason): void {
    this.value.title = project.title;
    this.value.calc_method = project.calc_method;
    this.value.trails.splice(0, this.value.trails.length, ...project.trails);
    this.emit({type:'project.replaced', reason});
  }

  replaceTrails(trails: Iterable<TTrail>, reason: ProjectMutationReason): void {
    const next = [...trails];
    this.value.trails.splice(0, this.value.trails.length, ...next);
    this.emit({type:'trails.replaced', reason, count:next.length});
  }

  addTrail(trail: TTrail, reason: ProjectMutationReason = 'trail.import'): void {
    this.value.trails.push(trail);
    this.emit({type:'trail.added', reason, trailId:trail.id});
  }

  removeTrail(trailId: string, reason: ProjectMutationReason = 'trail.delete'): boolean {
    const index = this.value.trails.findIndex(trail => trail.id === trailId);
    if(index < 0) return false;
    this.value.trails.splice(index, 1);
    this.emit({type:'trail.removed', reason, trailId});
    return true;
  }

  mutateTrail(
    trailId: string,
    reason: ProjectMutationReason,
    mutation: (trail: TTrail) => void,
  ): TTrail | null {
    const trail = this.value.trails.find(candidate => candidate.id === trailId);
    if(!trail) return null;
    mutation(trail);
    this.emit({type:'trail.changed', reason, trailId:String(trail.id)});
    return trail;
  }

  mutateTrails(reason: ProjectMutationReason, mutation: (trails: TTrail[]) => void): void {
    mutation(this.value.trails);
    this.emit({type:'trails.changed', reason});
  }

  subscribe(listener: ProjectStateListener): () => void {
    this.listeners.add(listener);
    let active = true;
    return () => {
      if(!active) return;
      active = false;
      this.listeners.delete(listener);
    };
  }
}

export function createProjectStore<TTrail extends {id: string}>(
  seed: ProjectState<TTrail>,
): ProjectStore<TTrail> {
  return new ProjectStore(seed);
}
