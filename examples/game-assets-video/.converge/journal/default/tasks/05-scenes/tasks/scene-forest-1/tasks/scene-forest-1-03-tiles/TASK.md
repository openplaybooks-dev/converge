---
id: scene-forest-1-03-tiles
title: "Scene `forest-1` — tilesheet"
description: "Per-tile generation + composite tilesheet for scene `forest-1`."
tags:
  - scene
  - forest-1
  - tiles
inputs:
  - assets/scenes/forest-1/concept.png
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

# Scene `forest-1` — Tilesheet

Fans out one task per tile variant in `tile_variant_ids`, each running `scripts/generate_tile.py` in `--scene-id` mode (looks up the tilemap config inside `scenes.json[scene].tilemap`). After every tile is generated, a final composite leaf runs `scripts/build_tilesheet.py --scene-id forest-1 --out-root assets/scenes/forest-1/tilesheet` to assemble the per-tile PNGs into one tilesheet.
