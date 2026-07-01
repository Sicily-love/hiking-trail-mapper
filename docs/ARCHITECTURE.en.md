# Architecture & Design Decisions

**🌐 [中文](ARCHITECTURE.md) · [English](ARCHITECTURE.en.md)**

For contributors and the technically curious.

## Overview

Single-file HTML. No build pipeline. No external dependencies. All resources (Leaflet, fflate, CSS, JS, i18n dictionaries, CHANGELOG) live inside the same HTML file.

## Why single-file

- **Zero deployment friction**: GitHub Pages / cloud storage / local folder / AirDropped to phone — anywhere HTML runs
- **`file://` protocol compatible**: works fully offline for previously-loaded map data
- **Fork-friendly**: clone once, all changes diff cleanly in one file

## Why no framework

- Single-file apps aren't a good fit for Webpack/Vite/Rollup
- Leaflet is enough; React/Vue would be overhead
- Raw DOM + event listeners = tiny bundle (~475KB total, of which Leaflet is ~140KB, fflate ~32KB)

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
    ├── const APP_VERSION / CHANGELOG (bilingual)
    ├── i18n dictionaries (zh / en)
    ├── state object (activeTrails / expandedTrails / primaryTrailId / activeGroup / batchMode / batchSelected …)
    ├── DATA object (trails array + calc_method)
    ├── KML parser (parseKML)
    ├── Compute engine (haversine / accumulator_ascent / smooth_elev / enrich_waypoints)
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
- `state.batchMode` = boolean
- `state.batchSelected` = `Set<trailId>` (batch mode selection)
- `state.activeGroup` = string
- `state.primaryTrailId` = string
- After state change, call `rebuildAll()` / `buildTrailList()` / `saveToStorage()`

## Release checklist (each template change)

Must run:

1. Update HTML top comment `APP_VERSION` + `BUILD_DATE`
2. Update `<title>` version
3. Update `version-tag` DOM
4. Update JS `const APP_VERSION`
5. Append CHANGELOG entry (both zh + en)
6. Node syntax check via `./scripts/sync_release.sh` (extracts inline JS)
7. Chrome headless dump-dom smoke test: `google-chrome --headless=new --dump-dom` to verify DOM
8. Manual Safari `file://` QA (checkbox / expand / switch group / batch / export)

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
