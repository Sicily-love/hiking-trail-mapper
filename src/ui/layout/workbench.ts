import { createWorkbenchIcon } from '../icons.ts';
import type { WorkbenchIconName } from '../icons.ts';
import {
  STUDIO_COMMANDS,
  type CommandRegistry,
  type StudioCommandId,
} from '../../app/command.ts';

interface ControlDefinition {
  icon: WorkbenchIconName;
  label: string;
  labelZh: string;
}

interface CommandDefinition extends ControlDefinition {
  commandId: StudioCommandId;
}

export const COMMAND_DEFINITIONS = {
  'add-trail-btn': { icon: 'plus', label: 'Add trail', labelZh: '添加轨迹', commandId: STUDIO_COMMANDS.FILE_IMPORT },
  'reverse-btn': { icon: 'rotate', label: 'Reverse trail', labelZh: '反向轨迹', commandId: STUDIO_COMMANDS.TRAIL_REVERSE },
  'stitch-btn': { icon: 'combine', label: 'Stitch trails', labelZh: '拼接轨迹', commandId: STUDIO_COMMANDS.TRAIL_STITCH },
  'clear-btn': { icon: 'trash', label: 'Clear all', labelZh: '清空项目', commandId: STUDIO_COMMANDS.PROJECT_CLEAR },
  'measure-btn': { icon: 'ruler', label: 'Measure', labelZh: '测距', commandId: STUDIO_COMMANDS.MEASURE_TOGGLE },
  'segment-btn': { icon: 'calendar', label: 'Plan segments', labelZh: '行程分段', commandId: STUDIO_COMMANDS.SEGMENT_TOGGLE },
  'add-escape-btn': { icon: 'shield', label: 'Add escape route', labelZh: '添加下撤路线', commandId: STUDIO_COMMANDS.ESCAPE_TOGGLE },
  'add-waypoint-btn': { icon: 'map-pin', label: 'Waypoint', labelZh: '标注', commandId: STUDIO_COMMANDS.WAYPOINT_TOGGLE },
  'reset-btn': { icon: 'crosshair', label: 'Reset', labelZh: '复位', commandId: STUDIO_COMMANDS.MAP_RESET },
  'help-btn': { icon: 'help', label: 'Help', labelZh: '帮助', commandId: STUDIO_COMMANDS.HELP_OPEN },
  'lang-btn': { icon: 'language', label: 'Language', labelZh: '语言', commandId: STUDIO_COMMANDS.LANGUAGE_TOGGLE },
  'export-btn': { icon: 'download', label: 'Export', labelZh: '导出', commandId: STUDIO_COMMANDS.FILE_EXPORT },
} as const satisfies Record<string, CommandDefinition>;

export const MENU_DEFINITIONS = [
  { key: 'edit', label: 'Edit', labelZh: '编辑', icon: 'pencil', commandIds: ['reverse-btn', 'stitch-btn', 'clear-btn'] },
  { key: 'plan', label: 'Plan', labelZh: '规划', icon: 'calendar', commandIds: ['segment-btn', 'add-escape-btn'] },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  labelZh: string;
  icon: WorkbenchIconName;
  commandIds: ReadonlyArray<keyof typeof COMMAND_DEFINITIONS>;
}>;

export const DIRECT_COMMAND_IDS = [
  'add-trail-btn',
  'measure-btn',
  'add-waypoint-btn',
  'export-btn',
  'reset-btn',
  'help-btn',
  'lang-btn',
] as const satisfies ReadonlyArray<keyof typeof COMMAND_DEFINITIONS>;

export const TOOLBAR_LAYOUT = [
  { kind: 'command', id: 'add-trail-btn' },
  { kind: 'menu', key: 'edit' },
  { kind: 'command', id: 'measure-btn' },
  { kind: 'menu', key: 'plan' },
  { kind: 'command', id: 'add-waypoint-btn' },
  { kind: 'command', id: 'export-btn' },
  { kind: 'command', id: 'reset-btn' },
  { kind: 'command', id: 'help-btn' },
  { kind: 'command', id: 'lang-btn' },
] as const;

export const ACTIVITY_DEFINITIONS = [
  { key: 'groups', label: 'Trail Groups', labelZh: '轨迹组', icon: 'folder-tree', commandId: STUDIO_COMMANDS.WORKSPACE_GROUPS },
  { key: 'trails', label: 'Trails', labelZh: '轨迹', icon: 'route', commandId: STUDIO_COMMANDS.WORKSPACE_TRAILS },
  { key: 'itinerary', label: 'Itinerary', labelZh: '行程', icon: 'calendar', commandId: STUDIO_COMMANDS.WORKSPACE_ITINERARY },
  { key: 'waypoints', label: 'Waypoints', labelZh: '标注点', icon: 'waypoints', commandId: STUDIO_COMMANDS.WORKSPACE_WAYPOINTS },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  labelZh: string;
  icon: WorkbenchIconName;
  commandId: StudioCommandId;
}>;

