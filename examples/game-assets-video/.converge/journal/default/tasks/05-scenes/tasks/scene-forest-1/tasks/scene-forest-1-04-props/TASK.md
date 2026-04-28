---
id: scene-forest-1-04-props
title: "Scene `forest-1` — scene-only props"
description: "Per-scene-prop spritesheets for `forest-1`."
tags:
  - scene
  - forest-1
  - props
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

# Scene `forest-1` — Scene Props

Fans out one task per (scene_prop_id, state) pair. Each runs `scripts/generate_prop_spritesheet.py` in `--scene-id` mode (looks up the prop in `scenes.json[scene].scene_props`) with `--scene-concept` and `--out-root assets/scenes/forest-1/props/{prop_id}`.

Cross-scene shared props are NOT regenerated here — they live under `assets/objects-shared/` and are produced by `03-shared-props`. This stage only handles props that are unique to this scene.
