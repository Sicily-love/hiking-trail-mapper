export interface ClassicRuntimeSliceSource {
  name: string;
  source: string;
}

const FRAGMENT_PATTERN = /^\/\* @runtime-fragment ([a-z][a-z0-9.-]*) \*\/\r?$/gm;
const SLOT_PATTERN = /\/\* @runtime-slice ([a-z][a-z0-9.-]*) \*\//g;

function readFragments(input: ClassicRuntimeSliceSource): Map<string, string> {
  const matches = [...input.source.matchAll(FRAGMENT_PATTERN)];
  if(!matches.length) throw new Error(`Runtime slice has no fragments: ${input.name}`);

  const fragments = new Map<string, string>();
  matches.forEach((match, index) => {
    const id = match[1];
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? input.source.length;
    const body = input.source.slice(start, end).replace(/^\r?\n/, '').trimEnd();
    if(!body) throw new Error(`Runtime fragment is empty: ${id}`);
    if(fragments.has(id)) throw new Error(`Duplicate runtime fragment in ${input.name}: ${id}`);
    fragments.set(id, body);
  });
  return fragments;
}

/** Rebuilds the one classic compatibility runtime from single-owner feature fragments. */
export function composeClassicRuntime(
  template: string,
  sliceSources: ReadonlyArray<ClassicRuntimeSliceSource>,
): string {
  const fragments = new Map<string, { body: string; source: string }>();
  sliceSources.forEach(input => {
    readFragments(input).forEach((body, id) => {
      const previous = fragments.get(id);
      if(previous) {
        throw new Error(`Runtime fragment ${id} exists in both ${previous.source} and ${input.name}`);
      }
      fragments.set(id, { body, source: input.name });
    });
  });

  const used = new Set<string>();
  const composed = template.replace(SLOT_PATTERN, (_slot, id: string) => {
    const fragment = fragments.get(id);
    if(!fragment) throw new Error(`Missing runtime fragment: ${id}`);
    if(used.has(id)) throw new Error(`Runtime fragment slot is duplicated: ${id}`);
    used.add(id);
    return fragment.body;
  });

  const unresolved = [...composed.matchAll(SLOT_PATTERN)].map(match => match[1]);
  if(unresolved.length) throw new Error(`Unresolved runtime fragments: ${unresolved.join(', ')}`);
  const unused = [...fragments.keys()].filter(id => !used.has(id));
  if(unused.length) throw new Error(`Unused runtime fragments: ${unused.join(', ')}`);
  return composed;
}