export const MAP_MODE_DEFINITIONS = [
  { mode: 'elev', label: 'Elevation mode', labelZh: '海拔模式', icon: 'mountain' },
  { mode: 'waypoint', label: 'Waypoint mode', labelZh: '标注点模式', icon: 'map-pin' },
] as const satisfies ReadonlyArray<ControlDefinition & { mode: 'elev' | 'waypoint' }>;

export const WORKBENCH_STORAGE_KEYS = {
  activity: 'hiking_workbench2_activity',
  elevationCollapsed: 'hiking_elevation_dock_collapsed',
} as const;

const AUXILIARY_CONTROLS = {
  'measure-reset': { icon: 'rotate', label: 'Reset points', labelZh: '重新选点' },
  'measure-reverse': { icon: 'arrow-left-right', label: 'Reverse points', labelZh: '反向' },
  'measure-exit': { icon: 'x', label: 'Exit measure', labelZh: '退出测距' },
  'segment-close': { icon: 'x', label: 'Close segment panel', labelZh: '关闭分段面板' },
  'segment-undo': { icon: 'undo', label: 'Undo segment', labelZh: '撤销分段' },
  'segment-restore': { icon: 'rotate', label: 'Restore initial segments', labelZh: '还原初始分段' },
  'segment-apply': { icon: 'check', label: 'Apply segments', labelZh: '应用分段' },
  'segment-exit': { icon: 'x', label: 'Exit segment mode', labelZh: '退出分段' },
  'addescape-close': { icon: 'x', label: 'Close escape panel', labelZh: '关闭下撤面板' },
  'addescape-commit': { icon: 'save', label: 'Save escape route', labelZh: '保存下撤路线' },
  'addescape-reset': { icon: 'rotate', label: 'Reset escape route', labelZh: '重选下撤路线' },
  'addescape-exit': { icon: 'x', label: 'Exit escape mode', labelZh: '退出下撤' },
  'sidebar-close': { icon: 'panel-left-close', label: 'Close sidebar', labelZh: '收起侧栏' },
} as const satisfies Record<string, ControlDefinition>;

export type WorkbenchMenuKey = (typeof MENU_DEFINITIONS)[number]['key'];
export type WorkbenchActivityKey = (typeof ACTIVITY_DEFINITIONS)[number]['key'];
export type WorkbenchStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface WorkbenchLayoutController {
  activateActivity(activity: WorkbenchActivityKey): void;
  closeMenus(): void;
  setLanguage(language: WorkbenchLanguage): void;
  destroy(): void;
}

export type WorkbenchLanguage = 'zh' | 'en';

export function shouldCloseSidebarForFit(viewportWidth: number, sidebarCollapsed: boolean): boolean {
  return viewportWidth <= 760 && !sidebarCollapsed;
}

function localizedLabel(definition: ControlDefinition, language: WorkbenchLanguage): string {
  return language === 'zh' ? definition.labelZh : definition.label;
}

interface MenuView {
  panel: HTMLElement;
  trigger: HTMLButtonElement;
}

const controllers = new WeakMap<Document, WorkbenchLayoutController>();

function createElement<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}

function readStorage(storage: WorkbenchStorage | null | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(storage: WorkbenchStorage | null | undefined, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage is an enhancement; layout behavior does not depend on it.
  }
}

function decorateControl(
  document: Document,
  control: HTMLElement,
  definition: ControlDefinition,
  kind: 'command' | 'control',
  language: WorkbenchLanguage,
): void {
  const label = localizedLabel(definition, language);
  const iconWrap = createElement(document, 'span', kind === 'command'
    ? 'tb-icon studio-command-icon'
    : 'studio-control-icon');
  const labelNode = createElement(document, 'span', kind === 'command'
    ? 'tb-label studio-command-label'
    : 'studio-control-label');
  iconWrap.setAttribute('aria-hidden', 'true');
  iconWrap.appendChild(createWorkbenchIcon(document, definition.icon, { size: kind === 'command' ? 16 : 15 }));
  labelNode.textContent = label;
  const i18nKey = control.dataset.i18n;
  if(i18nKey) {
    delete control.dataset.i18n;
    labelNode.dataset.i18n = i18nKey;
  }
  control.dataset.workbenchLabel = label;
  control.setAttribute('aria-label', label);
  control.classList.add(kind === 'command' ? 'studio-command' : 'studio-icon-control');
  if(kind === 'command') control.removeAttribute('style');
  control.replaceChildren(iconWrap, labelNode);
}

