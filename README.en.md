<div align="center">

<p><a href="README.md">中文</a> | <a href="README.en.md">English</a></p>

<h1>Outdoor Route Studio</h1>

**Single-file KML outdoor route workbench · import, compare, measure, segment, and export**

</div>

Outdoor Route Studio is a map-first KML route viewer and organizer. Application implementation is maintained only under `src/`: root `index.html` is a small Vite shell that loads `src/main.ts`, and Vite turns the complete module graph into an inlined, offline-capable single-HTML release.

## Quick Start

Open the generated release checked into the repository:

```bash
open hiking-trail-mapper.html
```

`hiking-trail-mapper.html` opens directly over `file://`. Application code, styles, Leaflet, and the compression library are inlined; only online map tiles require a network. Root `index.html` is a source entry shell for Vite, not the offline release file.

Local development:

```bash
git clone https://github.com/Sicily-love/hiking-trail-mapper.git
cd hiking-trail-mapper
npm ci
npm run dev
```

Import routes:

- Choose **Add trail** and select one or more `.kml` files.
- You can also import `.zip` / `.kml.zip`; the app extracts KML files and skips macOS metadata.
- Files can be dragged directly onto the workbench.

## Core Capabilities

| Scenario | Capability |
|----------|------------|
| Compare routes | Overlay multiple routes, emphasize the current group's primary trail, and de-emphasize supporting trails |
| Plan daily stages | Segment by day and produce daily distance, ascent, descent, elevation, and camp data |
| Inspect a section | Pick A/B points on the primary trail, calculate along-track distance, ascent, and descent, and inspect section elevation |
| Manage waypoints | Pick a primary-trail point, choose an icon and type, enter notes, and attach an optional image; filtering and renaming remain available |
| Plan escapes | Choose a reference trail in the active group, select its A/B section, and save the result under the primary itinerary |
| Move data | Export the current group as KML ZIP and the primary-trail itinerary as Markdown |

See [Features](docs/FEATURES.en.md) for interactions and [Architecture](docs/ARCHITECTURE.en.md) for implementation boundaries.

## Workbench

The Workbench adapts one command vocabulary to different screen sizes:

- Desktop and mobile share four clear activities: Trails, Itinerary, Waypoints, and Settings.
- Trails owns the route library and primary summary; saved escape routes appear directly in Itinerary.
- The bottom area focuses on elevation analysis, Measure actions appear there when active, and Segment uses a focused editor.
- Dedicated managers coordinate command state, pointer/keyboard interaction, render invalidation, and modal dialogs so DOM handlers do not each maintain separate state.

## Data and Privacy

Trails, waypoints, and group state are stored in the current browser's IndexedDB and are not uploaded to an application server. Clearing browser data or changing browsers or devices does not migrate local data; use **Export → KML ZIP** first.

## Architecture

The current entry chain is:

```text
index.html
  -> src/main.ts
  -> bootstrapOutdoorRouteStudio()
  -> mountAppShell()
  -> vendor side-effect modules
  -> startStudioRuntime({ document, commands, dialogs })
  -> typed core / feature controllers / adapters
```

- `index.html` contains only metadata, `#app`, and `/src/main.ts`; it contains no business implementation.
- `src/app/bootstrap.ts` mounts the Workbench DOM, loads vendors through the Vite module graph, and explicitly starts the Studio runtime. Business code is no longer executed as an injected script string.
- `src/core` owns DOM-free calculations, parsing, transformations, and render models.
- `src/app` and `src/features` own state and interaction orchestration; `src/adapters` isolates Leaflet / IndexedDB; `src/ui` owns the Workbench and dialogs.
- `InteractionManager` makes measure, segment, waypoint, escape, and Day-preview sessions mutually exclusive.
- `RenderScheduler` coalesces track, marker, sidebar, day, legend, chart, and fit invalidations through a dirty mask. Elevation Canvas rendering uses pixel-width min/max downsampling, tracks use at most 40 color bands, markers update by stable-key diff, and only the final consecutive reset may commit.
- `CommandRegistry` unifies the top menu, desktop/mobile activity rail, bottom analysis bar, and Escape shortcut. `DialogController` replaces every native `alert`/`prompt`/`confirm` with shared focus restoration and danger confirmation.

