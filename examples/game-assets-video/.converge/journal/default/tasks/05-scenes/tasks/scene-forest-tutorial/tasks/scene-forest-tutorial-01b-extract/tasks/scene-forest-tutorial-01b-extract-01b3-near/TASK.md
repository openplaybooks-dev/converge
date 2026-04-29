---
id: scene-forest-tutorial-01b-extract-01b3-near
title: "Scene `forest-tutorial` — extract bg-near (foreground edge)"
description: "Extract the NEAR parallax layer as a chroma-keyed RGBA image. Near is the foreground edge — content concentrated in the bottom strip, chroma-green above. Waits on bg-mid for sibling-above palette anchor."
agent: paid-api-operator
tags:
  - scene
  - forest-tutorial
  - extract
  - bg-near
inputs:
  - assets/scenes/forest-tutorial/concept.png
  - assets/scenes/forest-tutorial/extracted/bg-mid.png
outputs:
  - assets/scenes/forest-tutorial/extracted/bg-near.png
checks:
  - id: bg-near-extracted-exists
    description: bg-near extraction PNG was written
    cmd: test -s assets/scenes/forest-tutorial/extracted/bg-near.png
  - id: bg-near-extracted-irregular-shape
    description: "bg-near is a real model pass (irregular silhouette, not a band slice) and majority chroma green (foreground content only in the bottom strip)"
    cmd: "python -c \"\nfrom PIL import Image\nimport numpy as np\na = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-near.png').convert('RGB'))\nr, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]\nh = a.shape[0]\n# Green-screen contract: chroma green stays as RGB end-to-end.\nchroma = (r < 60) & (g > 180) & (b < 60)\ncontent = ~chroma\n# Reject hand-rolled band slices: rows that are entirely chroma or\n# entirely content for >70% of the canvas height.\nrow_solid = (chroma.all(axis=1) | content.all(axis=1)).sum()\nassert row_solid / h <= 0.70, f'{row_solid}/{h} solid rows — looks like a band slice, not a real extraction'\n# Near should be majority chroma (foreground only in bottom strip).\nchroma_ratio = chroma.mean()\nassert chroma_ratio > 0.30, f'bg-near has only {chroma_ratio:.1%} chroma green — foreground should occupy <70% of the canvas'\n\"\n"
  - id: bg-near-extracted-no-band-marker
    description: prompt sidecar is a real model pass
    cmd: "python -c \"\nt = open('assets/scenes/forest-tutorial/extracted/bg-near.prompt.txt').read().lower()\nbad = [m for m in ('FALLBACK PATH', 'BAND-EXTRACTION FALLBACK', 'local-fallback writer') if m in t.upper() or m.lower() in t]\nassert not bad, f'near prompt sidecar contains fallback markers: {bad}'\n\"\n"
vars:
  cost_cents: 5
  scene_id: forest-tutorial
---

# Scene `forest-tutorial` — bg-near extraction

## Run

```bash
python scripts/extract_bg_near.py forest-tutorial
```

The script's prompt (`NEAR_PROMPT` in `scripts/extract_bg_near.py`) instructs the model to amodal-complete the foreground edge — ground texture, foreground rocks, fern fronds, foreground tree trunk bases — and fill non-near regions (top of canvas) with `#00FF00`. The script then chroma-keys green pixels to alpha.

References passed to the model:
- The scene concept (base).
- The style sheet (universal style anchor).
- `bg-mid.png` (sibling-above — palette / lighting anchor at the layer seam).

## Fitness contract

- Per-pixel irregular alpha.
- More than 30% transparent (foreground sits in lower 30-45% of canvas; everything above is keyed out).
- Prompt sidecar is the real script's prompt.

## Why bg-mid must finish first

This task declares `extracted/bg-mid.png` as an input. The runner blocks until mid is on disk so the model can use it as a sibling-above reference for palette continuity at the layer seam.