function decorateHeading(
  document: Document,
  heading: HTMLElement | null,
  icon: WorkbenchIconName,
  fallback: string,
  fallbackZh: string,
  language: WorkbenchLanguage,
): void {
  if(!heading) return;
  const label = language === 'zh' ? fallbackZh : fallback;
  const text = createElement(document, 'span', 'studio-panel-title-text');
  text.textContent = label;
  heading.classList.add('studio-panel-title');
  heading.replaceChildren(createWorkbenchIcon(document, icon, { size: 16 }), text);
}

function buildAnalysisDock(document: Document, language: WorkbenchLanguage): HTMLElement {
  const root = createElement(document, 'section', 'studio-bottom-dock');
  const content = createElement(document, 'div', 'studio-bottom-content');
  const pane = createElement(document, 'div', 'studio-bottom-pane');

  root.classList.add('studio-bottom-dock--fixed');
  root.setAttribute('aria-label', language === 'zh' ? '海拔分析' : 'Elevation analysis');
  pane.id = 'workbench-elevation-analysis';
  pane.dataset.analysisPanel = 'elevation';
  pane.setAttribute('role', 'region');
  pane.setAttribute('aria-label', language === 'zh' ? '海拔剖面' : 'Elevation profile');

  const elevationPanel = document.getElementById('elev-bar');
  if(elevationPanel) {
    elevationPanel.classList.add('studio-docked-panel');
    pane.appendChild(elevationPanel);
  }
  const measurePanel = document.getElementById('measure-panel');
  if(measurePanel) {
    measurePanel.classList.add('studio-elevation-measure-actions');
    pane.appendChild(measurePanel);
  }

  content.appendChild(pane);
  root.append(content);
  return root;
}

function buildActivityRail(document: Document, language: WorkbenchLanguage): {
  buttons: Map<WorkbenchActivityKey, HTMLButtonElement>;
  modeButtons: Map<(typeof MAP_MODE_DEFINITIONS)[number]['mode'], HTMLButtonElement>;
  root: HTMLElement;
} {
  const root = createElement(document, 'nav', 'studio-activity-rail');
  const buttons = new Map<WorkbenchActivityKey, HTMLButtonElement>();
  const modeButtons = new Map<(typeof MAP_MODE_DEFINITIONS)[number]['mode'], HTMLButtonElement>();
  root.setAttribute('aria-label', 'Workbench activity');

  const modeSwitcher = document.getElementById('map-mode-controls');
  if(modeSwitcher) {
    modeSwitcher.className = 'studio-mode-switcher';
    modeSwitcher.setAttribute('role', 'group');
    modeSwitcher.setAttribute('aria-label', language === 'zh' ? '地图显示模式' : 'Map display mode');
    for(const definition of MAP_MODE_DEFINITIONS) {
      const button = modeSwitcher.querySelector<HTMLButtonElement>(`[data-mode="${definition.mode}"]`);
      if(!button) continue;
      const active = button.classList.contains('on');
      const label = localizedLabel(definition, language);
      const labelNode = createElement(document, 'span', 'studio-mode-label');
      const i18nKey = button.dataset.i18n;
      button.className = 'studio-mode-button';
      button.classList.toggle('on', active);
      button.type = 'button';
      button.title = label;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(active));
      labelNode.textContent = label;
      if(i18nKey) {
        delete button.dataset.i18n;
        labelNode.dataset.i18n = i18nKey;
      }
      button.replaceChildren(createWorkbenchIcon(document, definition.icon, { size: 17 }), labelNode);
      modeButtons.set(definition.mode, button);
    }
    root.appendChild(modeSwitcher);
  }

  for(const definition of ACTIVITY_DEFINITIONS) {
    const button = createElement(document, 'button', 'studio-activity-button');
    const label = createElement(document, 'span', 'studio-activity-label');
    button.type = 'button';
    button.id = `workbench-activity-${definition.key}`;
    button.dataset.activity = definition.key;
    button.dataset.commandId = definition.commandId;
    const localized = localizedLabel(definition, language);
    button.title = localized;
    button.setAttribute('aria-controls', 'sidebar');
    button.setAttribute('aria-pressed', 'false');
    button.tabIndex = -1;
    label.textContent = localized;
    button.append(createWorkbenchIcon(document, definition.icon, { size: 19 }), label);
    root.appendChild(button);
    buttons.set(definition.key, button);
  }

  return { buttons, modeButtons, root };
}

