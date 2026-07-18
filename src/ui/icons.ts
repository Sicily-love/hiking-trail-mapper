import {
  Activity,
  ArrowLeftRight,
  CalendarDays,
  ChartColumn,
  Combine,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleQuestionMark,
  Crosshair,
  Download,
  Eye,
  File,
  FolderOpen,
  FolderTree,
  GitFork,
  Languages,
  Logs,
  MapPin,
  Mountain,
  PanelBottom,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RotateCcw,
  Route,
  Ruler,
  Save,
  ShieldAlert,
  Trash2,
  TriangleAlert,
  Undo2,
  Waypoints,
  X,
} from 'lucide';
import type { IconNode } from 'lucide';

export const WORKBENCH_ICONS = {
  activity: Activity,
  'arrow-left-right': ArrowLeftRight,
  calendar: CalendarDays,
  chart: ChartColumn,
  check: Check,
  combine: Combine,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  crosshair: Crosshair,
  download: Download,
  eye: Eye,
  file: File,
  folder: FolderOpen,
  'folder-tree': FolderTree,
  'git-fork': GitFork,
  help: CircleQuestionMark,
  language: Languages,
  logs: Logs,
  'map-pin': MapPin,
  mountain: Mountain,
  'panel-bottom': PanelBottom,
  'panel-left-close': PanelLeftClose,
  'panel-left-open': PanelLeftOpen,
  pencil: Pencil,
  plus: Plus,
  rotate: RotateCcw,
  route: Route,
  ruler: Ruler,
  save: Save,
  shield: ShieldAlert,
  trash: Trash2,
  'triangle-alert': TriangleAlert,
  undo: Undo2,
  waypoints: Waypoints,
  x: X,
} as const satisfies Record<string, IconNode>;

export type WorkbenchIconName = keyof typeof WORKBENCH_ICONS;

export interface WorkbenchIconOptions {
  className?: string;
  label?: string;
  size?: number;
  strokeWidth?: number;
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export function createWorkbenchIcon(
  document: Document,
  name: WorkbenchIconName,
  options: WorkbenchIconOptions = {},
): SVGElement {
  const size = options.size ?? 18;
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  const classes = ['lucide', 'studio-icon', `studio-icon--${name}`, options.className]
    .filter(Boolean)
    .join(' ');

  svg.setAttribute('class', classes);
  svg.setAttribute('data-lucide', name);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(options.strokeWidth ?? 2));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('focusable', 'false');

  if(options.label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', options.label);
    const title = document.createElementNS(SVG_NAMESPACE, 'title');
    title.textContent = options.label;
    svg.appendChild(title);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }

  for(const [tag, attributes] of WORKBENCH_ICONS[name]) {
    const child = document.createElementNS(SVG_NAMESPACE, tag);
    for(const [attribute, value] of Object.entries(attributes)) {
      if(value !== undefined) child.setAttribute(attribute, String(value));
    }
    svg.appendChild(child);
  }

  return svg;
}
