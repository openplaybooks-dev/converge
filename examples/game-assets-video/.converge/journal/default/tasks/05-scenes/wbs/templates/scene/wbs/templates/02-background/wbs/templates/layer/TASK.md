---
id: "scene-{{scene_id}}-bg-{{layer}}"
title: "Scene `{{scene_id}}` — bg-{{layer}}"
description: "Wide stitched parallax layer `{{layer}}` for scene `{{scene_id}}`."
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
  - "{{transition_input_path}}"
outputs:
  - "assets/scenes/{{scene_id}}/bg-{{layer}}.png"
  - "assets/scenes/{{scene_id}}/bg-{{layer}}.atlas.json"
checks:
  - id: scene-bg-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-{{layer}}.png
    description: Stitched background PNG exists for this layer
  - id: scene-bg-atlas-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-{{layer}}.atlas.json
    description: Single-frame atlas written (covers full sheet)
tags:
  - scene
  - "{{scene_id}}"
  - background
  - "bg-{{layer}}"
---

# Scene `{{scene_id}}` — bg-{{layer}}

Run:

```bash
python scripts/generate_scene_background.py {{scene_id}} {{layer}} \
    --extracted-layer-path "{{extracted_layer_path}}"
```

(If `{{extracted_layer_path}}` is empty — meaning the upstream `01b-extract` stage didn't run or this layer has `use_extraction: false` — the script gracefully falls back to image-gen for segment 1.)

**Multiple image-gen calls + feather-blend stitching produce one wide horizontally-tileable PNG.**

**Concept-extracted segment 1 (when available):** the upstream `01b-extract` stage writes `assets/scenes/{{scene_id}}/extracted/bg-{{layer}}.png` — a chroma-keyed slice of `concept.png` showing only this layer. When that file exists, the script drops it onto the canvas at x=0 as segment 1 (no image-gen call, $0 cost) and uses its right slice as the seed for segment 2. The leftmost screen-width of the wide map is therefore pixel-identical to what the user saw in the concept image.

**Transparency:** if this layer is declared `transparent: true` in `scenes.json`, the model is prompted to use `#00FF00` for sky/negative-space pixels. After stitching, the chroma-keying pipeline (`lib/stitch.chroma_green_to_alpha`) converts those green pixels to alpha=0 with despill, so the layer composites cleanly over the layer below.

**Inter-layer transition:** if this layer has `transition_below` set, the runner gates on `assets/scenes/{{scene_id}}/bg-{{transition_below}}.png` (so the producer runs first), and the generator script extracts the bottom strip of the layer below and passes it as a secondary reference. The prompt instructs the model to match palette/silhouette at the seam so parallax depth feels continuous.

**Reference chain inside this layer:**
- Segment 1: extracted concept crop OR concept.png + transition strip (if no extraction).
- Segments 2..N use the previous segment's right slice as primary reference, concept.png as secondary, the transition strip when applicable, and (when extraction is in play) the extracted crop as an additional style reference.