function prepareSidebarHeading(
  document: Document,
  sidebar: HTMLElement,
  primaryCard: HTMLElement | null,
): HTMLElement | null {
  const existing = sidebar.querySelector<HTMLElement>('.sidebar-heading');
  if(existing) return existing.querySelector<HTMLElement>('strong');
  if(!primaryCard) return null;
  const heading = createElement(document, 'div', 'sidebar-heading');
  const copy = createElement(document, 'span', 'sidebar-heading-copy');
  const eyebrow = createElement(document, 'small', 'sidebar-heading-eyebrow');
  const title = createElement(document, 'strong', 'sidebar-heading-title');
  const status = createElement(document, 'span', 'sidebar-status');
  eyebrow.textContent = 'ROUTE LIBRARY';
  title.textContent = '路线与行程';
  status.setAttribute('aria-hidden', 'true');
  copy.append(eyebrow, title);
  heading.append(copy, status);
  sidebar.insertBefore(heading, primaryCard);
  return title;
}

function prepareElevationToggle(
  document: Document,
  panel: HTMLElement,
  storage: WorkbenchStorage | null | undefined,
): { render: (language: WorkbenchLanguage) => void; destroy: () => void } {
  const button = document.getElementById('elev-toggle') as HTMLButtonElement | null
    ?? createElement(document, 'button', 'elev-toggle');
  button.id = 'elev-toggle';
  button.type = 'button';
  if(!button.isConnected) panel.appendChild(button);
  panel.classList.toggle(
    'collapsed',
    readStorage(storage, WORKBENCH_STORAGE_KEYS.elevationCollapsed) === '1',
  );

  let language: WorkbenchLanguage = 'zh';
  const render = (nextLanguage: WorkbenchLanguage): void => {
    language = nextLanguage;
    const collapsed = panel.classList.contains('collapsed');
    const label = language === 'zh'
      ? (collapsed ? '展开海拔分析' : '收起海拔分析')
      : (collapsed ? 'Expand elevation analysis' : 'Collapse elevation analysis');
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-expanded', String(!collapsed));
    button.classList.toggle('is-collapsed', collapsed);
    button.replaceChildren(createWorkbenchIcon(document, 'chevron-down', { size: 16 }));
  };
  const onClick = (event: MouseEvent): void => {
    event.stopPropagation();
    const collapsed = panel.classList.toggle('collapsed');
    writeStorage(storage, WORKBENCH_STORAGE_KEYS.elevationCollapsed, collapsed ? '1' : '0');
    render(language);
    scheduleDocumentResize(document);
  };
  button.addEventListener('click', onClick);
  return {render, destroy:() => button.removeEventListener('click', onClick)};
}

function prepareBrand(
  document: Document,
  header: HTMLElement,
  toolbar: HTMLElement,
): { brand: HTMLElement; utilities: HTMLElement[] } | null {
  const brand = header.querySelector<HTMLElement>('.brand');
  const title = document.getElementById('app-title');
  if(!brand || !title) return null;

  const existingToolbarBrand = toolbar.querySelector<HTMLElement>('.toolbar-brand');
  let context = document.getElementById('toolbar-context');
  if(!context) {
    context = createElement(document, 'small', 'studio-brand-context');
    context.id = 'toolbar-context';
    context.textContent = 'TRAIL WORKSPACE';
  }

  if(existingToolbarBrand && existingToolbarBrand !== brand) existingToolbarBrand.remove();

  const mark = createElement(document, 'span', 'brand-icon studio-brand-mark');
  const copy = createElement(document, 'span', 'studio-brand-copy');
  mark.appendChild(createWorkbenchIcon(document, 'mountain', { size: 19 }));
  copy.append(title, context);
  brand.classList.add('toolbar-brand', 'studio-brand');
  brand.replaceChildren(mark, copy);

  const utilities = Array.from(header.children)
    .filter(child => child !== brand && child !== toolbar) as HTMLElement[];
  for(const utility of utilities) {
    utility.classList.add('studio-legacy-utility');
    utility.hidden = true;
  }
  return { brand, utilities };
}

function scheduleDocumentResize(document: Document): void {
  const view = document.defaultView;
  if(!view) return;
  const dispatch = () => view.dispatchEvent(new view.Event('resize'));
  if(typeof view.requestAnimationFrame === 'function') view.requestAnimationFrame(dispatch);
  else view.setTimeout(dispatch, 0);
}

