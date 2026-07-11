# Outdoor Route Studio Testing Guide

**[中文](TESTING.md) · [English](TESTING.en.md)**

The test system protects modular source, the transitional runtime, real-browser behavior, and the Vite single-file release.

## Common Commands

```bash
npm run test:unit
npm run typecheck
npm run build
./tests/run_full_check.sh
npm run test:visual:capture
```

- `npm run test:unit`: fast Node contract tests.
- `npm run typecheck`: TypeScript boundaries.
- `npm run build`: generate the self-contained release from the small shell and `src/`.
- `./tests/run_full_check.sh`: complete pre-release verification.
- `npm run test:visual:capture`: real KML, desktop/mobile breakpoints, and interaction-state screenshots.

Visual and real-Chrome checks require an environment that can launch a browser. A restricted sandbox may not run them. A release must not treat missing browser execution as a pass.

## Testing Principles

1. `src/` is the behavior source of truth; tests do not treat generated HTML as editable implementation.
2. `index.html` and `hiking-trail-mapper.html` have different roles and must no longer be asserted byte-identical.
3. `runtime.ts` remains a transitional compatibility layer; tests protect its migration boundary and do not assume it is gone.
4. Pure functions use Node unit tests; DOM/Canvas/Leaflet behavior uses browser tests; complete user workflows use E2E.
5. When behavior moves out of `runtime.ts`, preserve the old behavior test first, switch the owner, then delete the old path.

## Full Check

`tests/run_full_check.sh` is the shared local and release-preparation entrypoint. It validates these layers:

### Phase 1: TypeScript and Temporary Vite Release

```bash
npm run typecheck
npm run check:generated
```

`check:generated` builds `.vite-build/` in read-only mode and checks that tracked `hiking-trail-mapper.html` is reproducible from current source. The full script also extracts the single inline module from the temporary HTML and validates its syntax with `node --check`.

Build contracts:

- The Vite entry is the root `index.html` shell.
- `index.html` contains only `#app`, product metadata, and `/src/main.ts`.
- `src/main.ts` imports styles and calls `bootstrapOutdoorRouteStudio()`.
- Bootstrap mounts the Workbench before vendors, typed modules, and the `runtime.ts` bridge start.
- Temporary `.vite-build/index.html` references no external JavaScript/CSS assets.
- `.vite-build/hiking-trail-mapper.html` is an identical compatibility alias.
- `.vite-build/release.json` records product, version, date, hash, and entrypoints.

Do not restore the old “`index.html` must equal `hiking-trail-mapper.html`” test. The correct contract is that the former stays small and the latter is reproducible from current `src/` and build configuration.

### Phase 2: Node Units and Contracts

| Test | Primary coverage |
|------|------------------|
| `test_math.js` / `test_enrich.js` | Distance, elevation, stats, waypoint snapping, and content hashes |
| `test_core_contract.js` / `test_kml_core.js` | `src/core` exports, KML coordinates, `gx:Track`, waypoints, and import models |
| `test_storage_core.js` / `test_indexeddb_adapter.js` | IndexedDB snapshots and commit timing, Set serialization, per-group primary trails, and legacy restore |
| `test_measure_itinerary.js` | A/B measurement, segmentation, Day ranges, elevation layout, and render models |
| `test_performance_core.js` | Elevation segmentation, Canvas min/max downsampling, waypoint diffs, and track revisions |
| `test_app_architecture.js` | App state, feature controllers, adapters, and Workbench fit planning |
| `test_interaction_manager.js` | Session exclusivity, owner/session guards, AbortController, and timer/RAF cleanup |
| `test_interaction_runtime.js` | Runtime contracts wiring all five map modes to the unified interaction state machine |
| `test_render_scheduler.js` | Dirty-mask coalescing, fixed flush order, next-frame re-entry, and fit epochs |
| `test_render_runtime.js` | Seven-phase runtime wiring, elevation downsampling, marker diffs, and final-reset protection |
| `test_command_dialog.js` | Command registration/state/dispatch, four-surface wiring, and native-dialog safety, focus, and Escape |
| `test_ui_contract.js` | Responsive Workbench, seven-side/five-bottom layout, sidebar, elevation dock, and accessibility |
| `test_vite_entry.js` | Small shell, `main.ts`, `bootstrap.ts`, transitional runtime, and single-file build |
| `test_release_pipeline.js` | Reproducible builds, release metadata, version tools, and the GitHub Pages workflow |
| `verify_alignment.js` | Generated release behavior uses `src/core` without restoring duplicate core fallbacks |

`tests/unit/trail_core.js` is only an import bridge for older CommonJS tests, not a second implementation.

### Phase 3: Release Metadata

`python3 scripts/release/check_release_metadata.py` should verify:

- `package.json` / lockfile, `APP_VERSION`, CHANGELOG, and README versions agree;
- the product name is Outdoor Route Studio;
- the shell title, runtime release metadata, and generated HTML comment agree;
- `release.json` matches the single-HTML hash and byte count;
- Vite, TypeScript, npm scripts, and Pages workflow paths are correct.

This phase validates only and must not rewrite business source.

### Phase 4: Static Browser Contracts

`tests/browser/test_skill.py` reads both the shell and generated release and verifies at least:

