---
id: "scene-{{scene_id}}-01b-extract-01b3-near"
title: "Scene `{{scene_id}}` — extract bg-near (foreground edge)"
description: "Extract the NEAR parallax layer as a chroma-keyed RGBA image. Near is the foreground edge — content concentrated in the bottom strip, chroma-green above. Waits on bg-mid for sibling-above palette anchor."
cost_cents: 5
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/extracted/bg-mid.png"
outputs:
  - "assets/scenes/{{scene_id}}/extracted/bg-near.png"
checks:
  - id: bg-near-extracted-exists
    cmd: test -s assets/scenes/{{scene_id}}/extracted/bg-near.png
    description: bg-near extraction PNG was written
  - id: bg-near-extracted-irregular-shape
    cmd: |
      python -c "
      from PIL import Image
      import numpy as np
      a = np.array(Image.open('assets/scenes/{{scene_id}}/extracted/bg-near.png').convert('RGB'))
      r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
      h = a.shape[0]
      # Green-screen contract: chroma green stays as RGB end-to-end.
      chroma = (r < 60) & (g > 180) & (b < 60)
      content = ~chroma
      # Reject hand-rolled band slices: rows that are entirely chroma or
      # entirely content for >70% of the canvas height.
      row_solid = (chroma.all(axis=1) | content.all(axis=1)).sum()
      assert row_solid / h <= 0.70, f'{row_solid}/{h} solid rows — looks like a band slice, not a real extraction'
      # Near should be majority chroma (foreground only in bottom strip).
      chroma_ratio = chroma.mean()
      assert chroma_ratio > 0.30, f'bg-near has only {chroma_ratio:.1%} chroma green — foreground should occupy <70% of the canvas'
      "
    description: bg-near is a real model pass (irregular silhouette, not a band slice) and majority chroma green (foreground content only in the bottom strip)
  - id: bg-near-extracted-no-band-marker
    cmd: |
      python -c "
      t = open('assets/scenes/{{scene_id}}/extracted/bg-near.prompt.txt').read().lower()
      bad = [m for m in ('band-extraction', 'band extraction', 'fallback', 'local fallback', 'rows ') if m in t]
      assert not bad, f'near prompt sidecar contains fallback markers: {bad}'
      "
    description: prompt sidecar is a real model pass
agent: paid-api-operator
tags:
  - scene
  - "{{scene_id}}"
  - extract
  - bg-near
---

# Scene `{{scene_id}}` — bg-near extraction

## Run

```bash
python scripts/extract_bg_near.py {{scene_id}}
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
