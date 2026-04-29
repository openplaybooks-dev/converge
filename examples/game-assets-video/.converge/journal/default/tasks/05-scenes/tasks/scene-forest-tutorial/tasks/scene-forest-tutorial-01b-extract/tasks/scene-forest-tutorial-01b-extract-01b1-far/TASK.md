---
id: scene-forest-tutorial-01b-extract-01b1-far
title: "Scene `forest-tutorial` — extract bg-far (back wall)"
description: "Extract the FAR parallax layer as a fully-opaque RGB image. Far is the back wall — it has no transparency, no chroma-key, no green pixels. Amodal-completed by repainting what's behind any mid/near occluders."
agent: paid-api-operator
tags:
  - scene
  - forest-tutorial
  - extract
  - bg-far
inputs:
  - assets/scenes/forest-tutorial/concept.png
outputs:
  - assets/scenes/forest-tutorial/extracted/bg-far.png
checks:
  - id: bg-far-extracted-exists
    description: bg-far extraction PNG was written
    cmd: test -s assets/scenes/forest-tutorial/extracted/bg-far.png
  - id: bg-far-extracted-fully-opaque
    description: bg-far is the back wall — every pixel must be alpha=255 (no transparency at all)
    cmd: "python -c \"\nfrom PIL import Image\nimport numpy as np\na = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-far.png').convert('RGBA'))[:, :, 3]\nnot_opaque = int((a < 255).sum())\nassert not_opaque == 0, f'bg-far must be fully opaque (alpha=255 for every pixel); {not_opaque} pixels are not — far is the back wall, no transparency, no chroma-key allowed'\n\"\n"
  - id: bg-far-extracted-no-chroma-green
    description: bg-far has zero pure-green pixels (no chroma-key markers leaked through)
    cmd: "python -c \"\nfrom PIL import Image\nimport numpy as np\nrgb = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-far.png').convert('RGB'))\nr, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]\npure_green = ((r < 30) & (g > 220) & (b < 30)).sum()\nassert pure_green == 0, f'bg-far has {pure_green} pure-green pixels — far must contain no chroma-key markers'\n\"\n"
  - id: bg-far-extracted-no-band-marker
    description: prompt sidecar is a real model pass (not a hand-rolled band slice)
    cmd: "python -c \"\nt = open('assets/scenes/forest-tutorial/extracted/bg-far.prompt.txt').read().lower()\n# Detect the FALLBACK PATH marker only, not legitimate negative instructions\n# in the real prompt (which says 'Do NOT produce... rows 0..N...').\nbad = [m for m in ('FALLBACK PATH', 'BAND-EXTRACTION FALLBACK', 'local-fallback writer') if m in t.upper() or m.lower() in t]\nassert not bad, f'far prompt sidecar contains fallback markers: {bad}'\n\"\n"
vars:
  cost_cents: 5
  scene_id: forest-tutorial
---

# Scene `forest-tutorial` — bg-far extraction

## Run

```bash
python scripts/extract_bg_far.py forest-tutorial
```

The script's prompt is a hand-written literal — see `scripts/extract_bg_far.py` `FAR_PROMPT`. It instructs the model to perform amodal completion: repaint the entire far layer as a complete fully-opaque landscape, inferring what is behind any mid/near occluders. No chroma-key. No transparency. No green pixels.

## Fitness contract

- Output is `assets/scenes/forest-tutorial/extracted/bg-far.png` — RGBA but with alpha=255 in every pixel (the script forces this regardless of what the model returned).
- Less than 5% transparent pixels (the check rejects anything with chroma-key holes).
- The prompt sidecar must be the real script's prompt (no fallback markers).

## What if it fails

1. Load `.env` (`set -a && . ./.env && set +a`) and re-run.
2. If the output still has transparent regions, that means the model is adding chroma-key despite the prompt — re-run with a fresh seed; the new pipeline auto-randomizes seeds on regen.
