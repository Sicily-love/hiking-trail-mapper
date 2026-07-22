import type {ProjectMutationReason, ProjectState, ProjectStore} from './project-store.ts';

export interface ProjectActions<TTrail extends {id: string}> {
  replaceProject(project: ProjectState<TTrail>, reason: ProjectMutationReason): void;
  replaceTrails(trails: Iterable<TTrail>, reason: ProjectMutationReason): void;
  addTrail(trail: TTrail, reason?: ProjectMutationReason): void;
  removeTrail(trailId: string, reason?: ProjectMutationReason): boolean;
  mutateTrail(
    trailId: string,
    reason: ProjectMutationReason,
    mutation: (trail: TTrail) => void,
  ): TTrail | null;
  mutateTrails(reason: ProjectMutationReason, mutation: (trails: TTrail[]) => void): void;
}

/** Exposes semantic project writes without leaking the mutable store to features. */
export function createProjectActions<TTrail extends {id: string}>(
  store: ProjectStore<TTrail>,
): ProjectActions<TTrail> {
  const actions: ProjectActions<TTrail> = Object.freeze({
    replaceProject:(project: ProjectState<TTrail>, reason: ProjectMutationReason) => {
      store.replaceProject(project, reason);
    },
    replaceTrails:(trails: Iterable<TTrail>, reason: ProjectMutationReason) => {
      store.replaceTrails(trails, reason);
    },
    addTrail:(trail: TTrail, reason: ProjectMutationReason = 'trail.import') => {
      store.addTrail(trail, reason);
    },
    removeTrail:(trailId: string, reason: ProjectMutationReason = 'trail.delete') =>
      store.removeTrail(trailId, reason),
    mutateTrail:(trailId: string, reason: ProjectMutationReason, mutation: (trail: TTrail) => void) =>
      store.mutateTrail(trailId, reason, mutation),
    mutateTrails:(reason: ProjectMutationReason, mutation: (trails: TTrail[]) => void) => {
      store.mutateTrails(reason, mutation);
    },
  });
  return actions;
}