`v2.0.0` removes `executeClassicScript()`, the runtime composer, raw runtime imports, and all 13 classic owners. `src/app/runtime/studio.ts` is a normal TypeScript module that directly receives `document`, `CommandRegistry`, and `DialogController`; it no longer depends on `window.HikingTrailCore/HikingTrailApp`. Typed controllers continue to own trail, storage, file import/export, waypoint, measure, segment, Day-preview, and escape business state. Browser DOM/Leaflet orchestration lives in the direct runtime, while new behavior should start in controllers, adapters, or UI modules. A read-only inspector is available only under `?studio-test=1`; normal releases expose no classic globals.

## Development and Tests

```bash
npm run test:unit
npm run typecheck
npm run build
./tests/run_full_check.sh
npm run test:visual:capture
```

`npm run build` uses the small `index.html` shell as the Vite entry, inlines JavaScript and CSS into `dist/index.html`, and emits the compatibility alias `dist/hiking-trail-mapper.html` plus `dist/release.json`. The two HTML names contain the same self-contained release; they are not separate sources.

`npm run release:prepare` is the release entrypoint: it synchronizes generated artifacts, runs full verification, builds the single-file release, and validates metadata. See [Testing](docs/TESTING.en.md) and [Contributing](docs/CONTRIBUTING.en.md) for the complete workflow.

## Milestones

| Milestone | Status | Result |
|-----------|--------|--------|
| Milestone 1: Test guardrails | Complete | Unit, static, real-Chrome, E2E, visual, and release checks form one verification chain |
| Milestone 2: Engineering skeleton | Complete | Vite, TypeScript, `src/`, and type checking are part of daily development |
| Milestone 3: Core modularization | Complete | Core math, KML, storage, measurement, itinerary, and elevation models use TypeScript as their source of truth |
| Milestone 4: UI systemization | Complete | The Workbench unifies desktop, mobile, sidebar, bottom bar, elevation dock, and bottom sheets |
| Milestone 5: Release pipeline | Complete | Vite single-file builds, release metadata, full checks, and GitHub Pages deployment are fixed |
| Milestone 6: Architecture & UX 2.0 | Complete | Classic bridge/composer removed; direct module boot, shared managers, Workbench, and single-HTML release pipeline finalized |

Milestone 6 establishes the Architecture 2.0 baseline: production boot contains no runtime string injection, fragment composer, or dual execution path. Future releases focus on typed features, performance, and new import formats rather than another boot-architecture rewrite.

## GPX / GeoJSON

The app currently parses KML directly. Convert GPX first:

```bash
ogr2ogr -f KML output.kml input.gpx
```

Future native GPX / GeoJSON support should normalize into the existing import model in `src/core`, keeping storage, measurement, segmentation, and rendering independent of source format.

## Versioning

Version: v2.0.6

- `PATCH`: fixes, docs, tests, compatibility work, and small interaction improvements.
- `MINOR`: new user-visible capability, data fields, or a major workflow.
- `MAJOR`: incompatible data migration or export-format change.

Use `npm run version:bump` to update release metadata together instead of editing version stamps manually.

## Repository Layout

```text
hiking-trail-mapper/
├── index.html                    Small Vite source-entry shell
├── hiking-trail-mapper.html      Generated offline single-file release
├── src/
│   ├── main.ts                   Browser module entry
│   ├── app/                      Bootstrap, state, commands, interaction and render coordination
│   ├── core/                     DOM-free calculations and data models
│   ├── features/                 Feature controllers
│   ├── adapters/                 Leaflet / IndexedDB boundaries
│   ├── ui/                       Workbench, layout, and dialogs
│   ├── styles/                   Global and vendor style entries
│   └── vendor/                   Browser dependencies inlined at build time
├── scripts/                      Build, release, and maintenance tools
├── tests/                        Unit, browser, E2E, and visual checks
├── docs/                         Chinese and English feature, architecture, testing, and contribution docs
├── dist/                         Vite-generated Pages artifact
└── .github/workflows/pages.yml   Verification and GitHub Pages deployment
```

## Deployment

`.github/workflows/pages.yml` verifies pull requests. On pushes to `main`, it runs `npm run release:prepare`, uploads `dist/`, and deploys GitHub Pages. Pages serves the built, self-contained `dist/index.html`; the root source shell is not deployed directly.

## License

[MIT](LICENSE)
