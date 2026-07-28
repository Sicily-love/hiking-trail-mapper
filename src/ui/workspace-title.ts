import type {DialogController} from './dialog/controller.ts';
import type {LocalizationLanguage} from '../features/localization/translations.ts';

export interface WorkspaceTitleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface WorkspaceTitleDependencies {
  document: Document;
  dialogs: DialogController;
  language: () => LocalizationLanguage;
  dispatchCommand: () => void;
  commandId: string;
  storage?: WorkspaceTitleStorage | null;
  storageKey?: string;
  titleElementId?: string;
}

export interface WorkspaceTitleController {
  title(): string;
  restore(): string | null;
  syncDocumentTitle(): void;
  rename(): Promise<boolean>;
  destroy(): void;
}

/** Owns the editable workspace title, persistence, and document-title synchronization. */
export function createWorkspaceTitleController(
  dependencies: WorkspaceTitleDependencies,
): WorkspaceTitleController {
  const {
    document,
    dialogs,
    language,
    dispatchCommand,
    commandId,
    storage = null,
    storageKey = 'hiking_title',
    titleElementId = 'app-title',
  } = dependencies;
  const element = document.getElementById(titleElementId);

  const title = (): string => element?.textContent?.trim() || document.title;
  const syncDocumentTitle = (): void => {
    if(element?.textContent) document.title = element.textContent;
  };
  const restore = (): string | null => {
    try {
      const stored = storage?.getItem(storageKey)?.trim();
      if(!stored || !element) return null;
      element.textContent = stored;
      syncDocumentTitle();
      return stored;
    } catch {
      return null;
    }
  };
  const rename = async (): Promise<boolean> => {
    if(!element) return false;
    const zh = language() === 'zh';
    const value = await dialogs.prompt({
      title:zh ? '修改标题' : 'Rename workspace',
      inputLabel:zh ? '标题' : 'Title',
      value:title(),
      required:true,
      selectOnOpen:true,
      confirmLabel:zh ? '保存' : 'Save',
      cancelLabel:zh ? '取消' : 'Cancel',
    });
    const next = value?.trim();
    if(!next) return false;
    element.textContent = next;
    syncDocumentTitle();
    try {
      storage?.setItem(storageKey, next);
    } catch {
      // Keep the in-session title even when persistence is unavailable.
    }
    return true;
  };
  const onDoubleClick = (): void => dispatchCommand();

  if(element) {
    element.dataset.commandId = commandId;
    element.addEventListener('dblclick', onDoubleClick);
  }
  restore();

  return Object.freeze({
    title,
    restore,
    syncDocumentTitle,
    rename,
    destroy:() => element?.removeEventListener('dblclick', onDoubleClick),
  });
}
