---
id: "scene-{{scene_id}}-02c-background-02c-bg-near-99-stitch"
title: "Scene `{{scene_id}}` — stitch bg-near segments"
description: "Concatenate every bg-near/seg-NNN.png into one wide bg-near.png. Each seam is filled by an AI-inpainted bridge — the inpainter sees both adjacent segments at once and connects the foreground silhouette + ground line continuously. Cost: 1 stitch + (N-1) inpaint calls; for an 8-segment layer, ~35¢ extra."
cost_cents: 35
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
python scripts/stitch_bg_layer.py {{scene_id}} near
```

The stitcher reads every `assets/scenes/{{scene_id}}/bg-near/segments/seg-*.png`, resizes each to a common per-segment width, and feather-blends them onto a wide canvas. Default overlap is 256px (heavier than mid because foreground content is busier).

This task gates on `bg-near/seg-*.png` via a glob — it only fires once every segment has produced its file.
