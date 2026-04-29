---
id: "scene-{{scene_id}}-02c-background-02a-bg-far"
title: "Scene `{{scene_id}}` — bg-far (back wall)"
description: "Distant landscape: sky → mountains → horizon line. Fully opaque, fills the canvas. Composes behind everything else."
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/scene-plan.json"
  - "assets/scenes/{{scene_id}}/stage.json"
  - "assets/scenes/{{scene_id}}/map.silhouette.png"
  - "assets/concept/style-sheet.png"
  - "assets/visual-target.png"
outputs:
  - "assets/scenes/{{scene_id}}/bg-far/final.png"
  - "assets/scenes/{{scene_id}}/bg-far/final.atlas.json"
checks:
  - id: bg-far-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-far/final.png
    description: bg-far.png exists
  - id: bg-far-atlas-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-far/final.atlas.json
    description: bg-far.atlas.json exists
  - id: bg-far-is-fully-opaque
    cmd: |
      python -c "
      from PIL import Image
      import numpy as np
      a = np.array(Image.open('assets/scenes/{{scene_id}}/bg-far/final.png').convert('RGBA'))
      alpha = a[:, :, 3]
      total = alpha.size
      opaque = (alpha == 255).sum()
      ratio = opaque / total
      assert ratio > 0.95, f'bg-far must be fully opaque (>95% alpha=255); got {ratio:.2%} — looks like a chroma-keyed slice, not a real backdrop'
      "
    description: bg-far is the back wall — must be fully opaque
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-far
---

# Scene `{{scene_id}}` — bg-far (back wall)

## Role

You are a **paid-API operator**. Run the script and report its real result. Do **NOT**:

- Hand-roll the PNG with a Python heredoc.
- Copy `concept.png` or its extracted slice to `bg-far.png`.
- Mark this task complete unless the script produced a fresh model output.

## What this layer is

`bg-far` is the **back wall** of the scene. Everything else (mid-distance silhouettes, foreground edge, characters, props) composites on top. It must:

- **Fill the entire canvas** edge-to-edge with no transparent regions.
- Show only the **most distant landscape**: sky, distant mountains/structures, faint horizon-line silhouettes (e.g. distant tree-line, distant rooftops).
- Have **NO foreground content**: no close trees, no bushes, no grass, no path, no rocks, no walkable surface — those belong to bg-mid / bg-near.

The post-execution check `bg-far-is-fully-opaque` rejects any output where less than 95% of pixels have alpha=255. A chroma-keyed slice of `concept.png` will fail this check.

## Run

```bash
python scripts/generate_bg_layer_v2.py {{scene_id}} far
```

The script uses the **far-specific prompt builder** (`build_prompt_far` in the script) which:

1. Frames the layer as the back wall (sky → distant landscape → horizon line).
2. Forbids foreground content explicitly.
3. Forces full opacity (no chroma green).

References passed to the model:
- `assets/concept/style-sheet.png` (universal style anchor)
- `assets/scenes/{{scene_id}}/concept.png` (scene anchor)
- `assets/visual-target.png` (binding game-wide visual contract)

Note: the far layer **does not** use `extracted/bg-far.png`. That slice is contaminated with foreground/mid trees from the concept and would mislead the model into reproducing them.

## Outputs

- `assets/scenes/{{scene_id}}/bg-far/final.png` — fully opaque RGBA PNG
- `assets/scenes/{{scene_id}}/bg-far/final.atlas.json`
- `assets/scenes/{{scene_id}}/bg-far.prompt.txt`
- `assets/scenes/{{scene_id}}/bg-far.seed.txt`

## What to do if the script fails

1. Load `.env` (`set -a && . ./.env && set +a`) and re-run.
2. If still failing, surface the exact error and exit. Do not patch around it locally.
