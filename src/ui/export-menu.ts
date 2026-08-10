import {createWorkbenchIcon, type WorkbenchIconName} from './icons.ts';

export interface ExportMenuItem {
  id: string;
  icon: WorkbenchIconName;
  label: string;
  description: string;
  disabled?: boolean;
  run: () => void | Promise<unknown>;
}

export interface ExportMenuController {
  toggle(anchor: HTMLElement, items: readonly ExportMenuItem[]): boolean;
  close(): boolean;
  destroy(): void;
}

/** Owns the export popup DOM and leaves export behavior in typed feature callbacks. */
export function createExportMenuController(document: Document): ExportMenuController {
  const view = document.defaultView;
  let popup: HTMLElement | null = null;
  let anchor: HTMLElement | null = null;

  const close = (): boolean => {
    if(!popup) return false;
    popup.remove();
    popup = null;
    anchor = null;
    document.removeEventListener('pointerdown', onOutside, true);
    view?.removeEventListener('resize', close);
    return true;
  };
  const onOutside = (event: Event): void => {
    const target = event.target as Node | null;
    if(target && (popup?.contains(target) || anchor?.contains(target))) return;
    close();
  };
  const position = (element: HTMLElement, control: HTMLElement): void => {
    const rect = control.getBoundingClientRect();
    const viewportWidth = view?.innerWidth ?? document.documentElement.clientWidth;
    const viewportHeight = view?.innerHeight ?? document.documentElement.clientHeight;
    const width = Math.min(300, Math.max(240, viewportWidth - 16));
    const left = Math.max(8, Math.min(rect.right - width, viewportWidth - width - 8));
    element.style.width = `${width}px`;
    element.style.left = `${left}px`;
    element.style.top = `${Math.max(8, Math.min(rect.bottom + 6, viewportHeight - element.offsetHeight - 8))}px`;
  };
  const toggle = (control: HTMLElement, items: readonly ExportMenuItem[]): boolean => {
    if(popup) return !close();
    anchor = control;
    const menu = document.createElement('div');
    menu.id = 'export-menu-popup';
    menu.className = 'studio-export-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', control.getAttribute('aria-label') || control.textContent || 'Export');
    for(const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'studio-export-menu__item';
      button.dataset.exportKind = item.id;
      button.disabled = Boolean(item.disabled);
      button.setAttribute('role', 'menuitem');
      const icon = createWorkbenchIcon(document, item.icon, {size:18});
      const copy = document.createElement('span');
      copy.className = 'studio-export-menu__copy';
      const label = document.createElement('strong');
      label.textContent = item.label;
      const description = document.createElement('small');
      description.textContent = item.description;
      copy.append(label, description);
      button.append(icon, copy);
      button.addEventListener('click', () => {
        close();
        void item.run();
      });
      menu.append(button);
    }
    document.body.append(menu);
    popup = menu;
    position(menu, control);
    queueMicrotask(() => document.addEventListener('pointerdown', onOutside, true));
    view?.addEventListener('resize', close, {once:true});
    menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll:true});
    return true;
  };
  return Object.freeze({toggle, close, destroy:close});
}
