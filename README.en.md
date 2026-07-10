<div align="center">

<p><a href="README.md">中文</a> | <a href="README.en.md">English</a></p>

<h1>🗺️ Hiking Trail Mapper</h1>

**Single-file KML hiking map · import, measure, segment, export**

</div>

<!-- [中文](README.md) | [English](README.en.md) -->

Hiking Trail Mapper is a single-file KML trail viewer and organizer. Maps, overlays, waypoints, elevation charts, grouping, import/export, and local persistence all live in one HTML file. There is no build step and no server requirement; download it and open it in a browser.

## 🚀 Quick Start

Open directly:

```bash
open index.html
```

Or clone the repository:

```bash
git clone https://github.com/Sicily-love/hiking-trail-mapper.git
open hiking-trail-mapper/index.html
```

Import trails:

- Click `Add trail` in the top-right and select one or more `.kml` files.
- You can also select `.zip` / `.kml.zip`; KML files inside the archive are extracted automatically.
- Drag-and-drop files onto the browser window is supported.

## 🧭 What It Is For

| Scenario | Capability |
|----------|------------|
| Comparing routes | Overlay multiple trails, highlight the primary trail, and dim secondary trails |
| Planning daily stages | Color by day and use the segment tool to generate distance, ascent, and camp data |
| Inspecting a section | Pick A/B points on the primary trail and calculate on-trail distance, ascent, descent, and segment elevation |
| Managing waypoints | Auto-classify 13 waypoint tags such as camp, pass, water, supply, bridge, and river |
| Moving data between devices | Export the active group as a KML ZIP with individual KML files and a merged import file |
| Offline trail work | No runtime CDN dependency except map tiles; project data is stored in browser IndexedDB |

See [docs/FEATURES.en.md](docs/FEATURES.en.md) for full interaction details and [docs/ARCHITECTURE.en.md](docs/ARCHITECTURE.en.md) for design notes.

## ✨ Core Features

- **KML import**: Supports `LineString`, `gx:Track`, and `Point` placemarks; skips macOS archive metadata.
- **Groups and primary trail**: Trails can be grouped by route, plan, or date; each group remembers its own primary trail.
- **Map rendering**: Leaflet is inlined; Esri satellite imagery and shaded terrain layers are available.
- **Waypoints**: Auto-classification, chip filters, double-click rename, right-click or long-press add; waypoints snap to the nearest track point so the map and elevation chart stay aligned.
- **Elevation chart**: Custom Canvas rendering for full-trail and measured-section views; clicking the curve locates the point on the map.
- **Measure and segment tools**: Measure is for temporary section analysis; segment is for committing daily itinerary data.
- **Export**: Export the active group as KML ZIP; export the primary trail itinerary as Markdown.
- **Internationalization**: Chinese and English UI are bundled.

## 🔒 Data and Privacy

All trails, waypoints, and group state are stored in the current browser's IndexedDB. Nothing is uploaded. Clearing browser data, switching browsers, or moving to another device will make local data unavailable; use `Export -> KML ZIP` for transfer.

## 🔁 GPX / GeoJSON

This version only parses KML directly. Convert GPX first:

```bash
ogr2ogr -f KML output.kml input.gpx
```

GeoJSON should also be converted to KML before import.

## 🧪 Development and Tests

The Vite + TypeScript architecture and browser-layer split are complete while [hiking-trail-mapper.html](hiking-trail-mapper.html) / [index.html](index.html) remain directly openable. Both root files are generated from `src/template`, `src/ui`, `src/core`, and `src/app`, preserving `file://` use without manually maintaining duplicate pages.

Common checks:

```bash
npm ci
npm run dev
npm run test:unit
npm run typecheck
npm run build
./tests/run_full_check.sh
npm run test:visual:capture
```

`npm run build` emits `dist/index.html`, `dist/hiking-trail-mapper.html`, and `dist/release.json`. `npm run release:prepare` synchronizes artifacts, runs the complete real-Chrome suite, builds, and verifies `dist/`.

`src/core/*.ts` is the runtime source of truth for calculations and render models. `src/app`, `src/features`, and `src/adapters` own application state, interaction controllers, and Leaflet/IndexedDB boundaries; `src/ui` owns the Field Console design and responsive behavior. Release alignment tests compare the embedded runtime directly with TypeScript behavior, so duplicate core functions are no longer retained.

## 🧱 Current Architecture

The project uses modular source with a single-file-compatible release:

1. `src/core/*.ts` owns deterministic calculations, data transforms, and render models.
2. `src/app` and `src/features` own application state and interaction controllers.
3. `src/adapters` isolates Leaflet and IndexedDB effects while `src/ui` owns the workbench DOM and visual system.
4. `scripts/build/generate_release_html.mjs` composes the template, CSS, both TS runtimes, and browser adapter into root HTML.
5. Vite builds `dist/`; GitHub Actions verifies pull requests and deploys from `main`.

