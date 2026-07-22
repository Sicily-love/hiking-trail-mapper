export const PROJECT_ARCHIVE_FORMAT = 'outdoor-route-studio-project' as const;
export const PROJECT_ARCHIVE_SCHEMA_VERSION = 2 as const;
export const PROJECT_ARCHIVE_MIN_SCHEMA_VERSION = 1 as const;
export const PROJECT_ARCHIVE_EXTENSION = '.ors-project.json' as const;
export const PROJECT_ARCHIVE_MIME = 'application/vnd.outdoor-route-studio.project+json;charset=utf-8' as const;

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const DEFAULT_MAX_BYTES = 128 * 1024 * 1024;
const DEFAULT_MAX_DEPTH = 64;
const DEFAULT_MAX_NODES = 2_000_000;

export type ProjectArchiveMapMode = 'day' | 'elev' | 'waypoint';
export type ProjectArchiveJson = null | boolean | number | string | ProjectArchiveJson[] | {
  [key: string]: ProjectArchiveJson;
};

export interface ProjectArchiveTrail {
  id: string;
  name: string;
  group: string;
  track: ProjectArchiveJson[];
  [key: string]: ProjectArchiveJson;
}

export interface ProjectArchiveWorkspace {
  activeTrails: string[];
  activeGroup: string | null;
  primaryByGroup: Record<string, string>;
  mode: ProjectArchiveMapMode;
  modeVisibleTags: Record<ProjectArchiveMapMode, string[]>;
  waypointModeTags: string[];
  showTrack: boolean;
  showLabel: boolean;
  showHighPoint: boolean;
  baseLayer: string;
  autoGenerateEscape: boolean;
}

export interface ProjectArchive<TTrail extends ProjectArchiveTrail = ProjectArchiveTrail> {
  format: typeof PROJECT_ARCHIVE_FORMAT;
  schemaVersion: typeof PROJECT_ARCHIVE_SCHEMA_VERSION;
  appVersion: string;
  exportedAt: string;
  project: {
    title: string;
    trails: TTrail[];
    calc_method: Record<string, ProjectArchiveJson>;
  };
  workspace: ProjectArchiveWorkspace;
}

export interface ProjectArchiveStateInput {
  activeTrails: Iterable<string>;
  activeGroup: string | null;
  primaryByGroup: Record<string, string | null | undefined>;
  mode?: ProjectArchiveMapMode;
  modeVisibleTags?: Partial<Record<ProjectArchiveMapMode, Iterable<string>>>;
  waypointModeTags?: Iterable<string>;
  showTrack?: boolean;
  showLabel?: boolean;
  showHighPoint?: boolean;
  baseLayer?: string;
  autoGenerateEscape?: boolean;
}

export interface CreateProjectArchiveInput<TTrail> {
  project: {
    title: string;
    trails: TTrail[];
    calc_method?: Record<string, unknown>;
  };
  state: ProjectArchiveStateInput;
  appVersion: string;
  exportedAt?: string;
}

export interface ProjectArchiveParseOptions {
  maxBytes?: number;
  maxDepth?: number;
  maxNodes?: number;
}

export type ProjectArchiveErrorCode =
  | 'too-large'
  | 'invalid-json'
  | 'invalid-format'
  | 'unsupported-schema'
  | 'invalid-project'
  | 'invalid-trail'
  | 'duplicate-trail-id'
  | 'unsafe-value';

export type ProjectArchiveParseResult<TTrail extends ProjectArchiveTrail = ProjectArchiveTrail> =
  | {ok: true; archive: ProjectArchive<TTrail>; migratedFrom: number | null}
  | {ok: false; code: ProjectArchiveErrorCode; message: string};

