# Outdoor Route Studio Architecture

**[中文](ARCHITECTURE.md) · [English](ARCHITECTURE.en.md)**

This document describes source ownership, the boot chain, Workbench contracts, runtime managers, and single-file delivery after Milestone 6.

## Current State

Outdoor Route Studio uses modular TypeScript source with a self-contained single-HTML release:

- `src/` is the only source of truth for application implementation.
- Root `index.html` is a stable, minimal Vite entry shell containing only page metadata, `#app`, and `src/main.ts`.
- `src/app/bootstrap.ts` is the browser boot orchestrator.
- `src/app/runtime.ts` remains a transitional classic-runtime compatibility layer executed in order by bootstrap.
- Vite builds the module graph, then the release script inlines CSS and JavaScript into one file that works on GitHub Pages and over `file://`.

“`src` is the only source” does not mean every repository file lives under `src`. The entry shell, build configuration, and scripts are engineering metadata; business logic, DOM structure, styles, and runtime behavior must originate under `src/`.

## Source Ownership

```text
src/
├── main.ts                         Imports styles and invokes bootstrap
├── app/
│   ├── bootstrap.ts                Boot order and compatibility bridge
│   ├── state.ts                    Application state
│   ├── command.ts                  CommandRegistry
│   ├── interactions/               InteractionManager
│   ├── rendering/                  RenderScheduler
│   ├── runtime.ts                  Transitional classic runtime
│   └── index.ts                    Typed app public exports
├── core/                           DOM-free math, parsing, storage, and render models
│   └── performance/               Large-track segmentation, downsampling, diffs, and revisions
├── features/                       Measure, segment, Day, elevation, and other controllers
├── adapters/                       Leaflet and IndexedDB effect boundaries
├── ui/
│   ├── layout/app-shell.ts         Workbench DOM shell and mount function
│   ├── workbench.ts                Responsive Workbench chrome
│   ├── workbench.css               Workbench visuals and layout
│   └── dialog/                     DialogController
├── styles/                         Global/vendor style entries
└── vendor/                         Browser dependencies inlined by the build
```

Ownership rules:

| Change | Location |
|--------|----------|
| Distance, ascent, KML, itinerary, elevation layout | `src/core` |
| App state, commands, interaction sessions, render scheduling | `src/app` |
| Interaction state for one feature | `src/features` |
| Leaflet / IndexedDB calls | `src/adapters` |
| DOM shell, responsive layout, dialogs, CSS | `src/ui` / `src/styles` |
| Legacy browser orchestration migration | From `src/app/runtime.ts` into the owners above |

Do not fix behavior in `hiking-trail-mapper.html` or `dist/`; both are generated.

## Boot Chain

```text
index.html
  └── <script type="module" src="/src/main.ts">
        ├── styles/leaflet.css
        ├── ui/workbench.css
        └── bootstrapOutdoorRouteStudio(document)
              ├── mountAppShell(#app)
              ├── execute Leaflet / decorator / fflate vendors
              ├── expose HikingTrailCore and HikingTrailApp
              ├── execute the runtime.ts compatibility script
              └── expose __OUTDOOR_ROUTE_STUDIO__.ready
```

`bootstrap.ts` uses raw imports to hand vendors and `runtime.ts` to Vite, then executes compatibility code as a classic script. Typed modules and the Workbench DOM therefore exist before legacy code receives the global scope and execution order it expects.

This bridge is a migration mechanism, not a permanent module boundary. Typed code must not depend on accidental globals created by the script. When behavior moves out, give it explicit inputs, outputs, lifecycle, and tests.

## Workbench Contract

The Workbench is a map-first interface that changes placement, not command meaning, by viewport:

- Desktop: seven primary actions live in a side rail with scannable route context.
- Mobile: five primary actions live in a bottom bar; lower-frequency actions move into More or a bottom sheet.
- The sidebar contains the primary-trail summary, routes, itinerary, and escape views.
- The elevation analysis dock is independent from the route sidebar and remembers its collapsed state.
- Responsive layout changes command placement without duplicating command implementation or business state.

Seven-side/five-bottom is a layout contract, not two feature sets. Command IDs, enabled/checked state, and dispatch paths should be shared through `CommandRegistry`; visual tests cover desktop and mobile breakpoints.

## Four Managers

### InteractionManager

`src/app/interactions/` owns mutually exclusive interaction sessions. The current vocabulary is:

