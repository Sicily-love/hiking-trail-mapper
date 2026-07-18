import type { RuntimeContext } from '../../app/runtime/context.ts';
import type { BrowserFileAdapter, FileArchiveAdapter } from '../../adapters/file.ts';
import {
  KML_MIME,
  buildGroupExportFiles,
  buildItineraryMarkdown,
  buildMergedKml,
  buildTrailKml,
  groupTrackByDay,
  sanitizeExportFilename,
  type ExportTrail,
} from '../../core/export.ts';

export type FileExportEvent =
  | {type:'export.error'; reason:'missing-trails' | 'missing-primary' | 'archive-failed'; error?: unknown}
  | {type:'export.progress'; kind:'itinerary'}
  | {type:'export.fallback'; downloadCount: number}
  | {type:'export.completed'; kind:'trail-kml' | 'group-zip' | 'itinerary'; filename: string; trailCount?: number};

export type FileExportResult =
  | {status:'exported'; filename: string}
  | {status:'fallback'; downloadCount: number}
  | {status:'missing'}
  | {status:'failed'; error: unknown};

export interface FileExportControllerDependencies {
  archive: FileArchiveAdapter;
  files: BrowserFileAdapter;
  dayPalette: readonly string[];
  renderDayChart: (points: ExportTrail['track'], color: string, label: string) => string;
  getLanguage: () => 'zh' | 'en';
  now?: () => Date;
  schedule?: (callback: () => void, delayMs: number) => unknown;
  onEvent?: (event: FileExportEvent) => void;
}

export interface FileExportController {
  downloadTrailKml: (trailId: string) => FileExportResult;
  exportGroupKml: () => Promise<FileExportResult>;
  exportItineraryMarkdown: () => Promise<FileExportResult>;
}

/** Owns export selection and file plans without DOM, Blob, URL, Canvas, or fflate access. */
export function createFileExportController(
  context: RuntimeContext<ExportTrail>,
  dependencies: FileExportControllerDependencies,
): FileExportController {
  if(!dependencies.dayPalette.length) throw new TypeError('FileExportController requires a Day palette');
  const now = dependencies.now || (() => new Date());
  const schedule = dependencies.schedule || ((callback, delayMs) => setTimeout(callback, delayMs));
  const emit = (event: FileExportEvent): void => dependencies.onEvent?.(event);

  const downloadTrailKml = (trailId: string): FileExportResult => {
    const trail = context.project.trails.find(candidate => candidate.id === trailId);
    if(!trail) return {status:'missing'};
    const filename = `${sanitizeExportFilename(trail.name)}.kml`;
    dependencies.files.download(buildTrailKml(trail), filename, KML_MIME);
    emit({type:'export.completed', kind:'trail-kml', filename});
    return {status:'exported', filename};
  };

  const exportGroupKml = async (): Promise<FileExportResult> => {
    const state = context.state.snapshot();
    const trails = context.project.trails.filter(trail =>
      state.activeGroup != null
      && (trail.group || '默认') === state.activeGroup
      && state.activeTrails.has(trail.id));
    if(!trails.length) {
      emit({type:'export.error', reason:'missing-trails'});
      return {status:'missing'};
    }
    const date = now();
    const groupName = state.activeGroup || '未选中';
    const safeGroup = sanitizeExportFilename(groupName, 'routes');
    const dateLabel = date.toLocaleString('zh-CN');
    const dateStamp = date.toISOString().slice(0, 10);

    if(dependencies.archive.available) {
      try {
        const archive = await dependencies.archive.zipTextFiles(
          buildGroupExportFiles(trails, groupName, dateLabel),
        );
        const filename = `${safeGroup}_轨迹_${dateStamp}.zip`;
        dependencies.files.download(archive, filename, 'application/zip');
        emit({type:'export.completed', kind:'group-zip', filename, trailCount:trails.length});
        return {status:'exported', filename};
      } catch(error) {
        emit({type:'export.error', reason:'archive-failed', error});
        return {status:'failed', error};
      }
    }

    const mergedName = `_${safeGroup}_合并导入.kml`;
    dependencies.files.download(buildMergedKml(trails, groupName, dateLabel), mergedName, KML_MIME);
    trails.forEach((trail, index) => schedule(() => {
      dependencies.files.download(
        buildTrailKml(trail),
        `${sanitizeExportFilename(trail.name)}.kml`,
        KML_MIME,
      );
    }, (index + 1) * 400));
    const downloadCount = trails.length + 1;
    emit({type:'export.fallback', downloadCount});
    return {status:'fallback', downloadCount};
  };

  const exportItineraryMarkdown = async (): Promise<FileExportResult> => {
    const primaryId = context.state.snapshot().primaryTrailId;
    const trail = context.project.trails.find(candidate => candidate.id === primaryId);
    if(!trail) {
      emit({type:'export.error', reason:'missing-primary'});
      return {status:'missing'};
    }
    emit({type:'export.progress', kind:'itinerary'});
    const charts: Record<number, string> = {};
    groupTrackByDay(trail.track, trail.track_breaks).forEach((group, index) => {
      charts[group.day] = dependencies.renderDayChart(
        group.points,
        dependencies.dayPalette[index % dependencies.dayPalette.length],
        `D${group.day}`,
      );
    });
    const language = dependencies.getLanguage();
    const markdown = buildItineraryMarkdown(trail, language, charts);
    const filename = `${sanitizeExportFilename(trail.name)}_${language === 'zh' ? '行程' : 'itinerary'}.md`;
    await dependencies.files.saveText(markdown, filename, 'text/markdown;charset=utf-8', '.md');
    emit({type:'export.completed', kind:'itinerary', filename});
    return {status:'exported', filename};
  };

  return Object.freeze({downloadTrailKml, exportGroupKml, exportItineraryMarkdown});
}
