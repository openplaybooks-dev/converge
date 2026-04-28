---
id: "scene-{{scene_id}}-03-tiles"
title: "Scene `{{scene_id}}` — tilesheet"
description: "Per-tile generation + composite tilesheet for scene `{{scene_id}}`."
wbs:
  type: nodejs
  path: ./wbs/index.js
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/scene-plan.json"
tags:
  - scene
  - "{{scene_id}}"
  - tiles
---

# Scene `{{scene_id}}` — Tilesheet

Fans out one task per tile variant in `tile_variant_ids`, each running `scripts/generate_tile.py` in `--scene-id` mode (looks up the tilemap config inside `scenes.json[scene].tilemap`). After every tile is generated, a final composite leaf runs `scripts/build_tilesheet.py --scene-id {{scene_id}} --out-root assets/scenes/{{scene_id}}/tilesheet` to assemble the per-tile PNGs into one tilesheet.
