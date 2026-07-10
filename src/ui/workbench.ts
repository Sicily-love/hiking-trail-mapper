const COMMANDS = [
  ['help-btn', '？', '帮助'],
  ['reset-btn', '⌖', '复位'],
  ['measure-btn', '↔', '测距'],
  ['segment-btn', '▥', '分段'],
  ['add-waypoint-btn', '●', '标注'],
  ['add-escape-btn', '↗', '下撤'],
  ['reverse-btn', '⇄', '反向'],
  ['add-trail-btn', '+', '轨迹'],
  ['export-btn', '⇧', '导出'],
  ['clear-btn', '×', '清空'],
] as const;

const ELEVATION_COLLAPSED_KEY = 'hiking_elevation_dock_collapsed';

export function shouldCloseSidebarForFit(viewportWidth: number, sidebarCollapsed: boolean): boolean {
  return viewportWidth <= 760 && !sidebarCollapsed;
}

function decorateCommandButtons(document: Document): void {
  COMMANDS.forEach(([id, icon, label]) => {
    const button = document.getElementById(id);
    if(!button || button.querySelector('.tb-icon')) return;
    const translatedLabel = (button.textContent || '').trim().replace(/^[^\p{L}\p{N}]+/u, '').trim() || label;
    button.dataset.decorated = 'true';
    button.textContent = '';
    const iconNode = document.createElement('span');
    iconNode.className = 'tb-icon';
    iconNode.setAttribute('aria-hidden', 'true');
    iconNode.textContent = icon;
    const labelNode = document.createElement('span');
    labelNode.className = 'tb-label';
    labelNode.textContent = translatedLabel;
    button.append(iconNode, labelNode);
    button.setAttribute('aria-label', translatedLabel);
  });
}

function installToolbarChrome(document: Document): void {
  const toolbar = document.getElementById('map-toolbar');
  if(!toolbar || toolbar.querySelector('.toolbar-brand')) return;
  const brand = document.createElement('div');
  brand.className = 'toolbar-brand';
  brand.innerHTML = '<span class="toolbar-brand-mark">△</span><span><strong>路线工作台</strong><small id="toolbar-context">TRAIL WORKSPACE</small></span>';
  toolbar.prepend(brand);
  const groups = toolbar.querySelectorAll<HTMLElement>('.toolbar-group');
  groups[0]?.classList.add('toolbar-primary');
  groups[1]?.classList.add('toolbar-secondary');

  const more = document.createElement('button');
  more.id = 'toolbar-more';
  more.className = 'tb-btn toolbar-more';
  more.type = 'button';
  more.innerHTML = '<span class="tb-icon" aria-hidden="true">•••</span><span class="tb-label">更多</span>';
  more.setAttribute('aria-expanded', 'false');
  groups[0]?.append(more);
  more.addEventListener('click', event => {
    event.stopPropagation();
    const open = toolbar.classList.toggle('secondary-open');
    more.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', event => {
    if(!toolbar.contains(event.target as Node)) {
      toolbar.classList.remove('secondary-open');
      more.setAttribute('aria-expanded', 'false');
    }
  });
}

function installSidebarChrome(document: Document): void {
  const sidebar = document.getElementById('sidebar');
  const primary = document.getElementById('primary-card');
  if(!sidebar || !primary || sidebar.querySelector('.sidebar-heading')) return;
  const heading = document.createElement('div');
  heading.className = 'sidebar-heading';
  heading.innerHTML = '<span><small>ROUTE LIBRARY</small><strong>路线与行程</strong></span><span class="sidebar-status" aria-hidden="true"></span>';
  sidebar.insertBefore(heading, primary);
}

function installElevationDock(document: Document, storage?: Storage): void {
  const dock = document.getElementById('elev-bar');
  if(!dock || dock.querySelector('#elev-toggle')) return;
  const button = document.createElement('button');
  button.id = 'elev-toggle';
  button.className = 'elev-toggle';
  button.type = 'button';
  button.title = '收起或展开海拔分析';
  const collapsed = storage?.getItem(ELEVATION_COLLAPSED_KEY) === '1';
  dock.classList.toggle('collapsed', collapsed);
  button.setAttribute('aria-expanded', String(!collapsed));
  button.textContent = collapsed ? '⌃' : '⌄';
  button.addEventListener('click', event => {
    event.stopPropagation();
    const next = dock.classList.toggle('collapsed');
    button.textContent = next ? '⌃' : '⌄';
    button.setAttribute('aria-expanded', String(!next));
    storage?.setItem(ELEVATION_COLLAPSED_KEY, next ? '1' : '0');
  });
  dock.append(button);
}

function localizeWorkbenchChrome(document: Document): void {
  const english = document.getElementById('help-btn')?.getAttribute('aria-label') === 'Help';
  const brand = document.querySelector<HTMLElement>('.toolbar-brand strong');
  const sidebar = document.querySelector<HTMLElement>('.sidebar-heading strong');
  const more = document.querySelector<HTMLElement>('#toolbar-more .tb-label');
  if(brand) brand.textContent = english ? 'Trail Console' : '路线工作台';
  if(sidebar) sidebar.textContent = english ? 'Routes & Itinerary' : '路线与行程';
  if(more) more.textContent = english ? 'More' : '更多';
}

export function initializeWorkbenchChrome(document: Document, storage?: Storage): void {
  decorateCommandButtons(document);
  installToolbarChrome(document);
  installSidebarChrome(document);
  installElevationDock(document, storage);
  localizeWorkbenchChrome(document);
  document.documentElement.dataset.ui = 'field-console';
}

export { COMMANDS, ELEVATION_COLLAPSED_KEY };
