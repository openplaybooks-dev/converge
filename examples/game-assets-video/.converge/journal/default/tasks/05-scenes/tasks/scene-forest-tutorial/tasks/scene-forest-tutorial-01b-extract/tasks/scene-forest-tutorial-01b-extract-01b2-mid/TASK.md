---
id: scene-forest-tutorial-01b-extract-01b2-mid
title: "Scene `forest-tutorial` — extract bg-mid (silhouette band)"
description: "Extract the MID parallax layer as a chroma-keyed RGBA image. Mid is the silhouette band — content occupies a horizontal band, with chroma-green outside (keyed to alpha=0). Waits on bg-far for sibling-below palette anchor."
agent: paid-api-operator
tags:
  - scene
  - forest-tutorial
  - extract
  - bg-mid
inputs:
  - assets/scenes/forest-tutorial/concept.png
  - assets/scenes/forest-tutorial/extracted/bg-far.png
outputs:
  - assets/scenes/forest-tutorial/extracted/bg-mid.png
checks:
  - id: bg-mid-extracted-exists
    description: bg-mid extraction PNG was written
    cmd: test -s assets/scenes/forest-tutorial/extracted/bg-mid.png
  - id: bg-mid-extracted-irregular-alpha
    description: bg-mid has per-pixel irregular alpha and meaningful transparent area
    cmd: "python -c \"\nfrom PIL import Image\nimport numpy as np\na = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-mid.png').convert('RGBA'))[:, :, 3]\nh, _ = a.shape\n# Real chroma-keyed extractions have per-pixel irregular alpha; band\n# slices have entire rows fully opaque or fully transparent.\nrow_solid = ((a == 0).all(axis=1) | (a == 255).all(axis=1)).sum()\nassert row_solid / h <= 0.70, f'{row_solid}/{h} solid rows — looks like a band slice, not a real extraction'\n# Mid should have meaningful transparent area (sky above, foreground below).\ntransparent = (a == 0).sum() / a.size\nassert transparent > 0.10, f'bg-mid has only {transparent:.1%} transparent pixels — silhouette band should leave room for far/near above and below'\n\"\n"
  - id: bg-mid-extracted-no-band-marker
    description: prompt sidecar is a real model pass (not a hand-rolled band slice)
    cmd: "python -c \"\nt = open('assets/scenes/forest-tutorial/extracted/bg-mid.prompt.txt').read().lower()\nbad = [m for m in ('band-extraction', 'band extraction', 'fallback', 'local fallback') if m in t]\nassert not bad, f'mid prompt sidecar contains fallback markers: {bad}'\n\"\n"
vars:
  cost_cents: 5
  scene_id: forest-tutorial
---

# Scene `forest-tutorial` — bg-mid extraction

## Run

```bash
python scripts/extract_bg_mid.py forest-tutorial
```

The script's prompt (`MID_PROMPT` in `scripts/extract_bg_mid.py`) instructs the model to amodal-complete the mid silhouette band — tree clumps, hill ridges — and fill non-mid regions with `#00FF00`. The script then chroma-keys green pixels to alpha after.

References passed to the model:
- The scene concept (base).
- The style sheet (universal style anchor).
- `bg-far.png` (sibling-below — palette / lighting anchor at the layer seam).

## Fitness contract

- Per-pixel irregular alpha (not a horizontal band slice).
- At least 10% transparent pixels (sky above, foreground below the silhouette band).
- Prompt sidecar is the real script's prompt (no fallback markers).

## Why bg-far must finish first

This task declares `extracted/bg-far.png` as an input. The runner blocks until far is on disk so the model can use it as a sibling-below reference for palette continuity at the layer seam.
