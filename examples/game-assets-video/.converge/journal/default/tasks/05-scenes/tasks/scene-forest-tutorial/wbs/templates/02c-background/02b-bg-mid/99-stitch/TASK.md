---
id: "scene-{{scene_id}}-02c-background-02b-bg-mid-99-stitch"
title: "Scene `{{scene_id}}` — stitch bg-mid segments"
description: "Concatenate every bg-mid/seg-NNN.png into one wide bg-mid.png with feather-blended overlap. Final atlas covers the whole sheet as a single frame."
inputs:
  - "assets/scenes/{{scene_id}}/scene-plan.json"
  - "assets/scenes/{{scene_id}}/bg-mid/seg-*.png"
  - "assets/scenes/{{scene_id}}/bg-mid.critique.json"
outputs:
  - "assets/scenes/{{scene_id}}/bg-mid.png"
  - "assets/scenes/{{scene_id}}/bg-mid.atlas.json"
checks:
  - id: bg-mid-stitched-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-mid.png
    description: stitched bg-mid.png exists
  - id: bg-mid-stitched-atlas-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-mid.atlas.json
    description: stitched bg-mid.atlas.json exists
  - id: bg-mid-stitched-width-matches-target
    cmd: |
      python -c "
      from PIL import Image
      import json
      plan = json.load(open('assets/scenes/{{scene_id}}/scene-plan.json'))
      layer = next(l for l in plan['bg']['layers'] if l['id'] == 'mid')
      target_w = layer['target_size'][0]
      w, h = Image.open('assets/scenes/{{scene_id}}/bg-mid.png').size
      assert w == target_w, f'stitched width {w} != target {target_w}'
      "
    description: stitched width matches scene-plan target_size[0]
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-mid
  - stitch
---

# Scene `{{scene_id}}` — stitch bg-mid

Run:

```bash
python scripts/stitch_bg_layer.py {{scene_id}} mid
```

The stitcher reads every `assets/scenes/{{scene_id}}/bg-mid/seg-*.png`, resizes each to a common per-segment width, and feather-blends them onto a wide canvas. The output is one RGBA PNG sized to `bg.layers.mid.target_size`.

The default overlap is 128px for mid (less feathering than near because the silhouette content has more chroma-green negative space, where seams are invisible).

This task gates on `bg-mid/seg-*.png` via a glob, so it only fires once every segment has produced its file. (Glob inputs are matched at scheduling time — adding/removing segments and re-running is safe; the stitcher always reads what's actually on disk.)
