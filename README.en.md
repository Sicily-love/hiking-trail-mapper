# 🏔 Hiking Trail Mapper

> **Single file · Frontend only · Works offline** — turn your KML tracks into an interactive story map.

<div align="center">

**🌐 [中文](README.md) · [English](README.en.md)**

![version](https://img.shields.io/badge/version-v1.14.1-blue)
![size](https://img.shields.io/badge/size-~475KB-brightgreen)
![deps](https://img.shields.io/badge/dependencies-0%20external-brightgreen)
![license](https://img.shields.io/badge/license-MIT-orange)
![i18n](https://img.shields.io/badge/i18n-中/English-lightgrey)

**[📥 Download](hiking-trail-mapper.html) · [📸 Screenshots](docs/screenshots/) · [📖 Features](docs/FEATURES.en.md) · [📝 Changelog](CHANGELOG.md)**

</div>

---

## What is this

A **single-file HTML** app (~475KB with Leaflet + fflate all inlined). Drop in your KML files and get an interactive hiking map. **Open and go — no server, no build, no npm, no internet required** (after first tile load).

Just double-click the HTML file. Works on desktop, works on mobile Safari, works on your grandma's laptop.

## Features at a glance

| Category | What it does |
|----------|-------------|
| **Import** | Multi-select KML files at once; auto-merges `gx:Track` + `LineString`; detects `Point` placemarks as waypoints |
| **Map** | Esri satellite / terrain base maps; overlay multiple trails (primary bold, others faded) |
| **Coloring modes** | By day / by elevation gradient / by waypoint comparison |
| **Waypoints** | 13-tag auto-classification; chip filter; double-click rename; right-click / long-press to add; `snap-to-track` alignment |
| **Elevation chart** | Camp/peak/valley annotations with leader lines; click-to-locate on map; scan-line height algorithm |
| **Groups (v1.14.0+)** | Multi-group management with tabs; **Batch group (v1.14.1)**: select many trails and move in one action |
| **Persistence** | IndexedDB with 300ms debounce; survives refresh, restores on reopen |
| **Export** | KML ZIP bundle · Itinerary Markdown · Click-based menu (v1.14.1) |
| **i18n** | Chinese / English switch |
| **Compatibility** | Chrome / Safari / iOS Safari / Android Chrome; `file://` protocol works out of the box |

## Quick start

### Option 1: Direct use (recommended)

1. [Download `hiking-trail-mapper.html`](hiking-trail-mapper.html) or clone this repo and open `index.html`
2. Double-click to open in browser
3. Click `➕ Add Trail` in the top-right, select one or more KML files
4. That's it. Play.

### Option 2: Converting from GPX / GeoJSON

Use [gpx2kml.com](https://gpx2kml.com) online, or GDAL locally:

```bash
ogr2ogr -f KML output.kml input.gpx
```

### Option 3: Offline on mobile

1. AirDrop / email / cloud-drive the HTML + your KMLs to your phone
2. iOS: Files → open with Safari; Android: any browser
3. First tile load needs internet; afterwards you can browse loaded areas offline

## Interface preview

```
┌─────────────────────────────────────────────────────┐
│  Hiking Trail Mapper       [Sat ▼] [Mode ▼] [🌐 中]  │
├──────────────┬──────────────────────────────────────┤
│  Group tabs  │                                      │
│  [Default]   │           Leaflet Map                │
│               │                                      │
│  ⭐ Primary   │       (multi-trail overlay)          │
│  ─────────    │                                      │
│  ☐ Batch     │                                      │
│               │                                      │
│  ▢ Trail A   │                                      │
│  ▢ Trail B   │                                      │
│  ▢ Trail C   │                                      │
│               ├──────────────────────────────────────┤
│  📤 Export    │  Elev chart (click to locate)        │
└──────────────┴──────────────────────────────────────┘
```

## Try it now

`examples/sample-trails/` contains a set of KML files from three different users hiking the same 4-day "Genie Pasture+V" trail in Sichuan (China). Drop them all in at once to see multi-trail overlay, group management, batch move, and export features in action.

## Repo layout

```
hiking-trail-mapper/
├── 🌐 hiking-trail-mapper.html    ← Main entry (=index.html)
├── 🌐 index.html                   ← Copy for GitHub Pages
├── 📄 README.md                    ← Chinese README
├── 📄 README.en.md                 ← This file
├── 📄 LICENSE                      ← MIT
├── 📄 CHANGELOG.md                 ← 31 releases (zh + en)
├── docs/
│   ├── FEATURES.md / FEATURES.en.md      ← Detailed feature docs
│   ├── ARCHITECTURE.md / ARCHITECTURE.en.md ← Tech decisions
│   └── screenshots/                       ← (PRs welcome)
├── examples/
│   ├── README.md / README.en.md
│   └── sample-trails/               ← Example KMLs
├── tools/
│   ├── generate_route_images.py     ← PIL 1080x1440 export
│   ├── requirements.txt
│   └── README.md / README.en.md
└── references/
    └── tag-rules.md                 ← 13 tag classification rules
```

## Deploy to GitHub Pages

1. Push this repo to GitHub
2. Settings → Pages → Source: `Deploy from branch` → `main` / `/ (root)`
3. Save. Access at `https://Sicily-love.github.io/hiking-trail-mapper/` after a few seconds.

Because it's a single-file app, `index.html` is the entire deploy.

## Tech stack

- **Leaflet 1.9.4** — Map engine (inlined)
- **leaflet-polylineDecorator** — Direction arrows on tracks (inlined)
- **fflate 0.8.2** — ZIP packing (inlined, NOT CDN — for `file://` compatibility)
- **IndexedDB** — Client-side persistence
- **Canvas 2D** — Custom elevation chart rendering

**Zero third-party CDN dependencies**. Fully self-contained except for map tiles.

## FAQ

**Q: My KML has no elevation. What happens?**
The elevation chart degrades to a flat line. Use a GPS device with barometric altimeter (Garmin, 2bulu, sixfoot, etc.) for real elevation.

**Q: Why is my ascent number different from other apps?**
This tool uses a "threshold accumulator" algorithm (thr=10m) that filters GPS noise. Measured error: <2% vs official 2bulu data. Naive sum-of-positives gives 30-50% inflated values; different apps use different thresholds, expect 5-50% variance.

**Q: Can I change the base map?**
Default: Esri World Imagery (satellite) + World_Shaded_Relief (terrain). Search `L.tileLayer` in source to swap to OSM / Mapbox / Google / etc.

**Q: Where is my data stored?**
Everything is in your browser's IndexedDB. **Nothing is uploaded to any server.** Clear cache or change device and it's gone. For cross-device sync use `📤 Export → KML ZIP`.

**Q: Mobile Safari freezes on open?**
v1.14.0 had a modal + CDN loading issue that froze Safari `file://`. **v1.14.1 fixes it** (fflate fully inlined, no modals, floating menu instead). Always use v1.14.1+.

## Contributing

Issues and PRs welcome. Especially useful:
- More test data (KML samples from different regions)
- Screenshots (`docs/screenshots/`)
- Base map adapters (e.g. Mapbox with API key support)
- Direct GPX import (currently requires conversion)
- Offline tile caching (leaflet-offline)
- More i18n (JP / KR / FR / ES / ...)

## License

[MIT](LICENSE) — fork it, modify it, ship it. If you build something cool on top, please tell me.

## Credits

- Design inspiration: Gaia GPS, Fatmap, sixfoot, 2bulu
- Origin: solving "can you send me your trail" pain point among hiking buddies
- Special thanks: the Leaflet team for years of maintenance, and fflate's author for the minimalist philosophy

---

<div align="center">

**Made with ❤️ for people who walk in the mountains.**

If this helped your trip, [drop a star](https://github.com/Sicily-love/hiking-trail-mapper) — it's the only way I know you found it useful.

</div>
