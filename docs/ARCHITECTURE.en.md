# Architecture & Design Decisions

**🌐 [中文](ARCHITECTURE.md) · [English](ARCHITECTURE.en.md)**

For contributors and the technically curious.

## Overview

The release remains a directly openable single-file HTML, but root HTML is generated. `src/core` owns DOM-free calculations and render models; `src/app` and `src/features` own state and interaction controllers; `src/adapters` isolates Leaflet/IndexedDB; and `src/ui` owns the Field Console. `scripts/build/generate_release_html.mjs` composes embedded `HikingTrailCore`, `HikingTrailApp`, and browser runtimes.

## Engineering Source Tree

```text
src/
├── template/app.html  Single-file release shell without generated CSS/runtime
├── ui/
│   ├── workbench.css  Field Console visuals and responsive layout
│   └── workbench.ts   Command, sidebar, and elevation-dock DOM controller
├── app/
│   ├── state.ts       Application state and per-group primary descriptors
│   ├── index.ts       App runtime barrel
│   └── runtime.js     Browser events and Canvas/Leaflet orchestration
├── features/          Measurement, itinerary, Day, and elevation controllers
├── adapters/          Leaflet and IndexedDB effect boundaries
├── core/
│   ├── types.ts       Base types
│   ├── geo.ts         haversine / cumulative distance / nearest point
│   ├── elevation.ts   smoothing, ascent/descent, elevation color, stats
│   ├── elevationProfile.ts elevation layout, render data, annotation layout/commands, panel height
│   ├── kml.ts         KML coordinates, image URLs, labels, and import model assembly
│   ├── trail.ts       trail id, waypoint snap, content hash
│   ├── measure.ts     A/B range, thinned segment lines, measurement stats
│   ├── itinerary.ts   segment points, boundary moves, day stats, camp edit ownership
│   ├── render.ts      Leaflet models for measurement, segmentation, and Day preview
│   └── index.ts       core module barrel
├── main.ts            Vite development entry, exposes both TypeScript runtimes
└── ../dev.html        Vite development shell, iframe-loading current release HTML
```

`src` is the only source entry. Root `index.html` and `hiking-trail-mapper.html` are generated and should not be edited directly. Forty-five duplicate core fallbacks were removed; alignment tests execute the embedded production IIFE in Node and compare it with `src/core` for identical inputs. `tests/unit/trail_core.js` remains only a CommonJS test bridge.

## Why single-file

- **Zero deployment friction**: GitHub Pages / cloud storage / local folder / AirDropped to phone — anywhere HTML runs
- **`file://` protocol compatible**: works fully offline for previously-loaded map data
- **Fork-friendly**: source is split by responsibility while release remains one file

## Why the Published Artifact Stays Single-File

- The release artifact stays simple for `file://` and GitHub Pages deployment
- The Vite / TypeScript core now powers the production runtime while remaining embedded in one file
- Leaflet is enough; React/Vue would be overhead
- Native DOM and event listeners keep runtime overhead low; the complete single file is about 630KB including Leaflet, fflate, and both TS runtimes

## Structure (all inside one HTML)

```
hiking-trail-mapper.html
├── <head>
│   ├── Leaflet CSS (embedded)
│   ├── App CSS
│   └── fflate 0.8.2 UMD (embedded, ~32KB)
│       └── ⚠ MUST be inline. Sync CDN <script> on file:// blocks page render
├── <body>
│   ├── #map           ← Leaflet main container
│   ├── #sidebar       ← Trail list / group tabs / batch toolbar
│   ├── #elev-bar      ← Bottom elevation chart Canvas
│   └── Various modals / toasts / popups
└── <script>
    ├── Leaflet 1.9.4 UMD (embedded, ~140KB)
    ├── leaflet-polylineDecorator (embedded)
    ├── HikingTrailCore IIFE (generated from src/core)
    ├── const APP_VERSION / CHANGELOG (bilingual)
    ├── i18n dictionaries (zh / en)
    ├── state object (activeTrails / expandedTrails / primaryTrailId / activeGroup / batchMode / batchSelected …)
    ├── DATA object (trails array + calc_method)
    ├── KML parser (parseKML)
    ├── Core runtime bindings (measure / itinerary / KML / storage / elevation models)
    ├── Rendering layer (buildTrailList / buildPrimaryCard / drawElevBar / draw*)
    ├── Interaction layer (right-click menu / long-press / dblclick rename / group switch / batch select)
    ├── Persistence layer (loadFromStorage / saveToStorage / IndexedDB wrappers)
    ├── Export layer (exportGroupKML / exportItineraryMD / showExportMenu)
    └── i18n layer (setLang / applyI18n / t / refreshAll)
```

