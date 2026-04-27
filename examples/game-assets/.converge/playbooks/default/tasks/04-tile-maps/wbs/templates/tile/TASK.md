---
id: "{{tilemap_id}}-tile-{{tile_id}}"
title: "Generate {{tilemap_name}} tile {{tile_id}}"
description: "{{tile_description}}"
outputs:
  - "assets/tile_maps/{{tilemap_id}}/tiles/{{tile_id}}/{{tile_id}}.png"
  - "assets/tile_maps/{{tilemap_id}}/tiles/{{tile_id}}/{{tile_id}}.prompt.txt"
checks:
  - id: tile-png-is-square
    cmd: |
      python -c "from PIL import Image; im=Image.open('assets/tile_maps/{{tilemap_id}}/tiles/{{tile_id}}/{{tile_id}}.png'); w,h=im.size; assert w==h, f'tile not square: {im.size}'"
    description: Tile PNG is a square image at working_resolution
  - id: tile-prompt-saved
    cmd: test -s assets/tile_maps/{{tilemap_id}}/tiles/{{tile_id}}/{{tile_id}}.prompt.txt
    description: Sibling .prompt.txt exists for debugging
tags:
  - tile
  - "{{tile_batch_tag}}"
  - "{{tile_layer}}"
---

# {{tilemap_name}} — tile `{{tile_id}}`

Runs `scripts/generate_tile.py {{tilemap_id}} {{tile_id}}`. **One image-gen call** at `{{working_resolution}}×{{working_resolution}}` produces one tile.

The composite step (`{{tilemap_id}}-tilesheet`) waits on `tag:{{tile_batch_tag}}` and assembles every tile into the final tilesheet PNG.

Tile metadata:
- **Tilemap**: {{tilemap_id}} ({{terrain_type}})
- **Tile ID**: {{tile_id}}
- **Layer**: {{tile_layer}}
- **Description**: {{tile_description}}
