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
  - id: bg-mid-extracted-shape
    description: "bg-mid follows green-screen stacking — top half mostly chroma green (far shows through after composition), bottom half solid painted content, horizon irregular"
    cmd: "python -c \"\nfrom PIL import Image\nimport numpy as np\na = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-mid.png').convert('RGB'))\nr, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]\nh = a.shape[0]\n# Green-screen contract: chroma green stays as RGB end-to-end.\n# Top half mostly chroma (#00FF00 — far shows through after composition);\n# bottom half is solid mid-distance painting.\nchroma = (r < 60) & (g > 180) & (b < 60)\ncontent = ~chroma\ntop_chroma = chroma[:h // 2].mean()\nbot_content = content[h // 2:].mean()\nassert top_chroma > 0.40, f'top half of bg-mid only {top_chroma:.1%} chroma green — should be mostly chroma so far shows through (prompt told the model to fill top half with #00FF00)'\nassert bot_content > 0.70, f'bottom half of bg-mid only {bot_content:.1%} painted content — should be solid mid-distance painting, no chroma gaps'\n# The horizon between chroma and content must be irregular.\nrow_solid = (chroma.all(axis=1) | content.all(axis=1)).sum()\nassert row_solid / h <= 0.85, f'{row_solid}/{h} rows are entirely chroma or entirely content — the horizon should be an irregular silhouette across multiple rows'\n\"\n"
  - id: bg-mid-extracted-no-band-marker
    description: prompt sidecar is a real model pass (not a hand-rolled band slice)
    cmd: "python -c \"\nt = open('assets/scenes/forest-tutorial/extracted/bg-mid.prompt.txt').read().lower()\nbad = [m for m in ('FALLBACK PATH', 'BAND-EXTRACTION FALLBACK', 'local-fallback writer') if m in t.upper() or m.lower() in t]\nassert not bad, f'mid prompt sidecar contains fallback markers: {bad}'\n\"\n"
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
