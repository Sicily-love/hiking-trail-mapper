export interface SidebarCollapseDependencies {
  document: Document;
  schedule?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  cancelScheduled?: (handle: ReturnType<typeof setTimeout>) => void;
  onLayoutChanged?: () => void;
  renderCollapsedPrimary?: () => boolean;
  positionCollapsedPrimary?: () => void;
}

export interface SidebarCollapseController {
  isCollapsed(): boolean;
  toggle(open?: boolean): void;
  close(): void;
  destroy(): void;
}

/** Owns sidebar collapse DOM, the collapsed primary card, and delayed layout refresh. */
export function createSidebarCollapseController(
  dependencies: SidebarCollapseDependencies,
): SidebarCollapseController {
  const {
    document,
    schedule = (callback, delayMs) => setTimeout(callback, delayMs),
    cancelScheduled = handle => clearTimeout(handle),
    onLayoutChanged,
    renderCollapsedPrimary,
    positionCollapsedPrimary,
  } = dependencies;
  const sidebar = document.getElementById('sidebar');
  const closeButton = document.getElementById('sidebar-close');
  const primaryMini = document.getElementById('primary-mini');
  let layoutHandle: ReturnType<typeof setTimeout> | null = null;

  const isCollapsed = (): boolean => !sidebar || sidebar.classList.contains('collapsed');

  const syncPrimaryMini = (): void => {
    if(!primaryMini) return;
    if(!isCollapsed()) {
      primaryMini.style.display = 'none';
      return;
    }
    const hasPrimary = renderCollapsedPrimary?.() || false;
    primaryMini.style.display = hasPrimary ? 'block' : 'none';
    if(hasPrimary) positionCollapsedPrimary?.();
  };

  const toggle = (open?: boolean): void => {
    if(!sidebar) return;
    const nextOpen = open ?? isCollapsed();
    sidebar.classList.toggle('collapsed', !nextOpen);
    if(layoutHandle !== null) cancelScheduled(layoutHandle);
    layoutHandle = schedule(() => {
      layoutHandle = null;
      onLayoutChanged?.();
    }, 280);
    syncPrimaryMini();
  };

  const close = (): void => toggle(false);
  const onClose = (): void => close();
  closeButton?.addEventListener('click', onClose);

  return Object.freeze({
    isCollapsed,
    toggle,
    close,
    destroy(): void {
      closeButton?.removeEventListener('click', onClose);
      if(layoutHandle !== null) cancelScheduled(layoutHandle);
      layoutHandle = null;
    },
  });
}
