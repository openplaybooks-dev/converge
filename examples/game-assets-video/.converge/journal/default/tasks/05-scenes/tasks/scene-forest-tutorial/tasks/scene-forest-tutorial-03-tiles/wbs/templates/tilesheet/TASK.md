---
id: "scene-{{scene_id}}-tilesheet"
title: "Scene `{{scene_id}}` — tilesheet (single call)"
description: "One image-gen call draws the entire tile grid; reads scene-plan.json for adjacency + palette."
inputs:
  - "assets/scenes/{{scene_id}}/scene-plan.json"
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/concept/style-sheet.png"
outputs:
  - "assets/scenes/{{scene_id}}/tilesheet/tilesheet.png"
  - "assets/scenes/{{scene_id}}/tilesheet/tilesheet.atlas.json"
checks:
  - id: tilesheet-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/tilesheet/tilesheet.png
    description: tilesheet.png written
  - id: tilesheet-atlas-matches-png
    cmd: |
      python -c "
      import json
      from PIL import Image
      a = json.load(open('assets/scenes/{{scene_id}}/tilesheet/tilesheet.atlas.json'))
      im = Image.open('assets/scenes/{{scene_id}}/tilesheet/tilesheet.png')
      m = a['meta']
      assert m['cols'] >= 2 and m['rows'] >= 2, f'tilesheet too small: {m}'
      assert m['sheet_size']['w'] == im.size[0] and m['sheet_size']['h'] == im.size[1], f'size mismatch: atlas={m[\"sheet_size\"]} png={im.size}'
      "
    description: tilesheet atlas matches PNG dimensions and declares a >=2x2 grid
tags:
  - scene
  - "{{scene_id}}"
  - tiles
  - tilesheet
---

# Scene `{{scene_id}}` — Tilesheet (single call)

Runs `python scripts/generate_tilesheet_v2.py {{scene_id}}`.

**One image-gen call** draws the entire tile grid on a single canvas.
This is the same pattern that already gives consistent prop frames in
`generate_prop_spritesheet.py`: when the model sees adjacent cells
together it naturally produces matching edges. The previous per-tile
pipeline generated each tile in isolation, producing wildly different
palettes and edges that didn't tile against each other.

## Inputs

- `assets/scenes/{{scene_id}}/scene-plan.json` — drives prompt
  (per-tile descriptions, neighbor adjacency, shared palette)
- `assets/concept/style-sheet.png` — universal style anchor
- `assets/scenes/{{scene_id}}/concept.png` — scene anchor

## Output

One `tilesheet.png` + a row-major sheet-mode atlas. No per-tile
subdirectories. The atlas's `meta.in_game_tile_size` carries the
intended in-game pixel size (16/32/64) for engines that need it.

## Cost

- 1 image-gen call (~5¢ on Gemini)