```text
idle | measure | segment | waypoint | escape | day-preview
```

Each active session carries a `sessionId`, phase, owner, and independent `AbortController`. Starting a session atomically cancels the previous one; an event can be consumed only once by the current kind/session/owner. Animation frames and delays created by a session are cleaned up on cancellation, replacement, or phase change so stale callbacks cannot mutate new state.

Measure, segment, waypoint, escape, and Day preview now all use this lifecycle. Map taps pass through one active-kind dispatcher, and measure/segment drags are Session events as well. Replacing, deleting, or revising a trail invalidates the old owner, while Escape cleans up the current mode through the same cancellation path.

### RenderScheduler

`src/app/rendering/` coalesces invalidations with a dirty mask. Its fixed flush order is:

```text
tracks -> markers -> sidebar -> days -> legend -> chart -> fit
```

Multiple invalidations schedule one animation frame. Dirty bits raised during a flush move to the next frame. `fit` uses an epoch and last-request-wins semantics so an older async viewport change cannot override a newer interaction.

The runtime now delegates tracks, markers, sidebar, days, legend, elevation chart, and viewport fitting to one scheduler. Elevation tracks are grouped into at most 40 color bands. The Canvas profile uses pixel-width min/max downsampling while hit testing and annotations retain the full track. Regular waypoint markers use stable keys for add/update/remove/keep diffs, preserving unchanged Leaflet marker instances. Reset requests are guarded by both fit and reset epochs, so only the final reset can commit the viewport.

### CommandRegistry

`src/app/command.ts` is the DOM-free command registration and dispatch layer. It provides:

- unique command IDs with explicit registration and disposal;
- dynamic `enabled` / `checked` state;
- synchronous and asynchronous dispatch;
- registered, changed, dispatched, and unregistered lifecycle notifications.

Bootstrap creates one registry. The top menu, desktop activity rail, responsive mobile activity bar, bottom analysis tabs, compatibility sidebar tabs, and Escape shortcut only dispatch stable semantic commands; they no longer proxy old buttons or clone business listeners. Runtime registers the handlers, while Workbench subscribes to dispatched/changed events to synchronize disabled and checked state, active destinations, and the operation log.

### DialogController

`src/ui/dialog/` centralizes `info`, `confirm`, `prompt`, and custom dialogs:

- native `<dialog>` and `showModal()`;
- user strings assigned through `textContent`, without HTML injection sinks;
- shared Escape, cancel, danger-state, and default-button behavior;
- focus restoration on close and pending-state cleanup on destroy.

All native runtime `alert`, `confirm`, and `prompt` calls now use this controller. Text entry, dangerous confirmations, and manual-waypoint commits are asynchronous dialogs. Help, changelog, storage information, and import panels remain transitional custom modals for later feature-level migration.

## Manager Adoption Status

The typed APIs and unit contracts for all four managers are in place. `InteractionManager` owns all five mutually exclusive map interactions, `RenderScheduler` owns all seven runtime render/fit phases, `CommandRegistry` owns all four Workbench entry surfaces, and `DialogController` owns every native browser dialog. The compatibility runtime remains, but the primary interaction, rendering, command, and native-dialog lifecycles are unified.

Each migration should:

1. Add a contract or regression test for the old behavior.
2. Move state and pure calculations into `src/core` / `src/features`.
3. Connect lifecycle, rendering, commands, or dialogs to the corresponding manager.
4. Remove the replaced code from `runtime.ts`.
5. Build the single file and run real-browser workflows.

## State and Data Flow

```text
File/user event
  -> CommandRegistry / InteractionManager
  -> state or feature controller
  -> core pure function / render model
  -> RenderScheduler.invalidate(mask)
  -> adapters + DOM/Canvas renderer
  -> IndexedDB when persistence is required
```

Primary state conventions:

- `activeTrails: Set<trailId>`: currently visible routes.
- `expandedTrails: Set<trailId>`: expanded route cards.
- `batchSelected: Set<trailId>`: batch selection.
- `activeGroup: string | null`: current group.
- `primaryByGroup: Record<group, trailId>`: one primary trail per group.
- `primaryTrailId`: derived getter/setter for the current group.
- `modeVisibleTags`: separate visible-waypoint sets per map mode.

`Set` values must become arrays before entering an IndexedDB snapshot and become Sets on restore. New state gets one owner instead of mirrored fields kept “in sync.”

