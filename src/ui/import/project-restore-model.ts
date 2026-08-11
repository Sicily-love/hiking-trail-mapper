import {
  summarizeProjectArchive,
  type ProjectArchive,
  type ProjectArchiveTrail,
} from '../../core/project-archive.ts';
import type {ContentDialogOptions} from '../dialog/content-model.ts';
import type {ProjectRuntimeLanguage} from '../../features/project/runtime.ts';

function formatCount(value: number, language: ProjectRuntimeLanguage): string {
  return new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'en').format(value);
}

function formatBytes(bytes: number): string {
  if(bytes < 1024) return `${bytes} B`;
  if(bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

export function buildProjectRestorePreview<TTrail extends ProjectArchiveTrail>(
  archive: ProjectArchive<TTrail>,
  options: {
    language: ProjectRuntimeLanguage;
    archiveBytes: number;
    migratedFrom: number | null;
  },
): ContentDialogOptions {
  const zh = options.language === 'zh';
  const summary = summarizeProjectArchive(archive, options.archiveBytes);
  const exportedAt = new Date(archive.exportedAt).toLocaleString(zh ? 'zh-CN' : 'en');
  const count = (value: number): string => formatCount(value, options.language);
  const migration = options.migratedFrom == null
    ? (zh ? '无需迁移' : 'No migration needed')
    : `schema ${options.migratedFrom} → ${archive.schemaVersion}`;
  return {
    title:zh ? '检查完整项目备份' : 'Review complete project backup',
    message:zh
      ? `将用“${archive.project.title}”替换当前项目。恢复前请确认下面的内容。`
      : `“${archive.project.title}” will replace the current project. Review its contents first.`,
    closeLabel:zh ? '取消' : 'Cancel',
    size:'wide',
    danger:true,
    sections:[
      {
        heading:zh ? '备份信息' : 'Archive',
        rows:[
          {label:zh ? '来源版本' : 'Source version', value:archive.appVersion},
          {label:zh ? '导出时间' : 'Exported', value:exportedAt},
          {label:zh ? '文件大小' : 'File size', value:formatBytes(summary.archiveBytes)},
          {label:zh ? '格式迁移' : 'Migration', value:migration},
        ],
      },
      {
        heading:zh ? '项目内容' : 'Project contents',
        rows:[
          {label:zh ? '轨迹 / 轨迹点' : 'Trails / points', value:`${count(summary.trailCount)} / ${count(summary.trackPointCount)}`},
          {label:zh ? '轨迹组 / 已显示轨迹' : 'Groups / visible trails', value:`${count(summary.groupCount)} / ${count(summary.activeTrailCount)}`},
          {label:zh ? '每日行程 / 下撤方案' : 'Days / escape routes', value:`${count(summary.dayCount)} / ${count(summary.escapeRouteCount)}`},
          {label:zh ? '标注点 / 图片' : 'Waypoints / photos', value:`${count(summary.waypointCount)} / ${count(summary.waypointPhotoCount)}`},
        ],
      },
      {
        tone:'warning',
        paragraphs:[zh
          ? '恢复会重建里程、海拔、Day、标注吸附和下撤指标，并在保存后自动复位地图。失败时会回滚到当前项目。'
          : 'Restore rebuilds route, elevation, Day, waypoint, and escape metrics, saves them, then resets the map. Failure rolls back to the current project.'],
      },
    ],
    actions:[{
      id:'restore',
      label:zh ? '替换并恢复' : 'Replace and restore',
      kind:'danger',
    }],
  };
}
