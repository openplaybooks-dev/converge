---
id: "scene-{{scene_id}}-02c-background-02b-bg-mid-seg-{{seg_ordinal}}"
title: "Scene `{{scene_id}}` — bg-mid segment {{seg_ordinal}}/{{seg_count}}"
description: "One slice of the wide bg-mid layer. Anchored on the previous segment so the seam matches."
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/scene-plan.json"
  - "assets/scenes/{{scene_id}}/stage.json"
  - "assets/scenes/{{scene_id}}/map.silhouette.png"
  - "assets/concept/style-sheet.png"
  - "assets/scenes/{{scene_id}}/bg-far.png"
  - "{{prev_input_path}}"
outputs:
  - "assets/scenes/{{scene_id}}/bg-mid/seg-{{seg_index_padded}}.png"
checks:
  - id: bg-mid-seg-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-mid/seg-{{seg_index_padded}}.png
    description: bg-mid segment PNG written
  - id: bg-mid-seg-mid-band-transparency
    cmd: |
      python -c "
      from PIL import Image
      import numpy as np
      a = np.array(Image.open('assets/scenes/{{scene_id}}/bg-mid/seg-{{seg_index_padded}}.png').convert('RGBA'))
      alpha = a[:, :, 3]
      total = alpha.size
      opaque = (alpha == 255).sum()
      ratio = opaque / total
      assert 0.10 < ratio < 0.75, f'bg-mid segment opacity {ratio:.2%} outside [10%, 75%]'
      h = alpha.shape[0]
      top_opaque = (alpha[:int(h*0.10)] == 255).mean()
      bot_opaque = (alpha[int(h*0.90):] == 255).mean()
      assert top_opaque < 0.20, f'top 10% should be mostly transparent; got {top_opaque:.2%} opaque'
      assert bot_opaque < 0.40, f'bottom 10% should be mostly transparent; got {bot_opaque:.2%} opaque'
      "
    description: segment is a silhouette band — middle has content, top and bottom are transparent
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-mid
  - segment
---

# Scene `{{scene_id}}` — bg-mid segment {{seg_ordinal}}/{{seg_count}}

## Role

You are a **paid-API operator**. Run the script and report its real result.

## Run

```bash
python scripts/generate_bg_layer_segment.py {{scene_id}} mid {{seg_index}} {{seg_count}} \
  --x-lo {{seg_x_lo_norm}} --x-hi {{seg_x_hi_norm}} \
  --section-label "{{section_label}}" --section-kind "{{section_kind}}"
```

This segment owns the **`{{section_label}}`** section (x_norm `[{{seg_x_lo_norm}}, {{seg_x_hi_norm}}]`). Section boundaries come from `stage.json[beats[]]` so each segment is one beat-bounded slice of the gameplay rhythm, not an arbitrary fraction of total width.

The script uses the **mid-segment prompt builder** which:
- Forces silhouettes-in-a-band, pure `#00FF00` outside the band content.
- For segment ≥ 1, anchors the seam on the previous segment's PNG (passed as a reference image): "the leftmost ~10% of THIS segment must continue the trees / hills / silhouettes from the right edge of the previous segment".
- Forbids horizon-line landscape (that's far) and foreground props (that's near).

References passed to the model:
- `assets/concept/style-sheet.png` (universal style anchor)
- `assets/scenes/{{scene_id}}/concept.png` (scene anchor)
- For segment ≥ 1: `assets/scenes/{{scene_id}}/bg-mid/seg-NNN.png` (the previous segment — seam anchor)
- `assets/scenes/{{scene_id}}/bg-far.png` (sibling-below — palette/lighting at the layer seam)

## Why each segment waits on the previous

The `inputs:` list declares the previous segment's PNG. The runner blocks until that file exists, which serializes generation (seg-001 → seg-002 → … → seg-N). Generation can't be parallelized because the seam-anchor reference is what keeps adjacent segments visually continuous.