The transitional runtime still exposes `applyChange()` as a compatibility entrypoint. New code should prefer precise dirty masks; as migration proceeds, `applyChange` should only adapt legacy callers and must not keep growing.

## Core Data Model

```typescript
type TrackTuple = [
  lat: number,
  lng: number,
  elev?: number,
  km?: number,
  ascent_m?: number,
  dayId?: number | null,
];

type EnrichedWaypoint = {
  lat: number;
  lng: number;
  name: string;
  tag?: string;
  gps_idx: number;
  label: string;
  elev: number;
};

type DayMeta = {
  d: number;
  km: number;
  asc: number;
  desc: number;
  max: number;
  min: number;
  camp: string;
  i_start: number;
  i_end: number;
};
```

`gps_idx` binds a waypoint, map location, and elevation position to one track index. `i_start` / `i_end` are stable ranges for Day and measurement rendering.

## Key Algorithm Boundaries

- **Accumulated ascent/descent**: smooth elevation first, then use a threshold accumulator so GPS noise is not counted as many tiny climbs.
- **Snap to track**: find and store the nearest track index as `gps_idx`; map and elevation positions derive from the same index.
- **Segment thinning**: measurement, segmentation, and Day preview use bounded Leaflet models from `src/core/render.ts`.
- **Elevation layout**: `src/core/elevationProfile.ts` computes coordinates, paths, label collision avoidance, drawing commands, and adaptive height; Canvas only consumes the model.
- **Storage restore**: `src/core/storage.ts` normalizes snapshots and migrates legacy `primaryTrailId` into `primaryByGroup`.

## Build and Release

```text
index.html + src module graph
  -> Vite
  -> dist/index.html + temporary assets
  -> scripts/build/build_release.mjs
       ├── inline CSS and module JS
       ├── remove dist/assets
       ├── write dist/index.html
       ├── copy identical dist/hiking-trail-mapper.html alias
       ├── write dist/release.json
       └── refresh/check root hiking-trail-mapper.html
  -> GitHub Pages uploads dist/
```

“Single HTML” means the final application references no external JavaScript or CSS. The compatibility alias has identical content and is not a second source. Map tiles still come from the network.

Root and build files have different responsibilities:

| File | Role | Direct `file://` |
|------|------|-------------------|
| `index.html` | Small Vite source-entry shell | No |
| `hiking-trail-mapper.html` | Generated self-contained release | Yes |
| `dist/index.html` | GitHub Pages primary entry | Yes |
| `dist/hiking-trail-mapper.html` | Compatibility download alias | Yes |

## Progressively Splitting runtime.ts

`runtime.ts` still contains substantial mature but classic browser orchestration. Split it vertically by behavior instead of rewriting everything at once:

The `RenderScheduler` migration for core redraws, `rebuildAll`, and workspace fitting, the Workbench command migration, and native-browser-dialog migration are complete. Remaining steps are:

1. Move dynamic trail-card, filter, and auxiliary-panel actions into payload commands where useful.
2. Continue replacing custom help, changelog, storage, and import modals with `DialogController`.
3. Split import, export, i18n, Leaflet/Canvas, and IndexedDB orchestration into small controllers/adapters.
4. Delete the classic execution path only after release and real-browser tests no longer depend on its globals.

## Performance and Reliability Constraints

- Do not redraw the elevation chart unconditionally during map pan/zoom.
- Coalesce repeated invalidations in one frame; only the latest fit request may run.
- Keep elevation Canvas draw points at or below twice the pixel width while retaining endpoints and bucket extrema; never downsample hit-test data.
- Limit elevation-gradient tracks to 40 color-layer groups and diff waypoint markers by stable key.
- During consecutive resets, stale fit epochs, reset epochs, and delayed mobile fits must not override the latest request.
- After interaction cancellation, timers, RAF callbacks, and async results must not write state.
- Do not serialize raw `Set` values or persist DOM/Leaflet objects.
- Keep pure calculations DOM-free and cover boundary inputs with unit tests.
- The seven-side/five-bottom Workbench must share commands instead of duplicating responsive side effects.

## Known Limitations

- KML is the only native import format; GPX, GeoJSON, and FIT are not parsed directly.
- The single-file release does not cache map tiles for offline use.
- `runtime.ts` still needs progressive splitting; primary Workbench commands and native dialogs are unified, while dynamic data actions, custom modals, and remaining browser orchestration are not fully modular yet.
- Use the generated release, not the root Vite shell, for `file://`.
