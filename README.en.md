# Hiking Trail Mapper

[中文](README.md) | [English](README.en.md)

A single-file HTML application for viewing and managing KML hiking trails. All dependencies (Leaflet, polylineDecorator, fflate) are inlined. No build step, no server, works over the `file://` protocol.

- Version: v1.31.0
- Size: ~475 KB
- License: [MIT](LICENSE)

## Features

- **Import**: Multi-select KML files; KML archives (`.zip` / `.kml.zip`) are accepted and unpacked automatically; merges `gx:Track` and `LineString`; treats `Point` placemarks as waypoints.
- **Overlay**: Multiple trails on the same map, primary trail rendered prominently.
- **Base maps**: Esri World Imagery (satellite) and Esri World Shaded Relief (terrain).
- **Coloring modes**: By day, by elevation gradient, by waypoint comparison.
- **Waypoints**: 13 auto-classified tags; sidebar chip filters; double-click to rename; right-click (desktop) or long-press (mobile, 600 ms) to add; projected to nearest track point to avoid visual drift.
- **Elevation chart**: Custom Canvas rendering; annotates camps and peaks with leader lines; click on the curve to locate the corresponding point on the map.
- **Groups**: Trails belong to a group; tab bar switches the active group; ticking any trail reveals a batch-move toolbar.
- **Persistence**: IndexedDB with 300 ms debounce; state is restored automatically on reload.
- **Export**: KML ZIP bundle (with a merged file); itinerary Markdown.
- **i18n**: Chinese / English toggle.

Full feature list and interaction details in [docs/FEATURES.en.md](docs/FEATURES.en.md).

## Getting started

No installation required. Download [`hiking-trail-mapper.html`](hiking-trail-mapper.html) or clone this repository and open `index.html`:

```
git clone https://github.com/Sicily-love/hiking-trail-mapper.git
open hiking-trail-mapper/index.html
```

Import trails:

- Click `Add trail` in the top-right and pick KML files or a KML archive; or
- Drag files directly onto the browser window.

## Converting GPX / GeoJSON

Only KML is parsed. Convert GPX with GDAL:

```
ogr2ogr -f KML output.kml input.gpx
```

Or use an online converter such as gpx2kml.com.

## Repository layout

```
hiking-trail-mapper/
├── hiking-trail-mapper.html      Application (= index.html)
├── index.html                    GitHub Pages entry
├── CHANGELOG.md                  Version history
├── LICENSE
├── docs/
│   ├── FEATURES.md / .en.md      Features and interactions
│   ├── ARCHITECTURE.md / .en.md  Architecture and design notes
│   └── screenshots/
├── examples/
│   └── sample-trails/            Sample KML files
├── tools/
│   └── generate_route_images.py  Optional itinerary image generator
└── references/
    └── tag-rules.md              Waypoint tag rules
```

## GitHub Pages

Settings → Pages → Source: `Deploy from branch → main / (root)`. The application is a single HTML file, so `index.html` is the entire site.

## Data

All data lives in the browser's IndexedDB. Nothing is uploaded. Data is lost when the browser cache is cleared or on a different device; use `Export → KML ZIP` for cross-device transfer.

## Tech stack

| Component | Version | Purpose |
|-----------|---------|---------|
| Leaflet | 1.9.4 | Map engine |
| leaflet-polylineDecorator | — | Directional arrows |
| fflate | 0.8.2 | ZIP encode/decode |
| IndexedDB | native | Persistence |
| Canvas 2D | native | Elevation chart |

No CDN dependencies at runtime, apart from map tiles.

## Browser compatibility

Tested on Chrome, Safari, iOS Safari, and Android Chrome. Opens directly from `file://`; previously loaded tiles remain viewable offline.

## Contributing

Issues and pull requests are welcome, particularly:

- KML samples from other regions;
- Screenshots (`docs/screenshots/`);
- Additional base map adapters (Mapbox, Tianditu, AMap, etc.);
- Direct GPX / GeoJSON parsing;
- Offline tile caching (`leaflet-offline`);
- Additional i18n translations.

See [docs/ARCHITECTURE.en.md](docs/ARCHITECTURE.en.md) before changing code.

## License

[MIT](LICENSE)