## 🧩 Milestone Status

| Milestone | Status | Done | Next focus |
|-----------|--------|------|------------|
| Milestone 1: Test guardrails | ✅ Complete | Unit, core contract, UI/release contract, HTML↔`src/core` alignment, static, real-Chrome functional, and E2E tests are part of the six-phase check | Keep adding focused tests with new behavior |
| Milestone 2: Engineering skeleton | ✅ Complete | Vite, TypeScript, `src/`, `dev.html`, type checking, and builds work while root HTML remains directly openable | Routine maintenance |
| Milestone 3: Core feature modularization | ✅ Complete | Core functions, app state, features, and adapters live in `src`; 45 HTML fallbacks were removed and embedded runtime behavior is tested directly | Keep new controllers focused |
| Milestone 4: UI systemization | ✅ Complete | Field Console unifies the desktop command surface, route library, elevation dock, Day timeline, mobile action bar, and bottom sheets | Continue visual regression with real data |
| Milestone 5: Release pipeline closure | ✅ Complete | Generated root HTML, production Vite build, dual entries, `release.json`, versioning, release checks, and Pages Actions are fixed | Observe the first remote Actions run |

Maintenance priorities:

1. Core fallbacks are fully removed; deterministic behavior continues to change only in `src/core`.
2. Real-trail visual regression now covers Day cards, A/B measurement, two-day segmentation, and desktop/mobile workspaces.
3. Continue splitting the remaining browser runtime by import, export, and map interaction controllers.

## 🧭 GPX / GeoJSON Evaluation

These formats should ship as a separate feature release rather than being mixed into this engineering and UI patch:

- **GPX**: normalize `trk/trkseg/trkpt`, `rte/rtept`, and `wpt` into the current trail/waypoint model. Elevation and time are well defined; multi-segment joining is the main policy decision.
- **GeoJSON**: support `LineString`, `MultiLineString`, and `Point` features. A third coordinate can represent elevation, but waypoint type, name, and photo properties require configurable mapping.
- **Recommended boundary**: add `src/core/gpx.ts` and `src/core/geojson.ts`, both emitting the same import model as KML. The UI only dispatches by file type; storage, measurement, and itinerary remain source-format agnostic.
- **Test requirement**: cover single-line, multi-part, missing elevation, timestamps, mixed waypoints, and invalid files, then verify imported behavior matches KML.

## 🔖 Versioning

Version: v1.32.1

Single-file size about 630 KB, including Leaflet, fflate, and generated TypeScript core/app runtimes.

The version number represents release cadence, not every small change as a large release:

- `PATCH`: bug fixes, documentation, test scripts, compatibility fixes, and small interaction improvements.
- `MINOR`: user-visible features, import/export capability, data-model fields, or major workflow changes.
- `MAJOR`: incompatible data migrations, export format changes, or other breaking adjustments that require user action.

When there is no breaking change or large feature, each user-visible fix, documentation polish, or small interaction improvement should normally ship as a `PATCH` release. Purely internal implementation details can still be grouped into one patch entry. Use `MINOR` or `MAJOR` only when the feature surface, data model, or compatibility boundary clearly changes.

## 📁 Repository Layout

```text
hiking-trail-mapper/
├── hiking-trail-mapper.html      Generated single-file application
├── index.html                    Generated GitHub Pages entry
├── dev.html                      Vite development entry
├── src/                          Template, UI, core, app, features, and adapters
├── public/                       Vite static asset placeholder
├── scripts/
│   ├── build/                    HTML generation, core sync, and Vite production build
│   ├── release/                  Versioning, metadata, docs sync, and release preparation
│   └── maintenance/              One-off maintenance and source cleanup tools
├── .github/workflows/pages.yml   Verification and GitHub Pages deployment
├── dist/                         Generated production output, not committed
├── package.json                  Engineering scripts and optional build deps
├── tsconfig.json                 TypeScript config
├── vite.config.mts                Vite config
├── CHANGELOG.md                  Release history
├── docs/                         Feature, architecture, and testing docs
├── examples/sample-trails/        Sample KML files
├── references/tag-rules.md        Waypoint tag classification rules
├── tests/
│   ├── unit/                     Core, app, UI, release, and runtime-alignment tests
│   ├── browser/                  Real-Chrome static and functional checks
│   ├── e2e/                      End-to-end user flows
│   └── visual/                   Real-KML multi-state screenshot regression
└── tools/                         Optional helper tools
```

## 🌐 Deployment

The repository includes `.github/workflows/pages.yml`. Select **GitHub Actions** as the Pages source; pushes to `main` run full verification, build `dist/`, and deploy it. Root `index.html` remains available for direct opening or legacy branch/root deployment.

## 📄 License

[MIT](LICENSE)
