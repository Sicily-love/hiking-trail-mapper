# Contributing to Outdoor Route Studio

**[中文](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md)**

Thanks for contributing. The core constraint is simple: daily development maintains modular `src/`, while releases remain directly openable single HTML files.

## Before You Start

```bash
git clone git@github.com:Sicily-love/hiking-trail-mapper.git
cd hiking-trail-mapper
npm ci
./tests/run_full_check.sh
```

Requirements:

- Node.js 18 or newer;
- npm with the lockfile;
- Python 3; browser/E2E runs need `websocket-client` or `uv`;
- an environment that can launch Chrome for full functional and visual regression.

Record baseline failures before editing. Do not mix existing failures into a new patch.

## Know the File Roles

```text
index.html                    Small Vite entry shell
src/                          Only source of truth for application implementation
hiking-trail-mapper.html      Generated offline release
dist/                         Generated Pages artifact
```

Rules:

1. Change business behavior, DOM, CSS, and browser behavior only under `src/`.
2. Do not hand-edit `hiking-trail-mapper.html` or `dist/`.
3. Change `index.html` only when entry metadata or the module entry changes; do not move implementation back into the shell.
4. Build scripts reproduce the release from `index.html + src/`.
5. When generated files drift, fix source or build logic and regenerate.

## Choosing a Source Location

| Change | Preferred location |
|--------|--------------------|
| Pure calculations, KML, storage snapshots, render models | `src/core` |
| Global app state, commands, interaction and render coordination | `src/app` |
| Controller/state for one feature | `src/features` |
| Leaflet / IndexedDB effects | `src/adapters` |
| DOM shell, Workbench, responsive layout, dialogs | `src/ui` |
| Global or vendor styles | `src/styles` |
| Split classic browser orchestration | The matching `src/features/*/runtime.ts` or `src/ui/orchestration/runtime.ts` owner |
| Unsplit compatibility orchestration | `src/app/runtime.ts`, with a migration boundary |

Prefer existing owners. Do not create a parallel architecture for a local change.

## Boot Code

`src/app/bootstrap.ts` owns boot order:

```text
index.html -> src/main.ts -> bootstrapOutdoorRouteStudio()
           -> Workbench DOM -> vendors -> typed modules -> runtime.ts bridge
```

When adding boot behavior:

- Keep `src/main.ts` thin: import styles and invoke bootstrap.
- Order work explicitly in bootstrap and expose an awaitable ready state.
- Do not make typed modules depend on implicit globals accidentally created by runtime.
- Do not add inline business scripts to `index.html`.

## Migrating runtime.ts

`src/app/runtime.ts` is approximately 340 lines of boot/command compatibility glue, protected by a 400-line guardrail. All browser orchestration now has one of 13 owners and must not be copied back into the template. Production fixes belong in the matching owner; new features should normally start in a typed controller.

Recommended migration steps:

1. Add a unit, browser, or E2E regression for current behavior.
2. Extract DOM-free calculations and feature state.
3. Connect the appropriate manager/controller/adapter.
4. Change the existing owner or add a typed entrypoint. Add a named fragment only when classic ordering is still required, retaining exactly one slot at the original position.
5. Delete the matching implementation from `runtime.ts` in the same commit and verify that composition produces one definition.
6. Build the single HTML and run real-browser tests.

Do not copy a new implementation while leaving the old one in place, and do not add a second slot. A file rename alone also does not mean typed migration is complete. `test_runtime_composition.js` must remain green.

## Choosing a Manager

### InteractionManager

Use for mutually exclusive, cancellable, phased map interactions such as measure, segment, waypoint, escape, and Day preview.

- Every activation has an explicit kind, phase, and owner.
- Bind timers, RAF callbacks, and listeners to the session lifecycle.
- Check that session/owner is still current before async results write state.

### RenderScheduler

Use to coalesce track, marker, sidebar, day, legend, chart, and fit work.

- Emit the smallest dirty mask.
- Do not manually chain repeated redraws for one state change.
- Use the scheduler's last-request semantics for fit instead of another racing timer.

### CommandRegistry

Use for every user-triggerable command.

- One behavior gets one stable command ID.
- Compute enabled/checked from context.
- Desktop side rail, mobile bottom bar, menus, and keyboard entrypoints share dispatch.

### DialogController

Use for info, confirm, prompt, and custom modals.

