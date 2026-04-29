---
id: "scene-{{scene_id}}-02c-background-02c-bg-near-99-stitch"
title: "Scene `{{scene_id}}` — stitch bg-near chunks (feather-only)"
description: "Concatenate every bg-near/seg-NNN.png into one wide bg-near/final.png. Feather-blend only — no AI inpaint pass, because the per-chunk paint pipeline already pre-pastes the previous chunk's right edge onto the next chunk's left and asks the model to preserve it. Cost: $0."
cost_cents: 0
inputs:
  - "assets/scenes/{{scene_id}}/scene-plan.json"
  - "assets/scenes/{{scene_id}}/bg-near/segments/seg-*.png"
  - "assets/scenes/{{scene_id}}/bg-near/critique/critique.json"
outputs:
  - "assets/scenes/{{scene_id}}/bg-near/final.png"
  - "assets/scenes/{{scene_id}}/bg-near/final.atlas.json"
checks:
  - id: bg-near-stitched-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-near/final.png
    description: stitched bg-near.png exists
  - id: bg-near-stitched-atlas-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-near/final.atlas.json
    description: stitched bg-near.atlas.json exists
  - id: bg-near-stitched-width-matches-target
    cmd: |
      python -c "
      from PIL import Image
      import json
      plan = json.load(open('assets/scenes/{{scene_id}}/scene-plan.json'))
      layer = next(l for l in plan['bg']['layers'] if l['id'] == 'near')
      target_w = layer['target_size'][0]
      w, h = Image.open('assets/scenes/{{scene_id}}/bg-near/final.png').size
      assert w == target_w, f'stitched width {w} != target {target_w}'
      "
    description: stitched width matches scene-plan target_size[0]
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-near
  - stitch
---

# Scene `{{scene_id}}` — stitch bg-near

Run:

```bash
python scripts/stitch_bg_layer.py {{scene_id}} near --no-inpaint
```

The stitcher reads every `assets/scenes/{{scene_id}}/bg-near/segments/seg-*.png`, resizes each to a common per-chunk width, and feather-blends them onto a wide canvas with `paste_with_seam_cut`. **No AI inpaint pass** — the per-chunk paint pipeline already pastes the previous chunk's rightmost overlap-strip onto the next chunk's left edge before the model paints, and the painter then re-pastes those pixels back over the model output, so seams are pre-aligned to the pixel. Default overlap is 256px.

This task gates on `bg-near/seg-*.png` via a glob — it only fires once every chunk has produced its file.
