---
id: scene-forest-1-bg-03-near
title: "Scene `forest-1` — bg-near"
description: "Wide stitched parallax layer `near` for scene `forest-1`."
tags:
  - scene
  - forest-1
  - background
  - bg-near
inputs:
  - assets/scenes/forest-1/concept.png
  - assets/scenes/forest-1/bg-mid.png
outputs:
  - assets/scenes/forest-1/bg-near.png
  - assets/scenes/forest-1/bg-near.atlas.json
checks:
  - id: scene-bg-png-exists
    description: Stitched background PNG exists for this layer
    cmd: test -s assets/scenes/forest-1/bg-near.png
  - id: scene-bg-atlas-exists
    description: Single-frame atlas written (covers full sheet)
    cmd: test -s assets/scenes/forest-1/bg-near.atlas.json
vars:
  scene_id: forest-1
  layer: near
  transparent: true
  transition_below: mid
  transition_input_path: assets/scenes/forest-1/bg-mid.png
---

# Scene `forest-1` — bg-near

Runs `python scripts/generate_scene_background.py forest-1 near`. Multiple image-gen calls + feather-blend stitching produce one wide horizontally-tileable PNG.

**Transparency:** if this layer is declared `transparent: true` in `scenes.json`, the model is prompted to use `#00FF00` for sky/negative-space pixels. After stitching, the chroma-keying pipeline (`lib/stitch.chroma_green_to_alpha`) converts those green pixels to alpha=0 with despill, so the layer composites cleanly over the layer below.

**Inter-layer transition:** if this layer has `transition_below` set, the runner gates on `assets/scenes/forest-1/bg-mid.png` (so the producer runs first), and the generator script extracts the bottom strip of the layer below and passes it as a secondary reference. The prompt instructs the model to match palette/silhouette at the seam so parallax depth feels continuous.

**Reference chain inside this layer:**
- Segment 1 uses `concept.png` as primary reference (+ optional transition strip).
- Segments 2..N use the previous segment's right slice as primary reference, concept.png as secondary, and the transition strip when applicable.