- Put user content through `textContent`.
- Mark destructive actions with explicit danger state.
- Keep Escape, cancel, default-button, and focus-restoration behavior consistent.

## Workbench Changes

The responsive Workbench contract is seven desktop side-rail actions and five mobile bottom-bar actions. When changing commands or layout:

1. Update command definition and state before placement.
2. Do not clone business listeners for desktop and mobile.
3. Put lower-frequency actions in More/menu/bottom sheets instead of squeezing core controls.
4. Check wide desktop, narrow desktop, 390px, and 320px.
5. Verify the route sidebar, elevation dock, tool panels, dialogs, and map controls do not overlap.
6. Test the longest Chinese and English labels.

Layout changes require `test_ui_contract.js` or `tests/visual` coverage.

## TypeScript and Style

- Use existing TypeScript types and barrels. Do not bypass boundaries with `any`, except inside the compatibility runtime.
- Keep new pure logic DOM-free with explicit inputs and outputs.
- Use `camelCase` for functions/variables, `PascalCase` for types/classes, and `SCREAMING_SNAKE_CASE` for constants.
- Controller names identify ownership; render data uses `*Model`; factories use `create*`.
- Comments explain non-obvious constraints, lifecycle, or compatibility reasons.
- Split long functions by responsibility without creating meaningless wrappers for line-count targets.

`runtime.ts` temporarily uses `@ts-nocheck`; that does not permit new modules to skip type checking.

## State and Effects

- Every state value has one owner.
- Convert Sets to arrays for persistence and restore them as Sets.
- DOM nodes, Leaflet layers, AbortControllers, and timer handles do not enter snapshots.
- Legacy paths may still use `applyChange()`; new paths prefer precise render dirty masks.
- After interaction cancellation, stale async work must not update state, DOM, or the map.

## Test Requirements

Choose the smallest risk-matched checks, then finish with the full check:

```bash
npm run test:unit
npm run typecheck
./tests/run_full_check.sh
npm run test:visual:capture
```

Common mapping:

| Change | Minimum addition |
|--------|------------------|
| Pure `src/core` logic | Matching Node unit |
| Manager/controller | Manager unit plus necessary browser regression |
| Bootstrap / entry / build | `test_vite_entry.js` + `test_release_pipeline.js` |
| Workbench layout | UI contract + desktop/mobile visual captures |
| Import, storage, export | Unit + E2E |
| Runtime migration | Old-behavior regression + real Chrome on the single file |

See [TESTING.en.md](TESTING.en.md) for details.

## Build and Generated Artifacts

```bash
npm run build
npm run release:prepare
```

`npm run build` should produce:

- `dist/index.html`: self-contained Pages entry;
- `dist/hiking-trail-mapper.html`: identical compatibility alias;
- `dist/release.json`: version, date, hash, and byte count;
- root `hiking-trail-mapper.html`: offline release refreshed or checked by scripts.

Final HTML must not reference external JavaScript or CSS assets. Do not describe the compatibility alias as a second source.

## Versions and Releases

Ordinary feature branches should not bump versions opportunistically. The release owner uses:

```bash
npm run version:bump -- patch --zh "中文更新项" --en "English change"
npm run release:prepare
```

The version tool synchronizes package data, runtime metadata, CHANGELOG, and README. Do not edit scattered version stamps manually or reserve a version in an unrelated patch.

## Documentation

- `README.md` / `README.en.md`, `ARCHITECTURE*`, `TESTING*`, and `CONTRIBUTING*` must state the same facts.
- Chinese and English may read naturally, but heading structure, commands, file roles, and status conclusions must match.
- Distinguish “API established,” “legacy paths adopted it,” and “compatibility layer removed.”
- Do not present planned runtime splitting as completed.

## Pre-Commit Check

- Changes live under the correct owner; generated HTML was not edited.
- New commands share one dispatch across seven-side/five-bottom placement.
- Manager lifecycle and cancellation paths have tests.
- Chinese/English docs and UI strings agree.
- `npm run typecheck` and relevant units pass.
- Full checks and required visual regression ran; unrun checks are stated explicitly.
- The PR describes user-visible behavior, compatibility impact, and verification.

## Questions and License

For bugs, include reproduction steps, browser/OS, input-file characteristics, and relevant test output. For features, describe the outdoor-route workflow before proposing implementation.

Contributions are released under the [MIT License](../LICENSE).
