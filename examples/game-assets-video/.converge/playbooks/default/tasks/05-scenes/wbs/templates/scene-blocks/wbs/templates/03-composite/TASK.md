---
title: Composite Scene
description: Composite painted layers into final scene.png + write engine manifest scene.json. Pure deterministic; no image-gen.
inputs:
  - "assets/scenes/{{scene_id}}/layers/play.png"
outputs:
  - "assets/scenes/{{scene_id}}/scene.png"
  - "assets/scenes/{{scene_id}}/scene.json"
  - "assets/scenes/{{scene_id}}/layers/landscape.png"
---

# 03-composite — layered alpha composite + engine manifest

```bash
python scripts/scene_layered_assemble.py {{scene_id}}
```

`scene_layered_assemble.py`:
- Loads `layers/{layer}.png` for each layer in the assembly's
  `layers[]`.
- Composites them back-to-front with alpha (each layer's
  transparent regions reveal the layer behind).
- Writes `scene.png` — the composited preview at concept
  resolution.
- Writes `scene.json` — engine-facing manifest with paths to each
  layer file (for runtime parallax), grid size, layer depth
  factors, and the full token-instance list.
- Also writes `layers/landscape.png` — a static-only variant of the
  composite that swaps in `maps/play.landscape.png` (kind=terrain
  tokens only) for the play layer. Same canvas size, no spawn /
  exit / pickup glyphs. Consumed by the `04-preview` stage.

For runtime parallax, the engine consumes each `layers/*.png`
separately at its declared `depth` factor; `scene.png` is just the
preview.

No LLM, no image-gen.

# Fitness checks

- `scene.png` exists.
- `scene.json` exists and lists every layer in the assembly.
- `layers/landscape.png` exists at the same dimensions as `scene.png`.