export function upgradeWorkbenchLayout(
  document: Document,
  storage: WorkbenchStorage | null | undefined,
  commandRegistry: CommandRegistry<void>,
): WorkbenchLayoutController | null {
  const registered = controllers.get(document);
  const main = document.getElementById('main');
  if(registered && main?.dataset.workbenchLayout === '2') return registered;

  const header = document.getElementById('header');
  const map = document.getElementById('map');
  const toolbar = document.getElementById('map-toolbar');
  const sidebar = document.getElementById('sidebar');
  const elevationPanel = document.getElementById('elev-bar');
  if(!main || !header || !map || !toolbar || !sidebar || !elevationPanel) return null;
  const sidebarElement = sidebar;

  let language: WorkbenchLanguage = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'zh';
  const cleanups: Array<() => void> = [];
  const sidebarTitle = prepareSidebarHeading(document, sidebar, document.getElementById('primary-card'));
  const elevationToggle = prepareElevationToggle(document, elevationPanel, storage);
  cleanups.push(elevationToggle.destroy);
  const analysisDock = buildAnalysisDock(document, language);
  const activityRail = buildActivityRail(document, language);
  const menuList = createElement(document, 'div', 'studio-menu-list');
  const menuGroups = new Map<WorkbenchMenuKey, HTMLElement>();
  const directButtons = new Map<(typeof DIRECT_COMMAND_IDS)[number], HTMLButtonElement>();
  const menuViews = new Map<WorkbenchMenuKey, MenuView>();
  const commandButtons = new Map<keyof typeof COMMAND_DEFINITIONS, HTMLButtonElement>();
  let activeMenu: WorkbenchMenuKey | null = null;

  const brandView = prepareBrand(document, header, toolbar);
  if(!brandView) return null;

  menuList.setAttribute('role', 'toolbar');
  menuList.setAttribute('aria-label', language === 'zh' ? '工作台操作' : 'Workbench actions');

  const dispatchCommand = (commandId: StudioCommandId): void => {
    try {
      const result = commandRegistry.dispatch(commandId);
      void Promise.resolve(result).catch(error => {
        console.error(`Command failed: ${commandId}`, error);
      });
    } catch(error) {
      console.error(`Command failed: ${commandId}`, error);
    }
  };

  for(const definition of MENU_DEFINITIONS) {
    const group = createElement(document, 'div', 'studio-menu-group');
    const trigger = createElement(document, 'button', 'studio-menu-trigger');
    const panel = createElement(document, 'div', 'studio-menu-popup');
    const label = createElement(document, 'span', 'studio-menu-label');
    const menuId = `workbench-menu-${definition.key}`;

    trigger.type = 'button';
    trigger.dataset.menu = definition.key;
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', menuId);
    const localized = localizedLabel(definition, language);
    trigger.title = localized;
    label.textContent = localized;
    trigger.append(createWorkbenchIcon(document, definition.icon, { size: 14 }), label,
      createWorkbenchIcon(document, 'chevron-down', { className: 'studio-menu-caret', size: 12 }));

    panel.id = menuId;
    panel.dataset.menuPanel = definition.key;
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-label', localized);
    panel.hidden = true;

    for(const commandId of definition.commandIds) {
      const command = document.getElementById(commandId) as HTMLButtonElement | null;
      if(!command) continue;
      const commandDefinition = COMMAND_DEFINITIONS[commandId];
      command.type = 'button';
      command.dataset.commandId = commandDefinition.commandId;
      command.setAttribute('role', 'menuitem');
      command.tabIndex = -1;
      decorateControl(document, command, commandDefinition, 'command', language);
      const onCommandClick = (event: MouseEvent): void => {
        event.preventDefault();
        closeMenus(false);
        dispatchCommand(commandDefinition.commandId);
      };
      command.addEventListener('click', onCommandClick);
      cleanups.push(() => command.removeEventListener('click', onCommandClick));
      panel.appendChild(command);
      commandButtons.set(commandId, command);
    }

    if(!panel.children.length) trigger.disabled = true;
    group.append(trigger, panel);
    menuGroups.set(definition.key, group);
    menuViews.set(definition.key, { panel, trigger });
  }

  for(const id of DIRECT_COMMAND_IDS) {
    const command = document.getElementById(id) as HTMLButtonElement | null;
    if(!command) continue;
    const definition = COMMAND_DEFINITIONS[id];
    command.type = 'button';
    command.dataset.commandId = definition.commandId;
    decorateControl(document, command, definition, 'command', language);
    command.classList.add('studio-toolbar-command');
    const onCommandClick = (event: MouseEvent): void => {
      event.preventDefault();
      closeMenus(false);
      dispatchCommand(definition.commandId);
    };
    command.addEventListener('click', onCommandClick);
    cleanups.push(() => command.removeEventListener('click', onCommandClick));
    directButtons.set(id, command);
    commandButtons.set(id, command);
  }

  for(const item of TOOLBAR_LAYOUT) {
    if(item.kind === 'menu') {
      const group = menuGroups.get(item.key);
      if(group) menuList.appendChild(group);
    } else {
      const command = directButtons.get(item.id);
      if(command) menuList.appendChild(command);
    }
  }

  const retainedToolbarNodes = Array.from(toolbar.querySelectorAll<HTMLElement>('[id]'))
    .filter(node => node.id !== 'toolbar-context');
  retainedToolbarNodes
    .filter(node => !commandButtons.has(node.id as keyof typeof COMMAND_DEFINITIONS))
    .forEach(node => node.remove());

  toolbar.classList.add('studio-menubar');
  toolbar.setAttribute('aria-label', 'Trail workspace');
  toolbar.replaceChildren(brandView.brand, menuList);
  header.classList.add('studio-topbar');
  header.style.removeProperty('display');
  header.removeAttribute('aria-hidden');
  header.replaceChildren(toolbar, ...brandView.utilities);

  for(const [id, definition] of Object.entries(AUXILIARY_CONTROLS)) {
    const control = document.getElementById(id);
    if(control) decorateControl(document, control, definition, 'control', language);
  }
  decorateHeading(
    document,
    document.querySelector<HTMLElement>('#segment-panel .tool-panel-title'),
    'calendar',
    'Itinerary segments',
    '行程分段',
    language,
  );
  decorateHeading(
    document,
    document.querySelector<HTMLElement>('#addescape-panel .tool-panel-title'),
    'shield',
    'Escape route',
    '下撤路线',
    language,
  );

  function setLanguage(nextLanguage: WorkbenchLanguage): void {
    language = nextLanguage;
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    for(const definition of MENU_DEFINITIONS) {
      const view = menuViews.get(definition.key);
      const label = localizedLabel(definition, language);
      if(!view) continue;
      const labelNode = view.trigger.querySelector<HTMLElement>('.studio-menu-label');
      if(labelNode) labelNode.textContent = label;
      view.trigger.title = label;
      view.panel.setAttribute('aria-label', label);
    }
    for(const [id, button] of commandButtons) {
      const label = localizedLabel(COMMAND_DEFINITIONS[id], language);
      const labelNode = button.querySelector<HTMLElement>('.studio-command-label');
      if(labelNode) labelNode.textContent = label;
      button.dataset.workbenchLabel = label;
      button.setAttribute('aria-label', label);
    }
    menuList.setAttribute('aria-label', language === 'zh' ? '工作台操作' : 'Workbench actions');
    for(const definition of ACTIVITY_DEFINITIONS) {
      const button = activityRail.buttons.get(definition.key);
      const label = localizedLabel(definition, language);
      if(!button) continue;
      const labelNode = button.querySelector<HTMLElement>('.studio-activity-label');
      if(labelNode) labelNode.textContent = label;
      button.title = label;
    }
    for(const definition of MAP_MODE_DEFINITIONS) {
      const button = activityRail.modeButtons.get(definition.mode);
      const label = localizedLabel(definition, language);
      if(!button) continue;
      const labelNode = button.querySelector<HTMLElement>('.studio-mode-label');
      if(labelNode) labelNode.textContent = label;
      button.title = label;
      button.setAttribute('aria-label', label);
    }
    const modeSwitcher = document.getElementById('map-mode-controls');
    modeSwitcher?.setAttribute('aria-label', language === 'zh' ? '地图显示模式' : 'Map display mode');
    analysisDock.setAttribute('aria-label', language === 'zh' ? '海拔分析' : 'Elevation analysis');
    analysisDock.querySelector<HTMLElement>('[data-analysis-panel="elevation"]')
      ?.setAttribute('aria-label', language === 'zh' ? '海拔剖面' : 'Elevation profile');
    if(sidebarTitle) {
      const activity = ACTIVITY_DEFINITIONS.find(item => item.key === sidebarElement.dataset.activity);
      sidebarTitle.textContent = activity?.key === 'groups'
        ? localizedLabel(activity, language)
        : (language === 'zh' ? '路线与行程' : 'Routes & Itinerary');
    }
    elevationToggle.render(language);
    for(const [id, definition] of Object.entries(AUXILIARY_CONTROLS)) {
      const control = document.getElementById(id);
      const label = localizedLabel(definition, language);
      const labelNode = control?.querySelector<HTMLElement>('.studio-control-label');
      if(labelNode) labelNode.textContent = label;
      control?.setAttribute('aria-label', label);
    }
    const segmentTitle = document.querySelector<HTMLElement>('#segment-panel .studio-panel-title-text');
    const escapeTitle = document.querySelector<HTMLElement>('#addescape-panel .studio-panel-title-text');
    if(segmentTitle) segmentTitle.textContent = language === 'zh' ? '行程分段' : 'Itinerary segments';
    if(escapeTitle) escapeTitle.textContent = language === 'zh' ? '下撤路线' : 'Escape route';
  }

  const onLanguageChanged = (event: Event): void => {
    const requested = (event as CustomEvent<{ language?: string }>).detail?.language;
    setLanguage(requested === 'en' ? 'en' : 'zh');
  };
  document.defaultView?.addEventListener('studio:language-changed', onLanguageChanged);
  cleanups.push(() => document.defaultView?.removeEventListener('studio:language-changed', onLanguageChanged));

  const workspace = createElement(document, 'div', 'studio-workspace');
  const mapStage = createElement(document, 'main', 'studio-map-stage');
  const addEscapePanel = document.getElementById('addescape-panel');
  const segmentPanel = document.getElementById('segment-panel');
  const stitchPanel = document.getElementById('stitch-panel');
  mapStage.setAttribute('aria-label', 'Trail map workspace');
  mapStage.append(map, analysisDock);
  if(segmentPanel) mapStage.appendChild(segmentPanel);
  if(addEscapePanel) mapStage.appendChild(addEscapePanel);
  if(stitchPanel) mapStage.appendChild(stitchPanel);
  workspace.append(activityRail.root, sidebarElement, mapStage);

  main.classList.add('studio-workbench');
  main.dataset.workbenchLayout = '2';
  main.replaceChildren(header, workspace);
  document.documentElement.dataset.workbench = '2';
  document.documentElement.dataset.ui = 'studio';

  const menuKeys = MENU_DEFINITIONS.map(definition => definition.key);
  const activityKeys = ACTIVITY_DEFINITIONS.map(definition => definition.key);

  function closeMenus(restoreFocus: boolean): void {
    const previous = activeMenu;
    activeMenu = null;
    for(const view of menuViews.values()) {
      view.panel.hidden = true;
      view.trigger.setAttribute('aria-expanded', 'false');
      view.trigger.parentElement?.classList.remove('is-open');
    }
    if(restoreFocus && previous) menuViews.get(previous)?.trigger.focus();
  }

  function openMenu(key: WorkbenchMenuKey, focusFirst: boolean): void {
    const view = menuViews.get(key);
    if(!view || view.trigger.disabled) return;
    for(const [candidateKey, candidate] of menuViews) {
      const open = candidateKey === key;
      candidate.panel.hidden = !open;
      candidate.trigger.setAttribute('aria-expanded', String(open));
      candidate.trigger.parentElement?.classList.toggle('is-open', open);
    }
    activeMenu = key;
    if(focusFirst) {
      queueMicrotask(() => {
        const first = view.panel.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])');
        first?.focus();
      });
    }
  }

  function adjacentMenu(key: WorkbenchMenuKey, offset: number): WorkbenchMenuKey {
    const index = menuKeys.indexOf(key);
    return menuKeys[(index + offset + menuKeys.length) % menuKeys.length];
  }

  function focusAdjacentTrigger(key: WorkbenchMenuKey, offset: number, keepOpen: boolean): void {
    const next = adjacentMenu(key, offset);
    if(keepOpen) openMenu(next, false);
    menuViews.get(next)?.trigger.focus();
  }

  for(const [key, view] of menuViews) {
    const onTriggerClick = (event: MouseEvent): void => {
      event.stopPropagation();
      if(activeMenu === key) closeMenus(false);
      else openMenu(key, false);
    };
    const onTriggerKeydown = (event: KeyboardEvent): void => {
      if(event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openMenu(key, true);
      } else if(event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        focusAdjacentTrigger(key, event.key === 'ArrowRight' ? 1 : -1, activeMenu !== null);
      } else if(event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const target = event.key === 'Home' ? menuKeys[0] : menuKeys[menuKeys.length - 1];
        menuViews.get(target)?.trigger.focus();
      } else if(event.key === 'Escape') {
        event.preventDefault();
        closeMenus(true);
      }
    };
    const onPanelKeydown = (event: KeyboardEvent): void => {
      const items = Array.from(view.panel.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])'));
      const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
      if(event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const offset = event.key === 'ArrowDown' ? 1 : -1;
        items[(currentIndex + offset + items.length) % items.length]?.focus();
      } else if(event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
      } else if(event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const next = adjacentMenu(key, event.key === 'ArrowRight' ? 1 : -1);
        openMenu(next, true);
      } else if(event.key === 'Escape') {
        event.preventDefault();
        closeMenus(true);
      } else if(event.key === 'Tab') {
        closeMenus(false);
      }
    };
    view.trigger.addEventListener('click', onTriggerClick);
    view.trigger.addEventListener('keydown', onTriggerKeydown);
    view.panel.addEventListener('keydown', onPanelKeydown);
    cleanups.push(() => {
      view.trigger.removeEventListener('click', onTriggerClick);
      view.trigger.removeEventListener('keydown', onTriggerKeydown);
      view.panel.removeEventListener('keydown', onPanelKeydown);
    });
  }

  const onDocumentClick = (event: MouseEvent): void => {
    if(event.target && !toolbar.contains(event.target as Node)) closeMenus(false);
  };
  const onDocumentKeydown = (event: KeyboardEvent): void => {
    if(event.key !== 'Escape' || event.defaultPrevented) return;
    if(activeMenu) {
      event.preventDefault();
      closeMenus(true);
      return;
    }
    if(document.querySelector('dialog[open]')) return;
    event.preventDefault();
    dispatchCommand(STUDIO_COMMANDS.INTERACTION_CANCEL);
  };
  document.addEventListener('click', onDocumentClick, true);
  document.addEventListener('keydown', onDocumentKeydown);
  cleanups.push(() => {
    document.removeEventListener('click', onDocumentClick, true);
    document.removeEventListener('keydown', onDocumentKeydown);
  });

  function syncActivitySelection(key: WorkbenchActivityKey, persist = true): void {
    sidebarElement.dataset.activity = key;
    for(const [candidateKey, button] of activityRail.buttons) {
      const active = candidateKey === key;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
      button.tabIndex = active ? 0 : -1;
      if(active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    if(persist) writeStorage(storage, WORKBENCH_STORAGE_KEYS.activity, key);
  }

  function setActivity(key: WorkbenchActivityKey): void {
    const definition = ACTIVITY_DEFINITIONS.find(activity => activity.key === key);
    if(!definition) return;
    syncActivitySelection(key);
    sidebarElement.classList.remove('collapsed');
    if(sidebarTitle) {
      sidebarTitle.textContent = key === 'groups'
        ? localizedLabel(definition, language)
        : (language === 'zh' ? '路线与行程' : 'Routes & Itinerary');
    }

  }

  function syncCommandButtons(commandId?: string): void {
    for(const [controlId, button] of commandButtons) {
      const definition = COMMAND_DEFINITIONS[controlId];
      if(commandId && definition.commandId !== commandId) continue;
      const commandState = commandRegistry.getState(definition.commandId);
      button.disabled = !commandState.enabled;
      button.setAttribute('aria-disabled', String(!commandState.enabled));
      button.setAttribute('aria-pressed', String(commandState.checked));
      button.classList.toggle('on', commandState.checked);
    }
  }

  const unsubscribeCommands = commandRegistry.subscribe(event => {
    syncCommandButtons(event.id);
    if(event.type !== 'dispatched' || !event.id) return;
    const activity = ACTIVITY_DEFINITIONS.find(definition => definition.commandId === event.id);
    if(activity) setActivity(activity.key);
  });
  cleanups.push(unsubscribeCommands);
  syncCommandButtons();

  for(const [key, button] of activityRail.buttons) {
    const definition = ACTIVITY_DEFINITIONS.find(item => item.key === key);
    const onClick = (): void => {
      if(definition) dispatchCommand(definition.commandId);
    };
    const onKeydown = (event: KeyboardEvent): void => {
      let nextIndex = activityKeys.indexOf(key);
      if(event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex += 1;
      else if(event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex -= 1;
      else if(event.key === 'Home') nextIndex = 0;
      else if(event.key === 'End') nextIndex = activityKeys.length - 1;
      else return;
      event.preventDefault();
      const next = activityKeys[(nextIndex + activityKeys.length) % activityKeys.length];
      activityRail.buttons.get(next)?.focus();
    };
    button.addEventListener('click', onClick);
    button.addEventListener('keydown', onKeydown);
    cleanups.push(() => {
      button.removeEventListener('click', onClick);
      button.removeEventListener('keydown', onKeydown);
    });
  }

  const MutationObserverConstructor = document.defaultView?.MutationObserver;
  let commandObserver: MutationObserver | null = null;
  if(MutationObserverConstructor) {
    commandObserver = new MutationObserverConstructor(() => {
      for(const [id, button] of commandButtons) {
        if(!button.querySelector('.studio-command-icon')) {
          decorateControl(document, button, COMMAND_DEFINITIONS[id], 'command', language);
        }
      }
    });
    commandObserver.observe(toolbar, { childList: true, characterData: true, subtree: true });

  }

  syncActivitySelection('trails', false);
  setLanguage(language);

  const controller: WorkbenchLayoutController = {
    activateActivity(activity): void {
      const definition = ACTIVITY_DEFINITIONS.find(item => item.key === activity);
      if(definition) dispatchCommand(definition.commandId);
    },
    closeMenus(): void {
      closeMenus(false);
    },
    setLanguage(nextLanguage): void {
      setLanguage(nextLanguage);
    },
    destroy(): void {
      commandObserver?.disconnect();
      cleanups.splice(0).forEach(cleanup => cleanup());
      controllers.delete(document);
    },
  };

  controllers.set(document, controller);
  scheduleDocumentResize(document);
  return controller;
}
