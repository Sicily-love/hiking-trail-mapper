# Testing Guide

This document describes the testing system, when to run tests, and how to locate failures.

## One-command Test

```bash
# Run from repo root (github-release/hiking-trail-mapper/)
./tests/run_full_check.sh
npm run test:visual:capture
```

`npm run test:visual:capture` must run in the real system environment. It loads the sample KML and emits 1440, 1024, 390, and 320 screenshots plus a layout report; it does not launch Chrome inside the Codex seatbelt sandbox.

Expected output (v1.19.0+):

```
✓ Phase 1 · JS syntax check
✓ Phase 2 · Unit tests + alignment (117 + 71)
✓ Phase 2b · TypeScript / Vite build
✓ Phase 2c · Release metadata consistency (43/43)
✓ Phase 3 · Static verification (54/54)
✓ Phase 4 · Functional tests (130/130)
✓ Phase 5 · End-to-end tests (63/63)
✓ Phase 6 · Sync consistency check
✓ All 6 phases passed
```

## When to Run

### Must run (definition of "big change")

Run `run_full_check.sh` after any of the following:

- **Refactoring 300+ line functions** — e.g. `drawElevBar` / `handleFiles` / `parseAndProcessKml`
- **Adding or removing global state fields** — e.g. `state.activeTrails` / `state.primaryTrailId`
- **Modifying data structures** — Trail / Waypoint / DayMeta field changes
- **Modifying the IO layer** — `parseKml` / `handleFiles` / KML export
- **Bumping minor/major version** — `vX.Y.0` or `vX.0.0`

### Recommended for small changes

- CSS class renames
- i18n translation updates
- Internal implementation changes (input/output interface preserved)

At minimum run Phase 1 (syntax) + Phase 3 (static):

```bash
node --check /tmp/htm-inline.js
python3 tests/browser/test_skill.py
```

## Six Phases Explained

### Phase 1 · JS Syntax Check

Uses `node --check` on inline scripts.

- **Failure signal**: syntax error
- **Fix**: check line number in error, usually a missing bracket after split/merge

### Phase 2 · Unit Tests (Node)

Eleven test files:

| File | Coverage | Count |
|------|----------|-------|
| `tests/unit/test_math.js` | haversine / smoothElev / accumulatorAscent/Descent / elevRatioColor / computeCumulativeDistance / computeTrailStats / generateNextTrailId | 30 |
| `tests/unit/test_enrich.js` | enrichWaypoints / trailContentHash | 12 |
| `tests/unit/test_core_contract.js` | `src/core/*.ts` export contract, CommonJS bridge, cross-module behavior | 4 |
| `tests/unit/test_kml_core.js` | KML coordinates, `gx:coord`, image URLs, short labels, title fallback, and import model assembly rules | 11 |
| `tests/unit/test_storage_core.js` | IndexedDB snapshot shape, read/write/delete operation models, activeTrails serialization, legacy primaryTrailId migration, activeGroup=null, and primaryByGroup cleanup | 12 |
| `tests/unit/test_measure_itinerary.js` | A/B measurement, thinning, elevation layout/render commands, segment restore/move, Day preview, day stats, camp ownership | 29 |
| `tests/unit/test_vite_entry.js` | Development entry, production Vite entry, static outputs, and embedded TypeScript runtime contracts | 5 |
| `tests/unit/test_app_architecture.js` | App state, interaction controllers, reset-fit planning, elevation dock, and Leaflet adapter | 6 |
| `tests/unit/test_ui_contract.js` | Field Console, command clipping, reset framing, elevation dock, Day timeline, bottom sheets, real-state screenshots, and accessibility | 11 |
| `tests/unit/test_release_pipeline.js` | Core runtime reproducibility, version bump, release preparation, and GitHub Pages workflow | 8 |
| `tests/unit/verify_alignment.js` | Embedded production runtime matches `src/core` behavior and contains no duplicate fallbacks | 23 |

**About verify_alignment**:
`src/core/*.ts` is the source of truth for pure functions; `src/app`, `src/features`, and `src/adapters` own the browser application layer. `scripts/build/generate_release_html.mjs` emits both embedded runtimes. Alignment tests execute the core IIFE from production HTML directly instead of relying on duplicate source functions.

### Phase 2b · TypeScript / Vite Build

When `node_modules` is installed, the full check also runs:

```bash
npm run typecheck
npm run build -- --outDir .vite-build --emptyOutDir
```

The build emits both static HTML entrypoints and `release.json`. A regular full check may skip TypeScript/Vite when dependencies are absent, but releases must run `npm ci` first and use `npm run release:prepare`.

### Phase 2c · Release Metadata Consistency

Runs `python3 scripts/release/check_release_metadata.py`, covering:

