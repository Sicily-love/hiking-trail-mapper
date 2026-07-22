# Outdoor Route Studio Architecture

**[中文](ARCHITECTURE.md) · [English](ARCHITECTURE.en.md)**

## Current Baseline

`v2.0.0` has one application source: `src/`. Root `index.html` is the small Vite shell; `hiking-trail-mapper.html` and `dist/` are generated. Production startup no longer uses raw imports, `executeClassicScript()`, a runtime composer, or classic globals.

```text
index.html
  -> src/main.ts
  -> bootstrapOutdoorRouteStudio()
  -> mountWorkbenchShell()
  -> startStudioRuntime({ document, commands, dialogs })
  -> upgradeWorkbenchLayout()
```

Leaflet, PolylineDecorator, and fflate load as side-effect imports in the Vite module graph. `src/app/runtime/studio.ts` is a normal TypeScript module, not a string template or a second implementation.

## Directory Ownership

```text
src/
├── app/
│   ├── bootstrap.ts              Startup and dependency assembly
│   ├── version.ts                Single version source
│   ├── state-store.ts            Application state write boundary
│   ├── command.ts                Unified commands
│   ├── interaction-manager.ts    Map interaction sessions
│   ├── render-scheduler.ts       Frame batching and last-fit wins
│   ├── runtime-context.ts        Typed service context
│   └── runtime/studio.ts         DOM/Leaflet browser orchestration
├── core/                         DOM-free domain algorithms and render models
├── features/                     Vertical feature controllers and data
├── adapters/                     Leaflet, IndexedDB, file, and browser effects
├── ui/                           Workbench, dialogs, and UI components
├── styles/                       Layout, components, and theme
└── vendor/                       Browser dependencies in the Vite graph
```

## Boundary Rules

### Core

`core/` accepts plain data and returns deterministic results. Distance, elevation, KML, measurement, segmentation, statistics, pointer policy, reset-transition planning, downsampling, marker diffs, revisions, and versioned project archives do not depend on the DOM, Leaflet, or storage handles. `projectArchive.ts` owns the schema migration chain, input budgets, and validation.

### App

`AppStateStore` owns persistent application-state writes. Mutations use discriminated commands and emit revisioned events. `CommandRegistry` lets the top menu, desktop rail, mobile bar, and keyboard shortcuts dispatch the same semantic commands. `ProjectHistoryController` stores compact versioned snapshots, bounds both entry count and retained bytes, and rolls back failed edits.

`InteractionManager` unifies the `select -> preview -> dragging -> commit` lifecycle for measure, segment, waypoint, escape, and Day preview. It cancels stale sessions, timers, RAF callbacks, and asynchronous work.

`RenderScheduler` coalesces map, track, marker, elevation, sidebar, analysis-panel, and fit requests. Only the newest epoch may commit after consecutive resets.

### Features and Adapters

Trail, storage, file import/export, project archive/history runtime, waypoint, measure, segment, itinerary, escape, and localization each own typed controllers or data modules. `features/project/runtime.ts` orchestrates restore UI, schema migration notices, restore rollback, and history feedback, leaving only browser effects in the direct runtime. Adapters isolate browser capabilities:

- Leaflet adapters consume track/marker render models and update layers by diff;
- the elevation renderer consumes a Canvas context, dimensions, and a downsampled model;
- the IndexedDB adapter owns transactions and snapshots;
- file/browser adapters own ZIP, Blob, ObjectURL, save-picker, and export-Canvas effects.

`ui/` controllers own the Lightbox zoom/drag/touch lifecycle and the collapsed-sidebar primary card. `features/map/inspection-controller.ts` produces transient track-point inspection models, while the Leaflet adapter creates and removes their markers. `studio.ts` no longer retains these listeners, timers, or position state.

### Direct Runtime

`src/app/runtime/studio.ts` centralizes mature orchestration that still shares DOM and Leaflet instances. It currently uses `@ts-nocheck`, but starts directly through explicit parameters and calls typed core, controller, adapter, and UI APIs. New domain logic must not enter this boundary, and deleted feature runtime owners must not return.

Real-browser tests receive a frozen, read-only inspector only when the URL includes `?studio-test=1`. Normal releases do not create it and do not expose `HikingTrailCore`, `HikingTrailApp`, command, or dialog classic globals.

## UI Architecture

The Workbench consists of the top menu, left activity rail, map workspace, responsive sidebar, and bottom analysis dock. Desktop and mobile entries share command IDs. Floating panels and dialogs share components, theme, focus, and Escape behavior. Lucide icons, the Forest Green / Stone / White / Orange palette, and responsive geometry live under `src/styles/`.

## Release Chain

```text
src + index.html
  -> Vite build
  -> inline JavaScript/CSS
  -> dist/index.html
  -> dist/hiking-trail-mapper.html
  -> root offline HTML + release.json
```

The version script synchronizes `src/app/version.ts`, localization changelog, package/lock data, READMEs, and generated artifacts. Final HTML has no external JavaScript/CSS dependencies and works from a static server, GitHub Pages, and `file://`.

## Further Evolution

Architecture 2.0 removed the dual path and classic bridge. Future work should shrink the browser-orchestration area of `studio.ts` incrementally: define a typed render model or controller API, migrate callers, and delete the old implementation in the same change. Do not reintroduce a composer, string execution, or mirrored state.
