import * as core from '../core/index.ts';
import * as app from './index.ts';
import { composeClassicRuntime } from './runtime/compose.ts';
import { mountAppShell } from '../ui/layout/app-shell.ts';
import {
  upgradeWorkbenchLayout,
  type WorkbenchLayoutController,
  type WorkbenchStorage,
} from '../ui/layout/workbench.ts';
import leafletSource from '../vendor/leaflet.js?raw';
import decoratorSource from '../vendor/polyline-decorator.js?raw';
import fflateSource from '../vendor/fflate.js?raw';
import runtimeTemplate from './runtime.ts?raw';
import appClassicRuntimeSource from './runtime/classic.ts?raw';
import fileRuntimeSource from '../features/files/runtime.ts?raw';
import storageRuntimeSource from '../features/storage/runtime.ts?raw';
import waypointRuntimeSource from '../features/waypoint/runtime.ts?raw';
import mapRuntimeSource from '../features/map/runtime.ts?raw';
import elevationRuntimeSource from '../features/elevation/runtime.ts?raw';
import localizationRuntimeSource from '../features/localization/runtime.ts?raw';
import escapeRuntimeSource from '../features/escape/runtime.ts?raw';
import itineraryRuntimeSource from '../features/itinerary/runtime.ts?raw';
import measureRuntimeSource from '../features/measure/runtime.ts?raw';
import segmentRuntimeSource from '../features/segment/runtime.ts?raw';
import trailRuntimeSource from '../features/trails/runtime.ts?raw';
import uiRuntimeSource from '../ui/orchestration/runtime.ts?raw';

const runtimeSource = composeClassicRuntime(runtimeTemplate, [
  { name: 'app/classic', source: appClassicRuntimeSource },
  { name: 'features/files', source: fileRuntimeSource },
  { name: 'features/storage', source: storageRuntimeSource },
  { name: 'features/waypoint', source: waypointRuntimeSource },
  { name: 'features/map', source: mapRuntimeSource },
  { name: 'features/elevation', source: elevationRuntimeSource },
  { name: 'features/localization', source: localizationRuntimeSource },
  { name: 'features/escape', source: escapeRuntimeSource },
  { name: 'features/itinerary', source: itineraryRuntimeSource },
  { name: 'features/measure', source: measureRuntimeSource },
  { name: 'features/segment', source: segmentRuntimeSource },
  { name: 'features/trails', source: trailRuntimeSource },
  { name: 'ui/orchestration', source: uiRuntimeSource },
]);

declare global {
  interface Window {
    HikingTrailCore?: typeof core;
    HikingTrailApp?: typeof app;
    __HTM_COMMAND_REGISTRY__?: app.CommandRegistry<void>;
    __HTM_DIALOG_CONTROLLER__?: app.DialogController;
    __HTM_BOOT_READY__?: Promise<{ restored: boolean; resetPerformed: boolean }>;
    __OUTDOOR_ROUTE_STUDIO__?: {
      version: 2;
      ready: Promise<{ restored: boolean; resetPerformed: boolean }>;
      commands: app.CommandRegistry<void>;
      dialogs: app.DialogController;
      workbench: WorkbenchLayoutController;
    };
  }
}

function executeClassicScript(document: Document, source: string, name: string): void {
  const script = document.createElement('script');
  script.dataset.studioRuntime = name;
  script.textContent = `${source}\n//# sourceURL=outdoor-route-studio/${name}`;
  document.head.appendChild(script);
}

function resolveWorkbenchStorage(document: Document): WorkbenchStorage | null {
  try {
    return document.defaultView?.localStorage ?? null;
  } catch {
    return null;
  }
}

export async function bootstrapOutdoorRouteStudio(document: Document = window.document) {
  const root = document.getElementById('app');
  if(!root) throw new Error('Outdoor Route Studio requires #app');

  mountAppShell(root);
  executeClassicScript(document, leafletSource, 'leaflet.js');
  executeClassicScript(document, decoratorSource, 'polyline-decorator.js');
  executeClassicScript(document, fflateSource, 'fflate.js');

  window.HikingTrailCore = core;
  window.HikingTrailApp = app;
  const commands = new app.CommandRegistry<void>();
  const dialogs = app.createDialogController(document);
  window.__HTM_COMMAND_REGISTRY__ = commands;
  window.__HTM_DIALOG_CONTROLLER__ = dialogs;
  executeClassicScript(document, runtimeSource, 'runtime.js');

  const workbench = upgradeWorkbenchLayout(
    document,
    resolveWorkbenchStorage(document),
    commands,
  );
  if(!workbench) throw new Error('Outdoor Route Studio could not mount the Workbench layout');

  const ready = window.__HTM_BOOT_READY__ || Promise.resolve({ restored: false, resetPerformed: false });
  window.__OUTDOOR_ROUTE_STUDIO__ = { version: 2, ready, commands, dialogs, workbench };
  return ready;
}
