---
id: "scene-forest-tutorial-02c-background-02c-bg-near-99-stitch"
title: "Scene `forest-tutorial` — stitch bg-near segments"
description: "Concatenate every bg-near/seg-NNN.png into one wide bg-near.png with feather-blended overlap (default 256px — heavier than mid because foreground content is busier)."
inputs:
  - "assets/scenes/forest-tutorial/scene-plan.json"
  - "assets/scenes/forest-tutorial/bg-near/seg-*.png"
  - "assets/scenes/forest-tutorial/bg-near.critique.json"
outputs:
  - "assets/scenes/forest-tutorial/bg-near.png"
  - "assets/scenes/forest-tutorial/bg-near.atlas.json"
checks:
  - id: bg-near-stitched-png-exists
    cmd: test -s assets/scenes/forest-tutorial/bg-near.png
    description: stitched bg-near.png exists
  - id: bg-near-stitched-atlas-exists
    cmd: test -s assets/scenes/forest-tutorial/bg-near.atlas.json
    description: stitched bg-near.atlas.json exists
  - id: bg-near-stitched-width-matches-target
    cmd: |
      python -c "
      from PIL import Image
      import json
      plan = json.load(open('assets/scenes/forest-tutorial/scene-plan.json'))
      layer = next(l for l in plan['bg']['layers'] if l['id'] == 'near')
      target_w = layer['target_size'][0]
      w, h = Image.open('assets/scenes/forest-tutorial/bg-near.png').size
      assert w == target_w, f'stitched width {w} != target {target_w}'
      "
    description: stitched width matches scene-plan target_size[0]
tags:
  - scene
  - "forest-tutorial"
  - background
  - bg-near
  - stitch
---

# Scene `forest-tutorial` — stitch bg-near

Run:

```bash
python scripts/stitch_bg_layer.py forest-tutorial near
```

The stitcher reads every `assets/scenes/forest-tutorial/bg-near/seg-*.png`, resizes each to a common per-segment width, and feather-blends them onto a wide canvas. Default overlap is 256px (heavier than mid because foreground content is busier).

This task gates on `bg-near/seg-*.png` via a glob — it only fires once every segment has produced its file.
