import type { RuntimeContext } from '../../app/runtime/context.ts';
import type { BrowserFileAdapter } from '../../adapters/file.ts';
import type { DialogController } from '../../ui/dialog/controller.ts';
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

export interface ProjectRestoreUiDependencies<TTrail extends ProjectArchiveTrail> {
  button: HTMLButtonElement;
  input: HTMLInputElement;
  status: HTMLElement;
  dialogs: DialogController;
  archive: ReturnType<typeof createProjectArchiveController<TTrail>>;
  getLanguage: () => ProjectRuntimeLanguage;
  beforeRestore: () => void;
  afterRestore: () => void;
  close: () => void;
}

export function bindProjectRestoreUi<TTrail extends ProjectArchiveTrail>(
  dependencies: ProjectRestoreUiDependencies<TTrail>,
): {restoreFile: (file: File) => Promise<boolean>; destroy: () => void} {
  const {button, input, status, dialogs, archive} = dependencies;
  const restoreFile = async (file: File): Promise<boolean> => {
    const zh = dependencies.getLanguage() === 'zh';
    status.textContent = zh ? '正在检查项目备份…' : 'Checking project backup…';
    status.style.color = 'var(--text-dim)';
    try {
      const result = archive.parse(await file.text());
      if(!result.ok) {
        status.textContent = '';
        await dialogs.info({title:zh ? '无法恢复项目' : 'Cannot restore project', message:result.message, danger:true});
        return false;
      }
      const data = result.archive;
      const exportedAt = new Date(data.exportedAt).toLocaleString(zh ? 'zh-CN' : 'en');
      const migrated = result.migratedFrom == null ? '' : (zh
        ? `，备份格式已从 schema ${result.migratedFrom} 自动升级`
        : `; archive schema ${result.migratedFrom} will be migrated automatically`);
      const confirmed = await dialogs.confirm({
        title:zh ? '替换当前项目？' : 'Replace the current project?',
        message:zh
          ? `将恢复“${data.project.title}”（${data.project.trails.length} 条轨迹，来源 ${data.appVersion}，导出于 ${exportedAt}${migrated}）。当前项目会被完整替换。`
          : `Restore “${data.project.title}” (${data.project.trails.length} trails, from ${data.appVersion}, exported ${exportedAt}${migrated}). The current project will be replaced.`,
        confirmLabel:zh ? '替换并恢复' : 'Replace and restore',
        cancelLabel:zh ? '取消' : 'Cancel',
        danger:true,
      });
      if(!confirmed) { status.textContent = ''; return false; }
      dependencies.beforeRestore();
      const restored = archive.restore(data);
      if(restored.status !== 'restored') return false;
      dependencies.afterRestore();
      dependencies.close();
      return true;
    } catch(error) {
      status.textContent = '';
      await dialogs.info({
        title:zh ? '恢复项目失败' : 'Project restore failed',
        message:error instanceof Error ? error.message : String(error),
        danger:true,
      });
      return false;
    } finally {
      input.value = '';
    }
  };
  const onButtonClick = (): void => input.click();
  const onInputChange = (): void => {
    const file = input.files?.[0];
    if(file) void restoreFile(file);
  };
  button.addEventListener('click', onButtonClick);
  input.addEventListener('change', onInputChange);
  return Object.freeze({
    restoreFile,
    destroy() {
      button.removeEventListener('click', onButtonClick);
      input.removeEventListener('change', onInputChange);
    },
  });
}
