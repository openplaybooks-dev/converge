---
id: scene-forest-tutorial-03-tiles
title: "Scene `forest-tutorial` — tilesheet"
description: "Per-tile generation + composite tilesheet for scene `forest-tutorial`."
tags:
  - scene
  - forest-tutorial
  - tiles
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

# Scene `forest-tutorial` — Tilesheet

Fans out one task per tile variant in `tile_variant_ids`, each running `scripts/generate_tile.py` in `--scene-id` mode (looks up the tilemap config inside `scenes.json[scene].tilemap`). After every tile is generated, a final composite leaf runs `scripts/build_tilesheet.py --scene-id forest-tutorial --out-root assets/scenes/forest-tutorial/tilesheet` to assemble the per-tile PNGs into one tilesheet.
