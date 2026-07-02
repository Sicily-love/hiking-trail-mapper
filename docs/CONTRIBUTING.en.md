# Contributing to hiking-trail-mapper

Thanks for wanting to contribute — this project maintains a **single-HTML-file** philosophy, so the workflow is a bit special. Reading this doc will save you half the time.

## Project Layout

```
github-release/hiking-trail-mapper/
├── hiking-trail-mapper.html     # ⭐ The one product file (~8000 lines)
├── docs/                        # Bilingual (zh + en) docs
│   ├── ARCHITECTURE.md
│   ├── FEATURES.md
│   ├── TESTING.md               # Testing guide (required reading)
│   └── CONTRIBUTING.md          # This doc
├── examples/
│   └── sample-trails/           # Sample KMLs
├── tests/
│   ├── run_full_check.sh        # One-command 6-phase test
│   ├── unit/                    # Node unit tests
│   │   ├── trail_core.js        # Pure function mirror
│   │   ├── test_math.js
│   │   ├── test_enrich.js
│   │   └── verify_alignment.js  # Mirror-vs-HTML alignment
│   └── e2e/
│       └── run_all.py           # 14 end-to-end scenarios
└── CHANGELOG.md
```

Skill side (used by agent to generate HTMLs):

```
user-skills/hiking-trail-mapper/
├── SKILL.md                     # agent trigger rules
├── assets/online_kml_template.html   # same source as hiking-trail-mapper.html
└── scripts/                     # Data scrape/process scripts (Python)
```

The two HTMLs are **one-way synced** (skill → release) via `scripts/sync_release.sh`.

## Getting Started

### 1. Clone + install deps

```bash
git clone git@github.com:Sicily-love/hiking-trail-mapper.git
cd hiking-trail-mapper

# Node (>= 18, tests only; the product is pure frontend HTML, no build)
node --version

# Python + uv (for functional/e2e tests)
uv --version
```

### 2. Run baseline

Before any change, confirm the baseline is green:

```bash
./tests/run_full_check.sh
```

**If baseline is red, do not touch code** — fix baseline first.

### 3. Make changes

Changes **must** happen in one of two places:

- `hiking-trail-mapper.html` (release side)
- `../../user-skills/hiking-trail-mapper/assets/online_kml_template.html` (skill side)

**If you edit both**: skill side wins — run `sync_release.sh` to overwrite release side.

### 4. Test again

```bash
./tests/run_full_check.sh
```

Fix until 6/6 green.

### 5. Commit + PR

```bash
git add .
git commit -m 'vX.Y.Z · brief description'
git push
```

## Code Style

### JSDoc Type Annotations (required since v1.19.0)

All new/modified **top-level functions** must have JSDoc:

```javascript
/**
 * Haversine great-circle distance
 * @param {number} lat1 Start latitude (degrees)
 * @param {number} lng1 Start longitude (degrees)
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance (meters)
 */
function haversine(lat1, lng1, lat2, lng2) {
  // ...
}
```

Data structure changes must update `@typedef`:

```javascript
/**
 * @typedef {Object} Trail
 * @property {string} id
 * @property {string} name
 * // ...
 */
```

Defined at top of file in the `Type Definitions (JSDoc)` block.

### Naming Conventions

- **Functions**: `camelCase`, verb-first (`handleFiles` / `renderTrailCard` / `drawElevBar`)
- **Pure compute/utility**: verb or noun (`haversine` / `smoothElev`)
- **Rendering helpers**: `draw*` / `render*` / `build*`
- **State mutations**: `toggle*` / `apply*` / `move*`
- **Constants**: `SCREAMING_SNAKE` (`APP_VERSION` / `PALETTE_LOCAL`)
- **Private fields**: underscore prefix (`trail._contentHash` / `drawElevBar._overflowRequest`)

### Function Length Red Line

**Any function over 100 lines triggers refactor alarm**. See existing splits:

- v1.17.0 `buildTrailList`: 372 → 25 lines
- v1.18.0 `handleFiles`: 166 → 17 lines
- v1.18.0 `parseAndProcessKml`: 174 → 36 lines
- v1.18.0 `drawElevBar`: 363 → 24 lines

Principles:
1. **Single responsibility**: one function, one thing
2. **Testability**: pure functions extracted to `trail_core.js` for unit tests
3. **Readability > brevity**: prefer well-named helpers over cleverness

### State Mutations Must Use applyChange

**Wrong**:

```javascript
state.activeTrails.add(id);
rebuildAll();
buildHeaderStats();
saveToStorage();
```

**Right**:

```javascript
toggleTrailActive(id);   // or directly mutate the field
applyChange();
```

`applyChange` uniformly handles the "rebuild UI → persist" pipeline. Call it after any state change.

## Big Change Workflow

If your change matches any of:

- Modifying 300+ line function
- Adding/removing state field
- Changing data structure
- Changing IO layer
- Version bump

You **must** follow the full workflow:

1. Add entry to `CHANGELOG.md` (at the top)
2. Update version in 5 places:
   - HTML top comment `APP_VERSION: vX.Y.Z`
   - `<title>Hiking Trail Mapper (online vX.Y.Z)</title>`
   - `const APP_VERSION = 'vX.Y.Z';`
   - `version-tag` link text
   - Filename `hiking-trail-mapper-vX.Y.Z.html`
3. Run `./tests/run_full_check.sh` (6/6 green)
4. If you edited functions in `trail_core.js` or their HTML counterparts, run `verify_alignment.js`
5. Push + PR, paste test results in PR description

## Adjusting Test Expectations

**Only when you intentionally change behavior** should you touch tests. Test-changing commits must:

1. Commit message states "intentionally changed behavior"
2. CHANGELOG describes the new behavior
3. Updated assertions clearly correspond to implementation

When tempted to "just make the test pass", first ask: **is this a bug or a new behavior**?

## Questions / Bugs

- Bug reports: paste full `run_full_check.sh` output + reproduction steps
- Feature requests: describe use case first, then implementation suggestions

## License

MIT License. Contributions imply agreement to MIT licensing.
