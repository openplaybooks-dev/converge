---
id: scene-forest-tutorial-02c-background-02b-bg-mid-seg-07
title: "Scene `forest-tutorial` — bg-mid segment 07/8"
description: One slice of the wide bg-mid layer. Anchored on the previous segment so the seam matches.
tags:
  - scene
  - forest-tutorial
  - background
  - bg-mid
  - segment
inputs:
  - assets/scenes/forest-tutorial/concept.png
  - assets/scenes/forest-tutorial/scene-plan.json
  - assets/scenes/forest-tutorial/stage.json
  - assets/scenes/forest-tutorial/map.silhouette.png
  - assets/concept/style-sheet.png
  - assets/scenes/forest-tutorial/bg-far/final.png
  - assets/scenes/forest-tutorial/bg-mid/segments/seg-005.png
outputs:
  - assets/scenes/forest-tutorial/bg-mid/segments/seg-006.png
checks:
  - id: bg-mid-seg-png-exists
    description: bg-mid segment PNG written
    cmd: test -s assets/scenes/forest-tutorial/bg-mid/segments/seg-006.png
  - id: bg-mid-seg-stacking-shape
    description: "segment follows green-screen stacking contract — top half mostly chroma green (far shows through after composition), bottom half solid mid content (near covers it later), horizon irregular"
    cmd: "python -c \"\nfrom PIL import Image\nimport numpy as np\na = np.array(Image.open('assets/scenes/forest-tutorial/bg-mid/segments/seg-006.png').convert('RGB'))\nr, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]\nh = a.shape[0]\n# Green-screen contract: chroma green stays as RGB content end-to-end\n# (no alpha keying). Top half should be mostly chroma (far shows\n# through after composition); bottom half should be solid mid content.\nchroma = (r < 60) & (g > 180) & (b < 60)\ncontent = ~chroma\ntop_chroma  = chroma[:h // 2].mean()\nbot_content = content[h // 2:].mean()\nassert top_chroma > 0.40, f'top half of bg-mid segment only {top_chroma:.1%} chroma green — should be mostly chroma so far shows through'\nassert bot_content > 0.70, f'bottom half of bg-mid segment only {bot_content:.1%} painted content — should be solid mid-distance painting, no chroma gaps'\n# Horizon between chroma and content must be irregular (not flat).\nrow_solid = (chroma.all(axis=1) | content.all(axis=1)).sum()\nassert row_solid / h <= 0.85, f'{row_solid}/{h} rows are entirely chroma or entirely content — horizon should be irregular across multiple rows'\n\"\n"
vars:
  scene_id: forest-tutorial
  layer: mid
  seg_index: 6
  seg_ordinal: 07
  seg_count: 8
  seg_index_padded: 006
  seg_prev_padded: 005
  seg_x_lo_norm: 0.6557
  seg_x_hi_norm: 0.8197
  section_label: key-pickup → final-descent
  section_kind: pickup → platform-down
  prev_input_path: assets/scenes/forest-tutorial/bg-mid/segments/seg-005.png
---

# Scene `forest-tutorial` — bg-mid segment 07/8

## Role

You are a **paid-API operator**. Run the script and report its real result.

## Run

```bash
python scripts/generate_bg_layer_segment.py forest-tutorial mid 6 8 \
  --x-lo 0.6557 --x-hi 0.8197 \
  --section-label "key-pickup → final-descent" --section-kind "pickup → platform-down"
```

This segment owns the **`key-pickup → final-descent`** section (x_norm `[0.6557, 0.8197]`). Section boundaries come from `stage.json[beats[]]` so each segment is one beat-bounded slice of the gameplay rhythm, not an arbitrary fraction of total width.

The script uses the **mid-segment prompt builder** which:
- Forces silhouettes-in-a-band, pure `#00FF00` outside the band content.
- For segment ≥ 1, anchors the seam on the previous segment's PNG (passed as a reference image): "the leftmost ~10% of THIS segment must continue the trees / hills / silhouettes from the right edge of the previous segment".
- Forbids horizon-line landscape (that's far) and foreground props (that's near).

References passed to the model:
- `assets/concept/style-sheet.png` (universal style anchor)
- `assets/scenes/forest-tutorial/concept.png` (scene anchor)
- For segment ≥ 1: `assets/scenes/forest-tutorial/bg-mid/segments/seg-NNN.png` (the previous segment — seam anchor)
- `assets/scenes/forest-tutorial/bg-far/final.png` (sibling-below — palette/lighting at the layer seam)

## Why each segment waits on the previous

The `inputs:` list declares the previous segment's PNG. The runner blocks until that file exists, which serializes generation (seg-001 → seg-002 → … → seg-N). Generation can't be parallelized because the seam-anchor reference is what keeps adjacent segments visually continuous.
