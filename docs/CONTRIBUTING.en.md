# Contributing

**[中文](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md)**

Thank you for improving Outdoor Route Studio. Changes should preserve the single source, unified interactions, and reproducible release.

## Getting Started

```bash
npm install
npm run test:unit
npm run typecheck
npm run build
```

Use `npm run dev` for local development. Do not edit `hiking-trail-mapper.html` or `dist/` directly; they are generated from `src/` and the root shell.

## Where Code Belongs

| Change | Owner |
|--------|-------|
| Pure distance, elevation, KML, segment, or statistics logic | `src/core/` |
| App state, commands, interaction, and render scheduling | `src/app/` |
| A single business workflow | A controller under `src/features/<feature>/` |
| Leaflet, IndexedDB, file, and browser effects | `src/adapters/` |
| Workbench, dialogs, components, and copy | `src/ui/`, `src/features/localization/` |
| Layout, components, and theme | `src/styles/` |
| DOM/Leaflet orchestration for one vertical feature | `src/features/<feature>/runtime-owner.ts` |
| Cross-feature dependency assembly only | `src/app/runtime/studio.ts` |

The startup chain is fixed:

```text
index.html -> src/main.ts -> bootstrap.ts
           -> Workbench DOM + vendor module imports
           -> startStudioRuntime({ document, commands, dialogs })
```

Do not restore raw imports, `executeClassicScript()`, a runtime composer, dual execution paths, or `window.HikingTrailCore/HikingTrailApp`. A vertical feature owner must declare explicit dependencies and replace its old implementation in the same change.

## Direct Runtime Boundary

`src/app/runtime/studio.ts` is limited to cross-feature dependency assembly and shared browser orchestration that has not yet migrated. Every TypeScript source, including the runtime, must pass strict checking; dynamic Leaflet plugin fields may remain only at an explicit browser-adapter type boundary.

When extracting behavior:

1. Add or preserve a regression test for existing behavior.
2. Define typed inputs, outputs, and ownership in a core/controller/adapter module.
3. Leave only dependency assembly and effect commits in the direct runtime.
4. Delete the replaced implementation in the same change; retain no dual path or mirrored state.
5. Run units, real Chrome, E2E, and required visual regression.

The test inspector may only be created through `?studio-test=1` and must remain frozen and deeply read-only. Fixture writes must use the dedicated `testDriver` and typed actions. Product code must not depend on either test surface.

## State, Commands, and Interaction

- Persistent writes enter `AppStateStore` through typed `AppStateCommand` values.
- DOM nodes, Leaflet layers, AbortControllers, timers, and RAF handles do not enter snapshots.
- The top menu, desktop rail, mobile bar, and keyboard shortcuts dispatch the same `CommandRegistry` IDs.
- Measure, segment, waypoint, escape, and Day preview use `InteractionManager` sessions; stale asynchronous work must not update state or UI after cancellation.
- Map, marker, elevation, and fit updates use `RenderScheduler`; only the newest reset epoch may commit.
- Native `prompt` / `confirm` must not return; use the shared `DialogController`.

## UI and Styling

- Preserve the Workbench hierarchy of top menu, activity rail, map, sidebar, and bottom analysis dock.
- Use existing Lucide icons and design tokens; do not substitute emoji icons.
- Desktop and mobile entries share command semantics and do not duplicate listeners.
- Check the longest Chinese and English labels and ensure map controls, sidebar, floating panels, and elevation dock do not overlap.
- Layout changes require UI-contract or `tests/visual` screenshot coverage.

## TypeScript and Naming

- Every module must pass strict type checking; do not add `@ts-nocheck`.
- Keep pure logic DOM-free with explicit inputs and outputs.
- Use `kebab-case` for TypeScript, CSS, and asset files; use `snake_case` for Python, shell, and Node test files.
- Name tests and samples after behavior or purpose, never a release number. Keep ecosystem-standard names such as `README.md`, `LICENSE`, and `package-lock.json` unchanged.
- Use `camelCase` for values/functions, `PascalCase` for types/classes, and `SCREAMING_SNAKE_CASE` for constants.
- Controllers indicate ownership, render data uses `*Model`, and factories use `create*`.
- Comments explain non-obvious constraints, lifecycle, or compatibility reasons only.

## Test Requirements

Run the smallest risk-matched checks first, then the full release chain:

```bash
npm run test:unit
npm run typecheck
./tests/run_full_test_suite.sh
npm run test:visual:capture
```

| Change | Minimum added coverage |
|--------|------------------------|
| Pure `src/core` logic | Matching Node unit |
| Manager/controller | Unit plus necessary browser regression |
| Bootstrap / build | `test_vite_entry.js` + `test_release_pipeline.js` |
| Workbench layout | UI contract + desktop/mobile captures |
| Import, storage, export | Unit + E2E |
| Runtime-boundary migration | Existing-behavior regression + real Chrome on generated single HTML |

## Build and Versioning

```bash
npm run build
npm run version:bump -- patch --zh "中文更新项" --en "English change"
npm run release:prepare
```

`src/app/version.ts` is the version source. The version tool synchronizes package/lock data, localization changelog, READMEs, generated HTML, and `release.json`. Ordinary fixes use PATCH, compatible features use MINOR, and only explicit breaking changes use MAJOR.

Before committing, verify generated artifacts are reproducible, Chinese and English documentation agree, relevant tests pass, and any unrun check is stated.

Contributions are released under the [MIT License](../LICENSE).
