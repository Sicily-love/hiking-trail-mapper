import * as core from './core/index.ts';
import * as app from './app/index.ts';

declare global {
  interface Window {
    HikingTrailCore?: typeof core;
    HikingTrailApp?: typeof app;
  }
}

// Vite development entrypoint. Release builds embed both modules into the
// directly-openable root HTML through scripts/build/generate_release_html.mjs.
if(typeof window !== 'undefined') {
  window.HikingTrailCore = core;
  window.HikingTrailApp = app;
}
