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
}

interface CommandDefinition extends ControlDefinition {
  commandId: StudioCommandId;
}

export const COMMAND_DEFINITIONS = {
  'add-trail-btn': { icon: 'plus', label: 'Add trail', commandId: STUDIO_COMMANDS.FILE_IMPORT },
  'reverse-btn': { icon: 'rotate', label: 'Reverse trail', commandId: STUDIO_COMMANDS.TRAIL_REVERSE },
  'clear-btn': { icon: 'trash', label: 'Clear all', commandId: STUDIO_COMMANDS.PROJECT_CLEAR },
  'measure-btn': { icon: 'ruler', label: 'Measure distance', commandId: STUDIO_COMMANDS.MEASURE_TOGGLE },
  'segment-btn': { icon: 'calendar', label: 'Plan segments', commandId: STUDIO_COMMANDS.SEGMENT_TOGGLE },
  'add-escape-btn': { icon: 'shield', label: 'Add escape route', commandId: STUDIO_COMMANDS.ESCAPE_TOGGLE },
  'add-waypoint-btn': { icon: 'map-pin', label: 'Add waypoint', commandId: STUDIO_COMMANDS.WAYPOINT_TOGGLE },
  'reset-btn': { icon: 'crosshair', label: 'Reset view', commandId: STUDIO_COMMANDS.MAP_RESET },
  'help-btn': { icon: 'help', label: 'Help', commandId: STUDIO_COMMANDS.HELP_OPEN },
  'lang-btn': { icon: 'language', label: 'Language', commandId: STUDIO_COMMANDS.LANGUAGE_TOGGLE },
  'export-btn': { icon: 'download', label: 'Export', commandId: STUDIO_COMMANDS.FILE_EXPORT },
} as const satisfies Record<string, CommandDefinition>;

export const MENU_DEFINITIONS = [
  { key: 'file', label: 'File', icon: 'file', commandIds: ['add-trail-btn'] },
  { key: 'edit', label: 'Edit', icon: 'pencil', commandIds: ['reverse-btn', 'clear-btn'] },
  { key: 'measure', label: 'Measure', icon: 'ruler', commandIds: ['measure-btn'] },
  { key: 'plan', label: 'Plan', icon: 'calendar', commandIds: ['segment-btn', 'add-escape-btn'] },
  { key: 'waypoint', label: 'Waypoint', icon: 'map-pin', commandIds: ['add-waypoint-btn'] },
  { key: 'view', label: 'View', icon: 'eye', commandIds: ['reset-btn', 'help-btn', 'lang-btn'] },
  { key: 'export', label: 'Export', icon: 'download', commandIds: ['export-btn'] },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  icon: WorkbenchIconName;
  commandIds: ReadonlyArray<keyof typeof COMMAND_DEFINITIONS>;
}>;

export const ACTIVITY_DEFINITIONS = [
  { key: 'project', label: 'Project', icon: 'folder', commandId: STUDIO_COMMANDS.WORKSPACE_PROJECT },
  { key: 'trails', label: 'Trails', icon: 'route', commandId: STUDIO_COMMANDS.WORKSPACE_TRAILS },
  { key: 'itinerary', label: 'Itinerary', icon: 'calendar', commandId: STUDIO_COMMANDS.WORKSPACE_ITINERARY },
  { key: 'waypoints', label: 'Waypoints', icon: 'waypoints', commandId: STUDIO_COMMANDS.WORKSPACE_WAYPOINTS },
  { key: 'escape', label: 'Escape', icon: 'shield', commandId: STUDIO_COMMANDS.WORKSPACE_ESCAPE },
  { key: 'statistics', label: 'Statistics', icon: 'chart', commandId: STUDIO_COMMANDS.WORKSPACE_STATISTICS, bottomTab: 'statistics' },
  { key: 'settings', label: 'Settings', icon: 'settings', commandId: STUDIO_COMMANDS.WORKSPACE_SETTINGS, menu: 'view' },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  icon: WorkbenchIconName;
  commandId: StudioCommandId;
  bottomTab?: string;
  menu?: string;
}>;

