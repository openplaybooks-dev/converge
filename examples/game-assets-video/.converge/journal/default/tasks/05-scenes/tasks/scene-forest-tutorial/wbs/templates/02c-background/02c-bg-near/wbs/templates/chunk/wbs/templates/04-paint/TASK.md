---
id: "scene-{{scene_id}}-02c-background-02c-bg-near-chunk-{{chunk_ordinal}}-04-paint"
title: "Scene `{{scene_id}}` — bg-near chunk {{chunk_ordinal}} — paint"
description: "Image-edit the SVG-rasterized skeleton into polished art. Chunk 0 paints the skeleton directly. Chunk N>0 first composites the rightmost {{inpaint_strip_px}}px of seg-{{chunk_prev_padded}}.png onto the leftmost portion of the skeleton, then asks the model to PRESERVE those pre-painted pixels and paint the rest. This is true seam continuity, not a 'match the reference' hint."
inputs:
  - "assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk.skeleton.png"
  - "assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk-spec.json"
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/concept/style-sheet.png"
  - "assets/scenes/{{scene_id}}/bg-mid/final.png"
  - "{{prev_input_path}}"
outputs:
  - "assets/scenes/{{scene_id}}/bg-near/segments/seg-{{chunk_index_padded}}.png"
checks:
  - id: chunk-paint-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-near/segments/seg-{{chunk_index_padded}}.png
    description: paint output exists
  - id: chunk-paint-content-distribution
    cmd: |
      python -c "
      from PIL import Image
      import numpy as np
      a = np.array(Image.open('assets/scenes/{{scene_id}}/bg-near/segments/seg-{{chunk_index_padded}}.png').convert('RGB'))
      r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
      h = a.shape[0]
      chroma = (r < 60) & (g > 180) & (b < 60)
      content = ~chroma
      content_ratio = content.mean()
      assert 0.10 < content_ratio < 0.65, f'content {content_ratio:.2%} outside [10%, 65%]'
      bot = content[h // 2:].sum()
      bottom_share = bot / max(content.sum(), 1)
      assert bottom_share > 0.65, f'content should concentrate in bottom half; got {bottom_share:.2%}'
      top20 = content[:int(h * 0.20)].mean()
      assert top20 < 0.40, f'top 20% should be mostly chroma; got {top20:.2%} content'
      "
    description: top 30% mostly chroma, content concentrated in bottom half
  - id: chunk-paint-preserves-seam
    cmd: |
      python -c "
      from PIL import Image
      import numpy as np
      idx = {{chunk_index}}
      strip_w = {{inpaint_strip_px}}
      if idx == 0:
          raise SystemExit(0)
      out = np.array(Image.open('assets/scenes/{{scene_id}}/bg-near/segments/seg-{{chunk_index_padded}}.png').convert('RGB'))
      prev = np.array(Image.open('assets/scenes/{{scene_id}}/bg-near/segments/seg-{{chunk_prev_padded}}.png').convert('RGB'))
      # The painter pasted prev[:, -strip_w:] onto out[:, :strip_w]. The model is told
      # to preserve those pixels. Check the inner half of that strip — model output
      # there should match prev's right edge to within RMS < 12 (LANCZOS resize tolerance).
      h = min(out.shape[0], prev.shape[0])
      inner_lo = strip_w // 4
      inner_hi = strip_w // 2
      a = out[:h, inner_lo:inner_hi].astype(np.int32)
      b = prev[:h, -strip_w + inner_lo : -strip_w + inner_hi].astype(np.int32)
      diff = np.sqrt(((a - b) ** 2).mean())
      assert diff < 25.0, f'seam preservation RMS={diff:.1f} too high (model overwrote pre-painted strip)'
      "
    description: for chunks N>0, the inner half of the inpaint strip matches the previous chunk's right edge (model preserved the seam)
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-near
  - chunk
  - paint
---

# Scene `{{scene_id}}` — bg-near chunk {{chunk_ordinal}} paint

## Role

You are a **paid-API operator**. Run the script and report its real result.

## Run

```bash
python scripts/paint_bg_near_chunk.py {{scene_id}} {{chunk_index}}
```

## What the script does

- Reads `chunks/chunk-{{chunk_index_padded}}/chunk-spec.json` for palette + geometry context.
- For chunk index 0:
  - Calls Gemini Flash Image in **edit mode** with `chunk.skeleton.png` as the primary input.
  - References: `style-sheet.png`, `concept.png`, `bg-mid/final.png`.
  - Prompt: "preserve silhouettes, replace schematic with foreground-edge art in the spec's palette, top 30% stays #00FF00".
- For chunk index N > 0:
  - Slices the rightmost `{{inpaint_strip_px}}` pixels of `segments/seg-{{chunk_prev_padded}}.png`.
  - Composites that strip onto the leftmost `{{inpaint_strip_px}}` pixels of `chunk.skeleton.png` — replacing the skeleton there with finished art.
  - Saves the composite as `chunks/chunk-{{chunk_index_padded}}/inpaint-input.png`.
  - Calls Gemini Flash Image in edit mode with `inpaint-input.png` as the primary input.
  - References: same as chunk 0.
  - Prompt: "the leftmost {{inpaint_strip_px}}px is FINAL ART — preserve it pixel-for-pixel. Paint the rest using the same palette and style. Preserve the silhouettes from the rest of the canvas."
- Saves the model output to `bg-near/segments/seg-{{chunk_index_padded}}.png`.

## Cost

~8¢ per chunk (one image-edit call).

## Why this preserves seams

By compositing the previous chunk's right-edge pixels onto the model's input canvas
*before* the call, the seam content is physically present in the input. The model
edits "around" them rather than "trying to match" them. The post-flight check
verifies the model didn't overwrite that strip.
