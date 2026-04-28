---
id: "scene-{{scene_id}}-tile-{{tile_id}}"
title: "Scene `{{scene_id}}` — tile `{{tile_id}}`"
description: "One tile for scene `{{scene_id}}` (uses scene concept as secondary reference)."
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
outputs:
  - "assets/scenes/{{scene_id}}/tilesheet/tiles/{{tile_id}}/{{tile_id}}.png"
  - "assets/scenes/{{scene_id}}/tilesheet/tiles/{{tile_id}}/{{tile_id}}.prompt.txt"
checks:
  - id: scene-tile-png-is-square
    cmd: |
      python -c "from PIL import Image; im=Image.open('assets/scenes/{{scene_id}}/tilesheet/tiles/{{tile_id}}/{{tile_id}}.png'); w,h=im.size; assert w==h, f'tile not square: {im.size}'"
    description: Tile PNG is square
  - id: scene-tile-prompt-saved
    cmd: test -s assets/scenes/{{scene_id}}/tilesheet/tiles/{{tile_id}}/{{tile_id}}.prompt.txt
    description: Sibling .prompt.txt exists
tags:
  - scene
  - "{{scene_id}}"
  - tile
  - "{{tile_batch_tag}}"
---

# Scene `{{scene_id}}` — tile `{{tile_id}}`

Runs `python scripts/generate_tile.py {{scene_id}}-tilemap {{tile_id}} --scene-id {{scene_id}} --scene-concept assets/scenes/{{scene_id}}/concept.png --out-root assets/scenes/{{scene_id}}/tilesheet`.

Tilemap config comes from `scenes.json[{{scene_id}}].tilemap`; the scene concept image is added as a secondary reference so palette and depth match the rest of the scene.