export const BOTTOM_TAB_DEFINITIONS = [
  { key: 'elevation', label: 'Elevation', icon: 'mountain', nodeId: 'elev-bar', commandId: STUDIO_COMMANDS.PANEL_ELEVATION },
  { key: 'statistics', label: 'Statistics', icon: 'chart', nodeId: 'header-stats', commandId: STUDIO_COMMANDS.PANEL_STATISTICS },
  { key: 'measure', label: 'Measure', icon: 'ruler', nodeId: 'measure-panel', commandId: STUDIO_COMMANDS.PANEL_MEASURE },
  { key: 'segment', label: 'Segment', icon: 'calendar', nodeId: 'segment-panel', commandId: STUDIO_COMMANDS.PANEL_SEGMENT },
  { key: 'log', label: 'Log', icon: 'logs', nodeId: null, commandId: STUDIO_COMMANDS.PANEL_LOG },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  icon: WorkbenchIconName;
  nodeId: string | null;
  commandId: StudioCommandId;
}>;

export const WORKBENCH_STORAGE_KEYS = {
  activity: 'hiking_workbench2_activity',
  bottomTab: 'hiking_workbench2_bottom_tab',
} as const;

const AUXILIARY_CONTROLS = {
  'measure-reset': { icon: 'rotate', label: 'Reset points' },
  'measure-reverse': { icon: 'arrow-left-right', label: 'Reverse points' },
  'measure-exit': { icon: 'x', label: 'Exit measure' },
  'segment-close': { icon: 'x', label: 'Close segment panel' },
  'segment-undo': { icon: 'undo', label: 'Undo segment' },
  'segment-clear': { icon: 'rotate', label: 'Clear segments' },
  'segment-apply': { icon: 'check', label: 'Apply segments' },
  'segment-exit': { icon: 'x', label: 'Exit segment mode' },
  'addescape-close': { icon: 'x', label: 'Close escape panel' },
  'addescape-commit': { icon: 'save', label: 'Save escape route' },
  'addescape-reset': { icon: 'rotate', label: 'Reset escape route' },
  'addescape-exit': { icon: 'x', label: 'Exit escape mode' },
  'sidebar-close': { icon: 'panel-left-close', label: 'Close sidebar' },
  'sidebar-toggle': { icon: 'panel-left-open', label: 'Open sidebar' },
} as const satisfies Record<string, ControlDefinition>;

export type WorkbenchMenuKey = (typeof MENU_DEFINITIONS)[number]['key'];
export type WorkbenchActivityKey = (typeof ACTIVITY_DEFINITIONS)[number]['key'];
export type WorkbenchBottomTabKey = (typeof BOTTOM_TAB_DEFINITIONS)[number]['key'];
export type WorkbenchStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface WorkbenchLayoutController {
  activateActivity(activity: WorkbenchActivityKey): void;
  activateBottomTab(tab: WorkbenchBottomTabKey): void;
  closeMenus(): void;
  destroy(): void;
}

interface MenuView {
  panel: HTMLElement;
  trigger: HTMLButtonElement;
}

