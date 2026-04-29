---
id: "{{tilemap_id}}-tilesheet"
title: "Composite {{tilemap_name}} tilesheet"
description: "Composite {{tile_count}} tile PNGs into one tilesheet for {{tilemap_name}}"
dependencies:
  - "tag:{{tile_batch_tag}}"
outputs:
  - "assets/tile_maps/{{tilemap_id}}/tilesheet/tilesheet.png"
  - "assets/tile_maps/{{tilemap_id}}/tilesheet/tilesheet.atlas.json"
checks:
  - id: tilesheet-png-matches-atlas
    cmd: |
      python -c "import json; from PIL import Image; a=json.load(open('assets/tile_maps/{{tilemap_id}}/tilesheet/tilesheet.atlas.json')); im=Image.open('assets/tile_maps/{{tilemap_id}}/tilesheet/tilesheet.png'); assert a['meta']['sheet_size']['w']==im.size[0] and a['meta']['sheet_size']['h']==im.size[1], f\"sheet size mismatch: atlas={a['meta']['sheet_size']} png={im.size}\"; assert len(a['frames'])==a['meta']['rows']*a['meta']['cols'], f\"frame count mismatch: frames={len(a['frames'])} grid={a['meta']['rows']}x{a['meta']['cols']}\""
    description: Tilesheet PNG dimensions and frame count match the atlas declaration
tags:
  - tilesheet
  - composite
---

# {{tilemap_name}} — Tilesheet Composite

Runs `scripts/build_tilesheet.py {{tilemap_id}}`. **No image-gen** — pure pixel work using `lib/sprite.py:SpriteSheet.build`.

Reads every previously-generated tile PNG under `assets/tile_maps/{{tilemap_id}}/tiles/`, composites them into the sheet grid declared in `tile_maps.json`, and emits the sheet + JSON-Hash atlas.

Outputs:
- `assets/tile_maps/{{tilemap_id}}/tilesheet/tilesheet.png` — composited sheet
- `assets/tile_maps/{{tilemap_id}}/tilesheet/tilesheet.atlas.json` — per-tile filename + frame coords
- `assets/tile_maps/{{tilemap_id}}/tilesheet/tilesheet.prompt.txt` — concatenated per-tile prompts (debug only)

Depends on `tag:{{tile_batch_tag}}` so it waits for all `{{tile_count}}` tile leaves.
