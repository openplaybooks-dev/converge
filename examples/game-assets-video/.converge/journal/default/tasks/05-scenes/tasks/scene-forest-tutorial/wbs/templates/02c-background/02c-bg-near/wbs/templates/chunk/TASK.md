---
id: "scene-{{scene_id}}-02c-background-02c-bg-near-chunk-{{chunk_ordinal}}"
title: "Scene `{{scene_id}}` — bg-near chunk {{chunk_ordinal}}/{{chunk_count}} (container)"
description: "WBS container for one bg-near chunk. Spawns four sub-tasks: 01-spec (derive chunk-spec.json from stage geometry; agent, no API), 02-svg (write chunk.svg from the spec; agent, no API), 03-render (cairosvg → chunk.skeleton.png; deterministic), 04-paint (image-edit; chunk 0 paints the skeleton, chunk N>0 inpaints with prev right-strip pre-painted onto the canvas)."
wbs:
  type: nodejs
  path: ./wbs/index.js
inputs:
  - "assets/scenes/{{scene_id}}/stage.json"
  - "assets/scenes/{{scene_id}}/scene-plan.json"
  - "assets/scenes/{{scene_id}}/bg-mid/final.png"
  - "{{prev_input_path}}"
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-near
  - chunk
  - container
---

# Scene `{{scene_id}}` — bg-near chunk {{chunk_ordinal}}/{{chunk_count}} (container)

This chunk owns the **`{{section_label}}`** section
(x_tile `[{{chunk_x_lo_tile}}, {{chunk_x_hi_tile}}]`, x_norm `[{{chunk_x_lo_norm}}, {{chunk_x_hi_norm}}]`).

Sub-tasks (run in order, gated by `inputs:`):

1. `01-spec` — agent derives `chunk-spec.json` from stage geometry. No API. Inherits palette from previous chunk verbatim (chunk 0 picks from `scene-plan.bg.layers[near].palette`).
2. `02-svg` — agent writes `chunk.svg` from `chunk-spec.json`. No API. SVG sized to the chunk's pixel canvas (not the whole scene).
3. `03-render` — `scripts/render_bg_near_chunk.py`. cairosvg rasterizes `chunk.svg` → `chunk.skeleton.png`. Deterministic.
4. `04-paint` — `scripts/paint_bg_near_chunk.py`. One image-edit call.
   - Chunk 0: edits the skeleton with style anchors as references.
   - Chunk N>0: pastes the rightmost {{inpaint_strip_px}}px of `seg-{{chunk_prev_padded}}.png` onto the leftmost portion of the skeleton, then asks the model to preserve those pre-painted pixels and paint the rest. This is true seam continuity, not a "match the reference" hint.

Output of step 4: `assets/scenes/{{scene_id}}/bg-near/segments/seg-{{chunk_index_padded}}.png` — same path the existing 97-validate / 99-stitch consume.