## Data model

```typescript
type Trail = {
  id: string;                    // unique ID
  name: string;                  // display name (editable via dblclick)
  color: string;                 // primary color
  group?: string;                // v1.14.0+ group, default "默认"
  tracks: TrackPoint[];          // GPS points [lat, lon, alt, km, timestamp?]
  waypoints: Waypoint[];         // annotation points
  totalKm: number;
  totalAsc: number;              // via accumulator thr=10
  maxElev: number;
  // ...
};

type Waypoint = {
  lat: number;
  lng: number;
  name: string;
  tag: string;                   // one of 13
  gps_idx: number;               // projected nearest idx on tracks (for elev alignment)
  manual?: boolean;              // user-added flag
};
```

## Key algorithms

### Accumulator ascent (thr=10m)

Naive sum-of-positives inflates ascent 3-5x due to GPS noise (±3-5m). Use a thresholded accumulator:

```
running_asc = 0
peak = alt[0]
total_asc = 0
for i in 1..n:
  d = alt[i] - alt[i-1]
  if d > 0:
    running_asc += d
    if alt[i] > peak: peak = alt[i]
  else:
    if running_asc > 10:  # threshold
      total_asc += peak - trough
    running_asc = 0
    peak = alt[i]
```

Measured: vs 2bulu official 2502m → this method gives 2459m (1.7% error). Naive method: 3811m (52% error).

### Snap-to-track (waypoint visual alignment)

Manually added waypoints or KML placemarks may not sit on the track line. Fix:

```
for each waypoint:
  min_dist = infinity
  best_idx = 0
  for i in 0..track.length:
    d = haversine(waypoint, track[i])
    if d < min_dist:
      min_dist = d; best_idx = i
  waypoint.gps_idx = best_idx
  waypoint.lat, lng = track[best_idx][0], track[best_idx][1]  # visually snap to track
```

Elevation chart uses `gps_idx` to locate corresponding X coordinate.

### Elevation chart adaptive height (scan-line prediction)

Previous "double-pass" (draw → check overflow → redraw) caused **oscillation** because H changed → pY changed → label positions changed → overflow recomputed → repeat.

New: **scan-line prediction**. Sort all labels by X, sweep once to find max horizontal overlap (stackDepth), compute H in one shot:

```
H = max(140, min(340, 110 + (stackDepth + 1) * (lh + 2) + 16))
```

The `stackDepth + 1` reserves one extra layer for edge cases.

## `file://` protocol compatibility pitfalls

Single-file HTML opened via double-click uses `file://` protocol. Many modern browser APIs are restricted:

| API | file:// restriction | Fix |
|-----|--------------------|-----|
| `fetch(location.href)` | Safari refuses to load self | Use `document.documentElement.outerHTML` |
| CDN sync `<script>` | Headless Chrome blocks render | Inline everything |
| Service Worker | Unavailable | Skip |
| IndexedDB | ✅ Works | Just use |
| Web Crypto | Partial | Skip |

## State management convention

- Each state has **one source of truth** (no getter-reflected multiple Sets)
- `state.activeTrails` = `Set<trailId>` (overlay checkboxes)
- `state.expandedTrails` = `Set<trailId>` (expanded detail cards)
- `state.batchSelected` = `Set<trailId>` (batch-selected; v1.15.0+ replaces the batchMode boolean — size>0 implies batch mode active)
- `state.activeGroup` = string
- `state.primaryTrailId` = string
- `state.visibleTags` = `Set<string>` (currently visible waypoint tag types)
- `state.mode` = `'day' | 'waypoint'`
- After state change, **must** call `applyChange()` (v1.17.0+), no longer scattered `rebuildAll + saveToStorage`

