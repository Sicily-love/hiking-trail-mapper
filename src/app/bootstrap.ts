import '../vendor/leaflet.js';
import '../vendor/polyline-decorator.js';
import '../vendor/fflate.js';
import * as app from './index.ts';
import { startStudioRuntime, type StudioBootResult } from './runtime/studio.ts';
import { STUDIO_VERSION } from './version.ts';
import { mountAppShell } from '../ui/layout/app-shell.ts';
import {
  upgradeWorkbenchLayout,
  type WorkbenchLayoutController,
  type WorkbenchStorage,
} from '../ui/layout/workbench.ts';

declare global {
  interface Window {
    __HTM_APP_VERSION__?: string;
    __HTM_BOOT_READY__?: Promise<StudioBootResult>;
    __OUTDOOR_ROUTE_STUDIO__?: {
      version: string;
      architecture: 2;
      ready: Promise<StudioBootResult>;
      commands: app.CommandRegistry<void>;
      dialogs: app.DialogController;
      workbench: WorkbenchLayoutController;
    };
  }
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
  const commands = new app.CommandRegistry<void>();
  const dialogs = app.createDialogController(document);
  const ready = startStudioRuntime({ document, commands, dialogs });

  const workbench = upgradeWorkbenchLayout(
    document,
    resolveWorkbenchStorage(document),
    commands,
  );
  if(!workbench) throw new Error('Outdoor Route Studio could not mount the Workbench layout');

  window.__OUTDOOR_ROUTE_STUDIO__ = {
    version: STUDIO_VERSION,
    architecture: 2,
    ready,
    commands,
    dialogs,
    workbench,
  };
  return ready;
}
