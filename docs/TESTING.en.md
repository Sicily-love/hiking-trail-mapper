# Testing Guide

This document describes the testing system, when to run tests, and how to locate failures.

## One-command Test

```bash
# Run from repo root (github-release/hiking-trail-mapper/)
./tests/run_full_check.sh
```

Expected output (v1.19.0+):

```
✓ Phase 1 · JS syntax check
✓ Phase 2 · Unit tests + alignment (42 + 13)
✓ Phase 3 · Static verification (54/54)
✓ Phase 4 · Functional tests (55/55)
✓ Phase 5 · End-to-end tests (39/39)
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
python3 scripts/test_skill.py
```

## Six Phases Explained

### Phase 1 · JS Syntax Check

Uses `node --check` on inline scripts.

- **Failure signal**: syntax error
- **Fix**: check line number in error, usually a missing bracket after split/merge

### Phase 2 · Unit Tests (Node)

Three test files:

| File | Coverage | Count |
|------|----------|-------|
| `tests/unit/test_math.js` | haversine / smoothElev / accumulatorAscent/Descent / elevRatioColor / computeCumulativeDistance / computeTrailStats / generateNextTrailId | 30 |
| `tests/unit/test_enrich.js` | enrichWaypoints / trailContentHash | 12 |
| `tests/unit/verify_alignment.js` | `trail_core.js` matches HTML implementation | 13 |

**About verify_alignment**:
`tests/unit/trail_core.js` is a **mirror copy** of pure functions inside the HTML (for Node-side reuse and testing).
If you modify haversine / accumulatorAscent etc. inside the HTML, **you must sync `trail_core.js`**, otherwise the alignment test fails.

### Phase 3 · Static Verification

`scripts/test_skill.py` — 54 checks:
- Version consistency across 5 spots (HTML top comment, `<title>`, `APP_VERSION`, `version-tag`, filename)
- Key functions exist (`buildTrailList` / `applyChange` etc.)
- state fields present (`state.activeTrails` is Set, `state.primaryTrailId` exists)
- i18n completeness (zh/en key alignment)
- Library dependencies (inlined Leaflet / fflate)
- DOM snapshot (sidebar / map elements)

### Phase 4 · Functional Tests (headless Chrome)

`scripts/test_v1_18.py` — 55 checks:
- All 22 helper functions from v1.17.0 + v1.18.0 are `typeof === 'function'`
- Large functions confirmed slim: `handleFiles < 30 lines`, `drawElevBar < 40 lines` etc.
- End-to-end KML.zip: unzip → skip __MACOSX → add to DATA.trails

### Phase 5 · End-to-End Tests (14 scenarios)

`tests/e2e/run_all.py` — 39 assertions across 14 scenarios:

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

### Phase 6 · Sync Consistency

Runs `scripts/sync_release.sh`:
- Generalizes skill template → github-release universal version
- CHANGELOG extraction
- README badge update
- Re-runs static verification

## Failure Diagnostics

### Unit test failure

```bash
node tests/unit/test_math.js
node tests/unit/verify_alignment.js  # check if trail_core.js is out of sync
```

### E2E failure

```bash
uv run --with websocket-client python3 tests/e2e/run_all.py 2>&1 | tail -30
```

Locate the failing E-number and map it to source code.

### Static verification failure

```bash
python3 scripts/test_skill.py 2>&1 | grep "✗"
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

Add `test_XXX.js` under `tests/unit/`, use `require('./trail_core')`:

```javascript
const assert = require('assert');
const { yourFn } = require('./trail_core');

// ... assertions
```

Also add `yourFn` to `tests/unit/trail_core.js` and `verify_alignment.js`.

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
