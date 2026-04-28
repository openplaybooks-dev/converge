---
id: scene-forest-1-05-manifest
title: "Scene `forest-1` — manifest"
description: "Walk on-disk outputs and emit `scene.json` + update REGISTRY scenes_using[]."
tags:
  - scene
  - forest-1
  - manifest
inputs:
  - assets/scenes/forest-1/concept.png
  - assets/scenes/forest-1/tilesheet/tilesheet.atlas.json
outputs:
  - assets/scenes/forest-1/scene.json
checks:
  - id: scene-manifest-has-id
    description: scene.json id matches scene_id
    cmd: "python -c \"import json; m=json.load(open('assets/scenes/forest-1/scene.json')); assert m['id']=='forest-1', f'wrong id: {m.get(\\\"id\\\")}'\"\n"
vars:
  scene_id: forest-1
  scene_name: Forest Glade — opening scene
  scene_biome: temperate-forest
  scene_description: "A grassy forest clearing at midday. Soft mist on the horizon, a winding dirt path entering from the left, fern foliage in the foreground. The hero starts here. Used as the playable opening of the platformer."
  bg_layers: "[{\"id\":\"far\",\"transparent\":false,\"transition_below\":null,\"subject_height_tiles\":1.5},{\"id\":\"mid\",\"transparent\":true,\"transition_below\":\"far\",\"subject_height_tiles\":3.5},{\"id\":\"near\",\"transparent\":true,\"transition_below\":\"mid\",\"subject_height_tiles\":7}]"
  tile_variant_ids: "[\"grass-base\",\"grass-edge-left\",\"grass-edge-right\",\"earth-fill\",\"earth-rocky\",\"flower-yellow\",\"stone-small\",\"mushroom-red\"]"
  scene_prop_ids: "[\"forest-mushroom-cluster\"]"
---

# Scene `forest-1` — Manifest

Runs `python scripts/build_scene_manifest.py forest-1`. Pure read — no image-gen. Walks `assets/scenes/forest-1/` and collects:

- concept image + SPEC paths
- per-layer background atlases
- tilesheet atlas (if present)
- per-prop atlases (every state directory)
- character + shared-prop IDs referenced by this scene (from `scenes.json`)

Then appends `forest-1` to `scenes_using[]` of every REGISTRY entry referenced by the scene, so the master atlas knows which scenes use which shared assets.
