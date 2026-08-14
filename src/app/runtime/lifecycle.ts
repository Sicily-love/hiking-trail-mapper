export type RuntimeCleanup = () => void;

export interface RuntimeLifecycle {
  readonly disposed: boolean;
  readonly size: number;
  add(cleanup: RuntimeCleanup): RuntimeCleanup;
  dispose(): void;
}

/** Collects runtime resources and releases them exactly once on page teardown. */
export function createRuntimeLifecycle(viewport: Window): RuntimeLifecycle {
  const cleanups:RuntimeCleanup[] = [];
  let disposed = false;

  const add = (cleanup: RuntimeCleanup): RuntimeCleanup => {
    if(disposed) {
      cleanup();
      return cleanup;
    }
    cleanups.push(cleanup);
    return cleanup;
  };

  const dispose = (): void => {
    if(disposed) return;
    disposed = true;
    viewport.removeEventListener('pagehide', dispose);
    for(const cleanup of cleanups.splice(0).reverse()) {
      try { cleanup(); } catch(error) { console.error('Runtime cleanup failed', error); }
    }
  };

  viewport.addEventListener('pagehide', dispose);
  return Object.freeze({
    get disposed() { return disposed; },
    get size() { return cleanups.length; },
    add,
    dispose,
  });
}
