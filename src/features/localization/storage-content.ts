import type { ContentDialogOptions, ContentDialogSection } from '../../ui/dialog/content-model.ts';
import type { LocalizationLanguage } from './translations.ts';

export interface StorageInfoSnapshot {
  trailCount: number;
  estimateSupported: boolean;
  persistSupported: boolean;
  usedBytes?: number;
  quotaBytes?: number;
  persisted: boolean;
  error?: string;
}

const MB = 1024 * 1024;

export function buildStorageDialogModel(
  language: LocalizationLanguage,
  snapshot: StorageInfoSnapshot,
): ContentDialogOptions {
  const zh = language === 'zh';
  const sections: ContentDialogSection[] = [];
  if(snapshot.error) {
    sections.push({tone:'danger', paragraphs:[snapshot.error]});
  } else if(snapshot.estimateSupported) {
    const used = snapshot.usedBytes || 0;
    const quota = snapshot.quotaBytes || 0;
    const percent = quota > 0 ? Math.min(100, used / quota * 100) : 0;
    sections.push({
      rows:[
        {label:zh ? '已用' : 'Used', value:`${(used / MB).toFixed(2)} MB`},
        {label:zh ? '总配额' : 'Quota', value:`${(quota / MB).toFixed(0)} MB (${percent.toFixed(1)}%)`},
        {label:zh ? '轨迹数' : 'Trails', value:String(snapshot.trailCount)},
      ],
      progress:{value:percent, label:zh ? `已使用 ${percent.toFixed(1)}%` : `${percent.toFixed(1)}% used`},
    });
  } else {
    sections.push({tone:'muted', paragraphs:[zh ? '当前浏览器不支持存储配额查询。' : 'This browser does not support storage quota estimates.']});
  }

  sections.push(snapshot.persisted
    ? {tone:'success', heading:zh ? '持久化存储已启用' : 'Persistent storage enabled', paragraphs:[zh ? '浏览器不会在常规空间回收中自动清理这些数据。' : 'The browser should retain this data during routine storage cleanup.']}
    : {tone:'warning', heading:zh ? '尚未启用持久化存储' : 'Persistent storage is not enabled', paragraphs:[zh ? '存储空间不足时，浏览器可能清理站点数据。' : 'The browser may clear site data when storage is constrained.']});
  sections.push({
    heading:zh ? '建议' : 'Recommendation',
    items:zh
      ? ['配额由浏览器和设备可用空间自动管理。', '重要轨迹应定期通过导出功能备份。', '空间不足时可在浏览器站点设置中清理其他数据。']
      : ['Quota is managed automatically from available device storage.', 'Back up important trails regularly with Export.', 'Use browser site settings to clear other data when space is low.'],
  });

  return {
    title:zh ? '浏览器存储' : 'Browser storage',
    closeLabel:zh ? '关闭' : 'Close',
    sections,
    actions:snapshot.persisted || snapshot.error || !snapshot.persistSupported ? [] : [{
      id:'persist', label:zh ? '请求持久化' : 'Request persistence', kind:'primary',
    }],
  };
}
