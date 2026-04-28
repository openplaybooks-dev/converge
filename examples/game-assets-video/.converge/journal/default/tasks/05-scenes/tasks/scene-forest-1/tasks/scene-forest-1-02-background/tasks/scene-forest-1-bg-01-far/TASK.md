---
id: scene-forest-1-bg-01-far
title: "Scene `forest-1` — bg-far"
description: "Wide stitched parallax layer `far` for scene `forest-1`."
tags:
  - scene
  - forest-1
  - background
  - bg-far
inputs:
  - assets/scenes/forest-1/concept.png
  - assets/scenes/forest-1/concept.png
outputs:
  - assets/scenes/forest-1/bg-far.png
  - assets/scenes/forest-1/bg-far.atlas.json
checks:
  - id: scene-bg-png-exists
    description: Stitched background PNG exists for this layer
    cmd: test -s assets/scenes/forest-1/bg-far.png
  - id: scene-bg-atlas-exists
    description: Single-frame atlas written (covers full sheet)
    cmd: test -s assets/scenes/forest-1/bg-far.atlas.json
vars:
  scene_id: forest-1
  layer: far
  transparent: false
  transition_below: 
  transition_input_path: assets/scenes/forest-1/concept.png
---

# Scene `forest-1` — bg-far

Runs `python scripts/generate_scene_background.py forest-1 far`. Multiple image-gen calls + feather-blend stitching produce one wide horizontally-tileable PNG.

**Transparency:** if this layer is declared `transparent: true` in `scenes.json`, the model is prompted to use `#00FF00` for sky/negative-space pixels. After stitching, the chroma-keying pipeline (`lib/stitch.chroma_green_to_alpha`) converts those green pixels to alpha=0 with despill, so the layer composites cleanly over the layer below.

**Inter-layer transition:** if this layer has `transition_below` set, the runner gates on `assets/scenes/forest-1/bg-.png` (so the producer runs first), and the generator script extracts the bottom strip of the layer below and passes it as a secondary reference. The prompt instructs the model to match palette/silhouette at the seam so parallax depth feels continuous.

**Reference chain inside this layer:**
- Segment 1 uses `concept.png` as primary reference (+ optional transition strip).
- Segments 2..N use the previous segment's right slice as primary reference, concept.png as secondary, and the transition strip when applicable.
