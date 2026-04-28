---
id: scene-forest-1-02-background
title: "Scene `forest-1` — parallax backgrounds"
description: "Multi-segment stitched parallax layer(s) for `forest-1`."
tags:
  - scene
  - forest-1
  - background
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

# Scene `forest-1` — Parallax Backgrounds

Fans out one task per layer in `bg_layers` (`["far","mid","near"]` typically). Each layer runs `scripts/generate_scene_background.py forest-1 <layer>` which makes multiple image-gen calls and stitches them with feather-blend overlap so the result is wide and horizontally tileable.

Each per-layer task is independent so the runner can parallelize them.
