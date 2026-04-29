---
id: "scene-{{scene_id}}-02c-background-02c-bg-near-chunk-{{chunk_ordinal}}"
title: "Scene `{{scene_id}}` — bg-near chunk {{chunk_ordinal}}/{{chunk_count}} — paint"
description: "Paint one bg-near chunk via image-edit. Skeleton + spec come from upstream 00-scene-render (deterministic slice of the whole-scene SVG). Chunk 0 paints the skeleton directly. Chunk N>0 composites the previous chunk's right-edge strip onto a chroma-green canvas and asks the model to extend the painting to the right matching the strip's style. Output goes to bg-near/segments/seg-{{chunk_index}}.png so the existing 97-validate / 99-stitch consume it unchanged."
inputs:
  - "assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index}}/chunk.skeleton.png"
  - "assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index}}/chunk-spec.json"
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/concept/style-sheet.png"
  - "assets/scenes/{{scene_id}}/bg-mid/final.png"
  - "{{prev_input_path}}"
outputs:
  - "assets/scenes/{{scene_id}}/bg-near/segments/seg-{{chunk_index}}.png"
checks:
  - id: chunk-paint-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-near/segments/seg-{{chunk_index}}.png
    description: paint output exists
  - id: chunk-paint-content-distribution
    cmd: |
      python -c "
      from PIL import Image
      import numpy as np
      a = np.array(Image.open('assets/scenes/{{scene_id}}/bg-near/segments/seg-{{chunk_index}}.png').convert('RGB'))
      r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
      h = a.shape[0]
      chroma = (r < 60) & (g > 180) & (b < 60)
      content = ~chroma
      content_ratio = content.mean()
      assert 0.02 < content_ratio < 0.90, f'content {content_ratio:.2%} outside [2%, 90%]'
      bot = content[h // 2:].sum()
      bottom_share = bot / max(content.sum(), 1)
      assert bottom_share > 0.50, f'content should lean to bottom half; got {bottom_share:.2%}'
      top20 = content[:int(h * 0.20)].mean()
      assert top20 < 0.40, f'top 20% should be mostly chroma; got {top20:.2%} content'
      "
    description: top 20% mostly chroma, content leans to bottom half
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-near
  - chunk
  - paint
---

# Scene `{{scene_id}}` — bg-near chunk {{chunk_ordinal}}/{{chunk_count}} — paint

## Role

You are a **paid-API operator**. Run the script and report its real result.

## Run

```bash
python scripts/paint_bg_near_chunk.py {{scene_id}} {{chunk_index}}
```

This chunk owns the **`{{section_label}}`** section
(x_tile `[{{chunk_x_lo_tile}}, {{chunk_x_hi_tile}}]`).

## What the script does

- Reads `chunks/chunk-{{chunk_index}}/chunk-spec.json` (palette + biome + sizes)
  and `chunks/chunk-{{chunk_index}}/chunk.skeleton.png` (deterministic slice of
  the whole-scene SVG).
- For chunk 0:
  - Calls Gemini Flash Image in **edit mode** with `chunk.skeleton.png` as the
    primary input. References: `style-sheet.png`, `concept.png`, `bg-mid/final.png`.
  - Prompt: "preserve silhouettes, replace schematic with foreground-edge art in
    the spec's palette, top 30% stays #00FF00".
- For chunk N > 0:
  - Slices the rightmost {{inpaint_strip_px}}px of `seg-{{chunk_prev_padded}}.png`.
  - Composites that strip onto a pure chroma-green canvas of this chunk's
    dimensions (NO skeleton in the model's input — just real art on the left
    and clean chroma on the right). Saves as `chunks/chunk-{{chunk_index}}/inpaint-input.png`.
  - Calls Gemini Flash Image in edit mode with `inpaint-input.png` as primary
    input. Prompt: "the leftmost strip is FINAL ART — preserve it pixel-for-pixel.
    Paint the rest using the same palette and style as the strip, with the same
    ground horizon line."
- After the call, the script hard-pastes the prev right-strip back over the
  model output so the seam is bit-identical regardless of model fidelity.
- Saves to `bg-near/segments/seg-{{chunk_index}}.png` — same path the existing
  97-validate / 99-stitch consume.

## Cost

~8¢ per chunk (one image-edit call).

## Why each chunk waits on the previous

The `inputs:` list declares the previous chunk's PNG via `{{prev_input_path}}`.
The runner blocks until that file exists, which serializes generation
(`chunk-001 → chunk-002 → … → chunk-N`). The seam-anchor strip + hard re-paste
is what keeps adjacent chunks visually continuous.