- HTML comment, `<title>`, `APP_VERSION`, top CHANGELOG entry, and floating version tag
- `README.md` / `README.en.md`
- `package.json` / `package-lock.json`
- Whether `index.html` mirrors `hiking-trail-mapper.html`
- Embedded core runtime, Vite production entry, build/version scripts, and npm commands
- GitHub Pages Actions versions, permissions, and deployment entry
- `vite.config.mts`, `tsconfig.json`, and `.gitignore` contracts

This step checks release metadata only and does not change application code.

### Phase 3 · Static Verification

`tests/browser/test_skill.py` — 54 checks:
- Version consistency across 5 spots (HTML top comment, `<title>`, `APP_VERSION`, `version-tag`, filename)
- Key functions exist (`buildTrailList` / `applyChange` etc.)
- state fields present (`state.activeTrails` is Set, `state.primaryTrailId` exists)
- i18n completeness (zh/en key alignment)
- Library dependencies (inlined Leaflet / fflate)
- DOM snapshot (sidebar / map elements)

### Phase 4 · Functional Tests (headless Chrome)

`tests/browser/test_v1_31.py` — 130 checks:
- All 22 helper functions from v1.17.0 + v1.18.0 are `typeof === 'function'`
- Large functions confirmed slim: `handleFiles < 30 lines`, `drawElevBar < 40 lines` etc.
- End-to-end KML.zip: unzip → skip __MACOSX → add to DATA.trails

### Phase 5 · End-to-End Tests (16 scenarios)

`tests/e2e/run_all.py` — 62 assertions across 16 scenarios:

| ID | Scenario |
|----|----------|
| E1 | Empty workspace startup |
| E2 | Import single KML |
| E3 | Import KML.zip (skipping __MACOSX) |
| E4 | Import duplicate KML (dedup) |
| E5 | Switch primary trail |
| E6 | Batch select + move to group |
| E7 | Reverse trail direction |
| E8 | Delete trail (activeTrails / primaryTrailId fallback) |
| E9 | Waypoint filter (default vs custom) |
| E10 | Day tab switch + elev bar redraw |
| E11 | IndexedDB persistence |
| E12 | i18n zh/en toggle |
| E13 | KML export |
| E14 | file:// runtime error detection |
| E15 | No selected group (`activeGroup=null`) |
| E16 | Per-group primary trail memory |

### Phase 6 · Sync Consistency

Runs `scripts/release/sync_release.sh`:
- Generalizes skill template → github-release universal version
- CHANGELOG extraction
- README badge update
- Re-runs static verification

## Failure Diagnostics

### Unit test failure

```bash
node tests/unit/test_math.js
node tests/unit/test_core_contract.js # check the TS core module contract
node tests/unit/test_storage_core.js # check IndexedDB state snapshot contracts
node tests/unit/test_measure_itinerary.js # check measure/itinerary core contracts
node tests/unit/test_vite_entry.js # check Vite development entry contracts
node tests/unit/verify_alignment.js  # check if src/core is out of sync with HTML
```

### Release metadata failure

```bash
python3 scripts/release/check_release_metadata.py
```

Usually one version stamp, README entry, package lock, `index.html` sync, or build config filename was not updated together.

### E2E failure

```bash
uv run --with websocket-client python3 tests/e2e/run_all.py 2>&1 | tail -30
```

Locate the failing E-number and map it to source code.

### Static verification failure

```bash
python3 tests/browser/test_skill.py 2>&1 | grep "✗"
```

Usually a version number stamp not updated in one spot, or a new field not registered in the snapshot.

## Modifying Tests

**Tests are the trusted baseline** — only change expected values when you **intentionally change behavior**.

Judgment order when tests fail:

1. Did I **introduce a bug**? → Fix implementation
2. Did I **intentionally change behavior**? → Update test expectations + CHANGELOG note
3. Is the **test case itself wrong**? → Rare but possible — explain clearly why

## Adding New Tests

### New unit test

Add `test_XXX.js` under `tests/unit/`. Prefer `require('../../src/core/index.ts')`; use `require('./trail_core')` only for compatibility with older tests:

```javascript
const assert = require('assert');
const { yourFn } = require('../../src/core/index.ts');

// ... assertions
```

Also add `yourFn` to the relevant `src/core` module and `src/core/index.ts`; add it to `verify_alignment.js` when it must stay aligned with the HTML implementation.

### New E2E scenario

Append to `tests/e2e/run_all.py`:

```python
print("\n▸ E15 · your scenario")
r = evalj("""
  (async () => {
    // ... trigger behavior
    return { ok: ..., someField: ... };
  })()
""")
check("assertion 1", r.get("ok") == True)
```
