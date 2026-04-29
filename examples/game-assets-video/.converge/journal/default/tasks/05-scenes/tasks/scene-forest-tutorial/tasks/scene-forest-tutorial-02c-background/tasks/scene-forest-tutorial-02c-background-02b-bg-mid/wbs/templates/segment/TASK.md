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
  - "assets/scenes/{{scene_id}}/bg-far/final.png"
  - "{{prev_input_path}}"
outputs:
  - "assets/scenes/{{scene_id}}/bg-mid/segments/seg-{{seg_index_padded}}.png"
checks:
  - id: bg-mid-seg-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-mid/segments/seg-{{seg_index_padded}}.png
    description: bg-mid segment PNG written
  - id: bg-mid-seg-stacking-shape
    cmd: |
      python -c "
      from PIL import Image
      import numpy as np
      a = np.array(Image.open('assets/scenes/{{scene_id}}/bg-mid/segments/seg-{{seg_index_padded}}.png').convert('RGB'))
      r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
      h = a.shape[0]
      # Green-screen contract: chroma green stays as RGB content end-to-end
      # (no alpha keying). Top half should be mostly chroma (far shows
      # through after composition); bottom half should be solid mid content.
      chroma = (r < 60) & (g > 180) & (b < 60)
      content = ~chroma
      top_chroma  = chroma[:h // 2].mean()
      bot_content = content[h // 2:].mean()
      assert top_chroma > 0.40, f'top half of bg-mid segment only {top_chroma:.1%} chroma green — should be mostly chroma so far shows through'
      assert bot_content > 0.70, f'bottom half of bg-mid segment only {bot_content:.1%} painted content — should be solid mid-distance painting, no chroma gaps'
      # Horizon between chroma and content must be irregular (not flat).
      row_solid = (chroma.all(axis=1) | content.all(axis=1)).sum()
      assert row_solid / h <= 0.85, f'{row_solid}/{h} rows are entirely chroma or entirely content — horizon should be irregular across multiple rows'
      "
    description: segment follows green-screen stacking contract — top half mostly chroma green (far shows through after composition), bottom half solid mid content (near covers it later), horizon irregular
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
- For segment ≥ 1: `assets/scenes/{{scene_id}}/bg-mid/segments/seg-NNN.png` (the previous segment — seam anchor)
- `assets/scenes/{{scene_id}}/bg-far/final.png` (sibling-below — palette/lighting at the layer seam)

## Why each segment waits on the previous

The `inputs:` list declares the previous segment's PNG. The runner blocks until that file exists, which serializes generation (seg-001 → seg-002 → … → seg-N). Generation can't be parallelized because the seam-anchor reference is what keeps adjacent segments visually continuous.
