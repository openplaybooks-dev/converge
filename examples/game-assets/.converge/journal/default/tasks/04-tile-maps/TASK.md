---
title: Tile Map Generation
description: Generate per-tile sprites for each tilemap, then composite them into a tilesheet PNG + atlas
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies:
  - "02-asset-breakdown"
tags:
  - tile-maps
  - terrain
  - generation
outputs: []
---

# Tile Map Generation

For each entry in `assets/tile_maps.json`, spawn:

1. **{tilemap_id}-tile-{variant_id}** (one per `tile_variants` entry) — Generate one tile via **1 image-gen call** at `working_resolution`. Tagged `tag:tile-{tilemap_id}`.
2. **{tilemap_id}-tilesheet** — Composite all generated tile PNGs into one tilesheet via `lib/sprite.py:SpriteSheet.build`. **No image-gen** — pure pixel work. Depends on `tag:tile-{tilemap_id}`, so it runs only after every tile leaf for this tilemap is done.

## Output Structure

```
assets/tile_maps/{tilemap_id}/
├── tiles/
│   ├── grass-base/
│   │   ├── grass-base.png
│   │   ├── grass-base.prompt.txt
│   │   └── grass-base.seed.txt
│   └── ...
└── tilesheet/
    ├── tilesheet.png            # composited grid (sheet_grid × tile_dimensions)
    ├── tilesheet.atlas.json     # JSON-Hash atlas: per-tile filename + frame coords
    └── tilesheet.prompt.txt     # concatenated per-tile prompts for debugging
```

## Skip Conditions

Gated by `vars.stop_after`. Skipped when `stop_after = "characters"`.
