---
id: "scene-{{scene_id}}-04-props"
title: "Scene `{{scene_id}}` — scene-only props"
description: "Per-scene-prop spritesheets for `{{scene_id}}`."
wbs:
  type: nodejs
  path: ./wbs/index.js
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/scene-plan.json"
tags:
  - scene
  - "{{scene_id}}"
  - props
---

# Scene `{{scene_id}}` — Scene Props

Fans out one task per (scene_prop_id, state) pair. Each runs `scripts/generate_prop_spritesheet.py` in `--scene-id` mode (looks up the prop in `scenes.json[scene].scene_props`) with `--scene-concept` and `--out-root assets/scenes/{{scene_id}}/props/{prop_id}`.

Cross-scene shared props are NOT regenerated here — they live under `assets/objects-shared/` and are produced by `03-shared-props`. This stage only handles props that are unique to this scene.
