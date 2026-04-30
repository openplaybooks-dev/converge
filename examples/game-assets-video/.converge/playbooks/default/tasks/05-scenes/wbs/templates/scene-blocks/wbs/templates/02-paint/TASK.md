---
title: Paint Layers
description: Image-edit each layer's stamped map into a finished painted layer. Layers paint back-to-front.
inputs:
  - "assets/scenes/{{scene_id}}/maps/play.png"
  - "assets/concept/style-sheet.png"
  - "assets/visual-target.png"
outputs:
  - "assets/scenes/{{scene_id}}/layers/play.png"
---

# 02-paint — per-layer image-edit

```bash
python scripts/layer_paint.py {{scene_id}}
```

`layer_paint.py`:
- For each layer in `scene.assembly.json::layers`, loads the stamped
  map at `maps/{layer}.png` as the image-edit input.
- Builds a per-role prompt (atmosphere / silhouette / gameplay /
  foreground-frame). The prompt enumerates every token placed in
  this layer with its `at` position, footprint, and `art_notes`
  pulled from the compiled tokens library.
- Calls image-gen (Gemini 2.5 Flash Image / Nano-banana) with:
  - the layer's stamped map (input #1)
  - the project style anchor (`assets/concept/style-sheet.png`, #2)
  - the visual target (`assets/visual-target.png`, #3)
  - any previously-painted layers (#4+) — each layer paints in the
    context of the layers behind it for cross-layer consistency
- Writes `layers/{layer}.png` and `layers/{layer}.prompt.txt`.

Cost: ~5¢ per layer (Nano-banana image-edit). Typical scene has
3 layers → ~15¢.

# Fitness checks

- `layers/play.png` exists at the same resolution as the input map.
- Every layer in the assembly has a corresponding `layers/{layer}.png`.
- `layers/{layer}.prompt.txt` exists for traceability.
