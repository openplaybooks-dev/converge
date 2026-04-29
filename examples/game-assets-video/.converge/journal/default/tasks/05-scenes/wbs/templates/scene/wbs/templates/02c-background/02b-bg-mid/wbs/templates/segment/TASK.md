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
  - id: bg-mid-seg-stacking-shape
    cmd: |
      python -c "
      from PIL import Image
      import numpy as np
      a = np.array(Image.open('assets/scenes/{{scene_id}}/bg-mid/seg-{{seg_index_padded}}.png').convert('RGBA'))
      alpha = a[:, :, 3]
      h = alpha.shape[0]
      # New stacking contract: top half mostly transparent (chroma keyed),
      # bottom half solid painted content. Near covers the bottom in
      # composite, so do NOT require a transparent strip at the bottom.
      top_transparent = (alpha[:h // 2] == 0).mean()
      bot_opaque = (alpha[h // 2:] == 255).mean()
      assert top_transparent > 0.40, f'top half of bg-mid segment only {top_transparent:.1%} transparent — should be mostly chroma so far shows through'
      assert bot_opaque > 0.70, f'bottom half of bg-mid segment only {bot_opaque:.1%} opaque — should be solid mid-distance painting, no chroma gaps'
      # Horizon between chroma and content must be irregular.
      row_solid = ((alpha == 0).all(axis=1) | (alpha == 255).all(axis=1)).sum()
      assert row_solid / h <= 0.85, f'{row_solid}/{h} rows are entirely chroma or entirely solid — horizon should be irregular across multiple rows'
      "
    description: segment follows new stacking contract — top half mostly chroma (far shows through), bottom half solid mid content (near covers it later), horizon irregular
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
