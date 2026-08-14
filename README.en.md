<div align="center">

# Outdoor Route Studio

**An offline-first KML workbench for hiking routes**

[中文](README.md) · [Open online](https://sicily-love.github.io/hiking-trail-mapper/) · [Features](docs/FEATURES.en.md)

![version](https://img.shields.io/badge/version-v2.3.4-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)
![license](https://img.shields.io/badge/license-MIT-green)

</div>

Outdoor Route Studio is a map-first tool for reviewing, comparing, and planning hiking tracks. It overlays KML routes, plans daily itineraries, measures partial segments, manages waypoints and escape routes, and exports routes or complete project backups.

The project maintains one TypeScript source tree. Vite produces both the GitHub Pages site and a self-contained HTML file that opens directly offline.

## Use the app

### Online

Open [GitHub Pages](https://sicily-love.github.io/hiking-trail-mapper/). Android and desktop Chrome can install it as a PWA; the installed application shell starts without a network connection.

### Standalone HTML

Download and open [`hiking-trail-mapper.html`](hiking-trail-mapper.html). Application code, styles, and runtime libraries are embedded, so Node.js and a local server are not required.

### Import routes

Choose **Add trail**, or drop files onto the map:

- `.kml`: import one or many files.
- `.zip` / `.kml.zip`: extract contained KML files automatically.
- `.ors-project.json`: restore a complete project backup.

GPX and GeoJSON are not parsed directly yet; convert them to KML first.

## Main features

| Feature | What it does |
|---|---|
| Trail groups | Organize route alternatives, set a primary trail, and control overlays |
| Measure | Select and drag A/B points on the primary trail to inspect distance, gain, loss, and elevation |
| Itinerary | Drag segment boundaries and calculate daily distance, gain, loss, elevation range, and camp data |
| Waypoints | Add a type, name, description, and optional image near the primary trail |
| Escape routes | Select a partial route from the primary or another grouped trail and assign it to one or more Days |
| Trail stitching | Trim, reverse, order, and join route parts without inventing distance or elevation across gaps |
| Undo and redo | Revert durable edits to trails, segments, waypoints, escape routes, and stitched routes |
| Export | Save trail KML, group ZIP, itinerary Markdown, or a complete project backup |

See [Features](docs/FEATURES.en.md) for detailed workflows.

## Offline use and data

| Item | Offline behavior |
|---|---|
| Workbench and route tools | Available from the installed PWA or standalone HTML |
| Imported trails, itinerary, and settings | Stored in the current browser's IndexedDB |
| Satellite basemap | Requires a network; uncached areas are unavailable offline |
| Complete project transfer | Export an `.ors-project.json` from **Export → Complete project backup** |

The application does not upload routes to a project server. Export a complete project before clearing browser data, changing browsers, or moving devices. KML/ZIP is useful for exchanging routes with other map software, but it does not include the complete workspace state.

## Local development

Use Node.js 24 or another version compatible with the current GitHub Actions setup.

```bash
git clone https://github.com/Sicily-love/hiking-trail-mapper.git
cd hiking-trail-mapper
npm ci
npm run dev
```

Common commands:

```bash
npm run typecheck          # Strict TypeScript checks
npm run test:unit          # All Node unit suites
npm run build              # Build dist/ and the standalone HTML
npm run test:full          # Complete release verification
npm run test:visual:capture
```

`npm run test:full` covers the build, unit and static checks, real-Chrome behavior, a 216,000-point performance project, PWA offline reopen, end-to-end workflows, and responsive screenshot regression.

## Code structure

```text
src/
├── app/          Bootstrap, state, commands, interactions, and render scheduling
├── core/         DOM-free calculations, parsers, and data models
├── features/     Measure, segment, waypoint, itinerary, and escape owners
├── adapters/     Leaflet, IndexedDB, file, and browser boundaries
├── ui/           Workbench layout, sidebar, panels, and dialogs
├── styles/       Components, layout, and theme
└── vendor/       Browser libraries embedded at build time
```

The entry chain is `index.html → src/main.ts → bootstrap → studio runtime → typed feature/controller`. `src/app/runtime/studio.ts` only composes cross-feature dependencies. Writes use typed actions and reads use selectors. Production has no classic bridge, string-executed scripts, or duplicate HTML business implementation.

Further reading:

- [Architecture](docs/ARCHITECTURE.en.md)
- [Testing](docs/TESTING.en.md)
- [Contributing](docs/CONTRIBUTING.en.md)
- [Sample trails](examples/README.en.md)

## Release

- Current version: v2.3.4
- `PATCH`: fixes, compatibility, documentation, and small interaction refinements.
- `MINOR`: new user-visible capabilities or data formats.
- `MAJOR`: incompatible data or export-format changes.

`npm run version:bump` updates the version and bilingual CHANGELOG together. `.github/workflows/pages.yml` is the only Pages publisher, and the repository Pages Source is set to **GitHub Actions**.

## License

[MIT](LICENSE)
