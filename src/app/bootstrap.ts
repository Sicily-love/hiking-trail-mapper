import * as core from '../core/index.ts';
import * as app from './index.ts';
import { mountAppShell } from '../ui/layout/app-shell.ts';
import {
  upgradeWorkbenchLayout,
  type WorkbenchLayoutController,
  type WorkbenchStorage,
} from '../ui/layout/workbench.ts';
import leafletSource from '../vendor/leaflet.js?raw';
import decoratorSource from '../vendor/polyline-decorator.js?raw';
import fflateSource from '../vendor/fflate.js?raw';
import runtimeSource from './runtime.ts?raw';

declare global {
  interface Window {
    HikingTrailCore?: typeof core;
    HikingTrailApp?: typeof app;
    __HTM_BOOT_READY__?: Promise<{ restored: boolean; resetPerformed: boolean }>;
    __OUTDOOR_ROUTE_STUDIO__?: {
      version: 2;
      ready: Promise<{ restored: boolean; resetPerformed: boolean }>;
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
  executeClassicScript(document, runtimeSource, 'runtime.js');

  const workbench = upgradeWorkbenchLayout(document, resolveWorkbenchStorage(document));
  if(!workbench) throw new Error('Outdoor Route Studio could not mount the Workbench layout');

  const ready = window.__HTM_BOOT_READY__ || Promise.resolve({ restored: false, resetPerformed: false });
  window.__OUTDOOR_ROUTE_STUDIO__ = { version: 2, ready, workbench };
  return ready;
}
