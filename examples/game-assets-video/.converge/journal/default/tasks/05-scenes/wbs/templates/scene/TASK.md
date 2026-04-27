---
id: "scene-{{scene_id}}"
title: "Scene: {{scene_name}}"
description: "Per-scene asset pipeline for `{{scene_id}}` ({{scene_biome}}) — concept → background → tiles → props → manifest."
wbs:
  type: nodejs
  path: ./wbs/index.js
outputs:
  - "assets/scenes/{{scene_id}}/scene.json"
checks:
  - id: scene-manifest-exists
    cmd: test -s assets/scenes/{{scene_id}}/scene.json
    description: Per-scene manifest written by build_scene_manifest.py
tags:
  - scene
  - "{{scene_id}}"
---

# Scene `{{scene_id}}` — {{scene_name}}

Pipeline for one scene declared in `assets/scenes.json`. The five sub-stages run sequentially so each stage can use earlier outputs as references:

1. **Concept** — `concept.png` + `SPEC.md` (anchor reference for the rest of the scene)
2. **Background** — multi-segment stitched parallax layers (one per `background.layers[]` entry)
3. **Tiles** — per-tile-variant generation + composite tilesheet
4. **Props** — per-prop spritesheets for every state
5. **Manifest** — walk what's on disk and emit `scene.json` + update `REGISTRY.json` `scenes_using[]`

Vars (passed in by the parent 05-scenes WBS):
- `scene_id`, `scene_name`, `scene_biome`, `scene_description`
- `bg_layers` (JSON array of layer names)
- `tile_variant_ids` (JSON array of tile variant IDs)
- `scene_prop_ids` (JSON array of scene-only prop IDs)
