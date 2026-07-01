# Features · 功能详解

**🌐 [中文](FEATURES.md) · [English](FEATURES.en.md)**

Detailed feature list, interactions, shortcuts, and design considerations.

## Table of contents

- [Import KML](#import-kml)
- [Multi-trail overlay & primary trail](#multi-trail-overlay--primary-trail)
- [Three coloring modes](#three-coloring-modes)
- [Waypoint system](#waypoint-system)
- [Elevation chart](#elevation-chart)
- [Trail grouping (v1.14.0+)](#trail-grouping-v1140)
- [Batch group (v1.14.1)](#batch-group-v1141)
- [Export](#export)
- [Persistence](#persistence)
- [i18n](#i18n)
- [Shortcuts & gestures](#shortcuts--gestures)

---

## Import KML

- **Entry**: top-right `➕ Add Trail` button, or drag files into browser window
- **Multi-select**: pick many KMLs at once
- **Parsing**:
  - Merges `<gx:Track>` and `<LineString>` segments in a single KML (sorted by numeric prefix in `<name>`)
  - `<Point>` placemarks are treated as waypoints
  - `(lon, lat, alt)` → Leaflet `(lat, lon)` order swap is automatic
- **Compute**: distance, ascent, descent, min/max elevation, day-split — all on import

## Multi-trail overlay & primary trail

- All trails overlay on the same map by default
- **Primary trail**: bold, fully opaque, all waypoints shown
- **Other trails**: `opacity: 0.45`, `weight: 2.5`, tracks only (waypoints hidden to prevent clutter)
- Click `⭐ Set as primary` on any trail card to switch
- First trail in `DATA.trails` is primary by default

## Three coloring modes

Top toolbar → Mode dropdown:

### Day mode
- Splits by GPS timestamps at Beijing 00:00 boundary
- Each day gets a color from a 10-color palette (cycling)
- Sidebar legend shows per-day distance / ascent / duration

### Elevation mode
- Gradient by altitude: green (low) → red (high)
- 5-band mapping (low / low-mid / mid / mid-high / high)
- Best for perceiving elevation changes across the route

### Waypoint comparison mode
- Only primary trail track shown (faded)
- Waypoints from ALL trails displayed by tag
- Useful for comparing how different users tagged the same location ("A says camp, B says water source")

## Waypoint system

### 13 tag classes (auto-detected)

| Tag | Keywords |
|-----|----------|
| `camp` | 营地, 宿营, tent, camp |
| `pass` | 垭口, pass |
| `water` | 水源, water, lake, river |
| `bridge` | 桥, bridge |
| `river` | 河, river (distinct from water) |
| `supply` | 补给, supply, food |
| `start` | 起点, start, entry |
| `end` | 终点, end, exit |
| `pasture` | 牧场, pasture |
| `snow` | 雪, glacier |
| `pit` | 坑, pit |
| `viewpoint` | 观景, viewpoint |
| `other` | catch-all |

Classification rules: [references/tag-rules.md](../references/tag-rules.md)

### Default visible tags

`camp`, `pass`, `water`, `bridge`, `river`, `supply`, `start`, `end` — the 8 most useful for hiking planning.

### Interactions
- **Filter**: click chips in sidebar to toggle tags
- **Rename**: double-click a waypoint to open edit dialog
- **Add manually**:
  - Desktop: right-click on map → menu → pick tag / enter name
  - Mobile: long-press for 600ms → menu
- **Snap-to-track**: manually added waypoints project to nearest GPS point on the primary track (visually glued to line, not floating)

## Elevation chart

Bottom fixed elevation profile (Canvas 2D).

### Displayed content
- X axis: distance (km)
- Y axis: elevation (m)
- Curve: primary trail elevation profile
- Annotations: camps (🏕), max point, min point, with leader lines to curve points
- Day split: vertical dashed lines

### Key design
- **Adaptive height**: scan-line algorithm predicts max horizontal label overlap (stackDepth), formula `H = max(140, min(340, 110 + (stackDepth+1) × (lh+2) + 16))`
- **Click-to-locate**: click any point on chart → map highlights corresponding GPS point + floating info tip shows elevation/distance
- **km-based mapping**: both draw and hit-test use km (not idx) for X-axis, ensuring precise click alignment

## Trail grouping (v1.14.0+)

- **Field**: `trail.group` (default `"默认"`)
- **Entry**: Tab bar at top of sidebar (only shows when > 1 group exists)
- **Rule**: switching group filters ALL rendering / stats / legends to that group
- **Move**: expand trail card → dropdown → choose target group or `+ New group…`
- **New imports**: join current active group by default

## Batch group (v1.14.1)

Click `☐ Batch group` at top of sidebar to enter batch mode:

- **Enter**: shows `Selected 0/N` counter + [Select All] · [Invert] · [Move to ▼] · [Exit]
- **Select**: click anywhere on a card to toggle selection; selected cards show orange solid outline
- **Select all / Invert**: one-click
- **Move to**: dropdown of existing groups or `+ New group…`
- **Execute**: moves all selected trails at once, Toast confirms count
- **Primary trail handling**: if primary is among the moved, auto-picks first remaining trail in current group as new primary

## Export

`📤 Export` button opens a floating menu below itself (v1.14.1+):

### 📦 Pack KML ZIP

- Contents: all "active overlay" trails in current group
- Structure:
  ```
  <group>_trails_2026-07-01.zip
  ├── 轨迹/
  │   ├── User_A_trail.kml
  │   ├── User_B_trail.kml
  │   └── ...
  ├── _<group>_merged_import.kml   ← One-click import (with <Folder>)
  └── README.txt
  ```
- Use case: cross-device transfer, sending to teammates
- Fallback: if fflate fails, downloads each KML individually

### 📄 Itinerary Markdown

- Daily plan table: `Day / Segment / Distance / Ascent / Max Elev / Camp (elev) / Escape route`
- Waypoint list (with `[manual]` marker where applicable)
- Paste-friendly for Notion / VS Code / etc.

## Persistence

- **Storage**: IndexedDB, key = `main`
- **Write strategy**: 300ms debounce (avoids flushing on every UI change)
- **Restore**: `_boot` loads on startup
- **Persisted fields**: `trails` (with tracks + waypoints), `activeTrails`, `primaryTrailId`, `activeGroup`
- **Clear**: browser clear cache, or sidebar bottom `🗑 Clear data` button

## i18n

- Chinese / English, toggle via top-right `🌐 中/EN`
- Managed via `data-i18n` attribute + `t()` function
- Language switch triggers refresh of all dynamic content (elevation chart, primary card, mode title, etc.)

## Shortcuts & gestures

| Action | How |
|--------|-----|
| Map zoom | wheel · double-click · pinch |
| Browser page zoom | Cmd/Ctrl + / − / 0 (not swallowed by map) |
| Add waypoint | desktop right-click / mobile long-press 600ms |
| Rename | double-click waypoint or trail card title |
| Reverse trail | expand card → `↔ Reverse` button |
| Expand/collapse all | shortcut button at top of sidebar |

---

Want to understand design decisions? See [ARCHITECTURE.en.md](ARCHITECTURE.en.md).
