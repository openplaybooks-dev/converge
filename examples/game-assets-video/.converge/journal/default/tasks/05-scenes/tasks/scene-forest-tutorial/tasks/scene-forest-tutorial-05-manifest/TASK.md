---
id: scene-forest-tutorial-05-manifest
title: "Scene `forest-tutorial` — manifest"
description: "Walk on-disk outputs and emit `scene.json` + update REGISTRY scenes_using[]."
tags:
  - scene
  - forest-tutorial
  - manifest
inputs:
  - assets/scenes/forest-tutorial/concept.png
  - assets/scenes/forest-tutorial/tilesheet/tilesheet.atlas.json
outputs:
  - assets/scenes/forest-tutorial/scene.json
checks:
  - id: scene-manifest-has-id
    description: scene.json id matches scene_id
    cmd: "python -c \"import json; m=json.load(open('assets/scenes/forest-tutorial/scene.json')); assert m['id']=='forest-tutorial', f'wrong id: {m.get(\\\"id\\\")}'\"\n"
vars:
  scene_id: forest-tutorial
  scene_name: Forest Tutorial
  scene_biome: grassland
  scene_description: "Open grassland tutorial scene with a winding dirt path, scattered trees and rocks, and a small water pond. The player picks up a gold key and a health potion while learning movement and pickup mechanics. Includes 2-3 small jumps, a water-pit hazard you must jump over, and one optional ledge with a hidden potion."
  bg_layers: "[{\"id\":\"far\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":1.5,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-far.png\",\"use_extraction\":true},{\"id\":\"mid\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":3.5,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-mid.png\",\"use_extraction\":true},{\"id\":\"near\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":6,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-near.png\",\"use_extraction\":true}]"
  tile_variant_ids: "[\"grass\",\"grass-flowers\",\"dirt\",\"path-corner-NE\",\"path-corner-NW\",\"path-corner-SE\",\"path-corner-SW\",\"water\",\"water-edge-grass\",\"tree-stump\",\"rock-small\"]"
  scene_prop_ids: "[]"
---

# Scene `forest-tutorial` — Manifest

Runs `python scripts/build_scene_manifest.py forest-tutorial`. Pure read — no image-gen. Walks `assets/scenes/forest-tutorial/` and collects:

- concept image + SPEC paths
- per-layer background atlases
- tilesheet atlas (if present)
- per-prop atlases (every state directory)
- character + shared-prop IDs referenced by this scene (from `scenes.json`)

Then appends `forest-tutorial` to `scenes_using[]` of every REGISTRY entry referenced by the scene, so the master atlas knows which scenes use which shared assets.
