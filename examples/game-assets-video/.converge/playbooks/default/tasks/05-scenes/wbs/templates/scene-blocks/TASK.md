---
title: Scene (tokens flow)
description: Per-scene pipeline. Spawns 4 stages — mapping → stamp → paint → composite.
inputs:
  - "idea.md"
  - "assets/tokens/{{scene_biome}}/index.json"
outputs:
  - "assets/scenes/{{scene_id}}/scene.png"
  - "assets/scenes/{{scene_id}}/scene.json"
tags:
  - scenes
  - tokens
---

# Scene `{{scene_id}}` — tokens flow

This is the per-scene pipeline defined in MODERN_SIDE_SCROLL_SPEC.md
§5. Four stages run in order, gated by the `inputs:` each declares:

1. **00-mapping** — AI authors `visual_mapping.md` (a human-readable
   per-scene spec: YAML frontmatter + per-layer fenced ` ```tokens `
   blocks). A separate compiler then derives `scene.assembly.json`
   from the markdown. Skips if `visual_mapping.md` already exists
   (humans / earlier runs may have authored it). No image-gen.

2. **01-stamp** — `scripts/scene_stamp.py` reads `scene.assembly.json`
   and stamps each token's sketch into per-layer SVG + PNG visual
   maps under `maps/{layer}.{svg,png}`. Pure deterministic.

3. **02-paint** — `scripts/layer_paint.py` image-edits each layer's
   stamped map into a finished painted layer at `layers/{layer}.png`.
   Layers paint back-to-front; each previous layer attaches as a
   reference for the next. ~1 image-gen call per layer.

4. **03-composite** — `scripts/scene_layered_assemble.py` composites
   the painted layers into the final `scene.png` + writes
   `scene.json` (engine-facing manifest with paths, grid, beats,
   block instances). No image-gen.

The four stages spawn as numbered child tasks under this parent.
Total cost per scene ≈ N × 5¢ where N is the layer count (typically
3–5), plus ≈1¢ for the mapping authoring.

The MD-first authoring layer (`visual_mapping.md` → `scene.assembly.json`)
mirrors the tokens side (per-token `*.md` → `*.json`). See
TOKENS_SPEC.md for the philosophy and MODERN_SIDE_SCROLL_SPEC.md
for the format.
