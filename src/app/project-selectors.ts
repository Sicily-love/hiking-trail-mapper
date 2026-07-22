import type {ProjectState} from './project-store.ts';

export interface ProjectSelectors<TTrail extends {id: string}> {
  snapshot(): Readonly<ProjectState<TTrail>>;
  title(): string;
  trails(): readonly TTrail[];
  trailCount(): number;
  trailById(trailId: string | null): TTrail | null;
}

/** Provides the read-only project surface used by runtimes and feature controllers. */
export function createProjectSelectors<TTrail extends {id: string}>(
  read: () => Readonly<ProjectState<TTrail>>,
): ProjectSelectors<TTrail> {
  return Object.freeze({
    snapshot:read,
    title:() => read().title,
    trails:() => read().trails,
    trailCount:() => read().trails.length,
    trailById:(trailId: string | null) => {
      if(trailId == null) return null;
      return read().trails.find(trail => trail.id === trailId) || null;
    },
  });
}
