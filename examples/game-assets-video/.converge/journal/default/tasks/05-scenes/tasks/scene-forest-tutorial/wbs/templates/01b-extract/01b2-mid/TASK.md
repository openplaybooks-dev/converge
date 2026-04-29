---
id: "scene-{{scene_id}}-01b-extract-01b2-mid"
title: "Scene `{{scene_id}}` — extract bg-mid (silhouette band)"
description: "Extract the MID parallax layer as a chroma-keyed RGBA image. Mid is the silhouette band — content occupies a horizontal band, with chroma-green outside (keyed to alpha=0). Waits on bg-far for sibling-below palette anchor."
cost_cents: 5
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/extracted/bg-far.png"
outputs:
  - "assets/scenes/{{scene_id}}/extracted/bg-mid.png"
checks:
  - id: bg-mid-extracted-exists
    cmd: test -s assets/scenes/{{scene_id}}/extracted/bg-mid.png
    description: bg-mid extraction PNG was written
  - id: bg-mid-extracted-shape
    cmd: |
      python -c "
      from PIL import Image
      import numpy as np
      a = np.array(Image.open('assets/scenes/{{scene_id}}/extracted/bg-mid.png').convert('RGB'))
      r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
      h = a.shape[0]
      # Green-screen contract: chroma green stays as RGB end-to-end.
      # Top half mostly chroma (#00FF00 — far shows through after composition);
      # bottom half is solid mid-distance painting.
      chroma = (r < 60) & (g > 180) & (b < 60)
      content = ~chroma
      top_chroma = chroma[:h // 2].mean()
      bot_content = content[h // 2:].mean()
      assert top_chroma > 0.40, f'top half of bg-mid only {top_chroma:.1%} chroma green — should be mostly chroma so far shows through (prompt told the model to fill top half with #00FF00)'
      assert bot_content > 0.70, f'bottom half of bg-mid only {bot_content:.1%} painted content — should be solid mid-distance painting, no chroma gaps'
      # The horizon between chroma and content must be irregular.
      row_solid = (chroma.all(axis=1) | content.all(axis=1)).sum()
      assert row_solid / h <= 0.85, f'{row_solid}/{h} rows are entirely chroma or entirely content — the horizon should be an irregular silhouette across multiple rows'
      "
    description: bg-mid follows green-screen stacking — top half mostly chroma green (far shows through after composition), bottom half solid painted content, horizon irregular
  - id: bg-mid-extracted-no-band-marker
    cmd: |
      python -c "
      t = open('assets/scenes/{{scene_id}}/extracted/bg-mid.prompt.txt').read().lower()
      bad = [m for m in ('FALLBACK PATH', 'BAND-EXTRACTION FALLBACK', 'local-fallback writer') if m in t.upper() or m.lower() in t]
      assert not bad, f'mid prompt sidecar contains fallback markers: {bad}'
      "
    description: prompt sidecar is a real model pass (not a hand-rolled band slice)
agent: paid-api-operator
tags:
  - scene
  - "{{scene_id}}"
  - extract
  - bg-mid
---

# Scene `{{scene_id}}` — bg-mid extraction

## Run

```bash
python scripts/extract_bg_mid.py {{scene_id}}
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
