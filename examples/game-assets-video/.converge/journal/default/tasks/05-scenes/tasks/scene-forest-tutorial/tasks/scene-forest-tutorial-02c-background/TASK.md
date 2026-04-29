---
id: scene-forest-tutorial-02c-background
title: "Scene `forest-tutorial` — parallax backgrounds"
description: "WBS container. Spawns four parallax-stack children (02a-bg-far → 02b-bg-mid → 02c-bg-near → 97-validate-composition). Each child has its own prompt, fitness check, and retry budget. Order is enforced by inputs."
tags:
  - scene
  - forest-tutorial
  - background
  - container
inputs:
  - assets/scenes/forest-tutorial/stage.json
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

# Scene `forest-tutorial` — Parallax backgrounds

This is a **container task** with three static children:

1. `02a-bg-far` — back wall (sky → distant landscape → horizon line). Fully opaque.
2. `02b-bg-mid` — mid-distance silhouette band. Transparent above and below.
3. `02c-bg-near` — foreground edge. Content concentrated at the bottom; transparent above.

Each child is a hand-authored static task with its own prompt, references, and fitness check. Order is enforced by declared `inputs:` — bg-mid declares bg-far.png as input, bg-near declares bg-mid.png. The runner serializes far → mid → near naturally.

This parent does not run a script. It exists to group the three layer tasks together in the tree so the journal layout is readable. To add a fourth bg sub-task (e.g. extending a layer wider than native, or adding an animated parallax overlay), drop a new `02d-…` directory next to the existing children — no WBS changes required.