- required DOM for `#app`, map, route sidebar, elevation dock, tool panels, and dialogs;
- matching Chinese and English i18n keys;
- Leaflet / fflate are present in the generated single file;
- no external script or style dependencies remain;
- the generated release contains Outdoor Route Studio boot markers and the compatibility runtime.

### Phase 5: Real-Chrome Functionality

`tests/browser/test_v1_31.py` checks startup, imports, DOM updates, and core interactions in a real browser. Milestone 6 assertions should await `window.__OUTDOOR_ROUTE_STUDIO__.ready` so an intermediate boot state is not treated as failure.

Key coverage:

- IndexedDB restore performs exactly one valid fit;
- measure, segment, waypoint, escape, and Day preview are mutually exclusive;
- stale callbacks do not run after interaction cancellation/replacement;
- top menu, desktop/mobile activity rail, analysis bar, and Escape dispatch shared semantic commands;
- dialog cancel, confirm, Escape, and focus restoration;
- generated HTML has no runtime errors over `file://`.

### Phase 6: End-to-End Workflows

`tests/e2e/run_all.py` covers empty startup, KML/ZIP import, deduplication, groups and primary trails, batch moves, reverse, delete, waypoint filters, Day/measure/segment, IndexedDB, i18n, export, and `file://`.

E2E tests assert user outcomes instead of manager private fields. Phase 2 protects manager internals.

After all six phases, the script performs a read-only release-consistency check:

- `.vite-build/index.html`, its compatibility alias, and the tracked release are byte-identical;
- the `release.json` hash and byte count match the temporary artifact;
- root `hiking-trail-mapper.html` has no hand-edited drift;
- Pages uploads `dist/`, not the root source shell;
- docs, CHANGELOG, and release metadata have no version drift.

## Minimum Manager Test Sets

### InteractionManager

- Activating a new kind cancels and aborts the previous session.
- Events with mismatched owner, sessionId, or kind are rejected.
- One event object can be consumed at most once.
- A phase change clears RAF/delay work from the old phase.
- Cancel/dispose are idempotent and an old session cannot become current again.

### RenderScheduler

- Dirty flags are non-overlapping bits in a fixed order.
- Multiple invalidations in one frame schedule one RAF.
- Invalidations raised during flush run in the next frame.
- Fit keeps the latest request and invalidates old epoch guards.
- One scheduler owns all seven runtime refresh classes; legacy redraw entrypoints only raise dirty flags.
- Canvas downsampling retains full hit-test data, and unchanged regular markers retain their instances.
- Consecutive reset promises resolve `false` / `true`, with final bounds owned by the latest request.
- A throwing handler does not prevent cleanup of other phases; errors follow the aggregation contract.

### CommandRegistry

- Duplicate and empty command IDs are rejected.
- Disabled commands do not execute; checked state derives from context.
- Sync, async, and throwing dispatch each emit one lifecycle event.
- Dispose / unsubscribe are idempotent.

### DialogController

- User text goes through `textContent`; no `innerHTML` injection path exists.
- Confirm/prompt default, cancel, and danger states are correct.
- Escape matches native cancel behavior.
- Focus returns on close; destroy rejects new requests and clears pending dialogs.

## Responsive Workbench Testing

Cover at least wide desktop, narrow desktop, 390px, and 320px:

- Desktop presents seven primary actions in the side rail; mobile presents five in the bottom bar.
- Crossing breakpoints does not clone command handlers or double-dispatch.
- More/bottom sheets do not obscure critical map controls.
- Route sidebar, elevation dock, and tool panels do not overlap incoherently.
- Labels fit controls; the longest Chinese and English labels remain visible or intentionally truncate.
- Keyboard focus order, `aria-expanded`, and reduced-motion behavior remain correct.

Visual regression should use real sample KML and capture at least empty state, route list, Day, A/B measurement, two-day segmentation, dialogs, and the mobile sidebar.

## Failure Diagnostics

```bash
# Managers and entry
node tests/unit/test_interaction_manager.js
node tests/unit/test_render_scheduler.js
node tests/unit/test_command_dialog.js
node tests/unit/test_vite_entry.js

# Core and generated artifact
node tests/unit/test_measure_itinerary.js
node tests/unit/test_storage_core.js
node tests/unit/verify_alignment.js

# Release and browser
python3 scripts/release/check_release_metadata.py
python3 tests/browser/test_skill.py
uv run --with websocket-client python3 tests/e2e/run_all.py
```

Use this judgment order:

1. Did implementation regress? Fix implementation first.
2. Was behavior intentionally changed? Update implementation, tests, and both language docs.
3. Is the generated artifact stale? Rebuild it; do not edit HTML by hand.
4. Is browser execution unavailable? Record the unrun check explicitly; do not report it as passing.

## Adding Tests

- Pure calculations: add Node units around the relevant `src/core` module.
- Managers: inject scheduler/RAF/document fakes and assert public contracts without real time.
- DOM and compatibility runtime: use `tests/browser`.
- Multi-step user workflows: use `tests/e2e`.
- Layout, occlusion, and breakpoints: use `tests/visual`.

After adding a test file, wire it into `npm run test:unit` or the full-check entrypoint. A test file that never runs in the pipeline is not complete.
