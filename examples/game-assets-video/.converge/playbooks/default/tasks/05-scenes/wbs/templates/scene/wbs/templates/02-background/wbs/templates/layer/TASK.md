---
id: "scene-{{scene_id}}-bg-{{layer}}"
title: "Scene `{{scene_id}}` — bg-{{layer}}"
description: "Wide stitched parallax layer `{{layer}}` for scene `{{scene_id}}`."
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

Runs `python scripts/generate_scene_background.py {{scene_id}} {{layer}}`. Multiple image-gen calls + feather-blend stitching produce one wide horizontally-tileable PNG. The first segment uses `concept.png` as a secondary reference; later segments use the previous segment's right slice so colour/lighting carries through.
