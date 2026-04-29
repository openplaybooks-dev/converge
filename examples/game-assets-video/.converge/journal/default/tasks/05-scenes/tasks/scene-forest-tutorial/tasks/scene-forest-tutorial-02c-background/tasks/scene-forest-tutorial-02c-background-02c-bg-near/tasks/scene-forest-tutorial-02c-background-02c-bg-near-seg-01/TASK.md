---
id: scene-forest-tutorial-02c-background-02c-bg-near-seg-01
title: "Scene `forest-tutorial` — bg-near segment 01/8"
description: One slice of the wide bg-near layer. Anchored on the previous segment so the seam matches.
tags:
  - scene
  - forest-tutorial
  - background
  - bg-near
  - segment
inputs:
  - assets/scenes/forest-tutorial/concept.png
  - assets/scenes/forest-tutorial/scene-plan.json
  - assets/scenes/forest-tutorial/stage.json
  - assets/scenes/forest-tutorial/map.silhouette.png
  - assets/concept/style-sheet.png
  - assets/scenes/forest-tutorial/**/bg-mid.png
  - assets/scenes/forest-tutorial/**/bg-mid.png
outputs:
  - assets/scenes/forest-tutorial/bg-near/seg-000.png
checks:
  - id: bg-near-seg-png-exists
    description: bg-near segment PNG written
    cmd: test -s assets/scenes/forest-tutorial/bg-near/seg-000.png
  - id: bg-near-seg-content-in-bottom-strip
    description: segment has foreground strip in the bottom; top is transparent
    cmd: "python -c \"\nfrom PIL import Image\nimport numpy as np\na = np.array(Image.open('assets/scenes/forest-tutorial/bg-near/seg-000.png').convert('RGBA'))\nalpha = a[:, :, 3]\nh, _ = alpha.shape\ntotal = alpha.size\ntotal_opaque = (alpha == 255).sum()\nratio = total_opaque / total\nassert 0.10 < ratio < 0.65, f'bg-near segment opacity {ratio:.2%} outside [10%, 65%]'\nbot_opaque = (alpha[h//2:] == 255).sum()\nbottom_share = bot_opaque / max(total_opaque, 1)\nassert bottom_share > 0.65, f'segment content should concentrate in the bottom half; got {bottom_share:.2%}'\ntop30_opaque = (alpha[:int(h*0.30)] == 255).mean()\nassert top30_opaque < 0.15, f'top 30% should be mostly transparent; got {top30_opaque:.2%} opaque'\n\"\n"
vars:
  scene_id: forest-tutorial
  layer: near
  seg_index: 0
  seg_ordinal: 01
  seg_count: 8
  seg_index_padded: 000
  seg_prev_padded: 
  seg_x_lo_norm: 0.0000
  seg_x_hi_norm: 0.1230
  section_label: player-start → first-small-rise
  section_kind: spawn → platform-up
  prev_input_path: assets/scenes/forest-tutorial/**/bg-mid.png
---

# Scene `forest-tutorial` — bg-near segment 01/8

## Role

You are a **paid-API operator**. Run the script and report its real result.

## Run

```bash
python scripts/generate_bg_layer_segment.py forest-tutorial near 0 8 \
  --x-lo 0.0000 --x-hi 0.1230 \
  --section-label "player-start → first-small-rise" --section-kind "spawn → platform-up"
```

This segment owns the **`player-start → first-small-rise`** section (x_norm `[0.0000, 0.1230]`). Section boundaries come from `stage.json[beats[]]` so each segment is one beat-bounded slice of the gameplay rhythm, not an arbitrary fraction of total width.

The script uses the **near-segment prompt builder** which:
- Frames the layer as a foreground strip (bottom 30-45% has content, above is `#00FF00`).
- For segment ≥ 1, anchors the seam on the previous segment's PNG: "the leftmost ~10% of THIS segment must continue the foreground from the right edge of the previous segment, no visible seam, no repeating a prop the previous segment already showed".
- Forbids horizon-line / mid-distance content.

References passed to the model:
- `assets/concept/style-sheet.png`
- `assets/scenes/forest-tutorial/concept.png`
- For segment ≥ 1: `assets/scenes/forest-tutorial/bg-near/seg-NNN.png` (previous segment — seam anchor)
- `assets/scenes/forest-tutorial/**/bg-mid.png` (sibling-above — palette/lighting at the layer seam)

## Why each segment waits on the previous

The `inputs:` list declares the previous segment's PNG. The runner blocks until that file exists, which serializes generation (seg-001 → seg-002 → … → seg-N). The seam-anchor reference is what keeps adjacent segments visually continuous.
