---
title: Author Visual Mapping
description: AI authors visual_mapping.md + per-sub-layer mappings/*.md grids. Compiler derives scene.assembly.json. Skipped if visual_mapping.md already exists (protects hand-authored scenes).
inputs:
  - "idea.md"
  - "assets/tokens/{{scene_biome}}/index.json"
  - "assets/tokens/TOKENS_SPEC.md"
  - "assets/scenes.json"
  - "assets/concept/landscape-{{scene_biome}}.png"
outputs:
  - "assets/scenes/{{scene_id}}/visual_mapping.md"
  - "assets/scenes/{{scene_id}}/mappings/play-terrain.md"
  - "assets/scenes/{{scene_id}}/mappings/play-dynamic.md"
  - "assets/scenes/{{scene_id}}/scene.assembly.json"
---

# 00-mapping — AI authors mapping files, compiler derives `scene.assembly.json`

Two scripts in order:

```bash
python scripts/author_visual_mapping.py {{scene_id}}
python scripts/visual_mapping_compile.py {{scene_id}} --force
```

## `author_visual_mapping.py`

- Skips if `assets/scenes/{{scene_id}}/visual_mapping.md` already
  exists (use `--force` to override). This protects hand-authored
  scenes (e.g. `demo-grassland` is a checked-in reference exemplar).
- Reads idea.md, the scene entry from `assets/scenes.json`,
  ART_BIBLE.md, the biome's `assets/tokens/{{scene_biome}}/index.json`
  (with each token's declared `symbol`), `assets/tokens/TOKENS_SPEC.md`
  (principles), and `assets/scenes/demo-grassland/visual_mapping.md` +
  `assets/scenes/demo-grassland/mappings/*.md` as in-context exemplars.
- Calls AI to produce **multiple files** in a single response:
    1. `visual_mapping.md` — scene-wide manifest
    2. `mappings/bg-far.md`       — far background grid (kind: terrain)
    3. `mappings/bg-mid.md`       — mid-distance grid (kind: terrain)
    4. `mappings/play-terrain.md` — ground / water / platforms /
                                     decoration (kind: terrain)
    5. `mappings/play-dynamic.md` — engine-driven props at point
                                     coords (kind: dynamic, NO map block)
    6. `mappings/fg.md`           — foreground frame (kind: terrain)
- Each sub-layer file declares its `parallax_layer` (`bg-far`,
  `bg-mid`, `play`, or `fg`) and `kind` (`terrain` or `dynamic`).
  Multiple sub-layer files can share a parallax layer — the play
  parallax is authored as ONE terrain grid + ONE dynamic props list.
- Validates by running `scripts/visual_mapping_compile.py {{scene_id}}
  --check`. Retries once on validation failure with the compiler's
  errors fed back into the prompt.

## `visual_mapping_compile.py`

Pure deterministic. Reads:
- `visual_mapping.md` — scene-wide frontmatter + the `mappings:` list
- Each `mappings/<sub-layer>.md` — frontmatter (layer, parallax_layer,
  kind, grid_size) + either a ` ```map ` block (terrain) or a `# props`
  YAML block (dynamic).

For each terrain sub-layer file:
- Flood-fills maximal contiguous same-symbol regions on the grid.
- Looks up each region's symbol in `assets/tokens/{biome}/index.json`'s
  `by_layer_kind` reverse index, scoped to `(parallax_layer, terrain)`.
- Validates the region is rectangular AND its bbox matches the
  token's footprint exactly. Fails loud with suggestions otherwise.
- Emits `{token, at, layer: <parallax_layer>}` instances.

For each dynamic sub-layer file:
- Parses the `# props` YAML block (each entry: `{kind, token, at}`).
- Validates each prop's token has `kind: dynamic` in the tokens index.
- Emits `{token, at, layer: <parallax_layer>}` instances at the
  point coords (no grid projection).

Emits `assets/scenes/{{scene_id}}/scene.assembly.json` in the shape
the rest of the pipeline (`scene_stamp.py`, `layer_paint.py`,
`scene_layered_assemble.py`) consumes.

No LLM, no image-gen.

## Cost

≈1¢ per scene (1–2 text AI calls in `author_visual_mapping.py`; the
compiler is free).

# Fitness checks

- `assets/scenes/{{scene_id}}/visual_mapping.md` exists.
- `assets/scenes/{{scene_id}}/mappings/play-collision.md` exists.
- `assets/scenes/{{scene_id}}/scene.assembly.json` exists.
- `python scripts/scene_stamp.py {{scene_id}} --check` returns 0.
