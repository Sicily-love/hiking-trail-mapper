<div align="center">

<p><a href="README.md">中文</a> | <a href="README.en.md">English</a></p>

<h1>🗺️ Hiking Trail Mapper</h1>

**Single-file KML hiking map · import, measure, segment, export**

</div>

<!-- [中文](README.md) | [English](README.en.md) -->

Hiking Trail Mapper is a single-file KML trail viewer and organizer. Maps, overlays, waypoints, elevation charts, grouping, import/export, and local persistence all live in one HTML file. There is no build step and no server requirement; download it and open it in a browser.

## 🚀 Quick Start

Open directly:

```bash
open index.html
```

Or clone the repository:

```bash
git clone https://github.com/Sicily-love/hiking-trail-mapper.git
open hiking-trail-mapper/index.html
```

Import trails:

- Click `Add trail` in the top-right and select one or more `.kml` files.
- You can also select `.zip` / `.kml.zip`; KML files inside the archive are extracted automatically.
- Drag-and-drop files onto the browser window is supported.

## 🧭 What It Is For

| Scenario | Capability |
|----------|------------|
| Comparing routes | Overlay multiple trails, highlight the primary trail, and dim secondary trails |
| Planning daily stages | Color by day and use the segment tool to generate distance, ascent, and camp data |
| Inspecting a section | Pick A/B points on the primary trail and calculate on-trail distance, ascent, descent, and segment elevation |
| Managing waypoints | Auto-classify 13 waypoint tags such as camp, pass, water, supply, bridge, and river |
| Moving data between devices | Export the active group as a KML ZIP with individual KML files and a merged import file |
| Offline trail work | No runtime CDN dependency except map tiles; project data is stored in browser IndexedDB |

See [docs/FEATURES.en.md](docs/FEATURES.en.md) for full interaction details and [docs/ARCHITECTURE.en.md](docs/ARCHITECTURE.en.md) for design notes.

## ✨ Core Features

- **KML import**: Supports `LineString`, `gx:Track`, and `Point` placemarks; skips macOS archive metadata.
- **Groups and primary trail**: Trails can be grouped by route, plan, or date; each group remembers its own primary trail.
- **Map rendering**: Leaflet is inlined; Esri satellite imagery and shaded terrain layers are available.
- **Waypoints**: Auto-classification, chip filters, double-click rename, right-click or long-press add; waypoints snap to the nearest track point so the map and elevation chart stay aligned.
- **Elevation chart**: Custom Canvas rendering for full-trail and measured-section views; clicking the curve locates the point on the map.
- **Measure and segment tools**: Measure is for temporary section analysis; segment is for committing daily itinerary data.
- **Export**: Export the active group as KML ZIP; export the primary trail itinerary as Markdown.
- **Internationalization**: Chinese and English UI are bundled.

## 🔒 Data and Privacy

All trails, waypoints, and group state are stored in the current browser's IndexedDB. Nothing is uploaded. Clearing browser data, switching browsers, or moving to another device will make local data unavailable; use `Export -> KML ZIP` for transfer.

## 🔁 GPX / GeoJSON

This version only parses KML directly. Convert GPX first:

```bash
ogr2ogr -f KML output.kml input.gpx
```

GeoJSON should also be converted to KML before import.

## 🧪 Development and Tests

There is no frontend build pipeline. The main application is [hiking-trail-mapper.html](hiking-trail-mapper.html), and [index.html](index.html) is the GitHub Pages entry with the same content.

Common checks:

```bash
node tests/unit/test_math.js
node tests/unit/test_enrich.js
node tests/unit/verify_alignment.js
./tests/run_full_check.sh
```

`tests/unit/trail_core.js` mirrors pure calculation functions from the HTML for Node-based tests. When changing distance, ascent, elevation color, or waypoint snapping logic, keep the mirror in sync and run the alignment test.

## 🔖 Versioning

Version: v1.31.5

Single-file size about 544 KB.

The version number represents release cadence, not every small change as a large release:

- `PATCH`: bug fixes, documentation, test scripts, compatibility fixes, and small interaction improvements.
- `MINOR`: user-visible features, import/export capability, data-model fields, or major workflow changes.
- `MAJOR`: incompatible data migrations, export format changes, or other breaking adjustments that require user action.

When there is no breaking change or large feature, each user-visible fix, documentation polish, or small interaction improvement should normally ship as a `PATCH` release. Purely internal implementation details can still be grouped into one patch entry. Use `MINOR` or `MAJOR` only when the feature surface, data model, or compatibility boundary clearly changes.

## 📁 Repository Layout

```text
hiking-trail-mapper/
├── hiking-trail-mapper.html      Single-file application
├── index.html                    GitHub Pages entry
├── CHANGELOG.md                  Release history
├── docs/                         Feature, architecture, and testing docs
├── examples/sample-trails/        Sample KML files
├── references/tag-rules.md        Waypoint tag classification rules
├── scripts/                       Static checks, browser tests, sync scripts
├── tests/                         Unit and end-to-end tests
└── tools/                         Optional helper tools
```

## 🌐 Deployment

For GitHub Pages, select `Deploy from branch -> main / (root)`. Because this is a static single-file app, root-level `index.html` is the complete site.

## 📄 License

[MIT](LICENSE)
