---
id: "scene-{{scene_id}}-02c-background-02c-bg-near-seg-{{seg_ordinal}}"
title: "Scene `{{scene_id}}` — bg-near segment {{seg_ordinal}}/{{seg_count}}"
description: "One slice of the wide bg-near layer. Anchored on the previous segment so the seam matches."
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/scene-plan.json"
  - "assets/scenes/{{scene_id}}/stage.json"
  - "assets/scenes/{{scene_id}}/map.silhouette.png"
  - "assets/concept/style-sheet.png"
  - "assets/scenes/{{scene_id}}/bg-mid/final.png"
  - "{{prev_input_path}}"
outputs:
  - "assets/scenes/{{scene_id}}/bg-near/segments/seg-{{seg_index_padded}}.png"
checks:
  - id: bg-near-seg-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-near/segments/seg-{{seg_index_padded}}.png
    description: bg-near segment PNG written
  - id: bg-near-seg-content-in-bottom-strip
    cmd: |
      python -c "
      from PIL import Image
      import numpy as np
      a = np.array(Image.open('assets/scenes/{{scene_id}}/bg-near/segments/seg-{{seg_index_padded}}.png').convert('RGB'))
      r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
      h = a.shape[0]
      # Green-screen contract: chroma green stays as RGB end-to-end.
      # Foreground content in bottom strip; top mostly chroma (far + mid
      # show through after composition).
      chroma = (r < 60) & (g > 180) & (b < 60)
      content = ~chroma
      total = content.size
      content_ratio = content.mean()
      assert 0.10 < content_ratio < 0.65, f'bg-near segment content {content_ratio:.2%} outside [10%, 65%]'
      bot_content = content[h // 2:].sum()
      bottom_share = bot_content / max(content.sum(), 1)
      assert bottom_share > 0.65, f'segment content should concentrate in the bottom half; got {bottom_share:.2%}'
      top30_content = content[:int(h * 0.30)].mean()
      assert top30_content < 0.15, f'top 30% should be mostly chroma (so far/mid show through); got {top30_content:.2%} content'
      "
    description: segment has foreground content in the bottom strip; top is mostly chroma green (far/mid show through after composition)
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-near
  - segment
---

# Scene `{{scene_id}}` — bg-near segment {{seg_ordinal}}/{{seg_count}}

## Role

You are a **paid-API operator**. Run the script and report its real result.

## Run

```bash
python scripts/generate_bg_layer_segment.py {{scene_id}} near {{seg_index}} {{seg_count}} \
  --x-lo {{seg_x_lo_norm}} --x-hi {{seg_x_hi_norm}} \
  --section-label "{{section_label}}" --section-kind "{{section_kind}}"
```

This segment owns the **`{{section_label}}`** section (x_norm `[{{seg_x_lo_norm}}, {{seg_x_hi_norm}}]`). Section boundaries come from `stage.json[beats[]]` so each segment is one beat-bounded slice of the gameplay rhythm, not an arbitrary fraction of total width.

The script uses the **near-segment prompt builder** which:
- Frames the layer as a foreground strip (bottom 30-45% has content, above is `#00FF00`).
- For segment ≥ 1, anchors the seam on the previous segment's PNG: "the leftmost ~10% of THIS segment must continue the foreground from the right edge of the previous segment, no visible seam, no repeating a prop the previous segment already showed".
- Forbids horizon-line / mid-distance content.

References passed to the model:
- `assets/concept/style-sheet.png`
- `assets/scenes/{{scene_id}}/concept.png`
- For segment ≥ 1: `assets/scenes/{{scene_id}}/bg-near/segments/seg-NNN.png` (previous segment — seam anchor)
- `assets/scenes/{{scene_id}}/bg-mid/final.png` (sibling-above — palette/lighting at the layer seam)

## Why each segment waits on the previous

The `inputs:` list declares the previous segment's PNG. The runner blocks until that file exists, which serializes generation (seg-001 → seg-002 → … → seg-N). The seam-anchor reference is what keeps adjacent segments visually continuous.
