---
id: "scene-{{scene_id}}-01b-extract-01b1-far"
title: "Scene `{{scene_id}}` — extract bg-far (back wall)"
description: "Extract the FAR parallax layer as a fully-opaque RGB image. Far is the back wall — it has no transparency, no chroma-key, no green pixels. Amodal-completed by repainting what's behind any mid/near occluders."
cost_cents: 5
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
outputs:
  - "assets/scenes/{{scene_id}}/extracted/bg-far.png"
checks:
  - id: bg-far-extracted-exists
    cmd: test -s assets/scenes/{{scene_id}}/extracted/bg-far.png
    description: bg-far extraction PNG was written
  - id: bg-far-extracted-fully-opaque
    cmd: |
      python -c "
      from PIL import Image
      import numpy as np
      a = np.array(Image.open('assets/scenes/{{scene_id}}/extracted/bg-far.png').convert('RGBA'))[:, :, 3]
      not_opaque = int((a < 255).sum())
      assert not_opaque == 0, f'bg-far must be fully opaque (alpha=255 for every pixel); {not_opaque} pixels are not — far is the back wall, no transparency, no chroma-key allowed'
      "
    description: bg-far is the back wall — every pixel must be alpha=255 (no transparency at all)
  - id: bg-far-extracted-no-chroma-green
    cmd: |
      python -c "
      from PIL import Image
      import numpy as np
      rgb = np.array(Image.open('assets/scenes/{{scene_id}}/extracted/bg-far.png').convert('RGB'))
      r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
      pure_green = ((r < 30) & (g > 220) & (b < 30)).sum()
      assert pure_green == 0, f'bg-far has {pure_green} pure-green pixels — far must contain no chroma-key markers'
      "
    description: bg-far has zero pure-green pixels (no chroma-key markers leaked through)
  - id: bg-far-extracted-no-band-marker
    cmd: |
      python -c "
      t = open('assets/scenes/{{scene_id}}/extracted/bg-far.prompt.txt').read().lower()
      bad = [m for m in ('band-extraction', 'band extraction', 'fallback', 'local fallback', 'rows ') if m in t]
      assert not bad, f'far prompt sidecar contains fallback markers: {bad}'
      "
    description: prompt sidecar is a real model pass (not a hand-rolled band slice)
agent: paid-api-operator
tags:
  - scene
  - "{{scene_id}}"
  - extract
  - bg-far
---

# Scene `{{scene_id}}` — bg-far extraction

## Run

```bash
python scripts/extract_bg_far.py {{scene_id}}
```

The script's prompt is a hand-written literal — see `scripts/extract_bg_far.py` `FAR_PROMPT`. It instructs the model to perform amodal completion: repaint the entire far layer as a complete fully-opaque landscape, inferring what is behind any mid/near occluders. No chroma-key. No transparency. No green pixels.

## Fitness contract

- Output is `assets/scenes/{{scene_id}}/extracted/bg-far.png` — RGBA but with alpha=255 in every pixel (the script forces this regardless of what the model returned).
- Less than 5% transparent pixels (the check rejects anything with chroma-key holes).
- The prompt sidecar must be the real script's prompt (no fallback markers).

## What if it fails

1. Load `.env` (`set -a && . ./.env && set +a`) and re-run.
2. If the output still has transparent regions, that means the model is adding chroma-key despite the prompt — re-run with a fresh seed; the new pipeline auto-randomizes seeds on regen.
