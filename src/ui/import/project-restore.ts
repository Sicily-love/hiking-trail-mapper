import type {DialogController} from '../dialog/controller.ts';
import type {ProjectArchiveTrail} from '../../core/projectArchive.ts';
import type {createProjectArchiveController} from '../../features/project/archive-controller.ts';
import type {ProjectRuntimeLanguage} from '../../features/project/runtime.ts';

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

/** Owns project-restore file input and status DOM while the feature owns validation and writes. */
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
