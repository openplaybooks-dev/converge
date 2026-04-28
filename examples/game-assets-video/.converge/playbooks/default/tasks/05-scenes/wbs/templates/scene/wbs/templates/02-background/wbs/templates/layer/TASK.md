---
id: "scene-{{scene_id}}-bg-{{layer}}"
title: "Scene `{{scene_id}}` — bg-{{layer}}"
description: "Wide stitched parallax layer `{{layer}}` for scene `{{scene_id}}`."
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/scene-plan.json"
  - "assets/concept/style-sheet.png"
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
python scripts/generate_bg_layer_v2.py {{scene_id}} {{layer}}
```

**Single direct image-gen call** drives the layer to its target size declared
in `scene-plan.json[bg.layers[layer]]`. No multi-segment stitching,
no feather-blend overlap — the previous pipeline produced visible
black bars and white gaps where 1024-px segments failed to merge.
A single call at native model size produces a coherent layer in one
shot; `bg-extend` (a separate task, opt-in via `extend` in the plan)
handles wider-than-native targets when needed.

**Reference chain (in priority order):**
1. `assets/concept/style-sheet.png` — universal style anchor (prepended by `lib.style_anchor.attach_style_anchor`).
2. `assets/scenes/{{scene_id}}/concept.png` — scene anchor.
3. `assets/scenes/{{scene_id}}/extracted/bg-{{layer}}.png` — base reference (the layer slice from 01b-extract). Falls back to concept if the slice is missing.
4. The sibling `bg-{below}.png` (if this layer has `blend_with_above` set in the plan) — passed as a sibling ref so the seam between layers matches.

**Transparency:** if `scene-plan.json` declares `transparent: true` for this
layer, the prompt asks for pure `#00FF00` outside the layer's content;
the script chroma-keys the result to RGBA before writing the PNG.

**Outputs:** one PNG + a single-frame sheet-mode atlas (`meta.cols=1`,
`meta.rows=1`, `frame_count=1`).