interface BottomDockView {
  log: HTMLElement;
  panes: Map<WorkbenchBottomTabKey, HTMLElement>;
  root: HTMLElement;
  tabList: HTMLElement;
  tabs: Map<WorkbenchBottomTabKey, HTMLButtonElement>;
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

function normalizedControlLabel(control: HTMLElement, fallback: string): string {
  const labelNode = control.querySelector<HTMLElement>('.studio-command-label, .studio-control-label, .tb-label');
  const candidates = [
    labelNode?.textContent,
    control.textContent,
    control.getAttribute('aria-label'),
    control.dataset.workbenchLabel,
    fallback,
  ];
  for(const candidate of candidates) {
    const normalized = (candidate || '').trim().replace(/^[^\p{L}\p{N}]+/u, '').trim();
    if(normalized) return normalized;
  }
  return fallback;
}

function decorateControl(
  document: Document,
  control: HTMLElement,
  definition: ControlDefinition,
  kind: 'command' | 'control',
): void {
  const label = normalizedControlLabel(control, definition.label);
  const iconWrap = createElement(document, 'span', kind === 'command'
    ? 'tb-icon studio-command-icon'
    : 'studio-control-icon');
  const labelNode = createElement(document, 'span', kind === 'command'
    ? 'tb-label studio-command-label'
    : 'studio-control-label');
  iconWrap.setAttribute('aria-hidden', 'true');
  iconWrap.appendChild(createWorkbenchIcon(document, definition.icon, { size: kind === 'command' ? 16 : 15 }));
  labelNode.textContent = label;
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
): void {
  if(!heading) return;
  const label = normalizedControlLabel(heading, fallback);
  const text = createElement(document, 'span', 'studio-panel-title-text');
  text.textContent = label;
  heading.classList.add('studio-panel-title');
  heading.replaceChildren(createWorkbenchIcon(document, icon, { size: 16 }), text);
}

function isActivityKey(value: string | null): value is WorkbenchActivityKey {
  return ACTIVITY_DEFINITIONS.some(activity => activity.key === value);
}

function isBottomTabKey(value: string | null): value is WorkbenchBottomTabKey {
  return BOTTOM_TAB_DEFINITIONS.some(tab => tab.key === value);
}

function buildBottomDock(document: Document): BottomDockView {
  const root = createElement(document, 'section', 'studio-bottom-dock');
  const tabList = createElement(document, 'div', 'studio-bottom-tabs');
  const content = createElement(document, 'div', 'studio-bottom-content');
  const tabs = new Map<WorkbenchBottomTabKey, HTMLButtonElement>();
  const panes = new Map<WorkbenchBottomTabKey, HTMLElement>();
  const log = createElement(document, 'div', 'studio-log-stream');

  root.setAttribute('aria-label', 'Workbench panels');
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-label', 'Workbench panels');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  log.setAttribute('aria-relevant', 'additions text');

  for(const definition of BOTTOM_TAB_DEFINITIONS) {
    const tab = createElement(document, 'button', 'studio-bottom-tab');
    const pane = createElement(document, 'div', 'studio-bottom-pane');
    const label = createElement(document, 'span', 'studio-bottom-tab-label');
    const tabId = `workbench-bottom-tab-${definition.key}`;
    const paneId = `workbench-bottom-panel-${definition.key}`;

    tab.type = 'button';
    tab.id = tabId;
    tab.dataset.bottomTab = definition.key;
    tab.dataset.commandId = definition.commandId;
    tab.title = definition.label;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', paneId);
    tab.setAttribute('aria-selected', 'false');
    tab.tabIndex = -1;
    label.textContent = definition.label;
    tab.append(createWorkbenchIcon(document, definition.icon, { size: 15 }), label);

    pane.id = paneId;
    pane.dataset.bottomPanel = definition.key;
    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-labelledby', tabId);
    pane.tabIndex = -1;
    pane.hidden = true;

    if(definition.nodeId) {
      const existingPanel = document.getElementById(definition.nodeId);
      if(existingPanel) {
        existingPanel.classList.add('studio-docked-panel');
        pane.appendChild(existingPanel);
      }
    } else {
      pane.appendChild(log);
    }

    tabList.appendChild(tab);
    content.appendChild(pane);
    tabs.set(definition.key, tab);
    panes.set(definition.key, pane);
  }

  root.append(tabList, content);
  return { log, panes, root, tabList, tabs };
}

function buildActivityRail(document: Document): {
  buttons: Map<WorkbenchActivityKey, HTMLButtonElement>;
  root: HTMLElement;
} {
  const root = createElement(document, 'nav', 'studio-activity-rail');
  const buttons = new Map<WorkbenchActivityKey, HTMLButtonElement>();
  root.setAttribute('aria-label', 'Workbench activity');

  for(const definition of ACTIVITY_DEFINITIONS) {
    const button = createElement(document, 'button', 'studio-activity-button');
    const label = createElement(document, 'span', 'studio-activity-label');
    button.type = 'button';
    button.id = `workbench-activity-${definition.key}`;
    button.dataset.activity = definition.key;
    button.dataset.commandId = definition.commandId;
    button.title = definition.label;
    button.setAttribute('aria-controls', 'sidebar');
    button.setAttribute('aria-pressed', 'false');
    button.tabIndex = -1;
    label.textContent = definition.label;
    button.append(createWorkbenchIcon(document, definition.icon, { size: 19 }), label);
    if(definition.key === 'settings') button.classList.add('studio-activity-button--settings');
    root.appendChild(button);
    buttons.set(definition.key, button);
  }

  return { buttons, root };
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

  const dock = buildBottomDock(document);
  const activityRail = buildActivityRail(document);
  const menuList = createElement(document, 'div', 'studio-menu-list');
  const menuViews = new Map<WorkbenchMenuKey, MenuView>();
  const commandButtons = new Map<keyof typeof COMMAND_DEFINITIONS, HTMLButtonElement>();
  const cleanups: Array<() => void> = [];
  let activeMenu: WorkbenchMenuKey | null = null;
  let activeBottomTab: WorkbenchBottomTabKey = 'elevation';
  let activeActivity: WorkbenchActivityKey = 'project';

  const brandView = prepareBrand(document, header, toolbar);
  if(!brandView) return null;

  menuList.setAttribute('role', 'menubar');
  menuList.setAttribute('aria-label', 'Application menu');

  const writeLog = (message: string): void => {
    const entry = createElement(document, 'div', 'studio-log-entry');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    entry.textContent = `${time} ${message}`;
    dock.log.appendChild(entry);
    while(dock.log.childElementCount > 50) dock.log.firstElementChild?.remove();
  };

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
    trigger.setAttribute('role', 'menuitem');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', menuId);
    trigger.title = definition.label;
    label.textContent = definition.label;
    trigger.append(createWorkbenchIcon(document, definition.icon, { size: 14 }), label,
      createWorkbenchIcon(document, 'chevron-down', { className: 'studio-menu-caret', size: 12 }));

    panel.id = menuId;
    panel.dataset.menuPanel = definition.key;
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-label', definition.label);
    panel.hidden = true;

    for(const commandId of definition.commandIds) {
      const command = document.getElementById(commandId) as HTMLButtonElement | null;
      if(!command) continue;
      const commandDefinition = COMMAND_DEFINITIONS[commandId];
      command.type = 'button';
      command.dataset.commandId = commandDefinition.commandId;
      command.setAttribute('role', 'menuitem');
      command.tabIndex = -1;
      decorateControl(document, command, commandDefinition, 'command');
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
    menuList.appendChild(group);
    menuViews.set(definition.key, { panel, trigger });
  }

  const toolbarMore = document.getElementById('toolbar-more');
  const retainedToolbarNodes = Array.from(toolbar.querySelectorAll<HTMLElement>('[id]'))
    .filter(node => node !== toolbarMore && node.id !== 'toolbar-context');
  const legacyAnchors = createElement(document, 'div', 'studio-legacy-anchors');
  legacyAnchors.hidden = true;
  if(toolbarMore) {
    toolbarMore.hidden = true;
    legacyAnchors.appendChild(toolbarMore);
  }
  for(const node of retainedToolbarNodes) {
    if(!commandButtons.has(node.id as keyof typeof COMMAND_DEFINITIONS)) legacyAnchors.appendChild(node);
  }

  toolbar.classList.add('studio-menubar');
  toolbar.setAttribute('aria-label', 'Trail workspace');
  toolbar.replaceChildren(brandView.brand, menuList);
  if(legacyAnchors.children.length) toolbar.appendChild(legacyAnchors);
  header.classList.add('studio-topbar');
  header.style.removeProperty('display');
  header.removeAttribute('aria-hidden');
  header.replaceChildren(toolbar, ...brandView.utilities);

  for(const [id, definition] of Object.entries(AUXILIARY_CONTROLS)) {
    const control = document.getElementById(id);
    if(control) decorateControl(document, control, definition, 'control');
  }
  decorateHeading(
    document,
    document.querySelector<HTMLElement>('#segment-panel .tool-panel-title'),
    'calendar',
    'Itinerary segments',
  );
  decorateHeading(
    document,
    document.querySelector<HTMLElement>('#addescape-panel .tool-panel-title'),
    'shield',
    'Escape route',
  );

  const workspace = createElement(document, 'div', 'studio-workspace');
  const mapStage = createElement(document, 'main', 'studio-map-stage');
  const addEscapePanel = document.getElementById('addescape-panel');
  mapStage.setAttribute('aria-label', 'Trail map workspace');
  mapStage.append(map, dock.root);
  if(addEscapePanel) mapStage.appendChild(addEscapePanel);
  workspace.append(activityRail.root, sidebarElement, mapStage);

  main.classList.add('studio-workbench');
  main.dataset.workbenchLayout = '2';
  main.replaceChildren(header, workspace);
  document.documentElement.dataset.workbench = '2';
  document.documentElement.dataset.ui = 'studio';

  const menuKeys = MENU_DEFINITIONS.map(definition => definition.key);
  const bottomKeys = BOTTOM_TAB_DEFINITIONS.map(definition => definition.key);
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

  function setBottomTab(key: WorkbenchBottomTabKey, persist = true): void {
    activeBottomTab = key;
    for(const [candidateKey, tab] of dock.tabs) {
      const active = candidateKey === key;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.classList.toggle('is-active', active);
      const pane = dock.panes.get(candidateKey);
      if(pane) {
        pane.hidden = !active;
        pane.tabIndex = active ? 0 : -1;
      }
    }
    if(persist) writeStorage(storage, WORKBENCH_STORAGE_KEYS.bottomTab, key);
    scheduleDocumentResize(document);
  }

  for(const definition of BOTTOM_TAB_DEFINITIONS) {
    if(commandRegistry.has(definition.commandId)) continue;
    cleanups.push(commandRegistry.register({
      id: definition.commandId,
      checked: () => activeBottomTab === definition.key,
      execute: () => setBottomTab(definition.key),
    }));
  }

  for(const [key, tab] of dock.tabs) {
    const definition = BOTTOM_TAB_DEFINITIONS.find(item => item.key === key);
    const onClick = (): void => {
      if(definition) dispatchCommand(definition.commandId);
    };
    const onKeydown = (event: KeyboardEvent): void => {
      let nextIndex = bottomKeys.indexOf(key);
      if(event.key === 'ArrowRight') nextIndex += 1;
      else if(event.key === 'ArrowLeft') nextIndex -= 1;
      else if(event.key === 'Home') nextIndex = 0;
      else if(event.key === 'End') nextIndex = bottomKeys.length - 1;
      else return;
      event.preventDefault();
      const next = bottomKeys[(nextIndex + bottomKeys.length) % bottomKeys.length];
      const nextDefinition = BOTTOM_TAB_DEFINITIONS.find(item => item.key === next);
      if(nextDefinition) dispatchCommand(nextDefinition.commandId);
      dock.tabs.get(next)?.focus();
    };
    tab.addEventListener('click', onClick);
    tab.addEventListener('keydown', onKeydown);
    cleanups.push(() => {
      tab.removeEventListener('click', onClick);
      tab.removeEventListener('keydown', onKeydown);
    });
  }

  function syncActivitySelection(key: WorkbenchActivityKey, persist = true): void {
    activeActivity = key;
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
    document.getElementById('sidebar-toggle')?.classList.remove('show');

    if('bottomTab' in definition && isBottomTabKey(definition.bottomTab)) {
      setBottomTab(definition.bottomTab);
    }
    if('menu' in definition && definition.menu) {
      openMenu(definition.menu as WorkbenchMenuKey, true);
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

  function commandLabel(commandId: string): string | null {
    const command = Object.values(COMMAND_DEFINITIONS)
      .find(definition => definition.commandId === commandId);
    if(command) return command.label;
    const activity = ACTIVITY_DEFINITIONS.find(definition => definition.commandId === commandId);
    if(activity) return activity.label;
    const panel = BOTTOM_TAB_DEFINITIONS.find(definition => definition.commandId === commandId);
    return panel?.label ?? null;
  }

  const unsubscribeCommands = commandRegistry.subscribe(event => {
    syncCommandButtons(event.id);
    if(event.type !== 'dispatched' || !event.id) return;
    const activity = ACTIVITY_DEFINITIONS.find(definition => definition.commandId === event.id);
    if(activity) setActivity(activity.key);
    const label = commandLabel(event.id);
    if(label) writeLog(label);
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
  let panelObserver: MutationObserver | null = null;
  if(MutationObserverConstructor) {
    commandObserver = new MutationObserverConstructor(() => {
      for(const [id, button] of commandButtons) {
        if(!button.querySelector('.studio-command-icon')) {
          decorateControl(document, button, COMMAND_DEFINITIONS[id], 'command');
        }
      }
    });
    commandObserver.observe(toolbar, { childList: true, characterData: true, subtree: true });

    const observedPanels: Array<[HTMLElement, WorkbenchBottomTabKey]> = [];
    const measurePanel = document.getElementById('measure-panel');
    const segmentPanel = document.getElementById('segment-panel');
    if(measurePanel) observedPanels.push([measurePanel, 'measure']);
    if(segmentPanel) observedPanels.push([segmentPanel, 'segment']);
    panelObserver = new MutationObserverConstructor(records => {
      for(const record of records) {
        const panel = record.target as HTMLElement;
        const match = observedPanels.find(([candidate]) => candidate === panel);
        if(!match) continue;
        const display = panel.style.display;
        if(display && display !== 'none') setBottomTab(match[1]);
        else if(display === 'none' && activeBottomTab === match[1]) setBottomTab('elevation');
      }
    });
    for(const [panel] of observedPanels) panelObserver.observe(panel, { attributes: true, attributeFilter: ['style'] });
  }

  const initialBottom = readStorage(storage, WORKBENCH_STORAGE_KEYS.bottomTab);
  const visibleMeasure = document.getElementById('measure-panel')?.style.display;
  const visibleSegment = document.getElementById('segment-panel')?.style.display;
  if(visibleMeasure && visibleMeasure !== 'none') setBottomTab('measure', false);
  else if(visibleSegment && visibleSegment !== 'none') setBottomTab('segment', false);
  else setBottomTab(isBottomTabKey(initialBottom) ? initialBottom : 'elevation', false);

  const initialActivity = readStorage(storage, WORKBENCH_STORAGE_KEYS.activity);
  syncActivitySelection(isActivityKey(initialActivity) ? initialActivity : 'project', false);

  const controller: WorkbenchLayoutController = {
    activateActivity(activity): void {
      const definition = ACTIVITY_DEFINITIONS.find(item => item.key === activity);
      if(definition) dispatchCommand(definition.commandId);
    },
    activateBottomTab(tab): void {
      const definition = BOTTOM_TAB_DEFINITIONS.find(item => item.key === tab);
      if(definition) dispatchCommand(definition.commandId);
    },
    closeMenus(): void {
      closeMenus(false);
    },
    destroy(): void {
      commandObserver?.disconnect();
      panelObserver?.disconnect();
      cleanups.splice(0).forEach(cleanup => cleanup());
      controllers.delete(document);
    },
  };

  controllers.set(document, controller);
  scheduleDocumentResize(document);
  return controller;
}
