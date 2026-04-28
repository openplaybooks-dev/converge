---
id: scene-forest-1
title: "Scene: Forest Glade — opening scene"
description: "Per-scene asset pipeline for `forest-1` (temperate-forest) — concept → background → tiles → props → manifest."
tags:
  - scene
  - forest-1
outputs:
  - assets/scenes/forest-1/scene.json
checks:
  - id: scene-manifest-exists
    description: Per-scene manifest written by build_scene_manifest.py
    cmd: test -s assets/scenes/forest-1/scene.json
wbs:
  type: nodejs
  path: ./wbs/index.js
vars:
  scene_id: forest-1
  scene_name: Forest Glade — opening scene
  scene_biome: temperate-forest
  scene_description: "A grassy forest clearing at midday. Soft mist on the horizon, a winding dirt path entering from the left, fern foliage in the foreground. The hero starts here. Used as the playable opening of the platformer."
  bg_layers: "[{\"id\":\"far\",\"transparent\":false,\"transition_below\":null,\"subject_height_tiles\":1.5},{\"id\":\"mid\",\"transparent\":true,\"transition_below\":\"far\",\"subject_height_tiles\":3.5},{\"id\":\"near\",\"transparent\":true,\"transition_below\":\"mid\",\"subject_height_tiles\":7}]"
  tile_variant_ids: "[\"grass-base\",\"grass-edge-left\",\"grass-edge-right\",\"earth-fill\",\"earth-rocky\",\"flower-yellow\",\"stone-small\",\"mushroom-red\"]"
  scene_prop_ids: "[\"forest-mushroom-cluster\"]"
---

# Scene `forest-1` — Forest Glade — opening scene

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
