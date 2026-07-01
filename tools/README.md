# Tools

配套工具脚本。可选，不影响 HTML 主功能。

## `generate_route_images.py`

从 KML 生成小红书 3:4 竖图（1080×1440 PNG），使用 AI 生成的地形背景 + Canvas 路线叠加 + 天数/里程/爬升数据角标。

### 依赖

```bash
pip install pillow numpy
# 或 uv 用户：
uv run --with pillow --with numpy generate_route_images.py ...
```

或直接：

```bash
pip install -r requirements.txt
```

### 用法

```bash
uv run --with pillow --with numpy python generate_route_images.py \
  --kml /path/to/trail.kml \
  --bg /path/to/terrain_bg.png \
  --out /path/to/output/ \
  --name "格聂牧场+V" \
  --total-km 61.5 \
  --total-asc 2468 \
  --max-elev 4845
```

### 输出

- `总览.png` —— 全线概览
- `D1.png` / `D2.png` / ... —— 每日路段

### AI 背景图从哪来？

推荐用支持 3:4 2K 分辨率的 AI 图工具生成一张地形鸟瞰图作为底：
- Midjourney：`aerial view topographic map [region] hiking trail, satellite style --ar 3:4`
- DALL-E 3：类似 prompt
- 国产工具：SDXL / 通义万相 / 即梦 等

也可以直接用 Google Earth 截图。

## 未来可能加的工具

- `kml_to_gpx.py`：GPX 转换
- `download_from_2bulu.py`：从两步路批量拉取（注意 WAF 限速）
- `merge_trails.py`：把多个 KML 合并成一个
- `analyze_stats.py`：批量统计 KML 数据

欢迎 PR。
