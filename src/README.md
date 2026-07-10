# Application Source

`src/` is the modular source tree used by development, tests, and the generated release runtime.

Current status:

- `src/template/app.html` is the canonical single-file shell. Root HTML files are generated and must not be edited directly.
- `src/ui/` owns the Field Console CSS and DOM chrome.
- `src/app/`, `src/features/`, and `src/adapters/` own state, interaction controllers, Leaflet rendering, and IndexedDB effects.
- `src/core/` contains pure, DOM-free functions migrated from the former Node mirror.
- `src/core/measure.ts` and `src/core/itinerary.ts` own A/B measurement, daily segmentation, boundary moves, and Day preview range/stat contracts.
- `src/core/elevationProfile.ts` owns elevation layout, paths, visual styles, annotation layout/render commands, and adaptive panel height.
- `src/core/kml.ts` contains DOM-free KML import primitives and import model assembly: coordinate text parsing, `gx:coord`, image URLs, short labels, title fallback, waypoints, and KML metadata.
- `src/core/storage.ts` contains IndexedDB snapshot contracts and read/write/delete operation models.
- `src/core/render.ts` builds measurement, segmentation, and Day-preview models before Leaflet consumes them.
- `dev.html` is the Vite development shell. `src/main.ts` exposes `window.HikingTrailCore` and `window.HikingTrailApp` for inspection.
- `scripts/build/generate_release_html.mjs` composes the template, CSS, core/app IIFEs, and browser runtime into both root HTML files.
- Vite builds the production `index.html` into `dist/`, while root HTML remains directly openable.
- Existing tests now import the TypeScript core module through `tests/unit/trail_core.js`.

Maintenance rule:

1. Change deterministic behavior in `src/core`; change interaction state in `src/features` or `src/app`.
2. Change visual behavior in `src/ui`, never in generated root HTML.
3. Run `npm run sync:release` to refresh generated entries.
4. Add focused unit coverage and finish with `npm run release:prepare`.