interface CloneBudget {
  nodes: number;
  maxNodes: number;
  maxDepth: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type ArchiveMigration = (archive: Record<string, unknown>) => Record<string, unknown>;

const PROJECT_ARCHIVE_MIGRATIONS: Readonly<Record<number, ArchiveMigration>> = Object.freeze({
  1: archive => {
    const project = isRecord(archive.project) ? {...archive.project} : archive.project;
    if(isRecord(project) && !isRecord(project.calc_method)) project.calc_method = {};
    return {...archive, schemaVersion:2, project};
  },
});

function migrateArchive(value: Record<string, unknown>): {
  value: Record<string, unknown>;
  migratedFrom: number | null;
} | null {
  const sourceVersion = Number(value.schemaVersion);
  if(!Number.isInteger(sourceVersion)
    || sourceVersion < PROJECT_ARCHIVE_MIN_SCHEMA_VERSION
    || sourceVersion > PROJECT_ARCHIVE_SCHEMA_VERSION) return null;
  let migrated = value;
  let version = sourceVersion;
  while(version < PROJECT_ARCHIVE_SCHEMA_VERSION) {
    const migration = PROJECT_ARCHIVE_MIGRATIONS[version];
    if(!migration) return null;
    migrated = migration(migrated);
    version += 1;
  }
  return {value:migrated, migratedFrom:sourceVersion === version ? null : sourceVersion};
}

function cloneSafeJson(value: unknown, path: string, depth: number, budget: CloneBudget): ProjectArchiveJson {
  budget.nodes += 1;
  if(budget.nodes > budget.maxNodes) throw new TypeError('Project archive contains too many values');
  if(depth > budget.maxDepth) throw new TypeError('Project archive nesting is too deep');
  if(value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if(typeof value === 'number') {
    if(!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number`);
    return value;
  }
  if(Array.isArray(value)) {
    return value.map((item, index) => cloneSafeJson(item, `${path}[${index}]`, depth + 1, budget));
  }
  if(!isRecord(value)) throw new TypeError(`${path} contains an unsupported value`);
  const result: Record<string, ProjectArchiveJson> = {};
  for(const key of Object.keys(value)) {
    if(FORBIDDEN_KEYS.has(key)) continue;
    result[key] = cloneSafeJson(value[key], `${path}.${key}`, depth + 1, budget);
  }
  return result;
}

function stringList(value: unknown): string[] {
  if(!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && !!item.trim()))];
}

function mapMode(value: unknown): ProjectArchiveMapMode {
  return value === 'day' || value === 'waypoint' ? value : 'elev';
}

function trailGroup(trail: Record<string, unknown>): string {
  return typeof trail.group === 'string' && trail.group.trim() ? trail.group : '默认';
}

function normalizeWorkspace(
  value: unknown,
  trails: ProjectArchiveTrail[],
): ProjectArchiveWorkspace {
  const input = isRecord(value) ? value : {};
  const ids = new Set(trails.map(trail => trail.id));
  const groups = [...new Set(trails.map(trail => trail.group))];
  const hasActiveTrailSelection = Array.isArray(input.activeTrails);
  const activeTrails = stringList(input.activeTrails).filter(id => ids.has(id));
  const hasActiveGroup = Object.prototype.hasOwnProperty.call(input, 'activeGroup');
  const activeGroup = hasActiveGroup && input.activeGroup === null
    ? null
    : typeof input.activeGroup === 'string' && groups.includes(input.activeGroup)
      ? input.activeGroup
      : groups[0] ?? null;
  const primaryByGroup: Record<string, string> = {};
  if(isRecord(input.primaryByGroup)) {
    for(const [group, id] of Object.entries(input.primaryByGroup)) {
      const trail = trails.find(candidate => candidate.id === id && candidate.group === group);
      if(trail) primaryByGroup[group] = trail.id;
    }
  }
  for(const group of groups) {
    if(!primaryByGroup[group]) {
      const first = trails.find(trail => trail.group === group);
      if(first) primaryByGroup[group] = first.id;
    }
  }
  const tagInput = isRecord(input.modeVisibleTags) ? input.modeVisibleTags : {};
  return {
    activeTrails:hasActiveTrailSelection ? activeTrails : trails.map(trail => trail.id),
    activeGroup,
    primaryByGroup,
    mode:mapMode(input.mode),
    modeVisibleTags:{
      day:stringList(tagInput.day),
      elev:stringList(tagInput.elev),
      waypoint:stringList(tagInput.waypoint),
    },
    waypointModeTags:stringList(input.waypointModeTags),
    showTrack:input.showTrack !== false,
    showLabel:input.showLabel !== false,
    showHighPoint:input.showHighPoint !== false,
    baseLayer:typeof input.baseLayer === 'string' && input.baseLayer ? input.baseLayer : 'sat',
    autoGenerateEscape:input.autoGenerateEscape === true,
  };
}

function normalizeArchive(
  value: unknown,
  options: ProjectArchiveParseOptions,
): ProjectArchiveParseResult {
  if(!isRecord(value) || value.format !== PROJECT_ARCHIVE_FORMAT) {
    return {ok:false, code:'invalid-format', message:'Not an Outdoor Route Studio project archive'};
  }
  const migration = migrateArchive(value);
  if(!migration) {
    return {
      ok:false,
      code:'unsupported-schema',
      message:`Unsupported project schema: ${String(value.schemaVersion)}`,
    };
  }
  const normalizedValue = migration.value;
  if(!isRecord(normalizedValue.project) || !Array.isArray(normalizedValue.project.trails)) {
    return {ok:false, code:'invalid-project', message:'Project data or trail list is missing'};
  }

  let project: Record<string, ProjectArchiveJson>;
  try {
    project = cloneSafeJson(normalizedValue.project, 'project', 0, {
      nodes:0,
      maxNodes:options.maxNodes ?? DEFAULT_MAX_NODES,
      maxDepth:options.maxDepth ?? DEFAULT_MAX_DEPTH,
    }) as Record<string, ProjectArchiveJson>;
  } catch(error) {
    return {ok:false, code:'unsafe-value', message:error instanceof Error ? error.message : String(error)};
  }

  const rawTrails = project.trails;
  if(!Array.isArray(rawTrails)) {
    return {ok:false, code:'invalid-project', message:'Project trail list is invalid'};
  }
  const trails: ProjectArchiveTrail[] = [];
  const ids = new Set<string>();
  for(let index = 0; index < rawTrails.length; index += 1) {
    const raw = rawTrails[index];
    if(!isRecord(raw) || typeof raw.id !== 'string' || !raw.id.trim() || !Array.isArray(raw.track)) {
      return {ok:false, code:'invalid-trail', message:`Trail ${index + 1} is missing an id or track`};
    }
    if(ids.has(raw.id)) {
      return {ok:false, code:'duplicate-trail-id', message:`Duplicate trail id: ${raw.id}`};
    }
    for(let pointIndex = 0; pointIndex < raw.track.length; pointIndex += 1) {
      const point = raw.track[pointIndex];
      if(!Array.isArray(point) || point.length < 2
        || typeof point[0] !== 'number' || !Number.isFinite(point[0]) || point[0] < -90 || point[0] > 90
        || typeof point[1] !== 'number' || !Number.isFinite(point[1]) || point[1] < -180 || point[1] > 180) {
        return {
          ok:false,
          code:'invalid-trail',
          message:`Trail ${raw.id} has an invalid coordinate at point ${pointIndex + 1}`,
        };
      }
    }
    ids.add(raw.id);
    raw.name = typeof raw.name === 'string' && raw.name.trim() ? raw.name : raw.id;
    raw.group = trailGroup(raw);
    trails.push(raw as ProjectArchiveTrail);
  }

  const calcMethod = isRecord(project.calc_method)
    ? project.calc_method as Record<string, ProjectArchiveJson>
    : {};
  return {
    ok:true,
    migratedFrom:migration.migratedFrom,
    archive:{
      format:PROJECT_ARCHIVE_FORMAT,
      schemaVersion:PROJECT_ARCHIVE_SCHEMA_VERSION,
      appVersion:typeof normalizedValue.appVersion === 'string' ? normalizedValue.appVersion : 'unknown',
      exportedAt:typeof normalizedValue.exportedAt === 'string' && Number.isFinite(Date.parse(normalizedValue.exportedAt))
        ? normalizedValue.exportedAt
        : new Date(0).toISOString(),
      project:{
        title:typeof project.title === 'string' && project.title.trim() ? project.title : 'Outdoor Route Studio',
        trails,
        calc_method:calcMethod,
      },
      workspace:normalizeWorkspace(normalizedValue.workspace, trails),
    },
  };
}

export function parseProjectArchive(
  text: string,
  options: ProjectArchiveParseOptions = {},
): ProjectArchiveParseResult {
  if(typeof text !== 'string') return {ok:false, code:'invalid-json', message:'Project archive must be text'};
  const bytes = new TextEncoder().encode(text).byteLength;
  if(bytes > (options.maxBytes ?? DEFAULT_MAX_BYTES)) {
    return {ok:false, code:'too-large', message:'Project archive is too large'};
  }
  try {
    return normalizeArchive(JSON.parse(text), options);
  } catch(error) {
    return {ok:false, code:'invalid-json', message:error instanceof Error ? error.message : String(error)};
  }
}

export function createProjectArchive<TTrail>(
  input: CreateProjectArchiveInput<TTrail>,
): ProjectArchive {
  const modeVisibleTags = input.state.modeVisibleTags || {};
  const raw = {
    format:PROJECT_ARCHIVE_FORMAT,
    schemaVersion:PROJECT_ARCHIVE_SCHEMA_VERSION,
    appVersion:input.appVersion,
    exportedAt:input.exportedAt || new Date().toISOString(),
    project:{
      title:input.project.title,
      trails:input.project.trails,
      calc_method:input.project.calc_method || {},
    },
    workspace:{
      activeTrails:[...input.state.activeTrails],
      activeGroup:input.state.activeGroup,
      primaryByGroup:input.state.primaryByGroup,
      mode:input.state.mode,
      modeVisibleTags:{
        day:[...(modeVisibleTags.day || [])],
        elev:[...(modeVisibleTags.elev || [])],
        waypoint:[...(modeVisibleTags.waypoint || [])],
      },
      waypointModeTags:[...(input.state.waypointModeTags || [])],
      showTrack:input.state.showTrack,
      showLabel:input.state.showLabel,
      showHighPoint:input.state.showHighPoint,
      baseLayer:input.state.baseLayer,
      autoGenerateEscape:input.state.autoGenerateEscape,
    },
  };
  const result = parseProjectArchive(JSON.stringify(raw));
  if(!result.ok) throw new TypeError(result.message);
  return result.archive;
}

export function serializeProjectArchive(archive: ProjectArchive): string {
  return `${JSON.stringify(archive, null, 2)}\n`;
}
