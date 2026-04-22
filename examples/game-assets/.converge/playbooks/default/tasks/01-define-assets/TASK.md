---
id: 01-define-assets
title: Define Assets — Parse idea.md into type-specific manifests
description: Read idea.md describing game and required assets. Parse into type-specific manifests: sprites.json (characters), objects.json, tile_maps.json, backgrounds.json. Each manifest contains id, name, description, palette, and animation_states/states.
dependencies: []
tags:
  - assets
  - manifest
  - characters
  - objects
  - tilemaps
inputs:
  - idea.md
outputs:
  - sprites.json
  - objects.json
  - tile_maps.json
  - backgrounds.json
checks:
  - id: sprites-json-exists
    cmd: test -s sprites.json
    description: sprites.json written
  - id: objects-json-exists
    cmd: test -s objects.json
    description: objects.json written
  - id: tilemaps-json-exists
    cmd: test -s tile_maps.json
    description: tile_maps.json written
  - id: backgrounds-json-exists
    cmd: test -s backgrounds.json
    description: backgrounds.json written
---

# Define Assets

Parse `idea.md` into four type-specific manifests that drive all downstream generation.

## Output Schemas

### sprites.json
```json
[
  {
    "id": "char-1",
    "name": "Hero Knight",
    "description": "Pixel art knight with blue armor, 8-directional movement",
    "palette": "16-bit retro, limited to 16 colors",
    "animation_states": ["idle", "walk", "attack", "hurt"]
  }
]
```

### objects.json
```json
[
  {
    "id": "obj-1",
    "name": "Health Potion",
    "description": "Red flask with sparkle effect",
    "type": "item",
    "states": ["idle", "collect"]
  }
]
```

### tile_maps.json
```json
[
  {
    "id": "tm-1",
    "name": "Forest Ground",
    "terrain_type": "grass",
    "tile_dimensions": [16, 16],
    "layers": ["base", "detail", "decoration"]
  }
]
```

### backgrounds.json
```json
[
  {
    "id": "bg-1",
    "name": "Mountain Sky",
    "description": "Parallax mountain layer with clouds",
    "parallax_layer": "far",
    "resolution": [1920, 1080]
  }
]
```

## WBS Sub-tasks

Each asset type spawns a sub-task:
- `01-define-assets/characters` — parse character descriptions → sprites.json
- `01-define-assets/objects` — parse object descriptions → objects.json
- `01-define-assets/tilemaps` — parse tilemap requirements → tile_maps.json
- `01-define-assets/backgrounds` — parse background requirements → backgrounds.json

Use `vars.max_characters` and `vars.max_states_per_character` to limit scope during testing.

## Palette Guidance

Each sprite entry should include a `palette` field guiding Nano-banana's color constraints:
- "16-bit retro, limited to 16 colors"
- "32-bit smooth, full color depth"
- "monochrome, 4 shades"