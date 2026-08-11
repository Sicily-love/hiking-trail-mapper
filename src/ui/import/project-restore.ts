import type {DialogController} from '../dialog/controller.ts';
import type {ProjectArchiveTrail} from '../../core/project-archive.ts';
import type {createProjectArchiveController} from '../../features/project/archive-controller.ts';
import type {ProjectRuntimeLanguage} from '../../features/project/runtime.ts';
import {buildProjectRestorePreview} from './project-restore-model.ts';

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
  const setStage = (stage: string, message: string, danger = false): void => {
    status.dataset.restoreStage = stage;
    status.textContent = message;
    status.style.color = danger ? 'var(--danger)' : 'var(--text-dim)';
    status.setAttribute('role', danger ? 'alert' : 'status');
    status.setAttribute('aria-live', 'polite');
  };
  const yieldForPaint = (): Promise<void> => new Promise(resolve => {
    const view = status.ownerDocument?.defaultView;
    if(!view?.requestAnimationFrame) { resolve(); return; }
    view.requestAnimationFrame(() => view.setTimeout(resolve, 0));
  });
  const restoreFile = async (file: File): Promise<boolean> => {
    const zh = dependencies.getLanguage() === 'zh';
    button.disabled = true;
    setStage('reading', zh ? '正在读取并检查项目备份…' : 'Reading and checking project backup…');
    try {
      const text = await file.text();
      const result = archive.parse(text);
      if(!result.ok) {
        setStage('failed', zh ? '备份检查失败' : 'Backup check failed', true);
        await dialogs.info({title:zh ? '无法恢复项目' : 'Cannot restore project', message:result.message, danger:true});
        return false;
      }
      const data = result.archive;
      setStage('review', zh ? '备份检查通过，等待确认' : 'Backup passed validation; awaiting confirmation');
      const decision = await dialogs.content(buildProjectRestorePreview(data, {
        language:dependencies.getLanguage(),
        archiveBytes:new TextEncoder().encode(text).byteLength,
        migratedFrom:result.migratedFrom,
      }));
      if(decision !== 'restore') { setStage('idle', ''); return false; }
      dependencies.beforeRestore();
      setStage('rebuilding', zh ? '正在重建轨迹与行程数据…' : 'Rebuilding route and itinerary data…');
      await yieldForPaint();
      const restored = await archive.restore(data);
      if(restored.status !== 'restored') {
        setStage('failed', restored.rolledBack
          ? (zh ? '恢复失败，已回滚当前项目' : 'Restore failed; current project was recovered')
          : (zh ? '恢复失败' : 'Restore failed'), true);
        await dialogs.info({
          title:zh ? '恢复项目失败' : 'Project restore failed',
          message:restored.error instanceof Error ? restored.error.message : String(restored.error),
          danger:true,
        });
        return false;
      }
      dependencies.afterRestore();
      setStage('complete', zh
        ? `恢复完成：${restored.trailCount} 条轨迹，地图已复位`
        : `Restore complete: ${restored.trailCount} trails; map reset`);
      dependencies.close();
      return true;
    } catch(error) {
      setStage('failed', zh ? '恢复项目失败' : 'Project restore failed', true);
      await dialogs.info({
        title:zh ? '恢复项目失败' : 'Project restore failed',
        message:error instanceof Error ? error.message : String(error),
        danger:true,
      });
      return false;
    } finally {
      button.disabled = false;
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
