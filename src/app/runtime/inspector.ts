export type RuntimeInspectorBindings = Readonly<Record<string, () => unknown>>;

const READONLY_MUTATION_ERROR = 'Runtime inspector values are read-only';

function rejectMutation(): never {
  throw new TypeError(READONLY_MUTATION_ERROR);
}

/** Returns a live deep-readonly view without cloning large trail collections. */
export function createReadonlyRuntimeView<T>(value: T): Readonly<T> {
  const cache = new WeakMap<object, object>();

  const wrap = (candidate: unknown): unknown => {
    if(candidate === null || typeof candidate !== 'object') {
      return candidate;
    }
    const source = candidate as object;
    const cached = cache.get(source);
    if(cached) return cached;

    const proxy = new Proxy(source, {
      get(target, property, receiver) {
        if(target instanceof Set) {
          if(property === 'size') return target.size;
          if(property === 'add' || property === 'delete' || property === 'clear') return rejectMutation;
          if(property === 'has') return target.has.bind(target);
          if(property === Symbol.iterator || property === 'values' || property === 'keys') {
            return function* readonlySetIterator() {
              for(const item of target.values()) yield wrap(item);
            };
          }
          if(property === 'entries') {
            return function* readonlySetEntries() {
              for(const item of target.values()) {
                const wrapped = wrap(item);
                yield [wrapped, wrapped];
              }
            };
          }
          if(property === 'forEach') {
            return (callback: (value: unknown, key: unknown, set: unknown) => void, thisArg?: unknown) => {
              target.forEach(item => {
                const wrapped = wrap(item);
                callback.call(thisArg, wrapped, wrapped, proxy);
              });
            };
          }
        }
        if(target instanceof Map) {
          if(property === 'size') return target.size;
          if(property === 'set' || property === 'delete' || property === 'clear') return rejectMutation;
          if(property === 'has') return target.has.bind(target);
          if(property === 'get') return (key: unknown) => wrap(target.get(key));
        }
        return wrap(Reflect.get(target, property, receiver));
      },
      set:rejectMutation,
      defineProperty:rejectMutation,
      deleteProperty:rejectMutation,
      setPrototypeOf:rejectMutation,
      preventExtensions:rejectMutation,
    });
    cache.set(source, proxy);
    return proxy;
  };

  return wrap(value) as Readonly<T>;
}

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
