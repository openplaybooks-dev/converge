---
id: scene-forest-tutorial-04-props
title: "Scene `forest-tutorial` — scene-only props"
description: "Per-scene-prop spritesheets for `forest-tutorial`."
tags:
  - scene
  - forest-tutorial
  - props
inputs:
  - assets/scenes/forest-tutorial/concept.png
  - assets/scenes/forest-tutorial/scene-plan.json
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

# Scene `forest-tutorial` — Scene Props

Fans out one task per (scene_prop_id, state) pair. Each runs `scripts/generate_prop_spritesheet.py` in `--scene-id` mode (looks up the prop in `scenes.json[scene].scene_props`) with `--scene-concept` and `--out-root assets/scenes/forest-tutorial/props/{prop_id}`.

Cross-scene shared props are NOT regenerated here — they live under `assets/objects-shared/` and are produced by `03-shared-props`. This stage only handles props that are unique to this scene.
