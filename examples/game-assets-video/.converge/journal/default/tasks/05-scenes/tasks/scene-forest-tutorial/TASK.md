---
id: scene-forest-tutorial
title: "Scene: Forest Tutorial"
description: "Per-scene asset pipeline for `forest-tutorial` (grassland) — concept → background → tiles → props → manifest."
tags:
  - scene
  - forest-tutorial
outputs:
  - assets/scenes/forest-tutorial/scene.json
checks:
  - id: scene-manifest-exists
    description: Per-scene manifest written by build_scene_manifest.py
    cmd: test -s assets/scenes/forest-tutorial/scene.json
wbs:
  type: nodejs
  path: ./wbs/index.js
vars:
  scene_id: forest-tutorial
  scene_name: Forest Tutorial
  scene_biome: grassland
  scene_description: "Open grassland tutorial scene with a winding dirt path, scattered trees and rocks, and a small water pond. The player picks up a gold key and a health potion while learning movement and pickup mechanics. Includes 2-3 small jumps, a water-pit hazard you must jump over, and one optional ledge with a hidden potion."
  bg_layers: "[{\"id\":\"far\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":1.5,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-far.png\",\"use_extraction\":true},{\"id\":\"mid\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":3.5,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-mid.png\",\"use_extraction\":true},{\"id\":\"near\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":6,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-near.png\",\"use_extraction\":true}]"
  tile_variant_ids: "[\"grass\",\"grass-flowers\",\"dirt\",\"path-corner-NE\",\"path-corner-NW\",\"path-corner-SE\",\"path-corner-SW\",\"water\",\"water-edge-grass\",\"tree-stump\",\"rock-small\"]"
  scene_prop_ids: "[]"
---

# Scene `forest-tutorial` — Forest Tutorial

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
