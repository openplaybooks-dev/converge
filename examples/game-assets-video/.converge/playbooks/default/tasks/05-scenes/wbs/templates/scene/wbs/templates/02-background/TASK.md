---
id: "scene-{{scene_id}}-02-background"
title: "Scene `{{scene_id}}` — parallax backgrounds"
description: "Multi-segment stitched parallax layer(s) for `{{scene_id}}`."
wbs:
  type: nodejs
  path: ./wbs/index.js
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
tags:
  - scene
  - "{{scene_id}}"
  - background
---

# Scene `{{scene_id}}` — Parallax Backgrounds

Fans out one task per layer in `bg_layers` (`["far","mid","near"]` typically). Each layer runs `scripts/generate_scene_background.py {{scene_id}} <layer>` which makes multiple image-gen calls and stitches them with feather-blend overlap so the result is wide and horizontally tileable.

Each per-layer task is independent so the runner can parallelize them.
