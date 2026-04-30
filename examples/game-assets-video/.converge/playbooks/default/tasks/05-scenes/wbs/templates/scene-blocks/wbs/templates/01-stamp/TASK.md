---
title: Stamp Assembly
description: Stamp the scene assembly into per-layer visual maps. Pure deterministic; no image-gen.
inputs:
  - "assets/scenes/{{scene_id}}/scene.assembly.json"
  - "assets/tokens/{{scene_biome}}/index.json"
outputs:
  - "assets/scenes/{{scene_id}}/maps/play.png"
---

# 01-stamp — `scene.assembly.json` → per-layer maps

```bash
python scripts/scene_stamp.py {{scene_id}}
```

`scene_stamp.py`:
- Reads `assets/scenes/{{scene_id}}/scene.assembly.json`.
- Loads the biome's tokens library at `assets/tokens/{{scene_biome}}/`.
- For each layer in the assembly's `layers[]`, composes an SVG by
  stamping every relevant token's sketch at its `at` position
  scaled to the token's footprint.
- Writes `maps/{layer}.svg` (human-readable) and rasterizes each to
  `maps/{layer}.png` at concept resolution
  (`grid_size × concept_tile_px`) using `rsvg-convert` if available.

Layers stamp transparent by default — only the tokens in that layer
are drawn; everything else is alpha-zero so the layers behind show
through when the painter fills them.

No LLM, no image-gen.

# Fitness checks

- `maps/play.png` exists at expected resolution.
- Each layer in the assembly has a corresponding `maps/{layer}.png`.