## v1.17.0+ function split architecture

Three large functions (703 lines total) refactored into orchestration + 22 semantic helpers (v1.17.0-v1.18.0):

- `buildTrailList` (v1.17.0): 372 → 25 lines
- `handleFiles` (v1.18.0): 166 → 17 lines
- `parseAndProcessKml` (v1.18.0): 174 → 36 lines
- `drawElevBar` (v1.18.0): 363 → 24 lines

See Chinese version for full call graphs.

## v1.19.0 engineering infrastructure

**JSDoc type annotations**: All key functions have `@param` + `@returns`. `@typedef` block centralized at top of file (TrackPoint / TrackTuple / Waypoint / DayMeta / TrailStats / EscapeRoute / Trail / ElevLayout / ElevAnnotation / ImportedFile).

**Complete tests/ directory**:

```
tests/
├── run_full_check.sh    # One-command 6 phases
├── unit/
│   ├── trail_core.js    # CommonJS bridge → src/core/index.ts
│   ├── test_math.js     # 30 math assertions
│   ├── test_enrich.js   # 12 snap/hash assertions
│   ├── test_core_contract.js     # 4 TS core export contract checks
│   ├── test_kml_core.js          # 11 KML import model/primitive assertions
│   ├── test_storage_core.js      # 12 IndexedDB snapshot/read-write-operation/restore contract assertions
│   ├── test_measure_itinerary.js # 27 measure/elevation-layout-render-annotation-panel-height/itinerary/Day preview/render-model assertions
│   ├── test_vite_entry.js        # 3 Vite development entry assertions
│   └── verify_alignment.js       # 67 HTML↔src/core alignment checks
└── e2e/
    └── run_all.py       # 16 scenarios / 62 assertions (headless Chrome)
```

## Unified state mutation entry: applyChange

```javascript
applyChange({ save: true, fit: false, tracksOnly: false })
```

- `save`: Trigger IndexedDB save (default true)
- `fit`: fitBounds to primary trail
- `tracksOnly`: Only redraw tracks (skip UI panel rebuild)

Call after all state changes, replacing pre-v1.16.0 scattered `rebuildAll + saveToStorage` pattern.

## Release checklist

Use the fixed release flow:

```bash
npm run version:bump -- patch --zh "中文更新项" --en "English change"
npm run release:prepare
```

`release:prepare` performs these steps in order:

1. Generate and verify the embedded `HikingTrailCore`
2. Synchronize both root HTML files, CHANGELOG, and README versions
3. Run all six validation phases
4. Build production `dist/` with Vite
5. Verify both static entrypoints and `release.json`

## Common performance traps

- **Redundant rebuildAll**: group switch, batch select, rename etc. should call minimal subtree rebuilds (`buildTrailList()`, not full `rebuildAll()`)
- **Set serialization**: `JSON.stringify(new Set())` = `"{}"`. Convert Sets via `Array.from()` on save and `new Set(arr)` on load
- **Elev chart repaint**: no repaint needed on map pan/zoom, only when primary trail or data changes

## Adding a new feature

Recommended flow:
1. Reserve a `vX.Y.Z-dev` entry at top of CHANGELOG
2. Add fields to `state` object
3. Find relevant `build*` function, modify UI
4. Add persistent fields to `_doSave` minimal object
5. Add/update i18n strings (both zh + en)
6. Syntax check + dump-dom smoke test
7. Manual Safari `file://` QA

## Known limitations

- KML import only (no GPX, GeoJSON, FIT)
- Cannot cache map tiles offline (would need Service Worker, unavailable on `file://`)
- Esri tiles can be slow in mainland China; fine elsewhere
- Pre-iOS 15 Safari has partial IndexedDB `getAll` support (fallback manually)
