import type { RuntimeContext } from '../../app/runtime/context.ts';
import type { BrowserFileAdapter } from '../../adapters/file.ts';
import type { ProjectArchiveTrail } from '../../core/projectArchive.ts';
import { createProjectArchiveController } from './archive-controller.ts';
import { createProjectHistoryController } from '../history/controller.ts';

export type ProjectRuntimeLanguage = 'zh' | 'en';
export type ProjectRuntimeToast = (message: string, type?: 'info' | 'error') => void;

export interface ProjectRuntimeDependencies {
  files: BrowserFileAdapter;
  appVersion: string;
  getLanguage: () => ProjectRuntimeLanguage;
  commitArchive: () => void;
  resetArchiveView: () => void | Promise<unknown>;
  persistHistory: () => void;
  renderHistory: () => void;
  beforeHistoryApply: () => void;
  notifyCommands: () => void;
  notify: ProjectRuntimeToast;
}

/** Composes archive and history services so runtime only supplies browser effects. */
export function createProjectRuntimeController<TTrail extends ProjectArchiveTrail>(
  context: RuntimeContext<TTrail>,
  dependencies: ProjectRuntimeDependencies,
) {
  const language = (): ProjectRuntimeLanguage => dependencies.getLanguage();
  let history: ReturnType<typeof createProjectHistoryController<TTrail>>;
  const archive = createProjectArchiveController(context, {
    files:dependencies.files,
    appVersion:dependencies.appVersion,
    commit:dependencies.commitArchive,
    resetView:dependencies.resetArchiveView,
    onEvent:event => {
      if(event.type === 'project-archive.exported') {
        dependencies.notify(language() === 'zh'
          ? `完整项目已备份：${event.filename}`
          : `Project backup exported: ${event.filename}`);
      } else if(event.type === 'project-archive.restored') {
        history?.clear();
        dependencies.notify(language() === 'zh'
          ? `已恢复“${event.title}”（${event.trailCount} 条轨迹）`
          : `Restored “${event.title}” (${event.trailCount} trails)`);
      } else if(event.type === 'project-archive.failed' && event.operation === 'export') {
        dependencies.notify(language() === 'zh'
          ? `项目备份失败：${event.message}`
          : `Project backup failed: ${event.message}`, 'error');
      } else if(event.type === 'project-archive.rolled-back') {
        dependencies.notify(language() === 'zh'
          ? '恢复失败，已自动回到恢复前状态'
          : 'Restore failed; the previous project was recovered', 'error');
      }
    },
  });
  history = createProjectHistoryController(context, {
    appVersion:dependencies.appVersion,
    persist:dependencies.persistHistory,
    render:dependencies.renderHistory,
    beforeApply:dependencies.beforeHistoryApply,
    onEvent:event => {
      dependencies.notifyCommands();
      if(event.type === 'history.skipped') {
        dependencies.notify(language() === 'zh'
          ? `“${event.label}”已完成，但项目过大，本次修改未加入撤销历史`
          : `“${event.label}” completed, but the project is too large to retain this edit in undo history`, 'error');
        return;
      }
      if(event.type !== 'history.applied') return;
      const action = event.direction === 'undo'
        ? (language() === 'zh' ? '已撤销' : 'Undid')
        : (language() === 'zh' ? '已重做' : 'Redid');
      dependencies.notify(`${action}：${event.label}`);
    },
  });
  const label = (zh: string, en: string): string => language() === 'zh' ? zh : en;
  const recordEdit = <TResult>(zh: string, en: string, operation: () => TResult): TResult =>
    history.execute(label(zh, en), operation);
  return Object.freeze({archive, history, label, recordEdit});
}
