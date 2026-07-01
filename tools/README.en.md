# Tools · English

**🌐 [中文](README.md) · [English](README.en.md)**

Supporting scripts. Optional — does not affect the HTML app itself.

## `generate_route_images.py`

Generate 3:4 vertical images (1080×1440 PNG, sized for Xiaohongshu / Instagram Story) from a KML: AI-generated terrain background + Canvas track overlay + day / distance / ascent data corners.

### Dependencies

```bash
pip install pillow numpy
# or with uv:
uv run --with pillow --with numpy generate_route_images.py ...
```

Or:

```bash
pip install -r requirements.txt
```

### Usage

```bash
uv run --with pillow --with numpy python generate_route_images.py \
  --kml /path/to/trail.kml \
  --bg /path/to/terrain_bg.png \
  --out /path/to/output/ \
  --name "Genie Pasture+V" \
  --total-km 61.5 \
  --total-asc 2468 \
  --max-elev 4845
```

### Output

- `总览.png` — full route overview
- `D1.png` / `D2.png` / ... — per-day segments

### Where do AI backgrounds come from?

Use any 3:4 2K AI image tool for a terrain aerial view background:
- Midjourney: `aerial view topographic map [region] hiking trail, satellite style --ar 3:4`
- DALL-E 3: similar prompt
- Chinese alternatives: SDXL / Tongyi Wanxiang / Jimeng

You can also just screenshot Google Earth.

## Future tools

- `kml_to_gpx.py` — GPX conversion
- `download_from_2bulu.py` — batch download from 2bulu (respect WAF rate limits)
- `merge_trails.py` — merge multiple KMLs into one
- `analyze_stats.py` — batch KML data analysis

PRs welcome.
