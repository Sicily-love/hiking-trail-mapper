export type RuntimeInspectorBindings = Readonly<Record<string, () => unknown>>;

/** Builds the sole test-only compatibility surface without exposing mutable globals. */
export function createReadonlyRuntimeInspector(
  bindings: RuntimeInspectorBindings,
): Readonly<Record<string, unknown>> {
  const inspector: Record<string, unknown> = {};
  const descriptors = Object.fromEntries(
    Object.entries(bindings).map(([name, read]) => {
      if(typeof read !== 'function') throw new TypeError(`Inspector binding must be a reader: ${name}`);
      return [name, {enumerable:true, configurable:false, get:read}];
    }),
  );
  Object.defineProperties(inspector, descriptors);
  return Object.freeze(inspector);
}
